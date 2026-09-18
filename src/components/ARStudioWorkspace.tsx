import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  ArrowLeft, Save, Move, RotateCw, RotateCcw, Maximize2, Grid3X3, RefreshCcw,
  Check, Upload, Box, Video, Image as ImageIcon, Eye, EyeOff, Layers,
  Sliders, Settings, Sparkles, AlertCircle, Loader2, Link2, Play, HelpCircle,
  Maximize, Minimize, X, Smartphone, Sun, Lightbulb, Compass, Plus, Trash2, Palette, Droplets
} from 'lucide-react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { supabase } from '../lib/supabase';
import { uploadARAssetToSupabase } from '../lib/upload';
import { compileImageToMindBlob } from '../lib/mindar';
import { UserAccount, ARTarget, SceneObjectItem, PBRMaterialConfig, SceneLightItem } from '../types';
import { unpackARTarget, packARTargetPayload } from '../lib/arHelpers';
import MobileARPreviewModal from './MobileARPreviewModal';
import MaterialInspector from './MaterialInspector';
import { applyPBRMaterialToObject, DEFAULT_PBR_MATERIAL } from '../lib/pbrMaterialHelper';

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
  const [rotationX, setRotationX] = useState<number>(target?.rotation_x ?? target?.rotation ?? 0);
  const [rotationY, setRotationY] = useState<number>(target?.rotation_y ?? 0);
  const [rotationZ, setRotationZ] = useState<number>(target?.rotation_z ?? 0);

  // Dynamic Scene Lights (replaces singular light state)
  const [sceneLights, setSceneLights] = useState<SceneLightItem[]>(
    target?.scene_lights || [
      {
        id: 'light_ambient',
        name: 'Sáng môi trường',
        type: 'hemisphere',
        color: '#ffffff',
        intensity: 1.0,
        position: { x: 0, y: 0, z: 0 },
        visible: true,
      }
    ]
  );
  
  const [selectedGizmoTarget, setSelectedGizmoTarget] = useState<'content' | 'light'>('content');

  // Video and Interaction Options
  const [isTransparentVideo, setIsTransparentVideo] = useState(target?.is_transparent_video ?? false);
  const [chromaKeyColor, setChromaKeyColor] = useState(target?.chroma_key_color || '#00ff00');
  const [autoPlayVideo, setAutoPlayVideo] = useState(target?.auto_play_video ?? true);
  const [loopVideo, setLoopVideo] = useState(target?.loop_video ?? true);
  const [buttonLabel, setButtonLabel] = useState(target?.button_label || '');
  const [buttonUrl, setButtonUrl] = useState(target?.button_url || '');

  // Group 3 Features: Capture & 3D Gestures
  const [enableCapture, setEnableCapture] = useState<boolean>(target?.enable_capture ?? false);
  const [allowUserRotate, setAllowUserRotate] = useState<boolean>(target?.allow_user_rotate ?? true);
  const [allowUserScale, setAllowUserScale] = useState<boolean>(target?.allow_user_scale ?? true);
  const [allowUserDrag, setAllowUserDrag] = useState<boolean>(target?.allow_user_drag ?? false);

  // Mobile HUD Customization
  const [showLogo, setShowLogo] = useState<boolean>(target?.show_logo ?? true);
  const [showCloseButton, setShowCloseButton] = useState<boolean>(target?.show_close_button ?? true);
  const [showGestureHint, setShowGestureHint] = useState<boolean>(target?.show_gesture_hint ?? true);
  const [showTargetName, setShowTargetName] = useState<boolean>(target?.show_target_name ?? false);
  const [showMobilePreview, setShowMobilePreview] = useState<boolean>(false);

  // Material PBR State
  const [mainMaterial, setMainMaterial] = useState<PBRMaterialConfig>(
    target?.material_config || DEFAULT_PBR_MATERIAL
  );

  // Extra Objects state (Multi-object scene support in Hierarchy)
  const [extraObjects, setExtraObjects] = useState<SceneObjectItem[]>(
    target?.scene_objects || []
  );
  const [selectedHierarchyId, setSelectedHierarchyId] = useState<string>('main_content');
  const [showLightHelper, setShowLightHelper] = useState<boolean>(true);
  const [isSceneReady, setIsSceneReady] = useState<boolean>(false);

  // UI State
  const [gizmoMode, setGizmoMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const [gizmoSize, setGizmoSize] = useState<number>(1.0);
  const [activeTab, setActiveTab] = useState<'targets' | 'assets'>('targets');
  const [inspectorTab, setInspectorTab] = useState<'transform' | 'material' | 'lighting' | 'advanced' | 'mobile_hud'>('transform');
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
  const axesHelperRef = useRef<THREE.AxesHelper | null>(null);
  const gizmoHelperRef = useRef<THREE.Object3D | null>(null);
  const gridRef = useRef<THREE.GridHelper | null>(null);
  const isDraggingRef = useRef<boolean>(false);

  // Light Management Refs
  const sceneLightsGroupRef = useRef<THREE.Group | null>(null);
  const sceneLightGroupsRef = useRef<Map<string, THREE.Group>>(new Map());
  const sceneLightObjectsRef = useRef<Map<string, THREE.Light>>(new Map());
  const sceneLightHelpersRef = useRef<Map<string, THREE.DirectionalLightHelper>>(new Map());

  // Extra Objects Groups in Three.js Scene
  const extraSceneGroupRef = useRef<THREE.Group | null>(null);
  const extraObjectGroupsRef = useRef<Map<string, THREE.Group>>(new Map());

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
    camera.position.set(0, 0, 3.2); // Look directly at upright target
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Environment Map (for realistic PBR reflections and ambient light)
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;

    // 4. Lights (Dynamic setup handled in separate useEffect)
    const lightsContainer = new THREE.Group();
    scene.add(lightsContainer);
    sceneLightsGroupRef.current = lightsContainer;

    // Extra Objects Root Group
    const extraSceneGroup = new THREE.Group();
    scene.add(extraSceneGroup);
    extraSceneGroupRef.current = extraSceneGroup;

    // 5. Grid Helper (Studio Floor)
    const grid = new THREE.GridHelper(10, 20, 0x4f46e5, 0x272733);
    grid.position.y = -1.0;
    scene.add(grid);
    gridRef.current = grid;

    // 6. Orbit Controls
    const orbit = new OrbitControls(camera, renderer.domElement);
    orbit.enableDamping = true;
    orbit.dampingFactor = 0.05;
    orbit.maxPolarAngle = Math.PI - 0.05;
    orbit.minDistance = 0.5;
    orbit.maxDistance = 15;
    orbitRef.current = orbit;

    // 7. Content Group (Transform container)
    const contentGroup = new THREE.Group();
    contentGroup.position.set(posX, posY, posZ);
    contentGroup.scale.set(scale, scale, scale);
    contentGroup.rotation.set(
      rotationX * (Math.PI / 180),
      rotationY * (Math.PI / 180),
      rotationZ * (Math.PI / 180)
    );
    scene.add(contentGroup);
    contentGroupRef.current = contentGroup;

    // Visual RGB Axes Helper (Red = X, Green = Y, Blue = Z)
    const axesHelper = new THREE.AxesHelper(1.2);
    axesHelper.renderOrder = 999;
    if (axesHelper.material) {
      (axesHelper.material as THREE.Material).depthTest = false;
    }
    axesHelper.scale.set(gizmoSize, gizmoSize, gizmoSize);
    contentGroup.add(axesHelper);
    axesHelperRef.current = axesHelper;

    // 8. Transform Controls (Gizmo)
    const transform = new TransformControls(camera, renderer.domElement);
    transform.size = gizmoSize;
    transform.setSpace('world');
    transform.attach(contentGroup);
    
    // In Three.js r186+, getHelper() returns the Object3D that must be added to the scene
    const gizmoHelper = typeof (transform as any).getHelper === 'function'
      ? (transform as any).getHelper()
      : (transform as any);
    scene.add(gizmoHelper);
    gizmoHelperRef.current = gizmoHelper;
    transformRef.current = transform;

    // When dragging gizmo, disable orbit controls
    transform.addEventListener('dragging-changed', (event: any) => {
      isDraggingRef.current = !!event.value;
      orbit.enabled = !event.value;
      if (event.value) {
        setViewportStatus('Đang chỉnh sửa...');
      } else {
        setViewportStatus('Đã cập nhật vị trí');
      }
    });

    // When transform changes via gizmo, sync back to React state
    transform.addEventListener('change', () => {
      // Check if transform target is a scene light
      for (const [lightId, grp] of sceneLightGroupsRef.current.entries()) {
        if (transform.object === grp) {
          const p = grp.position;
          const r = grp.rotation;
          setSceneLights((prev) =>
            prev.map((item) =>
              item.id === lightId
                ? {
                    ...item,
                    position: { x: parseFloat(p.x.toFixed(3)), y: parseFloat(p.y.toFixed(3)), z: parseFloat(p.z.toFixed(3)) },
                    rotation: {
                      x: parseFloat((r.x * (180 / Math.PI)).toFixed(1)),
                      y: parseFloat((r.y * (180 / Math.PI)).toFixed(1)),
                      z: parseFloat((r.z * (180 / Math.PI)).toFixed(1)),
                    },
                  }
                : item
            )
          );
          const helper = sceneLightHelpersRef.current.get(lightId);
          if (helper) helper.update();
          return;
        }
      }

      if (transform.object === contentGroupRef.current) {
        const p = contentGroupRef.current.position;
        const s = contentGroupRef.current.scale;
        const r = contentGroupRef.current.rotation;

        setPosX(parseFloat(p.x.toFixed(3)));
        setPosY(parseFloat(p.y.toFixed(3)));
        setPosZ(parseFloat(p.z.toFixed(3)));
        setScale(parseFloat(s.x.toFixed(3)));
        setRotationX(parseFloat((r.x * (180 / Math.PI)).toFixed(1)));
        setRotationY(parseFloat((r.y * (180 / Math.PI)).toFixed(1)));
        setRotationZ(parseFloat((r.z * (180 / Math.PI)).toFixed(1)));
        return;
      }

      // Check if transform target is an extra object
      for (const [objId, grp] of extraObjectGroupsRef.current.entries()) {
        if (transform.object === grp) {
          const p = grp.position;
          const s = grp.scale;
          const r = grp.rotation;
          setExtraObjects((prev) =>
            prev.map((item) =>
              item.id === objId
                ? {
                    ...item,
                    position: { x: parseFloat(p.x.toFixed(3)), y: parseFloat(p.y.toFixed(3)), z: parseFloat(p.z.toFixed(3)) },
                    scale: { x: parseFloat(s.x.toFixed(3)), y: parseFloat(s.y.toFixed(3)), z: parseFloat(s.z.toFixed(3)) },
                    rotation: {
                      x: parseFloat((r.x * (180 / Math.PI)).toFixed(1)),
                      y: parseFloat((r.y * (180 / Math.PI)).toFixed(1)),
                      z: parseFloat((r.z * (180 / Math.PI)).toFixed(1)),
                    },
                  }
                : item
            )
          );
          break;
        }
      }
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

    setIsSceneReady(true);

    // Cleanup
    return () => {
      cancelAnimationFrame(animationFrameId);
      resizeObserver.disconnect();
      transform.dispose();
      orbit.dispose();
      renderer.dispose();
      if (renderer.domElement && container.contains(renderer.domElement)) {
        container.removeChild(renderer.domElement);
      }
    };
  }, []);


  // Sync state changes to Content Group in Three.js (when typed in Inspector)
  useEffect(() => {
    if (!contentGroupRef.current) return;
    if (!isDraggingRef.current || transformRef.current?.object !== contentGroupRef.current) {
      contentGroupRef.current.position.set(posX, posY, posZ);
      contentGroupRef.current.scale.set(scale, scale, scale);
      contentGroupRef.current.rotation.set(
        rotationX * (Math.PI / 180),
        rotationY * (Math.PI / 180),
        rotationZ * (Math.PI / 180)
      );
    }
  }, [posX, posY, posZ, scale, rotationX, rotationY, rotationZ, isSceneReady]);

  // Toggle Grid visibility
  useEffect(() => {
    if (gridRef.current) {
      gridRef.current.visible = showGrid;
    }
  }, [showGrid, isSceneReady]);

  // Sync Scene Lights
  useEffect(() => {
    const scene = sceneRef.current;
    const container = sceneLightsGroupRef.current;
    if (!scene || !container) return;

    const currentLightIds = new Set(sceneLights.map(l => l.id));

    // Remove deleted lights
    for (const [id, grp] of sceneLightGroupsRef.current.entries()) {
      if (!currentLightIds.has(id)) {
        container.remove(grp);
        sceneLightGroupsRef.current.delete(id);
        const obj = sceneLightObjectsRef.current.get(id);
        if (obj) {
          obj.dispose();
          sceneLightObjectsRef.current.delete(id);
        }
        const helper = sceneLightHelpersRef.current.get(id);
        if (helper) {
          helper.dispose();
          sceneLightHelpersRef.current.delete(id);
        }
      }
    }

    // Add or update lights
    sceneLights.forEach((light) => {
      let group = sceneLightGroupsRef.current.get(light.id);
      let lightObj = sceneLightObjectsRef.current.get(light.id);
      let helper = sceneLightHelpersRef.current.get(light.id);

      if (!group) {
        group = new THREE.Group();
        group.name = `Group_${light.id}`;
        container.add(group);
        sceneLightGroupsRef.current.set(light.id, group);

        // Visual representation (Wireframe bulb for directional/point lights)
        if (light.type !== 'ambient' && light.type !== 'hemisphere') {
          const bulbGroup = new THREE.Group();
          const bulbMat = new THREE.MeshBasicMaterial({ color: 0xfbbf24, wireframe: true, depthTest: false, transparent: true, opacity: 0.8 });
          const bulbMesh = new THREE.Mesh(
            new THREE.SphereGeometry(0.35, 16, 16),
            bulbMat
          );
          bulbMesh.renderOrder = 999;
          bulbGroup.add(bulbMesh);
          
          // Add rays
          const raysGeom = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(0, 0, 0), new THREE.Vector3(0, 0, -1.0),
          ]);
          const raysMat = new THREE.LineBasicMaterial({ color: 0xfbbf24, depthTest: false, transparent: true, opacity: 0.8 });
          const line = new THREE.LineSegments(raysGeom, raysMat);
          line.renderOrder = 999;
          bulbGroup.add(line);
          
          bulbGroup.name = 'visual_bulb';
          group.add(bulbGroup);
        }

        if (light.type === 'directional') {
          lightObj = new THREE.DirectionalLight(light.color, light.intensity);
          lightObj.castShadow = light.castShadow || false;
          group.add(lightObj);
          
          // Add target to scene instead of group, and point it at 0,0,0
          scene.add((lightObj as THREE.DirectionalLight).target);
          (lightObj as THREE.DirectionalLight).target.position.set(0, 0, 0);
          
          helper = new THREE.DirectionalLightHelper(lightObj as THREE.DirectionalLight, 2.0, 0xfbbf24);
          scene.add(helper);
          sceneLightHelpersRef.current.set(light.id, helper);
        } else if (light.type === 'point') {
          lightObj = new THREE.PointLight(light.color, light.intensity);
          lightObj.castShadow = light.castShadow || false;
          group.add(lightObj);
        } else if (light.type === 'hemisphere') {
          lightObj = new THREE.HemisphereLight(light.color, 0x444444, light.intensity);
          group.add(lightObj);
        } else {
          lightObj = new THREE.AmbientLight(light.color, light.intensity);
          group.add(lightObj);
        }
        sceneLightObjectsRef.current.set(light.id, lightObj);
      }

      // Update properties
      if (lightObj) {
        lightObj.color.set(light.color);
        lightObj.intensity = light.intensity;
        lightObj.visible = light.visible;
        if (lightObj.type !== 'AmbientLight' && lightObj.type !== 'HemisphereLight') {
          lightObj.castShadow = light.castShadow || false;
        }
      }

      if (group) {
        if (!isDraggingRef.current || transformRef.current?.object !== group) {
          group.position.set(light.position?.x ?? 0, light.position?.y ?? 0, light.position?.z ?? 0);
          if (light.rotation) {
            group.rotation.set(
              (light.rotation?.x ?? 0) * (Math.PI / 180),
              (light.rotation?.y ?? 0) * (Math.PI / 180),
              (light.rotation?.z ?? 0) * (Math.PI / 180)
            );
          }
        }
        group.updateMatrixWorld(true);
        
        // Show/hide visual bulb
        const bulb = group.getObjectByName('visual_bulb');
        if (bulb) {
          bulb.visible = showLightHelper && light.visible;
        }
      }

      if (helper) {
        helper.visible = showLightHelper && light.visible;
        helper.update();
      }
    });
  }, [sceneLights, showLightHelper, isSceneReady]);

  // Toggle Content visibility
  useEffect(() => {
    if (contentGroupRef.current) {
      contentGroupRef.current.visible = showContentObject;
    }
  }, [showContentObject, isSceneReady]);

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

        // Target marker plane centered at [0, 0, 0], standing upright in XY plane
        const width = 1.6;
        const height = width / aspect;
        const geom = new THREE.PlaneGeometry(width, height);
        // Plane stands upright facing camera along +Z (standard MindAR orientation)

        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.9,
          roughness: 0.8,
          metalness: 0.2,
        });

        const mesh = new THREE.Mesh(geom, mat);
        mesh.position.set(0, 0, 0);

        // Position studio floor grid directly beneath upright target marker
        if (gridRef.current) {
          gridRef.current.position.y = -height / 2 - 0.02;
        }

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
  }, [targetPreview, showTargetPlane, isSceneReady]);

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

    // 1. 3D GLTF / GLB / OBJ
    if (contentType === '3d') {
      setViewportStatus('Đang nạp mô hình 3D...');
      if (contentPreview.toLowerCase().endsWith('.obj')) {
        const objLoader = new OBJLoader();
        objLoader.load(
          contentPreview,
          (loadedObj) => {
            const box = new THREE.Box3().setFromObject(loadedObj);
            const center = box.getCenter(new THREE.Vector3());
            loadedObj.position.sub(center);
            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 3 || maxDim < 0.1) {
              const factor = 1.0 / (maxDim || 1);
              loadedObj.scale.multiplyScalar(factor);
            }
            group.add(loadedObj);
            currentContentMeshRef.current = loadedObj;
            applyPBRMaterialToObject(loadedObj, mainMaterial);
            setViewportStatus('Mô hình 3D (OBJ) đã sẵn sàng');
          },
          undefined,
          (err) => {
            console.error('Lỗi nạp tệp OBJ:', err);
            setViewportStatus('Lỗi nạp mô hình 3D OBJ');
          }
        );
      } else {
        const loader = new GLTFLoader();
        loader.load(
          contentPreview,
          (gltf) => {
            const model = gltf.scene;

            // Auto center model at (0,0,0)
            const box = new THREE.Box3().setFromObject(model);
            const center = box.getCenter(new THREE.Vector3());
            model.position.sub(center);

            const size = box.getSize(new THREE.Vector3());
            const maxDim = Math.max(size.x, size.y, size.z);
            if (maxDim > 3 || maxDim < 0.1) {
              const factor = 1.0 / (maxDim || 1);
              model.scale.multiplyScalar(factor);
            }

            group.add(model);
            currentContentMeshRef.current = model;
            applyPBRMaterialToObject(model, mainMaterial);
            setViewportStatus('Mô hình 3D đã sẵn sàng');
          },
          undefined,
          (err) => {
            console.error('Lỗi nạp mô hình 3D:', err);
            setViewportStatus('Lỗi nạp mô hình 3D');
          }
        );
      }
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
      // Sits directly on upright target facing camera
      geom.translate(0, 0, 0.01);

      const mat = new THREE.MeshStandardMaterial({
        map: videoTexture,
        side: THREE.DoubleSide,
        transparent: true,
        roughness: 0.8,
        metalness: 0.2,
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
        // Sits directly on upright target facing camera
        geom.translate(0, 0, 0.01);

        const mat = new THREE.MeshStandardMaterial({
          map: texture,
          side: THREE.DoubleSide,
          transparent: true,
          roughness: 0.8,
          metalness: 0.2,
        });

        const plane = new THREE.Mesh(geom, mat);
        group.add(plane);
        currentContentMeshRef.current = plane;
        setViewportStatus('Ảnh nội dung đã nạp');
      });
    }
  }, [contentPreview, contentType, loopVideo, autoPlayVideo, isSceneReady]);

  // Render Extra Objects
  useEffect(() => {
    const scene = sceneRef.current;
    if (!scene) return;

    // Create extra scene group if it doesn't exist
    if (!extraSceneGroupRef.current) {
      const extraGrp = new THREE.Group();
      scene.add(extraGrp);
      extraSceneGroupRef.current = extraGrp;
    }

    const container = extraSceneGroupRef.current;

    // Track which object IDs still exist
    const currentExtraObjectIds = new Set(extraObjects.map(o => o.id));

    // Remove deleted extra objects from the scene
    for (const [id, grp] of extraObjectGroupsRef.current.entries()) {
      if (!currentExtraObjectIds.has(id)) {
        container.remove(grp);
        extraObjectGroupsRef.current.delete(id);
      }
    }

    // Add or update extra objects
    extraObjects.forEach((obj) => {
      let group = extraObjectGroupsRef.current.get(obj.id);

      if (!group) {
        // Object is new, create group and add to container
        group = new THREE.Group();
        container.add(group);
        extraObjectGroupsRef.current.set(obj.id, group);

        // Render content based on type (Image/Video/3D)
        if (obj.type === '3d') {
          if (obj.url.toLowerCase().endsWith('.obj')) {
            const objLoader = new OBJLoader();
            objLoader.load(obj.url, (loadedObj) => {
               const box = new THREE.Box3().setFromObject(loadedObj);
               const center = box.getCenter(new THREE.Vector3());
               loadedObj.position.sub(center);
               const size = box.getSize(new THREE.Vector3());
               const maxDim = Math.max(size.x, size.y, size.z);
               if (maxDim > 3 || maxDim < 0.1) {
                 const factor = 1.0 / (maxDim || 1);
                 loadedObj.scale.multiplyScalar(factor);
               }
               group!.add(loadedObj);
               applyPBRMaterialToObject(loadedObj, obj.material || mainMaterial);
            });
          } else {
            const gltfLoader = new GLTFLoader();
            gltfLoader.load(obj.url, (gltf) => {
               const model = gltf.scene;
               const box = new THREE.Box3().setFromObject(model);
               const center = box.getCenter(new THREE.Vector3());
               model.position.sub(center);
               const size = box.getSize(new THREE.Vector3());
               const maxDim = Math.max(size.x, size.y, size.z);
               if (maxDim > 3 || maxDim < 0.1) {
                 const factor = 1.0 / (maxDim || 1);
                 model.scale.multiplyScalar(factor);
               }
               group!.add(model);
               applyPBRMaterialToObject(model, obj.material || mainMaterial);
            });
          }
        } else if (obj.type === 'image' || obj.type === 'video') {
          const texLoader = new THREE.TextureLoader();
          texLoader.setCrossOrigin('anonymous');
          texLoader.load(obj.url, (texture) => {
             texture.colorSpace = THREE.SRGBColorSpace;
             const aspect = texture.image ? texture.image.width / texture.image.height : 1;
             const width = 1.2;
             const height = width / aspect;
             const geom = new THREE.PlaneGeometry(width, height);
             const mat = new THREE.MeshStandardMaterial({ map: texture, side: THREE.DoubleSide, transparent: true, roughness: 0.8, metalness: 0.2 });
             const plane = new THREE.Mesh(geom, mat);
             group!.add(plane);
          });
        }
      }

      // Update position, rotation, and scale for existing/new group
      if (!isDraggingRef.current || transformRef.current?.object !== group) {
        group.position.set(obj.position?.x ?? 0, obj.position?.y ?? 0, obj.position?.z ?? 0);
        group.rotation.set(
          (obj.rotation?.x ?? 0) * (Math.PI / 180),
          (obj.rotation?.y ?? 0) * (Math.PI / 180),
          (obj.rotation?.z ?? 0) * (Math.PI / 180)
        );
        const scaleX = typeof obj.scale === 'number' ? obj.scale : (obj.scale?.x ?? 1);
        const scaleY = typeof obj.scale === 'number' ? obj.scale : (obj.scale?.y ?? 1);
        const scaleZ = typeof obj.scale === 'number' ? obj.scale : (obj.scale?.z ?? 1);
        group.scale.set(scaleX, scaleY, scaleZ);
      }
    });

  }, [extraObjects, isSceneReady]);

  // Camera Controls Helper
  const handleResetCamera = () => {
    if (!cameraRef.current || !orbitRef.current) return;
    cameraRef.current.position.set(0, 0, 3.2);
    orbitRef.current.target.set(0, 0, 0);
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
    setRotationY(0);
    setRotationZ(0);
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
  // Update Gizmo mode, target, size, and axes configuration
  useEffect(() => {
    if (!transformRef.current) return;
    transformRef.current.setMode(gizmoMode);
    transformRef.current.size = gizmoSize;
    // Show all 3 axes (X, Y, Z) in all transform modes
    transformRef.current.showX = true;
    transformRef.current.showY = true;
    transformRef.current.showZ = true;

    if (axesHelperRef.current) {
      axesHelperRef.current.scale.set(gizmoSize, gizmoSize, gizmoSize);
    }

    // Detach current
    transformRef.current.detach();
    if (axesHelperRef.current && axesHelperRef.current.parent) {
      axesHelperRef.current.parent.remove(axesHelperRef.current);
    }

    // Attach gizmo based on selectedHierarchyId
    if (selectedHierarchyId === 'main_content' && contentGroupRef.current) {
      transformRef.current.attach(contentGroupRef.current);
      if (axesHelperRef.current) {
        contentGroupRef.current.add(axesHelperRef.current);
      }
    } else {
      // Check if it's an extra object
      const extraGroup = extraObjectGroupsRef.current.get(selectedHierarchyId);
      if (extraGroup) {
        transformRef.current.attach(extraGroup);
        if (axesHelperRef.current) {
          extraGroup.add(axesHelperRef.current);
        }
      } else {
        // Check if it's a light
        const lightGroup = sceneLightGroupsRef.current.get(selectedHierarchyId);
        if (lightGroup) {
          transformRef.current.attach(lightGroup);
          if (axesHelperRef.current) {
            lightGroup.add(axesHelperRef.current);
          }
        }
      }
    }
  }, [gizmoMode, selectedHierarchyId, gizmoSize, sceneLights.length, extraObjects.length]);

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

      const mainLight = sceneLights.find(l => l.id === 'light_main') || sceneLights[0];
      
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
        rotation_x: rotationX,
        rotation_y: rotationY,
        rotation_z: rotationZ,
        light_intensity: mainLight?.intensity ?? 1.2,
        light_pos_x: mainLight?.position?.x ?? 5,
        light_pos_y: mainLight?.position?.y ?? 10,
        light_pos_z: mainLight?.position?.z ?? 7,
        light_rot_x: mainLight?.rotation?.x ?? 0,
        light_rot_y: mainLight?.rotation?.y ?? 0,
        light_rot_z: mainLight?.rotation?.z ?? 0,
        light_scale: 1.0,
        position_x: posX,
        position_y: posY,
        position_z: posZ,
        scene_lights: sceneLights,
        material_config: mainMaterial,
        scene_objects: extraObjects,
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
        show_close_button: showCloseButton,
        show_gesture_hint: showGestureHint,
        show_target_name: showTargetName,
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

          {/* Reset 3D View */}
          <button
            type="button"
            onClick={handleResetCamera}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition text-xs"
            title="Góc nhìn 3D mặc định"
          >
            <Eye className="w-4 h-4" />
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

          <div className="h-4 w-[1px] bg-white/10 mx-1" />

          {/* Điều chỉnh kích thước trục tọa độ 3D (Gizmo Size) */}
          <div className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-lg border border-white/10 text-xs" title="Kích thước trục tọa độ Gizmo">
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Trục:</span>
            <button
              type="button"
              onClick={() => setGizmoSize((s) => Math.max(0.3, parseFloat((s - 0.2).toFixed(1))))}
              className="w-4 h-4 flex items-center justify-center rounded text-slate-300 hover:bg-white/10 text-xs font-bold leading-none"
              title="Thu nhỏ trục Gizmo"
            >
              -
            </button>
            <span className="font-mono text-[11px] font-bold text-amber-400 min-w-[28px] text-center">
              {gizmoSize.toFixed(1)}x
            </span>
            <button
              type="button"
              onClick={() => setGizmoSize((s) => Math.min(3.0, parseFloat((s + 0.2).toFixed(1))))}
              className="w-4 h-4 flex items-center justify-center rounded text-slate-300 hover:bg-white/10 text-xs font-bold leading-none"
              title="Phóng to trục Gizmo"
            >
              +
            </button>
          </div>
        </div>

        {/* Right: Publish & Save Actions */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowMobilePreview(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 hover:text-white border border-white/10 text-xs font-semibold transition shadow-sm"
            title="Xem trước giao diện trên điện thoại"
          >
            <Smartphone className="w-3.5 h-3.5 text-brand" />
            <span className="hidden sm:inline">Xem trước Mobile</span>
            <span className="sm:hidden">Preview</span>
          </button>

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
          <div className="p-3 border-b border-white/10 bg-[#161622] flex-1 max-h-[40%] overflow-y-auto custom-scrollbar">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-brand" /> Cây đối tượng (Hierarchy)
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const newLightId = `light_${Date.now()}`;
                    setSceneLights(prev => [
                      ...prev,
                      {
                        id: newLightId,
                        name: `Đèn mới ${sceneLights.length + 1}`,
                        type: 'directional',
                        color: '#ffffff',
                        intensity: 1.0,
                        position: { x: 3, y: 3, z: 3 },
                        rotation: { x: 0, y: 0, z: 0 },
                        visible: true,
                        castShadow: false
                      }
                    ]);
                    setSelectedHierarchyId(newLightId);
                    setInspectorTab('lighting');
                  }}
                  className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 text-[10px] text-amber-400 border border-amber-500/20 transition flex items-center gap-1"
                  title="Thêm đèn phụ"
                >
                  <Sun className="w-3 h-3" /> + Đèn
                </button>
                <span className="text-[10px] text-slate-500">{1 + extraObjects.length + sceneLights.length} obj</span>
              </div>
            </div>

            <div className="space-y-1">
              {/* Item: Target Marker (Always selected if target tab is active, but not part of transform selection) */}
              <div
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                  activeTab === 'targets' && selectedHierarchyId !== 'light' && selectedHierarchyId !== 'main_content' && !extraObjects.find(e => e.id === selectedHierarchyId) ? 'bg-brand/15 text-white border border-brand/30' : 'text-slate-300 hover:bg-white/5'
                }`}
                onClick={() => {
                  setActiveTab('targets');
                }}
              >
                <div className="flex items-center gap-2 truncate opacity-50">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                  <span className="font-semibold truncate">Target Marker (Chỉ xem)</span>
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

              {/* Item: Main Content */}
              <div
                className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                  selectedHierarchyId === 'main_content' ? 'bg-brand/15 text-white border border-brand/30' : 'text-slate-300 hover:bg-white/5'
                }`}
                onClick={() => {
                  setSelectedHierarchyId('main_content');
                  setActiveTab('assets'); // Optionally switch to assets tab for editing content
                }}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="w-2 h-2 rounded-full bg-indigo-400 shrink-0" />
                  <span className="font-semibold truncate">
                    Vật thể Chính ({contentType.toUpperCase()})
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

              {/* Items: Extra Objects */}
              {extraObjects.map((obj) => (
                <div
                  key={obj.id}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                    selectedHierarchyId === obj.id ? 'bg-brand/15 text-white border border-brand/30' : 'text-slate-300 hover:bg-white/5'
                  }`}
                  onClick={() => setSelectedHierarchyId(obj.id)}
                >
                  <div className="flex items-center gap-2 truncate">
                    <span className="w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
                    <span className="font-semibold truncate">
                      {obj.name}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      // Xoá object logic có thể thêm ở đây
                      setExtraObjects(prev => prev.filter(o => o.id !== obj.id));
                      if (selectedHierarchyId === obj.id) {
                        setSelectedHierarchyId('main_content');
                      }
                    }}
                    className="p-1 text-slate-400 hover:text-rose-400"
                    title="Xoá vật thể"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}

              {/* Items: Scene Lights */}
              {sceneLights.map((light) => (
                <div
                  key={light.id}
                  className={`flex items-center justify-between px-2.5 py-2 rounded-lg text-xs transition cursor-pointer ${
                    selectedHierarchyId === light.id ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-300 hover:bg-white/5'
                  }`}
                  onClick={() => {
                    setSelectedHierarchyId(light.id);
                    setInspectorTab('lighting');
                  }}
                >
                  <div className="flex items-center gap-2 truncate">
                    <Sun className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span className="font-semibold truncate">{light.name}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setSceneLights(prev => prev.map(l => l.id === light.id ? { ...l, visible: !l.visible } : l));
                      }}
                      className="p-1 text-slate-400 hover:text-white"
                      title={light.visible ? 'Ẩn ánh sáng ảo' : 'Hiện bóng đèn'}
                    >
                      {light.visible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5 text-slate-600" />}
                    </button>
                    {light.id !== 'light_main' && light.id !== 'light_ambient' && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSceneLights(prev => prev.filter(l => l.id !== light.id));
                          if (selectedHierarchyId === light.id) setSelectedHierarchyId('main_content');
                        }}
                        className="p-1 text-slate-400 hover:text-rose-400"
                        title="Xóa đèn phụ"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
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
                  <div className="mt-2 space-y-2">
                    <button
                      type="button"
                      onClick={() => {
                        setContentFile(null);
                        setContentPreview('');
                      }}
                      className="w-full py-1.5 text-[11px] text-slate-400 border border-slate-700 rounded hover:text-white hover:bg-slate-800 transition"
                    >
                      Thay đổi vật thể CHÍNH
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        // Thêm content hiện tại thành extra object (giả lập ID ngẫu nhiên)
                        const newExtraId = `extra_${Date.now()}`;
                        const newObj: SceneObjectItem = {
                          id: newExtraId,
                          name: contentFile ? `Phụ: ${contentFile.name}` : `Vật thể phụ mới`,
                          type: contentType as '3d' | 'image' | 'video', // Note: gif is handled as image/video here
                          url: contentPreview,
                          file: contentFile || undefined,
                          position: { x: 0, y: 0, z: 0 },
                          rotation: { x: 0, y: 0, z: 0 },
                          scale: { x: 1, y: 1, z: 1 },
                          visible: true
                        };
                        setExtraObjects(prev => [...prev, newObj]);
                        // Xoá content chính để nhường chỗ
                        setContentFile(null);
                        setContentPreview('');
                        setSelectedHierarchyId(newExtraId);
                      }}
                      className="w-full py-1.5 text-[11px] text-white bg-indigo-600/80 hover:bg-indigo-500 rounded transition font-medium flex items-center justify-center gap-1"
                    >
                      + Thêm vào không gian như vật thể PHỤ
                    </button>
                  </div>
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
          <div className="flex border-b border-white/10 bg-[#121218] overflow-x-auto custom-scrollbar">
            <button
              type="button"
              onClick={() => setInspectorTab('transform')}
              className={`px-3 py-2 text-xs font-bold transition flex-shrink-0 whitespace-nowrap ${
                inspectorTab === 'transform'
                  ? 'border-b-2 border-brand text-brand bg-brand/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Biến đổi
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('material')}
              className={`px-3 py-2 text-xs font-bold transition flex-shrink-0 whitespace-nowrap flex items-center gap-1 ${
                inspectorTab === 'material'
                  ? 'border-b-2 border-brand text-brand bg-brand/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Palette className="w-3 h-3" /> Chất liệu PBR
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('lighting')}
              className={`px-3 py-2 text-xs font-bold transition flex-shrink-0 whitespace-nowrap flex items-center gap-1 ${
                inspectorTab === 'lighting'
                  ? 'border-b-2 border-brand text-brand bg-brand/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Lightbulb className="w-3 h-3" /> Ánh sáng
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('advanced')}
              className={`px-3 py-2 text-xs font-bold transition flex-shrink-0 whitespace-nowrap ${
                inspectorTab === 'advanced'
                  ? 'border-b-2 border-brand text-brand bg-brand/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Nâng cao
            </button>
            <button
              type="button"
              onClick={() => setInspectorTab('mobile_hud')}
              className={`px-3 py-2 text-xs font-bold transition flex-shrink-0 whitespace-nowrap flex items-center gap-1 ${
                inspectorTab === 'mobile_hud'
                  ? 'border-b-2 border-brand text-brand bg-brand/5'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Tùy chỉnh thông tin hiện trên camera quét"
            >
              <Smartphone className="w-3 h-3" /> HUD
            </button>
          </div>

          {/* Inspector Content */}
          <div className="p-4 flex-1 overflow-y-auto space-y-5">
            {inspectorTab === 'transform' ? (
              <>
                {/* 0. Trục tọa độ 3D & Kích thước Gizmo */}
                <div className="space-y-2.5 p-3 rounded-xl bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/20 shadow-sm">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-300">
                    <span className="uppercase tracking-wider flex items-center gap-1.5 text-indigo-300">
                      <Compass className="w-3.5 h-3.5 text-indigo-400" /> Kích thước trục tọa độ (Gizmo)
                    </span>
                    <span className="font-mono text-amber-400 font-bold">{gizmoSize.toFixed(1)}x</span>
                  </div>
                  <p className="text-[10px] text-slate-400 leading-relaxed">
                    Điều chỉnh kích cỡ trục để dễ kéo thả và căn chỉnh tương thích với vật thể lớn hay nhỏ.
                  </p>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.3"
                      max="3.0"
                      step="0.1"
                      value={gizmoSize}
                      onChange={(e) => setGizmoSize(parseFloat(e.target.value) || 1.0)}
                      className="flex-1 accent-indigo-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      step="0.1"
                      min="0.3"
                      max="3.0"
                      value={gizmoSize}
                      onChange={(e) => setGizmoSize(parseFloat(e.target.value) || 1.0)}
                      className="w-16 bg-black/50 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:border-indigo-400 focus:outline-none"
                    />
                  </div>
                  {/* Quick Presets for Gizmo Size */}
                  <div className="grid grid-cols-4 gap-1 pt-1">
                    <button
                      type="button"
                      onClick={() => setGizmoSize(0.6)}
                      className={`py-1 text-[10px] rounded font-medium transition ${
                        Math.abs(gizmoSize - 0.6) < 0.05
                          ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/40'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Nhỏ (0.6x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGizmoSize(1.0)}
                      className={`py-1 text-[10px] rounded font-medium transition ${
                        Math.abs(gizmoSize - 1.0) < 0.05
                          ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/40'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Chuẩn (1.0x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGizmoSize(1.6)}
                      className={`py-1 text-[10px] rounded font-medium transition ${
                        Math.abs(gizmoSize - 1.6) < 0.05
                          ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/40'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Lớn (1.6x)
                    </button>
                    <button
                      type="button"
                      onClick={() => setGizmoSize(2.4)}
                      className={`py-1 text-[10px] rounded font-medium transition ${
                        Math.abs(gizmoSize - 2.4) < 0.05
                          ? 'bg-indigo-600/40 text-indigo-200 border border-indigo-500/40'
                          : 'bg-white/5 text-slate-400 hover:text-white'
                      }`}
                    >
                      Max (2.4x)
                    </button>
                  </div>
                </div>

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
                      value={selectedHierarchyId === 'main_content' ? posX : extraObjects.find(e => e.id === selectedHierarchyId)?.position?.x ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (selectedHierarchyId === 'main_content') setPosX(val);
                        else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, position: { ...o.position, x: val } } : o));
                      }}
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
                      value={selectedHierarchyId === 'main_content' ? posY : extraObjects.find(e => e.id === selectedHierarchyId)?.position?.y ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (selectedHierarchyId === 'main_content') setPosY(val);
                        else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, position: { ...o.position, y: val } } : o));
                      }}
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
                      value={selectedHierarchyId === 'main_content' ? posZ : extraObjects.find(e => e.id === selectedHierarchyId)?.position?.z ?? 0}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value) || 0;
                        if (selectedHierarchyId === 'main_content') setPosZ(val);
                        else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, position: { ...o.position, z: val } } : o));
                      }}
                      className="flex-1 bg-black/40 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand font-mono"
                    />
                  </div>
                </div>

                {/* 2. Scale Slider & Number */}
                <div className="space-y-2 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                    <span className="uppercase tracking-wider">Tỷ lệ (Scale)</span>
                    <span className="font-mono text-white">{(selectedHierarchyId === 'main_content' ? scale : (((typeof extraObjects.find(e => e.id === selectedHierarchyId)?.scale === 'number' ? extraObjects.find(e => e.id === selectedHierarchyId)?.scale : (extraObjects.find(e => e.id === selectedHierarchyId)?.scale as any)?.x) as number) ?? 1)).toFixed(2)}x</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="range"
                      min="0.1"
                      max="4.0"
                      step="0.05"
                      value={selectedHierarchyId === 'main_content' ? scale : (((typeof extraObjects.find(e => e.id === selectedHierarchyId)?.scale === 'number' ? extraObjects.find(e => e.id === selectedHierarchyId)?.scale : (extraObjects.find(e => e.id === selectedHierarchyId)?.scale as any)?.x) as number) ?? 1)}
                      onChange={(e) => {
                         const val = parseFloat(e.target.value) || 0;
                         if (selectedHierarchyId === 'main_content') setScale(val);
                         else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, scale: { x: val, y: val, z: val } } : o));
                      }}
                      className="flex-1 accent-brand h-1.5 bg-white/10 rounded-lg cursor-pointer"
                    />
                    <input
                      type="number"
                      step="0.1"
                      value={selectedHierarchyId === 'main_content' ? scale : (((typeof extraObjects.find(e => e.id === selectedHierarchyId)?.scale === 'number' ? extraObjects.find(e => e.id === selectedHierarchyId)?.scale : (extraObjects.find(e => e.id === selectedHierarchyId)?.scale as any)?.x) as number) ?? 1)}
                      onChange={(e) => {
                         const val = parseFloat(e.target.value) || 1;
                         if (selectedHierarchyId === 'main_content') setScale(val);
                         else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, scale: { x: val, y: val, z: val } } : o));
                      }}
                      className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center"
                    />
                  </div>
                </div>

                {/* 3. Rotation 3 Axes (X, Y, Z) */}
                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                      Góc xoay 3D (Rotation)
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        if (selectedHierarchyId === 'main_content') {
                           setRotationX(0);
                           setRotationY(0);
                           setRotationZ(0);
                        } else {
                           setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, rotation: { x: 0, y: 0, z: 0 } } : o));
                        }
                      }}
                      className="text-[10px] text-slate-400 hover:text-brand px-1.5 py-0.5 rounded bg-white/5 hover:bg-white/10 transition"
                      title="Đặt lại tất cả góc xoay về 0"
                    >
                      Đặt lại (0°)
                    </button>
                  </div>

                  {/* Trục X (Pitch / Nghiêng) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-rose-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-rose-500 inline-block" />
                        Trục X (Nghiêng)
                      </span>
                      <span className="font-mono text-white text-xs">{(selectedHierarchyId === 'main_content' ? rotationX : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.x ?? 0)}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={selectedHierarchyId === 'main_content' ? rotationX : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.x ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (selectedHierarchyId === 'main_content') setRotationX(val);
                          else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, rotation: { ...o.rotation, x: val } } : o));
                        }}
                        className="flex-1 accent-rose-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        value={selectedHierarchyId === 'main_content' ? rotationX : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.x ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (selectedHierarchyId === 'main_content') setRotationX(val);
                          else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, rotation: { ...o.rotation, x: val } } : o));
                        }}
                        className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:border-rose-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Trục Y (Yaw / Xoay ngang) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />
                        Trục Y (Xoay ngang)
                      </span>
                      <span className="font-mono text-white text-xs">{(selectedHierarchyId === 'main_content' ? rotationY : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.y ?? 0)}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={selectedHierarchyId === 'main_content' ? rotationY : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.y ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (selectedHierarchyId === 'main_content') setRotationY(val);
                          else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, rotation: { ...o.rotation, y: val } } : o));
                        }}
                        className="flex-1 accent-emerald-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        value={selectedHierarchyId === 'main_content' ? rotationY : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.y ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (selectedHierarchyId === 'main_content') setRotationY(val);
                          else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, rotation: { ...o.rotation, y: val } } : o));
                        }}
                        className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Trục Z (Roll / Nghiêng cạnh) */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="flex items-center gap-1.5 text-blue-400 font-medium">
                        <span className="w-2 h-2 rounded-full bg-blue-500 inline-block" />
                        Trục Z (Nghiêng cạnh)
                      </span>
                      <span className="font-mono text-white text-xs">{(selectedHierarchyId === 'main_content' ? rotationZ : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.z ?? 0)}°</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <input
                        type="range"
                        min="-180"
                        max="180"
                        step="1"
                        value={selectedHierarchyId === 'main_content' ? rotationZ : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.z ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (selectedHierarchyId === 'main_content') setRotationZ(val);
                          else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, rotation: { ...o.rotation, z: val } } : o));
                        }}
                        className="flex-1 accent-blue-500 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                      />
                      <input
                        type="number"
                        value={selectedHierarchyId === 'main_content' ? rotationZ : extraObjects.find(e => e.id === selectedHierarchyId)?.rotation?.z ?? 0}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          if (selectedHierarchyId === 'main_content') setRotationZ(val);
                          else setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, rotation: { ...o.rotation, z: val } } : o));
                        }}
                        className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:border-blue-500 focus:outline-none"
                      />
                    </div>
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
            ) : inspectorTab === 'material' ? (
              <div className="space-y-4">
                <MaterialInspector
                  material={selectedHierarchyId === 'main_content' ? mainMaterial : extraObjects.find(e => e.id === selectedHierarchyId)?.material || mainMaterial}
                  onChange={(newMat) => {
                    if (selectedHierarchyId === 'main_content') {
                      setMainMaterial(newMat);
                      if (currentContentMeshRef.current) {
                        applyPBRMaterialToObject(currentContentMeshRef.current, newMat);
                      }
                    } else {
                      setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, material: newMat } : o));
                      const grp = extraObjectGroupsRef.current.get(selectedHierarchyId);
                      if (grp) {
                        grp.traverse((child) => {
                           if ((child as THREE.Mesh).isMesh) {
                             applyPBRMaterialToObject(child, newMat);
                           }
                        });
                      }
                    }
                  }}
                  onReset={() => {
                    if (selectedHierarchyId === 'main_content') {
                      setMainMaterial(DEFAULT_PBR_MATERIAL);
                      if (currentContentMeshRef.current) {
                        applyPBRMaterialToObject(currentContentMeshRef.current, DEFAULT_PBR_MATERIAL);
                      }
                    } else {
                      setExtraObjects(prev => prev.map(o => o.id === selectedHierarchyId ? { ...o, material: DEFAULT_PBR_MATERIAL } : o));
                      const grp = extraObjectGroupsRef.current.get(selectedHierarchyId);
                      if (grp) {
                        grp.traverse((child) => {
                           if ((child as THREE.Mesh).isMesh) {
                             applyPBRMaterialToObject(child, DEFAULT_PBR_MATERIAL);
                           }
                        });
                      }
                    }
                  }}
                />
              </div>
            ) : inspectorTab === 'lighting' ? (
              <div className="space-y-3">
                {(() => {
                  const selectedLight = sceneLights.find(l => l.id === selectedHierarchyId);
                  if (!selectedLight) return <div className="text-xs text-slate-400 text-center py-4 bg-black/20 rounded-lg">Vui lòng chọn một nguồn sáng trong bảng Hierarchy.</div>;
                  
                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between text-[11px] font-bold text-slate-400">
                        <span className="uppercase tracking-wider flex items-center gap-1.5">
                          <Sun className="w-3.5 h-3.5 text-amber-400" /> {selectedLight.name}
                        </span>
                        <span className="font-mono text-amber-300 font-bold">{selectedLight.intensity.toFixed(1)}x</span>
                      </div>

                      <div className="space-y-2">
                        <label className="block text-xs font-semibold text-slate-300">Tên Nguồn Sáng</label>
                        <input
                          type="text"
                          value={selectedLight.name || ""}
                          onChange={(e) => setSceneLights(prev => prev.map(l => l.id === selectedHierarchyId ? { ...l, name: e.target.value } : l))}
                          className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                        />
                      </div>

                      <div className="flex items-center gap-4">
                        <div className="flex-1 space-y-2">
                          <label className="block text-xs font-semibold text-slate-300">Loại Đèn</label>
                          <select
                            value={selectedLight.type || "directional"}
                            onChange={(e) => setSceneLights(prev => prev.map(l => l.id === selectedHierarchyId ? { ...l, type: e.target.value as 'directional' | 'ambient' | 'point' | 'hemisphere' } : l))}
                            className="w-full bg-black/40 border border-white/10 rounded-lg p-2 text-xs text-white focus:outline-none focus:border-amber-500"
                          >
                            <option value="directional">Directional (Hướng)</option>
                            <option value="ambient">Ambient (Đều)</option>
                            <option value="hemisphere">Hemisphere (Bán cầu)</option>
                            <option value="point">Point (Điểm)</option>
                          </select>
                        </div>
                        <div className="space-y-2">
                          <label className="block text-xs font-semibold text-slate-300">Màu Sáng</label>
                          <div className="flex items-center gap-2">
                            <input
                              type="color"
                              value={selectedLight.color || "#ffffff"}
                              onChange={(e) => setSceneLights(prev => prev.map(l => l.id === selectedHierarchyId ? { ...l, color: e.target.value } : l))}
                              className="w-8 h-8 rounded border-none cursor-pointer bg-transparent"
                            />
                            <span className="text-xs font-mono text-slate-400 uppercase">{selectedLight.color}</span>
                          </div>
                        </div>
                      </div>

                      {/* Light Intensity Slider */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px] text-slate-400">
                          <span>Cường độ sáng (Intensity)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="range"
                            min="0.0"
                            max="20.0"
                            step="0.1"
                            value={selectedLight.intensity ?? 1.0}
                            onChange={(e) => setSceneLights(prev => prev.map(l => l.id === selectedHierarchyId ? { ...l, intensity: parseFloat(e.target.value) } : l))}
                            className="flex-1 accent-amber-400 h-1.5 bg-white/10 rounded-lg cursor-pointer"
                          />
                          <input
                            type="number"
                            step="0.1"
                            min="0.0"
                            max="20.0"
                            value={selectedLight.intensity ?? 1.0}
                            onChange={(e) => setSceneLights(prev => prev.map(l => l.id === selectedHierarchyId ? { ...l, intensity: parseFloat(e.target.value) || 0 } : l))}
                            className="w-16 bg-black/40 border border-white/10 rounded-lg px-2 py-1 text-xs text-white font-mono text-center focus:border-amber-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      {/* Light Helpers toggles */}
                      <div className="pt-2 border-t border-white/10 space-y-2">
                        {selectedLight.type !== 'ambient' && (
                          <label className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition">
                            <span className="text-[11px] font-medium text-slate-300">Bật đổ bóng (Cast Shadow)</span>
                            <input
                              type="checkbox"
                              checked={selectedLight.castShadow || false}
                              onChange={(e) => setSceneLights(prev => prev.map(l => l.id === selectedHierarchyId ? { ...l, castShadow: e.target.checked } : l))}
                              className="w-3.5 h-3.5 accent-amber-500 rounded"
                            />
                          </label>
                        )}
                        <label className="flex items-center justify-between bg-black/40 p-2 rounded-lg border border-white/5 cursor-pointer hover:bg-white/5 transition">
                          <span className="text-[11px] font-medium text-slate-300 flex items-center gap-1.5">
                            <Eye className="w-3.5 h-3.5 text-slate-400" /> Hiển thị helper trực quan
                          </span>
                          <input
                            type="checkbox"
                            checked={showLightHelper}
                            onChange={(e) => setShowLightHelper(e.target.checked)}
                            className="w-3.5 h-3.5 accent-amber-500 rounded"
                          />
                        </label>
                      </div>

                    </div>
                  );
                })()}
              </div>
            ) : inspectorTab === 'advanced' ? (
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
                    <span className="text-xs font-bold text-slate-300">
                      Nút bấm tương tác (Call to action)
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
                      <span className="text-xs font-bold text-slate-300">
                        Nút chụp ảnh AR (Capture)
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
                      <span className="text-xs font-bold text-slate-300">
                        Tương tác cảm ứng 3D khi xem
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
                </div>
              </>
            ) : inspectorTab === 'mobile_hud' ? (
              <div className="space-y-4">
                {/* Launch Live Preview Button */}
                <button
                  type="button"
                  onClick={() => setShowMobilePreview(true)}
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-brand to-emerald-500 hover:opacity-95 text-white font-bold text-xs shadow-lg shadow-brand/20 transition flex items-center justify-center gap-2 border border-white/10"
                >
                  <Smartphone className="w-4 h-4" />
                  <span>Mở Trình Xem Trước Mobile (Live)</span>
                </button>

                {/* Granular Toggles */}
                <div className="space-y-2.5">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
                    Bật / Tắt Thông Tin Trên Camera
                  </span>

                  {/* 1. Logo */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                    <div>
                      <span className="text-xs font-semibold text-white block">Logo thương hiệu</span>
                      <span className="text-[10px] text-slate-400">Góc trên bên trái màn hình quét AR</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showLogo}
                      onChange={(e) => setShowLogo(e.target.checked)}
                      className="w-4 h-4 accent-brand rounded cursor-pointer"
                    />
                  </label>

                  {/* 2. Close Button */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                    <div>
                      <span className="text-xs font-semibold text-white block">Nút đóng (X)</span>
                      <span className="text-[10px] text-slate-400">Góc trên bên phải màn hình</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showCloseButton}
                      onChange={(e) => setShowCloseButton(e.target.checked)}
                      className="w-4 h-4 accent-brand rounded cursor-pointer"
                    />
                  </label>

                  {/* 3. Gesture Hint Banner */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                    <div>
                      <span className="text-xs font-semibold text-white block">Hướng dẫn cử chỉ 3D</span>
                      <span className="text-[10px] text-slate-400">Banner chỉ dẫn vuốt xoay / phóng to</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showGestureHint}
                      onChange={(e) => setShowGestureHint(e.target.checked)}
                      className="w-4 h-4 accent-brand rounded cursor-pointer"
                    />
                  </label>

                  {/* 4. Target Name */}
                  <label className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 cursor-pointer transition">
                    <div>
                      <span className="text-xs font-semibold text-white block">Tên Target</span>
                      <span className="text-[10px] text-slate-400">Huy hiệu tên target ở cạnh trên</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showTargetName}
                      onChange={(e) => setShowTargetName(e.target.checked)}
                      className="w-4 h-4 accent-brand rounded cursor-pointer"
                    />
                  </label>
                </div>

                {/* Presets */}
                <div className="bg-white/5 p-3 rounded-xl border border-white/5 space-y-2">
                  <span className="text-[11px] font-bold text-slate-300 block">Cài đặt nhanh:</span>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogo(false);
                        setShowCloseButton(true);
                        setShowGestureHint(false);
                        setShowTargetName(false);
                        setEnableCapture(false);
                      }}
                      className="flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-slate-300 font-semibold transition"
                    >
                      Tối giản
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogo(true);
                        setShowCloseButton(true);
                        setShowGestureHint(true);
                        setShowTargetName(false);
                        setEnableCapture(true);
                      }}
                      className="flex-1 py-1.5 px-2 bg-brand/20 hover:bg-brand/30 border border-brand/30 text-white rounded-lg text-[10px] font-semibold transition"
                    >
                      Tiêu chuẩn
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setShowLogo(true);
                        setShowCloseButton(true);
                        setShowGestureHint(true);
                        setShowTargetName(true);
                        setEnableCapture(true);
                      }}
                      className="flex-1 py-1.5 px-2 bg-white/5 hover:bg-white/10 rounded-lg text-[10px] text-slate-300 font-semibold transition"
                    >
                      Đầy đủ
                    </button>
                  </div>
                </div>
              </div>
            ) : null}
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

      {/* Mobile Live Preview Modal */}
      {showMobilePreview && (
        <MobileARPreviewModal
          targetName={name}
          contentType={contentType}
          contentPreview={contentPreview}
          targetPreview={targetPreview}
          scale={scale}
          rotationX={rotationX}
          rotationY={rotationY}
          rotationZ={rotationZ}
          lightIntensity={sceneLights.find(l => l.id === 'light_main')?.intensity ?? 1.2}
          lightPosX={sceneLights.find(l => l.id === 'light_main')?.position?.x ?? 5}
          lightPosY={sceneLights.find(l => l.id === 'light_main')?.position?.y ?? 10}
          lightPosZ={sceneLights.find(l => l.id === 'light_main')?.position?.z ?? 7}
          lightRotX={sceneLights.find(l => l.id === 'light_main')?.rotation?.x ?? 0}
          lightRotY={sceneLights.find(l => l.id === 'light_main')?.rotation?.y ?? 0}
          lightRotZ={sceneLights.find(l => l.id === 'light_main')?.rotation?.z ?? 0}
          lightScale={1.0}
          posX={posX}
          posY={posY}
          isTransparentVideo={isTransparentVideo}
          chromaKeyColor={chromaKeyColor}
          buttonLabel={buttonLabel}
          buttonUrl={buttonUrl}
          showLogo={showLogo}
          setShowLogo={setShowLogo}
          showCloseButton={showCloseButton}
          setShowCloseButton={setShowCloseButton}
          showGestureHint={showGestureHint}
          setShowGestureHint={setShowGestureHint}
          showTargetName={showTargetName}
          setShowTargetName={setShowTargetName}
          enableCapture={enableCapture}
          setEnableCapture={setEnableCapture}
          allowUserRotate={allowUserRotate}
          allowUserScale={allowUserScale}
          allowUserDrag={allowUserDrag}
          onClose={() => setShowMobilePreview(false)}
        />
      )}
    </div>
  );
}
