"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Lógica compartida de pantalla completa para apps y juegos.
 *
 * Devuelve un `ref` para el elemento a expandir, si la API está soportada,
 * si actualmente está en pantalla completa, y un `toggle`. Incluye:
 * - fallback webkit (Safari antiguo)
 * - sincronización con el evento `fullscreenchange` (ESC, botón nativo)
 * - atajo de teclado F (ignorado si el foco está en un campo editable)
 */

type FsElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};
type FsDocument = Document & {
  webkitExitFullscreen?: () => Promise<void> | void;
  webkitFullscreenElement?: Element | null;
  webkitFullscreenEnabled?: boolean;
};

function getFullscreenElement(): Element | null {
  const d = document as FsDocument;
  return document.fullscreenElement ?? d.webkitFullscreenElement ?? null;
}

export function useFullscreen<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Empieza en false para no desajustar la hidratación (el server no dibuja el
  // botón); se activa en el efecto si el navegador soporta la Fullscreen API.
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    const d = document as FsDocument;
    const enabled = document.fullscreenEnabled ?? d.webkitFullscreenEnabled ?? false;
    const el = ref.current as FsElement | null;
    const canRequest = !!el && !!(el.requestFullscreen ?? el.webkitRequestFullscreen);
    setSupported(Boolean(enabled && canRequest));

    const onChange = () => setIsFullscreen(getFullscreenElement() === ref.current);
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggle = useCallback(() => {
    const el = ref.current as FsElement | null;
    if (!el) return;
    if (getFullscreenElement() === el) {
      const d = document as FsDocument;
      (document.exitFullscreen ?? d.webkitExitFullscreen)?.call(document);
    } else {
      (el.requestFullscreen ?? el.webkitRequestFullscreen)?.call(el);
    }
  }, []);

  // Atajo de teclado: F (solo cuando el foco no está en un campo editable ni
  // dentro de un iframe; cuando el juego tiene el foco, la tecla la recibe él).
  useEffect(() => {
    if (!supported) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "f" && e.key !== "F") return;
      if (e.ctrlKey || e.metaKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      if (target && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) {
        return;
      }
      e.preventDefault();
      toggle();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [supported, toggle]);

  return { ref, supported, isFullscreen, toggle };
}
