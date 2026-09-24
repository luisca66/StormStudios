// Lee un GLB escrito por `scripts/json-to-glb.mjs` (o por `kit.export_glb` en Blender) y lo deja en
// el mismo formato que el JSON (`ModelData`). El juego no nota de dónde vino el modelo.
//
// Contrato del GLB:
// - `scene.extras` = meta del modelo (lo que el JSON tenía fuera de `meshes`).
// - Un nodo por parte con `extras.part` (y `segment`/`variant` si los hay); su traslación es el pivote.
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
    triangles += (geometry.index?.count ?? geometry.getAttribute("position").count) / 3;
    const material = Array.isArray(mesh.material) ? mesh.material[0] : mesh.material;
    parts.push({
      name: node.name,
      part: node.userData.part,
      ...(node.userData.segment !== undefined && { segment: node.userData.segment }),
      ...(node.userData.variant !== undefined && { variant: node.userData.variant }),
      pivot,
      geometry,
      material: specFromMaterial(material as THREE.MeshStandardMaterial),
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
  for (const name of ["position", "normal", "color", EMISSION_ATTRIBUTE]) {
    const attribute = source.getAttribute(name) as THREE.BufferAttribute | undefined;
    if (attribute) geometry.setAttribute(name, toFloat(attribute, name === "color" ? 3 : attribute.itemSize));
  }
  if (source.index) geometry.setIndex(Array.from(source.index.array as ArrayLike<number>));
  geometry.getAttribute("position").applyMatrix4(matrix);
  const normal = geometry.getAttribute("normal") as THREE.BufferAttribute | undefined;
  if (normal) {
    normal.applyNormalMatrix(new THREE.Matrix3().getNormalMatrix(matrix));
    const n = new THREE.Vector3();
    for (let i = 0; i < normal.count; i++) n.fromBufferAttribute(normal, i).normalize().toArray(normal.array, i * 3);
  }
  geometry.computeBoundingSphere();
  return geometry;
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
