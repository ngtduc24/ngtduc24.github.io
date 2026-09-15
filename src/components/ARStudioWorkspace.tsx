import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Save, Move, RotateCw, Maximize2, Grid3X3, Camera, RefreshCcw,
  Check, Upload, Box, Video, Image as ImageIcon, Eye, EyeOff, Layers,
  Sliders, Settings, Sparkles, AlertCircle, Loader2, Link2, Play, HelpCircle,
  Maximize, Minimize, X, Smartphone, Target as TargetIcon
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { supabase } from '../lib/supabase';
import { uploadARAssetToSupabase } from '../lib/upload';
import { compileImageToMindBlob } from '../lib/mindar';
import { UserAccount, ARTarget } from '../types';
import { unpackARTarget, packARTargetPayload } from '../lib/arHelpers';

interface ARStudioWorkspaceProps {
  initialTarget?: ARTarget | null;
  currentUser?: UserAccount | null;
  onClose: () => void;
  onSaved: () => void;
}

export default function ARStudioWorkspace({
  initialTarget,
  currentUser,
  onClose,
  onSaved,
}: ARStudioWorkspaceProps) {
  // Normalize initialTarget to safely decode metadata
  const target = initialTarget ? unpackARTarget(initialTarget) : null;
  const isEditing = !!target;

  // Form State
  const [name, setName] = useState(target?.name || (isEditing ? '' : 'Dự án AR Mới'));
  const [description, setDescription] = useState(target?.description || '');
  const [active, setActive] = useState(target?.active ?? true);

  // Target Marker state (Ảnh Target chọn riêng)
  const [targetFile, setTargetFile] = useState<File | null>(null);
  const [targetPreview, setTargetPreview] = useState<string>(target?.target_image_url || '');
  const [targetDims, setTargetDims] = useState<{ width: number; height: number } | null>(null);

  // Content Asset state (Import ảnh/video/obj 3d)
  const [contentType, setContentType] = useState<'image' | 'video' | 'gif' | '3d'>(
    target?.content_type || 'image'
  );
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentPreview, setContentPreview] = useState<string>(target?.content_url || '');

  // Thumbnail
  const [thumbFile, setThumbFile] = useState<File | null>(null);
  const [thumbPreview, setThumbPreview] = useState<string>(target?.thumbnail_url || '');

  // Transformations
  const [posX, setPosX] = useState<number>(target?.position_x ?? 0);
  const [posY, setPosY] = useState<number>(target?.position_y ?? 0);
  const [posZ, setPosZ] = useState<number>(target?.position_z ?? 0);
  const [scale, setScale] = useState<number>(target?.scale ?? 1);
  const [rotationX, setRotationX] = useState<number>(target?.rotation ?? 0);

  // Video and Interaction Options
  const [isTransparentVideo, setIsTransparentVideo] = useState(target?.is_transparent_video ?? false);
  const [chromaKeyColor, setChromaKeyColor] = useState(target?.chroma_key_color || '#00ff00');
  const [autoPlayVideo, setAutoPlayVideo] = useState(target?.auto_play_video ?? true);
  const [loopVideo, setLoopVideo] = useState(target?.loop_video ?? true);
  const [buttonLabel, setButtonLabel] = useState(target?.button_label || '');
  const [buttonUrl, setButtonUrl] = useState(target?.button_url || '');

  // Group 3 Features: Capture & 3D Gestures
  const [enableCapture, setEnableCapture] = useState<boolean>(target?.enable_capture ?? true);
  const [allowUserRotate, setAllowUserRotate] = useState<boolean>(target?.allow_user_rotate ?? true);
  const [allowUserScale, setAllowUserScale] = useState<boolean>(target?.allow_user_scale ?? true);
  const [allowUserDrag, setAllowUserDrag] = useState<boolean>(target?.allow_user_drag ?? false);

  // Overlay man hinh quet, bat/tat rieng tung target
  const [showLogo, setShowLogo] = useState<boolean>(target?.show_logo ?? true);
  const [showGestureHint, setShowGestureHint] = useState<boolean>(target?.show_gesture_hint ?? true);
  const [showCloseButton, setShowCloseButton] = useState<boolean>(target?.show_close_button ?? true);
  const [showScanHint, setShowScanHint] = useState<boolean>(target?.show_scan_hint ?? true);
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // UI State
  const [gizmoMode, setGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [activeTab, setActiveTab] = useState<'targets' | 'assets'>('targets');
  const [inspectorTab, setInspectorTab] = useState<'transform' | 'advanced'>('transform');
  const [showGrid, setShowGrid] = useState(true);
  const [showTargetPlane, setShowTargetPlane] = useState(true);
  const [showContentObject, setShowContentObject] = useState(true);
  const [saving, setSaving] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [viewportStatus, setViewportStatus] = useState<string>('Sẵn sàng');

  // Three.js References
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const orbitRef = useRef<OrbitControls | null>(null);
  const transformRef = useRef<TransformControls | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);

  // Meshes
  const targetMeshRef = useRef<THREE.Mesh | null>(null);
  const contentGroupRef = useRef<THREE.Group | null>(null);
  const currentContentMeshRef = useRef<THREE.Object3D | null>(null);
  const videoElementRef = useRef<HTMLVideoElement | null>(null);

  // Measure Target Image dimensions when loaded
  useEffect(() => {
    if (!targetPreview) {
      setTargetDims(null);
      return;
    }
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      setTargetDims({ width: img.naturalWidth, height: img.naturalHeight });
    };
    img.src = targetPreview;
  }, [targetPreview]);

  // Handle Target file pick
  const handleTargetPick = (file: File) => {
    setTargetFile(file);
    const url = URL.createObjectURL(file);
    setTargetPreview(url);
    if (!thumbPreview && !thumbFile) {
      setThumbPreview(url);
    }
  };

  // Handle Content file pick
  const handleContentPick = (file: File) => {
    setContentFile(file);
    const url = URL.createObjectURL(file);
    setContentPreview(url);
  };

  // Handle Drag & Drop on Viewport / Panels
  const handleDrop = (e: React.DragEvent, type: 'target' | 'content') => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (type === 'target') {
        handleTargetPick(file);
      } else {
        // Auto-detect type
        if (file.name.endsWith('.glb') || file.name.endsWith('.gltf')) {
          setContentType('3d');
        } else if (file.type.startsWith('video/')) {
          setContentType('video');
        } else if (file.type === 'image/gif') {
          setContentType('gif');
        } else {
          setContentType('image');
        }
        handleContentPick(file);
      }
    }
  };

  // Setup Three.js Scene
  useEffect(() => {
    const container = mountRef.current;
    if (!container) return;

    const width = container.clientWidth;
    const height = container.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x18181f);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 100);
    camera.position.set(0, 1.8, 3.2);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.1;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // 4. Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(5, 10, 7);
    dirLight.castShadow = true;
    scene.add(dirLight);

    const backLight = new THREE.DirectionalLight(0x6366f1, 0.8);
    backLight.position.set(-5, -2, -5);
    scene.add(backLight);

    // 5. Grid Helper (Studio Floor)
    const grid = new THREE.GridHelper(10, 20, 0x4f46e5, 0x272733);
    grid.position.y = -0.001;
    scene.add(grid);
    gridRef.current = grid;

    // 6. Orbit Controls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.maxPolarAngle = Math.PI / 2 + 0.1;
    orbit.minDistance = 0.5;
    orbit.maxDistance = 15;
    orbitRef.current = orbit;

    // 7. Content Group (Transform container)
    const contentGroup = new THREE.Group();
    contentGroup.position.set(posX, posY, posZ);
    contentGroup.scale.set(scale, scale, scale);
    contentGroup.rotation.set(rotationX * (Math.PI / 180), 0, 0);
    scene.add(contentGroup);
    contentGroupRef.current = contentGroup;

    // 8. Transform Controls (Gizmo)
    const transform = new TransformControls(camera, renderer.domElement);
    transform.size = 0.85;
    transform.setSpace('world');
    transform.attach(contentGroup);
    // three r169+ tach control khoi Object3D, phai add phan helper vao scene qua getHelper.
    // Giu tuong thich nguoc voi ban three cu (add thang control).
    const transformHelper = typeof (transform as any).getHelper === 'function'
      ? (transform as any).getHelper()
      : (transform as unknown as THREE.Object3D);
    scene.add(transformHelper);
    transformRef.current = transform;

    // When dragging gizmo, disable orbit controls
    transform.addEventListener('dragging-changed', (event) => {
      orbit.enabled = !event.value;
      if (event.value) {
        setViewportStatus('Đang chỉnh sửa...');
      } else {
        setViewportStatus('Đã cập nhật vị trí');
      }
    });

    // When transform changes via gizmo, sync back to React state
    transform.addEventListener('change', () => {
      if (!contentGroupRef.current) return;
      const p = contentGroupRef.current.position;
      const s = contentGroupRef.current.scale;
      const r = contentGroupRef.current.rotation;

      setPosX(parseFloat(p.x.toFixed(3)));
      setPosY(parseFloat(p.y.toFixed(3)));
      setPosZ(parseFloat(p.z.toFixed(3)));
      setScale(parseFloat(s.x.toFixed(3)));
      setRotationX(parseFloat((r.x * (180 / Math.PI)).toFixed(1)));
    });

    // 9. Resize Observer
    const resizeObserver = new ResizeObserver(() => {
      if (!container || !renderer || !camera) return;
      const newW = container.clientWidth;
      const newH = container.clientHeight;
      camera.aspect = newW / newH;
      camera.updateProjectionMatrix();
      renderer.setSize(newW, newH);
    });
    resizeObserver.observe(container);

    // 10. Render Loop
    let animationFrameId: number;
    const animate = () => {
      animationFrameId = requestAnimationFrame(animate);
      orbit.update();
      renderer.render(scene, camera);
    };
    animate();

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      scene.remove(transformHelper);
      transform.dispose();
      orbit.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);

  // Update Gizmo mode and axes configuration
  useEffect(() => {
    if (!transformRef.current) return;
    transformRef.current.setMode(gizmoMode);

    // In rotate mode, highlight X axis since MindAR uses rotationX
    if (gizmoMode === 'rotate') {
      transformRef.current.showX = true;
      transformRef.current.showY = false;
      transformRef.current.showZ = false;
    } else {
      transformRef.current.showX = true;
      transformRef.current.showY = true;
      transformRef.current.showZ = true;
    }
  }, [gizmoMode]);

  // Sync state changes to Content Group in Three.js (when typed in Inspector)
  useEffect(() => {
    if (!contentGroupRef.current) return;
    contentGroupRef.current.position.set(posX, posY, posZ);
    contentGroupRef.current.scale.set(scale, scale, scale);
    contentGroupRef.current.rotation.set(rotationX * (Math.PI / 180), 0, 0);
  }, [posX, posY, posZ, scale, rotationX]);

  // Toggle Grid visibility
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid]);

  // Toggle Content visibility
  useEffect(() => {
    if (contentGroupRef.current) {
      contentGroupRef.current.visible = showContentObject;
    }
  }, [showContentObject]);

  // Update Target Marker Mesh in Scene
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Remove old target mesh if any
    if (targetMeshRef.current) {
      scene.remove(targetMeshRef.current);
      if (targetMeshRef.current.geometry) targetMeshRef.current.geometry.dispose();
      if (Array.isArray(targetMeshRef.current.material)) {
        targetMeshRef.current.material.forEach((m) => m.dispose());
      } else if (targetMeshRef.current.material) {
        targetMeshRef.current.material.dispose();
      }
      targetMeshRef.current = null;
    }

    if (!targetPreview || !showTargetPlane) return;

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(
      targetPreview,
      (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const aspect = texture.image ? texture.image.width / texture.image.height : 1;

        // Target marker plane centered at [0, 0, 0], resting on floor
        const width = 1.6;
        const height = width / aspect;
        const geom = new THREE.PlaneGeometry(width, height);
        // Lay flat on floor (facing up along +Y)
        geom.rotateX(-Math.PI / 2);

        const mat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.85,
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(0, 0.005, 0);

        // Add subtle wireframe border to look like 8th Wall Tracking Region
        const wireframeGeom = new THREE.EdgesGeometry(geom);
        const wireframeMat = new THREE.LineBasicMaterial({ color: 0x10b981, linewidth: 2 });
        const wireframe = new THREE.LineSegments(wireframeGeom, wireframeMat);
        mesh.add(wireframe);

        scene.add(mesh);
        targetMeshRef.current = mesh;
      },
      undefined,
      (err) => {
        console.warn('Không tải được ảnh target trong 3D canvas:', err);
      }
    );
  }, [targetPreview, showTargetPlane]);

  // Update Content Mesh inside ContentGroup
  useEffect(() => {
    const group = contentGroupRef.current;
    if (!group) return;

    // Clean up previous content mesh
    if (currentContentMeshRef.current) {
      group.remove(currentContentMeshRef.current);
      currentContentMeshRef.current = null;
    }
    if (videoElementRef.current) {
      videoElementRef.current.pause();
      videoElementRef.current.src = '';
      videoElementRef.current = null;
    }

    // If no preview URL is available, render a sleek default 3D Hologram Box
    if (!contentPreview) {
      const geom = new THREE.BoxGeometry(0.8, 0.8, 0.8);
      geom.translate(0, 0.4, 0);
      const mat = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        roughness: 0.3,
        metalness: 0.2,
        transparent: true,
        opacity: 0.75,
        wireframe: false,
      });
      const box = new THREE.Mesh(geom, mat);

      // Wireframe accent
      const wire = new THREE.LineSegments(
        new THREE.EdgesGeometry(geom),
        new THREE.LineBasicMaterial({ color: 0xa5b4fc })
      );
      box.add(wire);

      group.add(box);
      currentContentMeshRef.current = box;
      return;
    }

    // 1. 3D GLTF / GLB
    if (contentType === '3d') {
      const loader = new GLTFLoader();
      setViewportStatus('Đang nạp mô hình 3D...');
      loader.load(
        contentPreview,
        (gltf) => {
          const model = gltf.scene;

          // Auto center and scale model if it's too huge
          const box = new THREE.Box3().setFromObject(model);
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          if (maxDim > 3 || maxDim < 0.1) {
            const factor = 1.0 / (maxDim || 1);
            model.scale.multiplyScalar(factor);
          }

          group.add(model);
          currentContentMeshRef.current = model;
          setViewportStatus('Mô hình 3D đã sẵn sàng');
        },
        undefined,
        (err) => {
          console.error('Lỗi nạp mô hình 3D:', err);
          setViewportStatus('Lỗi nạp mô hình 3D');
        }
      );
    }
    // 2. Video
    else if (contentType === 'video') {
      setViewportStatus('Đang nạp Video...');
      const video = document.createElement('video');
      video.src = contentPreview;
      video.crossOrigin = 'anonymous';
      video.loop = loopVideo;
      video.muted = true;
      video.playsInline = true;
      video.autoplay = autoPlayVideo;
      video.play().catch(() => {});
      videoElementRef.current = video;

      const videoTexture = new THREE.VideoTexture(video);
      videoTexture.colorSpace = THREE.SRGBColorSpace;

      const geom = new THREE.PlaneGeometry(1.2, 0.8);
      // Stand upright facing camera
      geom.translate(0, 0.4, 0);

      const mat = new THREE.MeshBasicMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
        transparent: true,
      });

      const plane = new THREE.Mesh(geom, mat);
      group.add(plane);
      currentContentMeshRef.current = plane;
      setViewportStatus('Video đã nạp');
    }
    // 3. Image / GIF
    else {
      setViewportStatus('Đang nạp ảnh nội dung...');
      const loader = new THREE.TextureLoader();
      loader.setCrossOrigin('anonymous');
      loader.load(contentPreview, (texture) => {
        texture.colorSpace = THREE.SRGBColorSpace;
        const aspect = texture.image ? texture.image.width / texture.image.height : 1;
        const width = 1.2;
        const height = width / aspect;

        const geom = new THREE.PlaneGeometry(width, height);
        geom.translate(0, height / 2, 0);

        const mat = new THREE.MeshBasicMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
        });

        const plane = new THREE.Mesh(geom, mat);
        group.add(plane);
        currentContentMeshRef.current = plane;
        setViewportStatus('Ảnh nội dung đã nạp');
      });
    }
  }, [contentPreview, contentType, loopVideo, autoPlayVideo]);

  // Camera Controls Helper
  const handleResetCamera = () => {
    if (!cameraRef.current || !orbitRef.current) return;
    cameraRef.current.position.set(0, 1.8, 3.2);
    orbitRef.current.target.set(0, 0.2, 0);
    orbitRef.current.update();
  };

  const handleTopView = () => {
    if (!cameraRef.current || !orbitRef.current) return;
    cameraRef.current.position.set(0, 4, 0.001);
    orbitRef.current.target.set(0, 0, 0);
    orbitRef.current.update();
  };

  // Reset Transformations
  const handleResetTransform = () => {
    setPosX(0);
    setPosY(0);
    setPosZ(0);
    setScale(1);
    setRotationX(0);
  };

  // Keyboard Shortcuts for Gizmo (W = Move, E = Rotate, R = Scale)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing inside input or textarea
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }
      if (e.key === 'w' || e.key === 'W') setGizmoMode('translate');
      if (e.key === 'e' || e.key === 'E') setGizmoMode('rotate');
      if (e.key === 'r' || e.key === 'R') setGizmoMode('scale');
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Save / Publish Handler
  const handleSave = async () => {
    setError(null);
    if (!name.trim()) {
      setError('Vui lòng nhập tên cho AR Target.');
      return;
    }
    if (!targetPreview) {
      setError('Vui lòng chọn ảnh Target (ảnh để quét).');
      return;
    }
    if (!contentPreview) {
      setError('Vui lòng chọn tệp nội dung hiển thị.');
      return;
    }

    setSaving(true);
    try {
      let target_image_url = initialTarget?.target_image_url || '';
      let content_url = initialTarget?.content_url || '';
      let thumbnail_url = initialTarget?.thumbnail_url || target_image_url;
      let mind_file_url = initialTarget?.mind_file_url || null;

      // 1. Upload Target File if newly selected
      if (targetFile) {
        setProgressText('Đang tải ảnh Target lên máy chủ...');
        target_image_url = await uploadARAssetToSupabase(targetFile);

        // Compile .mind file
        try {
          setProgressText('Đang biên dịch ảnh Target thành tệp nhận diện .mind...');
          const mindBlob = await compileImageToMindBlob(targetFile, (percent) => {
            setProgressText(`Đang biên dịch ảnh Target: ${percent}%`);
          });
          const mindFileObj = new File([mindBlob], `${Date.now()}-target.mind`, {
            type: 'application/octet-stream',
          });
          mind_file_url = await uploadARAssetToSupabase(mindFileObj);
        } catch (compileErr) {
          console.warn('Không thể biên dịch tệp .mind tại client:', compileErr);
        }
      }

      // 2. Upload Content File if newly selected
      if (contentFile) {
        setProgressText('Đang tải tệp nội dung hiển thị lên...');
        content_url = await uploadARAssetToSupabase(contentFile);
      }

      // 3. Upload Thumbnail if selected
      if (thumbFile) {
        setProgressText('Đang tải ảnh thu nhỏ (Thumbnail)...');
        thumbnail_url = await uploadARAssetToSupabase(thumbFile);
      } else if (!thumbnail_url) {
        thumbnail_url = target_image_url;
      }

      setProgressText('Đang lưu thông tin vào cơ sở dữ liệu...');

      const payload = packARTargetPayload({
        name: name.trim(),
        rawTextDescription: description.trim(),
        target_image_url,
        mind_file_url,
        thumbnail_url,
        content_type: contentType,
        content_url,
        scale,
        rotation: rotationX,
        position_x: posX,
        position_y: posY,
        position_z: posZ,
        is_transparent_video: isTransparentVideo,
        chroma_key_color: chromaKeyColor,
        auto_play_video: autoPlayVideo,
        loop_video: loopVideo,
        button_label: buttonLabel,
        button_url: buttonUrl,
        enable_capture: enableCapture,
        allow_user_rotate: allowUserRotate,
        allow_user_scale: allowUserScale,
        allow_user_drag: allowUserDrag,
        show_logo: showLogo,
        show_gesture_hint: showGestureHint,
        show_close_button: showCloseButton,
        show_scan_hint: showScanHint,
        active,
        owner_id: currentUser?.id ?? null,
      });

      if (isEditing && initialTarget) {
        const { error: updateErr } = await supabase
          .from('ar_targets')
          .update(payload)
          .eq('id', initialTarget.id);
        if (updateErr) throw updateErr;
      } else {
        const { error: insertErr } = await supabase.from('ar_targets').insert(payload);
        if (insertErr) throw insertErr;
      }

      onSaved();
    } catch (err: any) {
      console.error('Lỗi khi lưu AR Target:', err);
      setError(err.message || 'Lỗi khi lưu dữ liệu AR Target.');
    } finally {
      setSaving(false);
      setProgressText('');
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-[#111116] text-slate-100 font-sans select-none overflow-hidden">
      {/* 1. TOP HEADER BAR (Spark AR & 8th Wall Style) */}
      <header className="h-14 border-b border-white/10 bg-[#16161f] px-4 flex items-center justify-between shrink-0 z-20">
        {/* Left: Back & Project Title */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white transition text-xs font-semibold"
            title="Thoát Studio"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Thoát</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black tracking-wider uppercase px-2 py-0.5 rounded bg-brand/20 text-brand border border-brand/30">
              AR Studio
            </span>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nhập tên AR Target..."
              className="bg-transparent text-sm font-bold text-white border-b border-transparent hover:border-white/20 focus:border-brand focus:outline-none px-1.5 py-0.5 max-w-[220px] sm:max-w-xs transition"
            />
          </div>
        </div>

        {/* Center: 3D Manipulator Toolbar (Translate, Rotate, Scale) */}
        <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setGizmoMode('translate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              gizmoMode === 'translate'
                ? 'bg-brand text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Di chuyển (Phím W)"
          >
            <Move className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Di chuyển</span>
            <span className="text-[10px] opacity-60 font-mono">W</span>
          </button>

          <button
            type="button"
            onClick={() => setGizmoMode('rotate')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              gizmoMode === 'rotate'
                ? 'bg-brand text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Xoay trục X (Phím E)"
          >
            <RotateCw className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Xoay</span>
            <span className="text-[10px] opacity-60 font-mono">E</span>
          </button>

          <button
            type="button"
            onClick={() => setGizmoMode('scale')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
              gizmoMode === 'scale'
                ? 'bg-brand text-white shadow-md'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
            title="Thu phóng (Phím R)"
          >
            <Maximize2 className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Thu phóng</span>
            <span className="text-[10px] opacity-60 font-mono">R</span>
          </button>

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Grid Toggle */}
          <button
            type="button"
            onClick={() => setShowGrid(!showGrid)}
            className={`p-1.5 rounded-lg text-xs transition ${
              showGrid ? 'bg-white/15 text-white' : 'text-slate-500 hover:text-slate-300'
            }`}
            title="Bật/Tắt Lưới 3D"
          >
            <Grid3X3 className="w-4 h-4" />
          </button>

          {/* Reset Camera */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition text-xs"
            title="Góc nhìn 3D mặc định"
          >
            <Camera className="w-4 h-4" />
          </button>

          {/* Top-down View */}
          <button
            type="button"
            onClick={handleTopView}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition text-xs"
            title="Nhìn thẳng mặt Target (Top view)"
          >
            <Layers className="w-4 h-4" />
          </button>
        </div>

        {/* Right: Publish & Save Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded-xl border border-white/10 text-slate-300 hover:text-white hover:bg-white/5 text-xs font-semibold transition"
          >
            Hủy
          </button>

          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-1.5 rounded-xl bg-gradient-to-r from-brand to-emerald-500 hover:from-brand/90 hover:to-emerald-500/90 text-white text-xs font-bold shadow-lg shadow-brand/30 transition disabled:opacity-50"
          >
            {saving ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Đang xuất bản...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Lưu thay đổi' : 'Xuất bản AR'}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* 2. MAIN WORKSPACE (Left Hierarchy/Assets, Center 3D Canvas, Right Inspector) */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* ================= LEFT PANEL: SCENE HIERARCHY & ASSETS ================= */}
        <aside className="w-80 border-r border-white/10 bg-[#14141c] flex flex-col shrink-0 z-10">
          {/* Section 1: Scene Hierarchy (Cây phân cấp cảnh 3D) */}
          <div className="p-3 border-b border-white/10 bg-[#161622]">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand" /> Cây đối tượng (Hierarchy)
              </span>
              <span className="text-[10px] text-slate-500">2 đối tượng</span>
            </div>

            <div className="space-y-1">
              {/* Item: Target Marker */}
              <div
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                  activeTab === 'targets' ? 'bg-brand/15 text-white border border-brand/30' : 'text-slate-300 hover:bg-white/5'
                }`}
                onClick={() => setActiveTab('targets')}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-semibold truncate">🎯 Target Marker (Ảnh quét)</span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowTargetPlane(!showTargetPlane);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                  title={showTargetPlane ? 'Ẩn mặt phẳng target' : 'Hiện mặt phẳng target'}
                >
                  {showTargetPlane ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                </button>
              </div>

              {/* Item: AR Content Object */}
              <div
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                  activeTab === 'assets' ? 'bg-brand/15 text-white border border-brand/30' : 'text-slate-300 hover:bg-white/5'
                }`}
                onClick={() => setActiveTab('assets')}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="font-semibold truncate">
                    📦 Vật thể AR ({contentType.toUpperCase()})
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowContentObject(!showContentObject);
                  }}
                  className="p-1 text-slate-400 hover:text-white"
                  title={showContentObject ? 'Ẩn vật thể' : 'Hiện vật thể'}
                >
                  {showContentObject ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                </button>
              </div>
            </div>
          </div>

          {/* Section 2: Tab Manager (Targets vs Assets) */}
          <div className="flex border-b border-white/10 bg-[#121218]">
            <button
              type="button"
              onClick={() => setActiveTab('targets')}
              className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'targets'
                  ? 'border-brand text-brand bg-brand/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>1. Ảnh Target</span>
              {targetPreview && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('assets')}
              className={`flex-1 py-2.5 text-xs font-bold transition flex items-center justify-center gap-1.5 border-b-2 ${
                activeTab === 'assets'
                  ? 'border-brand text-brand bg-brand/5'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              <span>2. Import Content</span>
              {contentPreview && <Check className="w-3.5 h-3.5 text-emerald-400" />}
            </button>
          </div>

          {/* Tab 1 Body: Target Selection (Chọn riêng ảnh Target) */}
          {activeTab === 'targets' && (
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Ảnh mục tiêu quét (Target Marker) <span className="text-rose-400">*</span>
                </label>
                <p className="text-[11px] text-slate-400 mb-3">
                  Camera điện thoại sẽ quét nhận diện ảnh này để hiển thị hiệu ứng AR.
                </p>

                {/* Target Drop Zone & Preview with 8th Wall Tracking Frame */}
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'target')}
                  className="relative rounded-2xl border-2 border-dashed border-white/15 bg-black/40 hover:border-brand/60 transition p-3 text-center cursor-pointer group overflow-hidden"
                >
                  <input
                    type="file"
                    accept="image/*"
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => e.target.files && e.target.files[0] && handleTargetPick(e.target.files[0])}
                  />

                  {targetPreview ? (
                    <div className="relative rounded-xl overflow-hidden bg-black/60 aspect-[4/3] flex items-center justify-center border border-white/10">
                      <img src={targetPreview} alt="Target marker" className="max-h-full max-w-full object-contain" />

                      {/* 8th Wall style neon tracking corners */}
                      <div className="absolute inset-2 pointer-events-none border border-emerald-500/40 rounded-lg">
                        <div className="absolute top-0 left-0 w-3 h-3 border-t-2 border-l-2 border-emerald-400" />
                        <div className="absolute top-0 right-0 w-3 h-3 border-t-2 border-r-2 border-emerald-400" />
                        <div className="absolute bottom-0 left-0 w-3 h-3 border-b-2 border-l-2 border-emerald-400" />
                        <div className="absolute bottom-0 right-0 w-3 h-3 border-b-2 border-r-2 border-emerald-400" />
                      </div>

                      <div className="absolute bottom-2 inset-x-2 bg-black/80 backdrop-blur-sm rounded-lg py-1 px-2 text-[10px] text-emerald-300 flex items-center justify-between">
                        <span className="font-semibold flex items-center gap-1">
                          <Check className="w-3 h-3" /> Tracking Region
                        </span>
                        {targetDims && <span>{targetDims.width} × {targetDims.height} px</span>}
                      </div>
                    </div>
                  ) : (
                    <div className="py-8 space-y-2">
                      <Upload className="w-8 h-8 text-brand mx-auto opacity-80 group-hover:scale-110 transition" />
                      <p className="text-xs font-semibold text-slate-300">Kéo thả ảnh Target vào đây</p>
                      <p className="text-[10px] text-slate-500">Hỗ trợ PNG, JPG, JPEG (Độ tương phản cao)</p>
                    </div>
                  )}
                </div>

                {targetPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setTargetFile(null);
                      setTargetPreview('');
                    }}
                    className="mt-2 text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    ✕ Xóa ảnh và chọn lại
                  </button>
                )}
              </div>

              {/* Target info card */}
              <div className="bg-white/5 rounded-xl p-3 border border-white/5 space-y-1.5">
                <p className="text-[11px] font-semibold text-slate-300 flex items-center gap-1.5">
                  <HelpCircle className="w-3.5 h-3.5 text-brand" /> Mẹo chọn ảnh target hiệu quả:
                </p>
                <ul className="text-[10px] text-slate-400 space-y-1 pl-4 list-disc">
                  <li>Ảnh có nhiều chi tiết góc cạnh, tương phản rõ rệt.</li>
                  <li>Tránh ảnh có nền trơn, lặp lại hoa văn hoặc quá mờ.</li>
                  <li>Hệ thống sẽ tự động biên dịch sang tệp .mind khi lưu.</li>
                </ul>
              </div>
            </div>
          )}

          {/* Tab 2 Body: Content Import (Ảnh/Video/3D) */}
          {activeTab === 'assets' && (
            <div className="p-4 flex-1 overflow-y-auto space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-2">
                  Loại nội dung hiển thị (Content Type)
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { id: '3d', label: 'Object 3D', icon: Box, ext: '.glb, .gltf' },
                    { id: 'video', label: 'Video', icon: Video, ext: 'MP4, WebM' },
                    { id: 'image', label: 'Hình ảnh', icon: ImageIcon, ext: 'PNG, JPG' },
                    { id: 'gif', label: 'Ảnh động (GIF)', icon: Play, ext: 'GIF' },
                  ].map((t) => {
                    const Icon = t.icon;
                    const isSelected = contentType === t.id;
                    return (
                      <button
                        key={t.id}
                        type="button"
                        onClick={() => {
                          setContentType(t.id as any);
                          setContentFile(null);
                          setContentPreview('');
                        }}
                        className={`p-2.5 rounded-xl border text-left transition flex flex-col gap-1 ${
                          isSelected
                            ? 'bg-brand/20 border-brand text-white shadow-sm'
                            : 'bg-white/5 border-white/5 text-slate-400 hover:bg-white/10 hover:text-slate-200'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <Icon className={`w-4 h-4 ${isSelected ? 'text-brand' : 'text-slate-400'}`} />
                          {isSelected && <span className="w-1.5 h-1.5 rounded-full bg-brand" />}
                        </div>
                        <span className="text-xs font-bold">{t.label}</span>
                        <span className="text-[9px] opacity-60 truncate">{t.ext}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Import Asset Drop Zone */}
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">
                  Tải lên tệp ({contentType.toUpperCase()}) <span className="text-rose-400">*</span>
                </label>
                <div
                  onDragOver={(e) => e.preventDefault()}
                  onDrop={(e) => handleDrop(e, 'content')}
                  className="relative rounded-2xl border-2 border-dashed border-white/15 bg-black/40 hover:border-brand/60 transition p-4 text-center cursor-pointer group"
                >
                  <input
                    type="file"
                    accept={
                      contentType === '3d'
                        ? '.glb,.gltf'
                        : contentType === 'video'
                        ? 'video/*'
                        : contentType === 'gif'
                        ? 'image/gif'
                        : 'image/*'
                    }
                    className="absolute inset-0 opacity-0 cursor-pointer z-10"
                    onChange={(e) => e.target.files && e.target.files[0] && handleContentPick(e.target.files[0])}
                  />

                  {contentPreview ? (
                    <div className="space-y-2">
                      <div className="w-10 h-10 rounded-xl bg-brand/20 text-brand flex items-center justify-center mx-auto">
                        <Check className="w-5 h-5" />
                      </div>
                      <p className="text-xs font-bold text-white break-all">
                        {contentFile ? contentFile.name : 'Đã chọn tệp nội dung'}
                      </p>
                      <p className="text-[10px] text-emerald-400">Đã nạp vào không gian 3D</p>
                    </div>
                  ) : (
                    <div className="space-y-2 py-4">
                      <Upload className="w-7 h-7 text-brand mx-auto opacity-80 group-hover:scale-110 transition" />
                      <p className="text-xs font-semibold text-slate-300">Kéo thả tệp vào đây</p>
                      <p className="text-[10px] text-slate-500">
                        {contentType === '3d'
                          ? 'Định dạng .GLB hoặc .GLTF'
                          : contentType === 'video'
                          ? 'MP4, WebM (Hỗ trợ tách nền xanh)'
                          : 'PNG, JPG, SVG'}
                      </p>
                    </div>
                  )}
                </div>

                {contentPreview && (
                  <button
                    type="button"
                    onClick={() => {
                      setContentFile(null);
                      setContentPreview('');
                    }}
                    className="mt-2 text-[11px] text-slate-400 hover:text-rose-400 transition"
                  >
                    ✕ Đổi tệp khác
                  </button>
                )}
              </div>
            </div>
          )}
        </aside>

        {/* ================= CENTER: 3D VIEWPORT ================= */}
        <main className="flex-1 relative overflow-hidden bg-[#111116]">
          {/* Three.js Canvas Container */}
          <div ref={mountRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

          {/* Viewport Floating Status & Hotkey Helper */}
          <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-black/60 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300 font-medium">{viewportStatus}</span>
          </div>

          <div className="absolute bottom-4 left-4 z-10 hidden sm:flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-[11px] text-slate-400">
            <span className="flex items-center gap-1 text-slate-200">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">W</kbd> Di chuyển
            </span>
            <span className="flex items-center gap-1 text-slate-200">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">E</kbd> Xoay
            </span>
            <span className="flex items-center gap-1 text-slate-200">
              <kbd className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-mono">R</kbd> Phóng to
            </span>
            <span className="text-white/20">|</span>
            <span>Chuột trái: Kéo trục Gizmo</span>
            <span>Chuột phải: Xoay View</span>
            <span>Cuộn: Zoom</span>
          </div>

          {/* Target Not Ready Warning Banner */}
          {!targetPreview && (
            <div className="absolute top-4 right-4 z-10 max-w-xs bg-amber-500/20 backdrop-blur-md border border-amber-500/30 rounded-xl p-3 text-amber-200 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
              <span>Chưa có ảnh Target. Hãy chọn ảnh ở bảng bên trái để thấy mặt phẳng neo AR.</span>
            </div>
          )}
        </main>

        {/* ================= RIGHT PANEL: INSPECTOR / PROPERTIES ================= */}
        <aside className="w-80 border-l border-white/10 bg-[#14141c] flex flex-col shrink-0 z-10">
          {/* Header */}
          <div className="p-3 border-b border-white/10 bg-[#161622] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-brand" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Thuộc tính (Inspector)
              </span>
            </div>
            <button
              type="button"
              onClick={handleResetTransform}
              className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-white px-2 py-1 rounded bg-white/5 hover:bg-white/10 transition"
              title="Đặt lại tọa độ về 0"
            >
              <RefreshCcw className="w-3 h-3" /> Reset
            </button>
          </div>

          {/* Inspector Tabs */}
          <div className="flex border-b border-white/10 bg-[#121218]">
            <button
              type="button"
              onClick={() => setInspectorTab('transform')}
              className={`flex-1 py-2 text-xs font-bold transition ${
                inspectorTab === 'transform'
                  ? 'border-b-2 border-brand text-brand bg-brand/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Biến đổi (Transform)
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('advanced')}
              className={`flex-1 py-2 text-xs font-bold transition ${
                inspectorTab === 'advanced'
                  ? 'border-b-2 border-brand text-brand bg-brand/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Cài đặt nâng cao
            </button>
          </div>

          {/* Inspector Content */}
          <div className="p-4 flex-1 overflow-y-auto space-y-5">
            {inspectorTab === 'transform' ? (
              <>
                {/* 1. Transformations: Position X, Y, Z */}
                <div className="space-y-3">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Vị trí (Position)
                  </span>

                  {/* X Axis */}
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-rose-500/20 text-rose-400 font-bold text-xs flex items-center justify-center border border-rose-500/30">
                      X
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      value={posX}
                      onChange={(e) => setPosX(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand font-mono"
                    />
                  </div>

                  {/* Y Axis */}
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-emerald-500/20 text-emerald-400 font-bold text-xs flex items-center justify-center border border-emerald-500/30">
                      Y
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      value={posY}
                      onChange={(e) => setPosY(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand font-mono"
                    />
                  </div>

                  {/* Z Axis */}
                  <div className="flex items-center gap-2">
                    <span className="w-6 h-6 rounded bg-indigo-500/20 text-indigo-400 font-bold text-xs flex items-center justify-center border border-indigo-500/30">
                      Z
                    </span>
                    <input
                      type="number"
                      step="0.05"
                      value={posZ}
                      onChange={(e) => setPosZ(parseFloat(e.target.value) || 0)}
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand font-mono"
                    />
                  </div>
                </div>

                {/* 2. Scale Slider & Number */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="uppercase tracking-wider">Tỷ lệ (Scale)</span>
                    <span className="font-mono text-white">{scale.toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.1"
                      max="4.0"
                      step="0.05"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value))}
                      className="flex-1 accent-brand h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={scale}
                      onChange={(e) => setScale(parseFloat(e.target.value) || 1)}
                      className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                    />
                  </div>
                </div>

                {/* 3. Rotation X */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="uppercase tracking-wider">Góc xoay X (Rotation)</span>
                    <span className="font-mono text-white">{rotationX}°</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="-180"
                      max="180"
                      step="1"
                      value={rotationX}
                      onChange={(e) => setRotationX(parseFloat(e.target.value))}
                      className="flex-1 accent-brand h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      value={rotationX}
                      onChange={(e) => setRotationX(parseFloat(e.target.value) || 0)}
                      className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                    />
                  </div>
                </div>

                {/* 4. Active Target Status */}
                <div className="pt-2 border-t border-white/10">
                  <label className="flex items-center gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={active}
                      onChange={(e) => setActive(e.target.checked)}
                      className="w-4 h-4 accent-brand rounded cursor-pointer"
                    />
                    <span className="text-xs font-semibold text-slate-300">Kích hoạt AR Target</span>
                  </label>
                </div>
              </>
            ) : (
              <>
                {/* Advanced Settings Tab */}
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-400 mb-1">Mô tả dự án AR</label>
                    <textarea
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={3}
                      placeholder="Ghi chú thêm về AR target này..."
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-brand resize-none"
                    />
                  </div>

                  {/* Video Options */}
                  {contentType === 'video' && (
                    <div className="space-y-3 bg-white/5 p-3 rounded-xl border border-white/5">
                      <span className="text-xs font-bold text-slate-300 block">Tùy chọn Video</span>

                      <label className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={isTransparentVideo}
                          onChange={(e) => setIsTransparentVideo(e.target.checked)}
                          className="w-3.5 h-3.5 accent-brand"
                        />
                        <span className="text-xs text-slate-300">Tách phông xanh (Chroma Key)</span>
                      </label>

                      {isTransparentVideo && (
                        <div>
                          <label className="block text-[11px] text-slate-400 mb-1">Màu phông cần lọc</label>
                          <div className="flex gap-2">
                            <input
                              type="color"
                              value={chromaKeyColor}
                              onChange={(e) => setChromaKeyColor(e.target.value)}
                              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={chromaKeyColor}
                              onChange={(e) => setChromaKeyColor(e.target.value)}
                              className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 text-xs text-white uppercase font-mono"
                            />
                          </div>
                        </div>
                      )}

                      <div className="flex gap-4 pt-1">
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={autoPlayVideo}
                            onChange={(e) => setAutoPlayVideo(e.target.checked)}
                            className="w-3.5 h-3.5 accent-brand"
                          />
                          <span className="text-[11px] text-slate-300">Tự phát</span>
                        </label>
                        <label className="flex items-center gap-1.5 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={loopVideo}
                            onChange={(e) => setLoopVideo(e.target.checked)}
                            className="w-3.5 h-3.5 accent-brand"
                          />
                          <span className="text-[11px] text-slate-300">Lặp lại</span>
                        </label>
                      </div>
                    </div>
                  )}

                  {/* Interactive Button CTA */}
                  <div className="space-y-2 bg-white/5 p-3 rounded-xl border border-white/5">
                    <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                      <Link2 className="w-3.5 h-3.5 text-brand" /> Nút bấm tương tác (Call to action)
                    </span>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Tên nút</label>
                      <input
                        type="text"
                        value={buttonLabel}
                        onChange={(e) => setButtonLabel(e.target.value)}
                        placeholder="VD: Mua ngay / Xem thêm"
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-0.5">Liên kết URL</label>
                      <input
                        type="text"
                        value={buttonUrl}
                        onChange={(e) => setButtonUrl(e.target.value)}
                        placeholder="https://..."
                        className="w-full bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
                      />
                    </div>
                  </div>

                  {/* Photo Capture Setting */}
                  <div className="space-y-2.5 bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Camera className="w-3.5 h-3.5 text-emerald-400" /> Nút chụp ảnh AR (Capture)
                      </span>
                      <span className="text-[10px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded font-mono">
                        Mới
                      </span>
                    </div>
                    <label className="flex items-start gap-2.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={enableCapture}
                        onChange={(e) => setEnableCapture(e.target.checked)}
                        className="w-4 h-4 accent-emerald-500 rounded mt-0.5 cursor-pointer"
                      />
                      <div>
                        <span className="text-xs font-semibold text-slate-200 block">
                          Bật nút chụp ảnh cho người xem
                        </span>
                        <p className="text-[10px] text-slate-400 mt-0.5 leading-relaxed">
                          Khi quét AR thành công, màn hình sẽ hiện nút chụp để người dùng chụp lại ảnh kỷ niệm kèm hiệu ứng AR.
                        </p>
                      </div>
                    </label>
                  </div>

                  {/* 3D Touch Interaction Settings */}
                  <div className="space-y-2.5 bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Box className="w-3.5 h-3.5 text-amber-400" /> Tương tác cảm ứng 3D khi xem
                      </span>
                      <span className="text-[10px] bg-amber-500/20 text-amber-400 px-1.5 py-0.5 rounded font-mono">
                        Cử chỉ
                      </span>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Bật/tắt các hành động cho phép người dùng trực tiếp dùng ngón tay tương tác với vật thể trên điện thoại:
                    </p>

                    <div className="space-y-2 pt-1">
                      {/* 1. Rotate */}
                      <label className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <RotateCw className="w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Cho phép Xoay (Rotate)</span>
                            <span className="text-[9px] text-slate-500">Dùng 1 ngón vuốt để xoay mô hình 3D</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowUserRotate}
                          onChange={(e) => setAllowUserRotate(e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                      </label>

                      {/* 2. Scale */}
                      <label className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <Maximize2 className="w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Cho phép Phóng to / Thu nhỏ (Scale)</span>
                            <span className="text-[9px] text-slate-500">Dùng 2 ngón tay chụm (Pinch to zoom)</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowUserScale}
                          onChange={(e) => setAllowUserScale(e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                      </label>

                      {/* 3. Drag / Move */}
                      <label className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <Move className="w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Cho phép Kéo di chuyển (Drag)</span>
                            <span className="text-[9px] text-slate-500">Kéo trượt vị trí vật thể trên màn hình</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={allowUserDrag}
                          onChange={(e) => setAllowUserDrag(e.target.checked)}
                          className="w-4 h-4 accent-amber-500 rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>

                  {/* Overlay man hinh quet: bat/tat tung thong tin + nut xem truoc */}
                  <div className="space-y-2.5 bg-white/5 p-3 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                        <Smartphone className="w-3.5 h-3.5 text-sky-400" /> Giao diện màn hình quét (Overlay)
                      </span>
                      <button
                        type="button"
                        onClick={() => setShowMobilePreview(true)}
                        className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-1 rounded-lg font-semibold flex items-center gap-1 hover:bg-sky-500/30 transition"
                      >
                        <Eye className="w-3 h-3" /> Xem trước
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400 leading-relaxed">
                      Bật tắt các thông tin hiển thị chồng trên camera khi người dùng quét AR.
                    </p>

                    <div className="space-y-2 pt-1">
                      {/* 1. Logo */}
                      <label className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <ImageIcon className="w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Logo góc trên trái</span>
                            <span className="text-[9px] text-slate-500">Logo thương hiệu lấy từ cấu hình chung</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={showLogo}
                          onChange={(e) => setShowLogo(e.target.checked)}
                          className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                        />
                      </label>

                      {/* 2. Gesture hint */}
                      <label className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <Sparkles className="w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Băng gợi ý thao tác</span>
                            <span className="text-[9px] text-slate-500">Bảng Tương tác 3D hướng dẫn vuốt, chụm phóng to nhỏ</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={showGestureHint}
                          onChange={(e) => setShowGestureHint(e.target.checked)}
                          className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                        />
                      </label>

                      {/* 3. Close button */}
                      <label className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <X className="w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Nút đóng X</span>
                            <span className="text-[9px] text-slate-500">Nút thoát AR ở góc trên phải</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={showCloseButton}
                          onChange={(e) => setShowCloseButton(e.target.checked)}
                          className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                        />
                      </label>

                      {/* 4. Scan hint */}
                      <label className="flex items-center justify-between p-2 rounded-lg bg-black/30 border border-white/5 hover:border-white/10 cursor-pointer transition">
                        <div className="flex items-center gap-2">
                          <TargetIcon className="w-3.5 h-3.5 text-slate-400" />
                          <div>
                            <span className="text-xs font-medium text-slate-200 block">Chữ hướng dẫn quét</span>
                            <span className="text-[9px] text-slate-500">Dòng nhắc hướng camera vào ảnh target khi chưa nhận diện</span>
                          </div>
                        </div>
                        <input
                          type="checkbox"
                          checked={showScanHint}
                          onChange={(e) => setShowScanHint(e.target.checked)}
                          className="w-4 h-4 accent-sky-500 rounded cursor-pointer"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>

          {/* Bottom Save Error / Progress */}
          {error && (
            <div className="p-3 bg-rose-500/20 border-t border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {saving && progressText && (
            <div className="p-3 bg-brand/20 border-t border-brand/30 text-brand text-xs flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin shrink-0" />
              <span>{progressText}</span>
            </div>
          )}
        </aside>
      </div>

      {/* Modal xem truoc giao dien dien thoai (mock, khong can quet that) */}
      {showMobilePreview && (
        <div
          className="fixed inset-0 z-[200] bg-black/80 backdrop-blur-sm flex flex-col items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setShowMobilePreview(false)}
        >
          <div className="text-white text-sm font-semibold mb-3 flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-400" /> Xem trước màn hình quét trên điện thoại
          </div>

          {/* Khung dien thoai */}
          <div
            className="relative w-[300px] max-w-[86vw] h-[620px] max-h-[76vh] rounded-[2.2rem] border-4 border-slate-700 bg-black overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Nen camera gia lap + noi dung AR */}
            <div className="absolute inset-0 bg-gradient-to-br from-slate-800 via-slate-900 to-black flex items-center justify-center">
              {(contentType === 'image' || contentType === 'gif') && contentPreview ? (
                <img src={contentPreview} alt="Nội dung AR" className="max-w-[70%] max-h-[55%] object-contain drop-shadow-2xl" />
              ) : contentType === 'video' && contentPreview ? (
                <div className="px-4 py-3 rounded-2xl bg-black/50 border border-white/15 text-white/80 text-xs flex items-center gap-2">
                  <Video className="w-4 h-4" /> Video AR hiển thị tại đây
                </div>
              ) : (
                <div className="px-4 py-3 rounded-2xl bg-black/50 border border-white/15 text-white/80 text-xs flex items-center gap-2">
                  <Box className="w-4 h-4" /> Vật thể 3D hiển thị tại đây
                </div>
              )}
            </div>

            {/* Logo goc tren trai */}
            {showLogo && (
              <div className="absolute top-4 left-4 bg-black/40 px-2.5 py-1.5 rounded-xl backdrop-blur-md border border-white/10 text-[10px] font-bold text-white/80">
                LOGO
              </div>
            )}

            {/* Nut dong X goc tren phai */}
            {showCloseButton && (
              <div className="absolute top-4 right-4 bg-black/50 text-white p-2 rounded-full border border-white/10">
                <X className="w-4 h-4" />
              </div>
            )}

            {/* Bang goi y thao tac */}
            {showGestureHint && (allowUserRotate || allowUserScale || allowUserDrag) && (
              <div className="absolute top-16 inset-x-4 bg-black/70 backdrop-blur-md text-white text-[10px] px-3 py-2 rounded-2xl border border-white/15 flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                <div className="leading-snug">
                  <span className="font-semibold text-amber-300 block">Tương tác 3D:</span>
                  <span className="text-slate-200">
                    {[
                      allowUserRotate && 'Dùng 1 ngón vuốt để xoay',
                      allowUserScale && '2 ngón để phóng to/nhỏ',
                      allowUserDrag && 'Kéo để đổi vị trí',
                    ].filter(Boolean).join(' • ')}
                  </span>
                </div>
              </div>
            )}

            {/* Chu huong dan quet */}
            {showScanHint && (
              <div className="absolute bottom-28 inset-x-0 flex justify-center px-6">
                <div className="bg-black/55 backdrop-blur-md text-white text-[10px] px-3 py-2 rounded-2xl border border-white/10 text-center leading-snug">
                  Hướng camera vào ảnh mục tiêu để bắt đầu trải nghiệm AR
                </div>
              </div>
            )}

            {/* Nut chup anh */}
            {enableCapture && (
              <div className="absolute bottom-6 inset-x-0 flex justify-center">
                <div className="w-14 h-14 rounded-full bg-white/20 backdrop-blur-md p-1 border-2 border-white flex items-center justify-center">
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center">
                    <Camera className="w-5 h-5 text-slate-800" />
                  </div>
                </div>
              </div>
            )}
          </div>

          <button
            type="button"
            onClick={() => setShowMobilePreview(false)}
            className="mt-4 px-5 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-sm font-semibold transition"
          >
            Đóng xem trước
          </button>
          <p className="text-[10px] text-slate-400 mt-2 text-center max-w-[300px]">
            Đây là bản mô phỏng bố cục. Bật tắt các mục ở panel rồi xem thay đổi trực tiếp tại đây.
          </p>
        </div>
      )}
    </div>
  );
}
