/**
 * reglas.ts — Definición de ReglaNivel y validador de compases.
 *
 * ReglaNivel es el contrato pedagógico de cada nivel: qué figuras están
 * permitidas, qué compases se usan, cuántos compases tiene el ejercicio,
 * cuántas notas máximo por compás, y los parámetros de evaluación.
 *
 * El generador (generador.ts) recibe una ReglaNivel y produce ejercicios
 * que cumplen estrictamente estas reglas — verificable con los tests.
 */

import type { Duracion, CompasType, Compas } from './tipos';
import { tiemposDelCompas, tiemposDeDuracion } from './tipos';

// ── Tipo ─────────────────────────────────────────────────────────────────────

export interface ReglaNivel {
  nivel: number;
  nombre: string;
  /** Compases que el generador puede usar en este nivel. */
  compasesPermitidos: CompasType[];
  /** Figuras que el generador puede usar en este nivel. */
  figurasPermitidas: Duracion[];
  /** Número de compases por ejercicio generado. */
  longitudCompases: number;
  /**
   * Máximo de notas por compás.
   * Guía pedagógica: limita la densidad visual/auditiva.
   * Debe ser ≥ ceil(tiemposDelCompas / max_figura_dur) para que sea alcanzable.
   */
  densidadMaxPorCompas: number;
  /** Fracción del beat usada en calcularVentana (p. ej. 0.35 = 35%). */
  porcentajeToleranacia: number;
  /** Porcentaje de aciertos necesario para cerrar el ejercicio (0-100). */
  umbralCierre: number;
  /** Tempo sugerido en bpm. */
  bpmDefault: number;
}

// ── Configuración de los 5 niveles de v1 ─────────────────────────────────────

export const REGLAS_V1: ReglaNivel[] = [
  {
    nivel: 1,
    nombre: 'Iniciación',
    compasesPermitidos: ['2/4', '3/4', '4/4'],
    figurasPermitidas: ['hd', 'hdr', 'h', 'hr', 'q', 'qr'],
    longitudCompases: 2,
    densidadMaxPorCompas: 4,   // hd llena 3/4 sola; el generador respeta la suma exacta
    porcentajeToleranacia: 0.35,
    umbralCierre: 90,
    bpmDefault: 60,
  },
  {
    nivel: 2,
    nombre: 'Básico',
    compasesPermitidos: ['4/4'],
    figurasPermitidas: ['h', 'q'],
    longitudCompases: 2,
    densidadMaxPorCompas: 4,   // 2 blancas (min) a 4 negras (max)
    porcentajeToleranacia: 0.28,
    umbralCierre: 90,
    bpmDefault: 70,
  },
  {
    nivel: 3,
    nombre: 'Corcheas',
    compasesPermitidos: ['4/4', '3/4'],
    figurasPermitidas: ['h', 'q', '8'],
    longitudCompases: 2,
    densidadMaxPorCompas: 6,   // máx 6 notas por compás
    porcentajeToleranacia: 0.22,
    umbralCierre: 92,
    bpmDefault: 80,
  },
  {
    nivel: 4,
    nombre: 'Mixto',
    compasesPermitidos: ['2/4', '3/4', '4/4'],
    figurasPermitidas: ['q', '8'],
    longitudCompases: 3,
    densidadMaxPorCompas: 8,
    porcentajeToleranacia: 0.16,
    umbralCierre: 94,
    bpmDefault: 85,
  },
  {
    nivel: 5,
    nombre: 'Avanzado',
    compasesPermitidos: ['2/4', '3/4', '4/4'],
    figurasPermitidas: ['h', 'q', '8', '16'],
    longitudCompases: 3,
    densidadMaxPorCompas: 10,
    porcentajeToleranacia: 0.10,
    umbralCierre: 96,
    bpmDefault: 90,
  },
];

// ── Validador ─────────────────────────────────────────────────────────────────

/**
 * Verifica que un compás generado cumple todas las reglas del nivel.
 * Retorna un array de strings con los errores encontrados (vacío = OK).
 */
export function validarCompas(
  notas: Compas,
  regla: ReglaNivel,
  tipo: CompasType,
): string[] {
  const errores: string[] = [];
  const totalEsperado = tiemposDelCompas(tipo);

  // 1. Figuras permitidas
  for (const nota of notas) {
    if (!regla.figurasPermitidas.includes(nota)) {
      errores.push(`Figura '${nota}' no permitida en nivel ${regla.nivel}`);
    }
  }

  // 2. Suma exacta de tiempos
  const suma = notas.reduce((s, n) => s + tiemposDeDuracion(n), 0);
  if (Math.abs(suma - totalEsperado) > 0.001) {
    errores.push(
      `Compás ${tipo} debe sumar ${totalEsperado} tiempos, suma ${suma.toFixed(3)}`
    );
  }

  // 3. Densidad
  if (notas.length > regla.densidadMaxPorCompas) {
    errores.push(
      `Densidad ${notas.length} supera el máximo ${regla.densidadMaxPorCompas}`
    );
  }

  // 4. Compás permitido
  if (!regla.compasesPermitidos.includes(tipo)) {
    errores.push(`Compás '${tipo}' no permitido en nivel ${regla.nivel}`);
  }

  return errores;
}

/**
 * Verifica un PatronRitmico completo. Retorna array de errores.
 */
export function validarPatron(
  patron: { compas: CompasType; compases: Compas[] },
  regla: ReglaNivel,
): string[] {
  const errores: string[] = [];
  for (let i = 0; i < patron.compases.length; i++) {
    const e = validarCompas(patron.compases[i], regla, patron.compas);
    errores.push(...e.map((msg) => `Compás ${i + 1}: ${msg}`));
  }
  return errores;
}
