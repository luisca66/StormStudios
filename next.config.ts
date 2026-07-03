import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// ─── Content Security Policy ─────────────────────────────────────────────────
// Dos políticas porque el sitio combina dos mundos:
//   1. La app Next.js (estricta): sin CDNs externos de script; 'unsafe-eval' se
//      habilita solo en desarrollo porque React lo usa para sus herramientas de
//      depuración. connect-src queda acotado a Firebase.
//   2. Los juegos HTML autónomos en /apps y /tools (permisiva): cargan librerías
//      de CDNs (Tailwind Play, jsDelivr, cdnjs, unpkg) y necesitan 'unsafe-eval'.
// El catch-all estricto excluye /apps y /tools con un negative-lookahead para que
// cada ruta reciba UNA sola cabecera CSP (dos romperían los juegos por intersección).

// Orígenes externos que SOLO necesitan los juegos legacy embebidos.
const GAME_SCRIPT_CDNS = [
  "https://cdn.jsdelivr.net",
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com",
  "https://unpkg.com",
].join(" ");

// CSP estricta para la app Next.js. 'unsafe-inline' en script es inevitable
// porque Next inyecta scripts de hidratación inline sin nonce en render estático;
// En producción quitamos 'unsafe-eval' y los CDNs externos. media-src permite
// https para el audio servido vía <audio> (lectura musical, memoria, elefantito);
// connect-src añade *.r2.dev porque la lectura rítmica carga sus samples con
// fetch()+decodeAudioData (Web Audio), que se rige por connect-src, no media-src.
const appScriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
    : "script-src 'self' 'unsafe-inline'";

const appCsp = [
  "default-src 'self'",
  appScriptSrc,
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com https://*.firebasestorage.app https://*.r2.dev wss://*.firebaseio.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// CSP permisiva SOLO para los juegos HTML autónomos (/apps/*, /tools/*).
const gameCsp = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${GAME_SCRIPT_CDNS}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${GAME_SCRIPT_CDNS}`,
  "font-src 'self' https://fonts.gstatic.com https://cdnjs.cloudflare.com https://cdn.jsdelivr.net data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https: wss:",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Cabeceras comunes a ambos mundos (no entran en conflicto entre reglas).
const baseSecurityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No restringimos microphone ni autoplay: el secuenciador y los audios los usan.
  { key: "Permissions-Policy", value: "camera=(), geolocation=(), browsing-topics=()" },
];

const nextConfig: NextConfig = {
  // Permite archivos .md y .mdx como páginas
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  trailingSlash: false,

  // ─── Security headers ──────────────────────────────────────────────────────
  // Cada ruta cae en EXACTAMENTE una regla (los juegos quedan fuera del catch-all
  // estricto vía negative-lookahead), así que recibe una sola cabecera CSP.
  async headers() {
    return [
      // Assets de Vite con hash de contenido en el nombre: cachear un año.
      // (La regla CSP de /apps/:path* también matchea; las cabeceras se combinan.)
      {
        source: "/apps/:app/assets/:asset*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      {
        source: "/apps/:path*",
        headers: [...baseSecurityHeaders, { key: "Content-Security-Policy", value: gameCsp }],
      },
      {
        source: "/tools/:path*",
        headers: [...baseSecurityHeaders, { key: "Content-Security-Policy", value: gameCsp }],
      },
      {
        source: "/((?!apps/|tools/).*)",
        headers: [...baseSecurityHeaders, { key: "Content-Security-Policy", value: appCsp }],
      },
    ];
  },

  // ─── Redirects: legacy WordPress URLs y rutas obsoletas ────────────────────
  async redirects() {
    return [
      // ── WordPress date-based posts ────────────────────────────────────────
      {
        source: "/:year(\\d{4})/:month(\\d{2})/:day(\\d{2})/:slug*",
        destination: "/",
        permanent: true,
      },
      // ── Rutas legacy /en/* ────────────────────────────────────────────────
      { source: "/en/start", destination: "/en", permanent: true },
      { source: "/en/start/", destination: "/en", permanent: true },
      { source: "/en/apps-2", destination: "/en/apps", permanent: true },
      { source: "/en/apps-2/", destination: "/en/apps", permanent: true },
      { source: "/en/lessons-workshop", destination: "/en/classes-workshop", permanent: true },
      { source: "/en/lessons-workshop/", destination: "/en/classes-workshop", permanent: true },
      // ── WordPress archives / taxonomías ───────────────────────────────────
      { source: "/category/:slug*", destination: "/", permanent: true },
      { source: "/tag/:slug*", destination: "/", permanent: true },
      { source: "/author/:slug*", destination: "/", permanent: true },
      { source: "/en/category/:slug*", destination: "/en", permanent: true },
      { source: "/en/tag/:slug*", destination: "/en", permanent: true },
      { source: "/en/author/:slug*", destination: "/en", permanent: true },
      { source: "/es/category/:slug*", destination: "/es", permanent: true },
      { source: "/es/tag/:slug*", destination: "/es", permanent: true },
      { source: "/es/author/:slug*", destination: "/es", permanent: true },
      // ── WordPress feeds ───────────────────────────────────────────────────
      { source: "/feed", destination: "/", permanent: true },
      { source: "/feed/", destination: "/", permanent: true },
      { source: "/feed/:path*", destination: "/", permanent: true },
      { source: "/wp-json/:path*", destination: "/", permanent: true },
      // ── WordPress admin / login ───────────────────────────────────────────
      { source: "/wp-admin/:path*", destination: "/", permanent: true },
      { source: "/wp-login.php", destination: "/", permanent: true },
      // ── Página de inicio sin locale → locale por defecto ─────────────────
      { source: "/inicio", destination: "/es", permanent: true },
      { source: "/home", destination: "/en", permanent: true },
    ];
  },

  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "www.stormstudios.com.mx",
      },
      {
        protocol: "https",
        hostname: "i.ytimg.com",
      },
    ],
  },
};

const withMDX = createMDX({
  extension: /\.mdx?$/,
  options: {
    remarkPlugins: [],
    rehypePlugins: [],
  },
});

export default withNextIntl(withMDX(nextConfig));
