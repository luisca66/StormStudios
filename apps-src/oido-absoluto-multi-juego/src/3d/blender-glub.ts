import * as THREE from "three";
import modelUrl from "./assets/glub.glb?url";
import { buildModel, loadModel, type ModelData } from "../../../shared-3d/src";

// Glub, jugador de La Pradera, modelado en Blender (art/blender/glub/, kit.export_glb).
// Primer modelo del juego cargado con la librería común apps-src/shared-3d (GLB con meshopt).
// Partes: body, eye ×2 (parpadean aplastándose en Y), foot ×2, hand ×2. Los pivotes son las mismas
// posiciones que ya anima player.ts, y el frente es +Z.

let model: ModelData | undefined;

/** Se pide al cargar el módulo: para cuando el jugador elige nivel ya está en memoria. */
export function preloadBlenderGlub(): Promise<void> {
  return loadModel(modelUrl).then((data) => { model = data; });
}

preloadBlenderGlub().catch((error: unknown) => console.error("Glub de Blender:", error));

export const isGlubReady = (): boolean => model !== undefined;

export interface BlenderGlub {
  root: THREE.Group;
  body: THREE.Mesh;
  eyes: THREE.Object3D[];  // [segment 0 (−X), segment 1 (+X)]
  feet: THREE.Object3D[];  // [izquierdo (−X), derecho (+X)]
  hands: THREE.Object3D[]; // [izquierda (−X), derecha (+X)]
}

export function buildBlenderGlub(): BlenderGlub {
  if (!model) throw new Error("Glub debe precargarse antes de armarlo.");
  const built = buildModel(model, { castShadow: true, receiveShadow: true });
  const [body] = built.byPart("body");
  const eyes = built.byPart("eye");
  // Los ojos van montados en el cuerpo: siguen su rebote y su aplastamiento al caminar.
  for (const eye of eyes) {
    eye.position.sub(body.position);
    body.add(eye);
  }
  built.root.name = "Glub · Blender";
  return { root: built.root, body, eyes, feet: built.byPart("foot"), hands: built.byPart("hand") };
}
