/**
 * lesson-configs.ts
 * Configuraciones de validación del Maestro Virtual por lección.
 * El API route usa el campo `validator` para enrutar al validador correcto
 * (ruteo explícito, no por coincidencia de substring en el id).
 */

export type ValidatorKind = 'major-scales' | 'minor-scales' | 'modes' | 'satb';

export interface ValidatorConfig {
  id: string;
  validator: ValidatorKind;
  voiceCount: number;   // 1 = una voz (Soprano) · 4 = SATB
  activeRules: string[];
}

const VALIDATOR_CONFIGS: Record<string, ValidatorConfig> = {
  // ── Lección 1: Escalas Mayores (1 voz) ───────────────────────────────────
  '02-leccion-1': {
    id: '02-leccion-1',
    validator: 'major-scales',
    voiceCount: 1,
    activeRules: [
      'SCALE_COUNT', 'SCALE_NOTE_COUNT', 'SCALE_WRONG_NOTE',
      'SCALE_ENHARMONIC', 'SCALE_DIRECTION', 'SCALE_TONIC_CLOSURE',
    ],
  },

  // ── Lección 2: Modos (1 voz) ─────────────────────────────────────────────
  '03-leccion-2': {
    id: '03-leccion-2',
    validator: 'modes',
    voiceCount: 1,
    activeRules: [
      'MODE_COUNT', 'MODE_WRONG_TONIC', 'MODE_ORDER',
      'MODE_WRONG_NOTE', 'MODE_ENHARMONIC', 'MODE_DIRECTION', 'MODE_TONIC_CLOSURE',
    ],
  },

  // ── Lección 3: Escalas Menores (1 voz) — en construcción, validador listo ──
  '04-leccion-3': {
    id: '04-leccion-3',
    validator: 'minor-scales',
    voiceCount: 1,
    activeRules: [
      'MINOR_COUNT', 'MINOR_ORDER', 'MINOR_NOTE_COUNT',
      'MINOR_WRONG_NOTE', 'MINOR_DIRECTION',
    ],
  },

  // ── Lecciones SATB (4 voces) ──────────────────────────────────────────────
  '05-leccion-4': {
    id: '05-leccion-4',
    validator: 'satb',
    voiceCount: 4,
    activeRules: ['voice-range-satb', 'voice-crossing', 'no-parallel-fifths', 'no-parallel-octaves'],
  },
  '06-leccion-5': {
    id: '06-leccion-5',
    validator: 'satb',
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
