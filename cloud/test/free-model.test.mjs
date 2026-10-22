import test from 'node:test';
import assert from 'node:assert/strict';
import { runModel, FREE_MODEL } from '../chat.mjs';
const sse = chunks => new Response(chunks.map(value => `data: ${JSON.stringify(value)}\n\n`).join('') + 'data: [DONE]\n\n');

test('free provider streams text and fragmented tools without using the paid provider', async () => {
  const requests = [], events = []; let reservations = 0;
  const store = {
    env: { MOMOAI_API_KEY: 'paid-key-must-never-be-used', AI: { async run(model, input, options) {
      assert.equal(model, FREE_MODEL); assert.equal(options.returnRawResponse, true); assert.ok(options.signal);
      assert.equal(input.store, false); assert.equal(input.max_completion_tokens, 2048);
      requests.push(structuredClone(input));
      return requests.length === 1 ? sse([
        { choices: [{ delta: { tool_calls: [{ index: 0, id: 'task-call', function: { name: 'list_tasks', arguments: '{' } }] } }] },
        { choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: '}' } }] } }] },
        { choices: [{ delta: {}, finish_reason: 'tool_calls' }] },
      ]) : sse([
        { choices: [{ delta: { content: '你有一件待办。' } }] },
        { choices: [{ delta: {}, finish_reason: 'stop' }] },
        { choices: [], usage: { prompt_tokens: 10, completion_tokens: 4, total_tokens: 14 } },
      ]);
    } } }, reserveCall() { reservations++; }, tasks() { return [{ title: '核对待办', status: 'todo' }]; },
  };
  const result = await runModel({ store, messages: [{ role: 'user', content: [{ type: 'input_text', text: '我的任务' }, { type: 'input_image', image_url: 'data:image/png;base64,AA==' }] }], signal: new AbortController().signal, context: {}, emit: (event, data) => events.push({ event, data }), fetcher() { throw new Error('Paid provider called'); } });
  assert.equal(reservations, 2); assert.equal(result.text, '你有一件待办。');
  assert.equal(requests[0].messages[0].content[1].type, 'image_url');
  assert.equal(requests[1].messages.at(-1).tool_call_id, 'task-call');
  assert.equal(result.usage.total_tokens, 14);
  assert.ok(events.some(event => event.event === 'tool' && event.data.status === 'complete'));
  assert.ok(!JSON.stringify(requests).includes('paid-key'));
});

test('free quota errors and incomplete streams fail closed with no paid fallback', async () => {
  const args = { store: { env: { AI: { run: async () => new Response('private provider detail', { status: 429 }) } }, reserveCall() {} }, messages: [], emit() {}, signal: new AbortController().signal, context: {}, fetcher() { throw new Error('Paid provider called'); } };
  await assert.rejects(runModel(args), error => error.status === 429 && !error.message.includes('private'));
  args.store.env.AI.run = async () => sse([{ choices: [{ delta: { content: 'partial' } }] }]);
  await assert.rejects(runModel(args), /回复可能不完整/);
});
