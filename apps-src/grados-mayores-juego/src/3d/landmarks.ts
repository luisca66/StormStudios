// landmarks.ts — Landmarks de los biomas modelados en Blender (art/blender/modelar-landmarks.py).
//
// Torre de agua y molino (Valle), viaducto, río de barranca, montaña del túnel y cascada
// (Sierra), carreta abandonada (Desierto), faro (Costa) y estanque con observatorio
// (Páramo). El color va horneado en vertex colors; la geometría se comparte entre todas
// las apariciones y NO se dispone con los chunks (no lleva `userData.ownedGeometry`).

import * as THREE from "three";
import landmarksUrl from "./assets/landmarks.json?url";
import { metalEnvironment } from "./metal-env";

export type LandmarkName =
  | "waterTower" | "mill" | "millWheel" | "viaductSpan" | "gorgeRiver" | "tunnelHill"
  | "cascade" | "wagonWreck" | "lighthouse" | "lighthouseBeam" | "frozenPond";

type Kind = "paint" | "metal" | "lamp" | "water" | "beam";
interface Bucket { kind: Kind; position: number[]; normal: number[]; color: number[]; index: number[] }
interface LandmarkData {
  pieces: Record<LandmarkName, Bucket[]>;
  pivots: Partial<Record<LandmarkName, [number, number, number]>>;
}

const materials: Record<Kind, THREE.Material> = {
  paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.88, metalness: 0 }),
  metal: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.45, metalness: 0.6 }),
  // Ventanas y linterna: sin luz de escena, brillan con su propio color.
  lamp: new THREE.MeshBasicMaterial({ vertexColors: true }),
  water: new THREE.MeshStandardMaterial({
    vertexColors: true, roughness: 0.15, metalness: 0.18, transparent: true, opacity: 0.82,
    side: THREE.DoubleSide, depthWrite: false,
  }),
  beam: new THREE.MeshBasicMaterial({
    color: "#fff1c4", transparent: true, opacity: 0.14, blending: THREE.AdditiveBlending,
    side: THREE.DoubleSide, depthWrite: false,
  }),
};

let pieces: Map<LandmarkName, Array<{ geometry: THREE.BufferGeometry; kind: Kind }>> | null = null;
let pivots: LandmarkData["pivots"] = {};
let loading: Promise<void> | null = null;

export function loadLandmarks(): Promise<void> {
  return loading ??= fetch(landmarksUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Landmarks: HTTP ${response.status}`);
    const data = await response.json() as LandmarkData;
    (materials.metal as THREE.MeshStandardMaterial).envMap = metalEnvironment();
    const built = new Map<LandmarkName, Array<{ geometry: THREE.BufferGeometry; kind: Kind }>>();
    for (const [name, buckets] of Object.entries(data.pieces) as Array<[LandmarkName, Bucket[]]>) {
      built.set(name, buckets.map((b) => {
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute("position", new THREE.Float32BufferAttribute(b.position, 3));
        geometry.setAttribute("normal", new THREE.Float32BufferAttribute(b.normal, 3));
        geometry.setAttribute("color", new THREE.Float32BufferAttribute(b.color, 3));
        geometry.setIndex(b.index);
        geometry.computeBoundingSphere();
        return { geometry, kind: b.kind };
      }));
    }
    pivots = data.pivots;
    pieces = built;
  }).catch((error: unknown) => { loading = null; throw error; });
}

export function landmarksReady(): boolean {
  return pieces !== null;
}

/** Una instancia nueva de la pieza (grupo de meshes que comparten geometría). */
export function landmark(name: LandmarkName): THREE.Group {
  const group = new THREE.Group();
  group.name = name;
  for (const { geometry, kind } of pieces?.get(name) ?? []) {
    const mesh = new THREE.Mesh(geometry, materials[kind]);
    if (kind === "beam" || kind === "water") mesh.renderOrder = 2;
    group.add(mesh);
  }
  return group;
}

/** Dónde va una parte viva (rueda del molino, haz del faro) dentro de su pieza madre. */
export function landmarkPivot(name: LandmarkName): THREE.Vector3 {
  return new THREE.Vector3().fromArray(pivots[name] ?? [0, 0, 0]);
}
