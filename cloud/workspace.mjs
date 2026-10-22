const COOKIE = '__Host-dreamly';
const TTL = 7 * 24 * 60 * 60 * 1000;
export const API_HEADERS = {
  'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'no-referrer', 'X-Frame-Options': 'DENY',
};
export const json = (body, status = 200, headers = {}) => Response.json(body, { status, headers: { ...API_HEADERS, ...headers } });
export class HttpError extends Error {
  constructor(status, message) { super(message); this.status = status; }
}
export async function digest(text) {
  return [...new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)))].map(x => x.toString(16).padStart(2, '0')).join('');
}
export function cookieValue(request, local = false) {
  const name = local ? 'dreamly-local' : COOKIE;
  return request.headers.get('cookie')?.split(';').map(x => x.trim()).find(x => x.startsWith(name + '='))?.slice(name.length + 1) || '';
}
export function cookie(token, local = false, expires = TTL / 1000) {
  return `${local ? 'dreamly-local' : COOKIE}=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${expires}${local ? '' : '; Secure'}`;
}
export function requireOrigin(request) {
  if (['GET', 'HEAD'].includes(request.method)) return;
  if (request.headers.get('Origin') !== new URL(request.url).origin) throw new HttpError(403, '请从 Dreamly 网页发起操作。');
  if (!(request.headers.get('Content-Type') || '').startsWith('application/json')) throw new HttpError(415, '请求格式不正确。');
}
export async function readJson(request, limit = 2_000_000) {
  if (Number(request.headers.get('content-length')) > limit) throw new HttpError(413, '内容过大，请减少附件。');
  const reader = request.body?.getReader();
  if (!reader) throw new HttpError(400, '缺少请求内容。');
  let size = 0, text = ''; const decoder = new TextDecoder();
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > limit) { await reader.cancel(); throw new HttpError(413, '内容过大，请减少附件。'); }
      text += decoder.decode(value, { stream: true });
    }
    text += decoder.decode();
    const value = JSON.parse(text);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error();
    return value;
  } catch (e) { if (e instanceof HttpError) throw e; throw new HttpError(400, '请求内容无法读取。'); }
}
export function validText(value, max = 20000, empty = false) {
  if (typeof value !== 'string' || value.length > max || (!empty && !value.trim())) throw new HttpError(400, '文字内容为空或超出长度限制。');
  return value.trim();
}
export function validateInput(body) {
  const text = validText(body.text ?? '', 20000, true);
  const attachments = body.attachments ?? [];
  if (!Array.isArray(attachments) || attachments.length > 3) throw new HttpError(400, '一次最多添加 3 个附件。');
  let total = 0;
  for (const a of attachments) {
    if (!a || typeof a !== 'object') throw new HttpError(400, '附件格式不正确。');
    a.name = validText(a.name, 150);
    if (a.type === 'text') { a.content = validText(a.content, 45000); total += a.content.length; }
    else if (a.type === 'image') {
      if (typeof a.content !== 'string' || !/^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+=*$/.test(a.content)) throw new HttpError(400, '只支持 PNG、JPEG 或 WebP 图片。');
      total += a.content.length;
    } else throw new HttpError(400, '暂不支持这个附件格式。');
  }
  if (total > 1_700_000) throw new HttpError(413, '附件过大，请减少图片尺寸或文件内容。');
  if (!text && !attachments.length) throw new HttpError(400, '请输入消息或添加附件。');
  return { text, attachments: attachments.map(({ name, type, content }) => ({ name, type, content })) };
}

export class WorkspaceStore {
  constructor(ctx, env) {
    this.ctx = ctx; this.env = env; this.sql = ctx.storage.sql;
    this.sql.exec(`CREATE TABLE IF NOT EXISTS workspace_sessions (hash TEXT PRIMARY KEY, expires INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS workspace_chats (id TEXT PRIMARY KEY, title TEXT NOT NULL, created INTEGER NOT NULL, updated INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS workspace_messages (id TEXT PRIMARY KEY, chat_id TEXT NOT NULL, role TEXT NOT NULL, content TEXT NOT NULL, created INTEGER NOT NULL, status TEXT NOT NULL, meta TEXT NOT NULL DEFAULT '{}')`);
    this.sql.exec(`CREATE INDEX IF NOT EXISTS workspace_messages_chat ON workspace_messages(chat_id, created)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS workspace_tasks (id TEXT PRIMARY KEY, title TEXT NOT NULL, status TEXT NOT NULL, created INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS workspace_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS workspace_usage (day TEXT PRIMARY KEY, calls INTEGER NOT NULL)`);
    this.sql.exec(`CREATE TABLE IF NOT EXISTS workspace_auth_limits (bucket TEXT PRIMARY KEY, count INTEGER NOT NULL)`);
    this.sql.exec(`UPDATE workspace_messages SET status='error',meta=? WHERE status='generating'`, JSON.stringify({ error: '服务重新连接，上一条回复中断。可以重新生成。' }));
    this.active = null;
  }
  rows(query, ...args) { return this.sql.exec(query, ...args).toArray(); }
  meta(key, fallback = '') { return this.rows('SELECT value FROM workspace_meta WHERE key = ?', key)[0]?.value ?? fallback; }
  setMeta(key, value) { this.sql.exec('INSERT INTO workspace_meta(key, value) VALUES(?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value', key, String(value)); }
  isPaused() { return this.meta('heartbeat_paused') === 'true'; }
  configured() { return Boolean((this.env.CHAT_PROVIDER === 'momoai' ? this.env.MOMOAI_API_KEY : this.env.AI?.run) && /^[a-f0-9]{64}$/.test(this.env.WORKSPACE_LOGIN_HASH || '')); }
  async authenticate(request) {
    const token = cookieValue(request, this.env.LOCAL_DEV === 'true');
    if (!/^[a-f0-9]{64}$/.test(token)) return false;
    const row = this.rows('SELECT expires FROM workspace_sessions WHERE hash = ?', await digest(token))[0];
    return Boolean(row && row.expires > Date.now());
  }
  async login(body) {
    if (!this.configured()) throw new HttpError(503, '工作区尚未完成服务端配置。');
    const bucket = String(Math.floor(Date.now() / 600000));
    this.sql.exec('DELETE FROM workspace_auth_limits WHERE bucket != ?', bucket);
    const attempts = this.rows('SELECT count FROM workspace_auth_limits WHERE bucket = ?', bucket)[0]?.count || 0;
    if (attempts >= 10) throw new HttpError(429, '尝试次数较多，请 10 分钟后再试。');
    this.sql.exec('INSERT INTO workspace_auth_limits(bucket,count) VALUES(?,1) ON CONFLICT(bucket) DO UPDATE SET count=count+1', bucket);
    const input = await digest(validText(body.password, 200));
    let diff = 0; for (let i = 0; i < 64; i++) diff |= input.charCodeAt(i) ^ this.env.WORKSPACE_LOGIN_HASH.charCodeAt(i);
    if (diff) throw new HttpError(401, '访问码不正确。');
    const token = [...crypto.getRandomValues(new Uint8Array(32))].map(x => x.toString(16).padStart(2, '0')).join('');
    this.sql.exec('DELETE FROM workspace_sessions WHERE expires < ?', Date.now());
    this.sql.exec('INSERT INTO workspace_sessions(hash,expires) VALUES(?,?)', await digest(token), Date.now() + TTL);
    this.sql.exec('DELETE FROM workspace_auth_limits WHERE bucket = ?', bucket);
    return json({ ok: true }, 200, { 'Set-Cookie': cookie(token, this.env.LOCAL_DEV === 'true') });
  }
  async logout(request) {
    this.sql.exec('DELETE FROM workspace_sessions WHERE hash = ?', await digest(cookieValue(request, this.env.LOCAL_DEV === 'true')));
    return json({ ok: true }, 200, { 'Set-Cookie': cookie('', this.env.LOCAL_DEV === 'true', 0) });
  }
  listChats(query = '') {
    if (!query) return this.rows('SELECT * FROM workspace_chats ORDER BY updated DESC LIMIT 200');
    const like = `%${query.replace(/[\\%_]/g, '\\$&')}%`;
    return this.rows(`SELECT DISTINCT c.* FROM workspace_chats c LEFT JOIN workspace_messages m ON m.chat_id=c.id WHERE c.title LIKE ? ESCAPE '\\' OR m.content LIKE ? ESCAPE '\\' ORDER BY c.updated DESC LIMIT 200`, like, like);
  }
  chat(id) {
    const chat = this.rows('SELECT * FROM workspace_chats WHERE id = ?', id)[0];
    if (!chat) throw new HttpError(404, '这个对话不存在。');
    return chat;
  }
  messages(id) { this.chat(id); return this.rows('SELECT * FROM workspace_messages WHERE chat_id = ? ORDER BY created, rowid', id).map(m => ({ ...m, content: JSON.parse(m.content), meta: JSON.parse(m.meta) })); }
  createChat(title = '新对话') {
    const count = this.rows('SELECT COUNT(*) AS n FROM workspace_chats')[0].n;
    if (count >= 200) throw new HttpError(409, '最多保留 200 个对话，请先导出并删除一些旧对话。');
    const chat = { id: crypto.randomUUID(), title: validText(title, 100), created: Date.now(), updated: Date.now() };
    this.sql.exec('INSERT INTO workspace_chats(id,title,created,updated) VALUES(?,?,?,?)', chat.id, chat.title, chat.created, chat.updated);
    return chat;
  }
  renameChat(id, title) { this.chat(id); this.sql.exec('UPDATE workspace_chats SET title=?,updated=? WHERE id=?', validText(title, 100), Date.now(), id); return this.chat(id); }
  deleteChat(id) {
    if (this.active?.chatId === id) throw new HttpError(409, '请先停止当前回复。');
    this.chat(id);
    this.ctx.storage.transactionSync(() => { this.sql.exec('DELETE FROM workspace_messages WHERE chat_id = ?', id); this.sql.exec('DELETE FROM workspace_chats WHERE id = ?', id); });
  }
  addMessage(chatId, role, content, status = 'complete', meta = {}, id = crypto.randomUUID()) {
    const size = this.rows('SELECT COALESCE(SUM(LENGTH(content)),0) AS bytes FROM workspace_messages')[0].bytes;
    if (size + JSON.stringify(content).length > 50_000_000) throw new HttpError(409, '工作区存储已达到上限，请导出并删除部分旧对话。');
    this.sql.exec('INSERT INTO workspace_messages(id,chat_id,role,content,created,status,meta) VALUES(?,?,?,?,?,?,?)', id, chatId, role, JSON.stringify(content), Date.now(), status, JSON.stringify(meta));
    this.sql.exec('UPDATE workspace_chats SET updated=? WHERE id=?', Date.now(), chatId);
    return id;
  }
  updateMessage(id, content, status, meta = {}) { this.sql.exec('UPDATE workspace_messages SET content=?,status=?,meta=? WHERE id=?', JSON.stringify(content), status, JSON.stringify(meta), id); }
  tasks() { return this.rows('SELECT * FROM workspace_tasks ORDER BY created DESC LIMIT 200'); }
  addTask(title) {
    if (this.rows('SELECT COUNT(*) AS n FROM workspace_tasks')[0].n >= 200) throw new HttpError(409, '任务清单已满，请清理已完成的任务。');
    const task = { id: crypto.randomUUID(), title: validText(title, 300), status: 'todo', created: Date.now() };
    this.sql.exec('INSERT INTO workspace_tasks(id,title,status,created) VALUES(?,?,?,?)', task.id, task.title, task.status, task.created); return task;
  }
  updateTask(id, status) {
    if (!['todo', 'done'].includes(status)) throw new HttpError(400, '任务状态不正确。');
    if (!this.rows('SELECT id FROM workspace_tasks WHERE id=?', id).length) throw new HttpError(404, '任务不存在。');
    this.sql.exec('UPDATE workspace_tasks SET status=? WHERE id=?', status, id); return { id, status };
  }
  daily() {
    const day = new Date(Date.now() + 8 * 3600000).toISOString().slice(0, 10);
    const used = this.rows('SELECT calls FROM workspace_usage WHERE day=?', day)[0]?.calls || 0;
    return { day, used, limit: Math.min(100, Math.max(1, Number(this.env.DAILY_CHAT_LIMIT) || 50)) };
  }
  reserveCall() {
    const { day, used, limit } = this.daily();
    if (used >= limit) throw new HttpError(429, `今天已达到 ${limit} 次模型请求上限，明天再继续。`);
    this.sql.exec('DELETE FROM workspace_usage WHERE day < ?', day);
    this.sql.exec('INSERT INTO workspace_usage(day,calls) VALUES(?,1) ON CONFLICT(day) DO UPDATE SET calls=calls+1', day);
  }
}
