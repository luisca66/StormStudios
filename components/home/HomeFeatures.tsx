import { FeatureCard, type CardProps } from "@/components/home/FeatureCard";
import { getTranslations } from "next-intl/server";

export async function HomeFeatures() {
  const t = await getTranslations("home.features");

  const features: CardProps[] = [
    {
      icon: "📖",
      tag: t("items.course.tag"),
      tagColor: "#c4b5fd",
      accentHex: "#8b5cf6",
      title: t("items.course.title"),
      description: t("items.course.description"),
      delay: "0.1s",
      href: "/curso-armonia",
      ctaLabel: t("exploreCta"),
    },
    {
      icon: "🎧",
      tag: t("items.apps.tag"),
      tagColor: "#93c5fd",
      accentHex: "#3b82f6",
      title: t("items.apps.title"),
      description: t("items.apps.description"),
      delay: "0.25s",
      href: "/apps",
      ctaLabel: t("exploreCta"),
    },
    {
      icon: "🧠",
      tag: t("items.virtualTeacher.tag"),
      tagColor: "#67e8f9",
      accentHex: "#06b6d4",
      title: t("items.virtualTeacher.title"),
      description: t("items.virtualTeacher.description"),
      delay: "0.4s",
      href: "/curso-armonia",
      ctaLabel: t("exploreCta"),
    },
    {
      icon: "📚",
      tag: t("items.book.tag"),
      tagColor: "#6ee7b7",
      accentHex: "#10b981",
      title: t("items.book.title"),
      description: t("items.book.description"),
      delay: "0.55s",
      href: "/el-libro",
      ctaLabel: t("exploreCta"),
    },
  ];

  return (
    <section style={{ padding: "6rem 2rem", position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>
      <div style={{ textAlign: "center", marginBottom: "4rem" }}>
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
          {t("badge")}
        </span>
        <h2
          className="ss-serif ss-reveal"
          style={{ fontSize: "clamp(2rem,5vw,3.5rem)", lineHeight: 1.1, marginBottom: "1rem", animationDelay: "0.1s" }}
        >
          {t("titleLine1")}
          <br />
          <span className="ss-text-gradient">{t("titleLine2")}</span>
        </h2>
        <p
          className="ss-mono ss-reveal"
          style={{ fontSize: "0.875rem", color: "rgba(255,255,255,0.45)", maxWidth: "480px", margin: "0 auto", lineHeight: 1.8, animationDelay: "0.2s" }}
        >
          {t("description")}
        </p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1.25rem" }}>
        {features.map((f) => (
          <FeatureCard key={f.tag} {...f} />
        ))}
      </div>
    </section>
  );
}
