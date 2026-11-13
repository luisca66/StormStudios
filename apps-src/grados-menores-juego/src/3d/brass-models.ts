// brass-models.ts — Las piezas de latón de Blender (art/blender/anillos/modelar-anillos.py): el anillo
// de navegación y la baliza de cada segmento, los anillos de la espiral del perihelio, los medallones
// del rosetón y el observatorio del planeta natal. Se descargan una vez al arrancar; mientras no
// llegan (o si fallan), rings.ts y perihelion.ts usan sus primitivas de siempre.
//
// Las geometrías son COMPARTIDAS por todos los segmentos: nadie debe liberarlas (isBrassGeometry).

import * as THREE from "three";
import anillosUrl from "./assets/anillos.json?url";

interface MeshData {
  name: string;
  part: string;
  position: number[];
  normal: number[];
  index: number[];
  vertexColor?: number[];
}

export interface BrassModels {
  navRing: THREE.BufferGeometry;
  pulsarCore: THREE.BufferGeometry;
  pulsarRing: THREE.BufferGeometry;
  periRing: THREE.BufferGeometry;
  medallion: THREE.BufferGeometry;
  /** Montaña y tambor con telescopio, pivote en la base, Y arriba, telescopio hacia +Z. */
  observatory: { geometry: THREE.BufferGeometry; material: THREE.Material }[];
  observatoryDome: THREE.BufferGeometry;
}

/**
 * Latón con color por vértice (pátina de Blender). Menos metálico y con más brillo propio que el
 * latón de código: sin mapa de entorno, el metal puro a contraluz de la nebulosa se lee negro y se
 * perdían las graduaciones.
 */
export const MODEL_BRASS = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.4, metalness: 0.55,
  emissive: new THREE.Color("#8a6418"), emissiveIntensity: 0.45,
});
/** Latón encendido: anillo del perihelio ya cruzado, medallón de una clase del viaje, cúpula. */
export const MODEL_BRASS_LIT = new THREE.MeshStandardMaterial({
  vertexColors: true, color: "#fff2c8", roughness: 0.3, metalness: 0.8,
  emissive: new THREE.Color("#c9a227"), emissiveIntensity: 2.2,
});
/** El cristal de la baliza brilla solo: es lo que dice "viene nota". */
export const MODEL_AMBER = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.2, metalness: 0,
  emissive: new THREE.Color("#ffb43c"), emissiveIntensity: 1.1, flatShading: true,
});
// La montaña está en la cara de noche del planeta: un poco de luz de luna para que se lea la nieve.
const MODEL_ROCK = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 1, metalness: 0, flatShading: true,
  emissive: new THREE.Color("#4a6680"), emissiveIntensity: 0.22,
});
/** La cúpula del observatorio: encendida pero sin quemarse, para que se vea la ranura abierta. */
export const MODEL_BRASS_WARM = new THREE.MeshStandardMaterial({
  vertexColors: true, roughness: 0.35, metalness: 0.5,
  emissive: new THREE.Color("#c9922f"), emissiveIntensity: 0.75,
});

let models: BrassModels | null = null;
const shared = new Set<THREE.BufferGeometry>();

export function brassModels(): BrassModels | null {
  return models;
}

export function isBrassGeometry(geometry: THREE.BufferGeometry): boolean {
  return shared.has(geometry);
}

function toGeometry(mesh: MeshData): THREE.BufferGeometry {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(mesh.position, 3));
  geometry.setAttribute("normal", new THREE.Float32BufferAttribute(mesh.normal, 3));
  if (mesh.vertexColor) geometry.setAttribute("color", new THREE.Float32BufferAttribute(mesh.vertexColor, 3));
  geometry.setIndex(mesh.index);
  geometry.computeBoundingSphere();
  shared.add(geometry);
  return geometry;
}

/** Se resuelve cuando hay modelos (o cuando ya se sabe que no los habrá). */
export const brassReady: Promise<void> = fetch(anillosUrl)
  .then(async (response) => {
    if (!response.ok) throw new Error(`Anillos de latón: HTTP ${response.status}`);
    const data = (await response.json()) as { meshes: MeshData[] };
    const byPart = (part: string) => data.meshes.filter((m) => m.part === part);
    const one = (part: string) => {
      const [mesh] = byPart(part);
      if (!mesh) throw new Error(`Anillos de latón: falta ${part}`);
      return toGeometry(mesh);
    };
    models = {
      navRing: one("nav_ring"),
      pulsarCore: one("pulsar_core"),
      pulsarRing: one("pulsar_ring"),
      periRing: one("peri_ring"),
      medallion: one("medallion"),
      observatory: byPart("observatory").map((mesh) => ({
        geometry: toGeometry(mesh),
        material: mesh.name.startsWith("Montana") ? MODEL_ROCK : MODEL_BRASS,
      })),
      observatoryDome: one("observatory_dome"),
    };
  })
  .catch((error: unknown) => console.warn(error));
