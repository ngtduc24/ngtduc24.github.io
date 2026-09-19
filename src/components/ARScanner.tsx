import React, { useEffect, useRef, useState } from 'react';
import {
  X, Loader2, Volume2, VolumeX, Download, Share2, Sparkles, Check, RefreshCw, Camera
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
  // Decode metadata JSON if present
  const target = unpackARTarget(rawTarget);

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
  const showGestureHintSetting = target.show_gesture_hint !== false;
  const showCloseButton = target.show_close_button !== false;

  // Ref giữ trạng thái cử chỉ mới nhất để không làm kích hoạt lại vòng đời dựng Scene/Camera
  const gestureRef = useRef({ allowRotate, allowScale, allowDrag, hasAnyGesture, scale: target.scale || 1 });
  useEffect(() => {
    gestureRef.current = { allowRotate, allowScale, allowDrag, hasAnyGesture, scale: target.scale || 1 };
  }, [allowRotate, allowScale, allowDrag, hasAnyGesture, target.scale]);

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
  }, [target.id, target.target_image_url, target.mind_file_url, target.content_type]);

  // Construct A-Frame Scene
  useEffect(() => {
    const container = containerRef.current;
    if (!mindUrl || !container) return;

    const scale = target.scale || 1;
    const rotX = typeof target.rotation_x === 'number' ? target.rotation_x : (target.rotation || 0);
    const rotY = target.rotation_y || 0;
    const rotZ = target.rotation_z || 0;
    const rotationStr = `${rotX} ${rotY} ${rotZ}`;
    const posX = target.position_x || 0;
    const posY = target.position_y || 0;
    const posZ = target.position_z || 0;
    const positionStr = `${posX} ${posY} ${posZ}`;
    const sceneLights = target.scene_lights || [
      {
        id: 'light_ambient',
        name: 'Môi trường',
        type: 'ambient',
        color: '#ffffff',
        intensity: typeof target.light_intensity === 'number' ? target.light_intensity : 1.2,
        position: { x: 0, y: 0, z: 0 },
        visible: true,
        castShadow: false
      },
      {
        id: 'light_main',
        name: 'Nguồn sáng',
        type: 'directional',
        color: '#ffffff',
        intensity: (typeof target.light_intensity === 'number' ? target.light_intensity : 1.2) * 1.5 * (typeof target.light_scale === 'number' ? target.light_scale : 1.0),
        position: {
          x: typeof target.light_pos_x === 'number' ? target.light_pos_x : 5,
          y: typeof target.light_pos_y === 'number' ? target.light_pos_y : 10,
          z: typeof target.light_pos_z === 'number' ? target.light_pos_z : 7
        },
        rotation: {
          x: typeof target.light_rot_x === 'number' ? target.light_rot_x : 0,
          y: typeof target.light_rot_y === 'number' ? target.light_rot_y : 0,
          z: typeof target.light_rot_z === 'number' ? target.light_rot_z : 0
        },
        visible: true,
        castShadow: true
      }
    ];

    let lightsHtml = '';
    sceneLights.forEach(light => {
      if (!light.visible) return;
      
      const pos = light.position ? `${light.position.x} ${light.position.y} ${light.position.z}` : '0 0 0';
      const rot = light.rotation ? `${light.rotation.x} ${light.rotation.y} ${light.rotation.z}` : '0 0 0';
      
      lightsHtml += `\n        <a-entity light="type: ${light.type}; color: ${light.color}; intensity: ${light.intensity}; castShadow: ${light.castShadow ? 'true' : 'false'};" position="${pos}" rotation="${rot}"></a-entity>`;
    });

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

    // Gắn môi trường chiếu sáng IBL cho scene A-Frame để vật liệu PBR và kim loại không bị đen.
    // Dùng đúng THREE của A-Frame (cùng renderer) nên không xung đột với three của ứng dụng.
    if (typeof (window as any).AFRAME !== 'undefined') {
      const AFRAME = (window as any).AFRAME;
      if (!AFRAME.components['scanner-env']) {
        AFRAME.registerComponent('scanner-env', {
          init: function () {
            const sceneEl = this.el;
            const T = AFRAME.THREE;
            let done = false;
            const setup = () => {
              if (done) return;
              const renderer = sceneEl.renderer;
              if (!renderer || !T) return;
              done = true;
              try {
                renderer.toneMapping = T.ACESFilmicToneMapping;
                renderer.toneMappingExposure = 1.1;
                try { (renderer as any).useLegacyLights = false; } catch (_e) {}

                // Đèn nền gắn thẳng vào scene, cường độ mạnh, bảo đảm vật thể luôn sáng
                // dù ảnh môi trường có dựng được hay không. Đây là điểm chắc chắn nhất.
                const hemi = new T.HemisphereLight(0xffffff, 0x8d8d8d, 3.0);
                hemi.position.set(0, 1, 0);
                sceneEl.object3D.add(hemi);
                const amb = new T.AmbientLight(0xffffff, 1.3);
                sceneEl.object3D.add(amb);
                const dir = new T.DirectionalLight(0xffffff, 2.6);
                dir.position.set(5, 10, 7);
                sceneEl.object3D.add(dir);

                // Ảnh môi trường cho vật liệu kim loại phản chiếu, phần phụ thêm.
                try {
                  const pmrem = new T.PMREMGenerator(renderer);
                  pmrem.compileEquirectangularShader();
                  const canvas = document.createElement('canvas');
                  canvas.width = 32;
                  canvas.height = 256;
                  const c2d = canvas.getContext('2d');
                  if (c2d) {
                    const grad = c2d.createLinearGradient(0, 0, 0, 256);
                    grad.addColorStop(0, '#f4f6f8');
                    grad.addColorStop(0.5, '#b8bec6');
                    grad.addColorStop(1, '#5c626b');
                    c2d.fillStyle = grad;
                    c2d.fillRect(0, 0, 32, 256);
                  }
                  const tex = new T.CanvasTexture(canvas);
                  tex.mapping = T.EquirectangularReflectionMapping;
                  sceneEl.object3D.environment = pmrem.fromEquirectangular(tex).texture;
                  tex.dispose();
                  pmrem.dispose();
                } catch (e) {
                  console.warn('Không dựng được ảnh môi trường AR:', e);
                }
              } catch (e) {
                console.warn('Không thiết lập chiếu sáng AR:', e);
              }
            };
            // Chạy khi renderer sẵn sàng, thử nhiều mốc để chắc chắn kích hoạt một lần.
            if (sceneEl.renderer) setup();
            sceneEl.addEventListener('render-target-loaded', setup);
            sceneEl.addEventListener('loaded', setup);
            window.setTimeout(setup, 800);
            window.setTimeout(setup, 2000);
          }
        });
      }

      // Thành phần làm mượt bám ảnh. MindAR ghi thẳng ma trận vào entity mốc theo từng
      // khung hình nên tư thế ước lượng bị nhiễu, khiến nội dung rung giật. Thành phần này
      // đọc ma trận thế giới của entity mốc rồi nội suy dần vị trí, góc xoay và tỉ lệ cho
      // entity hiển thị, nhờ đó giới hạn mức dịch chuyển mỗi khung hình và vật thể đứng yên.
      if (!AFRAME.components['smooth-follow']) {
        AFRAME.registerComponent('smooth-follow', {
          schema: {
            src: { type: 'selector' },
            pos: { default: 0.3 },
            rot: { default: 0.3 },
          },
          init: function () {
            const T = AFRAME.THREE;
            this._p = new T.Vector3();
            this._q = new T.Quaternion();
            this._s = new T.Vector3();
            this._started = false;
            this.el.object3D.visible = false;
          },
          tick: function () {
            const srcEl = this.data.src;
            if (!srcEl || !srcEl.object3D) return;
            const src = srcEl.object3D;
            if (!src.visible) {
              this.el.object3D.visible = false;
              this._started = false;
              return;
            }
            src.updateWorldMatrix(true, false);
            src.matrixWorld.decompose(this._p, this._q, this._s);
            const o = this.el.object3D;
            if (!this._started) {
              o.position.copy(this._p);
              o.quaternion.copy(this._q);
              o.scale.copy(this._s);
              this._started = true;
            } else {
              o.position.lerp(this._p, this.data.pos);
              o.quaternion.slerp(this._q, this.data.rot);
              o.scale.lerp(this._s, this.data.pos);
            }
            o.visible = true;
          },
        });
      }
    }

    let contentHtml = '';

    // Nội dung hiển thị được tách khỏi entity mốc. Entity mốc chỉ giữ mindar-image-target
    // để MindAR bám ảnh, còn nội dung nằm trong entity smooth-follow nội suy theo mốc nên
    // hết rung. Nút nội dung vẫn mang id ar-content-node để cử chỉ chạm và chỉnh chất liệu
    // hoạt động như cũ.
    let assetsHtml = '';
    let nodeHtml = '';

    if (target.content_type === 'video') {
      assetsHtml = `
        <a-assets>
          <video id="ar-video" src="${contentUrl}" crossorigin="anonymous" ${target.loop_video !== false ? 'loop="true"' : ''} muted playsinline webkit-playsinline preload="auto"></video>
        </a-assets>
      `;
      nodeHtml = target.is_transparent_video
        ? `<a-plane id="ar-content-node" src="#ar-video" chromakey-material="color: ${target.chroma_key_color || '#00ff00'}" position="${positionStr}" scale="${scale} ${scale} ${scale}" rotation="${rotationStr}"></a-plane>`
        : `<a-video id="ar-content-node" src="#ar-video" position="${positionStr}" scale="${scale} ${scale} ${scale}" rotation="${rotationStr}"></a-video>`;
    } else if (target.content_type === 'image' || target.content_type === 'gif') {
      nodeHtml = `<a-image id="ar-content-node" src="${contentUrl}" position="${positionStr}" scale="${scale} ${scale} ${scale}" rotation="${rotationStr}" transparent="true"></a-image>`;
    } else if (target.content_type === '3d') {
      assetsHtml = `
        <a-assets>
          <a-asset-item id="ar-model" src="${contentUrl}"></a-asset-item>
        </a-assets>
      `;
      nodeHtml = `<a-gltf-model id="ar-content-node" src="#ar-model" position="${positionStr}" scale="${scale} ${scale} ${scale}" rotation="${rotationStr}" animation-mixer></a-gltf-model>`;
    }

    if (nodeHtml) {
      contentHtml = `
        ${assetsHtml}
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity id="ar-anchor" mindar-image-target="targetIndex: 0"></a-entity>
        <a-entity smooth-follow="src: #ar-anchor; pos: 0.3; rot: 0.3">
          ${nodeHtml}
        </a-entity>
      `;
    }

    // Cấu hình A-Frame chuẩn dấu chấm phẩy ; cho schema renderer để preserveDrawingBuffer hoạt động thực tế
    container.innerHTML = `
      <a-scene scanner-env mindar-image="imageTargetSrc: ${escapeAttr(mindUrl)}; autoStart: true; filterMinCF: 0.0001; filterBeta: 1000; missTolerance: 12; warmupTolerance: 2;" color-space="sRGB" renderer="colorManagement: true; toneMapping: ACESFilmic; preserveDrawingBuffer: true;" vr-mode-ui="enabled: false" device-orientation-permission-ui="enabled: false">
        ${lightsHtml}
        ${contentHtml}
      </a-scene>
    `;

    // Khi model 3D tải xong, áp chất liệu đã lưu từ studio và bật phản chiếu môi trường để hết đen.
    let modelNode: any = null;
    let onModelLoaded: (() => void) | null = null;
    if (target.content_type === '3d') {
      modelNode = container.querySelector('#ar-content-node');
      if (modelNode) {
        const cfg = target.material_config;
        onModelLoaded = () => {
          const root = (modelNode.getObject3D && modelNode.getObject3D('mesh')) || modelNode.object3D;
          if (!root || !root.traverse) return;
          root.traverse((child: any) => {
            if (!child.isMesh || !child.material) return;
            const mats = Array.isArray(child.material) ? child.material : [child.material];
            mats.forEach((mat: any) => {
              if ('envMapIntensity' in mat) {
                mat.envMapIntensity = Math.max(mat.envMapIntensity || 0, 1);
              }
              if (cfg) {
                if (cfg.baseColor && mat.color) mat.color.set(cfg.baseColor);
                if (typeof cfg.roughness === 'number' && 'roughness' in mat) mat.roughness = cfg.roughness;
                if (typeof cfg.metalness === 'number' && 'metalness' in mat) mat.metalness = cfg.metalness;
                if (cfg.emissive && mat.emissive) mat.emissive.set(cfg.emissive);
                if (typeof cfg.emissiveIntensity === 'number' && 'emissiveIntensity' in mat) mat.emissiveIntensity = cfg.emissiveIntensity;
                if (typeof cfg.opacity === 'number') {
                  mat.opacity = cfg.opacity;
                  if (cfg.opacity < 0.99) mat.transparent = true;
                }
                if (typeof cfg.transmission === 'number' && 'transmission' in mat) mat.transmission = cfg.transmission;
                if (typeof cfg.ior === 'number' && 'ior' in mat) mat.ior = cfg.ior;
              } else {
                // Không có cấu hình chất liệu. Lưới an toàn để vật thể không đen tuyền.
                // Vật liệu kim loại tuyệt đối chỉ sáng nhờ phản chiếu, nếu môi trường
                // chưa dựng được sẽ thành đen, nên hạ độ kim loại và nâng độ nhám để
                // đèn trực tiếp tạo được ánh sáng khuếch tán thấy rõ.
                if (typeof mat.metalness === 'number' && mat.metalness > 0.75) mat.metalness = 0.5;
                if (typeof mat.roughness === 'number' && mat.roughness < 0.2) mat.roughness = 0.35;
              }
              mat.needsUpdate = true;
            });
          });
        };
        modelNode.addEventListener('model-loaded', onModelLoaded);
      }
    }

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
        if (gestureRef.current.hasAnyGesture) {
          setShowGestureHint(true);
          if (hintTimeout) window.clearTimeout(hintTimeout);
          hintTimeout = window.setTimeout(() => setShowGestureHint(false), 4500);
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

    let currentRotY = rotY;
    let currentRotX = rotX;
    let currentRotZ = rotZ;
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

      const { allowRotate: canRotate, allowScale: canScale, allowDrag: canDrag, scale: baseScale } = gestureRef.current;

      if (e.touches.length === 1) {
        const dx = e.touches[0].clientX - touchStartX;
        const dy = e.touches[0].clientY - touchStartY;
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;

        // 1-finger: Rotate if enabled
        if (canRotate) {
          currentRotY += dx * 0.4;
          currentRotX += dy * 0.4;
          contentNode.object3D.rotation.y = (currentRotY * Math.PI) / 180;
          contentNode.object3D.rotation.x = (currentRotX * Math.PI) / 180;
        } 
        // Or Drag if rotate is not enabled
        else if (canDrag) {
          currentPosX += dx * 0.002;
          currentPosY -= dy * 0.002;
          contentNode.object3D.position.x = currentPosX;
          contentNode.object3D.position.y = currentPosY;
        }
      } else if (e.touches.length === 2) {
        // 2-finger: Pinch to scale
        if (canScale) {
          const dist = Math.hypot(
            e.touches[0].clientX - e.touches[1].clientX,
            e.touches[0].clientY - e.touches[1].clientY
          );
          if (initialPinchDist > 0) {
            const factor = dist / initialPinchDist;
            currentScaleFactor = Math.min(Math.max(currentScaleFactor * factor, 0.15), 5.0);
            const s = baseScale * currentScaleFactor;
            contentNode.object3D.scale.set(s, s, s);
          }
          initialPinchDist = dist;
        }

        // 2-finger pan/drag (when rotate is enabled on 1-finger)
        if (canDrag && canRotate) {
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

      const { allowRotate: canRotate, allowDrag: canDrag } = gestureRef.current;
      const dx = e.clientX - mouseStartX;
      const dy = e.clientY - mouseStartY;
      mouseStartX = e.clientX;
      mouseStartY = e.clientY;

      if (canRotate) {
        currentRotY += dx * 0.4;
        currentRotX += dy * 0.4;
        contentNode.object3D.rotation.y = (currentRotY * Math.PI) / 180;
        contentNode.object3D.rotation.x = (currentRotX * Math.PI) / 180;
      } else if (canDrag) {
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
      const { allowScale: canScale, scale: baseScale } = gestureRef.current;
      if (!canScale) return;
      const contentNode = container.querySelector('#ar-content-node') as any;
      if (!contentNode || !contentNode.object3D) return;

      const delta = e.deltaY > 0 ? 0.95 : 1.05;
      currentScaleFactor = Math.min(Math.max(currentScaleFactor * delta, 0.15), 5.0);
      const s = baseScale * currentScaleFactor;
      contentNode.object3D.scale.set(s, s, s);
    };

    container.addEventListener('touchstart', handleTouchStart, { passive: true });
    container.addEventListener('touchmove', handleTouchMove, { passive: true });
    container.addEventListener('touchend', handleTouchEnd);
    container.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    container.addEventListener('wheel', handleWheel, { passive: true });

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
      if (hintTimeout) window.clearTimeout(hintTimeout);
      window.removeEventListener('orientationchange', forceResize);
      if (targetEntity && onFound) targetEntity.removeEventListener('targetFound', onFound);
      if (targetEntity && onLost) targetEntity.removeEventListener('targetLost', onLost);

      container.removeEventListener('touchstart', handleTouchStart);
      container.removeEventListener('touchmove', handleTouchMove);
      container.removeEventListener('touchend', handleTouchEnd);
      container.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      container.removeEventListener('wheel', handleWheel);
      if (modelNode && onModelLoaded) modelNode.removeEventListener('model-loaded', onModelLoaded);
      container.innerHTML = '';
    };
  }, [mindUrl, target.id, target.content_url, target.content_type, target.scale, target.rotation, target.position_x, target.position_y, target.position_z, target.is_transparent_video, target.chroma_key_color, target.material_config]);

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
      // Tìm luồng video camera và canvas 3D A-Frame
      const video = document.querySelector('video:not(#ar-video)') as HTMLVideoElement | null;
      const canvas = containerRef.current?.querySelector('canvas.a-canvas') as HTMLCanvasElement | null;

      if (!video) {
        throw new Error('Không tìm thấy luồng camera');
      }

      // Kích hoạt vẽ Three.js ngay lập tức vào WebGL drawing buffer để bảo đảm vật thể 3D xuất hiện trên ảnh chụp
      const sceneEl = containerRef.current?.querySelector('a-scene') as any;
      if (sceneEl && sceneEl.renderer && sceneEl.camera && sceneEl.object3D) {
        sceneEl.renderer.render(sceneEl.object3D, sceneEl.camera);
      }

      // Lấy kích thước chuẩn khung nhìn viewport trên màn hình thực tế của người dùng
      const screenW = window.innerWidth;
      const screenH = window.innerHeight;
      const dpr = Math.min(window.devicePixelRatio || 2, 2.5);

      const outWidth = Math.round(screenW * dpr);
      const outHeight = Math.round(screenH * dpr);

      const captureCanvas = document.createElement('canvas');
      captureCanvas.width = outWidth;
      captureCanvas.height = outHeight;
      const ctx = captureCanvas.getContext('2d');

      if (!ctx) throw new Error('Không thể khởi tạo canvas 2D');

      // 1. Cắt và vẽ khung hình camera video theo tỷ lệ khớp hoàn hảo với CSS object-fit: cover
      const vW = video.videoWidth || outWidth;
      const vH = video.videoHeight || outHeight;
      const screenRatio = outWidth / outHeight;
      const videoRatio = vW / vH;

      let sX = 0;
      let sY = 0;
      let sW = vW;
      let sH = vH;

      if (videoRatio > screenRatio) {
        // Video gốc rộng hơn màn hình điện thoại -> cắt 2 bên
        sW = vH * screenRatio;
        sX = (vW - sW) / 2;
      } else {
        // Video gốc hẹp hơn -> cắt trên dưới
        sH = vW / screenRatio;
        sY = (vH - sH) / 2;
      }

      ctx.drawImage(video, sX, sY, sW, sH, 0, 0, outWidth, outHeight);

      // 2. Phủ đối tượng 3D / video / hình ảnh AR từ WebGL Canvas đúng vị trí người dùng thấy
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        ctx.drawImage(canvas, 0, 0, outWidth, outHeight);
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

      {/* Top Target Name Badge (if configured) */}
      {target.show_target_name && target.name && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[60] bg-black/60 backdrop-blur-md text-white px-3.5 py-1.5 rounded-full border border-white/15 text-xs font-semibold shadow-lg max-w-[60vw] truncate">
          {target.name}
        </div>
      )}

      {/* Top Controls: Close Button (Respects show_close_button) */}
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
          className={`absolute top-4 ${showCloseButton ? 'right-20' : 'right-4'} z-[60] bg-black/50 hover:bg-black/80 text-white p-3 rounded-full transition-colors shadow-lg border border-white/10`}
          title={muted ? 'Bật tiếng' : 'Tắt tiếng'}
        >
          {muted ? <VolumeX className="w-6 h-6" /> : <Volume2 className="w-6 h-6" />}
        </button>
      )}

      {/* Gesture Hint Banner (Respects show_gesture_hint) */}
      {showGestureHintSetting && showGestureHint && (
        <div className="absolute top-20 inset-x-4 max-w-sm mx-auto z-[60] bg-black/70 backdrop-blur-md text-white text-xs px-4 py-2.5 rounded-2xl border border-white/15 shadow-xl flex items-center justify-between gap-2.5 animate-in fade-in slide-in-from-top-3 duration-300">
          <div className="flex items-center gap-2.5 min-w-0">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="leading-snug truncate">
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
          <button
            type="button"
            onClick={() => setShowGestureHint(false)}
            className="text-slate-400 hover:text-white p-1 rounded-lg shrink-0 transition"
            title="Đóng thông báo"
          >
            <X className="w-4 h-4" />
          </button>
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

      {/* Floating Shutter Button */}
      {targetVisible && target.enable_capture !== false && (
        <div className="absolute bottom-8 inset-x-0 flex justify-center z-[70] animate-in fade-in slide-in-from-bottom-4 duration-300">
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
