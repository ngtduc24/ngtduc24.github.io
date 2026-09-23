import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { X, Loader2, Download, Share2, Sparkles, RefreshCw, Camera, ScanLine } from 'lucide-react';
import { ARTarget } from '../types';
import { unpackARTarget } from '../lib/arHelpers';
import { loadMindARController, compileImageToMindBlob } from '../lib/mindar';
import { applyPBRMaterialToObject, DEFAULT_PBR_MATERIAL } from '../lib/pbrMaterialHelper';

interface ARScannerMindProps {
  target: ARTarget;
  onClose: () => void;
}

// Trình quét AR của hệ thống, dựng bằng MindAR (lõi nhận diện ảnh) kết hợp three.js của chính
// studio thiết kế. Toàn bộ cách nạp mô hình, canh tâm, chuẩn hóa cỡ, chất liệu PBR, ánh sáng và
// môi trường đều lặp lại y hệt ARStudioWorkspace, nên nội dung khi quét trùng với lúc đặt.
//
// Quy đổi đơn vị: studio dựng tấm target rộng 1.6 đơn vị, còn MindAR đặt tâm ảnh ở gốc và bề rộng
// ảnh bằng 1 đơn vị, ảnh dựng đứng trong mặt XY hướng +Z về camera, cùng hệ với studio. Vì vậy chỉ
// cần một nhóm gốc thu tỉ lệ 1/1.6 rồi dựng mọi thứ bên trong với đúng số liệu của studio.
const STUDIO_TARGET_WIDTH = 1.6;

export default function ARScannerMind({ target: rawTarget, onClose }: ARScannerMindProps) {
  const target = unpackARTarget(rawTarget);

  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusText, setStatusText] = useState('Đang chuẩn bị trình quét.');
  const [found, setFound] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isTakingPhoto, setIsTakingPhoto] = useState(false);
  const [flashActive, setFlashActive] = useState(false);

  // Tham chiếu tới các đối tượng runtime để chụp ảnh và cử chỉ dùng được.
  const rt = useRef<{
    video?: HTMLVideoElement;
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
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
    let controller: any = null;
    let animId = 0;
    let stream: MediaStream | null = null;
    let videoEl: HTMLVideoElement | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let onResize: (() => void) | null = null;
    const videoTextures: HTMLVideoElement[] = [];

    const start = async () => {
      try {
        // 1. Camera
        setStatusText('Đang mở camera.');
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
        });
        if (!active) return;
        const video = document.createElement('video');
        videoEl = video;
        video.setAttribute('autoplay', '');
        video.setAttribute('muted', '');
        video.setAttribute('playsinline', '');
        video.muted = true;
        video.style.position = 'absolute';
        video.style.top = '0';
        video.style.left = '0';
        video.style.objectFit = 'cover';
        video.style.zIndex = '0';
        video.srcObject = stream;
        container.appendChild(video);
        await new Promise<void>((resolve) => {
          if (video.readyState >= 1 && video.videoWidth) resolve();
          else video.addEventListener('loadedmetadata', () => resolve(), { once: true });
        });
        await video.play().catch(() => {});
        if (!active) return;
        // Bộ nạp khung hình của MindAR vẽ video theo thuộc tính width/height của thẻ video
        // (không phải videoWidth). Không đặt 2 thuộc tính này thì khung hình rỗng và không
        // bao giờ nhận diện được target.
        video.setAttribute('width', String(video.videoWidth));
        video.setAttribute('height', String(video.videoHeight));

        // 2. Tệp nhận diện .mind: ưu tiên tệp đã biên dịch lúc tạo target, không có thì biên dịch tại chỗ.
        setStatusText('Đang tải dữ liệu nhận diện ảnh.');
        let mindUrl = target.mind_file_url || '';
        let mindObjectUrl: string | null = null;
        if (!mindUrl) {
          if (!target.target_image_url) throw new Error('Không tìm thấy ảnh Target để bám hình.');
          const blob = await compileImageToMindBlob(target.target_image_url, (p) => setStatusText(`Đang biên dịch ảnh target ${p}%.`));
          mindObjectUrl = URL.createObjectURL(blob);
          mindUrl = mindObjectUrl;
        }
        if (!active) return;

        // 3. Bộ nhận diện MindAR
        setStatusText('Đang khởi động bộ nhận diện.');
        const Controller = await loadMindARController();
        if (!active) return;

        // 4. Scene three.js dựng giống studio
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera();
        renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        // Giới hạn độ phân giải vẽ để GPU còn sức cho bộ nhận diện chạy song song, tránh rớt khung hình.
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
        renderer.outputColorSpace = THREE.SRGBColorSpace;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0;
        renderer.shadowMap.enabled = !!(target.scene_lights || []).some((l: any) => l.castShadow);
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.domElement.style.position = 'absolute';
        renderer.domElement.style.top = '0';
        renderer.domElement.style.left = '0';
        renderer.domElement.style.zIndex = '1';
        container.appendChild(renderer.domElement);
        const pmrem = new THREE.PMREMGenerator(renderer);
        scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;

        // Nhóm bám theo target, ma trận do MindAR cấp mỗi khung hình.
        const anchor = new THREE.Group();
        anchor.matrixAutoUpdate = false;
        anchor.visible = false;
        scene.add(anchor);

        // Nhóm gốc quy đổi đơn vị studio sang MindAR.
        const root = new THREE.Group();
        const k = 1 / STUDIO_TARGET_WIDTH;
        root.scale.set(k, k, k);
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
        rt.current = { ...rt.current, video, renderer, scene, camera, contentGroup, baseScale, userScale: 1, userRotY: 0, userRotX: 0, userDX: 0, userDY: 0 };

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

        // 5. Bố cục video và canvas phủ kín khung, camera three lấy từ ma trận chiếu của MindAR.
        let postMatrix = new THREE.Matrix4();
        const resize = () => {
          if (!controller || !renderer || !videoEl) return;
          const cw = container.clientWidth, ch = container.clientHeight;
          const videoRatio = videoEl.videoWidth / videoEl.videoHeight;
          const containerRatio = cw / ch;
          let vw: number, vh: number;
          if (videoRatio > containerRatio) { vh = ch; vw = vh * videoRatio; } else { vw = cw; vh = vw / videoRatio; }
          const proj = controller.getProjectionMatrix();
          const fov = 2 * Math.atan((1 / proj[5]) / vh * ch) * 180 / Math.PI;
          camera.fov = fov;
          camera.near = proj[14] / (proj[10] - 1.0);
          camera.far = proj[14] / (proj[10] + 1.0);
          camera.aspect = cw / ch;
          camera.updateProjectionMatrix();
          videoEl.style.top = `${-(vh - ch) / 2}px`;
          videoEl.style.left = `${-(vw - cw) / 2}px`;
          videoEl.style.width = `${vw}px`;
          videoEl.style.height = `${vh}px`;
          renderer.setSize(cw, ch);
        };
        onResize = resize;

        // Chống chớp: bộ nhận diện thỉnh thoảng mất dấu vài khung hình (tay rung, mờ chuyển động,
        // điện thoại yếu). Thay vì ẩn ngay, giữ nguyên vị trí cuối trong một khoảng ngắn, chỉ ẩn
        // khi mất dấu lâu. Đồng thời nới missTolerance của MindAR và hạ warmupTolerance để hiện nhanh.
        const HOLD_MS = 900;
        let lastSeenAt = 0;
        const tmpM = new THREE.Matrix4();
        // Làm mượt tư thế: bộ nhận diện trả về vị trí nhiễu nhẹ mỗi khung hình khiến vật thể rung.
        // Lưu tư thế đích rồi mỗi khung vẽ kéo tư thế hiện tại về đích theo hệ số nhỏ, khi nhảy
        // xa (mới nhận diện lại) thì đặt thẳng để không trôi chậm.
        const targetPos = new THREE.Vector3(), targetQuat = new THREE.Quaternion(), targetScl = new THREE.Vector3(1, 1, 1);
        const curPos = new THREE.Vector3(), curQuat = new THREE.Quaternion(), curScl = new THREE.Vector3(1, 1, 1);
        let poseInit = false;
        let snapDist = Infinity; // khoảng nhảy (đơn vị điểm ảnh target) coi là nhận diện lại, đặt sau khi biết cỡ target
        controller = new Controller({
          inputWidth: video.videoWidth,
          inputHeight: video.videoHeight,
          maxTrack: 1,
          warmupTolerance: 2,
          missTolerance: 15,
          // Bộ lọc One Euro của MindAR: beta nhỏ thì lọc mạnh khi máy đứng yên, mặc định 1000 gần như không lọc.
          filterMinCF: 0.0005,
          filterBeta: 2,
          onUpdate: (data: any) => {
            if (data.type !== 'updateMatrix') return;
            const { worldMatrix } = data;
            if (worldMatrix) {
              tmpM.fromArray(worldMatrix as number[]);
              tmpM.multiply(postMatrix);
              tmpM.decompose(targetPos, targetQuat, targetScl);
              if (!poseInit || !anchor.visible || curPos.distanceTo(targetPos) > snapDist) {
                curPos.copy(targetPos); curQuat.copy(targetQuat); curScl.copy(targetScl); poseInit = true;
                anchor.matrix.compose(curPos, curQuat, curScl);
              }
              lastSeenAt = performance.now();
              if (!anchor.visible) { anchor.visible = true; setFound(true); }
            }
            // worldMatrix null: không ẩn ngay, vòng lặp vẽ sẽ ẩn khi quá HOLD_MS không thấy lại.
          },
        });

        const { dimensions } = await controller.addImageTargets(mindUrl);
        if (mindObjectUrl) URL.revokeObjectURL(mindObjectUrl);
        if (!active) return;
        // Ma trận hậu xử lý như MindARThree: đưa tâm ảnh về gốc và bề rộng ảnh bằng 1 đơn vị.
        const [markerWidth, markerHeight] = dimensions[0];
        snapDist = markerWidth * 0.5;
        postMatrix = new THREE.Matrix4().compose(
          new THREE.Vector3(markerWidth / 2, markerWidth / 2 + (markerHeight - markerWidth) / 2, 0),
          new THREE.Quaternion(),
          new THREE.Vector3(markerWidth, markerWidth, markerWidth)
        );

        resize();
        window.addEventListener('resize', resize);
        setStatusText('Đang làm nóng bộ nhận diện.');
        await controller.dummyRun(video);
        if (!active) return;
        controller.processVideo(video);

        const loop = () => {
          if (!active || !renderer) return;
          if (anchor.visible && performance.now() - lastSeenAt > HOLD_MS) { anchor.visible = false; setFound(false); }
          if (anchor.visible && poseInit) {
            // Kéo mượt về tư thế đích, hệ số 0.25 mỗi khung (khoảng 60 khung/giây) đủ dập rung mà không trễ rõ.
            curPos.lerp(targetPos, 0.25);
            curQuat.slerp(targetQuat, 0.25);
            curScl.lerp(targetScl, 0.25);
            anchor.matrix.compose(curPos, curQuat, curScl);
          }
          // Áp cử chỉ người dùng lên nhóm nội dung, giữ nguyên số liệu gốc của studio làm nền.
          const s = rt.current;
          if (s.contentGroup) {
            const sc = s.baseScale * s.userScale;
            s.contentGroup.scale.set(sc, sc, sc);
            s.contentGroup.rotation.set(rotX * (Math.PI / 180) + s.userRotX, rotY * (Math.PI / 180) + s.userRotY, rotZ * (Math.PI / 180));
            s.contentGroup.position.set((target.position_x || 0) + s.userDX, (target.position_y || 0) + s.userDY, target.position_z || 0);
          }
          renderer.render(scene, camera);
          animId = requestAnimationFrame(loop);
        };
        animId = requestAnimationFrame(loop);
        setLoading(false);
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
      if (animId) cancelAnimationFrame(animId);
      if (onResize) window.removeEventListener('resize', onResize);
      try { controller?.stopProcessVideo?.(); controller?.dispose?.(); } catch { /* bỏ qua */ }
      videoTextures.forEach((v) => { try { v.pause(); v.src = ''; } catch { /* bỏ qua */ } });
      if (stream) stream.getTracks().forEach((t) => t.stop());
      if (videoEl) { videoEl.srcObject = null; videoEl.remove(); }
      if (renderer) { renderer.dispose(); renderer.domElement.remove(); }
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

  // Chụp ảnh: ghép khung hình camera ở độ phân giải gốc với lớp 3D dựng lại ở cùng độ phân giải.
  const handleTakePhoto = async () => {
    const { video, renderer, scene, camera } = rt.current;
    const container = containerRef.current;
    if (isTakingPhoto || !video || !renderer || !scene || !camera || !container) return;
    setIsTakingPhoto(true);
    setFlashActive(true);
    window.setTimeout(() => setFlashActive(false), 300);
    try {
      const cw = container.clientWidth, ch = container.clientHeight;
      const vw = video.videoWidth, vh = video.videoHeight;
      const scale = Math.max(cw / vw, ch / vh);
      const cropW = cw / scale, cropH = ch / scale;
      const sx = (vw - cropW) / 2, sy = (vh - cropH) / 2;
      const outW = Math.round(cropW), outH = Math.round(cropH);
      const out = document.createElement('canvas');
      out.width = outW; out.height = outH;
      const ctx = out.getContext('2d');
      if (!ctx) throw new Error('Không tạo được canvas');
      ctx.drawImage(video, sx, sy, cropW, cropH, 0, 0, outW, outH);
      // Dựng lại lớp 3D đúng độ phân giải ảnh rồi vẽ đè lên, sau đó trả renderer về như cũ.
      const prevRatio = renderer.getPixelRatio();
      renderer.setPixelRatio(1);
      renderer.setSize(outW, outH, false);
      renderer.render(scene, camera);
      ctx.drawImage(renderer.domElement, 0, 0, outW, outH);
      renderer.setPixelRatio(prevRatio);
      renderer.setSize(cw, ch);
      setCapturedPhoto(out.toDataURL('image/jpeg', 0.95));
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
