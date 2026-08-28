// state.ts — La máquina de estados del viaje (PLAN §7.1). LÓGICA PURA:
// no importa nada de `3d/` ni de `ui/` (regla de dependencias §11), así que se puede
// ejercitar entera desde la consola sin tocar un pixel. Todo efecto —audio, agujas,
// consola— sale por `JourneyPorts`.
//
// F6 implementa el loop SIN el desvío físico: fallar cuesta progreso y racha, pero el
// tren sigue por la línea principal. El ramal gris de §5.5 llega en F7 y solo tendrá
// que engancharse al hueco marcado con DETOUR-F7.

import {
  ANSWER_DISTANCE, DEAD_ZONE_LENGTH, DECISIONS_TO_ARRIVE, DETOUR_COST, POINTS_ARRIVAL,
  POINTS_BASE, POINTS_GALA, POINTS_PER_STREAK, POINTS_PER_UNUSED_WHISTLE,
  POINTS_QUICK_MAX, QUESTION_DUCK_LEVEL, SEGMENT_LENGTH, SILVER_MAX_DETOURS,
  WHISTLE_COUNT, type SpeedSpec,
} from "@/config";
import {
  degreeOfPitchClass, type Degree, type Scale, type Timbre,
} from "@/music/degrees";
import {
  buildQuestionSet, makeDegreeNoteSelector, type DegreeNoteSelector, type QuestionSample,
} from "@/music/selector";

export type Phase =
  | "IDLE" | "DEPARTING" | "ROLLING" | "QUESTION" | "RESOLVED" | "DETOUR" | "ARRIVED";
export type Mark = "correct" | "wrong";
export type Medal = "gold" | "silver" | "bronze";

export interface JourneyConfig {
  scale: Scale;
  degrees: ReadonlySet<Degree>;
  timbre: Timbre;
  speed: SpeedSpec;
}

export interface ResolutionInfo {
  correct: boolean;
  timedOut: boolean;
  /** Grado correcto de la pregunta (SIEMPRE se revela, §7.1). */
  degree: Degree;
  /** Nota escrita de la pregunta, con su ortografía real. */
  pitchClass: string;
  /** Lo que pulsó el jugador; null si se agotó la ventana. */
  answered: Degree | null;
}

export interface ArrivalInfo {
  points: number;
  detours: number;
  medal: Medal;
  gala: boolean;
  bestStreak: number;
  accuracy: number;
  whistlesLeft: number;
}

export interface GameSnapshot {
  phase: Phase;
  progress: number;
  total: number;
  points: number;
  streak: number;
  bestStreak: number;
  whistlesLeft: number;
  whistlesTotal: number;
  detours: number[];
  /** Fracción de ventana restante (1 → recién planteada). null = sin pregunta viva. */
  answerWindow: number | null;
  locked: ReadonlySet<Degree>;
  marks: ReadonlyMap<Degree, Mark>;
  lastResolution: ResolutionInfo | null;
  arrival: ArrivalInfo | null;
}

/** Todo lo que la máquina necesita del mundo exterior. Nada de esto es lógica de juego. */
export interface JourneyPorts {
  playQuestionNote(sample: QuestionSample): void;
  playTonicChord(): void;
  playCorrectSfx(): void;
  playWrongSfx(): void;
  /** Regla de silencio §2.10: 1 = bed normal, <1 = agachado durante la pregunta. */
  duckBed(level: number): void;
  /** Estado visible de la aguja del final del segmento dado. */
  setSwitch(segmentIndex: number, result: "pending" | "correct" | "wrong"): void;
  /** El mundo no genera eventos ambientales mientras hay pregunta viva (§2.10). */
  setAmbientSuppressed(suppressed: boolean): void;
  /**
   * Entra al apartadero: el tren toma el ramal y el mundo se desatura (§5.5).
   * `startDistance` la manda el estado y NO se recalcula fuera: en el caso "sin
   * respuesta" la resolución cae justo al cruzar el límite del segmento, y redondear
   * ahí desde la distancia del tren sitúa el ramal un segmento entero más adelante.
   */
  beginDetour(info: ResolutionInfo, startDistance: number): void;
  /**
   * A mitad del lazo: el re-anclaje del oído. Suena SOLO el acorde de tónica — la nota
   * preguntada no se repite (cambio pedido por Luis sobre el "tónica → nota" de §2.6:
   * volver a soltarla la regala en vez de reanclar). El grado y la nota sí se revelan
   * por escrito en el telegrama.
   */
  playReveal(pitchClass: string): void;
  /** Reincorporación a la línea principal: el color vuelve en 2 s. */
  endDetour(): void;
  onChange(snapshot: GameSnapshot): void;
  onResolved(info: ResolutionInfo): void;
  onArrived(info: ArrivalInfo): void;
}

export class GameStateManager {
  private phase: Phase = "IDLE";
  private config: JourneyConfig | null = null;
  private questionSet: QuestionSample[] = [];
  private readonly selector: DegreeNoteSelector = makeDegreeNoteSelector();

  private progress = 0;
  private points = 0;
  private streak = 0;
  private bestStreak = 0;
  private whistlesLeft = WHISTLE_COUNT;
  private detours: number[] = [];
  private correctCount = 0;
  private answeredCount = 0;
  private readonly stats = new Map<Degree, { correct: number; total: number }>();

  private question: QuestionSample | null = null;
  private questionDegree: Degree | null = null;
  private readonly locked = new Set<Degree>();
  private readonly marks = new Map<Degree, Mark>();

  private segment = 0;
  private answerWindow: number | null = null;
  private lastResolution: ResolutionInfo | null = null;
  private arrival: ArrivalInfo | null = null;
  /** Segmento cuya pregunta ya se resolvió: impide replantearla al mismo tramo. */
  private resolvedSegment = -1;
  /**
   * Apartadero (§5.5). El ramal ocupa EXACTAMENTE un segmento: así la reincorporación
   * cae en un límite de segmento y la pregunta siguiente llega con ventana completa,
   * en vez de a media zona muerta con la mitad del tiempo.
   */
  private detourUntilSegment = -1;
  private detourStart = 0;
  private detourRevealed = false;

  constructor(private readonly ports: JourneyPorts) {}

  // -------------------------------------------------------------------------
  // Ciclo de vida
  // -------------------------------------------------------------------------

  /** Prepara el viaje. El tren NO rueda hasta `beginRolling()` (§7.1: cadencia primero). */
  start(config: JourneyConfig): void {
    this.config = config;
    this.questionSet = buildQuestionSet(config.scale, config.degrees, config.timbre);
    this.selector.reset();

    this.phase = "DEPARTING";
    this.progress = 0;
    this.points = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.whistlesLeft = WHISTLE_COUNT;
    this.detours = [];
    this.correctCount = 0;
    this.answeredCount = 0;
    this.stats.clear();
    this.segment = 0;
    this.answerWindow = null;
    this.lastResolution = null;
    this.arrival = null;
    this.resolvedSegment = -1;
    this.detourUntilSegment = -1;
    this.detourRevealed = false;
    this.clearQuestion();
    this.ports.duckBed(1);
    this.ports.setAmbientSuppressed(false);
    this.ports.endDetour();
    this.emit();
  }

  /** La cadencia terminó: el tren se suelta y empieza a contar el viaje. */
  beginRolling(): void {
    if (this.phase !== "DEPARTING") return;
    this.phase = "ROLLING";
    this.emit();
  }

  stop(): void {
    this.phase = "IDLE";
    this.clearQuestion();
    this.ports.duckBed(1);
    this.ports.setAmbientSuppressed(false);
    this.emit();
  }

  getPhase(): Phase {
    return this.phase;
  }

  isQuestionLive(): boolean {
    return this.phase === "QUESTION";
  }

  // -------------------------------------------------------------------------
  // Tick: la distancia del tren manda. La ventana de respuesta ES distancia (§7.3).
  // -------------------------------------------------------------------------
  tick(_dt: number, distance: number): void {
    if (this.phase === "IDLE" || this.phase === "DEPARTING" || this.phase === "ARRIVED") return;

    const segment = Math.floor(distance / SEGMENT_LENGTH);
    const along = distance - segment * SEGMENT_LENGTH;

    // --- Apartadero: ni preguntas ni agujas hasta reincorporarse (§5.5) ---
    if (this.phase === "DETOUR") {
      // A media vuelta se revela la respuesta y suena tónica → nota (§2.6).
      if (!this.detourRevealed && distance - this.detourStart >= SEGMENT_LENGTH * 0.45) {
        this.detourRevealed = true;
        if (this.lastResolution) this.ports.playReveal(this.lastResolution.pitchClass);
        this.emit();
      }
      if (segment >= this.detourUntilSegment) {
        this.segment = segment;
        this.phase = "ROLLING";
        this.ports.endDetour();
        this.emit();
      }
      return;
    }

    // Cambio de segmento: se cruzó la aguja.
    if (segment !== this.segment) {
      if (this.phase === "QUESTION") {
        // La aguja llegó sin orden (§7.1): desvío con su mensaje propio.
        this.resolve(null, true);
      }
      this.segment = segment;
      // Solo se vuelve a RODANDO desde una resolución cerrada. Antes esto forzaba
      // "ROLLING" siempre, y en el caso "sin respuesta" —que resuelve justo aquí—
      // se comía la fase DETOUR entera: el tren nunca llegaba a tomar el ramal.
      if (this.phase === "RESOLVED") {
        this.phase = "ROLLING";
        this.emit();
      }
    }

    // Señal avanzada: dispara la pregunta al salir de la zona muerta.
    if (this.phase === "ROLLING" && along >= DEAD_ZONE_LENGTH && this.resolvedSegment !== segment) {
      this.askQuestion();
    }

    if (this.phase === "QUESTION") {
      const remaining = SEGMENT_LENGTH - along;
      this.answerWindow = Math.max(0, Math.min(1, remaining / ANSWER_DISTANCE));
      this.emit();
    }
  }

  // -------------------------------------------------------------------------
  // Pregunta y respuesta
  // -------------------------------------------------------------------------

  private askQuestion(): void {
    if (!this.config || this.questionSet.length === 0) return;
    const sample = this.selector.next(this.questionSet);
    if (!sample) return;
    const degree = degreeOfPitchClass(this.config.scale, sample.pitchClass);
    if (!degree) return;

    this.question = sample;
    this.questionDegree = degree;
    this.locked.clear();
    this.marks.clear();
    this.phase = "QUESTION";
    this.answerWindow = 1;

    // Regla de silencio §2.10: nada afinado ni ambiental compite con la pregunta.
    this.ports.duckBed(QUESTION_DUCK_LEVEL);
    this.ports.setAmbientSuppressed(true);
    this.ports.setSwitch(this.segment, "pending");
    this.ports.playQuestionNote(sample);
    this.emit();
  }

  /** Re-escuchar la nota es GRATIS SIEMPRE (§7.4: castigar la re-escucha castiga oír). */
  repeatNote(): void {
    if (this.phase !== "QUESTION" || !this.question) return;
    this.ports.playQuestionNote(this.question);
  }

  /** Silbato-tónica: cuesta 1 y NO pausa la ventana (§7.1, WHISTLE_PAUSES_WINDOW). */
  useWhistle(): boolean {
    if (this.phase !== "QUESTION" || this.whistlesLeft <= 0) return false;
    this.whistlesLeft -= 1;
    this.ports.playTonicChord();
    this.emit();
    return true;
  }

  answer(degree: Degree): void {
    if (this.phase !== "QUESTION" || this.locked.has(degree)) return;
    this.resolve(degree, false);
  }

  private resolve(answered: Degree | null, timedOut: boolean): void {
    const degree = this.questionDegree;
    const sample = this.question;
    if (!degree || !sample) return;

    const correct = answered === degree;
    this.locked.add(degree);
    if (answered) {
      this.locked.add(answered);
      this.marks.set(answered, correct ? "correct" : "wrong");
    }
    // El grado correcto SIEMPRE se marca en verde: la palanca enseña la respuesta.
    if (!correct) this.marks.set(degree, "correct");

    this.answeredCount += 1;
    const stat = this.stats.get(degree) ?? { correct: 0, total: 0 };
    stat.total += 1;
    if (correct) stat.correct += 1;
    this.stats.set(degree, stat);

    if (correct) {
      this.correctCount += 1;
      this.streak += 1;
      this.bestStreak = Math.max(this.bestStreak, this.streak);
      const quick = Math.round(POINTS_QUICK_MAX * (this.answerWindow ?? 0));
      const multiplier = this.config?.speed.scoreMultiplier ?? 1;
      this.points += Math.round(
        (POINTS_BASE + POINTS_PER_STREAK * this.streak + quick) * multiplier,
      );
      this.progress = Math.min(DECISIONS_TO_ARRIVE, this.progress + 1);
      this.ports.setSwitch(this.segment, "correct");
      this.ports.playCorrectSfx();
    } else {
      this.streak = 0;
      this.detours.push(this.progress);
      this.progress = Math.max(0, this.progress - DETOUR_COST);
      this.ports.setSwitch(this.segment, "wrong");
      this.ports.playWrongSfx();
    }

    this.lastResolution = { correct, timedOut, degree, pitchClass: sample.pitchClass, answered };
    this.resolvedSegment = this.segment;
    this.answerWindow = null;
    this.question = null;
    this.questionDegree = null;

    // Se acabó el silencio pedagógico: el mundo vuelve a sonar y a moverse.
    this.ports.duckBed(1);
    this.ports.setAmbientSuppressed(false);
    this.ports.onResolved(this.lastResolution);

    if (correct) {
      this.phase = "RESOLVED";
    } else {
      // El tren TOMA el ramal (§7.1). El lazo ocupa el segmento siguiente entero.
      this.phase = "DETOUR";
      this.detourUntilSegment = this.segment + 2;
      this.detourStart = (this.segment + 1) * SEGMENT_LENGTH;
      this.detourRevealed = false;
      this.ports.beginDetour(this.lastResolution, this.detourStart);
    }

    if (this.progress >= DECISIONS_TO_ARRIVE) this.arrive();
    else this.emit();
  }

  private arrive(): void {
    const multiplier = this.config?.speed.scoreMultiplier ?? 1;
    const detours = this.detours.length;
    const gala = detours === 0 && this.whistlesLeft === WHISTLE_COUNT;

    this.points += Math.round(POINTS_ARRIVAL * multiplier);
    this.points += this.whistlesLeft * POINTS_PER_UNUSED_WHISTLE;
    if (gala) this.points += POINTS_GALA;

    this.arrival = {
      points: this.points,
      detours,
      medal: detours === 0 ? "gold" : detours <= SILVER_MAX_DETOURS ? "silver" : "bronze",
      gala,
      bestStreak: this.bestStreak,
      accuracy: this.answeredCount ? this.correctCount / this.answeredCount : 0,
      whistlesLeft: this.whistlesLeft,
    };
    this.phase = "ARRIVED";
    this.ports.duckBed(1);
    this.ports.setAmbientSuppressed(false);
    this.emit();
    this.ports.onArrived(this.arrival);
  }

  // -------------------------------------------------------------------------

  private clearQuestion(): void {
    this.question = null;
    this.questionDegree = null;
    this.locked.clear();
    this.marks.clear();
    this.answerWindow = null;
  }

  /** Precisión por grado en orden de inserción (F9 la persiste). */
  degreeStats(): Record<string, { correct: number; total: number }> {
    const out: Record<string, { correct: number; total: number }> = {};
    for (const [degree, value] of this.stats) out[degree] = { ...value };
    return out;
  }

  snapshot(): GameSnapshot {
    return {
      phase: this.phase,
      progress: this.progress,
      total: DECISIONS_TO_ARRIVE,
      points: this.points,
      streak: this.streak,
      bestStreak: this.bestStreak,
      whistlesLeft: this.whistlesLeft,
      whistlesTotal: WHISTLE_COUNT,
      detours: [...this.detours],
      answerWindow: this.answerWindow,
      locked: this.locked,
      marks: this.marks,
      lastResolution: this.lastResolution,
      arrival: this.arrival,
    };
  }

  private emit(): void {
    this.ports.onChange(this.snapshot());
  }
}
