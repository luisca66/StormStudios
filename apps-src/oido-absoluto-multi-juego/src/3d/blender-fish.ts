import * as THREE from "three";
import dataUrl from "./assets/pez.json?url";

// Pez protagonista de El Océano, modelado en Blender (art/blender/pez/, kit.export_parts).
// Boca hacia +Z, origen en el centro del cuerpo. Partes: body, eye ×2, tail, fin ×2, dorsal.
// Cada ojo tiene su pivote en el centro del globo: el juego lo aplasta en Y para parpadear.

export interface FishPartData {
  name: string;
  part: string;
  segment?: number;
  pivot: [number, number, number];
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  color: [number, number, number];
  metalness: number;
  roughness: number;
}

export interface BlenderFish {
  root: THREE.Group;
  tail: THREE.Object3D;
  fins: THREE.Object3D[]; // [segment 0 (−X), segment 1 (+X)]
  dorsal: THREE.Object3D;
  eyes: THREE.Object3D[]; // [segment 0 (−X), segment 1 (+X)]
}

let parts: FishPartData[] | undefined;
let pending: Promise<void> | undefined;

/** Se pide al cargar el módulo: para cuando el jugador elige nivel ya está en memoria. */
export function preloadBlenderFish(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Pez: HTTP ${response.status}`);
    parts = (await response.json() as { meshes: FishPartData[] }).meshes;
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

preloadBlenderFish().catch((error: unknown) => console.error("Pez de Blender:", error));

/** Arma el pez ya descargado. Devuelve las partes que el juego anima. */
export function buildBlenderFish(): BlenderFish {
  if (!parts) throw new Error("El pez debe precargarse antes de armarlo.");
  const root = new THREE.Group();
  root.name = "Pez · Blender";

  let tail!: THREE.Object3D;
  let dorsal!: THREE.Object3D;
  const fins: THREE.Object3D[] = [];
  const eyes: THREE.Object3D[] = [];

  for (const part of parts) {
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
    geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
    if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
    geometry.setIndex(part.index);
    geometry.computeBoundingSphere();

    const isFin = part.part === "fin" || part.part === "dorsal" || part.part === "tail";
    const mesh = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(part.color[0], part.color[1], part.color[2]),
      vertexColors: Boolean(part.vertexColor),
      metalness: part.metalness,
      roughness: part.roughness,
      // Las aletas son láminas: se ven por las dos caras al ondular.
      side: isFin ? THREE.DoubleSide : THREE.FrontSide,
    }));
    mesh.name = part.name;
    mesh.position.fromArray(part.pivot);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    root.add(mesh);

    if (part.part === "tail") tail = mesh;
    else if (part.part === "dorsal") dorsal = mesh;
    else if (part.part === "fin") fins[part.segment ?? fins.length] = mesh;
    else if (part.part === "eye") eyes[part.segment ?? eyes.length] = mesh;
  }

  return { root, tail, fins, dorsal, eyes };
}
