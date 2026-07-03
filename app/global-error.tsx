"use client";

// Último recurso: errores en el propio layout raíz. No hay CSS global aquí,
// así que los estilos van inline y el texto es bilingüe.
type Props = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function GlobalError({ reset }: Props) {
  return (
    <html lang="es">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "flex",
          minHeight: "100vh",
          alignItems: "center",
          justifyContent: "center",
          background: "#fff",
          color: "#111827",
          margin: 0,
          textAlign: "center",
        }}
      >
        <div style={{ padding: "2rem" }}>
          <h1 style={{ fontSize: "1.8rem", marginBottom: "0.75rem" }}>
            Algo salió mal / Something went wrong
          </h1>
          <p style={{ color: "#4b5563", marginBottom: "1.5rem" }}>
            Ocurrió un error inesperado. / An unexpected error occurred.
          </p>
          <button
            onClick={reset}
            style={{
              background: "#2563eb",
              color: "#fff",
              border: "none",
              borderRadius: "0.5rem",
              padding: "0.75rem 1.5rem",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Reintentar / Try again
          </button>
        </div>
      </body>
    </html>
  );
}
