// Arma mallas de Three a partir de un `ModelData`. Replica lo que hacen hoy los `blender-*.ts` de
// cada juego (MeshStandardMaterial con color, metal, rugosidad y color por vértice; malla colocada en
// su pivote) para que un juego pueda cambiar su cargador por este sin que cambie la imagen.

import * as THREE from "three";
import { EMISSION_ATTRIBUTE, type MaterialSpec, type ModelData, type ModelPart } from "./model";
import { applyVertexEmission } from "./vertex-emission";

export interface BuildOptions {
  /**
   * Aplica `emission`/`emissionColor` del material. Por defecto no: la mayoría de los juegos anima
   * su propio brillo y los cargadores actuales no lo leen.
   */
  emissive?: boolean;
  /** Activa la emisión por vértice si la parte la trae. Clave de caché y latido opcionales. */
  vertexEmission?: { cacheKey: string; time?: { value: number }; hz?: number; amount?: number };
  castShadow?: boolean;
  receiveShadow?: boolean;
}

export function buildMaterial(spec: MaterialSpec, vertexColors: boolean, options: BuildOptions = {}): THREE.MeshStandardMaterial {
  const material = new THREE.MeshStandardMaterial({
    color: new THREE.Color().setRGB(spec.color[0], spec.color[1], spec.color[2]),
    vertexColors,
    metalness: spec.metalness,
    roughness: spec.roughness,
  });
  if (spec.alpha < 1) {
    material.transparent = true;
    material.opacity = spec.alpha;
    material.depthWrite = false;
  }
  if (options.emissive && spec.emission > 0) {
    material.emissive.setRGB(spec.emissionColor[0], spec.emissionColor[1], spec.emissionColor[2]);
    material.emissiveIntensity = spec.emission;
  }
  return material;
}

/** Malla de una parte, colocada en su pivote. La geometría se comparte con el modelo cargado. */
export function buildPart(part: ModelPart, options: BuildOptions = {}): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> {
  const material = buildMaterial(part.material, part.geometry.hasAttribute("color"), options);
  if (options.vertexEmission && part.geometry.hasAttribute(EMISSION_ATTRIBUTE)) {
    applyVertexEmission(material, { emission: part.material.emission, ...options.vertexEmission });
  }
  const mesh = new THREE.Mesh(part.geometry, material);
  mesh.name = part.name;
  mesh.position.copy(part.pivot);
  mesh.castShadow = options.castShadow ?? true;
  mesh.receiveShadow = options.receiveShadow ?? false;
  mesh.userData.part = part.part;
  if (part.segment !== undefined) mesh.userData.segment = part.segment;
  if (part.variant !== undefined) mesh.userData.variant = part.variant;
  return mesh;
}

export interface BuiltModel {
  root: THREE.Group;
  meshes: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
  /** Mallas con ese `part`, indexadas por `segment` (0 si no tiene). */
  byPart(part: string): THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
}

/** Todas las partes colgando de un grupo, sin jerarquía: cada juego arma la suya (p. ej. `meta.parents`). */
export function buildModel(model: ModelData, options: BuildOptions = {}): BuiltModel {
  const root = new THREE.Group();
  const meshes = model.parts.map((part) => buildPart(part, options));
  for (const mesh of meshes) root.add(mesh);
  return {
    root,
    meshes,
    byPart(part) {
      const found: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[] = [];
      for (const mesh of meshes) if (mesh.userData.part === part) found[mesh.userData.segment ?? 0] = mesh;
      return found;
    },
  };
}
