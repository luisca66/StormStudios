// Baliza de expedición (art/blender/baliza/). Pieza 7 del entorno, hecha por Claude con bpy.
// Sustituye al prototipo (cilindro + esfera). Son 14 balizas fondeadas en el pozo: una junto a cada
// termoclina y dos por zona. El juego les pone encima su halo y el letrero de profundidad.
// Partes: `body` (estructura, compartida entre todas) y `lamp` (la lámpara, con el color de la zona).

import * as THREE from "three";
import dataUrl from "./assets/baliza.json?url";

interface BeaconPartData {
  name: string;
  part: "body" | "lamp";
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
  color: [number, number, number];
  metalness: number;
  roughness: number;
  emission: number;
}

interface BeaconData {
  meshes: BeaconPartData[];
  lampCenter: [number, number, number];
}

export interface BlenderBeacon {
  group: THREE.Group;
  /** Material de la lámpara: el juego le modula la emisión para el parpadeo. */
  lampMaterial: THREE.MeshStandardMaterial;
  lampCenter: THREE.Vector3;
}

let data: BeaconData | undefined;
let pending: Promise<void> | undefined;
// La geometría y el cuerpo son iguales en las 14; solo la lámpara cambia de color por zona.
let shared: { body?: THREE.Mesh; lampGeometry?: THREE.BufferGeometry; lampSource?: BeaconPartData } = {};

export function preloadBlenderBeacon(): Promise<void> {
  return pending ??= fetch(dataUrl).then(async (response) => {
    if (!response.ok) throw new Error(`Baliza: HTTP ${response.status}`);
    data = await response.json() as BeaconData;
    shared = {};
  }).catch((error: unknown) => { pending = undefined; throw error; });
}

function geometryOf(part: BeaconPartData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(part.position, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(part.normal, 3));
  if (part.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(part.vertexColor, 3));
  geometry.setIndex(part.index);
  geometry.computeBoundingSphere();
  return geometry;
}

/** @param glow color de la zona (FAMILY_GLOW), que tiñe la lámpara. */
export function buildBlenderBeacon(glow: number): BlenderBeacon {
  if (!data) throw new Error("La baliza debe precargarse antes de armarla.");
  const group = new THREE.Group();
  group.name = "Baliza · Blender";

  if (!shared.body) {
    const source = data.meshes.find((m) => m.part === "body")!;
    const material = new THREE.MeshStandardMaterial({
      color: new THREE.Color().setRGB(source.color[0], source.color[1], source.color[2]),
      vertexColors: Boolean(source.vertexColor),
      metalness: source.metalness,
      roughness: source.roughness,
    });
    shared.body = new THREE.Mesh(geometryOf(source), material);
    const lampSource = data.meshes.find((m) => m.part === "lamp")!;
    shared.lampSource = lampSource;
    shared.lampGeometry = geometryOf(lampSource);
  }

  group.add(new THREE.Mesh(shared.body.geometry, shared.body.material));
  const lampSource = shared.lampSource!;
  const lampMaterial = new THREE.MeshStandardMaterial({
    color: new THREE.Color(glow),
    emissive: new THREE.Color(glow),
    emissiveIntensity: lampSource.emission,
    roughness: lampSource.roughness,
    metalness: lampSource.metalness,
  });
  group.add(new THREE.Mesh(shared.lampGeometry!, lampMaterial));

  return { group, lampMaterial, lampCenter: new THREE.Vector3().fromArray(data.lampCenter) };
}
