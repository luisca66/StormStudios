// Especies de Batisfera: las siete criaturas están modeladas en Blender (art/blender/).
// Cada fábrica recibe el color de bioluminiscencia (según familia del acorde) y devuelve
// un CreatureVisual.

import type { CreatureVisual } from "./base";
import { buildBlenderJellyfish } from "./blender-jellyfish";
import { buildBlenderSchool } from "./blender-school";
import { buildBlenderSquid } from "./blender-squid";
import { buildBlenderAngler } from "./blender-angler";
import { buildBlenderDumbo } from "./blender-dumbo";
import { buildBlenderSiphonophore } from "./blender-siphonophore";
import { buildBlenderLeviathan } from "./blender-leviathan";

// ---------- 1. Medusa Luna (zonas 1–2) ----------
// ---------- 2. Cardumen Prisma (zonas 1–2) ----------
// ---------- 3. Calamar Vela (zonas 2–3) ----------
// ---------- 4. Rape Abisal (zonas 3–4) — el señuelo ES la luz clickeable ----------
// ---------- 5. Sifonóforo (zonas 3–5) — cadena ondulante de faroles ----------
// ---------- 6. Pulpo Dumbo (zonas 4–5) ----------
// ---------- 7. Leviatán (zona 5, raro, vale ×2) ----------

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
  { id: "siphonophore", es: "Sifonóforo", en: "Siphonophore", zones: [3, 4, 5], build: buildBlenderSiphonophore },
  { id: "dumbo", es: "Pulpo Dumbo", en: "Dumbo Octopus", zones: [4, 5], build: buildBlenderDumbo },
  { id: "leviathan", es: "Leviatán", en: "Leviathan", zones: [5], build: buildBlenderLeviathan },
];

export function speciesForZone(zoneIndex: number): SpeciesDef[] {
  return SPECIES.filter((s) => s.zones.includes(zoneIndex) && s.id !== "leviathan");
}

export const LEVIATHAN = SPECIES[SPECIES.length - 1];
