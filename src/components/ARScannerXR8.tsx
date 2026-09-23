import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { X, Loader2, Download, Share2, Sparkles, RefreshCw, Camera, ScanLine } from 'lucide-react';
import { ARTarget } from '../types';
import { unpackARTarget } from '../lib/arHelpers';
import { loadXR8, buildLuminanceImage, buildTargetData, XR8Crop } from '../lib/xr8os';
import { applyPBRMaterialToObject, DEFAULT_PBR_MATERIAL } from '../lib/pbrMaterialHelper';

interface ARScannerXR8Props {
  target: ARTarget;
  onClose: () => void;
}

// Trình quét AR dùng 8th Wall Engine mã nguồn mở (MIT) làm lõi bám ảnh, còn cảnh 3D dựng bằng
// three.js của chính studio thiết kế (cùng cách nạp mô hình, chất liệu, ánh sáng, môi trường).
//
// Hệ tọa độ 8th Wall cho image target phẳng: tâm vùng cắt 3:4 ở gốc, chiều cao vùng cắt bằng 1,
// bề rộng bằng width/height, nằm trong mặt XY hướng +Z. Studio dựng cả tấm target rộng 1.6 đơn vị.
// Nhóm gốc quy đổi: tỉ lệ k = W/(1.6·h) và dịch để tâm vùng cắt trùng gốc của 8th Wall.
const STUDIO_TARGET_WIDTH = 1.6;

export default function ARScannerXR8({ target: rawTarget, onClose }: ARScannerXR8Props) {
  const target = unpackARTarget(rawTarget);

  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Đang chuẩn bị trình quét.');
  const [found, setFound] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  const rt = useRef<{
    contentGroup?: THREE.Group;
    baseScale: number;
    userScale: number;
    userRotY: number;
    userRotX: number;
    userDX: number;
    userDY: number;
  }>({ baseScale: 1, userScale: 1, userRotY: 0, userRotX: 0, userDX: 0, userDY: 0 });

  const allowRotate = target.allow_user_rotate !== false;
  const allowScale = target.allow_user_scale !== false;
  const allowDrag = target.allow_user_drag === true;
  const showCloseButton = target.show_close_button !== false;
  const enableCapture = target.enable_capture !== false;
  const showGestureHint = target.show_gesture_hint !== false && target.content_type === '3d';

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let active = true;
    let XR8: any = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let canvasEl: HTMLCanvasElement | null = null;
    let blobUrl: string | null = null;
    let resizeObs: ResizeObserver | null = null;
    let restoreGUM: (() => void) | null = null;
    const videoTextures: HTMLVideoElement[] = [];
    const MODULE_NAME = 'smartresearch-studio-scene';

    // Độ phân giải canvas: engine không tự đặt canvas.width/height, nếu để mặc định (300×150) thì
    // luồng camera bị kéo giãn ra toàn màn hình nên rất mờ. Ta đặt theo kích thước thật của màn hình
    // nhân tỉ lệ điểm ảnh (tối đa 2 và cạnh dài không quá 2560 để máy yếu vẫn chạy mượt).
    const MAX_EDGE = 2560;
    const sizeCanvas = (c: HTMLCanvasElement) => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      let w = Math.max(1, Math.round(container.clientWidth * dpr));
      let h = Math.max(1, Math.round(container.clientHeight * dpr));
      const long = Math.max(w, h);
      if (long > MAX_EDGE) { const k = MAX_EDGE / long; w = Math.round(w * k); h = Math.round(h * k); }
      if (c.width !== w || c.height !== h) { c.width = w; c.height = h; }
    };

    // Chất lượng camera: engine chỉ xin luồng tối thiểu 960×720 (iOS) nên ảnh quét và ảnh chụp mờ.
    // Bọc getUserMedia để xin thêm độ phân giải mong muốn Full HD, vẫn giữ nguyên hướng camera engine
    // yêu cầu. Dùng "ideal" nên máy không hỗ trợ sẽ tự trả về mức gần nhất, không gây lỗi.
    const upgradeCamera = () => {
      const md = navigator.mediaDevices;
      if (!md || !md.getUserMedia) return;
      const orig = md.getUserMedia.bind(md);
      md.getUserMedia = (constraints: any) => {
        try {
          const v = constraints && constraints.video;
          if (v && typeof v === 'object' && !v.width?.exact && !v.height?.exact) {
            const nv = { ...v, width: { ...(v.width || {}), ideal: 1920 }, height: { ...(v.height || {}), ideal: 1080 }, frameRate: { ideal: 30 } };
            return orig({ ...constraints, video: nv });
          }
        } catch { /* dùng ràng buộc gốc */ }
        return orig(constraints);
      };
      restoreGUM = () => { md.getUserMedia = orig; };
    };

    const start = async () => {
      try {
        // 1. Dữ liệu image target: ưu tiên ảnh xám đã tạo lúc lưu target, không có thì tạo tại chỗ.
        setStatusText('Đang chuẩn bị dữ liệu nhận diện ảnh.');
        const cfg: any = (target as any).xr8_target || null;
        let crop: XR8Crop;
        let luminanceUrl: string;
        if (cfg && cfg.luminance_url && cfg.crop) {
          crop = cfg.crop; luminanceUrl = cfg.luminance_url;
        } else {
          if (!target.target_image_url) throw new Error('Không tìm thấy ảnh Target để bám hình.');
          const built = await buildLuminanceImage(target.target_image_url, 'center');
          crop = built.crop;
          blobUrl = URL.createObjectURL(built.blob);
          luminanceUrl = blobUrl;
        }
        if (!active) return;
        const targetData = buildTargetData(target.id || target.name || 'target', luminanceUrl, crop);

        // 2. Nạp 8th Wall Engine
        setStatusText('Đang tải 8th Wall Engine.');
        XR8 = await loadXR8();
        if (!active) return;

        // 3. Scene three.js dựng giống studio
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(60, 1, 0.01, 1000);
        scene.add(camera);

        // Nhóm bám theo target, 8th Wall cấp vị trí, góc xoay, tỉ lệ mỗi khung hình.
        const anchor = new THREE.Group();
        anchor.visible = false;
        scene.add(anchor);

        // Nhóm gốc quy đổi đơn vị studio sang hệ của 8th Wall (xem chú thích đầu tệp).
        const W = crop.originalWidth, H = crop.originalHeight;
        const pxToStudio = STUDIO_TARGET_WIDTH / W;
        const k = 1 / (crop.height * pxToStudio);
        const cx = (crop.left + crop.width / 2 - W / 2) * pxToStudio;
        const cy = -(crop.top + crop.height / 2 - H / 2) * pxToStudio;
        const root = new THREE.Group();
        root.scale.set(k, k, k);
        root.position.set(-cx * k, -cy * k, 0);
        anchor.add(root);

        // 4a. Ánh sáng đúng như studio (mặc định là hemisphere trắng cường độ 1).
        const lights = (target.scene_lights && target.scene_lights.length > 0)
          ? target.scene_lights
          : [{ id: 'light_ambient', name: 'Sáng môi trường', type: 'hemisphere' as const, color: '#ffffff', intensity: 1.0, position: { x: 0, y: 0, z: 0 }, visible: true }];
        lights.forEach((light) => {
          if (light.visible === false) return;
          const group = new THREE.Group();
          let lightObj: THREE.Light;
          if (light.type === 'directional') {
            const d = new THREE.DirectionalLight(light.color, light.intensity);
            d.castShadow = light.castShadow || false;
            root.add(d.target);
            d.target.position.set(0, 0, 0);
            lightObj = d;
          } else if (light.type === 'point') {
            const p = new THREE.PointLight(light.color, light.intensity);
            p.castShadow = light.castShadow || false;
            lightObj = p;
          } else if (light.type === 'hemisphere') {
            lightObj = new THREE.HemisphereLight(light.color, 0x444444, light.intensity);
          } else {
            lightObj = new THREE.AmbientLight(light.color, light.intensity);
          }
          group.add(lightObj);
          group.position.set(light.position?.x ?? 0, light.position?.y ?? 0, light.position?.z ?? 0);
          if (light.rotation) {
            group.rotation.set(
              (light.rotation.x ?? 0) * (Math.PI / 180),
              (light.rotation.y ?? 0) * (Math.PI / 180),
              (light.rotation.z ?? 0) * (Math.PI / 180)
            );
          }
          root.add(group);
        });

        // 4b. Nhóm nội dung chính với đúng vị trí, tỉ lệ, xoay của studio.
        const contentGroup = new THREE.Group();
        const baseScale = target.scale || 1;
        const rotX = typeof target.rotation_x === 'number' ? target.rotation_x : (target.rotation || 0);
        const rotY = target.rotation_y || 0;
        const rotZ = target.rotation_z || 0;
        contentGroup.position.set(target.position_x || 0, target.position_y || 0, target.position_z || 0);
        contentGroup.scale.set(baseScale, baseScale, baseScale);
        contentGroup.rotation.set(rotX * (Math.PI / 180), rotY * (Math.PI / 180), rotZ * (Math.PI / 180));
        root.add(contentGroup);
        rt.current = { ...rt.current, contentGroup, baseScale, userScale: 1, userRotY: 0, userRotX: 0, userDX: 0, userDY: 0 };

        const mainMaterial = target.material_config || DEFAULT_PBR_MATERIAL;

        // Nạp một nội dung vào group cho trước, lặp lại đúng cách studio làm.
        const loadContent = (grp: THREE.Group, type: string, url: string, material: any) => {
          if (!url) return;
          if (type === '3d') {
            const finish = (obj: THREE.Object3D) => {
              const box = new THREE.Box3().setFromObject(obj);
              const center = box.getCenter(new THREE.Vector3());
              obj.position.sub(center);
              const size = box.getSize(new THREE.Vector3());
              const maxDim = Math.max(size.x, size.y, size.z);
              if (maxDim > 3 || maxDim < 0.1) obj.scale.multiplyScalar(1.0 / (maxDim || 1));
              grp.add(obj);
              applyPBRMaterialToObject(obj, material);
            };
            if (url.toLowerCase().endsWith('.obj')) {
              new OBJLoader().load(url, finish, undefined, (e) => console.error('Lỗi nạp OBJ:', e));
            } else {
              new GLTFLoader().load(url, (gltf) => finish(gltf.scene), undefined, (e) => console.error('Lỗi nạp GLB:', e));
            }
          } else if (type === 'video') {
            const v = document.createElement('video');
            v.src = url;
            v.crossOrigin = 'anonymous';
            v.loop = target.loop_video !== false;
            v.muted = true;
            v.playsInline = true;
            v.setAttribute('playsinline', '');
            v.autoplay = target.auto_play_video !== false;
            v.play().catch(() => {});
            videoTextures.push(v);
            const tex = new THREE.VideoTexture(v);
            tex.colorSpace = THREE.SRGBColorSpace;
            const geom = new THREE.PlaneGeometry(1.2, 0.8);
            geom.translate(0, 0, 0.01);
            const mat = new THREE.MeshStandardMaterial({ map: tex, side: THREE.DoubleSide, transparent: true, roughness: 0.8, metalness: 0.2 });
            grp.add(new THREE.Mesh(geom, mat));
          } else {
            const loader = new THREE.TextureLoader();
            loader.setCrossOrigin('anonymous');
            loader.load(url, (texture) => {
              texture.colorSpace = THREE.SRGBColorSpace;
              const aspect = texture.image ? texture.image.width / texture.image.height : 1;
              const width = 1.2;
              const geom = new THREE.PlaneGeometry(width, width / aspect);
              geom.translate(0, 0, 0.01);
              const mat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, roughness: 0.8, metalness: 0.2 });
              grp.add(new THREE.Mesh(geom, mat));
            });
          }
        };

        loadContent(contentGroup, target.content_type, target.content_url, mainMaterial);

        // 4c. Các vật thể phụ trong cảnh (nếu có), cùng số liệu như studio.
        (target.scene_objects || []).forEach((obj) => {
          if (obj.visible === false) return;
          const grp = new THREE.Group();
          grp.position.set(obj.position?.x ?? 0, obj.position?.y ?? 0, obj.position?.z ?? 0);
          grp.rotation.set((obj.rotation?.x ?? 0) * (Math.PI / 180), (obj.rotation?.y ?? 0) * (Math.PI / 180), (obj.rotation?.z ?? 0) * (Math.PI / 180));
          const sx = typeof (obj as any).scale === 'number' ? (obj as any).scale : (obj.scale?.x ?? 1);
          const sy = typeof (obj as any).scale === 'number' ? (obj as any).scale : (obj.scale?.y ?? 1);
          const sz = typeof (obj as any).scale === 'number' ? (obj as any).scale : (obj.scale?.z ?? 1);
          grp.scale.set(sx, sy, sz);
          root.add(grp);
          // Studio dựng vật thể phụ dạng video bằng ảnh tĩnh, làm giống để khớp.
          loadContent(grp, obj.type === 'video' ? 'image' : obj.type, obj.url, obj.material || mainMaterial);
        });


        // 4. Mô-đun pipeline riêng: vẽ scene three.js lên cùng canvas với luồng camera của 8th Wall.
        const vec = new THREE.Vector3();
        const studioModule = {
          name: MODULE_NAME,
          onStart: ({ canvas, GLctx, canvasWidth, canvasHeight }: any) => {
            renderer = new THREE.WebGLRenderer({ canvas, context: GLctx, alpha: false, antialias: true });
            renderer.autoClear = false;
            renderer.setPixelRatio(1);
            renderer.setSize(canvasWidth, canvasHeight, false);
            renderer.outputColorSpace = THREE.SRGBColorSpace;
            renderer.toneMapping = THREE.ACESFilmicToneMapping;
            renderer.toneMappingExposure = 1.0;
            renderer.shadowMap.enabled = !!(target.scene_lights || []).some((l: any) => l.castShadow);
            renderer.shadowMap.type = THREE.PCFSoftShadowMap;
            const pmrem = new THREE.PMREMGenerator(renderer);
            scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
            XR8.XrController.updateCameraProjectionMatrix({ origin: camera.position, facing: camera.quaternion });
            setLoading(false);
          },
          onCanvasSizeChange: ({ canvasWidth, canvasHeight }: any) => { if (renderer) renderer.setSize(canvasWidth, canvasHeight, false); },
          onUpdate: ({ processCpuResult }: any) => {
            const r = processCpuResult?.reality;
            if (!r) return;
            const { rotation, position, intrinsics } = r;
            if (intrinsics) {
              for (let i = 0; i < 16; i++) camera.projectionMatrix.elements[i] = intrinsics[i];
              camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
            }
            if (rotation) camera.quaternion.set(rotation.x, rotation.y, rotation.z, rotation.w);
            if (position) camera.position.set(position.x, position.y, position.z);
            // Áp cử chỉ người dùng lên nhóm nội dung, giữ nguyên số liệu gốc của studio làm nền.
            const s = rt.current;
            if (s.contentGroup) {
              const sc = s.baseScale * s.userScale;
              s.contentGroup.scale.set(sc, sc, sc);
              s.contentGroup.rotation.set(rotX * (Math.PI / 180) + s.userRotX, rotY * (Math.PI / 180) + s.userRotY, rotZ * (Math.PI / 180));
              s.contentGroup.position.set((target.position_x || 0) + s.userDX, (target.position_y || 0) + s.userDY, target.position_z || 0);
            }
          },
          onRender: () => {
            if (!renderer) return;
            // 8th Wall vẽ luồng camera bằng WebGL thuần nên phải đặt lại trạng thái three trước khi vẽ.
            renderer.resetState();
            renderer.clearDepth();
            renderer.render(scene, camera);
          },
          listeners: [
            { event: 'reality.imagefound', process: ({ detail }: any) => { applyPose(detail); anchor.visible = true; setFound(true); } },
            { event: 'reality.imageupdated', process: ({ detail }: any) => { applyPose(detail); } },
            { event: 'reality.imagelost', process: () => { anchor.visible = false; setFound(false); } },
          ],
        };
        const applyPose = (d: any) => {
          if (!d) return;
          anchor.position.set(d.position.x, d.position.y, d.position.z);
          anchor.quaternion.set(d.rotation.x, d.rotation.y, d.rotation.z, d.rotation.w);
          const sc = d.scale || 1;
          anchor.scale.set(sc, sc, sc);
          vec.set(0, 0, 0);
        };

        // 5. Khởi động pipeline 8th Wall: luồng camera, bộ bám ảnh (không dùng SLAM), chụp ảnh, scene.
        setStatusText('Đang mở camera.');
        const canvas = document.createElement('canvas');
        canvasEl = canvas;
        canvas.style.position = 'absolute';
        canvas.style.inset = '0';
        canvas.style.width = '100%';
        canvas.style.height = '100%';
        container.appendChild(canvas);
        sizeCanvas(canvas);
        if (typeof ResizeObserver !== 'undefined') {
          resizeObs = new ResizeObserver(() => { if (canvasEl) sizeCanvas(canvasEl); });
          resizeObs.observe(container);
        }
        upgradeCamera();

        XR8.XrController.configure({
          disableWorldTracking: true,
          imageTargetData: [targetData],
          imageTargets: [targetData.name],
        });
        XR8.CanvasScreenshot.configure({ maxDimension: 2560, jpgCompression: 95 });
        XR8.addCameraPipelineModules([
          XR8.GlTextureRenderer.pipelineModule(),
          XR8.XrController.pipelineModule(),
          XR8.CanvasScreenshot.pipelineModule(),
          {
            name: 'smartresearch-errors',
            onCameraStatusChange: ({ status }: any) => {
              if (status === 'failed') { setError('Không mở được camera. Hãy cho phép truy cập camera rồi tải lại trang.'); setLoading(false); }
            },
            onException: (err: any) => { console.error('Lỗi 8th Wall:', err); setError(err?.message || String(err)); setLoading(false); },
          },
          studioModule,
        ]);
        XR8.run({ canvas, webgl2: true, allowedDevices: XR8.XrConfig.device().ANY, cameraConfig: { direction: XR8.XrConfig.camera().BACK } });
      } catch (err: any) {
        if (!active) return;
        console.error('Lỗi khởi tạo trình quét AR:', err);
        setError(err?.message || 'Không khởi tạo được trình quét AR');
        setLoading(false);
      }
    };

    start();

    return () => {
      active = false;
      try { XR8?.stop?.(); XR8?.clearCameraPipelineModules?.(); } catch { /* bỏ qua */ }
      if (resizeObs) { try { resizeObs.disconnect(); } catch { /* bỏ qua */ } }
      if (restoreGUM) restoreGUM();
      videoTextures.forEach((v) => { try { v.pause(); v.src = ''; } catch { /* bỏ qua */ } });
      if (blobUrl) URL.revokeObjectURL(blobUrl);
      if (renderer) { try { renderer.dispose(); } catch { /* bỏ qua */ } }
      if (canvasEl) canvasEl.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target.id]);

  // Cử chỉ: 1 ngón xoay (hoặc kéo nếu bật kéo và tắt xoay), 2 ngón thu phóng.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let lastX = 0, lastY = 0, lastDist = 0, touching = 0;
    const dist = (t: TouchList) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
    const onStart = (e: TouchEvent) => {
      touching = e.touches.length;
      if (touching === 1) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; }
      else if (touching === 2) lastDist = dist(e.touches);
    };
    const onMove = (e: TouchEvent) => {
      const s = rt.current;
      if (e.touches.length === 1 && touching === 1) {
        const dx = e.touches[0].clientX - lastX, dy = e.touches[0].clientY - lastY;
        lastX = e.touches[0].clientX; lastY = e.touches[0].clientY;
        if (allowRotate) { s.userRotY += dx * 0.01; s.userRotX += dy * 0.01; }
        else if (allowDrag) { s.userDX += dx * 0.003; s.userDY -= dy * 0.003; }
        e.preventDefault();
      } else if (e.touches.length === 2 && allowScale) {
        const d = dist(e.touches);
        if (lastDist > 0) s.userScale = Math.min(5, Math.max(0.2, s.userScale * (d / lastDist)));
        lastDist = d;
        e.preventDefault();
      }
    };
    const onEnd = (e: TouchEvent) => { touching = e.touches.length; if (touching === 1) { lastX = e.touches[0].clientX; lastY = e.touches[0].clientY; } lastDist = 0; };
    container.addEventListener('touchstart', onStart, { passive: true });
    container.addEventListener('touchmove', onMove, { passive: false });
    container.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      container.removeEventListener('touchstart', onStart);
      container.removeEventListener('touchmove', onMove);
      container.removeEventListener('touchend', onEnd);
    };
  }, [allowRotate, allowScale, allowDrag]);

  // Chụp ảnh: 8th Wall ghép luồng camera và lớp 3D trên cùng canvas, xuất JPEG độ phân giải cao.
  const handleTakePhoto = async () => {
    const XR8 = (window as any).XR8;
    if (isTakingPhoto || !XR8?.CanvasScreenshot) return;
    setIsTakingPhoto(true);
    setFlashActive(true);
    window.setTimeout(() => setFlashActive(false), 300);
    try {
      const data = await XR8.CanvasScreenshot.takeScreenshot();
      setCapturedPhoto(`data:image/jpeg;base64,${data}`);
    } catch (e) {
      console.error('Lỗi chụp ảnh AR:', e);
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
      } else handleDownloadPhoto();
    } catch {
      handleDownloadPhoto();
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col items-center justify-center select-none overflow-hidden">
      {flashActive && <div className="fixed inset-0 z-[100] bg-white pointer-events-none transition-opacity duration-300 opacity-90" />}

      {target.show_target_name && target.name && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-black/60 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold shadow-lg max-w-[60vw] truncate">{target.name}</div>
      )}

      {showCloseButton && (
        <button onClick={onClose} className="absolute top-4 right-4 z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors shadow-lg border border-white/10" title="Đóng AR">
          <X className="w-6 h-6" />
        </button>
      )}

      {loading && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 text-white px-8 text-center">
          <Loader2 className="w-12 h-12 animate-spin text-brand mb-4" />
          <p className="text-lg font-bold font-display animate-pulse">Đang chuẩn bị AR...</p>
          <p className="text-sm text-slate-400 mt-2">{statusText}</p>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 z-[55] flex flex-col items-center justify-center bg-black/80 text-white p-6 text-center">
          <div className="w-16 h-16 bg-rose-500/20 text-rose-500 rounded-full flex items-center justify-center mb-4"><X className="w-8 h-8" /></div>
          <p className="text-xl font-bold font-display text-rose-500 mb-2">Không khởi tạo được AR</p>
          <p className="text-slate-300">{error}</p>
        </div>
      )}

      <div ref={containerRef} className="w-full h-full relative overflow-hidden touch-none" style={{ opacity: loading || error ? 0 : 1 }} />

      {!loading && !error && !found && (
        <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 z-[60] flex flex-col items-center pointer-events-none">
          <div className="w-56 h-56 rounded-3xl border-2 border-dashed border-white/60 flex items-center justify-center">
            <ScanLine className="w-10 h-10 text-white/80 animate-pulse" />
          </div>
          <p className="mt-4 bg-black/50 text-white text-xs font-semibold px-4 py-2 rounded-full backdrop-blur-md">Hướng camera vào ảnh target để quét</p>
        </div>
      )}

      {!loading && !error && found && showGestureHint && (
        <div className="absolute top-20 inset-x-0 flex justify-center z-[60] pointer-events-none">
          <p className="bg-black/50 text-white text-[11px] font-medium px-4 py-2 rounded-full backdrop-blur-md">
            {allowRotate ? 'Kéo 1 ngón để xoay' : allowDrag ? 'Kéo 1 ngón để di chuyển' : ''}{allowScale ? (allowRotate || allowDrag ? ', ' : '') + '2 ngón để thu phóng' : ''}
          </p>
        </div>
      )}

      {!loading && !error && target.button_label && target.button_url && (
        <div className="absolute bottom-28 inset-x-0 flex justify-center z-[70] px-4">
          <a href={target.button_url} target="_blank" rel="noopener noreferrer" className="px-8 py-3.5 bg-brand text-white font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2 border border-white/20 backdrop-blur-sm">{target.button_label}</a>
        </div>
      )}

      {!loading && !error && enableCapture && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center z-[70]">
          <button type="button" onClick={handleTakePhoto} disabled={isTakingPhoto} className="w-16 h-16 bg-white/20 backdrop-blur-md border-4 border-white rounded-full flex items-center justify-center shadow-2xl hover:bg-white/40 active:scale-95 transition-all group disabled:opacity-60" title="Chụp ảnh AR">
            <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-inner group-active:scale-90 transition-transform"><Camera className="w-6 h-6 text-slate-800" /></div>
          </button>
        </div>
      )}

      {capturedPhoto && (
        <div className="fixed inset-0 z-[110] bg-black/90 backdrop-blur-md flex flex-col items-center justify-between p-4 sm:p-6">
          <div className="w-full max-w-md flex items-center justify-between text-white">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-amber-400" /><span className="font-bold text-sm sm:text-base">Ảnh chụp AR</span></div>
            <button type="button" onClick={() => setCapturedPhoto(null)} className="p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition" title="Đóng"><X className="w-5 h-5" /></button>
          </div>
          <div className="my-auto max-w-md max-h-[70vh] w-full rounded-2xl overflow-hidden border-2 border-white/20 shadow-2xl bg-black flex items-center justify-center">
            <img src={capturedPhoto} alt="AR Captured" className="w-full h-full object-contain max-h-[68vh]" />
          </div>
          <div className="w-full max-w-md flex items-center gap-3 pt-2">
            <button type="button" onClick={() => setCapturedPhoto(null)} className="flex-1 py-3 px-4 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition flex items-center justify-center gap-2"><RefreshCw className="w-4 h-4" /> Chụp lại</button>
            <button type="button" onClick={handleSharePhoto} className="p-3 rounded-xl bg-white/10 hover:bg-white/20 text-white transition flex items-center justify-center" title="Chia sẻ"><Share2 className="w-5 h-5" /></button>
            <button type="button" onClick={handleDownloadPhoto} className="flex-1 py-3 px-4 rounded-xl bg-brand hover:opacity-90 text-white text-sm font-bold shadow-lg transition flex items-center justify-center gap-2"><Download className="w-4 h-4" /> Tải về máy</button>
          </div>
        </div>
      )}
    </div>
  );
}
