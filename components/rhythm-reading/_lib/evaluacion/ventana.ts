/**
 * ventana.ts — Ventana móvil de las últimas N vueltas.
 *
 * El ejercicio cierra cuando el promedio de aciertos en las últimas
 * VENTANA_RONDAS vueltas iguala o supera el umbral del nivel.
 */

/** Resultado de una sola vuelta completa del patrón. */
export interface RondaResult {
  aciertos: number;
  totalBeats: number;
}

/** Cuántas vueltas se promedian para decidir el cierre. */
export const VENTANA_RONDAS = 2;

/** Umbral de aciertos (%) por nivel para cerrar el ejercicio. */
export const UMBRAL_POR_NIVEL: Record<number, number> = {
  1: 90,
  2: 92,
  3: 94,
  4: 96,
  5: 98,
};

/**
 * Calcula el porcentaje de aciertos de las últimas VENTANA_RONDAS vueltas.
 * Si hay menos vueltas que VENTANA_RONDAS, promedia las disponibles.
 */
export function calcularPorcentajeVentana(rondas: RondaResult[]): number {
  const ultimas = rondas.slice(-VENTANA_RONDAS);
  if (ultimas.length === 0) return 0;
  const total = ultimas.reduce((s, r) => s + r.totalBeats, 0);
  const aciertos = ultimas.reduce((s, r) => s + r.aciertos, 0);
  return total > 0 ? Math.round((aciertos / total) * 100) : 0;
}

/**
 * Determina si el ejercicio debe cerrarse.
 * Requiere al menos VENTANA_RONDAS vueltas completas.
 */
export function ejercicioCerrado(rondas: RondaResult[], nivel: number): boolean {
  if (rondas.length < VENTANA_RONDAS) return false;
  return calcularPorcentajeVentana(rondas) >= (UMBRAL_POR_NIVEL[nivel] ?? 90);
}
