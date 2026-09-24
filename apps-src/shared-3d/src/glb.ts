// Lee un GLB escrito por `scripts/json-to-glb.mjs` (o por `kit.export_glb` en Blender) y lo deja en
// el mismo formato que el JSON (`ModelData`). El juego no nota de dónde vino el modelo.
//
// Contrato del GLB:
// - `scene.extras` = meta del modelo (lo que el JSON tenía fuera de `meshes`).
// - Un nodo por parte con `extras.part`, `extras.name` (y `segment`/`variant` si los hay); su traslación es el pivote.
// - Emisión por vértice en COLOR_1 (gltfpack descarta los atributos propios como `_EMISSION`).
// - Color por vértice mayor que 1: guardado entre `material.extras.colorScale` (gltfpack recorta a 1).
// - gltfpack quita el color por vértice si es blanco puro: da lo mismo, glTF lo multiplica.
// - La malla puede colgar del nodo de la parte o de un hijo: `gltfpack` añade un nodo con la escala
//   de la cuantización. Aquí se hornea todo a Float32 relativo al pivote, como en el JSON.

import * as THREE from "three";
import { GLTFLoader, type GLTF } from "three/examples/jsm/loaders/GLTFLoader.js";
import { MeshoptDecoder } from "three/examples/jsm/libs/meshopt_decoder.module.js";
import { EMISSION_ATTRIBUTE, materialSpec, type ModelData, type ModelPart } from "./model";

let loader: GLTFLoader | undefined;

function gltfLoader(): GLTFLoader {
  if (!loader) {
    loader = new GLTFLoader();
    loader.setMeshoptDecoder(MeshoptDecoder);
  }
  return loader;
}

export async function parseModelGlb(buffer: ArrayBuffer): Promise<ModelData> {
  const gltf = await gltfLoader().parseAsync(buffer, "");
  return modelFromGltf(gltf);
}

export function modelFromGltf(gltf: GLTF): ModelData {
  const scene = gltf.scene;
  scene.updateMatrixWorld(true);
  const parts: ModelPart[] = [];
  let triangles = 0;

  scene.traverse((node) => {
    if (typeof node.userData.part !== "string") return;
    const pivot = new THREE.Vector3().setFromMatrixPosition(node.matrixWorld);
    // Del espacio de la malla al del pivote, sin la rotación ni escala del nodo de la parte
    // (el JSON no las tiene: `kit.py` ya las aplica a los vértices).
    const toPivot = new THREE.Matrix4().makeTranslation(-pivot.x, -pivot.y, -pivot.z);
    const mesh = findMesh(node);
    if (!mesh) return;
    const geometry = bakeGeometry(mesh.geometry, new THREE.Matrix4().multiplyMatrices(toPivot, mesh.matrixWorld));
    const material = (Array.isArray(mesh.material) ? mesh.material[0] : mesh.material) as THREE.MeshStandardMaterial;
    const colorScale = (material.userData as { colorScale?: number }).colorScale;
    const color = geometry.getAttribute("color") as THREE.BufferAttribute | undefined;
    if (color && colorScale) for (let i = 0; i < color.array.length; i++) color.array[i] *= colorScale;
    triangles += (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
    parts.push({
      // GLTFLoader sanea el nombre del nodo; el original viaja en extras.
      name: typeof node.userData.name === "string" ? node.userData.name : node.name,
      part: node.userData.part,
      ...(node.userData.segment !== undefined && { segment: node.userData.segment }),
      ...(node.userData.variant !== undefined && { variant: node.userData.variant }),
      pivot,
      geometry,
      material: specFromMaterial(material),
    });
  });

  return { meta: { ...(scene.userData as Record<string, unknown>) }, parts, triangles };
}

function findMesh(node: THREE.Object3D): THREE.Mesh | undefined {
  if ((node as THREE.Mesh).isMesh) return node as THREE.Mesh;
  for (const child of node.children) {
    if (typeof child.userData.part === "string") continue; // otra parte (jerarquía de la entrega)
    const found = findMesh(child);
    if (found) return found;
  }
  return undefined;
}

/** Copia a Float32 (descuantiza) y aplica la matriz a posiciones y normales. */
function bakeGeometry(source: THREE.BufferGeometry, matrix: THREE.Matrix4): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  for (const name of ["position", "normal", "color"]) {
    const attribute = source.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (attribute) geometry.setAttribute(name, toFloat(attribute, name === "color" ? 3 : attribute.itemSize));
  }
  // Emisión por vértice: COLOR_1 (lo que sobrevive a gltfpack) o `_EMISSION` si vino así de Blender.
  const emission = (source.getAttribute("color_1") ?? source.getAttribute(EMISSION_ATTRIBUTE)) as THREE.BufferAttribute | undefined;
  if (emission) geometry.setAttribute(EMISSION_ATTRIBUTE, toFloat(emission, 3));
  if (source.index) geometry.setIndex(Array.from(source.index.array as ArrayLike<number>));
  geometry.getAttribute("position").applyMatrix4(matrix);
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  // Con solo traslación (el caso normal) las normales quedan tal cual, bit a bit como en el JSON.
  if (normal && !isTranslationOnly(matrix)) {
    normal.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(matrix));
    const n = new THREE.Vector3();
    for (let i = 0; i < normal.count; i++) n.fromBufferAttribute(normal, i).normalize().toArray(normal.array, i * 3);
  }
  geometry.computeBoundingSphere();
  return geometry;
}

function isTranslationOnly(matrix: THREE.Matrix4): boolean {
  const e = matrix.elements;
  const identity = [1, 0, 0, 0, 1, 0, 0, 0, 1];
  return [e[0], e[1], e[2], e[4], e[5], e[6], e[8], e[9], e[10]].every((v, i) => Math.abs(v - identity[i]) < 1e-9);
}

function toFloat(attribute: THREE.BufferAttribute | THREE.InterleavedBufferAttribute, itemSize: number): THREE.BufferAttribute {
  const out = new Float32Array(attribute.count * itemSize);
  const getters = [attribute.getX, attribute.getY, attribute.getZ, attribute.getW];
  for (let i = 0; i < attribute.count; i++) {
    // getX…getW ya descuantizan los atributos normalizados de gltfpack.
    for (let c = 0; c < itemSize; c++) out[i * itemSize + c] = getters[c].call(attribute, i);
  }
  return new THREE.BufferAttribute(out, itemSize);
}

function specFromMaterial(material: THREE.MeshStandardMaterial): ReturnType<typeof materialSpec> {
  const extras = material.userData as { emission?: number; emissionColor?: [number, number, number] };
  return materialSpec({
    color: material.color.toArray() as [number, number, number],
    alpha: material.opacity,
    metalness: material.metalness,
    roughness: material.roughness,
    // La intensidad y el color originales van en extras: glTF solo guarda emissive × intensidad.
    emission: extras.emission ?? material.emissiveIntensity,
    emissionColor: extras.emissionColor ?? (material.emissive.toArray() as [number, number, number]),
  });
}
