import * as THREE from "three";
import dataUrl from "./assets/tortuga.json?url";
import type { FishPartData } from "./blender-fish";

// Tortuga marina de El Océano, modelada en Blender por Astra (art/blender/tortuga/).
// Cabeza a +Z, 4 u de largo. Partes: body, head, flipper ×4 (0 y 1 delanteras, 2 y 3 traseras).

export interface BlenderTurtle {
  root: THREE.Group;
  /** Rema con las delanteras, timonea con las traseras y pasea la mirada. */
  update(time: number, phase: number): void;
}

let parts: FishPartData[] | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderTurtle(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Tortuga: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: FishPartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderTurtle().catch((error: unknown) => console.error("Tortuga de Blender:", error));

export function buildBlenderTurtle(): BlenderTurtle {
  if (!parts) throw new Error("La tortuga debe precargarse antes de armarla.");
  const root = new THREE.Group();
  root.name = "Tortuga marina · Blender";

  let head: THREE.Object3D | undefined;
  const flippers: THREE.Object3D[] = [];

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      // Las aletas son láminas finas: se ven por las dos caras al remar.
      side: part.part === "flipper" ? THREE.DoubleSide : THREE.FrontSide,
    }));
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    mesh.castShadow = true;
    root.add(mesh);

    if (part.part === "head") head = mesh;
    else if (part.part === "flipper") flippers[part.segment ?? flippers.length] = mesh;
  }

  return {
    root,
    // `phase` separa a las tortugas entre sí: ninguna rema al mismo compás.
    update(time, phase) {
      const stroke = time * 1.6 + phase;
      // Delanteras: remada tipo vuelo, las dos en fase (valores de ENTREGA.md).
      if (flippers[0]) flippers[0].rotation.z = Math.sin(stroke) * 0.5;
      if (flippers[1]) flippers[1].rotation.z = -Math.sin(stroke) * 0.5;
      // Traseras: timón, más lentas y suaves.
      if (flippers[2]) flippers[2].rotation.z = Math.sin(time * 0.8 + phase) * 0.15;
      if (flippers[3]) flippers[3].rotation.z = -Math.sin(time * 0.8 + phase) * 0.15;
      if (head) {
        head.rotation.x = Math.sin(time * 0.45 + phase) * 0.12;
        head.rotation.y = Math.sin(time * 0.30 + phase * 1.7) * 0.25;
      }
    },
  };
}
