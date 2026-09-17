// Osamenta de ballena y anémonas-farol de la zona 4 (art/blender/osamenta-ballena/).
// Modelada por Astra. El hito va sobre una repisa pegada a la pared, como el barco hundido:
// origen en el apoyo del cráneo, −Z al centro del pozo y +Z a la pared.
//
// El hueso NO es emisivo: se ve por reflejo, y lo único que brilla es la colonia que se lo come y
// las anémonas-farol, en rosa (el color de la zona 4), con emisión por vértice.

import * as THREE from "three";
import dataUrl from "./assets/osamenta-ballena.json?url";
import { applyVertexEmission } from "./vertex-emission";

export type LanternVariant = "lantern-a" | "lantern-b" | "lantern-c";
const LANTERNS: LanternVariant[] = ["lantern-a", "lantern-b", "lantern-c"];

interface WhalePartData {
  name: string;
  part: string;
  pivot: [number, number, number];
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  vertexEmission?: number[];
  color: [number, number, number];
  metalness: number;
  roughness: number;
  emission: number;
}

interface WhaleData {
  meshes: WhalePartData[];
  lanternAnchors: [number, number, number][];
  ribGaps: [number, number, number][];
}

/** Una anémona-farol suelta, plantada por el juego lejos de la osamenta. */
export interface LanternPlacement {
  variant: LanternVariant;
  position: THREE.Vector3;
  rotationY: number;
  scale: number;
  phase: number;
}

export interface BlenderWhaleFall {
  root: THREE.Group;
  /** Anémonas sueltas por la zona: van a la escena en coordenadas del mundo, no con la osamenta. */
  loose: THREE.Group;
  /** Huecos entre costillas por donde cabe la Batisfera, en coordenadas del modelo. */
  ribGaps: THREE.Vector3[];
  update(elapsed: number): void;
}

let data: WhaleData | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderWhaleFall(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Osamenta de ballena: HTTP ${response.status}`);
    data = await response.json() as WhaleData;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

// Mismo latido lento que el jardín de corales: aquí son bacterias y tentáculos, no lámparas.
const PULSE_HZ = 0.06;
const PULSE_AMOUNT = 0.18;

function geometryOf(part: WhalePartData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
  if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
  if (part.vertexEmission) geometry.setAttribute("aEmission", new THREE.Float32BufferAttribute(part.vertexEmission, 3));
  geometry.setIndex(part.index);
  geometry.computeBoundingSphere();
  return geometry;
}

function materialOf(part: WhalePartData, time: { value: number }): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
    vertexColors: Boolean(part.vertexColor),
    metalness: part.metalness,
    roughness: part.roughness,
  });
  if (part.vertexEmission && part.emission > 0) {
    applyVertexEmission(material, {
      emission: part.emission, time, hz: PULSE_HZ, amount: PULSE_AMOUNT, cacheKey: "whalefall-vertex-glow",
    });
  }
  return material;
}

/**
 * Arma la osamenta con sus anémonas ancladas al hueso y a la repisa.
 * @param scattered anémonas sueltas por la zona, en coordenadas del mundo.
 */
export function buildBlenderWhaleFall(scattered: LanternPlacement[] = []): BlenderWhaleFall {
  if (!data) throw new Error("La osamenta debe precargarse antes de armarla.");
  const root = new THREE.Group();
  root.name = "Osamenta de ballena · Blender";
  const loose = new THREE.Group();
  loose.name = "Anémonas-farol sueltas";
  const time = { value: 0 };
  const dummy = new THREE.Object3D();

  const lanternSources = new Map<LanternVariant, WhalePartData>();
  for (const part of data.meshes) {
    if (LANTERNS.includes(part.part as LanternVariant)) {
      lanternSources.set(part.part as LanternVariant, part);
      continue;
    }
    const mesh = new THREE.Mesh(geometryOf(part), materialOf(part, time));
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    root.add(mesh);
  }

  // Anclajes del JSON: las anémonas que crecen sobre el propio esqueleto y su repisa.
  const anchored: LanternPlacement[] = data.lanternAnchors.map((anchor, i) => ({
    variant: LANTERNS[i % LANTERNS.length],
    position: new THREE.Vector3().fromArray(anchor),
    rotationY: i * 1.31,
    scale: 0.85 + (i % 4) * 0.22,
    phase: i * 0.83,
  }));

  for (const [variant, source] of lanternSources) {
    const geometry = geometryOf(source);
    const material = materialOf(source, time);
    for (const [spots, parent] of [[anchored, root], [scattered, loose]] as const) {
      const mine = spots.filter((s) => s.variant === variant);
      if (!mine.length) continue;
      // Una malla por variante y destino: el grupo anclado viaja con la osamenta y el suelto
      // vive en el mundo, porque el juego reparte anémonas por toda la zona abisal.
      const mesh = new THREE.InstancedMesh(geometry, material, mine.length);
      mesh.name = `Anémona ${variant}`;
      const phases = new Float32Array(mine.length);
      mine.forEach((spot, i) => {
        dummy.position.copy(spot.position);
        dummy.rotation.set(0, spot.rotationY, 0);
        dummy.scale.setScalar(spot.scale);
        dummy.updateMatrix();
        mesh.setMatrixAt(i, dummy.matrix);
        phases[i] = spot.phase;
      });
      mesh.instanceMatrix.needsUpdate = true;
      mesh.geometry = mesh.geometry.clone();
      mesh.geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
      parent.add(mesh);
    }
  }

  // En la zona 4 el juego no tiene luz: sin esto el hueso es una mancha negra y solo se ven las
  // anémonas. Dos luces rosas muy débiles hacen de «lo que alumbra la colonia» sobre el esqueleto.
  for (const [x, z] of [[-9, 2], [2, 3], [13, 3]]) {
    const glow = new THREE.PointLight(0xffb0dc, 7, 70, 1.5);
    glow.position.set(x, 6.5, z);
    root.add(glow);
  }

  return {
    root,
    loose,
    ribGaps: data.ribGaps.map((p) => new THREE.Vector3().fromArray(p)),
    update(elapsed) {
      time.value = elapsed;
    },
  };
}
