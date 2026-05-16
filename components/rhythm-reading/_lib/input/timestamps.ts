/**
 * timestamps.ts — Reloj de alta resolución para captura de input.
 *
 * Usamos performance.now() — el único reloj correcto para medir
 * onsets del usuario con precisión submilisegundo.
 *
 * NUNCA usar Date.now() para timing crítico; su resolución es 1 ms
 * y puede saltar hacia atrás en algunos entornos.
 */

/**
 * Retorna el tiempo actual en milisegundos con alta resolución.
 * Equivalente a performance.now() pero exportado como función
 * nombrada para facilitar mocking en tests.
 */
export function nowMs(): number {
  return performance.now();
}
