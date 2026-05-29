import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

// ─── Content Security Policy (compatibility-first) ───────────────────────────
// El sitio combina la app Next.js con juegos HTML autónomos embebidos por iframe
// (secuenciador, tetris, etc.) que cargan librerías desde CDNs (Tailwind Play,
// jsDelivr, cdnjs, unpkg) y requieren 'unsafe-eval'. Como esos .html reciben el
// mismo header, el CSP debe permitirlos. Sigue aportando defensa: bloquea
// orígenes de script fuera de la allowlist, clickjacking (frame-ancestors),
// object-src, base-uri y form-action.
const SCRIPT_CDNS = [
  "https://cdn.jsdelivr.net",
  "https://cdn.tailwindcss.com",
  "https://cdnjs.cloudflare.com",
  "https://unpkg.com",
].join(" ");

const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' 'unsafe-eval' ${SCRIPT_CDNS}`,
  `style-src 'self' 'unsafe-inline' https://fonts.googleapis.com ${SCRIPT_CDNS}`,
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

const securityHeaders = [
  { key: "Content-Security-Policy", value: contentSecurityPolicy },
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

  // ─── Security headers (aplican a todas las rutas) ──────────────────────────
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
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
