import * as THREE from "three";
import dataUrl from "./assets/portal-arcoiris.json?url";
import type { FishPartData } from "./blender-fish";

// Portal arcoíris de Las Nubes, modelado en Blender por Claude (art/blender/portal-arcoiris/).
// Centro en el origen, mira a +Z. Partes: cloud_ring (aro de nube), band 0…6 (cintas que
// gira gate.ts), veil (velo translúcido del centro) y stars (estrellas doradas).

interface RainbowPartData extends FishPartData {
  emission: number;
  emissionColor: [number, number, number];
}

export interface BlenderRainbowPortal {
  root: THREE.Group;
  /** Cintas de dentro hacia fuera: gate.ts las gira en Z en sentidos alternos. */
  bands: THREE.Mesh[];
  veil: THREE.MeshBasicMaterial;
}

let parts: RainbowPartData[] | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderRainbowPortal(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Portal arcoíris: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: RainbowPartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderRainbowPortal().catch((error: unknown) => console.error("Portal arcoíris de Blender:", error));

export function buildBlenderRainbowPortal(): BlenderRainbowPortal {
  if (!parts) throw new Error("El portal arcoíris debe precargarse antes de armarlo.");
  const root = new THREE.Group();
  root.name = "Portal arcoíris · Blender";
  const bands: THREE.Mesh[] = [];
  let veil: THREE.MeshBasicMaterial | undefined;

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    let material: THREE.Material;
    if (part.part === "band") {
      // Arcoíris sin sombras: colores puros que se leen desde lejos, como el prototipo.
      material = new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide });
    } else if (part.part === "veil") {
      veil = new THREE.MeshBasicMaterial({
        vertexColors: true, transparent: true, opacity: 0.22, depthWrite: false, side: THREE.DoubleSide,
      });
      material = veil;
    } else if (part.part === "cloud_ring") {
      // Mismo trato que el kit de nubes: mate y con luz propia lavanda.
      material = new THREE.MeshLambertMaterial({ vertexColors: true, emissive: new THREE.Color(0.56, 0.55, 0.62) });
    } else {
      material = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: part.roughness, metalness: 0.3,
        emissive: new THREE.Color(1.0, 0.78, 0.2), emissiveIntensity: 0.6,
      });
    }

    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    if (part.part === "veil") mesh.renderOrder = 2;
    root.add(mesh);
    if (part.part === "band") bands[part.segment ?? bands.length] = mesh;
  }

  if (!veil) throw new Error("Portal arcoíris: el JSON no trae la parte `veil`.");
  return { root, bands, veil };
}
