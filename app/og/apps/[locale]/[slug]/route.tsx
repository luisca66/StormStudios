import { ImageResponse } from "next/og";
import { getAppBySlug } from "@/data/apps/apps-catalog";

export async function GET(_request: Request, { params }: { params: Promise<{ locale: string; slug: string }> }) {
  const { locale, slug } = await params;
  const app = getAppBySlug(slug);
  if (!app || (locale !== "es" && locale !== "en")) return new Response("Not found", { status: 404 });
  return new ImageResponse(
    <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", width: "100%", height: "100%", background: "#0b0917", color: "#f0eeff", padding: "70px", borderLeft: "18px solid #a78bfa" }}>
      <div style={{ display: "flex", fontSize: 25, color: "#ddd6fe", marginBottom: 30 }}>STORM STUDIOS LEARNING · LUIS CÁRDENAS</div>
      <div style={{ display: "flex", fontSize: 62, lineHeight: 1.12, marginBottom: 28 }}>{app.name[locale]}</div>
      <div style={{ display: "flex", fontSize: 28, color: "#c6c3d5", lineHeight: 1.4 }}>{app.description[locale].slice(0, 190)}</div>
      <div style={{ display: "flex", fontSize: 22, marginTop: 38, color: "#86efac" }}>stormstudios.com.mx</div>
    </div>,
    { width: 1200, height: 630, headers: { "Cache-Control": "public, max-age=3600" } },
  );
}
