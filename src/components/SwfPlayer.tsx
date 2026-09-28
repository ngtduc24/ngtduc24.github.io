import React, { useEffect, useRef, useState } from 'react';

// Trình xem tệp Flash (.swf) trên trình duyệt hiện đại, dùng Ruffle (bộ giả lập Flash mã nguồn mở,
// giấy phép MIT/Apache 2.0) tải từ jsDelivr lúc cần. Trình duyệt đã bỏ Flash Player từ 2021 nên
// không mở .swf trực tiếp được. Ruffle chạy tốt với hoạt hình và bài tương tác ActionScript 1, 2,
// phần lớn ActionScript 3 đơn giản.
const RUFFLE_BASE = 'https://cdn.jsdelivr.net/npm/@ruffle-rs/ruffle/';
let loading: Promise<any> | null = null;

function loadRuffle(): Promise<any> {
  const w = window as any;
  if (w.RufflePlayer?.newest) return Promise.resolve(w.RufflePlayer);
  if (!loading) {
    loading = new Promise((resolve, reject) => {
      w.RufflePlayer = w.RufflePlayer || {};
      w.RufflePlayer.config = { publicPath: RUFFLE_BASE, autoplay: 'on', unmuteOverlay: 'hidden', letterbox: 'on', warnOnUnsupportedContent: false, splashScreen: false };
      const s = document.createElement('script');
      s.src = RUFFLE_BASE + 'ruffle.js';
      s.async = true;
      s.onload = () => resolve(w.RufflePlayer);
      s.onerror = () => { loading = null; reject(new Error('Không tải được trình phát Flash.')); };
      document.head.appendChild(s);
    });
  }
  return loading;
}

export const isSwfFile = (name?: string, type?: string) =>
  /\.swf$/i.test(name || '') || /shockwave-flash/i.test(type || '');

export default function SwfPlayer({ url, className }: { url: string; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'error'>('loading');
  const [msg, setMsg] = useState('');

  useEffect(() => {
    let player: any = null;
    let alive = true;
    setState('loading');
    loadRuffle().then(rp => {
      if (!alive || !box.current) return;
      const ruffle = rp.newest();
      player = ruffle.createPlayer();
      player.style.width = '100%';
      player.style.height = '100%';
      box.current.innerHTML = '';
      box.current.appendChild(player);
      return Promise.resolve(player.load({ url, allowScriptAccess: false })).then(() => { if (alive) setState('ready'); });
    }).catch((e: any) => { if (alive) { setState('error'); setMsg(e?.message || String(e)); } });
    return () => { alive = false; try { player?.remove?.(); } catch { /* bỏ qua */ } };
  }, [url]);

  return (
    <div className={`relative w-full h-full min-h-[320px] bg-black rounded-xl overflow-hidden ${className || ''}`}>
      <div ref={box} className="absolute inset-0" />
      {state === 'loading' && <div className="absolute inset-0 flex items-center justify-center text-sm text-white/80">Đang mở tệp Flash...</div>}
      {state === 'error' && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-center px-6 text-white/90">
          <p className="text-sm font-semibold">Không phát được tệp Flash này.</p>
          <p className="text-xs text-white/60">{msg}</p>
          <a href={url} target="_blank" rel="noreferrer" className="text-xs underline text-white">Tải tệp về</a>
        </div>
      )}
    </div>
  );
}
