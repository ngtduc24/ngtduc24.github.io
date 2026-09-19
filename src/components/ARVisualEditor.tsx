import React, { useRef, useState, useEffect } from 'react';
import { Canvas } from '@react-three/fiber';
import { TransformControls, useTexture, useGLTF, OrbitControls } from '@react-three/drei';
import * as THREE from 'three';

interface ARVisualEditorProps {
  targetImage: string;
  contentUrl: string;
  contentType: 'image' | 'video' | 'gif' | '3d';
  posX: number;
  posY: number;
  posZ: number;
  scale: number;
  rotation: number;
  onPositionChange: (x: number, y: number, z: number) => void;
  onScaleChange: (scale: number) => void;
  onRotationChange: (rotation: number) => void;
}

const TargetPlane = ({ url }: { url: string }) => {
  const texture = useTexture(url);
  const aspect = texture.image ? (texture.image as any).width / (texture.image as any).height : 1;
  
  return (
    <mesh position={[0, 0, 0]}>
      <planeGeometry args={[aspect, 1]} />
      <meshBasicMaterial map={texture} transparent={true} opacity={0.5} side={THREE.DoubleSide} />
    </mesh>
  );
};

const ContentMesh = ({ url, type }: { url: string; type: string }) => {
  if (type === '3d') {
    return <Model url={url} />;
  } else if (type === 'video') {
    return <VideoMesh url={url} />;
  } else {
    return <ImageMesh url={url} />;
  }
};

const Model = ({ url }: { url: string }) => {
  const { scene } = useGLTF(url);
  return <primitive object={scene} />;
};

const VideoMesh = ({ url }: { url: string }) => {
  const [video] = useState(() => {
    const vid = document.createElement('video');
    vid.src = url;
    vid.crossOrigin = 'Anonymous';
    vid.loop = true;
    vid.muted = true;
    vid.play();
    return vid;
  });
  
  return (
    <mesh>
      <planeGeometry args={[1, 1]} />
      <meshBasicMaterial side={THREE.DoubleSide}>
        <videoTexture attach="map" args={[video]} />
      </meshBasicMaterial>
    </mesh>
  );
};

const ImageMesh = ({ url }: { url: string }) => {
  const texture = useTexture(url);
  const aspect = texture.image ? (texture.image as any).width / (texture.image as any).height : 1;
  return (
    <mesh>
      <planeGeometry args={[aspect, 1]} />
      <meshBasicMaterial map={texture} transparent side={THREE.DoubleSide} />
    </mesh>
  );
};

export default function ARVisualEditor({
  targetImage,
  contentUrl,
  contentType,
  posX, posY, posZ,
  scale,
  rotation,
  onPositionChange,
  onScaleChange,
  onRotationChange
}: ARVisualEditorProps) {
  const [mode, setMode] = useState<'translate' | 'rotate' | 'scale'>('translate');
  const groupRef = useRef<THREE.Group>(null);
  
  useEffect(() => {
    if (groupRef.current) {
      groupRef.current.position.set(posX, posY, posZ);
      groupRef.current.scale.set(scale, scale, scale);
      groupRef.current.rotation.set(rotation * (Math.PI / 180), 0, 0);
    }
  }, [posX, posY, posZ, scale, rotation]); // Update when props change (like manual input)

  const handleChange = () => {
    if (groupRef.current) {
      const p = groupRef.current.position;
      const s = groupRef.current.scale;
      const r = groupRef.current.rotation;
      
      onPositionChange(parseFloat(p.x.toFixed(3)), parseFloat(p.y.toFixed(3)), parseFloat(p.z.toFixed(3)));
      onScaleChange(parseFloat(s.x.toFixed(3)));
      onRotationChange(parseFloat((r.x * (180 / Math.PI)).toFixed(3)));
    }
  };

  if (!targetImage || !contentUrl) return null;

  return (
    <div className="w-full h-[500px] bg-slate-950 rounded-2xl overflow-hidden relative shadow-inner border border-slate-800">
      <div className="absolute top-4 left-4 z-10 flex gap-2">
        <button 
          onClick={(e) => { e.preventDefault(); setMode('translate'); }}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${mode === 'translate' ? 'bg-brand text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          Di chuyển
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); setMode('rotate'); }}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${mode === 'rotate' ? 'bg-brand text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          Xoay (Trục X)
        </button>
        <button 
          onClick={(e) => { e.preventDefault(); setMode('scale'); }}
          className={`px-3 py-2 rounded-xl text-xs font-semibold transition-all ${mode === 'scale' ? 'bg-brand text-white shadow-lg' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'}`}
        >
          Thu phóng
        </button>
      </div>
      <div className="absolute bottom-4 left-4 z-10 text-white/50 text-xs font-medium">
        Cuộn chuột: Phóng to/Thu nhỏ | Kéo thả nền: Xoay Camera | Kéo trục: Chỉnh AR
      </div>
      <Canvas camera={{ position: [0, 0, 3], fov: 50 }}>
        <ambientLight intensity={0.7} />
        <directionalLight position={[10, 10, 10]} intensity={1.5} />
        <OrbitControls makeDefault />
        
        <React.Suspense fallback={null}>
          <TargetPlane url={targetImage} />

          <TransformControls 
            mode={mode} 
            showX={true} 
            showY={mode !== 'rotate'} 
            showZ={mode !== 'rotate'} 
            onObjectChange={handleChange}
          >
            <group 
              ref={groupRef} 
              position={[posX, posY, posZ]} 
              scale={[scale, scale, scale]} 
              rotation={[rotation * (Math.PI / 180), 0, 0]}
            >
              <ContentMesh url={contentUrl} type={contentType} />
            </group>
          </TransformControls>
        </React.Suspense>
      </Canvas>
    </div>
  );
}
