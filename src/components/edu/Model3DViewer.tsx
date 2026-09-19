import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Loader2 } from 'lucide-react';

// Trình xem mô hình 3D trực tiếp trong cửa sổ popup khi chấm bài.
// Hỗ trợ định dạng FBX, OBJ, GLB, GLTF. Tự căn khung nhìn theo kích thước vật thể,
// có ánh sáng môi trường và xoay/phóng bằng chuột.
export default function Model3DViewer({ url, fileName }: { url: string; fileName: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let disposed = false;
    let frameId = 0;

    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xf1f5f9);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 5000);
    camera.position.set(0, 1, 5);

    const renderer = new THREE.WebGLRenderer({ antialias: true, preserveDrawingBuffer: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.0;
    container.appendChild(renderer.domElement);

    // Ánh sáng môi trường để vật liệu PBR không bị đen.
    const pmrem = new THREE.PMREMGenerator(renderer);
    scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.add(new THREE.AmbientLight(0xffffff, 0.8));
    const dir = new THREE.DirectionalLight(0xffffff, 1.5);
    dir.position.set(5, 10, 7);
    scene.add(dir);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;

    const ext = (fileName.split('.').pop() || '').toLowerCase();

    const fitCameraToObject = (object: THREE.Object3D) => {
      const box = new THREE.Box3().setFromObject(object);
      const size = box.getSize(new THREE.Vector3());
      const center = box.getCenter(new THREE.Vector3());
      object.position.sub(center); // đưa vật thể về tâm

      const maxDim = Math.max(size.x, size.y, size.z) || 1;
      const fov = camera.fov * (Math.PI / 180);
      const dist = (maxDim / 2) / Math.tan(fov / 2) * 1.6;
      camera.position.set(0, maxDim * 0.2, dist);
      camera.near = dist / 100;
      camera.far = dist * 100;
      camera.updateProjectionMatrix();
      controls.target.set(0, 0, 0);
      controls.update();
    };

    const onLoaded = (object: THREE.Object3D) => {
      if (disposed) return;
      scene.add(object);
      fitCameraToObject(object);
      setLoading(false);
    };

    const onError = (err: unknown) => {
      console.error('Lỗi tải mô hình 3D:', err);
      if (!disposed) {
        setError('Không tải được mô hình 3D. Tệp có thể bị hỏng hoặc bị chặn.');
        setLoading(false);
      }
    };

    try {
      if (ext === 'obj') {
        new OBJLoader().load(url, onLoaded, undefined, onError);
      } else if (ext === 'fbx') {
        new FBXLoader().load(url, (obj) => onLoaded(obj), undefined, onError);
      } else if (ext === 'glb' || ext === 'gltf') {
        new GLTFLoader().load(url, (gltf) => onLoaded(gltf.scene), undefined, onError);
      } else {
        setError('Định dạng 3D không được hỗ trợ.');
        setLoading(false);
      }
    } catch (err) {
      onError(err);
    }

    const animate = () => {
      frameId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const handleResize = () => {
      if (!container) return;
      const w = container.clientWidth || 600;
      const h = container.clientHeight || 400;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);

    return () => {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      controls.dispose();
      pmrem.dispose();
      renderer.dispose();
      if (renderer.domElement.parentNode) renderer.domElement.parentNode.removeChild(renderer.domElement);
      scene.traverse((obj) => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((m) => m.dispose());
        else if (mat) mat.dispose();
      });
    };
  }, [url, fileName]);

  return (
    <div className="relative w-full h-full min-h-[300px]">
      <div ref={containerRef} className="w-full h-full rounded-xl overflow-hidden" />
      {loading && !error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-slate-400 pointer-events-none">
          <Loader2 className="w-8 h-8 animate-spin text-brand" />
          <span className="text-xs font-bold">Đang tải mô hình 3D...</span>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center p-6 text-center">
          <p className="text-sm font-bold text-rose-500">{error}</p>
        </div>
      )}
      {!loading && !error && (
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-black/50 text-white text-[10px] px-3 py-1 rounded-full pointer-events-none">
          Kéo để xoay, cuộn để phóng to
        </div>
      )}
    </div>
  );
}
