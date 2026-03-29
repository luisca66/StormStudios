import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Infra de Next.js
          "/api/",
          "/_next/",
          // Rutas WordPress legacy (aunque ya redirigen, bloqueamos el crawl)
          "/wp-admin/",
          "/wp-login.php",
          "/wp-json/",
          "/feed/",
          "/category/",
          "/tag/",
          "/author/",
          // Rutas obsoletas
          "/en/start/",
          "/en/apps-2/",
          "/en/lessons-workshop/",
        ],
      },
    ],
    sitemap: "https://www.stormstudios.com.mx/sitemap.xml",
    host: "https://www.stormstudios.com.mx",
  };
}
