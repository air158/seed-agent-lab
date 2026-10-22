import { useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Copy, Check, RotateCcw, FileText, LoaderCircle, Sparkle, AlertCircle } from 'lucide-react';
import { IconButton } from './ui';

export function Markdown({ children }) {
  return <div className="markdown"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
    a: ({ children, href }) => <a href={href} target="_blank" rel="noopener noreferrer">{children}</a>,
    img: ({ alt }) => <span className="muted">[图片：{alt || '外部图片未自动加载'}]</span>,
    pre: ({ children }) => <pre tabIndex={0}>{children}</pre>,
  }}>{children || ''}</ReactMarkdown></div>;
}
export default function Messages({ messages, busy, tools, onRegenerate, notify }) {
  const end = useRef(null), scroll = useRef(null), nearBottom = useRef(true);
  useEffect(() => { if (nearBottom.current) end.current?.scrollIntoView({ behavior: 'instant', block: 'end' }); }, [messages, tools]);
  useEffect(() => { nearBottom.current = true; end.current?.scrollIntoView({ behavior: 'instant', block: 'end' }); }, [messages[0]?.chat_id]);
  return <div className="messages-scroll" ref={scroll} onScroll={e => { const el = e.currentTarget; nearBottom.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140; }}><div className="messages">
    {messages.map((message, index) => <article className={`message ${message.role}`} key={message.id} aria-label={message.role === 'user' ? '你的消息' : 'Dreamly 的回复'}>
      {message.role === 'assistant' && <div className="assistant-label"><Sparkle size={17} fill="currentColor"/>Dreamly{message.meta?.model && <small>{message.meta.model}</small>}</div>}
      {!!message.content.attachments?.length && <div className="message-attachments">{message.content.attachments.map((a, i) => a.type === 'image' ? <img className="message-image" src={a.content} alt={a.name} key={i}/> : <div className="file-tag" key={i}><FileText size={16}/>{a.name}</div>)}</div>}
      {message.role === 'user' ? <div className="user-bubble">{message.content.text || '请查看附件。'}</div> : <>
        {busy && index === messages.length - 1 && tools.map((tool, i) => <div className="tool-event" key={i}>{tool.status === 'running' ? <LoaderCircle size={14} className="spin"/> : tool.status === 'error' ? <AlertCircle size={14}/> : <Check size={14}/>}<span>{tool.label}</span></div>)}
        <Markdown>{message.content.text}</Markdown>
        {busy && index === messages.length - 1 && !message.content.text && !tools.length && <div className="thinking"><span/><span/><span/><span className="sr-only">正在生成回复</span></div>}
        {message.status === 'error' && <p className="message-error"><AlertCircle size={15}/>{message.meta?.error || '回复中断，请重试。'}</p>}
        {message.status === 'stopped' && <p className="message-note">已停止生成</p>}
        {message.status === 'truncated' && <p className="message-note">已达到本轮回复长度上限，可发送“继续”。</p>}
        {(!busy || index < messages.length - 1) && <div className="message-actions"><IconButton title="复制回复" onClick={async () => { try { await navigator.clipboard.writeText(message.content.text); notify('已复制'); } catch { notify('复制失败，请手动选择文字。'); } }}><Copy size={15}/></IconButton>{index === messages.length - 1 && <IconButton title="重新生成" onClick={onRegenerate}><RotateCcw size={15}/></IconButton>}{message.meta?.usage?.total_tokens > 0 && <span>{message.meta.usage.total_tokens.toLocaleString()} tokens</span>}</div>}
      </>}
    </article>)}<div ref={end}/>
  </div></div>;
}
