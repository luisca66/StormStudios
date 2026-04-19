/**
 * Tipos TypeScript para el sistema de curso de armonía
 * y el Maestro Virtual
 */

// ─── Internacionalización ─────────────────────────────────────────────────────

export type BilingualText = {
  es: string;
  en: string;
};

// ─── Reglas de Armonía ────────────────────────────────────────────────────────

export type RuleSeverity = "error" | "warning" | "suggestion";
export type RuleCategory =
  | "voice-leading"
  | "chord-voicing"
  | "chord-progressions"
  | "rhythm"
  | "cadence"
  | "modulation"
  | "counterpoint";

export type HarmonyRule = {
  id: string;
  name: BilingualText;
  description: BilingualText;
  severity: RuleSeverity;
  introducedInLesson: string; // slug de la lección donde se introduce
  category: RuleCategory;
  /**
   * Función de validación pura.
   * Recibe el MIDI parseado y contexto de la lección.
   * Retorna lista de errores encontrados.
   */
  validate: (midi: ParsedMidi, context: ValidationContext) => RuleViolation[];
};

// ─── MIDI ─────────────────────────────────────────────────────────────────────

export type MidiNote = {
  pitch: number; // MIDI note number (0-127)
  noteName: string; // e.g. "C4", "G#3"
  startTime: number; // en ticks
  duration: number; // en ticks
  velocity: number; // 0-127
  voice: VoiceName;
  measure: number; // compás (1-indexed)
  beat: number; // tiempo dentro del compás
};

export type VoiceName = "soprano" | "alto" | "tenor" | "bass";

export type ParsedChord = {
  measure: number;
  beat: number;
  notes: MidiNote[];
  voices: Record<VoiceName, MidiNote | null>;
  rootNote?: string;
  chordType?: string;
  inversion?: number;
};

export type ParsedMidi = {
  timeSignature: { numerator: number; denominator: number };
  tempo: number; // BPM
  totalMeasures: number;
  voices: Record<VoiceName, MidiNote[]>;
  chords: ParsedChord[];
  keySignature?: { key: string; mode: "major" | "minor" };
};

// ─── Violaciones y Feedback ───────────────────────────────────────────────────

export type RuleViolation = {
  ruleId: string;
  measure: number;
  beat?: number;
  voices?: VoiceName[];
  message?: string; // mensaje técnico interno
};

export type FeedbackItem = {
  ruleId: string;
  ruleName: BilingualText;
  severity: RuleSeverity;
  measure: number;
  beat?: number;
  voices?: VoiceName[];
  message: BilingualText; // mensaje localizado para el estudiante
};

export type MaestroFeedback = {
  lessonId: string;
  score: number; // 0-100
  passed: boolean;
  violations: FeedbackItem[];
  suggestions: FeedbackItem[];
  summary: BilingualText;
};

// ─── Contexto de Validación ───────────────────────────────────────────────────

export type ValidationContext = {
  lessonId: string;
  keySignature?: string;
  allowedChordTypes?: string[];
  allowedInversions?: string[];
  voiceCount: number;
};

// ─── Ejercicio de la Lección ──────────────────────────────────────────────────

export type ExerciseType =
  | "major-scales"
  | "four-voice-chorale"
  | "two-voice"
  | "melody-harmonization"
  | "figured-bass"
  | "free-composition";

export type ExerciseConfig = {
  type: ExerciseType;
  voiceCount: 1 | 2 | 3 | 4;
  voices?: VoiceName[];
  keySignatures?: string[]; // tonalidades permitidas, ej: ['C', 'G', 'F']
  chordTypes?: string[]; // tipos de acorde, ej: ['major', 'minor']
  inversions?: string[]; // inversiones, ej: ['root', 'first']
  minChords?: number;
  maxChords?: number;
  description?: BilingualText;
};

// ─── Video ────────────────────────────────────────────────────────────────────

export type LessonVideo = {
  youtubeId: string;       // used for 'es' (or both when no EN-specific video)
  youtubeIdEn?: string;    // optional override for the English version
  embedUrl?: string;       // exact embed URL for 'es' (or both when no EN-specific URL)
  embedUrlEn?: string;     // optional exact embed URL override for the English version
  title?: BilingualText;
  description?: BilingualText;
  durationMinutes?: number;
};

// ─── Herramienta / App de la lección ─────────────────────────────────────────

export type LessonToolKind =
  | "sequencer"   // Storm Sequencer
  | "app"         // app web embebida (HTML)
  | "tool"        // herramienta web genérica
  | "link";       // enlace externo o interno

export type LessonTool = {
  kind: LessonToolKind;
  title: BilingualText;
  description: BilingualText;
  /** Ruta interna (/sequencer) o URL completa */
  url: string;
  /** URL override for the English version (falls back to url if omitted) */
  urlEn?: string;
  /** Emoji o ruta a imagen para el ícono */
  icon?: string;
  /** Si true, abre en pestaña nueva */
  external?: boolean;
  /** Si true, muestra la app embebida inline con iframe en lugar de botón */
  embed?: boolean;
  /** Alto del iframe en px cuando embed=true (default: 720) */
  embedHeight?: number;
};

// ─── Lección ──────────────────────────────────────────────────────────────────

export type LessonConfig = {
  id: string;
  slug: string;
  order: number;         // sort order (includes intro/propedeutico)
  lessonNumber?: number; // display number shown to student (1, 2, 3…)
  module?: string;

  // Metadata
  title: BilingualText;
  description: BilingualText;
  estimatedMinutes?: number;

  // Dependencias
  prerequisites?: string[]; // slugs de lecciones previas requeridas

  // Contenido multimedia
  videos?: LessonVideo[];
  videosByLocale?: Partial<Record<"es" | "en", LessonVideo[]>>;
  tools?: LessonTool[];

  // ============================================================
  // LO MÁS IMPORTANTE: reglas activas para el Maestro Virtual
  // Se acumulan lección por lección
  // ============================================================
  activeRules: string[]; // IDs de reglas del catálogo maestro

  // Ejercicio de esta lección
  exercise?: ExerciseConfig;

  // Feedback personalizado por regla violada (templates con {measure}, {voice}, etc.)
  feedback?: Record<string, BilingualText>;

  // SEO
  tags?: string[];
};

// ─── Módulo del Curso ─────────────────────────────────────────────────────────

export type CourseModule = {
  id: string;
  slug: string;
  order: number;
  title: BilingualText;
  description: BilingualText;
  lessons: string[]; // slugs de lecciones en orden
};

// ─── Configuración Global del Curso ──────────────────────────────────────────

export type CourseConfig = {
  id: string;
  title: BilingualText;
  description: BilingualText;
  totalLessons: number;
  modules: CourseModule[];
  instructorName: string;
};

// ─── Progreso del Estudiante (localStorage, sin login) ───────────────────────

export type LessonProgress = {
  lessonId: string;
  completed: boolean;
  completedAt?: string; // ISO date string
  attempts?: number;
};

export type CourseProgress = {
  lessons: Record<string, LessonProgress>;
  lastVisited?: string; // lessonId
};
