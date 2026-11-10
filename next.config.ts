import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// ─── Content Security Policy ─────────────────────────────────────────────────
// Dos políticas porque el sitio combina dos mundos:
//   1. La app Next.js: scripts propios y reCAPTCHA acotado; 'unsafe-eval' se
//      habilita solo en desarrollo porque React lo usa para sus herramientas de
//      depuración. connect-src queda acotado a Firebase.
//   2. Los juegos HTML autónomos en /apps y /tools (permisiva): sus librerías y
//      el CSS de Tailwind se sirven desde el propio sitio, pero necesitan
//      'unsafe-inline' y 'unsafe-eval' (Babel en el navegador, scripts inline).
// El catch-all estricto excluye /apps y /tools con un negative-lookahead para que
// cada ruta reciba UNA sola cabecera CSP (dos romperían los juegos por intersección).

// CSP para la app Next.js. reCAPTCHA se permite sólo en sus rutas oficiales
// para la certificación de App Check de Memoria; no se admiten CDNs generales.
// 'unsafe-inline' en script es inevitable
// porque Next inyecta scripts de hidratación inline sin nonce en render estático;
// En producción quitamos 'unsafe-eval' y los CDNs generales. media-src permite
// https para el audio servido vía <audio> (lectura musical, memoria, elefantito);
// connect-src permite los tres dominios de audio porque la lectura rítmica carga samples con
// fetch()+decodeAudioData (Web Audio), que se rige por connect-src, no media-src.
const appScriptSrc =
  process.env.NODE_ENV === "development"
    ? "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/"
    : "script-src 'self' 'unsafe-inline' https://www.google.com/recaptcha/ https://www.gstatic.com/recaptcha/";

const appCsp = [
  "default-src 'self'",
  appScriptSrc,
  "style-src 'self' 'unsafe-inline'",
  "font-src 'self' data:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  "connect-src 'self' https://*.googleapis.com https://*.gstatic.com https://*.firebaseio.com https://*.firebasestorage.app https://www.google.com/recaptcha/ https://samples.stormstudios.com.mx https://musica.stormstudios.com.mx https://sfx.stormstudios.com.mx wss://*.firebaseio.com",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com https://www.google.com/recaptcha/ https://recaptcha.google.com/recaptcha/",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// CSP permisiva SOLO para los juegos HTML autónomos (/apps/*, /tools/*).
const gameCsp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com data:",
  // Tone.js programa su reloj en un worker creado desde un blob.
  "worker-src 'self' blob:",
  "img-src 'self' data: blob: https:",
  "media-src 'self' data: blob: https:",
  // Audio actual y dos buckets heredados usados por Diapasón/clientes en caché.
  "connect-src 'self' https://samples.stormstudios.com.mx https://musica.stormstudios.com.mx https://sfx.stormstudios.com.mx https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev",
  "frame-src 'self' https://www.youtube.com https://www.youtube-nocookie.com https://player.vimeo.com",
  "frame-ancestors 'self'",
  "base-uri 'self'",
  "form-action 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

// Cabeceras comunes a ambos mundos (no entran en conflicto entre reglas).
const baseSecurityHeaders = [
  // Vercel lo enviaba solo; en Cloudflare hay que declararlo.
  { key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" },
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
      // Librerías autoalojadas con versión en el nombre (public/vendor).
      {
        source: "/vendor/:file*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
      // Estáticos sin hash en el nombre: un día de caché y revalidación en segundo plano.
      {
        source: "/:dir(images|og|audio)/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=86400, stale-while-revalidate=604800" }],
      },
      {
        source: "/apps/:path*",
        headers: [...baseSecurityHeaders, { key: "Content-Security-Policy", value: gameCsp }, { key: "X-Robots-Tag", value: "noindex, follow" }],
      },
      {
        source: "/tools/:path*",
        headers: [...baseSecurityHeaders, { key: "Content-Security-Policy", value: gameCsp }, { key: "X-Robots-Tag", value: "noindex, follow" }],
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
      // ── Dominio canónico: el apex redirige a www (antes lo hacía Vercel) ──
      {
        source: "/:path*",
        has: [{ type: "host", value: "stormstudios.com.mx" }],
        destination: "https://www.stormstudios.com.mx/:path*",
        permanent: true,
      },
      // ── Batería: conservar enlaces antiguos con URL canónica v9.6 ─────────
      {
        source: "/apps/storm-bateria-v9.5.html",
        destination: "/apps/storm-bateria-v9.6.html",
        permanent: true,
      },
      {
        source: "/apps/storm-bateria-v9.5-en.html",
        destination: "/apps/storm-bateria-v9.6-en.html",
        permanent: true,
      },
      // ── Rutas legacy /en/* ────────────────────────────────────────────────
      { source: "/en/start", destination: "/en", permanent: true },
      { source: "/en/start/", destination: "/en", permanent: true },
      { source: "/en/apps-2", destination: "/en/apps", permanent: true },
      { source: "/en/apps-2/", destination: "/en/apps", permanent: true },
      { source: "/en/lessons-workshop", destination: "/en/classes-workshop", permanent: true },
      { source: "/en/lessons-workshop/", destination: "/en/classes-workshop", permanent: true },
      // ── WordPress admin / login ───────────────────────────────────────────
      { source: "/wp-admin/:path*", destination: "/", permanent: true },
      { source: "/wp-login.php", destination: "/", permanent: true },
      // ── Página de inicio sin locale → locale por defecto ─────────────────
      { source: "/inicio", destination: "/es", permanent: true },
      { source: "/home", destination: "/en", permanent: true },
      // ── Carpetas de archivos estáticos sin página propia ───────────────
      { source: "/apps", destination: "/es/apps", permanent: true },
      { source: "/tools", destination: "/es/apps", permanent: true },
    ];
  },

  images: {
    // Cloudflare Images no está configurado: se sirven los archivos originales.
    unoptimized: true,
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
