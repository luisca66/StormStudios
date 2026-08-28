// selector.ts — Port VERBATIM de referencias/engine.js (PLAN §3.6). Está calibrado:
// no "mejorarlo". Bolsa barajada: cubre todos los grados seleccionados una vez antes
// de repetir, nunca el mismo grado dos veces seguidas (ni en el límite entre ciclos),
// y varía octava/timbre dentro de cada grado.

import {
  BASE_TIMBRES, RANDOM_TIMBRE, NOTE_FILES, scaleDegrees, getPitchClass,
  type Scale, type Degree, type Timbre,
} from "./degrees";

export interface QuestionSample {
  pitchClass: string;
  filePath: string; // relativo al bucket, ej. "Piano/F##4.mp3"
}

// Carpetas a considerar (todas si es Aleatorio) — port de getAssetBaseDirsForSelection.
export function timbreDirsForSelection(timbre: Timbre): string[] {
  return timbre === RANDOM_TIMBRE ? [...BASE_TIMBRES] : [timbre];
}

// Carpeta para sonidos de apoyo (silbato/cadencia/llegada): si el timbre es Aleatorio
// se infiere de la pregunta vigente — port de getSupportAssetBaseDir.
export function supportTimbreDir(selected: Timbre, question: QuestionSample | null): string {
  if (selected !== RANDOM_TIMBRE) return selected;
  const dir = question?.filePath.split("/")[0];
  return dir && dir.length ? dir : "Piano";
}

// Lista de muestras válidas para escala + grados + timbre — port de buildQuestionSet.
export function buildQuestionSet(
  scale: Scale,
  selectedDegrees: ReadonlySet<Degree>,
  timbre: Timbre,
): QuestionSample[] {
  if (selectedDegrees.size === 0) return [];
  const degMap = scaleDegrees[scale];
  if (!degMap) return [];

  const out: QuestionSample[] = [];
  for (const assetBase of timbreDirsForSelection(timbre)) {
    for (const base of NOTE_FILES) {
      const pitch = getPitchClass(base);
      const degree = degMap[pitch];
      if (degree && selectedDegrees.has(degree)) {
        out.push({ pitchClass: pitch, filePath: `${assetBase}/${base}.mp3` });
      }
    }
  }
  return out;
}

// Baraja in-place (Fisher-Yates).
function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export interface DegreeNoteSelector {
  next(activeNotes: QuestionSample[]): QuestionSample | null;
  reset(): void;
}

// Port de makeDegreeNoteSelector — el corazón pedagógico del sorteo.
export function makeDegreeNoteSelector(): DegreeNoteSelector {
  let groups: Map<string, QuestionSample[]> | null = null;
  let bag: string[] = [];
  let lastPitch: string | null = null;
  let lastFile: string | null = null;
  const pick = <T>(arr: T[]): T => arr[Math.floor(Math.random() * arr.length)];

  function buildGroups(activeNotes: QuestionSample[]): void {
    groups = new Map();
    for (const n of activeNotes) {
      if (!groups.has(n.pitchClass)) groups.set(n.pitchClass, []);
      groups.get(n.pitchClass)!.push(n);
    }
  }

  function refillBag(): void {
    bag = shuffle([...groups!.keys()]);
    // Evita que el primero del nuevo ciclo sea igual al último del anterior.
    if (bag.length > 1 && bag[0] === lastPitch) {
      const j = 1 + Math.floor(Math.random() * (bag.length - 1));
      [bag[0], bag[j]] = [bag[j], bag[0]];
    }
  }

  return {
    next(activeNotes: QuestionSample[]): QuestionSample | null {
      if (!activeNotes || !activeNotes.length) return null;
      if (!groups) buildGroups(activeNotes);
      if (!bag.length) refillBag();

      const pitch = bag.shift()!;
      lastPitch = pitch;

      const samples = groups!.get(pitch)!;
      let sample = pick(samples);
      // Único caso donde un grado puede salir consecutivo: solo hay 1 grado activo.
      // Aun así variamos la octava para que no sea el mismo archivo exacto.
      if (samples.length > 1 && sample.filePath === lastFile) {
        let attempts = 0;
        while (sample.filePath === lastFile && attempts < samples.length * 2) {
          sample = pick(samples);
          attempts += 1;
        }
      }
      lastFile = sample.filePath;
      return sample;
    },
    reset(): void {
      groups = null;
      bag = [];
      lastPitch = null;
      lastFile = null;
    },
  };
}
