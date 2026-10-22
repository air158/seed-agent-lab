import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createHash } from 'node:crypto';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';

test('private workspace: auth, CSRF, CRUD, real SSE transport, tool loop, persistence, logout, quota', { timeout: 30000 }, async () => {
  const persistence = await mkdtemp(join(tmpdir(), 'dreamly-test-'));
  let modelCalls = 0;
  const password = 'integration-only-access';
  const options = () => convertV4MiniflareOptions({
    name: 'dreamly-private-test', modules: true, scriptPath: 'dist/worker.js', compatibilityDate: '2026-10-01', resourcePersistencePath: persistence,
    durableObjects: { HEARTBEAT: { className: 'CloudHeartbeat', useSQLite: true } },
    bindings: { HEARTBEAT_ENABLED: 'false', MOMOAI_API_KEY: 'integration-secret-must-not-leak', WORKSPACE_LOGIN_HASH: createHash('sha256').update(password).digest('hex'), DAILY_CHAT_LIMIT: '3' },
    outboundService: async request => {
      if (new URL(request.url).hostname === 'www.momoai.pro') {
        modelCalls++; const body = await request.json();
        assert.equal(request.headers.get('authorization'), 'Bearer integration-secret-must-not-leak');
        const requestedTool = body.input.at(-1).type !== 'function_call_output';
        const output = requestedTool ? [{ type: 'function_call', call_id: 'read-status', name: 'get_agent_status', arguments: '{}' }] : [];
        return new Response((requestedTool ? '' : `data: ${JSON.stringify({type:'response.output_text.delta',delta:'服务尚未启动。'})}\n\n`) + `data: ${JSON.stringify({ type:'response.completed', response:{model:'fixture-model',status:'completed',output,usage:{total_tokens:12}} })}\n\ndata: [DONE]\n\n`, { headers: { 'Content-Type': 'text/event-stream' } });
      }
      return new Response('{}');
    }, log: new Log(LogLevel.NONE),
  });
  let mf = new Miniflare(options()); let cookie = '';
  const request = (path, method = 'GET', body, origin = 'https://dreamly.test') => mf.dispatchFetch('https://dreamly.test/api' + path, { method, headers: { Cookie: cookie, Origin: origin, ...(method !== 'GET' ? { 'Content-Type': 'application/json' } : {}) }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  try {
    for (const path of ['/chats', '/config', '/tasks', '/agent', '/report']) assert.equal((await request(path)).status, 401);
    assert.equal((await request('/chats', 'POST', {}, 'https://evil.test')).status, 403);
    assert.equal((await request('/login', 'POST', { password: 'wrong' })).status, 401);
    const login = await request('/login', 'POST', { password }); assert.equal(login.status, 200);
    cookie = login.headers.get('set-cookie').split(';')[0]; assert.match(cookie, /__Host-dreamly=/);
    assert.equal((await request('/session').then(r => r.json())).authenticated, true);
    const config = await request('/config').then(r => r.text()); assert.ok(!config.includes('integration-secret')); assert.ok(!config.includes('WORKSPACE_LOGIN_HASH'));
    const chat = await request('/chats', 'POST', {}).then(r => r.json());
    let response = await request(`/chats/${chat.id}/send`, 'POST', { text: '检查运行状态', attachments: [] });
    assert.equal(response.status, 200); const events = await response.text();
    assert.match(events, /event: tool/); assert.match(events, /服务尚未启动/); assert.match(events, /event: done/); assert.ok(!events.includes('integration-secret'));
    assert.equal(modelCalls, 2);
    const messages = await request(`/chats/${chat.id}`).then(r => r.json());
    assert.equal(messages.messages.length, 2); assert.equal(messages.messages[1].status, 'complete');
    await request(`/chats/${chat.id}`, 'PATCH', { title: '我的运行记录' });
    assert.equal((await request('/chats?q=' + encodeURIComponent('运行')).then(r => r.json())).chats.length, 1);
    const task = await request('/tasks', 'POST', { title: '检查计划' }).then(r => r.json());
    await request(`/tasks/${task.id}`, 'PATCH', { status: 'done' });
    assert.equal((await request('/tasks').then(r => r.json())).tasks[0].status, 'done');
    response = await request(`/chats/${chat.id}/send`, 'POST', { text: '再检查一次' });
    assert.match(await response.text(), /event: error/); assert.equal(modelCalls, 3);
    assert.equal((await request(`/chats/${chat.id}/send`, 'POST', { text: '超过额度' })).status, 429);
    await mf.dispose(); mf = new Miniflare(options());
    assert.equal((await request(`/chats/${chat.id}`).then(r => r.json())).chat.title, '我的运行记录');
    assert.equal((await request('/config').then(r => r.json())).usage.used, 3);
    await request(`/chats/${chat.id}`, 'DELETE', {}); assert.equal((await request(`/chats/${chat.id}`)).status, 404);
    await request('/logout', 'POST', {}); assert.equal((await request('/tasks')).status, 401);
  } finally { await mf.dispose(); await rm(persistence, { recursive: true, force: true }); }
});
