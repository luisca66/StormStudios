import { Link } from "@/i18n/navigation";
import { getLocale } from "next-intl/server";
import { MasteryCard } from "@/components/mastery/MasteryCard";
import { getMasteryPieces } from "@/lib/mdx";

export async function HomeMasterySection() {
  const locale = await getLocale();
  const es = locale === "es";
  const [latest] = await getMasteryPieces(locale);

  if (!latest) return null;

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
            background: "rgba(139,92,246,0.15)",
            color: "#c4b5fd",
            border: "1px solid rgba(139,92,246,0.25)",
            padding: "0.35rem 1rem",
            borderRadius: "9999px",
            marginBottom: "1.5rem",
          }}
        >
          {es ? "Maestría" : "Mastery"}
        </span>
        <h2 className="ss-serif" style={{ fontSize: "clamp(2rem,5vw,3.3rem)", lineHeight: 1.08 }}>
          {es ? "Sabiduría para" : "Wisdom for"}
          <br />
          <span className="ss-text-gradient">{es ? "músicos y atletas" : "musicians and athletes"}</span>
        </h2>
      </div>

      <div style={{ maxWidth: "560px", margin: "0 auto" }}>
        <MasteryCard piece={latest} locale={locale} heading="h3" />
      </div>

      <p style={{ textAlign: "center", marginTop: "1.5rem" }}>
        <Link href="/maestria" className="ss-mono" style={{ fontSize: "0.85rem", color: "#c4b5fd" }}>
          {es ? "Ver toda la sección →" : "See the whole section →"}
        </Link>
      </p>
    </section>
  );
}
