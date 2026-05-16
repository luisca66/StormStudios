/**
 * generador.ts — Generador determinista de ejercicios rítmicos.
 *
 * Estrategia:
 *   1. Aritmética entera en unidades de 1/16 (semicorchea) para evitar
 *      errores de punto flotante en comparaciones de duración.
 *   2. Precomputación de "conjuntos alcanzables": para k figuras del nivel,
 *      qué totales son exactamente representables. Esto garantiza que el
 *      generador nunca se queda sin figuras válidas antes de completar el compás.
 *   3. LCG con Wang-hash del seed para decorrelacionar seeds consecutivos.
 *
 * El mismo seed + regla siempre produce el mismo PatronRitmico (determinismo).
 */

import type { Duracion, CompasType, Compas, PatronRitmico } from './tipos';
import { tiemposDelCompas, tiemposDeDuracion, esSilencio, silencioANota } from './tipos';
import type { ReglaNivel } from './reglas';

// ── Constante: unidad interna ─────────────────────────────────────────────────

/** Multiplicador de beat → unidades enteras (1 semicorchea = 1 unidad). */
const UNIDAD = 4; // 1 beat = 4 unidades (semicorcheas por negra)

function durToUnits(dur: Duracion): number {
  return Math.round(tiemposDeDuracion(dur) * UNIDAD);
}

function compasToUnits(tipo: CompasType): number {
  return tiemposDelCompas(tipo) * UNIDAD;
}

// ── LCG — generador congruencial lineal ───────────────────────────────────────

class LCG {
  private s: number;

  constructor(seed: number) {
    // Wang hash para decorrelacionar seeds consecutivos.
    // Sin esto, seeds 1,2,3,… producen valores LCG casi idénticos
    // porque el primer paso del LCG es lineal en el seed.
    let h = (seed >>> 0) || 1;
    h = (Math.imul((h >> 16) ^ h, 0x45d9f3b)) >>> 0;
    h = (Math.imul((h >> 16) ^ h, 0x45d9f3b)) >>> 0;
    h = ((h >> 16) ^ h) >>> 0;
    this.s = h || 1;
  }

  /** Siguiente número en [0, 1) */
  next(): number {
    this.s = (Math.imul(this.s, 1664525) + 1013904223) >>> 0;
    return this.s / 0x100000000;
  }

  /** Elemento aleatorio de un array no vacío. */
  pick<T>(arr: readonly T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

// ── Conjuntos alcanzables ─────────────────────────────────────────────────────

/**
 * Precomputa, para k = 0..maxSlots, qué totales (en unidades) son exactamente
 * representables como suma de exactamente k figuras del nivel.
 *
 * achievable[k] = Set de totales alcanzables con exactamente k figuras.
 * achievable[0] = {0}
 */
function precomputarAlcanzables(
  figuras: readonly Duracion[],
  maxSlots: number,
): Set<number>[] {
  const units = figuras.map(durToUnits);
  const achievable: Set<number>[] = [new Set([0])];

  for (let k = 1; k <= maxSlots; k++) {
    const curr = new Set<number>();
    for (const prev of achievable[k - 1]) {
      for (const u of units) {
        curr.add(prev + u);
      }
    }
    achievable.push(curr);
  }
  return achievable;
}

/**
 * Indica si `restante` unidades pueden llenarse con entre 1 y `maxK` figuras.
 */
function esAlcanzable(
  restante: number,
  maxK: number,
  achievable: Set<number>[],
): boolean {
  for (let k = 1; k <= maxK; k++) {
    if (achievable[k].has(restante)) return true;
  }
  return false;
}

// ── Generador de un compás ────────────────────────────────────────────────────

function generarCompas(
  rng: LCG,
  regla: ReglaNivel,
  tipo: CompasType,
  achievable: Set<number>[],
): Compas {
  const totalUnits = compasToUnits(tipo);
  const notas: Duracion[] = [];
  let restante = totalUnits;

  while (restante > 0) {
    const slotsRestantes = regla.densidadMaxPorCompas - notas.length;

    // Figuras válidas: caben Y dejan un restante alcanzable en los slots que quedan
    const posibles = regla.figurasPermitidas.filter((f) => {
      const dur = durToUnits(f);
      if (dur > restante) return false;           // no cabe
      const nuevo = restante - dur;
      if (nuevo === 0) return true;               // llena exacto → siempre OK
      if (slotsRestantes <= 1) return false;      // no hay slots para el resto
      return esAlcanzable(nuevo, slotsRestantes - 1, achievable);
    });

    if (posibles.length > 0) {
      const figura = rng.pick(posibles);
      notas.push(figura);
      restante -= durToUnits(figura);
    } else {
      // Fallback de seguridad: no debería ocurrir con reglas bien formadas,
      // pero si ocurre, elegir la figura más grande que quepa para minimizar notas.
      const fallback = regla.figurasPermitidas
        .filter((f) => durToUnits(f) <= restante)
        .sort((a, b) => durToUnits(b) - durToUnits(a));
      if (fallback.length === 0) break;
      notas.push(fallback[0]);
      restante -= durToUnits(fallback[0]);
    }
  }

  return notas;
}

// ── API pública ───────────────────────────────────────────────────────────────

/**
 * Genera un ejercicio rítmico determinista.
 *
 * @param seed   Entero ≥ 1. El mismo seed + regla → mismo patrón.
 * @param regla  Configuración pedagógica del nivel.
 */
export function generarEjercicio(seed: number, regla: ReglaNivel): PatronRitmico {
  const rng = new LCG(seed);

  // Precomputar alcanzables UNA SOLA VEZ para esta regla
  const achievable = precomputarAlcanzables(
    regla.figurasPermitidas,
    regla.densidadMaxPorCompas,
  );

  // Elegir el tipo de compás (una vez por ejercicio)
  const compas = rng.pick(regla.compasesPermitidos);

  const compases: Compas[] = [];
  for (let i = 0; i < regla.longitudCompases; i++) {
    compases.push(generarCompas(rng, regla, compas, achievable));
  }

  // Garantizar que no todo el ejercicio sea silencio.
  // Si ocurre, convertir el primer silencio del primer compás en nota.
  if (compases.flat().every((d) => esSilencio(d))) {
    compases[0][0] = silencioANota(compases[0][0]);
  }

  return { compas, compases };
}

/**
 * Genera una semilla aleatoria para un ejercicio nuevo.
 * El valor es visible en UI para que el alumno pueda repetir un ejercicio exacto.
 */
export function nuevaSemilla(): number {
  return Math.floor(Math.random() * 0xFFFFFF) + 1;
}
