import { json, HttpError, requireOrigin, readJson, validText, WorkspaceStore } from './workspace.mjs';
import { startChat, isMomo, FREE_MODEL } from './chat.mjs';

export { WorkspaceStore };
export async function workspaceApi(request, store, context) {
  try {
    requireOrigin(request);
    const url = new URL(request.url), path = url.pathname, method = request.method;
    if (path === '/api/session' && method === 'GET') return json({ authenticated: await store.authenticate(request), ready: store.configured() });
    if (path === '/api/login' && method === 'POST') return await store.login(await readJson(request, 1000));
    if (!await store.authenticate(request)) throw new HttpError(401, '请先登录工作区。');
    if (path === '/api/logout' && method === 'POST') return await store.logout(request);
    if (path === '/api/config' && method === 'GET') return json({ provider: isMomo(store.env) ? 'MomoAI' : 'Cloudflare Workers AI', model: isMomo(store.env) ? store.env.MOMOAI_MODEL || 'momo_278' : FREE_MODEL, free: !isMomo(store.env), label: isMomo(store.env) ? 'MomoAI' : '免费模型', instructions: store.meta('instructions'), usage: store.daily(), maxChats: 200, maxTurns: 60 });
    if (path === '/api/config' && method === 'PATCH') { const body = await readJson(request, 10000); store.setMeta('instructions', validText(body.instructions ?? '', 3000, true)); return json({ ok: true }); }
    if (path === '/api/chats' && method === 'GET') return json({ chats: store.listChats((url.searchParams.get('q') || '').slice(0, 200)) });
    if (path === '/api/chats' && method === 'POST') { await readJson(request, 1000); return json(store.createChat(), 201); }
    const match = path.match(/^\/api\/chats\/([a-f0-9-]{36})(?:\/(send|stop))?$/);
    if (match) {
      const [, id, action] = match;
      if (action === 'send' && method === 'POST') return await startChat(request, store, id, await readJson(request), context);
      if (action === 'stop' && method === 'POST') { if (store.active?.chatId === id) store.active.abort.abort('user'); return json({ ok: true }); }
      if (!action && method === 'GET') return json({ chat: store.chat(id), messages: store.messages(id) });
      if (!action && method === 'PATCH') return json(store.renameChat(id, (await readJson(request, 1000)).title));
      if (!action && method === 'DELETE') { store.deleteChat(id); return json({ ok: true }); }
    }
    if (path === '/api/tasks' && method === 'GET') return json({ tasks: store.tasks() });
    if (path === '/api/tasks' && method === 'POST') return json(store.addTask((await readJson(request, 2000)).title), 201);
    const taskMatch = path.match(/^\/api\/tasks\/([a-f0-9-]{36})$/);
    if (taskMatch && method === 'PATCH') return json(store.updateTask(taskMatch[1], (await readJson(request, 1000)).status));
    if (taskMatch && method === 'DELETE') { store.sql.exec('DELETE FROM workspace_tasks WHERE id=?', taskMatch[1]); return json({ ok: true }); }
    if (path === '/api/agent' && method === 'GET') return json(await context.status());
    if (path === '/api/report' && method === 'GET') return json(await context.report());
    if (path === '/api/agent/control' && method === 'POST') {
      const { action } = await readJson(request, 500);
      if (!['pause', 'resume'].includes(action)) throw new HttpError(400, '操作不正确。');
      return json(await context.control(action));
    }
    throw new HttpError(404, '接口不存在。');
  } catch (error) {
    return json({ error: error instanceof HttpError ? error.message : '服务暂时不可用，请稍后再试。' }, error instanceof HttpError ? error.status : 500);
  }
}
