// Chimeneas hidrotermales y pináculos de la zona 5 (art/blender/chimeneas-hidrotermales/).
// Modelado por Astra (ejecutado por Claude). Kit de 4 piezas (spire, stack, cluster, flange) que el
// juego planta de pie en el fondo de la fosa; el origen de cada pieza es su apoyo en el suelo.
// El calor va POR VÉRTICE, como en el jardín de corales (vertex-emission.ts), con un latido lento.

import * as THREE from "three";
import dataUrl from "./assets/chimeneas.json?url";
import { applyVertexEmission } from "./vertex-emission";

export type VentPart = "spire" | "stack" | "cluster" | "flange";

interface VentPartData {
  name: string;
  part: VentPart;
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  vertexEmission: number[];
  color: [number, number, number];
  metalness: number;
  roughness: number;
  emission: number;
}

interface VentData {
  meshes: VentPartData[];
  /** Bocas de donde sale el penacho, en coordenadas de la pieza. */
  plumes: Partial<Record<VentPart, [number, number, number][]>>;
}

export interface VentPlacement {
  part: VentPart;
  position: THREE.Vector3;
  rotationY: number;
  scale: number;
  phase: number;
}

export interface BlenderVentField {
  group: THREE.Group;
  /** Bocas calientes en coordenadas del mundo, para luces y columnas de partículas. */
  mouths: THREE.Vector3[];
  update(elapsed: number): void;
}

let data: VentData | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderVents(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Chimeneas: HTTP ${response.status}`);
    data = await response.json() as VentData;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

// Calor que respira despacio, no una lámpara fija.
const PULSE_HZ = 0.18;
const PULSE_AMOUNT = 0.22;

export function buildBlenderVentField(placements: VentPlacement[]): BlenderVentField {
  if (!data) throw new Error("Las chimeneas deben precargarse antes de armarlas.");
  const group = new THREE.Group();
  group.name = "Chimeneas · Blender";
  const time = { value: 0 };
  const dummy = new THREE.Object3D();
  const mouths: THREE.Vector3[] = [];

  for (const part of data.meshes) {
    const mine = placements.filter((p) => p.part === part.part);
    if (!mine.length) continue;

    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setAttribute("aEmission", new THREE.Float32BufferAttribute(part.vertexEmission, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
    });
    applyVertexEmission(material, {
      emission: part.emission, time, hz: PULSE_HZ, amount: PULSE_AMOUNT, cacheKey: "vent-vertex-glow",
    });

    const mesh = new THREE.InstancedMesh(geometry, material, mine.length);
    mesh.name = `Chimenea ${part.part}`;
    const phases = new Float32Array(mine.length);
    const plumes = data.plumes[part.part] ?? [];
    mine.forEach((spot, i) => {
      dummy.position.copy(spot.position);
      dummy.rotation.set(0, spot.rotationY, 0);
      dummy.scale.setScalar(spot.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      phases[i] = spot.phase;
      for (const mouth of plumes) mouths.push(new THREE.Vector3(...mouth).applyMatrix4(dummy.matrix));
    });
    mesh.instanceMatrix.needsUpdate = true;
    geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    group.add(mesh);
  }

  return {
    group,
    mouths,
    update(elapsed) {
      time.value = elapsed;
    },
  };
}
