import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { X, RotateCcw, RotateCw, FlipHorizontal2, FlipVertical2, ZoomIn, ZoomOut, Loader2, Check, Undo2 } from 'lucide-react';

// Cửa sổ cắt ảnh: kéo để dời, lăn chuột hoặc chụm 2 ngón để phóng to, xoay 90 độ, lật ngang dọc.
// Khung cắt đúng hình ô hiển thị (tròn cho ảnh đại diện). Bấm Xong trả về ảnh đã cắt dạng data URL.
export default function ImageCropper({ src, aspect = 1, round = true, outWidth = 640, title = 'Chỉnh ảnh đại diện', onCancel, onDone }: {
  src: string; aspect?: number; round?: boolean; outWidth?: number; title?: string;
  onCancel: () => void; onDone: (dataUrl: string) => Promise<void> | void;
}) {
  const imgRef = useRef<HTMLImageElement | null>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null);
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);
  const [stageW, setStageW] = useState(320);
  const [zoom, setZoom] = useState(1);
  const [rot, setRot] = useState(0);          // 0, 90, 180, 270
  const [flipX, setFlipX] = useState(1);
  const [flipY, setFlipY] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const stageH = stageW / aspect;

  // Tải ảnh có quyền đọc điểm ảnh (crossOrigin) để vẽ ra canvas khi cắt.
  useEffect(() => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => { imgRef.current = img; setNat({ w: img.naturalWidth, h: img.naturalHeight }); };
    img.onerror = () => setErr('Không tải được ảnh này để chỉnh. Bạn thử chọn lại ảnh từ máy.');
    img.src = src;
  }, [src]);

  // Khung cắt co giãn theo màn hình (điện thoại hẹp, máy tính rộng hơn).
  useEffect(() => {
    const fit = () => setStageW(Math.max(200, Math.min(window.innerWidth - 48, 420, (window.innerHeight - 340) * aspect)));
    fit(); window.addEventListener('resize', fit);
    return () => window.removeEventListener('resize', fit);
  }, [aspect]);

  const sideways = rot % 180 !== 0;
  const rw = nat ? (sideways ? nat.h : nat.w) : 1;
  const rh = nat ? (sideways ? nat.w : nat.h) : 1;
  const base = Math.max(stageW / rw, stageH / rh);  // vừa phủ kín khung khi zoom = 1
  const dispW = rw * base * zoom, dispH = rh * base * zoom;
  const clamp = (p: { x: number; y: number }, z = zoom) => {
    const mx = Math.max(0, (rw * base * z - stageW) / 2), my = Math.max(0, (rh * base * z - stageH) / 2);
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) };
  };
  useEffect(() => { setPan(p => clamp(p)); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [zoom, rot, stageW, nat]);

  // Kéo bằng chuột hoặc 1 ngón, chụm 2 ngón để phóng to.
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ d: number; z: number } | null>(null);
  const onDown = (e: React.PointerEvent) => { (e.target as HTMLElement).setPointerCapture?.(e.pointerId); pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY }); if (pts.current.size === 2) { const [a, b] = [...pts.current.values()]; pinch.current = { d: Math.hypot(a.x - b.x, a.y - b.y), z: zoom }; } };
  const onMove = (e: React.PointerEvent) => {
    const prev = pts.current.get(e.pointerId); if (!prev) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pts.current.size >= 2 && pinch.current) {
      const [a, b] = [...pts.current.values()];
      setZoom(Math.min(5, Math.max(1, pinch.current.z * Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.d)));
    } else if (pts.current.size === 1) {
      setPan(p => clamp({ x: p.x + e.clientX - prev.x, y: p.y + e.clientY - prev.y }));
    }
  };
  const onUp = (e: React.PointerEvent) => { pts.current.delete(e.pointerId); if (pts.current.size < 2) pinch.current = null; };
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const wheel = (e: WheelEvent) => { e.preventDefault(); setZoom(z => Math.min(5, Math.max(1, z * (e.deltaY < 0 ? 1.08 : 1 / 1.08)))); };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const reset = () => { setZoom(1); setRot(0); setFlipX(1); setFlipY(1); setPan({ x: 0, y: 0 }); };

  const done = async () => {
    const img = imgRef.current; if (!img || !nat) return;
    setBusy(true);
    try {
      const k = outWidth / stageW;
      const c = document.createElement('canvas');
      c.width = outWidth; c.height = Math.round(outWidth / aspect);
      const g = c.getContext('2d')!;
      g.imageSmoothingQuality = 'high';
      g.translate(c.width / 2 + pan.x * k, c.height / 2 + pan.y * k);
      g.rotate((rot * Math.PI) / 180);
      g.scale(flipX * base * zoom * k, flipY * base * zoom * k);
      g.drawImage(img, -nat.w / 2, -nat.h / 2);
      const url = c.toDataURL('image/jpeg', 0.9);
      await onDone(url);
    } catch {
      setErr('Không cắt được ảnh này (máy chủ ảnh chặn đọc). Bạn tải ảnh lên lại từ máy rồi chỉnh.');
    } finally { setBusy(false); }
  };

  const tool = 'grid h-11 w-11 place-items-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-brand active:scale-95';
  return createPortal(
    <div className="fixed inset-0 z-[400] flex items-end justify-center bg-slate-900/60 sm:items-center sm:p-4" onClick={onCancel}>
      <div className="max-h-[100dvh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white p-4 pb-[calc(16px+env(safe-area-inset-bottom))] shadow-2xl sm:rounded-3xl sm:p-5" onClick={e => e.stopPropagation()} role="dialog" aria-label={title}>
        <div className="mb-3 flex items-center justify-between">
          <h3 className="text-base font-black text-slate-900">{title}</h3>
          <button onClick={onCancel} className="grid h-9 w-9 place-items-center rounded-full text-slate-400 hover:bg-slate-100" aria-label="Đóng"><X className="h-5 w-5" /></button>
        </div>

        <div className="flex justify-center">
          <div ref={stageRef} className="relative touch-none select-none overflow-hidden rounded-2xl bg-slate-900" style={{ width: stageW, height: stageH, cursor: 'grab' }}
            onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}>
            {nat ? (
              <img src={src} alt="" draggable={false} crossOrigin="anonymous" className="pointer-events-none absolute left-1/2 top-1/2 max-w-none"
                style={{ width: nat.w, height: nat.h, transform: `translate(-50%, -50%) translate(${pan.x}px, ${pan.y}px) rotate(${rot}deg) scale(${flipX * base * zoom}, ${flipY * base * zoom})`, transformOrigin: 'center' }} />
            ) : !err && <div className="absolute inset-0 grid place-items-center text-white/70"><Loader2 className="h-6 w-6 animate-spin" /></div>}
            {/* Phần ngoài khung bị làm tối, đúng hình ô hiển thị */}
            {round && <div className="pointer-events-none absolute inset-0 rounded-full" style={{ boxShadow: '0 0 0 9999px rgba(15,23,42,.55)', outline: '2px solid rgba(255,255,255,.9)', outlineOffset: -2 }} />}
            {!round && <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-inset ring-white/90" />}
          </div>
        </div>
        {err && <p className="mt-3 rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-600">{err}</p>}
        <p className="mt-2 text-center text-[11px] text-slate-400">Kéo ảnh để chọn vùng, lăn chuột hoặc chụm 2 ngón để phóng to</p>

        <div className="mt-3 flex items-center gap-2">
          <button className={tool} onClick={() => setZoom(z => Math.max(1, z / 1.15))} aria-label="Thu nhỏ"><ZoomOut className="h-5 w-5" /></button>
          <input type="range" min={1} max={5} step={0.01} value={zoom} onChange={e => setZoom(Number(e.target.value))} className="flex-1 accent-brand" aria-label="Mức phóng to" />
          <button className={tool} onClick={() => setZoom(z => Math.min(5, z * 1.15))} aria-label="Phóng to"><ZoomIn className="h-5 w-5" /></button>
        </div>
        <div className="mt-1 flex items-center justify-between">
          <div className="flex">
            <button className={tool} onClick={() => setRot(r => (r + 270) % 360)} aria-label="Xoay trái" title="Xoay trái"><RotateCcw className="h-5 w-5" /></button>
            <button className={tool} onClick={() => setRot(r => (r + 90) % 360)} aria-label="Xoay phải" title="Xoay phải"><RotateCw className="h-5 w-5" /></button>
            <button className={`${tool} ${flipX < 0 ? 'bg-brand-light text-brand' : ''}`} onClick={() => setFlipX(f => -f)} aria-label="Lật ngang" title="Lật ngang"><FlipHorizontal2 className="h-5 w-5" /></button>
            <button className={`${tool} ${flipY < 0 ? 'bg-brand-light text-brand' : ''}`} onClick={() => setFlipY(f => -f)} aria-label="Lật dọc" title="Lật dọc"><FlipVertical2 className="h-5 w-5" /></button>
            <button className={tool} onClick={reset} aria-label="Đặt lại" title="Đặt lại"><Undo2 className="h-5 w-5" /></button>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-2">
          <button onClick={onCancel} className="h-12 rounded-2xl border border-slate-200 text-sm font-bold text-slate-600 hover:bg-slate-50">Huỷ</button>
          <button onClick={done} disabled={!nat || busy} className="flex h-12 items-center justify-center gap-2 rounded-2xl bg-brand text-sm font-bold text-white hover:bg-brand-hover disabled:opacity-50">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />} Xong
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
