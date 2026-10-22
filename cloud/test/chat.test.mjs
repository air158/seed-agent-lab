import test from 'node:test';
import assert from 'node:assert/strict';
import { parseSSE, runModel } from '../chat.mjs';
import { requireOrigin, validateInput, readJson, cookie } from '../workspace.mjs';
const stream = chunks => new ReadableStream({ start(c) { for (const chunk of chunks) c.enqueue(chunk); c.close(); } });
const enc = new TextEncoder();

test('SSE preserves Chinese across byte boundaries and handles CRLF and DONE', async () => {
  const bytes = enc.encode('data: {"text":"你好"}\r\n\r\ndata: [DONE]\n\n');
  const result = []; for await (const item of parseSSE(stream([...bytes].map(b => new Uint8Array([b]))))) result.push(item);
  assert.deepEqual(result, [{ text: '你好' }]);
});
test('rejects cross-origin mutation, unsupported images, and oversized bodies', async () => {
  assert.throws(() => requireOrigin(new Request('https://dreamly.test/api/chats', { method: 'POST', headers: { Origin: 'https://evil.test', 'Content-Type': 'application/json' } })), { status: 403 });
  assert.throws(() => requireOrigin(new Request('https://dreamly.test/api/chats', { method: 'POST' })), { status: 403 });
  assert.throws(() => validateInput({ attachments: [{ name: 'a', type: 'image', content: 'https://evil.test/a.png' }] }), { status: 400 });
  assert.throws(() => validateInput({ text: 'x'.repeat(20001) }), { status: 400 });
  await assert.rejects(readJson(new Request('https://dreamly.test', { method: 'POST', body: 'x'.repeat(1100) }), 1000), { status: 413 });
  const session = cookie('session'); assert.match(session, /__Host-/); assert.match(session, /HttpOnly/); assert.match(session, /SameSite=Strict/); assert.match(session, /Secure/);
});
test('real tool loop uses fixed provider, returns result, and enforces per-round quota', async () => {
  const events = [], requests = []; let reservations = 0;
  const store = { env: { CHAT_PROVIDER: 'momoai', MOMOAI_API_KEY: 'test-secret' }, reserveCall() { reservations++; }, tasks() { return [{ title: '测试任务', status: 'todo' }]; } };
  const result = await runModel({ store, messages: [{ role: 'user', content: '我的任务' }], signal: new AbortController().signal, context: {}, emit: (event, data) => events.push({ event, data }), fetcher: async (url, options) => {
    assert.equal(url, 'https://www.momoai.pro/v1/responses'); assert.equal(options.redirect, 'manual');
    const body = JSON.parse(options.body); requests.push(body);
    const output = requests.length === 1 ? [{ type: 'function_call', call_id: 'tool-1', name: 'list_tasks', arguments: '{}' }] : [];
    return new Response((requests.length === 1 ? '' : 'data: '+JSON.stringify({type:'response.output_text.delta',delta:'你有一件测试任务。'})+'\n\n') + 'data: ' + JSON.stringify({ type: 'response.completed', response: { model: 'test-model', status:'completed', output, usage: { total_tokens: 9 } } }) + '\n\ndata: [DONE]\n\n');
  } });
  assert.equal(result.text, '你有一件测试任务。'); assert.equal(reservations, 2);
  assert.equal(requests[1].input.at(-1).type, 'function_call_output'); assert.equal(JSON.parse(requests[1].input.at(-1).output)[0].title, '测试任务');
  assert.equal(result.usage.total_tokens, 18); assert.ok(events.some(e => e.event === 'tool' && e.data.status === 'complete'));
  assert.ok(!JSON.stringify(events).includes('test-secret'));
});
test('upstream error bodies never reach browser and truncated streams are not complete', async () => {
  const args = { store: { env: { CHAT_PROVIDER: 'momoai', MOMOAI_API_KEY: 'secret' }, reserveCall() {} }, messages: [], emit() {}, signal: new AbortController().signal, context: {} };
  await assert.rejects(runModel({ ...args, fetcher: async () => new Response('private upstream detail', { status: 500 }) }), e => e.status === 502 && !e.message.includes('private'));
  await assert.rejects(runModel({ ...args, fetcher: async () => new Response('data: {"type":"response.output_text.delta","delta":"partial"}\n\n') }), /回复可能不完整/);
});
