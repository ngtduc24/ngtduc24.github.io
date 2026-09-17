import * as THREE from 'three';
import { PBRMaterialConfig } from '../types';

export const DEFAULT_PBR_MATERIAL: PBRMaterialConfig = {
  baseColor: '#ffffff',
  roughness: 0.4,
  metalness: 0.1,
  specular: 0.5,
  normalScale: 1.0,
  displacementScale: 0.05,
  aoMapIntensity: 1.0,
  emissive: '#000000',
  emissiveIntensity: 1.0,
  opacity: 1.0,
  transmission: 0.0,
  ior: 1.5,
};

const textureCache = new Map<string, THREE.Texture>();
const textureLoader = new THREE.TextureLoader();
textureLoader.setCrossOrigin('anonymous');

export function loadTextureCached(url: string, isColor = false): Promise<THREE.Texture> {
  if (textureCache.has(url)) {
    return Promise.resolve(textureCache.get(url)!);
  }
  return new Promise((resolve, reject) => {
    textureLoader.load(
      url,
      (tex) => {
        if (isColor) {
          tex.colorSpace = THREE.SRGBColorSpace;
        }
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        textureCache.set(url, tex);
        resolve(tex);
      },
      undefined,
      (err) => {
        console.warn(`Lỗi nạp texture [${url}]:`, err);
        reject(err);
      }
    );
  });
}

/**
 * Traverses an Object3D and updates all Mesh child materials with PBR properties.
 */
export async function applyPBRMaterialToObject(
  root: THREE.Object3D,
  config: PBRMaterialConfig
) {
  if (!root) return;

  const promises: Promise<void>[] = [];

  root.traverse((child) => {
    if ((child as THREE.Mesh).isMesh) {
      const mesh = child as THREE.Mesh;
      
      // Ensure material is MeshPhysicalMaterial
      let mat: THREE.MeshPhysicalMaterial;
      if (mesh.material instanceof THREE.MeshPhysicalMaterial) {
        mat = mesh.material;
      } else {
        const oldMat = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
        mat = new THREE.MeshPhysicalMaterial();
        if (oldMat) {
          mat.copy(oldMat as THREE.Material);
        }
        mesh.material = mat;
      }

      // 1. Base Color (Albedo / Diffuse)
      if (config.baseColor) {
        mat.color.set(config.baseColor);
      }

      if (config.baseColorMap) {
        promises.push(
          loadTextureCached(config.baseColorMap, true).then((tex) => {
            mat.map = tex;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.baseColorMap === '') {
        mat.map = null;
        mat.needsUpdate = true;
      }

      // 2. Roughness (Độ nhám)
      if (typeof config.roughness === 'number') {
        mat.roughness = config.roughness;
      }
      if (config.roughnessMap) {
        promises.push(
          loadTextureCached(config.roughnessMap).then((tex) => {
            mat.roughnessMap = tex;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.roughnessMap === '') {
        mat.roughnessMap = null;
      }

      // 3. Metallic (Độ kim loại)
      if (typeof config.metalness === 'number') {
        mat.metalness = config.metalness;
      }
      if (config.metalnessMap) {
        promises.push(
          loadTextureCached(config.metalnessMap).then((tex) => {
            mat.metalnessMap = tex;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.metalnessMap === '') {
        mat.metalnessMap = null;
      }

      // 4. Specular
      if (typeof config.specular === 'number') {
        mat.specularIntensity = config.specular;
      }
      if (config.specularMap) {
        promises.push(
          loadTextureCached(config.specularMap).then((tex) => {
            mat.specularIntensityMap = tex;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.specularMap === '') {
        mat.specularIntensityMap = null;
      }

      // 5. Normal Map / Bump Map
      if (typeof config.normalScale === 'number') {
        mat.normalScale.set(config.normalScale, config.normalScale);
      }
      if (config.normalMap) {
        promises.push(
          loadTextureCached(config.normalMap).then((tex) => {
            mat.normalMap = tex;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.normalMap === '') {
        mat.normalMap = null;
      }

      // 6. Displacement (Height Map)
      if (typeof config.displacementScale === 'number') {
        mat.displacementScale = config.displacementScale;
      }
      if (config.displacementMap) {
        promises.push(
          loadTextureCached(config.displacementMap).then((tex) => {
            mat.displacementMap = tex;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.displacementMap === '') {
        mat.displacementMap = null;
      }

      // 7. Ambient Occlusion (AO)
      if (typeof config.aoMapIntensity === 'number') {
        mat.aoMapIntensity = config.aoMapIntensity;
      }
      if (config.aoMap) {
        promises.push(
          loadTextureCached(config.aoMap).then((tex) => {
            mat.aoMap = tex;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.aoMap === '') {
        mat.aoMap = null;
      }

      // 8. Emission (Emissive)
      if (config.emissive) {
        mat.emissive.set(config.emissive);
      }
      if (typeof config.emissiveIntensity === 'number') {
        mat.emissiveIntensity = config.emissiveIntensity;
      }
      if (config.emissiveMap) {
        promises.push(
          loadTextureCached(config.emissiveMap, true).then((tex) => {
            mat.emissiveMap = tex;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.emissiveMap === '') {
        mat.emissiveMap = null;
      }

      // 9. Opacity (Alpha)
      const opacityVal = typeof config.opacity === 'number' ? config.opacity : 1.0;
      mat.opacity = opacityVal;
      if (config.alphaMap) {
        promises.push(
          loadTextureCached(config.alphaMap).then((tex) => {
            mat.alphaMap = tex;
            mat.transparent = true;
            mat.needsUpdate = true;
          }).catch(() => {})
        );
      } else if (config.alphaMap === '') {
        mat.alphaMap = null;
      }

      // 10. Transmission (Độ truyền sáng / Thủy tinh)
      if (typeof config.transmission === 'number') {
        mat.transmission = config.transmission;
      }

      // 11. IOR (Index of Refraction - Chiết suất khúc xạ)
      if (typeof config.ior === 'number') {
        mat.ior = config.ior;
      }

      // Set transparency flag
      mat.transparent = (
        opacityVal < 0.99 ||
        !!config.alphaMap ||
        (typeof config.transmission === 'number' && config.transmission > 0.01)
      );

      mat.needsUpdate = true;
    }
  });

  await Promise.all(promises);
}
