// Formato común de un modelo de Blender ya cargado, venga del JSON de `kit.export_parts` o de un GLB.
//
// Cada parte es un objeto de Blender con la propiedad `part`: su geometría está en espacio Three
// (Y arriba), relativa a su pivote, con rotación y escala ya aplicadas. Así lo escribe `kit.py` y
// así lo esperan los juegos: la malla se coloca en `pivot` y se anima rotando sobre él.

import * as THREE from "three";

/** Una parte tal como la escribe `kit.export_parts` en el JSON. */
export interface PartJson {
  name: string;
  part: string;
  segment?: number;
  variant?: number | string;
  pivot: [number, number, number];
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  /** Emisión por vértice (RGB lineal; cero exacto donde no brilla). Se multiplica por `emission`. */
  vertexEmission?: number[];
  color?: [number, number, number];
  alpha?: number;
  metalness?: number;
  roughness?: number;
  emission?: number;
  emissionColor?: [number, number, number];
}

export interface ModelJson {
  meshes: PartJson[];
  [key: string]: unknown;
}

/** Material principal de la parte (el del Principled BSDF de Blender), en color lineal. */
export interface MaterialSpec {
  color: [number, number, number];
  alpha: number;
  metalness: number;
  roughness: number;
  emission: number;
  emissionColor: [number, number, number];
}

export interface ModelPart {
  name: string;
  part: string;
  segment?: number;
  variant?: number | string;
  pivot: THREE.Vector3;
  /** `position` y `normal` relativos al pivote; `color` si hay color por vértice; `_emission` si hay emisión por vértice. */
  geometry: THREE.BufferGeometry;
  material: MaterialSpec;
}

export interface ModelData {
  /** Todo lo que el script de Blender dejó fuera de `meshes`: anclas, colisionadores, presupuestos… */
  meta: Record<string, unknown>;
  parts: ModelPart[];
  triangles: number;
}

/** Atributo de emisión por vértice ya cargado (en el GLB viaja como COLOR_1). */
export const EMISSION_ATTRIBUTE = "_emission";

const DEFAULT_MATERIAL: MaterialSpec = {
  color: [1, 1, 1],
  alpha: 1,
  metalness: 0,
  roughness: 1,
  emission: 0,
  emissionColor: [0, 0, 0],
};

export function materialSpec(source: Partial<MaterialSpec>): MaterialSpec {
  return {
    color: source.color ?? DEFAULT_MATERIAL.color,
    alpha: source.alpha ?? DEFAULT_MATERIAL.alpha,
    metalness: source.metalness ?? DEFAULT_MATERIAL.metalness,
    roughness: source.roughness ?? DEFAULT_MATERIAL.roughness,
    emission: source.emission ?? DEFAULT_MATERIAL.emission,
    emissionColor: source.emissionColor ?? DEFAULT_MATERIAL.emissionColor,
  };
}

export function parseModelJson(json: ModelJson): ModelData {
  const { meshes, ...meta } = json;
  let triangles = 0;
  const parts = meshes.map((mesh): ModelPart => {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.normal, 3));
    if (mesh.vertexColor?.length) geometry.setAttribute("color", new THREE.Float32BufferAttribute(mesh.vertexColor, 3));
    if (mesh.vertexEmission?.length) geometry.setAttribute(EMISSION_ATTRIBUTE, new THREE.Float32BufferAttribute(mesh.vertexEmission, 3));
    geometry.setIndex(mesh.index);
    geometry.computeBoundingSphere();
    triangles += mesh.index.length / 3;
    return {
      name: mesh.name,
      part: mesh.part,
      ...(mesh.segment !== undefined && { segment: mesh.segment }),
      ...(mesh.variant !== undefined && { variant: mesh.variant }),
      pivot: new THREE.Vector3().fromArray(mesh.pivot),
      geometry,
      material: materialSpec(mesh),
    };
  });
  return { meta, parts, triangles };
}

/** Partes con ese `part`, ordenadas por `segment` (las que no lo tienen van al principio). */
export function partsNamed(model: ModelData, part: string): ModelPart[] {
  return model.parts.filter((p) => p.part === part).sort((a, b) => (a.segment ?? -1) - (b.segment ?? -1));
}
