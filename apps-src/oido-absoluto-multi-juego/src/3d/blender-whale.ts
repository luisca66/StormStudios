import * as THREE from "three";
import dataUrl from "./assets/ballena.json?url";
import type { FishPartData } from "./blender-fish";

// Ballena jorobada de El Océano, modelada en Blender por Astra (art/blender/ballena/).
// Cabeza a +Z, 39.7 u de largo. Partes: body, tail, flipper ×2, jaw.

export interface BlenderWhale {
  root: THREE.Group;
  /** Punto del espiráculo en coordenadas del modelo: de ahí salen las burbujas. */
  blowhole: THREE.Vector3;
  /** Anima cola, pectorales y mandíbula. */
  update(delta: number, time: number): void;
}

let parts: FishPartData[] | undefined;
let blowhole: [number, number, number] = [0, 3.7, 8.2];
let pending: Promise<void> | undefined;

export function preloadBlenderWhale(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Ballena: HTTP ${response.status}`);
    const data = await response.json() as { meshes: FishPartData[]; blowhole?: [number, number, number] };
    parts = data.meshes;
    if (data.blowhole) blowhole = data.blowhole;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderWhale().catch((error: unknown) => console.error("Ballena de Blender:", error));

export function buildBlenderWhale(): BlenderWhale {
  if (!parts) throw new Error("La ballena debe precargarse antes de armarla.");
  const root = new THREE.Group();
  root.name = "Ballena jorobada · Blender";

  let tail: THREE.Object3D | undefined;
  let jaw: THREE.Object3D | undefined;
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
      // Las pectorales y la cola son láminas finas: se ven por ambas caras al batir.
      side: part.part === "body" ? THREE.FrontSide : THREE.DoubleSide,
    }));
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    mesh.castShadow = true;
    root.add(mesh);

    if (part.part === "tail") tail = mesh;
    else if (part.part === "jaw") jaw = mesh;
    else if (part.part === "flipper") flippers[part.segment ?? flippers.length] = mesh;
  }

  // La mandíbula abre de tarde en tarde, no en bucle: es un gesto, no un tic.
  let jawPhase: "cerrada" | "abriendo" | "abierta" | "cerrando" = "cerrada";
  let jawTimer = 6 + Math.random() * 10;
  let jawOpen = 0;

  return {
    root,
    blowhole: new THREE.Vector3().fromArray(blowhole),
    update(delta, time) {
      // Valores de ENTREGA.md de Astra.
      if (tail) tail.rotation.x = Math.sin(time * 4.0) * 0.2;
      if (flippers[0]) flippers[0].rotation.x = Math.sin(time * 1.5) * 0.1;
      if (flippers[1]) flippers[1].rotation.x = Math.sin(time * 1.5 + 0.4) * 0.1;

      if (jaw) {
        jawTimer -= delta;
        if (jawPhase === "cerrada" && jawTimer <= 0) jawPhase = "abriendo";
        if (jawPhase === "abriendo") {
          jawOpen = Math.min(1, jawOpen + delta * 0.6);
          if (jawOpen >= 1) { jawPhase = "abierta"; jawTimer = 1; } // pausa de 1 s
        } else if (jawPhase === "abierta" && jawTimer <= 0) {
          jawPhase = "cerrando";
        } else if (jawPhase === "cerrando") {
          jawOpen = Math.max(0, jawOpen - delta * 0.6);
          if (jawOpen <= 0) { jawPhase = "cerrada"; jawTimer = 12 + Math.random() * 8; }
        }
        jaw.rotation.x = jawOpen * 0.25;
      }
    },
  };
}
