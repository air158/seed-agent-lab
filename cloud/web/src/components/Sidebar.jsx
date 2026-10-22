import { Plus, Search, Activity, ListTodo, Settings, MessageSquare, PanelLeftClose, Pencil, Trash2, LockKeyhole } from 'lucide-react';
import { Brand, IconButton } from './ui';
export default function Sidebar({ chats, activeId, view, open, onClose, onNew, onChat, onView, onSearch, onSettings, onRename, onDelete, authenticated }) {
  return <>
    {open && <button className="sidebar-scrim" aria-label="关闭侧栏" onClick={onClose}/>}
    <aside className={`sidebar ${open ? 'open' : ''}`} aria-label="侧边导航">
      <div className="sidebar-brand"><Brand/><IconButton title="收起侧栏" onClick={onClose}><PanelLeftClose size={19}/></IconButton></div>
      <button className="new-chat" onClick={onNew} disabled={!authenticated}><Plus size={21}/>新建对话</button>
      <nav>
        <button onClick={onSearch} disabled={!authenticated}><Search size={19}/>搜索对话</button>
        <button className={view === 'agent' ? 'selected' : ''} onClick={() => onView('agent')} disabled={!authenticated}><Activity size={19}/>Agent 状态</button>
        <button className={view === 'tasks' ? 'selected' : ''} onClick={() => onView('tasks')} disabled={!authenticated}><ListTodo size={19}/>任务清单</button>
      </nav>
      <div className="history-label">最近对话</div>
      <div className="history" aria-label="历史对话">
        {!chats.length && <p className="history-empty">{authenticated ? '你的对话会保存在这里' : '登录后查看你的对话'}</p>}
        {chats.map(chat => <div key={chat.id} className={`chat-row ${view === 'chat' && activeId === chat.id ? 'active' : ''}`}>
          <button className="chat-select" onClick={() => onChat(chat.id)} title={chat.title}><MessageSquare size={16}/><span>{chat.title}</span></button>
          <div className="chat-actions"><IconButton title={`重命名：${chat.title}`} onClick={() => onRename(chat)}><Pencil size={14}/></IconButton><IconButton title={`删除：${chat.title}`} onClick={() => onDelete(chat)}><Trash2 size={14}/></IconButton></div>
        </div>)}
      </div>
      <div className="sidebar-bottom"><button className="sidebar-settings" onClick={onSettings} disabled={!authenticated}><Settings size={19}/>设置</button><div className="profile"><span className="avatar">我</span><div>我的工作区<small><LockKeyhole size={10}/>私人空间</small></div></div></div>
    </aside>
  </>;
}
