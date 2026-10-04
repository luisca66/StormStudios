/**
 * lesson-configs.ts
 * Configuraciones de validación del Maestro Virtual por lección.
 * El API route usa el campo `validator` para enrutar al validador correcto
 * (ruteo explícito, no por coincidencia de substring en el id).
 */

export type ValidatorKind = 'major-scales' | 'minor-scales' | 'modes' | 'triads' | 'satb';

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
      'MINOR_WRONG_NOTE', 'MINOR_ENHARMONIC', 'MINOR_DIRECTION',
    ],
  },

  // ── Lección 4: Tríadas en estado fundamental (3 notas simultáneas) ────────
  '05-leccion-4': {
    id: '05-leccion-4',
    validator: 'triads',
    voiceCount: 1,
    activeRules: ['TRIAD_MISSING_SCALE', 'TRIAD_DUPLICATE_SCALE', 'TRIAD_AMBIGUOUS_SCALE', 'TRIAD_UNRECOGNIZED', 'TRIAD_MISSING_CHORD', 'TRIAD_EXTRA_CHORD', 'TRIAD_NOTE_COUNT', 'TRIAD_WRONG_NOTE', 'TRIAD_ENHARMONIC', 'TRIAD_MISSING_SPELLING'],
  },
};

/**
 * Devuelve la configuración de validación para una lección.
 * Retorna null si el lessonId no está registrado.
 */
export function getLessonConfig(lessonId: string): ValidatorConfig | null {
  return Object.prototype.hasOwnProperty.call(VALIDATOR_CONFIGS, lessonId)
    ? VALIDATOR_CONFIGS[lessonId]
    : null;
}
