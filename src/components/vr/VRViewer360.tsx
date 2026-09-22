import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import { StereoEffect } from 'three/examples/jsm/effects/StereoEffect.js';
import { Hand, Compass, Glasses, Maximize2, Minimize2, Loader2, RotateCw, X } from 'lucide-react';

export type VRViewMode = 'drag' | 'gyro' | 'vr';

interface VRViewer360Props {
  src: string;                 // URL hoặc data URL ảnh equirectangular
  title?: string;
  initialMode?: VRViewMode;
  autoRotate?: boolean;
  showControls?: boolean;
  onClose?: () => void;
  className?: string;
}

// Trình xem ảnh 360 dựng bằng three.js: dán ảnh equirectangular lên mặt trong quả cầu.
// 3 chế độ xem: kéo chuột hoặc vuốt tay, xoay theo cảm biến điện thoại (không cần kính),
// và kính VR (WebXR nếu thiết bị hỗ trợ, nếu không thì chia đôi màn hình kiểu Cardboard
// kết hợp cảm biến).
export default function VRViewer360({ src, title, initialMode = 'drag', autoRotate = false, showControls = true, onClose, className }: VRViewer360Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mode, setMode] = useState<VRViewMode>(initialMode);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [gyroAvailable, setGyroAvailable] = useState(true);
  const [xrSupported, setXrSupported] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const rt = useRef<{
    renderer?: THREE.WebGLRenderer;
    scene?: THREE.Scene;
    camera?: THREE.PerspectiveCamera;
    stereo?: StereoEffect;
    lon: number; lat: number; fov: number;
    velLon: number; velLat: number;
    gyroQuat: THREE.Quaternion; gyroOn: boolean; gyroYawOffset: number;
    orient: { alpha: number; beta: number; gamma: number } | null;
    mode: VRViewMode;
    autoRotate: boolean;
    xrSession?: any;
  }>({ lon: 0, lat: 0, fov: 75, velLon: 0, velLat: 0, gyroQuat: new THREE.Quaternion(), gyroOn: false, gyroYawOffset: 0, orient: null, mode: initialMode, autoRotate });

  useEffect(() => { rt.current.mode = mode; }, [mode]);
  useEffect(() => { rt.current.autoRotate = autoRotate; }, [autoRotate]);

  // Dựng scene một lần cho mỗi ảnh.
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    let active = true;
    setLoading(true); setError(null);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1100);
    camera.position.set(0, 0, 0.0001);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.xr.enabled = true;
    renderer.domElement.style.width = '100%';
    renderer.domElement.style.height = '100%';
    renderer.domElement.style.display = 'block';
    renderer.domElement.style.touchAction = 'none';
    container.appendChild(renderer.domElement);
    const stereo = new StereoEffect(renderer);
    stereo.setEyeSeparation(0.064);

    const s = rt.current;
    s.renderer = renderer; s.scene = scene; s.camera = camera; s.stereo = stereo;

    const geometry = new THREE.SphereGeometry(500, 80, 50);
    geometry.scale(-1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0x111111 });
    const sphere = new THREE.Mesh(geometry, material);
    // Xoay quả cầu để kinh độ 0 (tâm ảnh) nằm đúng hướng +Z, trùng hệ trục lúc ghép ảnh.
    sphere.rotation.y = Math.PI / 2;
    scene.add(sphere);

    const loader = new THREE.TextureLoader();
    loader.setCrossOrigin('anonymous');
    loader.load(src, (tex) => {
      if (!active) { tex.dispose(); return; }
      tex.colorSpace = THREE.SRGBColorSpace;
      tex.minFilter = THREE.LinearMipmapLinearFilter;
      tex.generateMipmaps = true;
      tex.anisotropy = Math.min(8, renderer.capabilities.getMaxAnisotropy());
      material.map = tex; material.color.set(0xffffff); material.needsUpdate = true;
      setLoading(false);
    }, undefined, () => { if (active) { setError('Không tải được ảnh 360. Ảnh có thể bị chặn CORS hoặc đường dẫn hỏng.'); setLoading(false); } });

    const resize = () => {
      const w = container.clientWidth || 1, h = container.clientHeight || 1;
      camera.aspect = w / h; camera.updateProjectionMatrix();
      renderer.setSize(w, h, false);
      stereo.setSize(w, h);
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(container);

    // Cảm biến hướng thiết bị -> quaternion (thuật toán DeviceOrientationControls của three).
    const zee = new THREE.Vector3(0, 0, 1);
    const euler = new THREE.Euler();
    const q0 = new THREE.Quaternion();
    const q1 = new THREE.Quaternion(-Math.sqrt(0.5), 0, 0, Math.sqrt(0.5));
    const screenAngle = () => {
      const a = (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window as any).orientation || 0;
      return (a * Math.PI) / 180;
    };
    const onOrient = (e: DeviceOrientationEvent) => {
      if (e.alpha == null || e.beta == null || e.gamma == null) return;
      s.orient = { alpha: (e.alpha * Math.PI) / 180, beta: (e.beta * Math.PI) / 180, gamma: (e.gamma * Math.PI) / 180 };
    };
    window.addEventListener('deviceorientation', onOrient, true);
    if (!('DeviceOrientationEvent' in window)) setGyroAvailable(false);
    const xr = (navigator as any).xr;
    if (xr && xr.isSessionSupported) xr.isSessionSupported('immersive-vr').then((ok: boolean) => active && setXrSupported(!!ok)).catch(() => {});

    const tmpQ = new THREE.Quaternion();
    const yawQ = new THREE.Quaternion();
    const up = new THREE.Vector3(0, 1, 0);
    const render = () => {
      const m = s.mode;
      const useGyro = (m === 'gyro' || (m === 'vr' && !renderer.xr.isPresenting)) && s.orient;
      if (useGyro && s.orient) {
        const o = s.orient;
        euler.set(o.beta, o.alpha, -o.gamma, 'YXZ');
        tmpQ.setFromEuler(euler);
        tmpQ.multiply(q1);
        tmpQ.multiply(q0.setFromAxisAngle(zee, -screenAngle()));
        // Cho phép kéo tay để chỉnh thêm hướng ngang khi đang dùng cảm biến.
        yawQ.setFromAxisAngle(up, s.gyroYawOffset);
        camera.quaternion.copy(yawQ.multiply(tmpQ));
      } else if (!renderer.xr.isPresenting) {
        if (s.autoRotate && m === 'drag' && Math.abs(s.velLon) < 0.01) s.lon += 0.03;
        s.lon += s.velLon; s.lat += s.velLat;
        s.velLon *= 0.92; s.velLat *= 0.92;
        s.lat = Math.max(-85, Math.min(85, s.lat));
        const phi = THREE.MathUtils.degToRad(90 - s.lat);
        const theta = THREE.MathUtils.degToRad(s.lon);
        const target = new THREE.Vector3(Math.sin(phi) * Math.sin(theta), Math.cos(phi), Math.sin(phi) * Math.cos(theta));
        camera.lookAt(target);
      }
      if (camera.fov !== s.fov && !renderer.xr.isPresenting) { camera.fov = s.fov; camera.updateProjectionMatrix(); }
      if (m === 'vr' && !renderer.xr.isPresenting) stereo.render(scene, camera);
      else renderer.render(scene, camera);
    };
    renderer.setAnimationLoop(render);

    // Kéo chuột hoặc vuốt tay để xoay, cuộn hoặc chụm để thu phóng.
    const el = renderer.domElement;
    let dragging = false, lastX = 0, lastY = 0, lastT = 0, pinchDist = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    const onDown = (e: PointerEvent) => {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 1) { dragging = true; lastX = e.clientX; lastY = e.clientY; lastT = performance.now(); s.velLon = 0; s.velLat = 0; }
      else if (pointers.size === 2) { const p = Array.from(pointers.values()); pinchDist = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y); }
      el.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        const p = Array.from(pointers.values());
        const d = Math.hypot(p[0].x - p[1].x, p[0].y - p[1].y);
        if (pinchDist > 0) s.fov = Math.max(35, Math.min(110, s.fov * (pinchDist / d)));
        pinchDist = d;
        return;
      }
      if (!dragging) return;
      const dx = e.clientX - lastX, dy = e.clientY - lastY;
      const k = 0.1 * (s.fov / 75);
      if ((s.mode === 'gyro' || s.mode === 'vr') && s.orient) { s.gyroYawOffset += THREE.MathUtils.degToRad(dx * k); }
      else { s.lon += dx * k; s.lat += dy * k; }
      const now = performance.now(); const dt = Math.max(1, now - lastT);
      s.velLon = (dx * k) / dt * 16; s.velLat = (dy * k) / dt * 16;
      lastX = e.clientX; lastY = e.clientY; lastT = now;
    };
    const onUp = (e: PointerEvent) => { pointers.delete(e.pointerId); if (pointers.size === 0) dragging = false; pinchDist = 0; };
    const onWheel = (e: WheelEvent) => { e.preventDefault(); s.fov = Math.max(35, Math.min(110, s.fov + e.deltaY * 0.05)); };
    el.addEventListener('pointerdown', onDown);
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerup', onUp);
    el.addEventListener('pointercancel', onUp);
    el.addEventListener('wheel', onWheel, { passive: false });

    const onFs = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener('fullscreenchange', onFs);

    return () => {
      active = false;
      renderer.setAnimationLoop(null);
      ro.disconnect();
      window.removeEventListener('deviceorientation', onOrient, true);
      document.removeEventListener('fullscreenchange', onFs);
      el.removeEventListener('pointerdown', onDown);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerup', onUp);
      el.removeEventListener('pointercancel', onUp);
      el.removeEventListener('wheel', onWheel);
      try { s.xrSession?.end?.(); } catch { /* bỏ qua */ }
      material.map?.dispose(); material.dispose(); geometry.dispose();
      renderer.dispose(); el.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  // iOS 13+ phải xin quyền cảm biến trong một thao tác chạm của người dùng.
  const requestGyro = useCallback(async (): Promise<boolean> => {
    const DOE: any = (window as any).DeviceOrientationEvent;
    if (!DOE) { setGyroAvailable(false); return false; }
    if (typeof DOE.requestPermission === 'function') {
      try { const r = await DOE.requestPermission(); if (r !== 'granted') { setHint('Bạn chưa cho phép dùng cảm biến chuyển động.'); return false; } }
      catch { setHint('Không xin được quyền cảm biến. Hãy mở bằng Safari hoặc Chrome và cho phép chuyển động.'); return false; }
    }
    // Chờ 1 chút xem có dữ liệu cảm biến không (máy tính bàn thường không có).
    await new Promise(r => setTimeout(r, 400));
    if (!rt.current.orient) { setHint('Thiết bị này không có cảm biến xoay, đang dùng chế độ kéo tay.'); setGyroAvailable(false); return false; }
    return true;
  }, []);

  const enterFullscreen = async () => {
    const c = containerRef.current; if (!c) return;
    try { if (!document.fullscreenElement) await c.requestFullscreen(); } catch { /* bỏ qua */ }
    try { await (screen.orientation as any)?.lock?.('landscape'); } catch { /* không phải thiết bị nào cũng cho khóa xoay */ }
  };
  const exitFullscreen = async () => {
    try { if (document.fullscreenElement) await document.exitFullscreen(); } catch { /* bỏ qua */ }
    try { (screen.orientation as any)?.unlock?.(); } catch { /* bỏ qua */ }
  };

  const switchMode = async (m: VRViewMode) => {
    setHint(null);
    if (m === 'drag') {
      if (rt.current.xrSession) { try { await rt.current.xrSession.end(); } catch { /* bỏ qua */ } }
      setMode('drag'); return;
    }
    if (m === 'gyro') {
      const ok = await requestGyro();
      setMode(ok ? 'gyro' : 'drag');
      return;
    }
    // Kính VR: ưu tiên WebXR, không có thì chia đôi màn hình dùng cảm biến.
    const renderer = rt.current.renderer;
    const xr = (navigator as any).xr;
    if (xrSupported && xr && renderer) {
      try {
        const session = await xr.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
        rt.current.xrSession = session;
        session.addEventListener('end', () => { rt.current.xrSession = undefined; setMode('drag'); });
        await renderer.xr.setSession(session);
        setMode('vr');
        return;
      } catch (e) { console.warn('WebXR không khởi động được, dùng chế độ chia đôi màn hình:', e); }
    }
    const ok = await requestGyro();
    if (!ok) { setHint('Chế độ kính cần cảm biến xoay của điện thoại. Hãy mở link này trên điện thoại rồi đặt vào kính.'); }
    await enterFullscreen();
    setMode('vr');
  };

  const recenter = () => { rt.current.gyroYawOffset = 0; rt.current.lon = 0; rt.current.lat = 0; rt.current.fov = 75; };

  const btn = (active: boolean) => `inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-[11px] font-bold transition-colors ${active ? 'bg-brand text-white shadow-lg shadow-brand/30' : 'bg-black/50 text-white hover:bg-black/70'} backdrop-blur-md border border-white/10`;

  return (
    <div ref={containerRef} className={`relative w-full h-full bg-black overflow-hidden select-none ${className || ''}`}>
      {title && !isFullscreen && (
        <div className="absolute top-3 left-3 z-20 max-w-[60%] truncate rounded-full bg-black/50 px-3.5 py-1.5 text-xs font-semibold text-white backdrop-blur-md border border-white/10">{title}</div>
      )}
      {onClose && (
        <button onClick={onClose} className="absolute top-3 right-3 z-20 grid h-9 w-9 place-items-center rounded-full bg-black/50 text-white backdrop-blur-md border border-white/10 hover:bg-black/70" title="Đóng"><X className="h-5 w-5" /></button>
      )}
      {loading && !error && (
        <div className="absolute inset-0 z-10 flex flex-col items-center justify-center gap-3 text-white bg-black/70">
          <Loader2 className="h-8 w-8 animate-spin text-brand" />
          <p className="text-xs font-semibold text-slate-300">Đang tải ảnh 360...</p>
        </div>
      )}
      {error && (
        <div className="absolute inset-0 z-10 flex items-center justify-center p-6 text-center text-sm font-semibold text-rose-300 bg-black/80">{error}</div>
      )}
      {mode === 'vr' && !rt.current.xrSession && (
        <div className="pointer-events-none absolute inset-y-0 left-1/2 z-10 w-px bg-white/30" />
      )}
      {hint && (
        <div className="absolute left-1/2 top-14 z-20 -translate-x-1/2 max-w-[90%] rounded-xl bg-amber-500/90 px-3 py-2 text-[11px] font-semibold text-white shadow-lg">{hint}</div>
      )}
      {showControls && (
        <div className="absolute bottom-3 left-1/2 z-20 flex -translate-x-1/2 flex-wrap items-center justify-center gap-2 px-3">
          <button onClick={() => switchMode('drag')} className={btn(mode === 'drag')} title="Kéo chuột hoặc vuốt để xoay"><Hand className="h-4 w-4" /> Kéo xoay</button>
          {gyroAvailable && <button onClick={() => switchMode('gyro')} className={btn(mode === 'gyro')} title="Xoay điện thoại để nhìn quanh, không cần kính"><Compass className="h-4 w-4" /> Cảm biến</button>}
          <button onClick={() => switchMode('vr')} className={btn(mode === 'vr')} title="Xem bằng kính VR hoặc Cardboard"><Glasses className="h-4 w-4" /> Kính VR</button>
          <button onClick={recenter} className={btn(false)} title="Đưa về hướng ban đầu"><RotateCw className="h-4 w-4" /></button>
          <button onClick={() => (isFullscreen ? exitFullscreen() : enterFullscreen())} className={btn(false)} title={isFullscreen ? 'Thoát toàn màn hình' : 'Toàn màn hình'}>{isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}</button>
        </div>
      )}
    </div>
  );
}
