// Barco hundido de la zona 1, sobre su repisa de roca (art/blender/barco-hundido/).
// Modelado por Astra (v1–v3) y retocado por Claude (v4). Origen = punto de apoyo del casco
// en la repisa; −Z mira al centro del pozo y +Z a la pared.
// Partes: ledge, hull, debris, growth (fijas) y lamp (farol de proa que late).

import * as THREE from "three";
import dataUrl from "./assets/barco-hundido.json?url";

interface ShipPartData {
  name: string;
  part: string;
  pivot: [number, number, number];
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  color: [number, number, number];
  metalness: number;
  roughness: number;
  emission: number;
  emissionColor: [number, number, number];
}

interface ShipData {
  meshes: ShipPartData[];
  bubbleVents: [number, number, number][];
  lampCenter: [number, number, number];
}

export interface BlenderShipwreck {
  root: THREE.Group;
  /** Puntos de salida de aire, en coordenadas del modelo. */
  bubbleVents: THREE.Vector3[];
  update(elapsed: number): void;
}

let data: ShipData | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderShipwreck(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Barco hundido: HTTP ${response.status}`);
    data = await response.json() as ShipData;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

export function buildBlenderShipwreck(): BlenderShipwreck {
  if (!data) throw new Error("El barco hundido debe precargarse antes de armarlo.");
  const root = new THREE.Group();
  root.name = "Barco hundido · Blender";
  let lampMaterial: THREE.MeshStandardMaterial | undefined;

  for (const part of data.meshes) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      emissive: part.emission > 0
        ? new THREE.Color().setRGB(part.emissionColor[0], part.emissionColor[1], part.emissionColor[2])
        : 0x000000,
      emissiveIntensity: part.emission,
    });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    root.add(mesh);
    if (part.part === "lamp") lampMaterial = material;
  }

  // Luz débil del farol: invita a acercarse sin iluminar la escena.
  const glow = new THREE.PointLight(0x9fe8ff, 0.9, 14, 2);
  glow.position.fromArray(data.lampCenter);
  root.add(glow);

  return {
    root,
    bubbleVents: data.bubbleVents.map((p) => new THREE.Vector3().fromArray(p)),
    update(elapsed) {
      // ENTREGA.md: 1.2 ± 0.15 con un ciclo de ~16 s.
      const pulse = Math.sin(elapsed * Math.PI * 2 * 0.06);
      if (lampMaterial) lampMaterial.emissiveIntensity = 1.2 + 0.15 * pulse;
      glow.intensity = 0.9 + 0.2 * pulse;
    },
  };
}
