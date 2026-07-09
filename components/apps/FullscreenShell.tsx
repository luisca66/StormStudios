"use client";

import { useFullscreen } from "./useFullscreen";
import { FullscreenIcon } from "./FullscreenIcon";

/**
 * FullscreenShell — envoltorio para apps React "a sangre completa" (sin la barra
 * slim de GameShell), como los juegos que ya llenan la pantalla con su propia UI.
 *
 * Añade solo un botón flotante de pantalla completa en la esquina superior
 * derecha; expande TODO el contenedor (y por tanto la app), ocultando el chrome
 * del navegador y el nav global del sitio. No altera el diseño existente.
 */

type FullscreenShellProps = {
  locale: string;
  className?: string;
  style?: React.CSSProperties;
  /** esquina del botón flotante; usa "left" si la app ya tiene controles arriba a la derecha */
  align?: "left" | "right";
  children: React.ReactNode;
};

export default function FullscreenShell({
  locale,
  className,
  style,
  align = "right",
  children,
}: FullscreenShellProps) {
  const es = locale === "es";
  const { ref, supported, isFullscreen, toggle } = useFullscreen<HTMLDivElement>();

  const fsLabel = isFullscreen
    ? es
      ? "Salir de pantalla completa"
      : "Exit fullscreen"
    : es
      ? "Pantalla completa"
      : "Fullscreen";

  return (
    <div
      ref={ref}
      className={className}
      style={{
        ...style,
        // En pantalla completa el contenedor ocupa toda la pantalla; si la app
        // es más alta hay que poder hacer scroll dentro (si no, los controles de
        // abajo quedarían recortados sin barra de desplazamiento).
        ...(isFullscreen ? { height: "100vh", overflowY: "auto" } : null),
      }}
    >
      {children}
      {supported && (
        <button
          type="button"
          onClick={toggle}
          aria-label={fsLabel}
          title={`${fsLabel} (F)`}
          style={{
            position: "fixed",
            // Debajo del nav global (64px) cuando no está en pantalla completa;
            // pegado arriba cuando el nav ya no está.
            top: isFullscreen ? "12px" : "74px",
            ...(align === "left" ? { left: "16px" } : { right: "16px" }),
            zIndex: 60,
            display: "inline-flex",
            alignItems: "center",
            justifyContent: "center",
            width: "38px",
            height: "38px",
            padding: 0,
            background: "rgba(10,12,20,0.62)",
            border: "1px solid rgba(255,255,255,0.22)",
            borderRadius: "10px",
            color: "rgba(255,255,255,0.85)",
            cursor: "pointer",
            backdropFilter: "blur(6px)",
            WebkitBackdropFilter: "blur(6px)",
            boxShadow: "0 2px 10px rgba(0,0,0,0.35)",
          }}
        >
          <FullscreenIcon exit={isFullscreen} size={18} />
        </button>
      )}
    </div>
  );
}
