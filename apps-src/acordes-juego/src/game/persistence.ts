// Persistencia (PLAN §6.6): bitácora por tipo de acorde y desbloqueo de zonas.
// Se guarda tras CADA respuesta (cerrar el iframe no debe perder datos — §15).

import { STORAGE_KEYS } from "@/config";

export interface BitacoraEntry {
  attempts: number;
  correct: number;
  /** ISO de la primera captura. */
  first?: string;
  /** Especie con la que se capturó por primera vez. */
  speciesId?: string;
}

export type BitacoraData = Record<string, BitacoraEntry>;

export function loadBitacora(): BitacoraData {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEYS.bitacora) ?? "{}") as BitacoraData;
  } catch {
    return {};
  }
}

export function recordAttempt(chordId: string, correct: boolean, speciesId: string): void {
  const data = loadBitacora();
  const entry = data[chordId] ?? { attempts: 0, correct: 0 };
  entry.attempts++;
  if (correct) {
    entry.correct++;
    if (!entry.first) {
      entry.first = new Date().toISOString();
      entry.speciesId = speciesId;
    }
  }
  data[chordId] = entry;
  try {
    localStorage.setItem(STORAGE_KEYS.bitacora, JSON.stringify(data));
  } catch {
    // almacenamiento no disponible
  }
}

export function saveUnlockedZone(zone: number): void {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEYS.progress) ?? "{}") as {
      unlockedZone?: number;
    };
    raw.unlockedZone = Math.max(raw.unlockedZone ?? 1, Math.min(5, zone));
    localStorage.setItem(STORAGE_KEYS.progress, JSON.stringify(raw));
  } catch {
    // almacenamiento no disponible
  }
}
