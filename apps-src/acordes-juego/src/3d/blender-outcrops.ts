// Kit de salientes de roca de la pared del pozo (art/blender/salientes-roca/).
// Pieza 6 del entorno, hecha por Claude con bpy. Tres piezas (shelf, spur, boulder) que el juego
// instancia por toda la pared para que no se lea como un cilindro liso. Sin emisión ni animación:
// es roca muerta, y su trabajo es dar relieve y escala.

import * as THREE from "three";
import dataUrl from "./assets/salientes-roca.json?url";

export type OutcropPart = "shelf" | "spur" | "boulder";

interface OutcropPartData {
  name: string;
  part: OutcropPart;
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  color: [number, number, number];
  metalness: number;
  roughness: number;
}

interface OutcropData { meshes: OutcropPartData[] }

export interface OutcropPlacement {
  part: OutcropPart;
  position: THREE.Vector3;
  /** Giro alrededor del eje del pozo; deja el +Z de la pieza contra la pared. */
  rotationY: number;
  tilt: number;
  scale: number;
}

let data: OutcropData | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderOutcrops(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Salientes de roca: HTTP ${response.status}`);
    data = await response.json() as OutcropData;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

export function buildBlenderOutcrops(placements: OutcropPlacement[]): THREE.Group {
  if (!data) throw new Error("Los salientes deben precargarse antes de armarlos.");
  const group = new THREE.Group();
  group.name = "Salientes de roca · Blender";
  const dummy = new THREE.Object3D();

  for (const part of data.meshes) {
    const mine = placements.filter((p) => p.part === part.part);
    if (!mine.length) continue;
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
    });
    const mesh = new THREE.InstancedMesh(geometry, material, mine.length);
    mesh.name = `Saliente ${part.part}`;
    mine.forEach((spot, i) => {
      dummy.position.copy(spot.position);
      dummy.rotation.set(0, spot.rotationY, 0);
      dummy.rotateX(spot.tilt);
      dummy.scale.setScalar(spot.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    group.add(mesh);
  }
  return group;
}
