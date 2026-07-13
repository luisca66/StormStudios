// Reglas puras para abandonar una pregunta activa sin penalización (PLAN §6.1).

import { INTERACTION } from "@/config";

export function shouldCancelListening(elapsedSec: number, distance: number): boolean {
  return (
    elapsedSec >= INTERACTION.listenTimeoutSec ||
    distance > INTERACTION.listenLeashDistance
  );
}

/** Metros que faltan para poder activar una criatura; 0 significa "en rango". */
export function distanceToInteractionRange(distance: number): number {
  return Math.max(0, Math.ceil(distance - INTERACTION.interactMaxDistance));
}
