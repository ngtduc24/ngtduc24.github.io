import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  X, Loader2, Volume2, VolumeX, Camera, Download, Share2, Sparkles, Check, RefreshCw
} from 'lucide-react';
import { ARTarget } from '../types';
import { unpackARTarget } from '../lib/arHelpers';
import { loadAFrameRuntime, compileImageToMindBlob } from '../lib/mindar';

interface ARScannerProps {
  target: ARTarget;
  onClose: () => void;
}

// Chuẩn hóa chuỗi trước khi ghép vào thuộc tính HTML, tránh vỡ cú pháp khi URL chứa dấu nháy.
const escapeAttr = (value: string) => String(value || '').replace(/"/g, '&quot;');

export default function ARScanner({ target: rawTarget, onClose }: ARScannerProps) {
  // Giai ma metadata JSON mot lan va ghim on dinh theo rawTarget.
  // Neu tao object moi moi lan render, effect dung a-scene se chay lai va lam camera khoi dong lai.
  const target = useMemo(() => unpackARTarget(rawTarget), [rawTarget]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [mindUrl, setMindUrl] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Đang tải thư viện AR, vui lòng chờ.');
  const [compileProgress, setCompileProgress] = useState<number | null>(null);
  const [muted, setMuted] = useState(true);
  const [targetVisible, setTargetVisible] = useState(false);

  // Photo Capture State
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [flashActive, setFlashActive] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);

  // Gesture Hint State
  const [showGestureHint, setShowGestureHint] = useState(false);

  // Interaction permissions
  const allowRotate = target.allow_user_rotate !== false;
  const allowScale = target.allow_user_scale !== false;
  const allowDrag = target.allow_user_drag === true;
  const hasAnyGesture = allowRotate || allowScale || allowDrag;
  const enableCapture = target.enable_capture !== false;

  // Overlay man hinh quet, bat/tat rieng tung target (mac dinh hien).
  const gestureHintEnabled = target.show_gesture_hint !== false;
  const showCloseButton = target.show_close_button !== false;
  const scanHintEnabled = target.show_scan_hint !== false;

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

    // Ghi nhận các thẻ video có sẵn trước khi AR khởi động
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
  }, [target.target_image_url, target.mind_file_url, target.content_type]);

  // Construct A-Frame Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!mindUrl || !container) return;

    const scale = target.scale || 1;
    const rotationX = target.rotation || 0;
    const posX = target.position_x || 0;
    const posY = target.position_y || 0;
    const posZ = target.position_z || 0;
    const positionStr = `${posX} ${posY} ${posZ}`;
    const contentUrl = escapeAttr(target.content_url);

    // Register Chroma Key shader if needed
    if (target.is_transparent_video && target.content_type === 'video' && typeof (window as any).AFRAME !== 'undefined') {
      const AFRAME = (window as any).AFRAME;
      if (!AFRAME.components['chromakey-material']) {
        AFRAME.registerComponent('chromakey-material', {
          schema: {
            color: {type: 'color', default: target.chroma_key_color || '#00ff00'}
          },
          init: function () {
            const el = this.el;
            const data = this.data;
            const color = new (window as any).THREE.Color(data.color);
            
            el.addEventListener('materialtextureloaded', () => {
              const mesh = el.getObject3D('mesh');
              if (mesh && mesh.material && mesh.material.map) {
                const texture = mesh.material.map;
                
                mesh.material = new (window as any).THREE.ShaderMaterial({
                  uniforms: {
                    color: { value: color },
                    texture: { value: texture }
                  },
                  vertexShader: `
                    varying vec2 vUv;
                    void main() {
                      vUv = uv;
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                  `,
                  fragmentShader: `
                    uniform vec3 color;
                    uniform sampler2D texture;
                    varying vec2 vUv;
                    void main() {
                      vec4 tColor = texture2D(texture, vUv);
                      float distance = length(tColor.rgb - color);
                      float a = (distance < 0.4) ? 0.0 : 1.0;
                      gl_FragColor = vec4(tColor.rgb, tColor.a * a);
                    }
                  `,
                  transparent: true,
                  side: (window as any).THREE.DoubleSide
                });
              }
            });
          }
        });
      }
    }

    let contentHtml = '';

    if (target.content_type === 'video') {
      contentHtml = `
        <a-assets>
          <video id="ar-video" src="${contentUrl}" crossorigin="anonymous" ${target.loop_video !== false ? 'loop="true"' : ''} muted playsinline webkit-playsinline preload="auto"></video>
        </a-assets>
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          ${target.is_transparent_video 
            ? `<a-plane id="ar-content-node" src="#ar-video" chromakey-material="color: ${target.chroma_key_color || '#00ff00'}" position="${positionStr}" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0"></a-plane>`
            : `<a-video id="ar-content-node" src="#ar-video" position="${positionStr}" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0"></a-video>`
          }
        </a-entity>
      `;
    } else if (target.content_type === 'image' || target.content_type === 'gif') {
      contentHtml = `
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-image id="ar-content-node" src="${contentUrl}" position="${positionStr}" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0" transparent="true"></a-image>
        </a-entity>
      `;
    } else if (target.content_type === '3d') {
      contentHtml = `
        <a-assets>
          <a-asset-item id="ar-model" src="${contentUrl}"></a-asset-item>
        </a-assets>
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-gltf-model id="ar-content-node" src="#ar-model" position="${positionStr}" scale="${scale} ${scale} ${scale}" rotation="${rotationX} 0 0" animation-mixer></a-gltf-model>
        </a-entity>
      `;
    }

    // Notice preserveDrawingBuffer: true so screenshot/photo capture can read canvas pixels
    container.innerHTML = `
      <a-scene mindar-image="imageTargetSrc: ${escapeAttr(mindUrl)}; autoStart: true;" color-space="sRGB" renderer="colorManagement: true, physicallyCorrectLights, preserveDrawingBuffer: true" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
        ${contentHtml}
      </a-scene>
    `;

    const forceResize = () => window.dispatchEvent(new Event('resize'));
    const t1 = window.setTimeout(forceResize, 300);
    const t2 = window.setTimeout(forceResize, 1200);
    window.addEventListener('orientationchange', forceResize);

    let onFound: (() => void) | null = null;
    let onLost: (() => void) | null = null;
    let hintTimeout: number | null = null;

    const targetEntity = container.querySelector('[mindar-image-target]');
    const videoEl = container.querySelector('#ar-video') as HTMLVideoElement | null;

    if (targetEntity) {
      if (videoEl) {
        videoEl.muted = true;
      }
      onFound = () => {
        setTargetVisible(true);
        if (hasAnyGesture && gestureHintEnabled) {
          setShowGestureHint(true);
          if (hintTimeout) window.clearTimeout(hintTimeout);
          hintTimeout = window.setTimeout(() => setShowGestureHint(false), 4000);
        }
        if (videoEl && target.auto_play_video !== false) {
          videoEl.play().catch((e) => console.warn('Không tự phát được video AR:', e));
        }
      };
      onLost = () => { 
        setTargetVisible(false);
        setShowGestureHint(false);
        if (videoEl) {
          videoEl.pause(); 
        }
      };
      targetEntity.addEventListener('targetFound', onFound);
      targetEntity.addEventListener('targetLost', onLost);
    }

    // ================= TOUCH & MOUSE GESTURE HANDLING =================
    let touchStartX = 0;
    let touchStartY = 0;
    let lastMidX: number | null = null;
    let lastMidY: number | null = null;
    let initialPinchDist = 0;

    let currentRotY = 0;
    let currentRotX = rotationX;
    let currentScaleFactor = 1;
    let currentPosX = posX;
    let currentPosY = posY;

    let isMouseDown = false;
    let mouseStartX = 0;
    let mouseStartY = 0;

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
      } else if (e.touches.length === 2) {
        initialPinchDist = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        );
        lastMidX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
        lastMidY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      const contentNode = container.querySelector('#ar-content-node') as any;
      if (!contentNode || !contentNode.object3D) return;

      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        // 1-finger: Rotate if enabled
        if (allowRotate) {
          currentRotY += dx * 0.4;
          currentRotX += dy * 0.4;
          contentNode.object3D.rotation.y = (currentRotY * Math.PI) / 180;
          contentNode.object3D.rotation.x = (currentRotX * Math.PI) / 180;
        } 
        // Or Drag if rotate is not enabled
        else if (allowDrag) {
          currentPosX += dx * 0.002;
          currentPosY -= dy * 0.002;
          contentNode.object3D.position.x = currentPosX;
          contentNode.object3D.position.y = currentPosY;
        }
      } else if (e.touches.length === 2) {
        // 2-finger: Pinch to scale
        if (allowScale) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (initialPinchDist > 0) {
            const factor = dist / initialPinchDist;
            currentScaleFactor = Math.min(Math.max(currentScaleFactor * factor, 0.15), 5.0);
            const s = scale * currentScaleFactor;
            contentNode.object3D.scale.set(s, s, s);
          }
          initialPinchDist = dist;
        }

        // 2-finger pan/drag (when rotate is enabled on 1-finger)
        if (allowDrag && allowRotate) {
          const midX = (e.touches[0].clientX + e.touches[1].clientX) / 2;
          const midY = (e.touches[0].clientY + e.touches[1].clientY) / 2;
          if (lastMidX !== null && lastMidY !== null) {
            const dx = midX - lastMidX;
            const dy = midY - lastMidY;
            currentPosX += dx * 0.002;
            currentPosY -= dy * 0.002;
            contentNode.object3D.position.x = currentPosX;
            contentNode.object3D.position.y = currentPosY;
          }
          lastMidX = midX;
          lastMidY = midY;
        }
      }
    };

    const handleTouchEnd = () => {
      lastMidX = null;
      lastMidY = null;
    };

    // Desktop Mouse Fallback
    const handleMouseDown = (e: MouseEvent) => {
      isMouseDown = true;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!isMouseDown) return;
      const contentNode = container.querySelector('#ar-content-node') as any;
      if (!contentNode || !contentNode.object3D) return;

      const dx = e.clientX - mouseStartX;
      const dy = e.clientY - mouseStartY;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;

      if (allowRotate) {
        currentRotY += dx * 0.4;
        currentRotX += dy * 0.4;
        contentNode.object3D.rotation.y = (currentRotY * Math.PI) / 180;
        contentNode.object3D.rotation.x = (currentRotX * Math.PI) / 180;
      } else if (allowDrag) {
        currentPosX += dx * 0.002;
        currentPosY -= dy * 0.002;
        contentNode.object3D.position.x = currentPosX;
        contentNode.object3D.position.y = currentPosY;
      }
    };

    const handleMouseUp = () => {
      isMouseDown = false;
    };

    const handleWheel = (e: WheelEvent) => {
      if (!allowScale) return;
      const contentNode = container.querySelector('#ar-content-node') as any;
      if (!contentNode || !contentNode.object3D) return;

      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      currentScaleFactor = Math.min(Math.max(currentScaleFactor * delta, 0.15), 5.0);
      const s = scale * currentScaleFactor;
      contentNode.object3D.scale.set(s, s, s);
    };

    if (hasAnyGesture) {
      container.addEventListener('touchstart', handleTouchStart, { passive: true });
      container.addEventListener('touchmove', handleTouchMove, { passive: true });
      container.addEventListener('touchend', handleTouchEnd);
      container.addEventListener('mousedown', handleMouseDown);
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      container.addEventListener('wheel', handleWheel, { passive: true });
    }

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (hintTimeout) window.clearTimeout(hintTimeout);
      window.removeEventListener('orientationchange', forceResize);
      if (targetEntity && onFound) targetEntity.removeEventListener('targetFound', onFound);
      if (targetEntity && onLost) targetEntity.removeEventListener('targetLost', onLost);

      if (hasAnyGesture) {
        container.removeEventListener('touchstart', handleTouchStart);
        container.removeEventListener('touchmove', handleTouchMove);
        container.removeEventListener('touchend', handleTouchEnd);
        container.removeEventListener('mousedown', handleMouseDown);
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        container.removeEventListener('wheel', handleWheel);
      }
      container.innerHTML = '';
    };
  }, [mindUrl, target, allowRotate, allowScale, allowDrag, hasAnyGesture]);

  // Sound Toggle
  const toggleSound = () => {
    const videoEl = containerRef.current?.querySelector('#ar-video') as HTMLVideoElement | null;
    if (!videoEl) return;
    const next = !videoEl.muted;
    videoEl.muted = next;
    setMuted(next);
    if (!next) videoEl.play().catch(() => {});
  };

  // Photo Capture Shutter Handler
  const handleTakePhoto = async () => {
    if (isTakingPhoto) return;
    setIsTakingPhoto(true);
    setFlashActive(true);
    setTimeout(() => setFlashActive(false), 300);

    try {
      // Luong camera nam o the video khong phai #ar-video
      const video = document.querySelector('video:not(#ar-video)') as HTMLVideoElement | null;
      const sceneEl = containerRef.current?.querySelector('a-scene') as any;
      const glCanvas =
        (sceneEl?.renderer?.domElement as HTMLCanvasElement | undefined) ||
        (containerRef.current?.querySelector('canvas.a-canvas') as HTMLCanvasElement | null);

      if (!video) {
        throw new Error('Không tìm thấy luồng camera');
      }

      // Kich thuoc anh xuat theo canvas WebGL de vat the 3D khop 1:1 voi khung hinh.
      const outW = glCanvas?.width || video.videoWidth || window.innerWidth;
      const outH = glCanvas?.height || video.videoHeight || window.innerHeight;

      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = outW;
      captureCanvas.height = outH;
      const ctx = captureCanvas.getContext('2d');

      if (!ctx) throw new Error('Không thể khởi tạo canvas 2D');

      // 1. Ve khung camera theo kieu phu (cover) dung nhu CSS object-fit: cover tren man hinh.
      const vW = video.videoWidth || outW;
      const vH = video.videoHeight || outH;
      const coverScale = Math.max(outW / vW, outH / vH);
      const dw = vW * coverScale;
      const dh = vH * coverScale;
      const dx = (outW - dw) / 2;
      const dy = (outH - dh) / 2;
      ctx.drawImage(video, dx, dy, dw, dh);

      // 2. Ep three.js render mot khung ngay truoc khi doc, roi ve dong bo de bat duoc vat the 3D,
      //    hinh anh hoac video AR. A-Frame khong giu preserveDrawingBuffer nen phai render lai tai cho.
      if (sceneEl?.renderer && sceneEl?.object3D && sceneEl?.camera) {
        try {
          sceneEl.renderer.render(sceneEl.object3D, sceneEl.camera);
        } catch (renderErr) {
          console.warn('Không render lại được khung AR trước khi chụp:', renderErr);
        }
      }
      if (glCanvas) {
        ctx.drawImage(glCanvas, 0, 0, outW, outH);
      }

      const dataUrl = captureCanvas.toDataURL('image/png', 0.95);
      setCapturedPhoto(dataUrl);
    } catch (e: any) {
      console.error('Lỗi khi chụp ảnh AR:', e);
      setStatusText('Không thể chụp ảnh: ' + (e.message || e));
    } finally {
      setIsTakingPhoto(false);
    }
  };

  // Photo Download Handler
  const handleDownloadPhoto = () => {
    if (!capturedPhoto) return;
    const link = document.createElement('a');
    link.download = `AR_${target.name.replace(/\s+/g, '_')}_${Date.now()}.png`;
    link.href = capturedPhoto;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Photo Share Handler (Web Share API)
  const handleSharePhoto = async () => {
    if (!capturedPhoto) return;
    try {
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      const file = new File([blob], 'ar-photo.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({
          title: target.name,
          text: `Ảnh chụp AR: ${target.name}`,
          files: [file],
        });
      } else {
        handleDownloadPhoto();
      }
    } catch {
      handleDownloadPhoto();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      {/* Flash Effect on capture */}
      {flashActive && (
        <div className="fixed inset-0 z-[100] bg-white pointer-events-none transition-opacity duration-300 opacity-90" />
      )}

      {/* Top Controls */}
      {showCloseButton && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors shadow-lg border border-white/10"
          title="Đóng AR"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {!loading && !error && target.content_type === 'video' && (
        <button
          onClick={toggleSound}
          className="absolute top-4 right-20 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors shadow-lg border border-white/10"
          title={muted ? 'Bật tiếng' : 'Tắt tiếng'}
        >
          {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      )}

      {/* Gesture Hint Banner */}
      {showGestureHint && (
        <div className="absolute top-20 inset-x-4 max-w-sm mx-auto z-[60] bg-black/70 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-2xl border border-white/15 shadow-xl flex items-center gap-2.5 animate-in fade-in slide-in-from-top-3 duration-300">
          <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
          <div className="leading-snug">
            <span className="font-semibold text-amber-300 block">Tương tác 3D:</span>
            <span className="text-slate-200">
              {[
                allowRotate && 'Dùng 1 ngón vuốt để xoay',
                allowScale && '2 ngón để phóng to/nhỏ',
                allowDrag && 'Kéo để đổi vị trí',
              ]
                .filter(Boolean)
                .join(' • ')}
            </span>
          </div>
        </div>
      )}

      {/* Scan instruction hint (hien khi chua tim thay target) */}
      {!loading && !error && scanHintEnabled && !targetVisible && (
        <div className="absolute bottom-32 inset-x-0 flex justify-center z-[58] px-6 pointer-events-none animate-in fade-in duration-500">
          <div className="bg-black/55 backdrop-blur-md text-white text-xs sm:text-sm px-4 py-2.5 rounded-2xl border border-white/10 shadow-lg text-center max-w-xs leading-snug">
            Hướng camera vào ảnh mục tiêu để bắt đầu trải nghiệm AR
          </div>
        </div>
      )}

      {/* Loading Overlay */}
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

      {/* Error Overlay */}
      {error && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8" />
          </div>
          <p className="text-xl font-bold font-display text-rose-500 mb-2">Lỗi Khởi Tạo</p>
          <p className="text-slate-300">{error}</p>
        </div>
      )}

      {/* A-Frame Scene Container */}
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
        style={{ opacity: loading || error ? 0 : 1 }}
      />
      
      {/* Call to Action Button */}
      {targetVisible && target.button_label && target.button_url && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center z-[70] px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <a
            href={target.button_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 bg-brand text-white font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2 border border-white/20 backdrop-blur-sm"
          >
            {target.button_label}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          </a>
        </div>
      )}

      {/* Photo Capture Shutter Button (Enabled via setting) */}
      {!loading && !error && enableCapture && (
        <div className="absolute bottom-6 inset-x-0 flex justify-center z-[75] pointer-events-none">
          <button
            type="button"
            onClick={handleTakePhoto}
            disabled={isTakingPhoto}
            className="pointer-events-auto group relative w-16 h-16 rounded-full bg-white/20 backdrop-blur-md p-1 border-2 border-white flex items-center justify-center shadow-2xl hover:scale-105 active:scale-90 transition-all cursor-pointer"
            title="Chụp ảnh AR"
          >
            <div className="w-12 h-12 rounded-full bg-white group-hover:bg-slate-100 flex items-center justify-center shadow transition">
              <Camera className="w-6 h-6 text-slate-800" />
            </div>
          </button>
        </div>
      )}

      {/* Photo Preview & Save Modal */}
      {capturedPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6 animate-in fade-in duration-200">
          {/* Top Bar */}
          <div className="w-full max-w-md flex items-center justify-between text-white">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-amber-400" />
              <span className="font-bold text-sm sm:text-base">Ảnh chụp AR</span>
            </div>
            <button
              type="button"
              onClick={() => setCapturedPhoto(null)}
              className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition"
              title="Đóng"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Photo Frame */}
          <div className="my-auto max-w-md max-h-[70vh] w-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black flex items-center justify-center">
            <img
              src={capturedPhoto}
              alt="AR Captured"
              className="w-full h-full object-contain max-h-[68vh]"
            />
          </div>

          {/* Bottom Action Buttons */}
          <div className="w-full max-w-md flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={() => setCapturedPhoto(null)}
              className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-4 h-4" /> Chụp lại
            </button>
            <button
              type="button"
              onClick={handleSharePhoto}
              className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center"
              title="Chia sẻ"
            >
              <Share2 className="w-5 h-5" />
            </button>
            <button
              type="button"
              onClick={handleDownloadPhoto}
              className="flex-1 py-3 px-4 rounded-xl bg-brand hover:opacity-90 text-white text-sm font-bold shadow-lg transition flex items-center justify-center gap-2"
            >
              <Download className="w-4 h-4" /> Tải về máy
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
