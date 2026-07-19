// Sorteo de tipo + fundamental (PLAN §3.4): pool activo con pesos (los tipos
// recién introducidos pesan doble) y anti-repetición del tipo inmediato anterior.
// Lógica pura — no importa de 3d/ ni ui/ (regla §11).

import { CHORD_BY_ID, type ChordType } from "@/music/chords";
import { validRoots } from "@/music/theory";
import type { Register } from "@/config";

export interface Question {
  type: ChordType;
  rootMidi: number;
}

export class QuestionMachine {
  private pool: string[] = [];
  private fresh = new Set<string>();
  private lastTypeId: string | null = null;

  setPool(typeIds: string[], freshIds: string[] = []): void {
    this.pool = [...typeIds];
    this.fresh = new Set(freshIds);
  }

  getPool(): string[] {
    return [...this.pool];
  }

  next(register: Register, rng: () => number = Math.random): Question {
    if (this.pool.length === 0) throw new Error("QuestionMachine: pool vacío");

    // Anti-repetición: no repetir el tipo anterior si hay alternativas (§3.4).
    const candidates =
      this.pool.length > 1 && this.lastTypeId
        ? this.pool.filter((id) => id !== this.lastTypeId)
        : this.pool;

    // Pesos: recién introducidos ×2 (refuerzo de lo nuevo).
    const weights = candidates.map((id) => (this.fresh.has(id) ? 2 : 1));
    const total = weights.reduce((a, b) => a + b, 0);
    let roll = rng() * total;
    let chosen = candidates[candidates.length - 1];
    for (let i = 0; i < candidates.length; i++) {
      roll -= weights[i];
      if (roll < 0) {
        chosen = candidates[i];
        break;
      }
    }
    this.lastTypeId = chosen;

    const type = CHORD_BY_ID[chosen];
    const roots = validRoots(type, register);
    if (roots.length === 0) throw new Error(`Sin fundamentales válidas: ${chosen}`);
    const rootMidi = roots[Math.floor(rng() * roots.length)];
    return { type, rootMidi };
  }
}
