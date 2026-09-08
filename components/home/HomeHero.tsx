import { WaveVisualizer } from "@/components/WaveVisualizer";
import { StatItem } from "@/components/home/StatItem";
import { Link } from "@/i18n/navigation";
import { getAllLessons } from "@/lib/course";
import { APPS } from "@/data/apps/apps-catalog";
import { getTranslations } from "next-intl/server";

const PUBLISHED_APP_COUNT = APPS.filter(({ isTool }) => !isTool).length;

export async function HomeHero() {
  const t = await getTranslations("home.hero");

  return (
    <section className="ss-home-hero"
      style={{
        textAlign: "center",
        padding: "var(--ss-hero-padding, 4rem 2rem 5rem)",
        maxWidth: "1280px",
        margin: "0 auto",
        position: "relative",
        zIndex: 1,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      <div
        className="ss-glass ss-reveal ss-mono"
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "0.5rem",
          padding: "0.45rem 1rem",
          borderRadius: "9999px",
          marginBottom: "2.5rem",
          fontSize: "0.72rem",
          letterSpacing: "0.1em",
          color: "var(--ss-muted)",
          animationDelay: "0s",
        }}
      >
        <span
          className="ss-blink"
          style={{
            width: "6px",
            height: "6px",
            borderRadius: "50%",
            background: "#fbbf24",
            boxShadow: "0 0 8px #fbbf24",
            display: "inline-block",
          }}
        />
        {t("badge")}
      </div>

      <h1
        className="ss-serif ss-reveal"
        style={{
          fontSize: "clamp(2.15rem,6vw,5.5rem)",
          lineHeight: 1,
          marginBottom: "1.5rem",
          animationDelay: "0.12s",
        }}
      >
        {t("titlePrefix")} <span className="ss-text-gradient">{t("titleEmphasis")}</span>
        <br />
        {t("titleSuffix")}
      </h1>

      <p
        className="ss-mono ss-reveal"
        style={{
          maxWidth: "600px",
          fontSize: "1rem",
          lineHeight: 1.75,
          color: "var(--ss-muted)",
          marginBottom: "3rem",
          animationDelay: "0.24s",
          whiteSpace: "pre-line",
        }}
      >
        {t("description")}
      </p>

      <div
        className="ss-reveal"
        style={{
          display: "flex",
          gap: "1rem",
          flexWrap: "wrap",
          justifyContent: "center",
          marginBottom: "5rem",
          animationDelay: "0.36s",
        }}
      >
        <Link
          href="/curso-armonia"
          className="ss-mono"
          style={{
            background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
            color: "white",
            padding: "1rem 2.2rem",
            borderRadius: "0.875rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            boxShadow: "0 8px 32px rgba(139,92,246,0.4)",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          {t("primaryCta")}
        </Link>
        <Link
          href="/apps"
          className="ss-glass ss-mono"
          style={{
            color: "var(--ss-muted)",
            padding: "1rem 2.2rem",
            borderRadius: "0.875rem",
            fontSize: "0.85rem",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          {t("secondaryCta")}
        </Link>
      </div>

      <div className="ss-reveal" style={{ width: "100%", maxWidth: "680px", animationDelay: "0.48s" }}>
        <div
          className="ss-glass"
          style={{
            borderRadius: "1.25rem",
            padding: "1.5rem 2rem",
            boxShadow: "0 0 80px rgba(139,92,246,0.12), inset 0 0 40px rgba(59,130,246,0.05)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.25rem" }}>
            <div style={{ display: "flex", gap: "6px" }}>
              {["#ef4444", "#fbbf24", "#22c55e"].map((c) => (
                <div key={c} style={{ width: "12px", height: "12px", borderRadius: "50%", background: c }} />
              ))}
            </div>
            <span className="ss-mono" style={{ fontSize: "0.65rem", color: "var(--ss-muted)", letterSpacing: "0.08em" }}>
              {t("analysisLabel")}
            </span>
            <div className="ss-blink" style={{ width: "8px", height: "8px", borderRadius: "50%", background: "#22c55e", boxShadow: "0 0 10px #22c55e" }} />
          </div>
          <WaveVisualizer />
        </div>
      </div>

      <div
        className="ss-reveal"
        style={{ display: "flex", flexWrap: "wrap", gap: "3rem", justifyContent: "center", marginTop: "5rem", animationDelay: "0.6s" }}
      >
        <StatItem value={String(getAllLessons().filter(lesson => lesson.status !== "construction").length)} label={t("stats.lessons")} />
        <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
        <StatItem value={String(PUBLISHED_APP_COUNT)} label={t("stats.freeApps")} />
        <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
        <StatItem value="MIDI" label={t("stats.evaluation")} />
        <div className="ss-divider" style={{ width: "1px", alignSelf: "stretch" }} />
        <StatItem value="∞" label={t("stats.access")} />
      </div>
    </section>
  );
}
