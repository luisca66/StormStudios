import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { getAllResources } from "@/data/resources/resources-catalog";

export async function HomeResourcesSection() {
  const locale = await getLocale();
  const es = locale === "es";
  const resources = getAllResources();

  return (
    <section style={{ padding: "0 2rem 6rem", position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "2.5rem" }}>
        <span
          className="ss-mono"
          style={{
            display: "inline-block",
            fontSize: "0.65rem",
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            background: "rgba(59,130,246,0.15)",
            color: "#93c5fd",
            border: "1px solid rgba(59,130,246,0.25)",
            padding: "0.35rem 1rem",
            borderRadius: "9999px",
            marginBottom: "1.5rem",
          }}
        >
          {es ? "Temas clave" : "Key topics"}
        </span>
        <h2 className="ss-serif" style={{ fontSize: "clamp(2rem,5vw,3.3rem)", lineHeight: 1.08, marginBottom: "1rem" }}>
          {es ? "Explora guias" : "Explore guides"}
          <br />
          <span className="ss-text-gradient">{es ? "por tema" : "by topic"}</span>
        </h2>
        <p className="ss-mono" style={{ maxWidth: "700px", margin: "0 auto", color: "rgba(255,255,255,0.5)", lineHeight: 1.85 }}>
          {es
            ? "Desde curso de armonia tradicional hasta reconocimiento de intervalos: estas paginas enlazan los temas mas buscados con el curso, las apps y el blog."
            : "From traditional harmony to interval recognition: these pages connect the most searched topics with the course, apps and blog."}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
        {resources.map((resource) => (
          <Link
            key={resource.key}
            href={{ pathname: "/resources/[slug]", params: { slug: resource.slugs[locale as "es" | "en"] } }}
            className="ss-glass ss-card"
            style={{
              textDecoration: "none",
              color: "inherit",
              borderRadius: "1.35rem",
              padding: "1.5rem",
              border: "1px solid rgba(255,255,255,0.08)",
              display: "flex",
              flexDirection: "column",
              gap: "0.9rem",
            }}
          >
            <span className="ss-mono" style={{ fontSize: "0.62rem", letterSpacing: "0.14em", textTransform: "uppercase", color: "#93c5fd" }}>
              {es ? "Guia" : "Guide"}
            </span>
            <h3 className="ss-serif" style={{ fontSize: "1.35rem", lineHeight: 1.2, color: "white" }}>
              {resource.title[locale as "es" | "en"]}
            </h3>
            <p className="ss-mono" style={{ fontSize: "0.8rem", lineHeight: 1.8, color: "rgba(255,255,255,0.54)", marginBottom: "auto" }}>
              {resource.metaDescription[locale as "es" | "en"]}
            </p>
            <span className="ss-mono" style={{ fontSize: "0.78rem", color: "#93c5fd" }}>
              {es ? "Abrir guia" : "Open guide"}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
