interface DarkPageLayoutProps {
  children: React.ReactNode;
  /** Ancho máximo del contenido. Default: "860px" */
  maxWidth?: string;
  /** Padding top extra para compensar el header fijo */
  paddingTop?: string;
}

/**
 * Layout oscuro reutilizable para páginas interiores del sitio.
 * Aplica ss-root + orbs + contenedor centrado.
 */
export function DarkPageLayout({
  children,
  maxWidth = "860px",
  paddingTop = "120px",
}: DarkPageLayoutProps) {
  return (
    <div className="ss-root" style={{ minHeight: "100vh" }}>
      {/* Orbs decorativos */}
      <div className="ss-orb ss-orb-a" aria-hidden />
      <div className="ss-orb ss-orb-b" aria-hidden />

      {/* Contenido */}
      <div
        className="relative z-10"
        style={{
          maxWidth,
          margin: "0 auto",
          padding: `${paddingTop} 24px 80px`,
        }}
      >
        {children}
      </div>
    </div>
  );
}
