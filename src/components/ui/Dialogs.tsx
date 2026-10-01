import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AlertCircle } from 'lucide-react';

// Hộp thoại trong giao diện thay cho alert, prompt của trình duyệt (không dùng thông báo JS mặc định).
// Gọi trực tiếp như hàm, không cần bọc Provider.

function mount<T>(render: (done: (v: T) => void) => React.ReactElement): Promise<T> {
  return new Promise(resolve => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const root = createRoot(host);
    const done = (v: T) => { resolve(v); setTimeout(() => { root.unmount(); host.remove(); }, 0); };
    root.render(render(done));
  });
}

function Shell({ onClose, children, width = 'max-w-md' }: { onClose: () => void; children: React.ReactNode; width?: string }) {
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  }, [onClose]);
  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className={`w-full ${width} rounded-2xl border border-slate-100 bg-white p-5 shadow-2xl`}>{children}</div>
    </div>
  );
}

// Nhập một dòng chữ (ví dụ đường link). Trả về chuỗi đã nhập (có thể rỗng), hoặc null nếu bấm Hủy.
export function askText(opts: { title: string; label?: string; defaultValue?: string; placeholder?: string; okText?: string }): Promise<string | null> {
  return mount<string | null>(done => <AskText {...opts} done={done} />);
}
function AskText({ title, label, defaultValue, placeholder, okText, done }: { title: string; label?: string; defaultValue?: string; placeholder?: string; okText?: string; done: (v: string | null) => void }) {
  const [v, setV] = useState(defaultValue || '');
  const ref = useRef<HTMLInputElement>(null);
  useEffect(() => { ref.current?.focus(); ref.current?.select(); }, []);
  return (
    <Shell onClose={() => done(null)}>
      <p className="text-sm font-bold text-slate-800">{title}</p>
      {label && <p className="mt-1 text-xs text-slate-500">{label}</p>}
      <input ref={ref} value={v} onChange={e => setV(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') done(v.trim()); }} placeholder={placeholder}
        className="mt-3 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-sm outline-none focus:border-brand" />
      <div className="mt-4 flex justify-end gap-2">
        <button onClick={() => done(null)} className="rounded-xl bg-slate-100 px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200">Hủy</button>
        <button onClick={() => done(v.trim())} className="rounded-xl bg-brand px-4 py-2 text-xs font-bold text-white hover:bg-brand-hover">{okText || 'Đồng ý'}</button>
      </div>
    </Shell>
  );
}

// Sao chép chữ vào bộ nhớ tạm. Gọi ngay trong lúc bấm (chưa await gì trước đó) để trình duyệt cho phép.
export function copyText(text: string): Promise<boolean> {
  const fallback = () => {
    try {
      const ta = document.createElement('textarea');
      ta.value = text; ta.setAttribute('readonly', '');
      ta.style.position = 'fixed'; ta.style.opacity = '0'; ta.style.left = '-9999px';
      document.body.appendChild(ta); ta.select();
      const ok = document.execCommand('copy');
      ta.remove();
      return ok;
    } catch { return false; }
  };
  const done = (ok: boolean) => { if (ok) checkSharePreview(text); return ok; };
  if (navigator.clipboard?.writeText) return navigator.clipboard.writeText(text).then(() => true, () => fallback()).then(done);
  return Promise.resolve(done(fallback()));
}

// Link chia sẻ /<thư mục>/<mã>/ chỉ có tên và ảnh bìa khi dán vào Zalo, Facebook sau khi trang đã
// tạo xong trang tĩnh cho link đó. Link vừa tạo thì báo cho người dùng biết để không dán quá sớm,
// vì Zalo, Facebook sẽ ghi nhớ khung xem trước trống của lần dán đầu tiên.
const SHARE_PATH_RE = /^\/(bt|bg|hl|tn|vr|ar|nb|c|p|r|b)\/[A-Za-z0-9_-]{1,120}\/$/;
function checkSharePreview(text: string) {
  let u: URL;
  try { u = new URL(text); } catch { return; }
  if (u.origin !== window.location.origin || !SHARE_PATH_RE.test(u.pathname) || /localhost|127\.0\.0\.1/.test(u.hostname)) return;
  fetch(u.pathname, { method: 'HEAD', cache: 'no-store' })
    .then(r => {
      if (r.status === 404) notice('Đã sao chép link. Link này vừa tạo nên trang chưa cập nhật khung xem trước, đợi trang cập nhật xong rồi hãy dán vào Zalo, Facebook để hiện tên và ảnh bìa.', 'info', 9000);
    })
    .catch(() => { /* bỏ qua */ });
}

// Thông báo ngắn góc màn hình, tự ẩn.
export function notice(message: string, tone: 'error' | 'info' = 'error', ms = 4000) {
  const host = document.createElement('div');
  document.body.appendChild(host);
  const root = createRoot(host);
  root.render(
    <div className="fixed bottom-6 left-1/2 z-[9999] -translate-x-1/2 px-4">
      <div className={`flex items-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold shadow-xl ${tone === 'error' ? 'bg-rose-600 text-white' : 'bg-slate-900 text-white'}`}>
        <AlertCircle className="h-4 w-4 shrink-0" /> {message}
      </div>
    </div>
  );
  setTimeout(() => { root.unmount(); host.remove(); }, ms);
}
