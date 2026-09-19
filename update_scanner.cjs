const fs = require('fs');
let code = fs.readFileSync('src/components/ARScanner.tsx', 'utf8');

// Inject new states
code = code.replace(
  `  const [muted, setMuted] = useState(true);`,
  `  const [muted, setMuted] = useState(true);
  const [targetVisible, setTargetVisible] = useState(false);`
);

// Inject button UI
code = code.replace(
  `      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
        style={{ opacity: loading || error ? 0 : 1 }}
      />
    </div>`,
  `      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
        style={{ opacity: loading || error ? 0 : 1 }}
      />
      
      {targetVisible && target.button_label && target.button_url && (
        <div className="absolute bottom-10 inset-x-0 flex justify-center z-[70] px-4 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <a
            href={target.button_url}
            target="_blank"
            rel="noopener noreferrer"
            className="px-8 py-3.5 bg-brand text-white font-bold rounded-full shadow-2xl hover:scale-105 active:scale-95 transition-all text-sm flex items-center gap-2 border border-white/20 backdrop-blur-sm"
          >
            {target.button_label}
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
          </a>
        </div>
      )}
    </div>`
);

// Modify A-Frame setup
code = code.replace(
  `    let contentHtml = '';
    if (target.content_type === 'video') {`,
  `    let contentHtml = '';
    
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
                  vertexShader: \`
                    varying vec2 vUv;
                    void main() {
                      vUv = uv;
                      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
                    }
                  \`,
                  fragmentShader: \`
                    uniform vec3 color;
                    uniform sampler2D texture;
                    varying vec2 vUv;
                    void main() {
                      vec4 tColor = texture2D(texture, vUv);
                      float distance = length(tColor.rgb - color);
                      float a = (distance < 0.4) ? 0.0 : 1.0;
                      gl_FragColor = vec4(tColor.rgb, tColor.a * a);
                    }
                  \`,
                  transparent: true,
                  side: (window as any).THREE.DoubleSide
                });
              }
            });
          }
        });
      }
    }

    if (target.content_type === 'video') {`
);

// Modify video HTML
const loopStr = `loop="\${target.loop_video !== false ? 'true' : 'false'}"`;
const autoPlayStr = `autoplay="\${target.auto_play_video !== false ? 'true' : 'false'}"`;

code = code.replace(
  `          <video id="ar-video" src="\${contentUrl}" crossorigin="anonymous" loop="true" muted playsinline webkit-playsinline preload="auto"></video>
        </a-assets>
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          <a-video src="#ar-video" position="\${positionStr}" scale="\${scale} \${scale} \${scale}" rotation="\${rotationX} 0 0"></a-video>
        </a-entity>`,
  `          <video id="ar-video" src="\${contentUrl}" crossorigin="anonymous" \${target.loop_video !== false ? 'loop="true"' : ''} muted playsinline webkit-playsinline preload="auto"></video>
        </a-assets>
        <a-camera position="0 0 0" look-controls="enabled: false"></a-camera>
        <a-entity mindar-image-target="targetIndex: 0">
          \${target.is_transparent_video 
            ? \`<a-plane src="#ar-video" chromakey-material="color: \${target.chroma_key_color || '#00ff00'}" position="\${positionStr}" scale="\${scale} \${scale} \${scale}" rotation="\${rotationX} 0 0"></a-plane>\`
            : \`<a-video src="#ar-video" position="\${positionStr}" scale="\${scale} \${scale} \${scale}" rotation="\${rotationX} 0 0"></a-video>\`
          }
        </a-entity>`
);

// Modify onFound and onLost
code = code.replace(
  `    let onFound: (() => void) | null = null;
    let onLost: (() => void) | null = null;
    let targetEntity: Element | null = null;

    if (target.content_type === 'video') {
      targetEntity = container.querySelector('[mindar-image-target]');
      const videoEl = container.querySelector('#ar-video') as HTMLVideoElement | null;
      if (targetEntity && videoEl) {
        videoEl.muted = true;
        onFound = () => {
          videoEl.play().catch((e) => console.warn('Không tự phát được video AR:', e));
        };
        onLost = () => { videoEl.pause(); };
        targetEntity.addEventListener('targetFound', onFound);
        targetEntity.addEventListener('targetLost', onLost);
      }
    }`,
  `    let onFound: (() => void) | null = null;
    let onLost: (() => void) | null = null;
    const targetEntity = container.querySelector('[mindar-image-target]');
    const videoEl = container.querySelector('#ar-video') as HTMLVideoElement | null;

    if (targetEntity) {
      if (videoEl) {
        videoEl.muted = true;
      }
      onFound = () => {
        setTargetVisible(true);
        if (videoEl && target.auto_play_video !== false) {
          videoEl.play().catch((e) => console.warn('Không tự phát được video AR:', e));
        }
      };
      onLost = () => {
        setTargetVisible(false);
        if (videoEl) {
          videoEl.pause();
        }
      };
      targetEntity.addEventListener('targetFound', onFound);
      targetEntity.addEventListener('targetLost', onLost);
    }`
);

fs.writeFileSync('src/components/ARScanner.tsx', code);
