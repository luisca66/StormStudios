// Reglas puras para abandonar una pregunta activa sin penalización (PLAN §6.1).

import { INTERACTION } from "@/config";

export function shouldCancelListening(elapsedSec: number, distance: number): boolean {
  return (
    elapsedSec >= INTERACTION.listenTimeoutSec ||
    distance > INTERACTION.interactMaxDistance
  );
}
