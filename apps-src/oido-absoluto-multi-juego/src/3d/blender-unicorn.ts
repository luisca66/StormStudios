import * as THREE from "three";
import dataUrl from "./assets/unicornio.json?url";
import type { FishPartData } from "./blender-fish";

// Unicornio-pegaso de Las Nubes, modelado en Blender por Claude (art/blender/unicornio/).
// Cascos en y = 0, hocico hacia +Z. Partes con pivote propio: leg 0–3, wing 0–1 (izq., der.),
// mane 0–5, tail 0–4; fijas: body, horn (emisivo) y eyes. player.ts anima las móviles.

interface UnicornPartData extends FishPartData {
  emission: number;
  emissionColor: [number, number, number];
}

export interface BlenderUnicorn {
  root: THREE.Group;
  legs: THREE.Object3D[];
  wingL: THREE.Object3D;
  wingR: THREE.Object3D;
  mane: THREE.Object3D[];
  tail: THREE.Object3D[];
  /** Punta del cuerno en coordenadas del modelo: ahí va el destello. */
  hornTip: THREE.Vector3;
}

let data: { meshes: UnicornPartData[]; hornTip: [number, number, number] } | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderUnicorn(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Unicornio: HTTP ${response.status}`);
    data = await response.json();
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderUnicorn().catch((error: unknown) => console.error("Unicornio de Blender:", error));

export function isUnicornReady(): boolean {
  return data !== undefined;
}

export function buildBlenderUnicorn(): BlenderUnicorn {
  if (!data) throw new Error("El unicornio debe precargarse antes de armarlo.");
  const root = new THREE.Group();
  root.name = "Unicornio · Blender";
  const legs: THREE.Object3D[] = [];
  const wings: THREE.Object3D[] = [];
  const mane: THREE.Object3D[] = [];
  const tail: THREE.Object3D[] = [];

  for (const part of data.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const isHorn = part.part === "horn";
    // Pelaje y plumas con luz propia perla: la cámara mira desde atrás, del lado de la sombra,
    // y sin esto el unicornio blanco se lee gris.
    const pearl = part.part === "body" || part.part === "leg" || part.part === "wing";
    const material = new THREE.MeshStandardMaterial({
      vertexColors: Boolean(part.vertexColor),
      roughness: part.roughness,
      metalness: part.metalness,
      emissive: isHorn ? new THREE.Color(1.0, 0.7, 0.0) : pearl ? new THREE.Color(0.95, 0.92, 1.0) : 0x000000,
      emissiveIntensity: isHorn ? 0.4 : pearl ? 0.3 : 0,
      // Las plumas son láminas finas: se ven desde arriba y desde abajo al aletear.
      side: part.part === "wing" ? THREE.DoubleSide : THREE.FrontSide,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    mesh.castShadow = true;
    root.add(mesh);

    const i = part.segment ?? 0;
    if (part.part === "leg") legs[i] = mesh;
    else if (part.part === "wing") wings[i] = mesh;
    else if (part.part === "mane") mane[i] = mesh;
    else if (part.part === "tail") tail[i] = mesh;
  }

  return {
    root, legs, mane, tail,
    wingL: wings[0],
    wingR: wings[1],
    hornTip: new THREE.Vector3().fromArray(data.hornTip),
  };
}
