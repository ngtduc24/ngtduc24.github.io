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

    // Khớp với màn hình thiết kế (ARStudioWorkspace). Ở đó tấm ảnh target rộng 1.6 đơn vị,
    // ảnh nội dung rộng 1.2 theo tỉ lệ thật, video 1.2 x 0.8, mô hình 3D được canh tâm hộp bao
    // về gốc và tự thu phóng về cỡ 1 nếu quá to hoặc quá nhỏ. Trang quét làm y hệt.
    // Đơn vị của 8th Wall không đoán mà đo thật từ sự kiện xrimagefound: bề rộng ảnh trong
    // khung cục bộ bằng scaledWidth chia scale, rồi quy đổi hệ số = bề rộng cục bộ / 1.6.
    // Theo ví dụ chính thức của 8th Wall (examples/aframe/flyer), một tấm phẳng đặt thẳng vào
    // image target với rotation 0 0 0 đã nằm khớp ảnh, tức khung cục bộ của 8th Wall trùng hệ
    // với màn thiết kế (ảnh dựng đứng trong mặt XY, pháp tuyến +Z, +Y là hướng lên). Vì vậy
    // KHÔNG bọc xoay gì thêm. Lớp xoay 0 0 -90 trước đây làm nội dung xoay 90 độ trong mặt ảnh,
    // khiến phải hóa xuống và vị trí lệch so với thiết kế.
    const EDITOR_TARGET_WIDTH = 1.6;
    const eScale = target.scale || 1;
    const eX = target.position_x || 0;
    const eY = target.position_y || 0;
    const eZ = target.position_z || 0;
    const rotX = typeof target.rotation_x === 'number' ? target.rotation_x : (target.rotation || 0);
    const rotY = target.rotation_y || 0;
    const rotZ = target.rotation_z || 0;
    const rotationStr = `${rotX} ${rotY} ${rotZ}`;
    // Hệ số tạm trước khi đo được từ sự kiện nhận diện, giả định bề rộng cục bộ bằng 1.
    const factor0 = 1 / EDITOR_TARGET_WIDTH;
    const positionStr = `${eX * factor0} ${eY * factor0} ${eZ * factor0}`;
    const scaleStr = `${eScale * factor0} ${eScale * factor0} ${eScale * factor0}`;
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
      // Video trong màn thiết kế là tấm 1.2 x 0.8.
      nodeHtml = `<a-video src="#ar-video" width="1.2" height="0.8" class="cantap" ${gestureAttrs}></a-video>`;
    } else if (target.content_type === 'image' || target.content_type === 'gif') {
      // Ảnh trong màn thiết kế rộng 1.2, chiều cao theo tỉ lệ thật, cập nhật khi tải xong texture.
      nodeHtml = `<a-image id="ar-image-el" src="${contentUrl}" width="1.2" height="1.2" transparent="true" class="cantap" ${gestureAttrs}></a-image>`;
    } else if (target.content_type === '3d') {
      assetsHtml = `
        <a-assets>
          <a-asset-item id="ar-model" src="${contentUrl}"></a-asset-item>
        </a-assets>
      `;
      nodeHtml = `<a-gltf-model id="ar-model-el" src="#ar-model" class="cantap" ${gestureAttrs}></a-gltf-model>`;
    }
    // Vị trí, tỉ lệ, xoay của người dùng đặt lên entity bọc ngoài, giống contentGroup ở màn thiết kế.
    nodeHtml = `<a-entity id="ar-content" position="${positionStr}" scale="${scaleStr}" rotation="${rotationStr}">${nodeHtml}</a-entity>`;

    container.innerHTML = `
      <a-scene
        xrextras-gesture-detector
        landing-page
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

    // Ảnh chụp nét hơn: mặc định của 8th Wall giới hạn cạnh dài 1280px và nén JPEG 75 nên ảnh
    // bị mờ. Nâng cạnh dài lên 2560px và chất lượng 95. Gọi trước khi engine chạy và gọi lại
    // khi realityready để chắc chắn có hiệu lực.
    const configureScreenshot = () => {
      try {
        const XR8 = (window as any).XR8;
        if (XR8?.CanvasScreenshot?.configure) {
          XR8.CanvasScreenshot.configure({ maxDimension: 2560, jpgCompression: 95 });
        }
      } catch (e) {
        console.warn('Không cấu hình được chất lượng ảnh chụp:', e);
      }
    };
    configureScreenshot();

    // Cấu hình lại khi engine thực sự sẵn sàng, phòng khi xrweb ghi đè cấu hình mặc định.
    const onRealityReady = () => {
      configureScreenshot();
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

    // Đo đơn vị thật của 8th Wall khi nhận diện được ảnh, rồi áp lại vị trí và tỉ lệ cho khớp thiết kế.
    const contentEl = container.querySelector('#ar-content') as any;
    const applyFactor = (f: number) => {
      if (!contentEl) return;
      contentEl.setAttribute('position', `${eX * f} ${eY * f} ${eZ * f}`);
      contentEl.setAttribute('scale', `${eScale * f} ${eScale * f} ${eScale * f}`);
    };
    const onImageFound = (e: any) => {
      const d = e?.detail || {};
      if (d.name && d.name !== targetName) return;
      if (d.scaledWidth && d.scale) {
        const localWidth = d.scaledWidth / d.scale;
        applyFactor(localWidth / EDITOR_TARGET_WIDTH);
      }
    };
    if (sceneEl) sceneEl.addEventListener('xrimagefound', onImageFound);

    // Mô hình 3D: canh tâm hộp bao về gốc và thu phóng về cỡ 1 nếu quá to hoặc quá nhỏ,
    // làm đúng như màn thiết kế để vị trí và kích thước trùng nhau.
    const modelEl = container.querySelector('#ar-model-el') as any;
    const onModelLoaded = () => {
      try {
        const T = (window as any).AFRAME?.THREE;
        const obj = modelEl?.getObject3D?.('mesh');
        if (!T || !obj) return;
        obj.updateWorldMatrix(true, true);
        const inv = new T.Matrix4().copy(obj.matrixWorld).invert();
        const box = new T.Box3();
        obj.traverse((child: any) => {
          if (child.isMesh && child.geometry) {
            child.geometry.computeBoundingBox();
            const b = child.geometry.boundingBox.clone().applyMatrix4(child.matrixWorld).applyMatrix4(inv);
            box.union(b);
          }
        });
        if (box.isEmpty()) return;
        const center = box.getCenter(new T.Vector3());
        obj.position.sub(center);
        const size = box.getSize(new T.Vector3());
        const maxDim = Math.max(size.x, size.y, size.z);
        if (maxDim > 3 || maxDim < 0.1) obj.scale.multiplyScalar(1.0 / (maxDim || 1));
      } catch (err) {
        console.warn('Không chuẩn hóa được mô hình 3D:', err);
      }
    };
    if (modelEl) modelEl.addEventListener('model-loaded', onModelLoaded);

    // Ảnh nội dung: sau khi tải texture thì đặt chiều cao theo tỉ lệ thật với bề rộng 1.2.
    const imgEl = container.querySelector('#ar-image-el') as any;
    const onTextureLoaded = (e: any) => {
      const img = e?.detail?.texture?.image;
      if (img && img.width && img.height && imgEl) imgEl.setAttribute('height', String(1.2 * img.height / img.width));
    };
    if (imgEl) imgEl.addEventListener('materialtextureloaded', onTextureLoaded);

    const preexistingVideos = new Set(Array.from(document.querySelectorAll('video')));

    return () => {
      if (sceneEl) sceneEl.removeEventListener('realityready', onRealityReady);
      if (sceneEl) sceneEl.removeEventListener('xrimagefound', onImageFound);
      if (modelEl) modelEl.removeEventListener('model-loaded', onModelLoaded);
      if (imgEl) imgEl.removeEventListener('materialtextureloaded', onTextureLoaded);
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
