/**
 * captura.ts — Captura de input dual (puntero + teclado).
 *
 * Registra onsets del alumno vía:
 *   - pointerdown  → cualquier toque/click sobre el área designada
 *   - keydown      → barra espaciadora (sin repeat, para evitar onsets duplicados
 *                    al mantener pulsada la tecla)
 *
 * El timestamp se toma con performance.now() en el momento exacto del evento,
 * antes de cualquier procesamiento adicional.
 */

import { nowMs } from './timestamps';

/** Callback que recibe el onset en ms (performance.now()) */
export type OnOnset = (timeMs: number) => void;

/**
 * Adjunta captura de input al `element` dado (pointerdown)
 * y al `document` (keydown con barra espaciadora).
 *
 * @returns función de limpieza — llamarla al desmontar el componente
 */
export function attachInputCapture(
  element: HTMLElement,
  onOnset: OnOnset,
): () => void {
  const handlePointerDown = (e: PointerEvent) => {
    // Tomamos el timestamp lo antes posible
    const t = nowMs();
    e.preventDefault(); // evitar scroll en mobile
    onOnset(t);
  };

  const handleKeyDown = (e: KeyboardEvent) => {
    // Solo barra espaciadora; ignorar repeat (tecla mantenida)
    if (e.code !== 'Space' || e.repeat) return;
    const t = nowMs();
    e.preventDefault(); // evitar scroll de página
    onOnset(t);
  };

  element.addEventListener('pointerdown', handlePointerDown);
  document.addEventListener('keydown', handleKeyDown);

  return () => {
    element.removeEventListener('pointerdown', handlePointerDown);
    document.removeEventListener('keydown', handleKeyDown);
  };
}
