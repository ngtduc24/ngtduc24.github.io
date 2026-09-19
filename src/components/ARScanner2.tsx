import React, { useEffect, useRef, useState } from 'react';
import { X, Loader2, Download, Share2, Sparkles, RefreshCw, Camera } from 'lucide-react';
import { ARTarget } from '../types';
import { unpackARTarget } from '../lib/arHelpers';
import { loadXR8Runtime, buildImageTargetData } from '../lib/xr8';

interface ARScanner2Props {
  target: ARTarget;
  onClose: () => void;
}

const escapeAttr = (value: string) => String(value || '').replace(/"/g, '&quot;');

// Trình quét AR 2.0 dùng engine 8th Wall mã nguồn mở. Bám ảnh ổn định hơn MindAR, chụp ảnh
// bằng API canvasScreenshot của engine nên nét và gồm cả nền camera.
export default function ARScanner2({ target: rawTarget, onClose }: ARScanner2Props) {
  const target = unpackARTarget(rawTarget);

  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [statusText, setStatusText] = useState('Đang tải engine AR 2.0, vui lòng chờ.');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const targetDataRef = useRef<any>(null);
  const targetName = `t_${target.id}`;

  const allowRotate = target.allow_user_rotate !== false;
  const allowDrag = target.allow_user_drag === true;
  const showCloseButton = target.show_close_button !== false;
  const enableCapture = target.enable_capture !== false;

  // Nạp engine, dựng dữ liệu image target từ ảnh gốc, cấu hình engine.
  useEffect(() => {
    let active = true;

    const prepare = async () => {
      try {
        if (!target.target_image_url) {
          throw new Error('Không tìm thấy ảnh Target để bám hình.');
        }
        setStatusText('Đang tải engine và thư viện AR 2.0.');
        await loadXR8Runtime();
        if (!active) return;

        setStatusText('Đang xử lý ảnh target.');
        const data = await buildImageTargetData(target.target_image_url, targetName);
        if (!active) return;
        targetDataRef.current = data;

        const XR8 = (window as any).XR8;
        const configure = () => {
          try {
            XR8.XrController.configure({ imageTargetData: [data] });
          } catch (e) {
            console.warn('Lỗi cấu hình image target:', e);
          }
        };
        // Cấu hình ngay và lặp lại khi engine sẵn sàng để chắc chắn dữ liệu target được nạp.
        configure();
        window.addEventListener('xrloaded', configure);

        // Thêm module chụp ảnh của engine để lấy ảnh nét gồm cả nền camera.
        try {
          if (XR8.CanvasScreenshot) {
            XR8.addCameraPipelineModule(XR8.CanvasScreenshot.pipelineModule());
          }
        } catch (e) {
          console.warn('Không thêm được module chụp ảnh:', e);
        }

        if (active) {
          setLoading(false);
          setReady(true);
        }
      } catch (err: any) {
        if (active) {
          console.error('Lỗi chuẩn bị AR 2.0:', err);
          setError(err?.message || 'Lỗi chuẩn bị AR 2.0');
          setLoading(false);
        }
      }
    };

    prepare();

    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id, target.target_image_url]);

  // Dựng scene A-Frame 8th Wall sau khi engine sẵn sàng.
  useEffect(() => {
    const container = containerRef.current;
    if (!ready || !container) return;

    // Màn hình thiết kế chuẩn hóa ảnh target theo chiều cao bằng 1, còn 8th Wall chuẩn hóa
    // theo chiều rộng bằng 1, tức khung cục bộ có chiều rộng 1 và chiều cao 1/tỉ_lệ. Do đó
    // để nội dung hiện đúng chỗ đã đặt, ta chia vị trí và tỉ lệ cho tỉ lệ khung hình của ảnh.
    const data = targetDataRef.current;
    const aspect =
      data && data.properties && data.properties.originalHeight
        ? data.properties.originalWidth / data.properties.originalHeight
        : 1;
    const k = aspect || 1;

    const scale = (target.scale || 1) / k;
    const rotX = typeof target.rotation_x === 'number' ? target.rotation_x : (target.rotation || 0);
    const rotY = target.rotation_y || 0;
    const rotZ = target.rotation_z || 0;
    const rotationStr = `${rotX} ${rotY} ${rotZ}`;
    const posX = (target.position_x || 0) / k;
    const posY = (target.position_y || 0) / k;
    const posZ = (target.position_z || 0) / k;
    const positionStr = `${posX} ${posY} ${posZ}`;
    const scaleStr = `${scale} ${scale} ${scale}`;
    const contentUrl = escapeAttr(target.content_url);

    // Cử chỉ tương tác gắn trực tiếp lên nội dung, dùng thành phần của xrextras.
    const gestureAttrs = [
      allowRotate ? 'xrextras-one-finger-rotate' : '',
      allowDrag ? 'xrextras-hold-drag' : '',
    ]
      .filter(Boolean)
      .join(' ');

    let assetsHtml = '';
    let nodeHtml = '';

    if (target.content_type === 'video') {
      assetsHtml = `
        <a-assets>
          <video id="ar-video" src="${contentUrl}" crossorigin="anonymous" autoplay muted playsinline webkit-playsinline ${target.loop_video !== false ? 'loop="true"' : ''} preload="auto"></video>
        </a-assets>
      `;
      nodeHtml = `<a-video src="#ar-video" position="${positionStr}" scale="${scaleStr}" rotation="${rotationStr}" class="cantap" ${gestureAttrs}></a-video>`;
    } else if (target.content_type === 'image' || target.content_type === 'gif') {
      nodeHtml = `<a-image src="${contentUrl}" position="${positionStr}" scale="${scaleStr}" rotation="${rotationStr}" transparent="true" class="cantap" ${gestureAttrs}></a-image>`;
    } else if (target.content_type === '3d') {
      assetsHtml = `
        <a-assets>
          <a-asset-item id="ar-model" src="${contentUrl}"></a-asset-item>
        </a-assets>
      `;
      nodeHtml = `<a-gltf-model src="#ar-model" position="${positionStr}" scale="${scaleStr}" rotation="${rotationStr}" class="cantap" ${gestureAttrs}></a-gltf-model>`;
    }

    container.innerHTML = `
      <a-scene
        xrextras-gesture-detector
        xrextras-loading
        xrextras-runtime-error
        renderer="colorManagement: true"
        xrweb="disableWorldTracking: true"
        vr-mode-ui="enabled: false"
        device-orientation-permission-ui="enabled: false">
        ${assetsHtml}
        <a-camera position="0 0 0" raycaster="objects: .cantap" cursor="fuse: false; rayOrigin: mouse;"></a-camera>
        <a-light type="ambient" intensity="1.3"></a-light>
        <a-light type="directional" intensity="1.0" position="1 1 1"></a-light>
        <xrextras-named-image-target name="${escapeAttr(targetName)}">
          ${nodeHtml}
        </xrextras-named-image-target>
      </a-scene>
    `;

    const sceneEl = container.querySelector('a-scene') as any;
    // Cấu hình lại khi engine thực sự sẵn sàng, phòng khi xrweb ghi đè cấu hình mặc định.
    const onRealityReady = () => {
      try {
        const XR8 = (window as any).XR8;
        if (XR8 && targetDataRef.current) {
          XR8.XrController.configure({ imageTargetData: [targetDataRef.current] });
        }
      } catch (e) {
        console.warn('Lỗi cấu hình lại image target:', e);
      }
    };
    if (sceneEl) sceneEl.addEventListener('realityready', onRealityReady);

    const preexistingVideos = new Set(Array.from(document.querySelectorAll('video')));

    return () => {
      if (sceneEl) sceneEl.removeEventListener('realityready', onRealityReady);
      // Dừng camera và dọn scene khi thoát.
      try {
        const XR8 = (window as any).XR8;
        if (XR8 && XR8.stop) XR8.stop();
      } catch (_e) {
        // engine chưa chạy, bỏ qua
      }
      document.querySelectorAll('video').forEach((v) => {
        if (preexistingVideos.has(v)) return;
        const stream = v.srcObject as MediaStream | null;
        if (stream) stream.getTracks().forEach((t) => t.stop());
      });
      container.innerHTML = '';
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready]);

  const handleTakePhoto = async () => {
    if (isTakingPhoto) return;
    setIsTakingPhoto(true);
    setFlashActive(true);
    window.setTimeout(() => setFlashActive(false), 300);
    try {
      const XR8 = (window as any).XR8;
      if (XR8 && XR8.canvasScreenshot) {
        const data: string = await XR8.canvasScreenshot().takeScreenshot();
        setCapturedPhoto('data:image/jpeg;base64,' + data);
      } else {
        throw new Error('Chức năng chụp chưa sẵn sàng.');
      }
    } catch (e: any) {
      console.error('Lỗi chụp ảnh AR 2.0:', e);
    } finally {
      setIsTakingPhoto(false);
    }
  };

  const handleDownloadPhoto = () => {
    if (!capturedPhoto) return;
    const link = document.createElement('a');
    link.href = capturedPhoto;
    link.download = `AR_${target.name || 'photo'}_${Date.now()}.jpg`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSharePhoto = async () => {
    if (!capturedPhoto) return;
    try {
      const res = await fetch(capturedPhoto);
      const blob = await res.blob();
      const file = new File([blob], `AR_${target.name || 'photo'}.jpg`, { type: 'image/jpeg' });
      if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
        await (navigator as any).share({ title: `Ảnh chụp AR: ${target.name}`, files: [file] });
      } else {
        handleDownloadPhoto();
      }
    } catch {
      handleDownloadPhoto();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      {flashActive && (
        <div className="fixed inset-0 z-[100] bg-white pointer-events-none transition-opacity duration-300 opacity-90" />
      )}

      {/* Nhãn AR 2.0 */}
      <div className="absolute top-4 left-4 z-[60] bg-brand/80 backdrop-blur-md text-white px-3 py-1.5 rounded-full text-[11px] font-black tracking-wider shadow-lg">
        AR 2.0
      </div>

      {target.show_target_name && target.name && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-black/60 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold shadow-lg max-w-[60vw] truncate">
          {target.name}
        </div>
      )}

      {showCloseButton && (
        <button
          onClick={onClose}
          className="absolute top-4 right-4 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors shadow-lg border border-white/10"
          title="Đóng AR"
        >
          <X className="w-6 h-6" />
        </button>
      )}

      {loading && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 text-white px-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand mb-4" />
          <p className="text-lg font-bold font-display animate-pulse">Đang chuẩn bị AR 2.0...</p>
          <p className="text-sm text-slate-400 mt-2">{statusText}</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4">
            <X className="w-8 h-8" />
          </div>
          <p className="text-xl font-bold font-display text-rose-500 mb-2">Lỗi Khởi Tạo AR 2.0</p>
          <p className="text-slate-300">{error}</p>
        </div>
      )}

      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
        style={{ opacity: loading || error ? 0 : 1 }}
      />

      {!loading && !error && target.button_label && target.button_url && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center z-[70] px-4">
          <a
            href={target.button_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 bg-brand text-white font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2 border border-white/20 backdrop-blur-sm"
          >
            {target.button_label}
          </a>
        </div>
      )}

      {!loading && !error && enableCapture && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center z-[70]">
          <button
            type="button"
            onClick={handleTakePhoto}
            disabled={isTakingPhoto}
            className="w-16 h-16 bg-white/20 backdrop-blur-md border-4 border-white rounded-full flex items-center justify-center shadow-2xl hover:bg-white/40 active:scale-95 transition-all group disabled:opacity-60"
            title="Chụp ảnh AR"
          >
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner group-active:scale-90 transition-transform">
              <Camera className="w-6 h-6 text-slate-800" />
            </div>
          </button>
        </div>
      )}

      {capturedPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6">
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

          <div className="my-auto max-w-md max-h-[70vh] w-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black flex items-center justify-center">
            <img src={capturedPhoto} alt="AR Captured" className="w-full h-full object-contain max-h-[68vh]" />
          </div>

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
