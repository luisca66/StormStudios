import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: [
          // Las APIs no son páginas; CSS, JS e imágenes de /_next sí deben rastrearse.
          "/api/",
          // Rutas WordPress legacy (aunque ya redirigen, bloqueamos el crawl)
          "/wp-admin/",
          "/wp-login.php",
          "/wp-json/",
          // Las URLs legacy deben poder rastrearse para descubrir su 308/410.
        ],
      },
    ],
    sitemap: "https://www.stormstudios.com.mx/sitemap.xml",
    host: "https://www.stormstudios.com.mx",
  };
}
