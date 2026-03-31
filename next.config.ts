import type { NextConfig } from "next";
import createMDX from "@next/mdx";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./i18n/request.ts");

const nextConfig: NextConfig = {
  // Permite archivos .md y .mdx como páginas
  pageExtensions: ["js", "jsx", "md", "mdx", "ts", "tsx"],
  trailingSlash: false,

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
