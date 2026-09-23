import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Storm Studios Learning",
    short_name: "Storm Studios",
    description: "Curso de armonía, entrenamiento auditivo y apps musicales de Luis Cárdenas.",
    start_url: "/es",
    display: "standalone",
    background_color: "#050508",
    theme_color: "#050508",
    icons: [
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon.png", sizes: "180x180", type: "image/png" },
    ],
  };
}
