"use client";
/**
 * Menú de herramientas en el puntero (como el clic derecho de Cubase): en el
 * editor, el clic derecho abre Escribir / Seleccionar / Borrar justo donde está
 * el mouse, para no tener que subir a la barra. Si el clic cae sobre una nota,
 * ofrece además borrar esa nota (lo que antes hacía el clic derecho directo).
 *
 * Teclas dentro del menú: 1 / 2 / 3 o E / S / B eligen; Esc lo cierra.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import type { MouseEditing } from "../ScoreView";
import styles from "./studio.module.css";

type Tool = MouseEditing["tool"];
type Props = {
  tool: Tool;
  onTool: (tool: Tool) => void;
  onEraseNote: (id: string) => void;
  t: (es: string, en: string) => string;
  icons: Record<Tool, ReactNode>;
  children: ReactNode;
};
type Open = { x: number; y: number; note: string | null };

const TOOLS: Array<[Tool, string, string, string]> = [["write", "Escribir", "Write", "E"], ["select", "Seleccionar", "Select", "S"], ["erase", "Borrar", "Erase", "B"]];

/** Id de la nota bajo el puntero, en la partitura o en el editor de teclas. */
function noteAt(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) return null;
  const roll = target.closest<HTMLElement>("[data-roll-note]");
  if (roll) return roll.dataset.rollNote ?? null;
  const id = target.closest("[data-note-id]")?.getAttribute("data-note-id");
  return id && !id.startsWith("gap:") ? id : null;
}

export default function ToolMenu({ tool, onTool, onEraseNote, t, icons, children }: Props) {
  const host = useRef<HTMLDivElement>(null), menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState<Open | null>(null);

  // Escucha en fase de captura: así el menú gana antes que el borrado por clic derecho de las vistas de la v4.
  useEffect(() => {
    const element = host.current;
    if (!element) return;
    const onContext = (event: MouseEvent) => {
      if ((event.target as Element).closest("input,textarea,select")) return;
      event.preventDefault(); event.stopPropagation();
      setOpen({ x: event.clientX, y: event.clientY, note: noteAt(event.target) });
    };
    element.addEventListener("contextmenu", onContext, true);
    return () => element.removeEventListener("contextmenu", onContext, true);
  }, []);

  useEffect(() => {
    if (!open) return;
    menu.current?.querySelector<HTMLButtonElement>("[aria-checked=true]")?.focus();
    const close = (event: Event) => { if (!menu.current?.contains(event.target as Node)) setOpen(null); };
    const keys = (event: KeyboardEvent) => {
      const key = event.key.toLowerCase();
      const pick = TOOLS.find(([, , , letter], index) => key === String(index + 1) || key === letter.toLowerCase());
      if (key === "escape") { event.preventDefault(); event.stopPropagation(); setOpen(null); }
      else if (pick) { event.preventDefault(); event.stopPropagation(); onTool(pick[0]); setOpen(null); }
    };
    const blur = () => setOpen(null);
    window.addEventListener("pointerdown", close, true); window.addEventListener("keydown", keys, true);
    window.addEventListener("blur", blur); window.addEventListener("scroll", close, true);
    return () => { window.removeEventListener("pointerdown", close, true); window.removeEventListener("keydown", keys, true); window.removeEventListener("blur", blur); window.removeEventListener("scroll", close, true); };
  }, [open, onTool]);

  // El menú no se sale de la ventana.
  const width = 196, height = open?.note ? 172 : 132;
  const left = open ? Math.min(open.x, window.innerWidth - width - 8) : 0, top = open ? Math.min(open.y, window.innerHeight - height - 8) : 0;

  return <div ref={host} className={styles.toolHost}>
    {children}
    {open && <div ref={menu} className={styles.toolMenu} role="menu" aria-label={t("Herramienta", "Tool")} style={{ left, top }} data-testid="tool-menu">
      {TOOLS.map(([value, es, en, letter]) => <button key={value} role="menuitemradio" aria-checked={tool === value}
        onClick={() => { onTool(value); setOpen(null); }}>{icons[value]}<span>{t(es, en)}</span><kbd>{letter}</kbd></button>)}
      {open.note && <>
        <hr />
        <button role="menuitem" className={styles.danger} onClick={() => { onEraseNote(open.note!); setOpen(null); }}>{icons.erase}<span>{t("Borrar esta nota", "Delete this note")}</span></button>
      </>}
    </div>}
  </div>;
}
