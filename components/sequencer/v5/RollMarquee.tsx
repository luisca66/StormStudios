"use client";
/**
 * Selección por rectángulo en el editor de teclas, como en un secuenciador
 * tradicional. Envuelve a `PianoRoll` (componente de la v4, que no se toca):
 * con la herramienta Seleccionar, arrastrar desde un espacio vacío dibuja un
 * rectángulo y selecciona las notas que toca. Con Mayús o Ctrl se suma a la
 * selección anterior. Un clic sin arrastre conserva el comportamiento de la
 * v4: mueve el cursor.
 *
 * Además, al abrir el editor centra la vista en la música escrita (o en Do4 si
 * está vacío): el teclado completo no cabe y la v4 abre siempre en lo más agudo.
 */
import { useEffect, useRef, type ReactNode } from "react";
import styles from "./studio.module.css";

type Props = {
  active: boolean;
  selected: string[];
  onSelect: (ids: string[]) => void;
  children: ReactNode;
};

export default function RollMarquee({ active, selected, onSelect, children }: Props) {
  // La v4 limpia la selección al pulsar en vacío; se guarda antes para poder sumarle.
  const previous = useRef<string[]>([]), root = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const scroller = root.current?.querySelector<HTMLElement>("[data-testid=piano-roll]");
    if (!scroller) return;
    const notes = [...scroller.querySelectorAll<HTMLElement>("[data-roll-note]")].map(note => note.getBoundingClientRect().top).sort((a, b) => a - b);
    const middle = notes.length ? notes[notes.length >> 1] : scroller.querySelector<HTMLElement>('[data-pitch="C4"]')?.getBoundingClientRect().top;
    if (middle === undefined) return;
    scroller.scrollTop += middle - scroller.getBoundingClientRect().top - scroller.clientHeight / 2;
  }, []);
  const begin = (down: React.PointerEvent<HTMLDivElement>) => {
    if (!active || down.button !== 0) return;
    const target = down.target as HTMLElement;
    if (target.closest("[data-roll-note]") || !target.closest("[data-pitch]")) return;
    const host = down.currentTarget.querySelector<HTMLElement>("[data-testid=piano-roll] > div");
    if (!host) return;
    const additive = down.shiftKey || down.ctrlKey || down.metaKey, kept = previous.current;
    const startX = down.clientX, startY = down.clientY;
    const box = document.createElement("div"); box.className = styles.rollMarquee;
    let dragged = false;
    const area = (event: PointerEvent) => ({ left: Math.min(startX, event.clientX), right: Math.max(startX, event.clientX), top: Math.min(startY, event.clientY), bottom: Math.max(startY, event.clientY) });
    const move = (event: PointerEvent) => {
      if (!dragged && Math.hypot(event.clientX - startX, event.clientY - startY) < 5) return;
      if (!dragged) { dragged = true; host.appendChild(box); }
      const rect = area(event), origin = host.getBoundingClientRect();
      Object.assign(box.style, { left: rect.left - origin.left + "px", top: rect.top - origin.top + "px", width: rect.right - rect.left + "px", height: rect.bottom - rect.top + "px" });
    };
    const finish = (event: PointerEvent) => {
      window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", cancel);
      if (!dragged) return;
      box.remove();
      const rect = area(event);
      const hit = [...host.querySelectorAll<HTMLElement>("[data-roll-note]")].filter(note => {
        const bounds = note.getBoundingClientRect();
        return bounds.right >= rect.left && bounds.left <= rect.right && bounds.bottom >= rect.top && bounds.top <= rect.bottom;
      }).map(note => note.dataset.rollNote!);
      onSelect([...new Set([...(additive ? kept : []), ...hit])]);
    };
    const cancel = () => { window.removeEventListener("pointermove", move); window.removeEventListener("pointerup", finish); window.removeEventListener("pointercancel", cancel); box.remove(); };
    window.addEventListener("pointermove", move); window.addEventListener("pointerup", finish); window.addEventListener("pointercancel", cancel);
  };
  return <div ref={root} className={styles.rollHost} onPointerDownCapture={() => { previous.current = selected; }} onPointerDown={begin}>{children}</div>;
}
