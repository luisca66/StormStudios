/**
 * lesson-configs.ts
 * Configuraciones de validación del Maestro Virtual por lección.
 * Usado por el API route para enrutar al validador correcto.
 */

export interface ValidatorConfig {
  id: string;
  voiceCount: number;   // 1 = escalas (soprano solo) → scale-validator; 4 = SATB → rule-engine
  activeRules: string[];
}

const VALIDATOR_CONFIGS: Record<string, ValidatorConfig> = {
  // ── Lección 1: Escalas Mayores (1 voz) ───────────────────────────────────
  'leccion-1': {
    id: 'leccion-1',
    voiceCount: 1,
    activeRules: [
      'SCALE_COUNT', 'SCALE_ORDER', 'SCALE_NOTE_COUNT',
      'SCALE_WRONG_NOTE', 'SCALE_DIRECTION', 'SCALE_TONIC_CLOSURE',
    ],
  },
  '02-leccion-1': {
    id: '02-leccion-1',
    voiceCount: 1,
    activeRules: [
      'SCALE_COUNT', 'SCALE_ORDER', 'SCALE_NOTE_COUNT',
      'SCALE_WRONG_NOTE', 'SCALE_DIRECTION', 'SCALE_TONIC_CLOSURE',
    ],
  },

  // ── Lección 2: Escalas Menores (1 voz) ───────────────────────────────────
  'leccion-2': {
    id: 'leccion-2',
    voiceCount: 1,
    activeRules: [
      'MINOR_COUNT', 'MINOR_ORDER', 'MINOR_NOTE_COUNT',
      'MINOR_WRONG_NOTE', 'MINOR_DIRECTION',
    ],
  },
  '03-leccion-2': {
    id: '03-leccion-2',
    voiceCount: 1,
    activeRules: [
      'MINOR_COUNT', 'MINOR_ORDER', 'MINOR_NOTE_COUNT',
      'MINOR_WRONG_NOTE', 'MINOR_DIRECTION',
    ],
  },

  // ── Lecciones SATB (4 voces) ──────────────────────────────────────────────
  '04-leccion-3': {
    id: '04-leccion-3',
    voiceCount: 4,
    activeRules: ['voice-range-satb', 'voice-crossing', 'no-parallel-fifths', 'no-parallel-octaves'],
  },
  '05-leccion-4': {
    id: '05-leccion-4',
    voiceCount: 4,
    activeRules: ['voice-range-satb', 'voice-crossing', 'no-parallel-fifths', 'no-parallel-octaves'],
  },
  '06-leccion-5': {
    id: '06-leccion-5',
    voiceCount: 4,
    activeRules: ['voice-range-satb', 'voice-crossing', 'no-parallel-fifths', 'no-parallel-octaves'],
  },
};

/**
 * Devuelve la configuración de validación para una lección.
 * Retorna null si el lessonId no está registrado.
 */
export function getLessonConfig(lessonId: string): ValidatorConfig | null {
  return VALIDATOR_CONFIGS[lessonId] ?? null;
}
