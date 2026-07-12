// Estado de la inmersión (PLAN §6.4): cuotas por zona, termoclinas, puntuación
// 10 + racha resultante×2, y condiciones de fin. La primera captura vale 12.
// F5 implementa Expedición; F6 añade O₂ (contrarreloj) e integridad (supervivencia).

import {
  MODES,
  SCORING,
  SURVIVAL_HULL,
  TIME_ATTACK_O2_PER_CAPTURE,
  TIME_ATTACK_O2_START,
  WORLD,
  ZONES,
  type GameMode,
} from "@/config";

export type DiveEndReason = "COMPLETE" | "O2_OUT" | "HULL_OUT" | "ABANDONED";

export interface AnswerResult {
  correct: boolean;
  points: number;
  /** La termoclina de la zona actual se abrió con esta captura. */
  thermoclineOpened: boolean;
  /** Integridad restante tras la respuesta (solo Supervivencia). */
  hullRemaining: number;
}

export class DiveState {
  readonly quota: number;
  /** Racha de capturas por zona — H1: un error la reinicia a 0 (PLAN-HITOS-2). */
  private zoneCaptures: Partial<Record<number, number>> = {};
  /** Zonas cuya termoclina ya abrió en esta sesión: abrir es IRREVERSIBLE. */
  private openedZones = new Set<number>();
  /** Máximo histórico de racha por zona: los grupos introducidos NO regresan. */
  private introHighWater: Partial<Record<number, number>> = {};
  zoneIndex: number;
  score = 0;
  streak = 0;
  bestStreak = 0;
  attempts = 0;
  captures = 0;
  maxDepthMeters = 0;
  ended: DiveEndReason | null = null;
  /** Oxígeno en segundos (solo Contrarreloj). */
  o2 = TIME_ATTACK_O2_START;
  /** Integridad del casco (solo Supervivencia). */
  hull = SURVIVAL_HULL;

  constructor(readonly mode: GameMode, readonly startZone: number) {
    this.quota = MODES[mode].quota;
    this.zoneIndex = startZone;
    // Zonas por encima de la inicial cuentan como completadas (ya desbloqueadas).
    for (let i = 1; i < startZone; i++) {
      this.openedZones.add(i);
      this.introHighWater[i] = this.quota;
    }
  }

  get capturesInZone(): number {
    return this.zoneCaptures[this.zoneIndex] ?? 0;
  }

  /** Avance para los grupos de introducción de acordes: no regresa con errores. */
  get zoneIntroProgress(): number {
    return this.introHighWater[this.zoneIndex] ?? 0;
  }

  isZoneOpen(zoneIndex: number): boolean {
    return this.openedZones.has(zoneIndex);
  }

  /** Y mínima permitida: el fondo de la zona más profunda alcanzable. */
  allowedBottomY(): number {
    let deepest = 1;
    for (let i = 1; i <= 5; i++) {
      deepest = i;
      if (!this.isZoneOpen(i)) break;
    }
    return ZONES[deepest - 1].yBottom + 2;
  }

  /** El jugador cruzó a otra zona (detectado por profundidad). */
  enterZone(zoneIndex: number): void {
    this.zoneIndex = zoneIndex;
  }

  answer(correctChordId: string, answeredChordId: string, leviathan: boolean): AnswerResult {
    this.attempts++;
    const correct = correctChordId === answeredChordId;
    if (!correct) {
      this.streak = 0;
      // H1: el desbloqueo exige aciertos CONSECUTIVOS — el error reinicia la
      // racha de la zona actual (las zonas ya abiertas no se cierran).
      if (!this.openedZones.has(this.zoneIndex)) {
        this.zoneCaptures[this.zoneIndex] = 0;
      }
      if (this.mode === "SURVIVAL") this.hull = Math.max(0, this.hull - 1);
      return { correct, points: 0, thermoclineOpened: false, hullRemaining: this.hull };
    }
    if (this.mode === "TIME_ATTACK") this.o2 += TIME_ATTACK_O2_PER_CAPTURE;

    this.streak++;
    this.bestStreak = Math.max(this.bestStreak, this.streak);
    let points = SCORING.base + this.streak * SCORING.streakBonus;
    if (leviathan) points *= SCORING.leviathanMultiplier;

    this.captures++;
    const before = this.capturesInZone;
    this.zoneCaptures[this.zoneIndex] = before + 1;
    this.introHighWater[this.zoneIndex] = Math.max(
      this.introHighWater[this.zoneIndex] ?? 0,
      before + 1,
    );
    const thermoclineOpened =
      before + 1 >= this.quota && !this.openedZones.has(this.zoneIndex);
    if (thermoclineOpened) {
      this.openedZones.add(this.zoneIndex);
      points += SCORING.zoneBonus;
    }

    this.score += points;
    return { correct, points, thermoclineOpened, hullRemaining: this.hull };
  }

  /** Drena O₂ (Contrarreloj). Devuelve true si se agotó. */
  tickO2(dt: number): boolean {
    if (this.mode !== "TIME_ATTACK" || this.ended) return false;
    this.o2 = Math.max(0, this.o2 - dt);
    return this.o2 === 0;
  }

  trackDepth(meters: number): void {
    this.maxDepthMeters = Math.max(this.maxDepthMeters, meters);
  }

  /** Fin de expedición: tocar el fondo de la fosa con la zona 5 abierta o no. */
  reachedBottom(y: number): boolean {
    return y <= WORLD.bottomY + 6;
  }

  accuracy(): number {
    return this.attempts === 0 ? 0 : Math.round((this.captures / this.attempts) * 100);
  }
}
