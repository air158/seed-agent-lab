import { useEffect, useRef } from 'react';
import { X, Sparkle } from 'lucide-react';
export function Brand({ compact = false }) { return <span className="brand"><Sparkle aria-hidden="true" className="brand-mark" fill="currentColor"/>{!compact && <span>Dreamly</span>}</span>; }
export function IconButton({ title, children, ...props }) { return <button type="button" className="icon-button" title={title} aria-label={title} {...props}>{children}</button>; }
export function Modal({ title, onClose, children, wide = false }) {
  const ref = useRef(null);
  useEffect(() => { const el = ref.current; el.showModal(); return () => el.close(); }, []);
  return <dialog ref={ref} className={`modal ${wide ? 'wide' : ''}`} onCancel={onClose} onClick={e => { if (e.target === ref.current) { const r = e.currentTarget.getBoundingClientRect(); if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) onClose(); } }}>
    <header className="modal-header"><h2>{title}</h2><IconButton title="关闭" onClick={onClose}><X size={20}/></IconButton></header>{children}
  </dialog>;
}
export function Empty({ icon: Icon, title, children }) { return <div className="empty-state">{Icon && <Icon size={32} strokeWidth={1.4}/>}<h3>{title}</h3><p>{children}</p></div>; }
