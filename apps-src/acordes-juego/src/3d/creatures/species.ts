// Especies de Batisfera: Medusa Luna, Cardumen Prisma, Calamar Vela, Rape Abisal y Pulpo Dumbo modelados en Blender; Sifonóforo y Leviatán usan primitivas
// + sprites de halo con textura canvas compartida. Cada fábrica recibe el color de
// bioluminiscencia (según familia del acorde) y devuelve un CreatureVisual.

import * as THREE from "three";
import type { CreatureVisual } from "./base";
import { buildBlenderJellyfish } from "./blender-jellyfish";
import { buildBlenderSchool } from "./blender-school";
import { buildBlenderSquid } from "./blender-squid";
import { buildBlenderAngler } from "./blender-angler";
import { buildBlenderDumbo } from "./blender-dumbo";
import { makeHalo } from "./halo";

function glowMat(color: number, base = 0x0a1016, intensity = 0.9): THREE.MeshStandardMaterial {
  return new THREE.MeshStandardMaterial({
    color: base,
    emissive: color,
    emissiveIntensity: intensity,
    roughness: 0.6,
    metalness: 0,
  });
}

// ---------- 1. Medusa Luna (zonas 1–2) ----------
// ---------- 2. Cardumen Prisma (zonas 1–2) ----------
// ---------- 3. Calamar Vela (zonas 2–3) ----------
// ---------- 4. Rape Abisal (zonas 3–4) — el señuelo ES la luz clickeable ----------
// ---------- 5. Sifonóforo (zonas 3–5) — cadena ondulante de faroles ----------
function buildSiphonophore(color: number): CreatureVisual {
  const group = new THREE.Group();
  const BEADS = 16;
  // H4a: material propio por farol — la nota i enciende su grupo (16/nNotas).
  const beadMats: THREE.MeshStandardMaterial[] = [];
  const beads: THREE.Mesh[] = [];
  for (let i = 0; i < BEADS; i++) {
    const mat = glowMat(color, 0x121821, 1.3);
    const bead = new THREE.Mesh(new THREE.SphereGeometry(i % 3 === 0 ? 0.3 : 0.2, 8, 6), mat);
    beadMats.push(mat);
    beads.push(bead);
    group.add(bead);
  }
  const halo = makeHalo(color, 5.0, 0.3);
  group.add(halo);

  return {
    group,
    glowMaterials: beadMats,
    glowSprites: [halo],
    bodyRadius: 3.4,
    animate(_dt, elapsed) {
      // Curva serpenteante recalculada por frame (barata: 16 puntos).
      for (let i = 0; i < BEADS; i++) {
        const t = i / (BEADS - 1);
        const wave = elapsed * 1.1 - i * 0.45;
        beads[i].position.set(
          Math.sin(wave) * 1.3 * (0.4 + t * 0.6),
          3.2 - t * 6.4,
          Math.cos(wave * 0.8) * 0.9 * t,
        );
      }
    },
    flashSegment(index, intensity, noteCount) {
      const size = Math.ceil(BEADS / noteCount);
      const j0 = index * size;
      for (let j = j0; j < Math.min(BEADS, j0 + size); j++) {
        beadMats[j].emissiveIntensity += intensity * 2.5;
      }
    },
  };
}

// ---------- 6. Pulpo Dumbo (zonas 4–5) ----------
// ---------- 7. Leviatán (zona 5, raro, vale ×2) ----------
function buildLeviathan(color: number): CreatureVisual {
  const group = new THREE.Group();
  const SEGMENTS = 9;
  const bodyMat = new THREE.MeshStandardMaterial({
    color: 0x05070c,
    emissive: 0x000000,
    roughness: 1,
  });
  // H4a: material propio por placa dorsal — la nota i destella la placa i
  // (y el "bramido" de aparición recorre las placas en ola, ver manager).
  const plateMats: THREE.MeshStandardMaterial[] = [];
  const segments: THREE.Mesh[] = [];
  for (let i = 0; i < SEGMENTS; i++) {
    const radius = 3.2 * (1 - (i / SEGMENTS) * 0.75);
    const seg = new THREE.Mesh(new THREE.SphereGeometry(radius, 10, 8), bodyMat);
    seg.position.z = i * 4.6;
    segments.push(seg);
    group.add(seg);

    const plateMat = glowMat(color, 0x0a0f16, 1.8);
    const plate = new THREE.Mesh(new THREE.ConeGeometry(0.7, 1.6, 4), plateMat);
    plate.position.set(0, radius * 0.95, i * 4.6);
    plateMats.push(plateMat);
    group.add(plate);
  }
  const halo = makeHalo(color, 14, 0.22);
  halo.position.z = 9;
  group.add(halo);

  return {
    group,
    glowMaterials: plateMats,
    glowSprites: [halo],
    bodyRadius: 11,
    animate(_dt, elapsed) {
      for (let i = 0; i < SEGMENTS; i++) {
        segments[i].position.x = Math.sin(elapsed * 0.5 - i * 0.42) * 2.4;
        const plate = group.children[i * 2 + 1] as THREE.Mesh;
        plate.position.x = segments[i].position.x;
      }
      group.rotation.y += _dt * 0.06; // cruza lentamente el campo visual
    },
    flashSegment(index, intensity) {
      plateMats[index % plateMats.length].emissiveIntensity += intensity * 3;
    },
  };
}

// ---------- Registro de especies ----------
export interface SpeciesDef {
  id: string;
  es: string;
  en: string;
  /** Zonas donde aparece (índices 1..5). */
  zones: number[];
  build(color: number): CreatureVisual;
}

export const SPECIES: SpeciesDef[] = [
  { id: "jellyfish", es: "Medusa Luna", en: "Moon Jelly", zones: [1, 2], build: buildBlenderJellyfish },
  { id: "school", es: "Cardumen Prisma", en: "Prism School", zones: [1, 2], build: buildBlenderSchool },
  { id: "squid", es: "Calamar Vela", en: "Sail Squid", zones: [2, 3], build: buildBlenderSquid },
  { id: "angler", es: "Rape Abisal", en: "Anglerfish", zones: [3, 4], build: buildBlenderAngler },
  { id: "siphonophore", es: "Sifonóforo", en: "Siphonophore", zones: [3, 4, 5], build: buildSiphonophore },
  { id: "dumbo", es: "Pulpo Dumbo", en: "Dumbo Octopus", zones: [4, 5], build: buildBlenderDumbo },
  { id: "leviathan", es: "Leviatán", en: "Leviathan", zones: [5], build: buildLeviathan },
];

export function speciesForZone(zoneIndex: number): SpeciesDef[] {
  return SPECIES.filter((s) => s.zones.includes(zoneIndex) && s.id !== "leviathan");
}

export const LEVIATHAN = SPECIES[SPECIES.length - 1];
