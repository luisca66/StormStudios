"use client";

import { useEffect } from "react";
import { useFullscreen } from "./useFullscreen";
import { FullscreenIcon } from "./FullscreenIcon";

/**
 * GameShell — envoltorio compartido para todas las apps/juegos embebidos en iframe.
 *
 * Dibuja la barra slim superior (volver · título · badge · tagline) y añade un
 * botón de pantalla completa que expande TODO el contenedor (barra + iframe),
 * ocultando el chrome del navegador y el nav global del sitio.
 *
 * El iframe se pasa como `children`, así cada página conserva su propio `src`,
 * `allow` y `title` sin que este componente tenga que conocerlos.
 */

type Badge = {
  label: string;
  /** color de fondo, ej. "rgba(0,229,255,0.12)" */
  bg: string;
  /** color del borde, ej. "rgba(0,229,255,0.3)" */
  border: string;
  /** color del texto, ej. "#67e8f9" */
  color: string;
};

type GameShellProps = {
  locale: string;
  /** color de fondo del contenedor y la barra */
  background: string;
  backHref: string;
  backLabel: string;
  title: string;
  titleColor?: string;
  badge?: Badge;
  tagline?: string;
  /** oculta la tagline en pantallas pequeñas (equivale a `hidden sm:inline`) */
  taglineHiddenOnMobile?: boolean;
  borderColor?: string;
  dividerColor?: string;
  /** color del enlace "← Volver" */
  backColor?: string;
  /** color de la tagline de la derecha */
  taglineColor?: string;
  children: React.ReactNode;
};

export default function GameShell({
  locale,
  background,
  backHref,
  backLabel,
  title,
  titleColor = "#f5f2e9",
  badge,
  tagline,
  taglineHiddenOnMobile = false,
  borderColor = "rgba(255,255,255,0.12)",
  dividerColor = "rgba(255,255,255,0.2)",
  backColor = "rgba(255,255,255,0.6)",
  taglineColor = "rgba(255,255,255,0.35)",
  children,
}: GameShellProps) {
  const es = locale === "es";
  const { ref: containerRef, supported, isFullscreen, toggle: toggleFullscreen } =
    useFullscreen<HTMLDivElement>();

  // El foco DEBE volver al iframe tras usar el botón de pantalla completa (o el
  // cambio nativo con Esc): si se queda en la página, el teclado deja de llegar
  // al juego y los controles "mueren" hasta que el usuario clickea dentro.
  const focusGame = () => {
    requestAnimationFrame(() => {
      containerRef.current?.querySelector("iframe")?.focus();
    });
  };
  const handleFullscreen = () => {
    toggleFullscreen();
    focusGame();
  };
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      containerRef.current?.querySelector("iframe")?.focus();
    });
    return () => cancelAnimationFrame(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isFullscreen]);

  const fsLabel = isFullscreen
    ? es
      ? "Salir de pantalla completa"
      : "Exit fullscreen"
    : es
      ? "Pantalla completa"
      : "Fullscreen";

  return (
    <div
      ref={containerRef}
      style={{
        display: "flex",
        flexDirection: "column",
        height: isFullscreen ? "100vh" : "calc(100vh - 64px)",
        overflow: "hidden",
        background,
      }}
    >
      <div
        style={{
          background,
          borderBottom: `1px solid ${borderColor}`,
          padding: "6px 16px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexShrink: 0,
          gap: "16px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", minWidth: 0 }}>
          <a
            href={backHref}
            style={{
              color: backColor,
              fontSize: "0.72rem",
              fontFamily: "monospace",
              textDecoration: "none",
              whiteSpace: "nowrap",
            }}
          >
            ← {backLabel}
          </a>
          <span style={{ color: dividerColor, fontSize: "0.75rem" }}>|</span>
          <span
            style={{
              color: titleColor,
              fontFamily: "monospace",
              fontSize: "0.78rem",
              fontWeight: 600,
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {title}
          </span>
          {badge && (
            <span
              style={{
                background: badge.bg,
                border: `1px solid ${badge.border}`,
                color: badge.color,
                fontSize: "0.6rem",
                fontFamily: "monospace",
                padding: "2px 7px",
                borderRadius: "999px",
                textTransform: "uppercase",
                letterSpacing: "0.08em",
                whiteSpace: "nowrap",
              }}
            >
              {badge.label}
            </span>
          )}
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "14px", flexShrink: 0 }}>
          {tagline && (
            <span
              className={taglineHiddenOnMobile ? "hidden sm:inline" : undefined}
              style={{
                color: taglineColor,
                fontSize: "0.68rem",
                fontFamily: "monospace",
                whiteSpace: "nowrap",
              }}
            >
              {tagline}
            </span>
          )}
          {supported && (
            <button
              type="button"
              onClick={handleFullscreen}
              aria-label={fsLabel}
              title={`${fsLabel} (F)`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: "28px",
                height: "28px",
                padding: 0,
                background: "rgba(255,255,255,0.06)",
                border: "1px solid rgba(255,255,255,0.16)",
                borderRadius: "7px",
                color: "rgba(255,255,255,0.75)",
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              <FullscreenIcon exit={isFullscreen} />
            </button>
          )}
        </div>
      </div>

      {children}
    </div>
  );
}
