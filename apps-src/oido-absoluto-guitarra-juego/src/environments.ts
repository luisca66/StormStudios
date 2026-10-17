import * as THREE from "three";
import guitarUrl from "./assets/mundo-guitarra.glb?url";
import hornUrl from "./assets/mundo-corno.glb?url";
import pianoUrl from "./assets/mundo-piano.glb?url";
import { buildMaterial, buildModel, loadModel, type ModelData } from "../../shared-3d/src";
import type { MazeWall } from "./maze";

// Mundos de Resonancia (Astra, art/blender/mundo-<id>/): la misma pedagogía en escenarios distintos.
// Contrato común: world (decorado), wall_x (5 m en X), wall_z (5.7 m en Z), post, portal_frame,
// portal_ring 0…n y portal_core. Pivotes en la base (muros y postes) y en el centro del hueco (portal).
export type EnvironmentId = "guitarra" | "corno" | "piano";

export const ENVIRONMENTS: { id: EnvironmentId; name: string; place: string }[] = [
  { id: "guitarra", name: "La guitarra gigante", place: "Sobre el diapasón, entre trastes y cuerdas" },
  { id: "corno", name: "Dentro del corno", place: "Entre tubos de latón y la gran campana" },
  { id: "piano", name: "Dentro del piano de cola", place: "Entre el arpa, los martillos y las cuerdas" },
];

const URLS: Record<EnvironmentId, string> = { guitarra: guitarUrl, corno: hornUrl, piano: pianoUrl };
const cache = new Map<EnvironmentId, Promise<ModelData>>();

export function loadEnvironment(id: EnvironmentId): Promise<ModelData> {
  if (!cache.has(id)) cache.set(id, loadModel(URLS[id]));
  return cache.get(id)!;
}

/** El piso del laberinto en el juego (los muros de código apoyaban en ~0.57; el robot pisa en ~0.65). */
export const FLOOR_Y = 0.6;
const WALL_X_LENGTH = 5.0;
const WALL_Z_LENGTH = 5.7;

/** Decorado fijo del mundo, apoyado en el piso del laberinto. */
export function buildWorldDecor(model: ModelData): THREE.Group {
  const built = buildModel(model, { emissive: true, castShadow: false, receiveShadow: true });
  const root = new THREE.Group();
  for (const mesh of built.byPart("world").filter(Boolean)) root.add(mesh);
  root.position.y = FLOOR_Y;
  return root;
}

/** Muros del laberinto instanciados (una malla por pieza) y postes en los extremos de cada tramo. */
export function buildMazeWalls(model: ModelData, walls: MazeWall[]): THREE.Group {
  const group = new THREE.Group();
  const part = (name: string) => model.parts.find((p) => p.part === name);
  const alongX = walls.filter((w) => w.width >= w.depth);
  const alongZ = walls.filter((w) => w.width < w.depth);
  const posts = new Map<string, THREE.Vector3>();
  const addPost = (x: number, z: number) => posts.set(`${x.toFixed(2)},${z.toFixed(2)}`, new THREE.Vector3(x, FLOOR_Y, z));
  for (const w of alongX) { addPost(w.x - w.width / 2, w.z); addPost(w.x + w.width / 2, w.z); }
  for (const w of alongZ) { addPost(w.x, w.z - w.depth / 2); addPost(w.x, w.z + w.depth / 2); }

  const m = new THREE.Matrix4(), q = new THREE.Quaternion(), s = new THREE.Vector3(), p = new THREE.Vector3();
  const instance = (name: string, items: { x: number; z: number; sx: number; sz: number }[]) => {
    const piece = part(name);
    if (!piece || !items.length) return;
    const mesh = new THREE.InstancedMesh(piece.geometry, buildMaterial(piece.material, piece.geometry.hasAttribute("color"), { emissive: true }), items.length);
    mesh.name = piece.name;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    mesh.userData.sharedGeometry = true; // la geometría vive en la caché del modelo: no se libera al rehacer el laberinto
    items.forEach((it, i) => {
      p.set(it.x, FLOOR_Y, it.z);
      s.set(it.sx, 1, it.sz);
      mesh.setMatrixAt(i, m.compose(p, q, s));
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
    group.add(mesh);
  };
  instance("wall_x", alongX.map((w) => ({ x: w.x, z: w.z, sx: w.width / WALL_X_LENGTH, sz: 1 })));
  instance("wall_z", alongZ.map((w) => ({ x: w.x, z: w.z, sx: 1, sz: w.depth / WALL_Z_LENGTH })));
  instance("post", [...posts.values()].map((v) => ({ x: v.x, z: v.z, sx: 1, sz: 1 })));
  return group;
}

export interface EnvironmentPortal {
  root: THREE.Group;
  rings: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial>[];
  core: THREE.Mesh<THREE.BufferGeometry, THREE.MeshStandardMaterial> | undefined;
}

/** Portal del mundo: marco fijo, aros que giran en Z y centro que aparece al abrir. */
export function buildEnvironmentPortal(model: ModelData): EnvironmentPortal {
  const built = buildModel(model, { emissive: true, castShadow: false });
  const root = new THREE.Group();
  for (const mesh of built.byPart("portal_frame").filter(Boolean)) root.add(mesh);
  const rings = built.byPart("portal_ring").filter(Boolean);
  for (const ring of rings) root.add(ring);
  const [core] = built.byPart("portal_core");
  if (core) root.add(core);
  return { root, rings, core };
}
