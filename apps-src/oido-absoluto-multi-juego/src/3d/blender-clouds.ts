import * as THREE from "three";
import dataUrl from "./assets/nubes.json?url";
import type { FishPartData } from "./blender-fish";

// Kit de nubes de Las Nubes, modelado en Blender por Claude (art/blender/nubes/):
// cúmulo chico, mediano, grande y alargado. Cada variante es un InstancedMesh teñido por
// ejemplar, así que las ~110 nubes del cielo cuestan 4 draw calls en vez de ~540.
// El pigmento de vértice ya trae la luz propia (cima blanca, panza lavanda).

export type CloudPart = "puff_small" | "puff_medium" | "puff_large" | "flat_long";

export interface CloudPlacement {
  part: CloudPart;
  position: THREE.Vector3;
  scale: number;
  rotation: number;
  tint: THREE.Color;
  /** Deriva: fase y velocidad propias. */
  off: number;
  spd: number;
}

let parts: Map<string, FishPartData> | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderClouds(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Nubes: HTTP ${response.status}`);
    const meshes = (await response.json() as { meshes: FishPartData[] }).meshes;
    parts = new Map(meshes.map((mesh) => [mesh.part, mesh]));
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderClouds().catch((error: unknown) => console.error("Nubes de Blender:", error));

export interface CloudField {
  group: THREE.Group;
  /** Deriva lenta de cada nube alrededor de su punto base. */
  update(time: number): void;
}

export function buildCloudField(placements: CloudPlacement[]): CloudField {
  if (!parts) throw new Error("Las nubes deben precargarse antes de sembrarlas.");
  const group = new THREE.Group();
  group.name = "Nubes · Blender";
  const batches: { mesh: THREE.InstancedMesh; list: CloudPlacement[] }[] = [];

  const byPart = new Map<string, CloudPlacement[]>();
  for (const p of placements) {
    const list = byPart.get(p.part) ?? [];
    list.push(p);
    byPart.set(p.part, list);
  }

  for (const [part, list] of byPart) {
    const data = parts.get(part);
    if (!data) continue;
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(data.normal, 3));
    if (data.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(data.vertexColor, 3));
    geometry.setIndex(data.index);
    geometry.computeBoundingSphere();

    // Lambert: sin brillo especular, la nube es mate. Un toque emisivo la mantiene luminosa
    // del lado de la sombra, como el prototipo (que se veía gris sin él).
    const material = new THREE.MeshLambertMaterial({
      vertexColors: Boolean(data.vertexColor),
      emissive: new THREE.Color(0.56, 0.55, 0.62),
    });
    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.name = `Nubes · ${part}`;
    // Las nubes derivan: el bounding de la geometría base no cubre a todas las instancias.
    mesh.frustumCulled = false;
    for (let i = 0; i < list.length; i++) mesh.setColorAt(i, list[i].tint);
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    group.add(mesh);
    batches.push({ mesh, list });
  }

  const dummy = new THREE.Object3D();
  const place = (time: number) => {
    for (const { mesh, list } of batches) {
      for (let i = 0; i < list.length; i++) {
        const p = list[i];
        // Misma deriva que el prototipo: vaivén lento en X/Z y respiración en Y.
        dummy.position.set(
          p.position.x + Math.sin(time * p.spd * 0.12 + p.off) * 4.0,
          p.position.y + Math.sin(time * p.spd * 0.25 + p.off * 1.3) * 1.0,
          p.position.z + Math.cos(time * p.spd * 0.09 + p.off * 0.8) * 4.0,
        );
        dummy.rotation.set(0, p.rotation, 0);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    }
  };
  place(0);

  return { group, update: place };
}
