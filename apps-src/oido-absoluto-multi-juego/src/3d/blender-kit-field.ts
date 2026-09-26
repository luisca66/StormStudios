import * as THREE from "three";
import { buildMaterial, loadModel, type ModelData } from "../../../shared-3d/src";

// Kits de piezas repetidas (rocas, setos, árboles, flores de La Pradera) cargados con shared-3d.
// Cada `part` del kit se dibuja con un solo InstancedMesh: 40 rocas de 3 variantes = 3 draw calls.
// Los pivotes de todas las piezas están en su base (y = 0).

export interface KitPlacement {
  part: string;
  x: number;
  y?: number;
  z: number;
  scale: number;
  rotY: number;
}

export interface Kit {
  ready(): boolean;
  model(): ModelData;
}

/** Pide el kit al cargar el módulo que lo declara: para cuando empieza el nivel ya está en memoria. */
export function loadKit(url: string, label: string): Kit {
  let data: ModelData | undefined;
  loadModel(url).then((model) => { data = model; })
    .catch((error: unknown) => console.error(`${label} de Blender:`, error));
  return {
    ready: () => data !== undefined,
    model: () => {
      if (!data) throw new Error(`${label}: el kit debe precargarse antes de armarlo.`);
      return data;
    },
  };
}

export function buildKitField(model: ModelData, placements: KitPlacement[]): THREE.Group {
  const group = new THREE.Group();
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const up = new THREE.Vector3(0, 1, 0);
  const position = new THREE.Vector3();
  const scale = new THREE.Vector3();

  for (const part of model.parts) {
    const mine = placements.filter((p) => p.part === part.part);
    if (!mine.length) continue;
    const material = buildMaterial(part.material, part.geometry.hasAttribute("color"));
    const mesh = new THREE.InstancedMesh(part.geometry, material, mine.length);
    mesh.name = part.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mine.forEach((p, i) => {
      position.set(p.x, p.y ?? 0, p.z);
      rotation.setFromAxisAngle(up, p.rotY);
      scale.setScalar(p.scale);
      mesh.setMatrixAt(i, matrix.compose(position, rotation, scale));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  }
  return group;
}
