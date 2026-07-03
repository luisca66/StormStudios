import Link from "next/link";
import "./globals.css";

// 404 raíz: Next lo prerenderiza como /_not-found y lo sirve para toda URL
// que no matchea ninguna ruta (con status 404). Es bilingüe porque aquí no
// hay locale: se renderiza fuera del segmento [locale].
// Nota: en Next 16 (Turbopack) el not-found.tsx por segmento se ignora en
// producción para rutas dinámicas, así que este archivo es el 404 real del sitio.
export default function RootNotFound() {
  return (
    <html lang="es">
      <body className="font-sans antialiased bg-white text-gray-900">
        <title>404 — Storm Studios Learning</title>
        <div className="min-h-screen flex flex-col">
          <header className="border-b border-gray-200">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center">
              <Link href="/es" className="flex items-center gap-2 font-bold text-lg text-gray-900">
                <span>Storm Studios</span>
                <span className="text-blue-600">Learning</span>
              </Link>
            </div>
          </header>
          <main className="flex-1 flex items-center justify-center">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-24 text-center">
              <p className="text-7xl mb-6" aria-hidden="true">
                🎼
              </p>
              <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3">
                Página no encontrada
              </h1>
              <p className="text-xl text-gray-500 mb-6">Page not found</p>
              <p className="text-lg text-gray-600 mb-10">
                Esta nota no existe en la partitura. Puede que el enlace haya cambiado o que la
                página ya no esté disponible.
                <br />
                <span className="text-gray-500">
                  This note isn&apos;t in the score. The link may have changed or the page may no
                  longer exist.
                </span>
              </p>
              <div className="flex flex-wrap justify-center gap-4">
                <Link
                  href="/es"
                  className="inline-flex items-center px-6 py-3 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition-colors"
                >
                  Ir al inicio
                </Link>
                <Link
                  href="/en"
                  className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors"
                >
                  Go home (English)
                </Link>
                <Link
                  href="/es/apps"
                  className="inline-flex items-center px-6 py-3 rounded-lg border border-gray-300 text-gray-700 font-semibold hover:border-blue-600 hover:text-blue-600 transition-colors"
                >
                  Ver las apps
                </Link>
              </div>
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
