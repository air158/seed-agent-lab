export async function api(path, method = 'GET', body) {
  const response = await fetch('/api' + path, { method, credentials: 'same-origin', headers: method === 'GET' ? {} : { 'Content-Type': 'application/json' }, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) });
  const data = await response.json();
  if (!response.ok) {
    if (response.status === 401 && path !== '/login') window.dispatchEvent(new Event('session-expired'));
    throw new Error(data.error || '连接暂时不可用，请稍后再试。');
  }
  return data;
}
export async function streamChat(id, body, onEvent, signal) {
  const response = await fetch(`/api/chats/${id}/send`, { method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), signal });
  if (!response.ok) { const data = await response.json(); if (response.status === 401) window.dispatchEvent(new Event('session-expired')); throw new Error(data.error || '无法发送消息。'); }
  const reader = response.body.getReader(), decoder = new TextDecoder(); let buffer = '', final = false;
  try {
    while (true) {
      const { done, value } = await reader.read(); if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let boundary;
      while ((boundary = buffer.indexOf('\n\n')) !== -1) {
        const block = buffer.slice(0, boundary); buffer = buffer.slice(boundary + 2);
        const event = block.split('\n').find(x => x.startsWith('event:'))?.slice(6).trim();
        const data = block.split('\n').find(x => x.startsWith('data:'))?.slice(5).trim();
        if (!event || !data) continue;
        if (event === 'done' || event === 'error') final = true;
        onEvent(event, JSON.parse(data));
      }
    }
    if (!final) throw new Error('连接中断，请刷新对话查看已保存的内容。');
  } finally { reader.releaseLock(); }
}
export function download(name, text) {
  const url = URL.createObjectURL(new Blob([text], { type: 'text/markdown;charset=utf-8' }));
  const a = document.createElement('a'); a.href = url; a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export const formatTime = ms => ms ? new Date(ms).toLocaleString('zh-CN', { hour12: false }) : '暂无记录';
