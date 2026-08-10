import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Volume2, VolumeX } from 'lucide-react';
import { ARTarget } from '../types';
import { loadAFrameRuntime, compileImageToMindBlob } from '../lib/mindar';

interface ARScannerProps {
  target: ARTarget;
  onClose: () => void;
}

// Chuẩn hóa chuỗi trước khi ghép vào thuộc tính HTML, tránh vỡ cú pháp khi URL chứa dấu nháy.
const escapeAttr = (value: string) => String(value || '').replace(/"/g, '&quot;');

export default function ARScanner({ target, onClose }: ARScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mindUrl, setMindUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Đang tải thư viện AR, vui lòng chờ.');
  const [compileProgress, setCompileProgress] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);

  // Ép camera và canvas AR phủ full màn hình trên mobile.
  useEffect(() => {
    const style = document.createElement('style');
    style.id = 'ar-fullscreen-fix';
    style.textContent = `
      html, body { margin: 0 !important; padding: 0 !important; overflow: hidden !important; height: 100%; }
      a-scene, .a-canvas, a-scene canvas {
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
      }
      video:not(#ar-video) {
        position: fixed !important;
        top: 0 !important;
        left: 0 !important;
        width: 100vw !important;
        height: 100vh !important;
        height: 100dvh !important;
        object-fit: cover !important;
      }
    `;
    document.head.appendChild(style);
    return () => { document.getElementById('ar-fullscreen-fix')?.remove(); };
  }, []);

  useEffect(() => {
    let active = true;
    let createdObjectUrl: string | null = null;

    // Ghi nhận các thẻ video có sẵn trước khi AR khởi động, để lúc dọn dẹp
    // chỉ tắt đúng camera do AR tạo ra chứ không tắt video khác trên trang.
    const preexistingVideos = new Set(Array.from(document.querySelectorAll('video')));

    const prepareEnvironment = async () => {
      try {
        if (!target.target_image_url && !target.mind_file_url) {
          throw new Error('Không tìm thấy đường dẫn ảnh Target.');
        }

        // 1. Ưu tiên tệp .mind đã biên dịch sẵn lúc tạo AR target.
        let finalMindUrl = target.mind_file_url || '';

        if (!finalMindUrl && target.target_image_url.endsWith('.mind')) {
          finalMindUrl = target.target_image_url;
        }

        // 2. Chỉ biên dịch tại chỗ khi AR target cũ chưa có tệp .mind.
        if (!finalMindUrl) {
          setStatusText('Đang biên dịch ảnh target lần đầu, quá trình này có thể mất một phút.');
          setCompileProgress(0);
          const blob = await compileImageToMindBlob(target.target_image_url, (percent) => {
            if (active) setCompileProgress(percent);
          });
          if (!active) return;
          createdObjectUrl = URL.createObjectURL(blob);
          finalMindUrl = createdObjectUrl;
          setCompileProgress(null);
        }

        // 3. Nạp A-Frame và MindAR sau khi đã có dữ liệu target.
        setStatusText('Đang khởi động camera và môi trường AR.');
        await loadAFrameRuntime(target.content_type === '3d');

        if (active) {
          setMindUrl(finalMindUrl);
          setLoading(false);
        }
      } catch (err: any) {
        if (active) {
          console.error('Lỗi chuẩn bị AR:', err);
          setError(err?.message || 'Lỗi chuẩn bị AR');
          setLoading(false);
        }
      }
    };

    prepareEnvironment();

    return () => {
      active = false;
      if (createdObjectUrl) URL.revokeObjectURL(createdObjectUrl);
      document.querySelectorAll('video').forEach((v) => {
        if (preexistingVideos.has(v)) return;
        const stream = v.srcObject as MediaStream | null;
        if (stream) stream.getTracks().forEach((track) => track.stop());
      });
    };
  }, [target]);

  useEffect(() => {
    // Dựng scene A-Frame bằng DOM thuần để tránh xung đột vòng đời giữa React và Custom Elements.
    const container = containerRef.current;
    if (!mindUrl || !container) return;

    const scale = target.scale || 1;
    const rotationX = target.rotation || 0;
    const contentUrl = escapeAttr(target.content_url);

    let contentHtml = '';

    if (target.content_type === 'video') {
      // Thuộc tính muted là bắt buộc, nếu thiếu thì iOS Safari và Chrome Android
      // sẽ chặn autoplay và video không bao giờ chạy khi nhận diện được target.
      contentHtml = `
        <a-assets>
          <video id="ar-video" src="${contentUrl}" crossorigin="anonymous" loop="true" muted playsinline webkit-playsinline preload="auto"></video>
        </a-assets>
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-video src="#ar-video" position="0 0 0" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0"></a-video>
        </a-entity>
      `;
    } else if (target.content_type === 'image' || target.content_type === 'gif') {
      contentHtml = `
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-image src="${contentUrl}" position="0 0 0" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0" transparent="true"></a-image>
        </a-entity>
      `;
    } else if (target.content_type === '3d') {
      contentHtml = `
        <a-assets>
          <a-asset-item id="ar-model" src="${contentUrl}"></a-asset-item>
        </a-assets>
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-gltf-model src="#ar-model" position="0 0 0" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0" animation-mixer></a-gltf-model>
        </a-entity>
      `;
    }

    container.innerHTML = `
      <a-scene mindar-image="imageTargetSrc: ${escapeAttr(mindUrl)}; autoStart: true;" color-space="sRGB" renderer="colorManagement: true, physicallyCorrectLights" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
        ${contentHtml}
      </a-scene>
    `;

    const forceResize = () => window.dispatchEvent(new Event('resize'));
    const t1 = window.setTimeout(forceResize, 300);
    const t2 = window.setTimeout(forceResize, 1200);
    window.addEventListener('orientationchange', forceResize);

    let onFound: (() => void) | null = null;
    let onLost: (() => void) | null = null;
    let targetEntity: Element | null = null;

    if (target.content_type === 'video') {
      targetEntity = container.querySelector('[mindar-image-target]');
      const videoEl = container.querySelector('#ar-video') as HTMLVideoElement | null;

      if (targetEntity && videoEl) {
        videoEl.muted = true;
        onFound = () => {
          videoEl.play().catch((e) => console.warn('Không tự phát được video AR:', e));
        };
        onLost = () => { videoEl.pause(); };
        targetEntity.addEventListener('targetFound', onFound);
        targetEntity.addEventListener('targetLost', onLost);
      }
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('orientationchange', forceResize);
      if (targetEntity && onFound) targetEntity.removeEventListener('targetFound', onFound);
      if (targetEntity && onLost) targetEntity.removeEventListener('targetLost', onLost);
      container.innerHTML = '';
    };
  }, [mindUrl, target]);

  // Người dùng phải chạm để bật tiếng, đây là ràng buộc của trình duyệt chứ không phải lỗi ứng dụng.
  const toggleSound = () => {
    const videoEl = containerRef.current?.querySelector('#ar-video') as HTMLVideoElement | null;
    if (!videoEl) return;
    const next = !videoEl.muted;
    videoEl.muted = next;
    setMuted(next);
    if (!next) videoEl.play().catch(() => {});
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {!loading && !error && target.content_type === 'video' && (
        <button
          onClick={toggleSound}
          className="absolute top-4 right-20 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
          title={muted ? 'Bật tiếng' : 'Tắt tiếng'}
        >
          {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      )}

      {loading && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 text-white px-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand mb-4" />
          <p className="text-lg font-bold font-display animate-pulse">Đang chuẩn bị môi trường AR...</p>
          <p className="text-sm text-slate-400 mt-2">{statusText}</p>
          {compileProgress !== null && (
            <div className="w-full max-w-xs mt-4">
              <div className="h-1.5 w-full bg-white/15 rounded-full overflow-hidden">
                <div className="h-full bg-brand transition-all duration-300" style={{ width: `${compileProgress}%` }} />
              </div>
              <p className="text-xs text-slate-400 mt-2">{compileProgress}%</p>
            </div>
          )}
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8" />
          </div>
          <p className="text-xl font-bold font-display text-rose-500 mb-2">Lỗi Khởi Tạo</p>
          <p className="text-slate-300">{error}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
        style={{ opacity: loading || error ? 0 : 1 }}
      />
    </div>
  );
}
