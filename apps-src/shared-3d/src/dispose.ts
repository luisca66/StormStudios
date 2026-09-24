import * as THREE from "three";

/**
 * Libera materiales (y sus texturas) de un árbol al retirarlo de la escena.
 * Las geometrías de un modelo cargado se comparten entre ejemplares y viven en la caché de
 * `loadModel`: solo se liberan si se pide con `geometries: true`.
 */
export function disposeObject(root: THREE.Object3D, options: { geometries?: boolean } = {}): void {
  root.traverse((node) => {
    const mesh = node as THREE.Mesh;
    if (!mesh.isMesh) return;
    if (options.geometries) mesh.geometry.dispose();
    const materials = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
    for (const material of materials) {
      for (const value of Object.values(material)) if (value instanceof THREE.Texture) value.dispose();
      material.dispose();
    }
  });
}
