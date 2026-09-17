// Jardín de corales bioluminiscentes de la zona 3 (art/blender/jardin-corales/).
// Modelado por Astra. Kit de 4 piezas (fan, tube, whip, crust) que el juego instancia sobre la
// pared del pozo; el origen de cada pieza es su base pegada a la roca y −Z mira al centro.
//
// La emisión va POR VÉRTICE (`vertexEmission` en el JSON): el cuerpo es frío y solo se encienden
// puntas, bocas y nervaduras. Three no tiene emisión por vértice, así que se inyecta en el shader
// del MeshStandardMaterial; el latido vive en el mismo shader, con una fase por instancia.

import * as THREE from "three";
import dataUrl from "./assets/jardin-corales.json?url";

export type CoralPart = "fan" | "tube" | "whip" | "crust";

interface CoralPartData {
  name: string;
  part: CoralPart;
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

interface CoralData {
  meshes: CoralPartData[];
  pieces: Record<CoralPart, { height: number; glowCenter: [number, number, number] }>;
}

/** Un coral colocado por el juego: base sobre la pared, inclinación y tamaño propios. */
export interface CoralPlacement {
  part: CoralPart;
  position: THREE.Vector3;
  /** Giro alrededor del eje del pozo; deja el +Z de la pieza contra la pared. */
  rotationY: number;
  /** Inclinación hacia el centro del pozo, en radianes. */
  tilt: number;
  scale: number;
  /** Fase del latido, para que el manchón no respire a la vez. */
  phase: number;
}

export interface BlenderCoralGarden {
  group: THREE.Group;
  update(elapsed: number): void;
}

let data: CoralData | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderCorals(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Jardín de corales: HTTP ${response.status}`);
    data = await response.json() as CoralData;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

// ENTREGA.md: multiplicador 1 + 0.16·sin(2π·0.07·t + fase).
const PULSE_HZ = 0.07;
const PULSE_AMOUNT = 0.16;

export function buildBlenderCoralGarden(placements: CoralPlacement[]): BlenderCoralGarden {
  if (!data) throw new Error("El jardín de corales debe precargarse antes de armarlo.");
  const group = new THREE.Group();
  group.name = "Jardín de corales · Blender";
  const time = { value: 0 };
  const dummy = new THREE.Object3D();

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
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = time;
      shader.uniforms.uEmission = { value: part.emission };
      shader.vertexShader = `attribute vec3 aEmission;
attribute float aPhase;
uniform float uTime;
varying vec3 vCoralEmission;
${shader.vertexShader}`.replace(
        "#include <begin_vertex>",
        `#include <begin_vertex>
  vCoralEmission = aEmission * (1.0 + ${PULSE_AMOUNT.toFixed(2)} * sin(uTime * ${(Math.PI * 2 * PULSE_HZ).toFixed(4)} + aPhase));`,
      );
      shader.fragmentShader = `uniform float uEmission;
varying vec3 vCoralEmission;
${shader.fragmentShader}`.replace(
        "#include <emissivemap_fragment>",
        `#include <emissivemap_fragment>
  totalEmissiveRadiance += vCoralEmission * uEmission;`,
      );
    };
    // Sin esto, Three reutiliza el programa del material estándar sin el parche.
    material.customProgramCacheKey = () => "coral-vertex-glow";

    const mesh = new THREE.InstancedMesh(geometry, material, mine.length);
    mesh.name = `Coral ${part.part}`;
    const phases = new Float32Array(mine.length);
    mine.forEach((spot, i) => {
      dummy.position.copy(spot.position);
      dummy.rotation.set(0, spot.rotationY, 0);
      dummy.rotateX(spot.tilt);
      dummy.scale.setScalar(spot.scale);
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      phases[i] = spot.phase;
    });
    mesh.instanceMatrix.needsUpdate = true;
    geometry.setAttribute("aPhase", new THREE.InstancedBufferAttribute(phases, 1));
    group.add(mesh);
  }

  return {
    group,
    update(elapsed) {
      time.value = elapsed;
    },
  };
}
