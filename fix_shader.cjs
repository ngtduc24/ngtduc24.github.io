const fs = require('fs');
let code = fs.readFileSync('src/components/ARScanner.tsx', 'utf8');

const shaderRegistration = `
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
`;

code = code.replace("    let contentHtml = '';", shaderRegistration + "\\n    let contentHtml = '';");
fs.writeFileSync('src/components/ARScanner.tsx', code);
