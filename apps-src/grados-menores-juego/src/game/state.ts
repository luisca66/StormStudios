// state.ts — La máquina de estados del viaje (PLAN §7.1). LÓGICA PURA: no importa nada
// de `3d/` ni de `ui/` (regla de dependencias §11), así que se puede ejercitar entera
// desde la consola sin pintar un pixel. Todo efecto —audio, anillos, consola— sale por
// `JourneyPorts`.
//
// F7 completó el loop con la DERIVA física: fallar echa al cometa fuera de la ruta, a un
// lazo por la nebulosa oscura que ocupa un segmento entero (§5.5) y donde se revela la
// respuesta. El lazo ocupa EXACTAMENTE un segmento a propósito: así la reincorporación
// cae en un límite de segmento y la pregunta siguiente llega con ventana COMPLETA, en
// vez de a media zona muerta con la mitad del tiempo.

import {
  ANSWER_DISTANCE, DEAD_ZONE_LENGTH, DECISIONS_TO_ARRIVE, DRIFT_COST, POINTS_ARRIVAL,
  POINTS_BASE, POINTS_GALA, POINTS_PER_STREAK, POINTS_PER_UNUSED_BEACON,
  POINTS_QUICK_MAX, QUESTION_DUCK_LEVEL, SEGMENT_LENGTH, SILVER_MAX_DRIFTS,
  BEACON_COUNT, type SpeedSpec,
} from "@/config";
import { degreeOfPitchClass, type Degree, type Scale, type Timbre } from "@/music/degrees";
import {
  buildQuestionSet, makeDegreeNoteSelector, type DegreeNoteSelector, type QuestionSample,
} from "@/music/selector";

export type Phase =
  | "IDLE" | "DEPARTING" | "ROLLING" | "QUESTION" | "RESOLVED" | "DRIFT" | "ARRIVED";
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
  /**
   * ¿La confusión fue dentro de un par mutable (VI↔VImel, VIIST↔VIIsen)? Es el momento
   * pedagógico propio del modo menor (§2.7): F7 lo usará para comparar las dos notas.
   */
  mutableMix: boolean;
}

export interface ArrivalInfo {
  points: number;
  drifts: number;
  medal: Medal;
  gala: boolean;
  bestStreak: number;
  accuracy: number;
  beaconsLeft: number;
}

export interface GameSnapshot {
  phase: Phase;
  progress: number;
  total: number;
  points: number;
  streak: number;
  bestStreak: number;
  beaconsLeft: number;
  beaconsTotal: number;
  drifts: number[];
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
  /** Regla de silencio §2.11: 1 = bed normal, <1 = agachado durante la pregunta. */
  duckBed(level: number): void;
  /** Estado visible del anillo del final del segmento dado. */
  setRing(segmentIndex: number, result: "pending" | "correct" | "wrong"): void;
  /** El mundo no genera eventos ambientales mientras hay pregunta viva (§2.11). */
  setAmbientSuppressed(suppressed: boolean): void;
  /** Slingshot al acertar: el empujón de gravedad (§7.1). */
  slingshot(): void;
  /**
   * Entra en la deriva: el cometa sale de la ruta y el mundo se apaga (§5.5).
   * `startDistance` la manda el ESTADO y no se recalcula fuera: en el caso "sin
   * respuesta" la resolución cae justo al cruzar el límite del segmento, y redondear
   * ahí desde la distancia del cometa situaría el lazo un segmento entero más adelante.
   */
  beginDrift(info: ResolutionInfo, startDistance: number): void;
  /**
   * A media deriva, el re-anclaje del oído (§2.6–2.7). Suena la tónica y, si la
   * confusión fue de par mutable, las DOS hermanas seguidas para compararlas.
   */
  playReveal(info: ResolutionInfo): void;
  /** Reincorporación a la ruta: el color vuelve en 2 s. */
  endDrift(): void;
  onChange(snapshot: GameSnapshot): void;
  onResolved(info: ResolutionInfo): void;
  onArrived(info: ArrivalInfo): void;
}

/** Pares mutables: la confusión que este juego existe para curar (§5.7). */
const MUTABLE: Record<string, Degree> = {
  VI: "VImel", VImel: "VI", VIIST: "VIIsen", VIIsen: "VIIST",
};

export class GameStateManager {
  private phase: Phase = "IDLE";
  private config: JourneyConfig | null = null;
  private questionSet: QuestionSample[] = [];
  private readonly selector: DegreeNoteSelector = makeDegreeNoteSelector();

  private progress = 0;
  private points = 0;
  private streak = 0;
  private bestStreak = 0;
  private beaconsLeft = BEACON_COUNT;
  private drifts: number[] = [];
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
  /** Deriva (§5.5): el lazo ocupa un segmento entero. */
  private driftUntilSegment = -1;
  private driftStart = 0;
  private driftRevealed = false;

  constructor(private readonly ports: JourneyPorts) {}

  // -------------------------------------------------------------------------
  // Ciclo de vida
  // -------------------------------------------------------------------------

  /** Prepara el viaje. El cometa NO vuela hasta `beginRolling()` (§7.1: cadencia primero). */
  start(config: JourneyConfig): void {
    this.config = config;
    this.questionSet = buildQuestionSet(config.scale, config.degrees, config.timbre);
    this.selector.reset();

    this.phase = "DEPARTING";
    this.progress = 0;
    this.points = 0;
    this.streak = 0;
    this.bestStreak = 0;
    this.beaconsLeft = BEACON_COUNT;
    this.drifts = [];
    this.correctCount = 0;
    this.answeredCount = 0;
    this.stats.clear();
    this.segment = 0;
    this.answerWindow = null;
    this.lastResolution = null;
    this.arrival = null;
    this.resolvedSegment = -1;
    this.driftUntilSegment = -1;
    this.driftRevealed = false;
    this.clearQuestion();
    this.ports.duckBed(1);
    this.ports.setAmbientSuppressed(false);
    this.ports.endDrift();
    this.emit();
  }

  /** La cadencia terminó: el cometa se suelta y empieza a contar el viaje. */
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

  hasQuestionSet(): boolean {
    return this.questionSet.length > 0;
  }

  // -------------------------------------------------------------------------
  // Tick: la distancia del cometa manda. La ventana de respuesta ES distancia (§7.3).
  // -------------------------------------------------------------------------
  tick(_dt: number, distance: number): void {
    if (this.phase === "IDLE" || this.phase === "DEPARTING" || this.phase === "ARRIVED") return;

    const segment = Math.floor(distance / SEGMENT_LENGTH);
    const along = distance - segment * SEGMENT_LENGTH;

    // --- Deriva: ni preguntas ni anillos hasta reincorporarse (§5.5) ---
    if (this.phase === "DRIFT") {
      // A media deriva se revela la respuesta y suena el re-anclaje (§2.6–2.7).
      if (!this.driftRevealed && distance - this.driftStart >= SEGMENT_LENGTH * 0.45) {
        this.driftRevealed = true;
        if (this.lastResolution) this.ports.playReveal(this.lastResolution);
        this.emit();
      }
      if (segment >= this.driftUntilSegment) {
        this.segment = segment;
        this.phase = "ROLLING";
        this.ports.endDrift();
        this.emit();
      }
      return;
    }

    // Cambio de segmento: se cruzó el anillo.
    if (segment !== this.segment) {
      if (this.phase === "QUESTION") {
        // El anillo llegó sin rumbo (§7.1): deriva con su mensaje propio.
        this.resolve(null, true);
      }
      this.segment = segment;
      // Solo se vuelve a RODANDO desde una resolución CERRADA. Si esto forzara
      // "ROLLING" siempre, el caso "sin respuesta" —que resuelve justo aquí— se comería
      // la fase DRIFT entera y el cometa nunca llegaría a salirse de la ruta.
      if (this.phase === "RESOLVED") {
        this.phase = "ROLLING";
        this.emit();
      }
    }

    // La baliza dispara la pregunta al salir de la zona muerta.
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

    // Regla de silencio §2.11: nada afinado ni ambiental compite con la pregunta.
    this.ports.duckBed(QUESTION_DUCK_LEVEL);
    this.ports.setAmbientSuppressed(true);
    this.ports.setRing(this.segment, "pending");
    this.ports.playQuestionNote(sample);
    this.emit();
  }

  /** Re-escuchar la nota es GRATIS SIEMPRE (§7.4: castigar la re-escucha castiga oír). */
  repeatNote(): void {
    if (this.phase !== "QUESTION" || !this.question) return;
    this.ports.playQuestionNote(this.question);
  }

  /** Radiofaro-tónica: cuesta 1 y NO pausa la ventana (§7.1, BEACON_PAUSES_WINDOW). */
  useBeacon(): boolean {
    if (this.phase !== "QUESTION" || this.beaconsLeft <= 0) return false;
    this.beaconsLeft -= 1;
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
      this.ports.setRing(this.segment, "correct");
      this.ports.playCorrectSfx();
      this.ports.slingshot();
    } else {
      this.streak = 0;
      this.drifts.push(this.progress);
      this.progress = Math.max(0, this.progress - DRIFT_COST);
      this.ports.setRing(this.segment, "wrong");
      this.ports.playWrongSfx();
    }

    this.lastResolution = {
      correct, timedOut, degree, pitchClass: sample.pitchClass, answered,
      // Confundir las dos hermanas del par mutable no es un error cualquiera: es EL
      // error del modo menor. F7 lo usará para comparar las dos notas en la nebulosa.
      mutableMix: !correct && answered !== null && MUTABLE[degree] === answered,
    };
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
      // El cometa SALE de la ruta (§7.1). El lazo ocupa el segmento siguiente entero.
      this.phase = "DRIFT";
      this.driftUntilSegment = this.segment + 2;
      this.driftStart = (this.segment + 1) * SEGMENT_LENGTH;
      this.driftRevealed = false;
      this.ports.beginDrift(this.lastResolution, this.driftStart);
    }

    if (this.progress >= DECISIONS_TO_ARRIVE) this.arrive();
    else this.emit();
  }

  private arrive(): void {
    const multiplier = this.config?.speed.scoreMultiplier ?? 1;
    const drifts = this.drifts.length;
    const gala = drifts === 0 && this.beaconsLeft === BEACON_COUNT;

    this.points += Math.round(POINTS_ARRIVAL * multiplier);
    this.points += this.beaconsLeft * POINTS_PER_UNUSED_BEACON;
    if (gala) this.points += POINTS_GALA;

    this.arrival = {
      points: this.points,
      drifts,
      medal: drifts === 0 ? "gold" : drifts <= SILVER_MAX_DRIFTS ? "silver" : "bronze",
      gala,
      bestStreak: this.bestStreak,
      accuracy: this.answeredCount ? this.correctCount / this.answeredCount : 0,
      beaconsLeft: this.beaconsLeft,
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

  /** Precisión por grado (F9 la persiste). */
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
      beaconsLeft: this.beaconsLeft,
      beaconsTotal: BEACON_COUNT,
      drifts: [...this.drifts],
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
