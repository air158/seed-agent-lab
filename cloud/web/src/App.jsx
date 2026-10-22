import { useCallback, useEffect, useRef, useState } from 'react';
import { PanelLeftOpen, ChevronDown, Download, Activity, FileText, CalendarDays, Search, X, LockKeyhole, LoaderCircle } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Composer from './components/Composer';
import Messages from './components/Messages';
import { Agent, Login, Settings, Tasks } from './components/Pages';
import { IconButton, Modal } from './components/ui';
import { api, download, streamChat } from './lib/api';

export default function App() {
  const [session, setSession] = useState(null), [chats, setChats] = useState([]), [activeId, setActiveId] = useState(null), [messages, setMessages] = useState([]);
  const [view, setView] = useState('chat'), [config, setConfig] = useState(null), [sidebar, setSidebar] = useState(() => window.innerWidth > 760), [modal, setModal] = useState(null);
  const [draft, setDraft] = useState(''), [busy, setBusy] = useState(false), [loadingChat, setLoadingChat] = useState(false), [toolEvents, setToolEvents] = useState([]), [toast, setToast] = useState('');
  const [theme, setTheme] = useState(() => localStorage.getItem('dreamly-theme') || 'light');
  const [query, setQuery] = useState(''), [results, setResults] = useState([]), [rename, setRename] = useState(''), [revision, setRevision] = useState(0), [composerKey, setComposerKey] = useState(0);
  const abort = useRef(null), busyChat = useRef(null), toastTimer = useRef(null), chatVersion = useRef(0);
  const initialChat = useRef(window.location.hash.match(/^#chat=([a-f0-9-]{36})$/)?.[1]);
  const notify = useCallback(message => { setToast(message); clearTimeout(toastTimer.current); toastTimer.current = setTimeout(() => setToast(''), 6000); }, []);
  const loadConfig = async () => setConfig(await api('/config'));
  const loadChats = async () => setChats((await api('/chats')).chats);
  const refresh = async () => {
    const current = await api('/session'); setSession(current);
    if (current.authenticated) {
      await Promise.all([loadChats(), loadConfig()]);
      if (initialChat.current) { const id = initialChat.current; initialChat.current = null; try { const data = await api(`/chats/${id}`); setActiveId(id); setMessages(data.messages); } catch {} }
    }
  };
  useEffect(() => { refresh().catch(e => { notify(e.message); setSession({ authenticated: false, ready: false }); }); const expired = () => { setSession({ authenticated: false, ready: true }); setMessages([]); setChats([]); setActiveId(null); setModal(null); abort.current?.abort(); }; window.addEventListener('session-expired', expired); return () => window.removeEventListener('session-expired', expired); }, []);
  useEffect(() => { localStorage.setItem('dreamly-theme', theme); const media = window.matchMedia('(prefers-color-scheme: dark)'); const apply = () => document.documentElement.dataset.theme = theme === 'system' ? media.matches ? 'dark' : 'light' : theme; apply(); media.addEventListener('change', apply); return () => media.removeEventListener('change', apply); }, [theme]);
  useEffect(() => { if (modal?.type !== 'search') return; let cancelled = false; const timer = setTimeout(async () => { try { const data = await api('/chats?q=' + encodeURIComponent(query)); if (!cancelled) setResults(data.chats); } catch (e) { if (!cancelled) notify(e.message); } }, 180); return () => { cancelled = true; clearTimeout(timer); }; }, [query, modal?.type]);
  useEffect(() => { const key = e => { if ((e.metaKey || e.ctrlKey) && e.key === 'k' && session?.authenticated) { e.preventDefault(); setQuery(''); setModal({ type: 'search' }); } }; window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key); }, [session]);
  const mobileClose = () => { if (window.innerWidth <= 760) setSidebar(false); };
  const stop = async () => { const id = busyChat.current; if (id) { try { await api(`/chats/${id}/stop`, 'POST', {}); } catch {} } abort.current?.abort(); };
  const safeNavigate = action => { if (busy) { notify('请等待当前回复完成，或先点击停止生成。'); return; } chatVersion.current++; setLoadingChat(false); setComposerKey(x => x + 1); action(); mobileClose(); };
  const newChat = () => safeNavigate(() => { window.history.replaceState(null, '', window.location.pathname); setView('chat'); setActiveId(null); setMessages([]); setDraft(''); setToolEvents([]); });
  const openChat = async id => {
    if (busy) { notify('请先停止当前回复。'); return; }
    const version = ++chatVersion.current;
    window.history.replaceState(null, '', '#chat=' + id); setComposerKey(x => x + 1); setLoadingChat(true); setView('chat'); setActiveId(id); setMessages([]); setDraft(''); setModal(null); mobileClose();
    try { const data = await api(`/chats/${id}`); if (chatVersion.current === version) setMessages(data.messages); } catch (e) { notify(e.message); } finally { if (chatVersion.current === version) setLoadingChat(false); }
  };
  const send = async (body, regenerate = false) => {
    if (busy || loadingChat) return false;
    setBusy(true); setView('chat'); setToolEvents([]); let id = activeId, accepted = false;
    try {
      if (!id) { const chat = await api('/chats', 'POST', {}); id = chat.id; setActiveId(id); window.history.replaceState(null, '', '#chat=' + id); }
      busyChat.current = id;
      const base = regenerate && messages.at(-1)?.role === 'assistant' ? messages.slice(0, -1) : [...messages];
      if (!regenerate) base.push({ id: 'local-user', role: 'user', content: body, status: 'complete', chat_id: id });
      const responseMessage = { id: 'local-assistant', role: 'assistant', content: { text: '' }, status: 'generating', meta: {}, chat_id: id };
      setMessages([...base, { ...responseMessage }]);
      abort.current = new AbortController();
      await streamChat(id, regenerate ? { regenerate: true } : body, (event, data) => {
        if (event === 'start') { accepted = true; responseMessage.id = data.id; }
        if (event === 'delta') responseMessage.content = { text: responseMessage.content.text + data.text };
        if (event === 'tool') setToolEvents(old => { const copy = [...old]; const pending = copy.findIndex(t => t.name === data.name && t.status === 'running'); if (pending >= 0) copy[pending] = data; else copy.push(data); return copy; });
        if (event === 'done') { responseMessage.status = data.status; responseMessage.meta = data.meta; }
        if (event === 'error') { responseMessage.status = data.stopped ? 'stopped' : 'error'; responseMessage.meta = { error: data.message }; }
        setMessages([...base, { ...responseMessage }]);
      }, abort.current.signal);
    } catch (e) { if (e.name !== 'AbortError') notify(e.message); }
    finally {
      abort.current = null; busyChat.current = null;
      if (id) { try { const data = await api(`/chats/${id}`); setMessages(data.messages); } catch {} }
      try { await Promise.all([loadChats(), loadConfig()]); } catch {}
      setBusy(false); setRevision(x => x + 1);
    }
    return accepted;
  };
  const ask = text => safeNavigate(() => { setActiveId(null); setMessages([]); setView('chat'); setDraft(text); });
  const exportChat = () => {
    const chat = chats.find(c => c.id === activeId);
    const text = `# ${chat?.title || 'Dreamly 对话'}\n\n` + messages.map(m => `## ${m.role === 'user' ? '我' : 'Dreamly'}\n\n${m.content.text || ''}${m.content.attachments?.length ? '\n\n附件：' + m.content.attachments.map(a => a.name).join('、') : ''}\n`).join('\n');
    download((chat?.title || 'Dreamly 对话').replace(/[\\/:*?"<>|]/g, '-') + '.md', text); notify('对话已导出为 Markdown');
  };
  const logout = async () => { if (busy) await stop(); try { await api('/logout', 'POST', {}); setSession({ authenticated: false, ready: true }); setMessages([]); setChats([]); setActiveId(null); setModal(null); } catch (e) { notify(e.message); } };
  return <div className={`app ${sidebar ? '' : 'sidebar-hidden'}`}>
    <Sidebar chats={chats} activeId={activeId} view={view} open={sidebar} onClose={() => setSidebar(false)} onNew={newChat} onChat={openChat} onView={value => safeNavigate(() => setView(value))} onSearch={() => { setQuery(''); setModal({ type: 'search' }); }} onSettings={() => setModal({ type: 'settings' })} onRename={chat => { setRename(chat.title); setModal({ type: 'rename', chat }); }} onDelete={chat => setModal({ type: 'delete', chat })} authenticated={session?.authenticated}/>
    <main className="main"><header className="topbar"><div className="topbar-left">{!sidebar && <IconButton title="展开侧栏" onClick={() => setSidebar(true)}><PanelLeftOpen size={20}/></IconButton>}<span className="topbar-title">Dreamly</span><button className="model-button" onClick={() => setModal({ type: 'settings' })} disabled={!session?.authenticated}>{config?.label || '免费模型'}<ChevronDown size={14}/></button></div><div className="topbar-right">{activeId && view === 'chat' && !!messages.length && <IconButton title="导出对话" onClick={exportChat}><Download size={18}/></IconButton>}<span className="connection"><span className={session?.authenticated ? 'online-dot' : 'offline-dot'}/>{session?.authenticated ? '私人工作区' : '需要登录'}</span></div></header>
      {!session ? <div className="page-loading"><LoaderCircle className="spin" size={24}/>正在连接工作区</div> : !session.authenticated ? <Login ready={session.ready} onLogin={refresh} notify={notify}/> : view === 'agent' ? <Agent notify={notify} onAsk={ask}/> : view === 'tasks' ? <Tasks notify={notify} revision={revision}/> : <div className={`chat-view ${!messages.length ? 'is-empty' : ''}`}>
        {loadingChat ? <div className="page-loading"><LoaderCircle size={20} className="spin"/>正在读取对话</div> : !messages.length ? <div className="welcome"><h1>今天想一起完成什么？</h1><p>聊想法、写内容，或查看 Agent 的最新进展。</p><div className="suggestions"><button onClick={() => setDraft('请读取 Agent 的实时状态，告诉我现在运行是否正常。')}><Activity size={18}/>查看运行状态</button><button onClick={() => setDraft('请读取最新实验报告，解释结果和下一步建议。')}><FileText size={18}/>解读最新实验</button><button onClick={() => setDraft('帮我制定一个可执行的计划。先问我目标、期限和约束。')}><CalendarDays size={18}/>帮我制定计划</button></div></div> : <Messages messages={messages} busy={busy} tools={toolEvents} onRegenerate={() => send(null, true)} notify={notify}/>}
        <Composer key={composerKey} draft={draft} setDraft={setDraft} onSend={send} busy={busy || loadingChat} onStop={stop} notify={notify}/>
      </div>}
    </main>
    {toast && <div className="toast" role="status">{toast}<IconButton title="关闭提示" onClick={() => setToast('')}><X size={15}/></IconButton></div>}
    {modal?.type === 'settings' && config && <Settings config={config} onClose={() => setModal(null)} notify={notify} onSaved={loadConfig} onLogout={logout} theme={theme} setTheme={setTheme}/>}
    {modal?.type === 'search' && <Modal title="搜索对话" onClose={() => setModal(null)}><div className="search-field"><Search size={19}/><input autoFocus value={query} placeholder="搜索标题或对话内容…" aria-label="搜索标题或对话内容" onChange={e => setQuery(e.target.value)}/><kbd>⌘ K</kbd></div><div className="search-results">{results.length ? results.map(chat => <button key={chat.id} onClick={() => openChat(chat.id)}><span>{chat.title}</span><small>{new Date(chat.updated).toLocaleDateString('zh-CN')}</small></button>) : <p className="muted">没有找到相关对话</p>}</div></Modal>}
    {modal?.type === 'rename' && <Modal title="重命名对话" onClose={() => setModal(null)}><form className="modal-form" onSubmit={async e => { e.preventDefault(); try { await api(`/chats/${modal.chat.id}`, 'PATCH', { title: rename }); await loadChats(); setModal(null); } catch (e) { notify(e.message); } }}><label className="sr-only" htmlFor="chat-title">对话名称</label><input id="chat-title" value={rename} onChange={e => setRename(e.target.value)} maxLength={100} autoFocus/><button className="primary" disabled={!rename.trim()}>保存名称</button></form></Modal>}
    {modal?.type === 'delete' && <Modal title="删除这个对话？" onClose={() => setModal(null)}><div className="modal-form"><p>“{modal.chat.title}”及其中的消息、附件将从此工作区删除。需要保留时，请先导出。</p><div className="button-row"><button className="secondary" onClick={() => setModal(null)}>取消</button><button className="danger" onClick={async () => { try { const id = modal.chat.id; await api(`/chats/${id}`, 'DELETE', {}); if (id === activeId) { setActiveId(null); setMessages([]); } await loadChats(); setModal(null); notify('对话已删除'); } catch (e) { notify(e.message); } }}>删除对话</button></div></div></Modal>}
  </div>;
}
