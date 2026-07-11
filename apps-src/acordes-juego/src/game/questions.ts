// Generador de preguntas (PLAN §3.4, §6.3): introducción progresiva por grupos,
// peso doble a lo recién introducido, anti-repetición y "ecos" de repaso en la Fosa.

import { ZONES } from "@/config";
import { CHORD_BY_ID, chordsOfFamily, type ChordType } from "@/music/chords";
import { chromaticRange, hasSamplesFor } from "@/music/theory";

const ROOTS = chromaticRange("C3", "C5");

export interface Question {
  chord: ChordType;
  rootNote: string;
  /** true si es un eco de repaso (zona 5) de una familia anterior. */
  isReview: boolean;
}

/** Pool introducido según el avance en la zona (§6.3): g2 a 1/2 cuota, g3 a 3/4. */
export function introducedPool(zoneIndex: number, captures: number, quota: number): string[] {
  const groups = ZONES[zoneIndex - 1].introGroups;
  const pool = [...groups[0]];
  if (groups.length > 1 && captures >= quota / 2) pool.push(...groups[1]);
  if (groups.length > 2 && captures >= (quota * 3) / 4) pool.push(...groups[2]);
  return pool;
}

/** Ids del último grupo introducido (pesan doble). */
function newestGroup(zoneIndex: number, captures: number, quota: number): string[] {
  const groups = ZONES[zoneIndex - 1].introGroups;
  if (groups.length > 2 && captures >= (quota * 3) / 4) return groups[2];
  if (groups.length > 1 && captures >= quota / 2) return groups[1];
  return groups[0];
}

function randomRootFor(chord: ChordType): string | null {
  for (let attempt = 0; attempt < 50; attempt++) {
    const root = ROOTS[Math.floor(Math.random() * ROOTS.length)];
    if (hasSamplesFor(root, chord)) return root;
  }
  return null;
}

export class QuestionMachine {
  private lastChordId: string | null = null;
  private reviewCounter = 0;

  /** Genera la siguiente pregunta para la zona con el avance dado. */
  next(zoneIndex: number, captures: number, quota: number): Question | null {
    // Repaso hadal (§6.3): en zona 5, pasada la mitad de la cuota,
    // 1 de cada 3 criaturas trae un acorde de CUALQUIER zona anterior.
    if (zoneIndex === 5 && captures >= quota / 2) {
      this.reviewCounter++;
      if (this.reviewCounter % 3 === 0) {
        const earlier = ZONES.slice(0, 4).flatMap((z) => z.introGroups.flat());
        const chord = CHORD_BY_ID[earlier[Math.floor(Math.random() * earlier.length)]];
        const rootNote = randomRootFor(chord);
        if (rootNote) return { chord, rootNote, isReview: true };
      }
    }

    const pool = introducedPool(zoneIndex, captures, quota);
    const newest = new Set(newestGroup(zoneIndex, captures, quota));
    // Peso ×2 a lo recién introducido (refuerzo de lo nuevo).
    const weighted = pool.flatMap((id) => (newest.has(id) ? [id, id] : [id]));

    for (let attempt = 0; attempt < 50; attempt++) {
      const id = weighted[Math.floor(Math.random() * weighted.length)];
      if (pool.length > 1 && id === this.lastChordId && attempt < 25) continue;
      const chord = CHORD_BY_ID[id];
      const rootNote = randomRootFor(chord);
      if (rootNote) {
        this.lastChordId = id;
        return { chord, rootNote, isReview: false };
      }
    }
    return null;
  }

  /** Opciones de respuesta para una pregunta (botones de la consola). */
  optionsFor(question: Question, zoneIndex: number, captures: number, quota: number): ChordType[] {
    if (question.isReview) {
      // El sonar "clasifica la familia": botones = familia completa del eco.
      return chordsOfFamily(question.chord.family);
    }
    return introducedPool(zoneIndex, captures, quota).map((id) => CHORD_BY_ID[id]);
  }

  reset(): void {
    this.lastChordId = null;
    this.reviewCounter = 0;
  }
}
