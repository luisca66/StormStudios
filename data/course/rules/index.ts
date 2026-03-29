/**
 * Catálogo maestro de reglas de armonía.
 *
 * Cada regla es una función pura: recibe el MIDI parseado → retorna
 * la lista de violaciones encontradas.
 *
 * FASE 5: Implementar la lógica real en cada `validate`.
 * Por ahora todas retornan [] (sin errores) para que la interfaz
 * funcione antes de que el motor esté completo.
 */

import type { HarmonyRule } from "@/types/course";

// ─── Helpers internos ─────────────────────────────────────────────────────────

function stub(): HarmonyRule["validate"] {
  return () => [];
}

// ─── Catálogo ─────────────────────────────────────────────────────────────────

export const HARMONY_RULES: Record<string, HarmonyRule> = {
  // ── Conducción de voces ──────────────────────────────────────────────────

  "no-parallel-fifths": {
    id: "no-parallel-fifths",
    name: {
      es: "Sin quintas paralelas",
      en: "No parallel fifths",
    },
    description: {
      es: "Dos voces no pueden moverse en quintas justas paralelas. Es uno de los errores más graves de la armonía clásica.",
      en: "Two voices cannot move in parallel perfect fifths. This is one of the most serious errors in classical harmony.",
    },
    severity: "error",
    introducedInLesson: "leccion-1",
    category: "voice-leading",
    validate: stub(),
  },

  "no-parallel-octaves": {
    id: "no-parallel-octaves",
    name: {
      es: "Sin octavas paralelas",
      en: "No parallel octaves",
    },
    description: {
      es: "Dos voces no pueden moverse en octavas (o unísonos) paralelos.",
      en: "Two voices cannot move in parallel octaves (or unisons).",
    },
    severity: "error",
    introducedInLesson: "leccion-1",
    category: "voice-leading",
    validate: stub(),
  },

  "no-hidden-fifths": {
    id: "no-hidden-fifths",
    name: {
      es: "Sin quintas ocultas (voces externas)",
      en: "No hidden fifths (outer voices)",
    },
    description: {
      es: "El soprano y el bajo no deben alcanzar una quinta justa por movimiento directo.",
      en: "Soprano and bass should not reach a perfect fifth by direct motion.",
    },
    severity: "warning",
    introducedInLesson: "leccion-2",
    category: "voice-leading",
    validate: stub(),
  },

  "contrary-motion-preferred": {
    id: "contrary-motion-preferred",
    name: {
      es: "Movimiento contrario u oblicuo preferido",
      en: "Contrary or oblique motion preferred",
    },
    description: {
      es: "Las voces deben moverse preferentemente en sentido contrario u oblicuo. El movimiento paralelo debe ser la excepción.",
      en: "Voices should preferably move in contrary or oblique motion. Parallel motion should be the exception.",
    },
    severity: "suggestion",
    introducedInLesson: "leccion-2",
    category: "voice-leading",
    validate: stub(),
  },

  "leading-tone-resolution": {
    id: "leading-tone-resolution",
    name: {
      es: "Resolución de la sensible",
      en: "Leading tone resolution",
    },
    description: {
      es: "La sensible (séptimo grado) debe resolver hacia la tónica en las cadencias.",
      en: "The leading tone (seventh degree) must resolve to the tonic at cadences.",
    },
    severity: "error",
    introducedInLesson: "leccion-3",
    category: "voice-leading",
    validate: stub(),
  },

  "seventh-resolution": {
    id: "seventh-resolution",
    name: {
      es: "Resolución de la séptima",
      en: "Seventh chord resolution",
    },
    description: {
      es: "La séptima de un acorde de séptima debe resolver descendiendo por grado conjunto.",
      en: "The seventh of a seventh chord must resolve by descending stepwise motion.",
    },
    severity: "error",
    introducedInLesson: "leccion-5",
    category: "voice-leading",
    validate: stub(),
  },

  // ── Duplicación y disposición ────────────────────────────────────────────

  "voice-range-satb": {
    id: "voice-range-satb",
    name: {
      es: "Rangos vocales SATB",
      en: "SATB voice ranges",
    },
    description: {
      es: "Soprano: C4-G5 / Alto: G3-C5 / Tenor: C3-G4 / Bajo: E2-C4",
      en: "Soprano: C4-G5 / Alto: G3-C5 / Tenor: C3-G4 / Bass: E2-C4",
    },
    severity: "error",
    introducedInLesson: "leccion-1",
    category: "chord-voicing",
    validate: stub(),
  },

  "voice-crossing": {
    id: "voice-crossing",
    name: {
      es: "Sin cruzamiento de voces",
      en: "No voice crossing",
    },
    description: {
      es: "Ninguna voz debe cruzarse con la adyacente (soprano > alto > tenor > bajo).",
      en: "No voice should cross with its neighbor (soprano > alto > tenor > bass).",
    },
    severity: "error",
    introducedInLesson: "leccion-1",
    category: "chord-voicing",
    validate: stub(),
  },

  "voice-overlap": {
    id: "voice-overlap",
    name: {
      es: "Sin superposición de voces",
      en: "No voice overlap",
    },
    description: {
      es: "Ninguna voz debe sobrepasar en el siguiente acorde la nota que tenía la voz superior en el acorde anterior.",
      en: "No voice should exceed in the next chord the note the upper voice had in the previous chord.",
    },
    severity: "warning",
    introducedInLesson: "leccion-2",
    category: "chord-voicing",
    validate: stub(),
  },

  "root-position-doubling": {
    id: "root-position-doubling",
    name: {
      es: "Duplicación en estado fundamental",
      en: "Root position doubling",
    },
    description: {
      es: "En estado fundamental, se duplica preferentemente la fundamental del acorde.",
      en: "In root position, the root of the chord is preferably doubled.",
    },
    severity: "error",
    introducedInLesson: "leccion-3",
    category: "chord-voicing",
    validate: stub(),
  },

  "first-inversion-doubling": {
    id: "first-inversion-doubling",
    name: {
      es: "Duplicación en primera inversión",
      en: "First inversion doubling",
    },
    description: {
      es: "En primera inversión se puede duplicar cualquier nota excepto la tercera (salvo excepciones).",
      en: "In first inversion, any note can be doubled except the third (with exceptions).",
    },
    severity: "warning",
    introducedInLesson: "leccion-4",
    category: "chord-voicing",
    validate: stub(),
  },

  // ── Progresiones armónicas ────────────────────────────────────────────────

  "common-tone-retention": {
    id: "common-tone-retention",
    name: {
      es: "Retención de nota común",
      en: "Common tone retention",
    },
    description: {
      es: "Cuando dos acordes comparten una nota, se retiene esa nota en la misma voz.",
      en: "When two chords share a note, that note is retained in the same voice.",
    },
    severity: "suggestion",
    introducedInLesson: "leccion-3",
    category: "chord-progressions",
    validate: stub(),
  },

  "stepwise-motion-preference": {
    id: "stepwise-motion-preference",
    name: {
      es: "Preferencia por movimiento por grado",
      en: "Preference for stepwise motion",
    },
    description: {
      es: "Las voces intermedias (alto, tenor) deben moverse por grado conjunto o permanecer en la misma nota cuando sea posible.",
      en: "Inner voices (alto, tenor) should move by step or remain on the same note when possible.",
    },
    severity: "suggestion",
    introducedInLesson: "leccion-2",
    category: "chord-progressions",
    validate: stub(),
  },

  "cadence-satb": {
    id: "cadence-satb",
    name: {
      es: "Cadencia auténtica perfecta",
      en: "Perfect authentic cadence",
    },
    description: {
      es: "La cadencia auténtica perfecta requiere V→I con fundamental en el bajo y soprano, y resolución correcta de la sensible.",
      en: "A perfect authentic cadence requires V→I with root in bass and soprano, and correct leading tone resolution.",
    },
    severity: "suggestion",
    introducedInLesson: "leccion-4",
    category: "cadence",
    validate: stub(),
  },
};

/**
 * Obtiene las reglas activas de una lección dada una lista de IDs.
 */
export function getActiveRules(ruleIds: string[]): HarmonyRule[] {
  return ruleIds
    .map((id) => HARMONY_RULES[id])
    .filter((r): r is HarmonyRule => r !== undefined);
}

/**
 * Obtiene todas las reglas por categoría.
 */
export function getRulesByCategory(
  category: HarmonyRule["category"]
): HarmonyRule[] {
  return Object.values(HARMONY_RULES).filter((r) => r.category === category);
}
