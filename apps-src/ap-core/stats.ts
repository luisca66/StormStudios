// ============================================================================
// Estadísticas de Walking AP Multi (dominio puro, sin DOM ni three.js).
// Port de apsuperapp/data y apsuperapp/ui/StatsScreen (Kotlin); la referencia
// está en ../../referencia/kotlin.
// Solo imports relativos (lo corre también el vitest de la raíz).
// ============================================================================
import {
  SEQUENCES,
  TIMBRES,
  errorDistance,
  pitchClassName,
  pitchFromMidi,
  pitchName,
  worldOfLevel,
  type Accidentals,
  type KeyValueStore,
  type Level,
  type Pitch,
  type SequenceId,
  type Timbre,
} from "./progression";

/** Clave única en `KeyValueStore` (`localStorage`) donde se guardan los intentos compactados. */
export const ATTEMPTS_STORAGE_KEY = "walking-ap:attempts:v1";

/** Escenarios / mundos del juego web (1 a 5). */
export type ScenarioId = 1 | 2 | 3 | 4 | 5;

/** Dirección del error: +1 hacia arriba (agudo), -1 hacia abajo (grave), 0 en acierto o tritono. */
export type ErrorDirection = -1 | 0 | 1;

/** Filtro opcional de nivel: número de nivel (`1…147`), objeto `Level`, o `null`/`undefined` para todos. */
export type LevelFilter = number | Level | null | undefined;

/**
 * Un intento (respuesta del alumno) registrado en el juego web.
 * Omite campos exclusivos de la app móvil (contrarreloj y onda sinoidal) e incluye `scenario` (1–5).
 */
export interface Attempt {
  /** Fecha y hora de la respuesta en milisegundos desde epoch. */
  timestamp: number;
  /** Identificador de la sesión (timestamp en ms generado al entrar a entrenar un nivel). */
  sessionId: number;
  /** Secuencia entrenada ("Hombre" o "Mujer"). */
  sequence: SequenceId;
  /** Número de nivel (1…147). */
  level: number;
  /** Escenario o mundo donde se respondió (1…5). */
  scenario: ScenarioId;
  /** Altura correcta que sonó, en número MIDI (40 = E2 … 76 = E5). */
  playedMidi: number;
  /** Clase de altura respondida por el alumno (0 = C … 11 = B). */
  answeredPitchClass: number;
  /** Timbre (instrumento) con el que sonó la pregunta. */
  timbre: Timbre;
  /** `true` si la clase respondida coincide con la de la nota que sonó. */
  correct: boolean;
  /** Distancia del error en semitonos por el camino corto (0 en acierto, 1…6 en error). */
  distance: number;
  /** Dirección del error (+1 arriba, -1 abajo, 0 en acierto o tritono). */
  direction: ErrorDirection;
}

/**
 * Datos de entrada para construir un `Attempt` calculando automáticamente
 * `correct`, `distance`, `direction` y (si se omite) `scenario` y `timestamp`.
 */
export interface CreateAttemptInput {
  /** Fecha en ms (por defecto `Date.now()`). */
  timestamp?: number;
  /** Identificador de la sesión activa. */
  sessionId: number;
  /** Secuencia ("Hombre" o "Mujer"). */
  sequence: SequenceId;
  /** Número de nivel (1…147). */
  level: number;
  /** Escenario (1…5). Si se omite, se infiere del nivel con `worldOfLevel(level)`. */
  scenario?: number;
  /** Altura correcta que sonó, como número MIDI (40…76). */
  playedMidi: number;
  /** Clase de altura respondida por el alumno (0…11). */
  answeredPitchClass: number;
  /** Timbre con el que sonó la pregunta. */
  timbre: Timbre;
}

/**
 * Tupla numérica compacta para serializar cada `Attempt` como arreglo en JSON:
 * `[timestamp, sessionId, seqIndex, level, scenario, playedMidi, answeredPitchClass, timbreIndex, correctBit, distance, direction]`
 */
export type CompactAttemptRow = [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
];

/** Resumen estadístico de una sesión de entrenamiento. */
export interface SessionSummary {
  /** Identificador de la sesión (timestamp en ms al iniciar el nivel). */
  sessionId: number;
  /** Fecha de la sesión en ms (igual a `sessionId`). */
  timestamp: number;
  /** Secuencia a la que pertenece la sesión. */
  sequence: SequenceId;
  /** Número de nivel entrenado en la sesión. */
  level: number;
  /** Total de intentos realizados en la sesión. */
  total: number;
  /** Cantidad de respuestas correctas. */
  correct: number;
  /** Cantidad de respuestas incorrectas (`total - correct`). */
  errors: number;
  /** Porcentaje de aciertos en el rango `0…100`. */
  percentage: number;
  /** Distancia promedio en semitonos de los errores de la sesión (`null` si no hubo errores). */
  avgDistance: number | null;
}

/** Comparación entre la sesión actual y la sesión anterior del mismo nivel. */
export interface SessionComparison {
  /** Métricas de la sesión actual (`null` si aún no tiene respuestas registradas). */
  current: SessionSummary | null;
  /** Métricas de la sesión inmediata anterior del mismo nivel (`null` si no existe). */
  previous: SessionSummary | null;
}

/** Distancia promedio de los errores: histórica total y de los últimos 50 errores. */
export interface ErrorDistanceStats {
  /** Total de intentos evaluados en el filtro. */
  total: number;
  /** Total de aciertos en el filtro. */
  correct: number;
  /** Total de errores en el filtro. */
  errors: number;
  /** Porcentaje global de aciertos (`0…100`, o `0` si `total === 0`). */
  percentage: number;
  /** Distancia promedio en semitonos de todos los errores (`null` si `errors === 0`). */
  avgDistance: number | null;
  /** Distancia promedio en semitonos de los 50 errores más recientes (`null` si `errors === 0`). */
  last50AvgDistance: number | null;
}

/** Tendencia direccional de los errores ("Hacia dónde te vas"). */
export interface ErrorDriftStats {
  /** Errores cuya respuesta cayó por encima de la nota correcta (`direction > 0`). */
  errorsAbove: number;
  /** Errores cuya respuesta cayó por debajo de la nota correcta (`direction < 0`). */
  errorsBelow: number;
  /** Errores a distancia de tritono (`distance === 6`, sin dirección). */
  tritoneErrors: number;
  /** Total de errores con dirección definida (`errorsAbove + errorsBelow`, excluye tritonos). */
  directionalErrors: number;
  /** Fracción (`0…1`) de errores con dirección que se fueron hacia arriba (`null` si `directionalErrors === 0`). */
  aboveRatio: number | null;
  /** Fracción (`0…1`) de errores con dirección que se fueron hacia abajo (`null` si `directionalErrors === 0`). */
  belowRatio: number | null;
  /** Porcentaje (`0…100`) de errores con dirección que se fueron hacia arriba (`null` si `directionalErrors === 0`). */
  abovePercent: number | null;
  /** Porcentaje (`0…100`) de errores con dirección que se fueron hacia abajo (`null` si `directionalErrors === 0`). */
  belowPercent: number | null;
}

/** Precisión para una clase de altura (sin octava, p. ej. C, F#). */
export interface PitchClassAccuracy {
  /** Clase de altura (`0 = C … 11 = B`). */
  pitchClass: number;
  /** Nombre de la clase de altura según la notación solicitada (p. ej. `"F#"` o `"Gb"`). */
  name: string;
  /** Total de veces que sonó esta clase de altura. */
  total: number;
  /** Total de aciertos cuando sonó esta clase de altura. */
  correct: number;
  /** Total de errores (`total - correct`). */
  errors: number;
  /** Porcentaje de aciertos (`0…100`). */
  percentage: number;
  /** Distancia promedio en semitonos de los errores en esta nota (`null` si no hubo errores). */
  avgDistance: number | null;
}

/** Precisión para una altura concreta con octava (p. ej. E2, F#3, C4). */
export interface PitchAccuracy {
  /** Número MIDI de la nota (`40…76`). */
  midi: number;
  /** Objeto `Pitch` correspondiente (`midi`, `pitchClass`, `octave`). */
  pitch: Pitch;
  /** Nombre con octava según la notación solicitada (p. ej. `"F#3"` o `"Gb3"`). */
  name: string;
  /** Total de veces que sonó esta altura. */
  total: number;
  /** Total de aciertos cuando sonó esta altura. */
  correct: number;
  /** Total de errores (`total - correct`). */
  errors: number;
  /** Porcentaje de aciertos (`0…100`). */
  percentage: number;
  /** Distancia promedio en semitonos de los errores en esta altura (`null` si no hubo errores). */
  avgDistance: number | null;
}

/** Precisión desglosada por timbre / instrumento. */
export interface TimbreAccuracy {
  /** Nombre del timbre (`"Piano"`, `"Cello"`, `"Corno"`, `"Coro"`, `"Fagot"`, `"Guitarra"`). */
  timbre: Timbre;
  /** Total de intentos con este timbre. */
  total: number;
  /** Total de aciertos con este timbre. */
  correct: number;
  /** Total de errores (`total - correct`). */
  errors: number;
  /** Porcentaje de aciertos (`0…100`). */
  percentage: number;
  /** Distancia promedio en semitonos de los errores con este timbre (`null` si no hubo errores). */
  avgDistance: number | null;
}

/** Resumen diario de distancia y dirección de errores (para gráficas de evolución por día). */
export interface DailyDistance {
  /** Fecha local en formato `YYYY-MM-DD`. */
  day: string;
  /** Distancia promedio de los errores de ese día (`null` si ese día no hubo errores). */
  avgDistance: number | null;
  /** Cantidad de errores en ese día. */
  errors: number;
  /** Cantidad de aciertos en ese día. */
  correct: number;
  /** Total de intentos en ese día. */
  total: number;
  /** Errores hacia arriba en ese día (`direction > 0`). */
  errorsAbove: number;
  /** Errores hacia abajo en ese día (`direction < 0`). */
  errorsBelow: number;
}

/** Distancia promedio de errores de un nivel (para colorear o detallar el mapa de niveles). */
export interface LevelDistance {
  /** Número de nivel (`1…147`). */
  level: number;
  /** Distancia promedio de los errores en ese nivel (`null` si no hay errores). */
  avgDistance: number | null;
}

/** Etiquetas configurables para exportar el historial a CSV. */
export interface CsvLabels {
  /** Línea de encabezado con los nombres de las columnas separados por coma. */
  header: string;
  /** Etiqueta para error de tritono (`"tritono"` / `"tritone"`). */
  tritone: string;
  /** Etiqueta para error hacia arriba (`"arriba"` / `"above"`). */
  above: string;
  /** Etiqueta para error hacia abajo (`"abajo"` / `"below"`). */
  below: string;
  /** Etiqueta para acierto (`"si"` / `"yes"`). */
  yes: string;
  /** Etiqueta para fallo (`"no"` / `"no"`). */
  no: string;
  /** Mapa opcional para traducir el nombre de la secuencia en el CSV. */
  sequences?: Partial<Record<SequenceId, string>>;
  /** Mapa opcional para traducir el nombre del timbre en el CSV. */
  timbres?: Partial<Record<Timbre, string>>;
}

/**
 * Etiquetas en español (por defecto), siguiendo el mismo orden y formato que `CsvExporter.kt`
 * adaptado a la web (con `escenario` y sin las columnas de contrarreloj).
 */
export const CSV_LABELS_ES: CsvLabels = {
  header:
    "fecha_hora,secuencia,nivel,escenario,timbre,nota_sonada,nota_respondida,correcto,distancia_semitonos,direccion,sesion",
  tritone: "tritono",
  above: "arriba",
  below: "abajo",
  yes: "si",
  no: "no",
  sequences: {
    Hombre: "HOMBRE",
    Mujer: "MUJER",
  },
};

/** Etiquetas en inglés para exportar el CSV cuando la interfaz esté en inglés. */
export const CSV_LABELS_EN: CsvLabels = {
  header:
    "date_time,sequence,level,scenario,timbre,played_note,answered_note,correct,distance_semitones,direction,session",
  tritone: "tritone",
  above: "above",
  below: "below",
  yes: "yes",
  no: "no",
  sequences: {
    Hombre: "MALE",
    Mujer: "FEMALE",
  },
};

// ============================================================================
// Estado interno para sesiones y respaldo en memoria cuando falla localStorage
// ============================================================================

let lastIssuedSessionId = 0;

/**
 * Respaldo en memoria por instancia de `KeyValueStore`.
 * Si `setItem` falla (p. ej. `QuotaExceededError`), los intentos se conservan aquí
 * para no perder datos durante la sesión en el navegador.
 */
const memoryFallbackByStore = new WeakMap<KeyValueStore, Attempt[]>();

function normalizeScenario(value: number | undefined, level: number): ScenarioId {
  const candidate = value !== undefined ? Math.trunc(value) : worldOfLevel(level);
  if (candidate <= 1) return 1;
  if (candidate === 2) return 2;
  if (candidate === 3) return 3;
  if (candidate === 4) return 4;
  return 5;
}

function isScenarioId(value: unknown): value is ScenarioId {
  return value === 1 || value === 2 || value === 3 || value === 4 || value === 5;
}

function isErrorDirection(value: unknown): value is ErrorDirection {
  return value === -1 || value === 0 || value === 1;
}

function isFiniteInteger(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value);
}

function resolveLevelNumber(level: LevelFilter): number | null {
  if (level === null || level === undefined) return null;
  return typeof level === "number" ? level : level.number;
}

function cloneAttempt(a: Attempt): Attempt {
  return { ...a };
}

// ============================================================================
// 1 y 3. Creación de sesiones e intentos
// ============================================================================

/**
 * Genera un identificador único de sesión (timestamp en ms).
 * Se debe llamar cada vez que el alumno entra a entrenar un nivel.
 * Garantiza IDs estrictamente crecientes incluso si se invoca varias veces en el mismo milisegundo.
 */
export function createSessionId(now?: number): number {
  if (now !== undefined && Number.isFinite(now)) {
    const explicit = Math.trunc(now);
    lastIssuedSessionId = Math.max(lastIssuedSessionId, explicit);
    return explicit;
  }
  const current = Date.now();
  lastIssuedSessionId = current > lastIssuedSessionId ? current : lastIssuedSessionId + 1;
  return lastIssuedSessionId;
}

/**
 * Construye un `Attempt` completo a partir de la pregunta y la respuesta del alumno,
 * calculando `correct`, `distance` y `direction` con `errorDistance` de `progression.ts`.
 */
export function createAttempt(input: CreateAttemptInput): Attempt {
  const playedPitch = pitchFromMidi(input.playedMidi);
  const answeredPitchClass = ((Math.trunc(input.answeredPitchClass) % 12) + 12) % 12;
  const dist = errorDistance(answeredPitchClass, playedPitch.pitchClass);
  const correct = dist.semitones === 0;
  const direction = (
    dist.direction > 0 ? 1 : dist.direction < 0 ? -1 : 0
  ) as ErrorDirection;

  return {
    timestamp: input.timestamp !== undefined ? Math.trunc(input.timestamp) : Date.now(),
    sessionId: Math.trunc(input.sessionId),
    sequence: input.sequence,
    level: Math.trunc(input.level),
    scenario: normalizeScenario(input.scenario, input.level),
    playedMidi: Math.trunc(input.playedMidi),
    answeredPitchClass,
    timbre: input.timbre,
    correct,
    distance: dist.semitones,
    direction,
  };
}

// ============================================================================
// 2. Codificación compacta y almacén sobre KeyValueStore
// ============================================================================

/**
 * Convierte un `Attempt` en su tupla compacta de 11 números.
 */
export function attemptToCompactRow(attempt: Attempt): CompactAttemptRow {
  const seqIdx = SEQUENCES.indexOf(attempt.sequence);
  const timbreIdx = TIMBRES.indexOf(attempt.timbre);
  return [
    Math.trunc(attempt.timestamp),
    Math.trunc(attempt.sessionId),
    seqIdx >= 0 ? seqIdx : 0,
    Math.trunc(attempt.level),
    attempt.scenario,
    Math.trunc(attempt.playedMidi),
    Math.trunc(attempt.answeredPitchClass),
    timbreIdx >= 0 ? timbreIdx : 0,
    attempt.correct ? 1 : 0,
    Math.trunc(attempt.distance),
    attempt.direction,
  ];
}

/**
 * Reconstruye un `Attempt` desde una fila compacta. Devuelve `null` si la fila es inválida.
 */
export function compactRowToAttempt(row: unknown): Attempt | null {
  if (!Array.isArray(row) || row.length !== 11) {
    return null;
  }
  const [
    timestamp,
    sessionId,
    seqIdx,
    level,
    scenario,
    playedMidi,
    answeredPitchClass,
    timbreIdx,
    correctBit,
    distance,
    direction,
  ] = row;

  if (
    !isFiniteInteger(timestamp) ||
    timestamp < 0 ||
    !isFiniteInteger(sessionId) ||
    sessionId < 0 ||
    !isFiniteInteger(seqIdx) ||
    seqIdx < 0 ||
    seqIdx >= SEQUENCES.length ||
    !isFiniteInteger(level) ||
    level < 1 ||
    level > 147 ||
    !isScenarioId(scenario) ||
    !isFiniteInteger(playedMidi) ||
    playedMidi < 0 ||
    playedMidi > 127 ||
    !isFiniteInteger(answeredPitchClass) ||
    answeredPitchClass < 0 ||
    answeredPitchClass > 11 ||
    !isFiniteInteger(timbreIdx) ||
    timbreIdx < 0 ||
    timbreIdx >= TIMBRES.length ||
    (correctBit !== 0 && correctBit !== 1) ||
    !isFiniteInteger(distance) ||
    distance < 0 ||
    distance > 6 ||
    !isErrorDirection(direction)
  ) {
    return null;
  }

  return {
    timestamp,
    sessionId,
    sequence: SEQUENCES[seqIdx],
    level,
    scenario,
    playedMidi,
    answeredPitchClass,
    timbre: TIMBRES[timbreIdx],
    correct: correctBit === 1,
    distance,
    direction,
  };
}

/**
 * Codifica una lista de `Attempt` como JSON compacto de arreglo de arreglos.
 */
export function encodeAttempts(attempts: readonly Attempt[]): string {
  const rows: CompactAttemptRow[] = attempts.map(attemptToCompactRow);
  return JSON.stringify(rows);
}

/**
 * Decodifica el JSON compacto de intentos.
 * Si el texto es nulo, vacío, corrupto o alguna fila no cumple el esquema, devuelve `[]` y nunca lanza.
 */
export function decodeAttempts(raw: string | null | undefined): Attempt[] {
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const result: Attempt[] = [];
    for (const item of parsed) {
      const attempt = compactRowToAttempt(item);
      if (attempt === null) {
        return [];
      }
      result.push(attempt);
    }
    return result;
  } catch {
    return [];
  }
}

/**
 * Carga todos los intentos desde `store` (clave `walking-ap:attempts:v1`).
 * Si el último guardado falló por cuota llena, devuelve la copia conservada en memoria.
 * Datos ausentes o corruptos → `[]`. Nunca lanza.
 */
export function loadAttempts(store: KeyValueStore): Attempt[] {
  const fallback = memoryFallbackByStore.get(store);
  if (fallback !== undefined) {
    return fallback.map(cloneAttempt);
  }
  try {
    const raw = store.getItem(ATTEMPTS_STORAGE_KEY);
    return decodeAttempts(raw);
  } catch {
    return [];
  }
}

/**
 * Guarda la lista de intentos en `store` usando codificación compacta (arreglo de arreglos).
 * Nunca lanza: si `store.setItem` falla (p. ej. cuota llena), conserva los intentos en memoria
 * para ese `store` y devuelve `false`; si se persiste con éxito, devuelve `true`.
 */
export function saveAttempts(store: KeyValueStore, attempts: readonly Attempt[]): boolean {
  const snapshot = attempts.map(cloneAttempt);
  try {
    const encoded = encodeAttempts(snapshot);
    store.setItem(ATTEMPTS_STORAGE_KEY, encoded);
    memoryFallbackByStore.delete(store);
    return true;
  } catch {
    memoryFallbackByStore.set(store, snapshot);
    return false;
  }
}

/**
 * Registra un nuevo intento (o construye uno desde `CreateAttemptInput`), lo añade al almacén
 * y lo persiste. Si la cuota de `localStorage` está llena, el intento se conserva en memoria
 * y `saved` es `false`. Nunca lanza.
 */
export function recordAttempt(
  store: KeyValueStore,
  input: Attempt | CreateAttemptInput,
): { attempt: Attempt; attempts: Attempt[]; saved: boolean } {
  const attempt: Attempt =
    "correct" in input && "distance" in input && "direction" in input && "timestamp" in input && input.timestamp !== undefined && "scenario" in input && isScenarioId(input.scenario)
      ? cloneAttempt(input as Attempt)
      : createAttempt(input);
  const current = loadAttempts(store);
  current.push(attempt);
  const saved = saveAttempts(store, current);
  return { attempt, attempts: current, saved };
}

/**
 * Borra todos los intentos tanto de la memoria asociada a `store` como del almacenamiento persistente.
 * Nunca lanza.
 */
export function clearAttempts(store: KeyValueStore): void {
  memoryFallbackByStore.delete(store);
  try {
    const removable = store as KeyValueStore & { removeItem?: (key: string) => void };
    if (typeof removable.removeItem === "function") {
      removable.removeItem(ATTEMPTS_STORAGE_KEY);
    } else {
      store.setItem(ATTEMPTS_STORAGE_KEY, "[]");
    }
  } catch {
    memoryFallbackByStore.set(store, []);
  }
}

/**
 * Almacén con estado en memoria respaldado por `KeyValueStore` (`localStorage`).
 * Conserva siempre los intentos en memoria aunque la cuota de `localStorage` se llene.
 */
export class AttemptStore {
  private cache: Attempt[];

  constructor(private readonly store: KeyValueStore) {
    this.cache = loadAttempts(store);
  }

  /** Devuelve una copia de todos los intentos registrados. */
  getAll(): Attempt[] {
    return this.cache.map(cloneAttempt);
  }

  /** Número total de intentos guardados. */
  count(): number {
    return this.cache.length;
  }

  /**
   * Añade un intento (ya construido o mediante `CreateAttemptInput`) y lo intenta persistir.
   * Devuelve `true` si se guardó en `KeyValueStore` o `false` si solo quedó en memoria por cuota llena.
   */
  record(input: Attempt | CreateAttemptInput): { attempt: Attempt; saved: boolean } {
    const attempt: Attempt =
      "correct" in input && "distance" in input && "direction" in input && "timestamp" in input && input.timestamp !== undefined && "scenario" in input && isScenarioId(input.scenario)
        ? cloneAttempt(input as Attempt)
        : createAttempt(input);
    this.cache.push(attempt);
    const saved = saveAttempts(this.store, this.cache);
    return { attempt, saved };
  }

  /** Reemplaza la lista completa de intentos. Devuelve `false` si la cuota está llena. */
  replaceAll(attempts: readonly Attempt[]): boolean {
    this.cache = attempts.map(cloneAttempt);
    return saveAttempts(this.store, this.cache);
  }

  /** Borra todos los intentos en memoria y en el `KeyValueStore`. */
  clear(): void {
    this.cache = [];
    clearAttempts(this.store);
  }
}

// ============================================================================
// 4. Métricas (filtrables por secuencia y, opcionalmente, por nivel)
// ============================================================================

/**
 * Filtra los intentos por secuencia y, opcionalmente, por nivel.
 * Preserva el orden cronológico ascendente (`timestamp` ascendente y posición original como desempate).
 */
export function filterAttempts(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
): Attempt[] {
  const levelNum = resolveLevelNumber(level);
  const indexed: Array<{ attempt: Attempt; index: number }> = [];
  for (let i = 0; i < attempts.length; i++) {
    const a = attempts[i];
    if (a.sequence !== sequence) continue;
    if (levelNum !== null && a.level !== levelNum) continue;
    indexed.push({ attempt: a, index: i });
  }
  indexed.sort((x, y) =>
    x.attempt.timestamp !== y.attempt.timestamp
      ? x.attempt.timestamp - y.attempt.timestamp
      : x.index - y.index,
  );
  return indexed.map((item) => item.attempt);
}

function buildSessionSummary(
  sessionId: number,
  sequence: SequenceId,
  level: number,
  group: readonly Attempt[],
): SessionSummary {
  const total = group.length;
  let correct = 0;
  let errorDistSum = 0;
  let measuredErrors = 0;

  for (const a of group) {
    if (a.correct) {
      correct++;
    } else {
      errorDistSum += a.distance;
      measuredErrors++;
    }
  }

  const errors = total - correct;
  const percentage = total > 0 ? (correct / total) * 100 : 0;
  const avgDistance = measuredErrors > 0 ? errorDistSum / measuredErrors : null;

  return {
    sessionId,
    timestamp: sessionId,
    sequence,
    level,
    total,
    correct,
    errors,
    percentage,
    avgDistance,
  };
}

/**
 * Historial de sesiones (port de `AttemptDao.sessions`), filtrable por secuencia y opcionalmente por nivel.
 * Agrupa por `(sessionId, level)` y ordena de la sesión más reciente a la más antigua (`sessionId DESC`).
 */
export function sessionHistory(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
): SessionSummary[] {
  const filtered = filterAttempts(attempts, sequence, level);
  const groups = new Map<string, { sessionId: number; level: number; items: Attempt[] }>();

  for (const a of filtered) {
    const key = `${a.sessionId}:${a.level}`;
    let entry = groups.get(key);
    if (!entry) {
      entry = { sessionId: a.sessionId, level: a.level, items: [] };
      groups.set(key, entry);
    }
    entry.items.push(a);
  }

  const summaries: SessionSummary[] = [];
  for (const { sessionId, level: lvl, items } of groups.values()) {
    summaries.push(buildSessionSummary(sessionId, sequence, lvl, items));
  }

  summaries.sort((a, b) =>
    b.sessionId !== a.sessionId ? b.sessionId - a.sessionId : b.level - a.level,
  );
  return summaries;
}

/**
 * Porcentaje de aciertos y distancia promedio de una sesión y de la sesión anterior del mismo nivel
 * (port de `AttemptDao.recentSessions` y `TrainingScreen.kt`).
 *
 * - Si se pasa `currentSessionId`, `current` es esa sesión (o `null` si aún no tiene respuestas)
 *   y `previous` es la sesión más reciente con `sessionId < currentSessionId` del mismo nivel.
 * - Si se omite `currentSessionId`, toma como `current` la sesión más reciente del filtro
 *   y como `previous` la inmediata anterior del mismo nivel.
 */
export function sessionComparison(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
  currentSessionId?: number,
): SessionComparison {
  const allSessions = sessionHistory(attempts, sequence, level);

  if (currentSessionId !== undefined) {
    const current = allSessions.find((s) => s.sessionId === currentSessionId) ?? null;
    const targetLevel = resolveLevelNumber(level) ?? current?.level ?? null;
    const previous =
      allSessions.find(
        (s) =>
          s.sessionId < currentSessionId &&
          (targetLevel === null || s.level === targetLevel),
      ) ?? null;
    return { current, previous };
  }

  const current = allSessions[0] ?? null;
  if (!current) {
    return { current: null, previous: null };
  }
  const previous =
    allSessions.find((s) => s.sessionId < current.sessionId && s.level === current.level) ?? null;
  return { current, previous };
}

/**
 * Distancia promedio de los errores (solo errores): total histórica y de los últimos 50 errores
 * (port de `AttemptDao.levelSummary` y `StatsScreen.globalSummary`).
 * Si no hay errores, `avgDistance` y `last50AvgDistance` son `null`.
 */
export function errorDistanceStats(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
): ErrorDistanceStats {
  const filtered = filterAttempts(attempts, sequence, level);
  const total = filtered.length;
  const errorDistances: number[] = [];

  for (const a of filtered) {
    if (!a.correct) {
      errorDistances.push(a.distance);
    }
  }

  const errors = errorDistances.length;
  const correct = total - errors;
  const percentage = total > 0 ? (correct / total) * 100 : 0;

  if (errors === 0) {
    return {
      total,
      correct,
      errors: 0,
      percentage,
      avgDistance: null,
      last50AvgDistance: null,
    };
  }

  const totalSum = errorDistances.reduce((acc, d) => acc + d, 0);
  const avgDistance = totalSum / errors;

  const last50 = errorDistances.slice(-50);
  const last50Sum = last50.reduce((acc, d) => acc + d, 0);
  const last50AvgDistance = last50Sum / last50.length;

  return {
    total,
    correct,
    errors,
    percentage,
    avgDistance,
    last50AvgDistance,
  };
}

/**
 * Hacia dónde se va el oído del alumno: parte de errores hacia arriba y hacia abajo,
 * excluyendo tritonos (`distance === 6` / `direction === 0`), que no tienen dirección.
 */
export function errorDrift(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
): ErrorDriftStats {
  const filtered = filterAttempts(attempts, sequence, level);
  let errorsAbove = 0;
  let errorsBelow = 0;
  let tritoneErrors = 0;

  for (const a of filtered) {
    if (a.correct) continue;
    if (a.distance === 6 || a.direction === 0) {
      tritoneErrors++;
    } else if (a.direction > 0) {
      errorsAbove++;
    } else if (a.direction < 0) {
      errorsBelow++;
    }
  }

  const directionalErrors = errorsAbove + errorsBelow;
  if (directionalErrors === 0) {
    return {
      errorsAbove,
      errorsBelow,
      tritoneErrors,
      directionalErrors: 0,
      aboveRatio: null,
      belowRatio: null,
      abovePercent: null,
      belowPercent: null,
    };
  }

  const aboveRatio = errorsAbove / directionalErrors;
  const belowRatio = errorsBelow / directionalErrors;

  return {
    errorsAbove,
    errorsBelow,
    tritoneErrors,
    directionalErrors,
    aboveRatio,
    belowRatio,
    abovePercent: aboveRatio * 100,
    belowPercent: belowRatio * 100,
  };
}

/**
 * Precisión por clase de altura (sin octava: C, C#, D… B), ordenada cromáticamente de 0 (C) a 11 (B).
 * Devuelve únicamente las clases de altura que tienen al menos un intento en el filtro.
 */
export function accuracyByPitchClass(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
  accidentals: Accidentals = "sharps",
): PitchClassAccuracy[] {
  const filtered = filterAttempts(attempts, sequence, level);
  const buckets = new Map<
    number,
    { total: number; correct: number; errorDistSum: number; errorCount: number }
  >();

  for (const a of filtered) {
    const pc = pitchFromMidi(a.playedMidi).pitchClass;
    let b = buckets.get(pc);
    if (!b) {
      b = { total: 0, correct: 0, errorDistSum: 0, errorCount: 0 };
      buckets.set(pc, b);
    }
    b.total++;
    if (a.correct) {
      b.correct++;
    } else {
      b.errorDistSum += a.distance;
      b.errorCount++;
    }
  }

  return Array.from(buckets.entries())
    .sort(([pcA], [pcB]) => pcA - pcB)
    .map(([pitchClass, b]) => ({
      pitchClass,
      name: pitchClassName(pitchClass, accidentals),
      total: b.total,
      correct: b.correct,
      errors: b.total - b.correct,
      percentage: (b.correct / b.total) * 100,
      avgDistance: b.errorCount > 0 ? b.errorDistSum / b.errorCount : null,
    }));
}

/**
 * Precisión por altura con octava (p. ej. E2, F#3, C4; port de `AttemptDao.perNoteAccuracy`),
 * ordenada de grave a agudo por número MIDI ascendente.
 * Devuelve únicamente las alturas que tienen al menos un intento en el filtro.
 */
export function accuracyByPitch(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
  accidentals: Accidentals = "sharps",
): PitchAccuracy[] {
  const filtered = filterAttempts(attempts, sequence, level);
  const buckets = new Map<
    number,
    { total: number; correct: number; errorDistSum: number; errorCount: number }
  >();

  for (const a of filtered) {
    let b = buckets.get(a.playedMidi);
    if (!b) {
      b = { total: 0, correct: 0, errorDistSum: 0, errorCount: 0 };
      buckets.set(a.playedMidi, b);
    }
    b.total++;
    if (a.correct) {
      b.correct++;
    } else {
      b.errorDistSum += a.distance;
      b.errorCount++;
    }
  }

  return Array.from(buckets.entries())
    .sort(([midiA], [midiB]) => midiA - midiB)
    .map(([midi, b]) => {
      const pitch = pitchFromMidi(midi);
      return {
        midi,
        pitch,
        name: pitchName(pitch, accidentals),
        total: b.total,
        correct: b.correct,
        errors: b.total - b.correct,
        percentage: (b.correct / b.total) * 100,
        avgDistance: b.errorCount > 0 ? b.errorDistSum / b.errorCount : null,
      };
    });
}

/**
 * Precisión por timbre / instrumento, ordenada según el orden canónico de `TIMBRES`.
 * Devuelve los timbres que tienen al menos un intento en el filtro.
 */
export function accuracyByTimbre(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
): TimbreAccuracy[] {
  const filtered = filterAttempts(attempts, sequence, level);
  const buckets = new Map<
    Timbre,
    { total: number; correct: number; errorDistSum: number; errorCount: number }
  >();

  for (const a of filtered) {
    let b = buckets.get(a.timbre);
    if (!b) {
      b = { total: 0, correct: 0, errorDistSum: 0, errorCount: 0 };
      buckets.set(a.timbre, b);
    }
    b.total++;
    if (a.correct) {
      b.correct++;
    } else {
      b.errorDistSum += a.distance;
      b.errorCount++;
    }
  }

  return Array.from(buckets.entries())
    .sort(([tA], [tB]) => TIMBRES.indexOf(tA) - TIMBRES.indexOf(tB))
    .map(([timbre, b]) => ({
      timbre,
      total: b.total,
      correct: b.correct,
      errors: b.total - b.correct,
      percentage: (b.correct / b.total) * 100,
      avgDistance: b.errorCount > 0 ? b.errorDistSum / b.errorCount : null,
    }));
}

/**
 * Evolución diaria de la distancia de los errores y su dirección (port de `AttemptDao.dailyErrorDistance`),
 * agrupada por fecha local (`YYYY-MM-DD`) en orden cronológico ascendente.
 */
export function dailyErrorDistance(
  attempts: readonly Attempt[],
  sequence: SequenceId,
  level?: LevelFilter,
): DailyDistance[] {
  const filtered = filterAttempts(attempts, sequence, level);
  const buckets = new Map<
    string,
    {
      total: number;
      correct: number;
      errors: number;
      errorDistSum: number;
      errorsAbove: number;
      errorsBelow: number;
    }
  >();

  for (const a of filtered) {
    const day = formatLocalDay(a.timestamp);
    let b = buckets.get(day);
    if (!b) {
      b = { total: 0, correct: 0, errors: 0, errorDistSum: 0, errorsAbove: 0, errorsBelow: 0 };
      buckets.set(day, b);
    }
    b.total++;
    if (a.correct) {
      b.correct++;
    } else {
      b.errors++;
      b.errorDistSum += a.distance;
      if (a.direction > 0) b.errorsAbove++;
      else if (a.direction < 0) b.errorsBelow++;
    }
  }

  return Array.from(buckets.entries())
    .sort(([dayA], [dayB]) => (dayA < dayB ? -1 : dayA > dayB ? 1 : 0))
    .map(([day, b]) => ({
      day,
      avgDistance: b.errors > 0 ? b.errorDistSum / b.errors : null,
      errors: b.errors,
      correct: b.correct,
      total: b.total,
      errorsAbove: b.errorsAbove,
      errorsBelow: b.errorsBelow,
    }));
}

/**
 * Distancia promedio de los errores por nivel en una secuencia (port de `AttemptDao.levelDistances`).
 */
export function levelDistances(
  attempts: readonly Attempt[],
  sequence: SequenceId,
): LevelDistance[] {
  const filtered = filterAttempts(attempts, sequence);
  const buckets = new Map<number, { errorDistSum: number; errors: number }>();

  for (const a of filtered) {
    let b = buckets.get(a.level);
    if (!b) {
      b = { errorDistSum: 0, errors: 0 };
      buckets.set(a.level, b);
    }
    if (!a.correct) {
      b.errorDistSum += a.distance;
      b.errors++;
    }
  }

  return Array.from(buckets.entries())
    .sort(([lvlA], [lvlB]) => lvlA - lvlB)
    .map(([level, b]) => ({
      level,
      avgDistance: b.errors > 0 ? b.errorDistSum / b.errors : null,
    }));
}

// ============================================================================
// 5. Exportar CSV (port de CsvExporter.kt)
// ============================================================================

function pad2(n: number): string {
  return n < 10 ? `0${n}` : `${n}`;
}

function formatLocalDay(ms: number): string {
  const d = new Date(ms);
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

/**
 * Formatea un timestamp (ms) como `yyyy-MM-dd HH:mm:ss` en la zona horaria local,
 * igual que `ROW_TIME_FORMAT` en `CsvExporter.kt`.
 */
export function formatCsvDateTime(ms: number): string {
  const d = new Date(ms);
  const datePart = `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  const timePart = `${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`;
  return `${datePart} ${timePart}`;
}

/**
 * Escapa un valor para CSV según RFC 4180 (idéntico a `CsvExporter.escapeCsv` en Kotlin):
 * si contiene comas, comillas dobles o saltos de línea, lo encierra entre comillas y duplica las comillas internas.
 */
export function escapeCsv(value: string): string {
  if (
    value.includes(",") ||
    value.includes('"') ||
    value.includes("\n") ||
    value.includes("\r")
  ) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

/**
 * Exporta los intentos a formato CSV (port de `CsvExporter.toCsv`).
 *
 * Columnas (en orden):
 * `fecha_hora,secuencia,nivel,escenario,timbre,nota_sonada,nota_respondida,correcto,distancia_semitonos,direccion,sesion`
 */
export function exportAttemptsToCsv(
  attempts: readonly Attempt[],
  labels: CsvLabels = CSV_LABELS_ES,
): string {
  const lines: string[] = [labels.header];

  for (const a of attempts) {
    const dateTime = formatCsvDateTime(a.timestamp);
    const sequenceText = labels.sequences?.[a.sequence] ?? a.sequence;
    const timbreText = labels.timbres?.[a.timbre] ?? a.timbre;
    const playedName = pitchName(pitchFromMidi(a.playedMidi), "sharps");
    const answeredName = pitchClassName(a.answeredPitchClass, "sharps");
    const correctText = a.correct ? labels.yes : labels.no;
    const distanceText = String(a.distance);

    let directionLabel = "";
    if (!a.correct) {
      if (a.distance === 6 || a.direction === 0) {
        directionLabel = labels.tritone;
      } else if (a.direction > 0) {
        directionLabel = labels.above;
      } else if (a.direction < 0) {
        directionLabel = labels.below;
      }
    }

    const sessionText = a.sessionId > 0 ? formatCsvDateTime(a.sessionId) : "";

    const fields = [
      dateTime,
      sequenceText,
      String(a.level),
      String(a.scenario),
      timbreText,
      playedName,
      answeredName,
      correctText,
      distanceText,
      directionLabel,
      sessionText,
    ];

    lines.push(fields.map(escapeCsv).join(","));
  }

  return `${lines.join("\n")}\n`;
}
