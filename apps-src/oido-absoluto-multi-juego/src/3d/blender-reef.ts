import * as THREE from "three";
import dataUrl from "./assets/arrecife.json?url";
import type { FishPartData } from "./blender-fish";

// Kit de arrecife de El Océano, modelado en Blender por Claude (art/blender/arrecife/):
// 4 corales, 3 rocas, alga y anémona. Cada variante se instancia decenas de veces, así que
// todo el arrecife cuesta 9 draw calls en vez de cientos.

export type ReefPart =
  | "coral_branch" | "coral_brain" | "coral_cup" | "coral_table"
  | "rock_a" | "rock_b" | "rock_c" | "kelp" | "anemone";

export interface ReefPlacement {
  part: ReefPart;
  x: number;
  y: number;
  z: number;
  scale: number;
  rotation: number; // giro sobre Y, en radianes
}

let parts: Map<string, FishPartData> | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderReef(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Arrecife: HTTP ${response.status}`);
    const meshes = (await response.json() as { meshes: FishPartData[] }).meshes;
    parts = new Map(meshes.map((mesh) => [mesh.part, mesh]));
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderReef().catch((error: unknown) => console.error("Arrecife de Blender:", error));

export interface ReefField {
  group: THREE.Group;
  /** Mece las algas; el resto del arrecife es estático. */
  update(time: number): void;
}

/** Arma un `InstancedMesh` por variante a partir de la siembra recibida. */
export function buildReefField(placements: ReefPlacement[]): ReefField {
  if (!parts) throw new Error("El arrecife debe precargarse antes de sembrarlo.");
  const group = new THREE.Group();
  group.name = "Arrecife · Blender";
  const kelpInstances: { mesh: THREE.InstancedMesh; placements: ReefPlacement[] } = {
    mesh: undefined as unknown as THREE.InstancedMesh, placements: [],
  };

  const byPart = new Map<string, ReefPlacement[]>();
  for (const placement of placements) {
    const list = byPart.get(placement.part) ?? [];
    list.push(placement);
    byPart.set(placement.part, list);
  }

  const dummy = new THREE.Object3D();
  for (const [part, list] of byPart) {
    const data = parts.get(part);
    if (!data) continue;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(data.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(data.normal, 3));
    if (data.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(data.vertexColor, 3));
    geometry.setIndex(data.index);
    geometry.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(data.color[0], data.color[1], data.color[2]),
      vertexColors: Boolean(data.vertexColor),
      metalness: data.metalness,
      roughness: data.roughness,
      side: THREE.DoubleSide, // corales y algas son láminas: sólidos desde cualquier lado
    });

    const mesh = new THREE.InstancedMesh(geometry, material, list.length);
    mesh.name = `Arrecife · ${part}`;
    for (let i = 0; i < list.length; i++) {
      const p = list[i];
      dummy.position.set(p.x, p.y, p.z);
      dummy.rotation.set(0, p.rotation, 0);
      dummy.scale.setScalar(p.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);

    if (part === "kelp") {
      kelpInstances.mesh = mesh;
      kelpInstances.placements = list;
    }
  }

  return {
    group,
    update(time) {
      const mesh = kelpInstances.mesh;
      if (!mesh) return;
      // Cada alga se inclina con su propia fase: la corriente recorre el fondo.
      for (let i = 0; i < kelpInstances.placements.length; i++) {
        const p = kelpInstances.placements[i];
        const phase = p.x * 0.05 + p.z * 0.04;
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(Math.sin(time * 0.7 + phase) * 0.18, p.rotation, Math.cos(time * 0.55 + phase) * 0.22);
        dummy.scale.setScalar(p.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
      }
      mesh.instanceMatrix.needsUpdate = true;
    },
  };
}
