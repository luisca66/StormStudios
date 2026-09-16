import * as THREE from "three";
import dataUrl from "./assets/cielo.json?url";
import type { FishPartData } from "./blender-fish";

// Kit del cielo de Las Nubes, modelado en Blender por Claude (art/blender/cielo/):
// isla flotante con faldón de nube, flor mágica, cometa (dos velas, varillas y moño) y pájaro
// (cuerpo, detalles y ala). environment.ts arma y anima cada pieza; aquí solo se entrega la
// geometría compartida (una por parte) y un material base con pigmento de vértice.

export type SkyPart =
  | "island_rock" | "island_cloud" | "flower_stem" | "flower_bloom"
  | "kite_sail_a" | "kite_sail_b" | "kite_frame" | "kite_bow"
  | "bird_body" | "bird_details" | "bird_wing";

let geometries: Map<string, THREE.BufferGeometry> | undefined;
let pending: Promise<void> | undefined;

export function preloadBlenderSkyKit(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Kit del cielo: HTTP ${response.status}`);
    const meshes = (await response.json() as { meshes: FishPartData[] }).meshes;
    geometries = new Map(meshes.map((part) => {
      const geometry = new THREE.BufferGeometry();
      geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
      geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
      if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
      geometry.setIndex(part.index);
      geometry.computeBoundingSphere();
      return [part.part, geometry];
    }));
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderSkyKit().catch((error: unknown) => console.error("Kit del cielo de Blender:", error));

/** Malla de una pieza del kit. `tint` multiplica el pigmento (piezas blancas: moño, pájaro, flor). */
export function skyMesh(part: SkyPart, options: {
  tint?: THREE.ColorRepresentation;
  emissive?: THREE.ColorRepresentation;
  emissiveIntensity?: number;
  roughness?: number;
  doubleSide?: boolean;
} = {}): THREE.Mesh {
  const geometry = geometries?.get(part);
  if (!geometry) throw new Error(`Kit del cielo: falta la parte ${part} (¿se precargó?)`);
  const material = new THREE.MeshStandardMaterial({
    color: options.tint ?? 0xffffff,
    vertexColors: true,
    roughness: options.roughness ?? 0.7,
    emissive: options.emissive ?? 0x000000,
    emissiveIntensity: options.emissiveIntensity ?? 0,
    side: options.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.name = `Cielo · ${part}`;
  return mesh;
}
