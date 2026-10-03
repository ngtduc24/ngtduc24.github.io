import React, { useEffect, useRef, useState } from 'react';
import { X, ImageIcon, ExternalLink, Copy, ScanLine, CameraOff } from 'lucide-react';
import jsQR from 'jsqr';
import { useNotifications } from '../NotificationContext';
import './phone.css';

// Quét mã QR bằng camera sau của điện thoại. Không mở được camera thì chọn ảnh có mã QR trong máy.
// Ảnh camera chỉ xử lý ngay trên máy, không gửi đi đâu.
export default function QrScanner({ onClose }: { onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const [result, setResult] = useState<string | null>(null);
  const [camErr, setCamErr] = useState<string | null>(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    if (result) return;
    let stream: MediaStream | null = null;
    let raf = 0; let stopped = false;
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true });
    const Detector: any = (window as any).BarcodeDetector;
    let detector: any = null;
    const found = (text: string) => { if (stopped) return; stopped = true; try { navigator.vibrate?.(60); } catch { /* bỏ qua */ } setResult(text); };
    (async () => {
      try {
        if (!navigator.mediaDevices?.getUserMedia) throw new Error('nocam');
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: { ideal: 'environment' } }, audio: false });
        if (stopped) { stream.getTracks().forEach(t => t.stop()); return; }
        const v = videoRef.current!; v.srcObject = stream; v.setAttribute('playsinline', 'true'); await v.play();
        try { if (Detector && (await Detector.getSupportedFormats?.())?.includes('qr_code')) detector = new Detector({ formats: ['qr_code'] }); } catch { detector = null; }
        let last = 0;
        const tick = async (t: number) => {
          if (stopped) return;
          raf = requestAnimationFrame(tick);
          if (t - last < 180 || v.readyState < 2) return;
          last = t;
          try {
            if (detector) {
              const codes = await detector.detect(v);
              if (codes?.[0]?.rawValue) { found(codes[0].rawValue); return; }
            } else if (ctx) {
              const w = Math.min(640, v.videoWidth); const h = Math.round(v.videoHeight * (w / v.videoWidth));
              canvas.width = w; canvas.height = h; ctx.drawImage(v, 0, 0, w, h);
              const img = ctx.getImageData(0, 0, w, h);
              const code = jsQR(img.data, w, h, { inversionAttempts: 'dontInvert' });
              if (code?.data) found(code.data);
            }
          } catch { /* khung hình lỗi thì bỏ qua */ }
        };
        raf = requestAnimationFrame(tick);
      } catch (e: any) {
        setCamErr(e?.name === 'NotAllowedError' ? 'Bạn chưa cho phép EduGo dùng camera. Bật quyền camera cho trình duyệt hoặc chọn ảnh có mã QR.' : 'Không mở được camera trên máy này. Bạn chọn ảnh có mã QR trong máy nhé.');
      }
    })();
    return () => { stopped = true; cancelAnimationFrame(raf); stream?.getTracks().forEach(t => t.stop()); };
  }, [result]);

  const fromImage = async (f: File) => {
    const url = URL.createObjectURL(f);
    try {
      const img = new Image(); img.src = url; await img.decode();
      const scale = Math.min(1, 1200 / Math.max(img.width, img.height));
      const c = document.createElement('canvas'); c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      const g = c.getContext('2d')!; g.drawImage(img, 0, 0, c.width, c.height);
      const d = g.getImageData(0, 0, c.width, c.height);
      const code = jsQR(d.data, c.width, c.height);
      if (code?.data) setResult(code.data); else addNotification('Không tìm thấy mã QR trong ảnh này.', 'error');
    } catch { addNotification('Không đọc được ảnh này.', 'error'); } finally { URL.revokeObjectURL(url); }
  };

  const isUrl = !!result && /^https?:\/\//i.test(result);
  const sameSite = isUrl && (() => { try { return new URL(result!).origin === window.location.origin; } catch { return false; } })();
  const open = () => {
    if (!result) return;
    if (sameSite) window.location.assign(result);
    else window.open(result, '_blank', 'noopener');
  };
  const copy = async () => {
    try { await navigator.clipboard.writeText(result || ''); addNotification('Đã chép nội dung mã QR.', 'success'); } catch { addNotification('Trình duyệt chưa cho chép, bạn giữ vào nội dung để chép.', 'error'); }
  };

  return (
    <div className="ph ph-scan" role="dialog" aria-label="Quét mã QR">
      {!camErr && !result && <video ref={videoRef} muted playsInline />}
      <div className="top">
        <button type="button" onClick={onClose} aria-label="Đóng"><X size={22} /></button>
        <b>Quét mã QR</b>
        <button type="button" onClick={() => fileRef.current?.click()} aria-label="Chọn ảnh"><ImageIcon size={20} /></button>
      </div>
      {!result && !camErr && <div className="frame"><i /></div>}
      {!result && camErr && (
        <div style={{ margin: 'auto', textAlign: 'center', padding: 24, position: 'relative', zIndex: 1 }}>
          <CameraOff size={44} style={{ margin: '0 auto 12px', opacity: .7 }} />
          <p style={{ fontSize: 14, lineHeight: 1.5, opacity: .9 }}>{camErr}</p>
          <button type="button" className="ph-btn" style={{ marginTop: 16 }} onClick={() => fileRef.current?.click()}><ImageIcon size={18} />Chọn ảnh có mã QR</button>
        </div>
      )}
      {!result && !camErr && <div className="hint">Đưa mã QR vào giữa khung, EduGo tự nhận ra</div>}
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) fromImage(f); e.target.value = ''; }} />

      {result && (
        <div className="ph-scrim" style={{ background: 'rgba(0,0,0,.55)' }}>
          <div className="ph-sheet" style={{ color: 'var(--ph-text)' }}>
            <div className="grab" />
            <div className="ph-lapico"><ScanLine /></div>
            <h3 style={{ textAlign: 'center' }}>{isUrl ? (sameSite ? 'Đường link EduGo' : 'Đường link') : 'Nội dung mã QR'}</h3>
            <p className="s" style={{ textAlign: 'center', wordBreak: 'break-all', marginTop: 10, color: 'var(--ph-ink)', fontWeight: 600 }}>{result}</p>
            {isUrl && <button type="button" className="ph-btn" style={{ width: '100%', marginTop: 18 }} onClick={open}><ExternalLink size={18} />{sameSite ? 'Mở trong EduGo' : 'Mở đường link'}</button>}
            <button type="button" className={`ph-btn ${isUrl ? 'ghost' : ''}`} style={{ width: '100%', marginTop: 10 }} onClick={copy}><Copy size={18} />Chép nội dung</button>
            <button type="button" className="ph-btn ghost" style={{ width: '100%', marginTop: 10 }} onClick={() => { setResult(null); setCamErr(null); }}>Quét mã khác</button>
          </div>
        </div>
      )}
    </div>
  );
}
