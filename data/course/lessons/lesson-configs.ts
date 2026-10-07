/**
 * lesson-configs.ts
 * Configuraciones de validación del Maestro Virtual por lección.
 * El API route usa el campo `validator` para enrutar al validador correcto
 * (ruteo explícito, no por coincidencia de substring en el id).
 */

export type ValidatorKind = 'major-scales' | 'minor-scales' | 'modes' | 'triads' | 'satb' | 'satb-chords' | 'melodic-lines' | 'satb-links';

export interface ValidatorConfig {
  id: string;
  validator: ValidatorKind;
  voiceCount: number;   // 1 = una voz · 4 = SATB
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
  // Lección 6: construcción de los siete acordes en cuatro voces.
  '07-leccion-6': {
    id: '07-leccion-6',
    validator: 'satb-chords',
    voiceCount: 4,
    activeRules: [
      'SATB_NO_CHORDS', 'SATB_FILE_LIMIT', 'SATB_KEY',
      'SATB_VOICE_NOTES', 'SATB_MISSING_VOICE', 'SATB_UNRECOGNIZED',
      'SATB_FOREIGN_NOTE', 'SATB_ENHARMONIC', 'SATB_MISSING_SPELLING',
      'SATB_MISSING_ROOT', 'SATB_MISSING_THIRD', 'SATB_INCOMPLETE_DIMINISHED',
      'SATB_LEADING_TONE_DOUBLED', 'SATB_RANGE', 'SATB_VOICE_CROSSING',
      'SATB_SPACING', 'SATB_CHORD_INFO', 'SATB_MISSING_DEGREE',
      'SATB_DUPLICATE_DEGREE', 'SATB_CHORD_COUNT',
    ],
  },
  // Lección 7: una melodía por archivo, en cualquiera de las voces SATB.
  '08-leccion-7': {
    id: '08-leccion-7',
    validator: 'melodic-lines',
    voiceCount: 1,
    activeRules: [
      'MELODY_NO_NOTES', 'MELODY_SEVERAL_VOICES', 'MELODY_FILE_LIMIT',
      'MELODY_SIMULTANEOUS_NOTES', 'MELODY_KEY', 'MELODY_NOTE_COUNT',
      'MELODY_FOREIGN_NOTE', 'MELODY_ENHARMONIC', 'MELODY_MISSING_SPELLING',
      'MELODY_START_TONIC', 'MELODY_END_TONIC', 'MELODY_RANGE', 'MELODY_SUMMARY',
      'MELODIC_FORBIDDEN_INTERVAL', 'MELODIC_REPEATED_NOTE',
      'MELODIC_LEADING_TONE_OCTAVE', 'MELODIC_DIMINISHED_UNRESOLVED',
      'MELODIC_SUCCESSIVE_LEAPS',
    ],
  },
  '09-leccion-8': {
    id: '09-leccion-8', validator: 'satb-links', voiceCount: 4,
    activeRules: [
      'SATB_NO_CHORDS', 'SATB_FILE_LIMIT', 'SATB_KEY',
      'SATB_VOICE_NOTES', 'SATB_MISSING_VOICE', 'SATB_UNRECOGNIZED',
      'SATB_FOREIGN_NOTE', 'SATB_ENHARMONIC', 'SATB_MISSING_SPELLING',
      'SATB_MISSING_ROOT', 'SATB_MISSING_THIRD', 'SATB_INCOMPLETE_DIMINISHED',
      'SATB_LEADING_TONE_DOUBLED', 'SATB_RANGE', 'SATB_VOICE_CROSSING', 'SATB_SPACING',
      'LINK_CHORD_COUNT', 'LINK_UNASSIGNED', 'LINK_DUPLICATE', 'LINK_MISSING',
      'LINK_UNRECOGNIZED', 'LINK_INFO', 'LINK_LEADING_TONE_SOPRANO',
      'MELODIC_FORBIDDEN_INTERVAL', 'MELODIC_LEADING_TONE_OCTAVE', 'MELODIC_DIMINISHED_UNRESOLVED',
      'HARMONIC_PARALLEL_OCTAVES', 'HARMONIC_CONTRARY_OCTAVES',
      'HARMONIC_PARALLEL_FIFTHS', 'HARMONIC_CONTRARY_FIFTHS', 'HARMONIC_SIMULTANEOUS_LEAPS',
    ],
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
