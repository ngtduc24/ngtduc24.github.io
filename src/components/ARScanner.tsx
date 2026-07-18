import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import { ARTarget } from '../types';

interface ARScannerProps {
  target: ARTarget;
  onClose: () => void;
}

export default function ARScanner({ target, onClose }: ARScannerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mindUrl, setMindUrl] = useState<string | null>(null);

  // Ép camera + canvas AR phủ full màn hình trên mobile (khắc phục khung hình không đầy)
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

    const prepareEnvironment = async () => {
      try {
        if (!target.target_image_url) throw new Error("Không tìm thấy đường dẫn ảnh Target.");
        
        // 1. Tải A-Frame 1.5.0 (Tương thích tốt nhất với MindAR 1.2.5)
        if (!(window as any).AFRAME) {
          const aframeScript = document.createElement('script');
          aframeScript.src = 'https://aframe.io/releases/1.5.0/aframe.min.js';
          document.head.appendChild(aframeScript);
          await new Promise((resolve, reject) => { aframeScript.onload = resolve; aframeScript.onerror = () => reject(new Error('Không tải được thư viện A-Frame. Kiểm tra kết nối mạng hoặc CDN.')); });
        }

        // 2. Tải MindAR cho A-Frame (Không kèm theo Three.js động, tránh lỗi)
        if (!customElements.get('mindar-image-system')) {
          const mindarScript = document.createElement('script');
          mindarScript.src = 'https://cdn.jsdelivr.net/npm/mind-ar@1.2.5/dist/mindar-image-aframe.prod.js';
          document.head.appendChild(mindarScript);
          await new Promise((resolve, reject) => { mindarScript.onload = resolve; mindarScript.onerror = () => reject(new Error('Không tải được thư viện MindAR. Kiểm tra kết nối mạng hoặc CDN.')); });
        }
        
        // Tải A-Frame Extras cho animation GLTF nếu là nội dung 3D
        if (target.content_type === '3d' && !customElements.get('animation-mixer')) {
          const extrasScript = document.createElement('script');
          extrasScript.src = 'https://cdn.jsdelivr.net/gh/c-frame/aframe-extras@7.2.0/dist/aframe-extras.min.js';
          document.head.appendChild(extrasScript);
          await new Promise((resolve, reject) => { extrasScript.onload = resolve; extrasScript.onerror = () => reject(new Error('Không tải được A-Frame Extras. Kiểm tra kết nối mạng hoặc CDN.')); });
        }

        // 3. Biên dịch file .mind nếu là ảnh tĩnh
        let finalMindUrl = target.target_image_url;
        if (!finalMindUrl.endsWith('.mind')) {
          setLoading(true);
          // @ts-ignore
          const core = await import("https://esm.sh/mind-ar@1.2.5/dist/mindar-image.prod.js");
          const Compiler = core.Compiler || (window as any).MINDAR?.IMAGE?.Compiler;
          const compiler = new Compiler();
          
          const loadImage = (src: string): Promise<HTMLImageElement> => new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = "anonymous";
            img.onload = () => resolve(img);
            img.onerror = reject;
            img.src = src;
          });

          const img = await loadImage(finalMindUrl);
          await compiler.compileImageTargets([img], (progress: number) => {
            console.log('Compiling target progress:', progress);
          });
          const exportedBuffer = await compiler.exportData();
          const blob = new Blob([exportedBuffer]);
          finalMindUrl = URL.createObjectURL(blob);
        }

        if (active) {
          setMindUrl(finalMindUrl);
          setLoading(false);
        }

      } catch (err: any) {
        if (active) {
          console.error("Lỗi chuẩn bị AR:", err);
          setError(err.message || "Lỗi chuẩn bị AR");
          setLoading(false);
        }
      }
    };

    prepareEnvironment();

    return () => {
      active = false;
      // Dừng stream camera nếu A-Frame đã khởi tạo
      const videos = document.querySelectorAll('video');
      videos.forEach(v => {
        if (v.srcObject) {
          const stream = v.srcObject as MediaStream;
          stream.getTracks().forEach(track => track.stop());
        }
      });
    };
  }, [target]);

  useEffect(() => {
    // Render A-Frame scene bằng DOM element để tránh lỗi lifecycle của React với Custom Elements
    if (!mindUrl || !containerRef.current) return;
    
    const scale = target.scale || 1;
    const rotationX = target.rotation || 0; // A-Frame rotation tính bằng độ (ví dụ: -90 0 0)
    
    let contentHtml = '';
    
    if (target.content_type === 'video') {
      contentHtml = `
        <a-assets>
          <video id="ar-video" src="${target.content_url}" crossorigin="anonymous" loop="true" playsinline webkit-playsinline></video>
        </a-assets>
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-plane src="#ar-video" position="0 0 0" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0"></a-plane>
        </a-entity>
      `;
    } else if (target.content_type === 'image' || target.content_type === 'gif') {
      contentHtml = `
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-image src="${target.content_url}" position="0 0 0" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0" transparent="true"></a-image>
        </a-entity>
      `;
    } else if (target.content_type === '3d') {
      contentHtml = `
        <a-assets>
          <a-asset-item id="ar-model" src="${target.content_url}"></a-asset-item>
        </a-assets>
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-gltf-model src="#ar-model" position="0 0 0" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0" animation-mixer></a-gltf-model>
        </a-entity>
      `;
    }

    const sceneHtml = `
      <a-scene mindar-image="imageTargetSrc: ${mindUrl}; autoStart: true;" color-space="sRGB" renderer="colorManagement: true, physicallyCorrectLights" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
        ${contentHtml}
      </a-scene>
    `;

    containerRef.current.innerHTML = sceneHtml;

    // Buộc A-Frame/MindAR tính lại kích thước sau khi camera khởi động (tránh khung hình bị hụt)
    const forceResize = () => window.dispatchEvent(new Event('resize'));
    const t1 = window.setTimeout(forceResize, 300);
    const t2 = window.setTimeout(forceResize, 1200);
    window.addEventListener('orientationchange', forceResize);

    // Handle video play/pause on target found/lost event
    if (target.content_type === 'video') {
      const targetEntity = containerRef.current.querySelector('[mindar-image-target]');
      const videoEl = containerRef.current.querySelector('#ar-video') as HTMLVideoElement;
      
      if (targetEntity && videoEl) {
        targetEntity.addEventListener('targetFound', () => {
          videoEl.play().catch(e => console.error("Video play error:", e));
        });
        targetEntity.addEventListener('targetLost', () => {
          videoEl.pause();
        });
      }
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      window.removeEventListener('orientationchange', forceResize);
      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }
    };
  }, [mindUrl, target]);

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center">
      <button 
        onClick={onClose}
        className="absolute top-4 right-4 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors"
      >
        <X className="w-6 h-6" />
      </button>

      {loading && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 text-white">
          <Loader2 className="w-12 h-12 animate-spin text-brand mb-4" />
          <p className="text-lg font-bold font-display animate-pulse">Đang chuẩn bị môi trường AR...</p>
          <p className="text-sm text-slate-400 mt-2">Đang tải cấu trúc A-Frame, vui lòng chờ.</p>
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
