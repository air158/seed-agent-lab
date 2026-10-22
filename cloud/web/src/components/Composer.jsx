import { useRef, useState } from 'react';
import { Paperclip, ArrowUp, Square, X, FileText, LoaderCircle } from 'lucide-react';
import { IconButton } from './ui';
import { readAttachment } from '../lib/attachments';
export default function Composer({ onSend, busy, onStop, draft, setDraft, notify }) {
  const [files, setFiles] = useState([]), [reading, setReading] = useState(false);
  const input = useRef(null), textarea = useRef(null);
  const addFiles = async list => {
    if (files.length + list.length > 3) { notify('一次最多添加 3 个附件。'); return; }
    setReading(true);
    try { const read = await Promise.all([...list].map(readAttachment)); setFiles(old => [...old, ...read]); }
    catch (error) { notify(error.message); }
    finally { setReading(false); if (input.current) input.current.value = ''; }
  };
  const send = async () => {
    if (busy || reading || (!draft.trim() && !files.length)) return;
    const saved = { text: draft.trim(), attachments: files };
    setDraft(''); setFiles([]); if (textarea.current) textarea.current.style.height = 'auto';
    const sent = await onSend(saved);
    if (sent === false) { setDraft(saved.text); setFiles(saved.attachments); }
  };
  return <div className="composer-wrap"><div className="composer" onDragOver={e => e.preventDefault()} onDrop={e => { e.preventDefault(); if (!busy) addFiles(e.dataTransfer.files); }}>
    {!!files.length && <div className="attachment-list">{files.map((file, i) => <div className="attachment" key={i}>{file.type === 'image' ? <img src={file.content} alt=""/> : <FileText size={22}/>}<span>{file.name}</span><IconButton title={`移除附件 ${file.name}`} onClick={() => setFiles(old => old.filter((_, index) => index !== i))}><X size={14}/></IconButton></div>)}</div>}
    <textarea ref={textarea} value={draft} aria-label="消息" placeholder="给 Dreamly 发消息…" rows={2} maxLength={20000} onChange={e => { setDraft(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(200, e.target.scrollHeight) + 'px'; }} onPaste={e => { const images = [...e.clipboardData.files].filter(f => f.type.startsWith('image/')); if (images.length && !busy) { e.preventDefault(); addFiles(images); } }} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey && !e.nativeEvent.isComposing) { e.preventDefault(); send(); } }}/>
    <div className="composer-tools"><input ref={input} type="file" hidden multiple accept="image/png,image/jpeg,image/webp,.txt,.md,.csv,.json,.js,.ts,.py,.html,.css,.yaml,.yml,.log" onChange={e => addFiles(e.target.files)}/><div className="composer-left"><IconButton title="添加图片或文本文件" onClick={() => input.current.click()} disabled={busy || reading}>{reading ? <LoaderCircle className="spin" size={20}/> : <Paperclip size={21}/>}</IconButton>{reading && <span>正在读取附件</span>}</div>{busy ? <button className="send-button" title="停止生成" aria-label="停止生成" onClick={onStop}><Square size={16} fill="currentColor"/></button> : <button className="send-button" title="发送消息" aria-label="发送消息" onClick={send} disabled={reading || (!draft.trim() && !files.length)}><ArrowUp size={22}/></button>}</div>
  </div><p className="composer-caption">Enter 发送 · Shift + Enter 换行<span>回答由 AI 生成，请核对重要信息</span></p></div>;
}
