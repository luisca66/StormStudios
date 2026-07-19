// Pools incrementales por capa (PLAN §7.3 — tabla de grupos de Batisfera §6.3
// copiada tal cual, misma partición de las 5 zonas/capas). Grupo 2 entra a la
// mitad de la cuota; grupo 3 (si existe) a 3/4. Lógica pura.

export const LAYER_GROUPS: Record<number, string[][]> = {
  1: [
    ["MAJOR", "MINOR"],
    ["AUGMENTED", "DIMINISHED"],
  ],
  2: [
    ["DOMINANT_7", "MINOR_7", "MAJOR_7"],
    ["MINOR_MAJOR_7", "DIMINISHED_7", "HALF_DIMINISHED_7"],
    ["DOMINANT_7_FLAT_5", "DOMINANT_7_SHARP_5"],
  ],
  3: [
    ["MAJOR_6", "MINOR_6", "SUS_4"],
    ["MINOR_SUS_4", "MAJOR_ADD_9", "MINOR_ADD_9"],
  ],
  4: [
    ["MAJOR_9", "MINOR_9", "DOMINANT_9"],
    ["MAJOR_6_9", "MINOR_6_9"],
    ["DOMINANT_FLAT_9", "DOMINANT_SHARP_9"],
  ],
  5: [
    ["MAJOR_11", "MINOR_11", "DOMINANT_11"],
    ["DOMINANT_SHARP_11", "MAJOR_SHARP_11"],
    ["MAJOR_13", "MINOR_13", "DOMINANT_13"],
  ],
};

/** Pool activo según el avance de cuota; `fresh` = el último grupo introducido
 * (pesa doble en el sorteo, §7.3). */
export function activePool(
  layer: number,
  completedInLayer: number,
  quota: number,
): { pool: string[]; fresh: string[] } {
  const groups = LAYER_GROUPS[layer] ?? LAYER_GROUPS[1];
  let count = 1;
  if (completedInLayer >= quota / 2) count = Math.min(2, groups.length);
  if (groups.length > 2 && completedInLayer >= quota * 0.75) count = 3;
  const pool = groups.slice(0, count).flat();
  const fresh = count > 1 ? groups[count - 1] : [];
  return { pool, fresh };
}
