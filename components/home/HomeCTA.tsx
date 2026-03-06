import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function HomeCTA() {
  const t = await getTranslations("home.cta");

  return (
    <section style={{ padding: "0 2rem 8rem", position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>
      <div
        className="ss-glass"
        style={{ borderRadius: "2rem", padding: "4rem 3rem", textAlign: "center", position: "relative", overflow: "hidden", boxShadow: "0 0 100px rgba(139,92,246,0.14)" }}
      >
        <div style={{ position: "absolute", inset: 0, borderRadius: "2rem", background: "radial-gradient(ellipse at 50% 0%, rgba(139,92,246,0.15) 0%, transparent 65%)", pointerEvents: "none" }} />
        <h2
          className="ss-serif ss-reveal"
          style={{ fontSize: "clamp(1.8rem,4vw,3rem)", lineHeight: 1.15, marginBottom: "1rem", position: "relative", zIndex: 1, animationDelay: "0.1s" }}
        >
          {t("titleLine1")}
          <br />
          <span className="ss-text-gradient">{t("titleLine2")}</span>
        </h2>
        <p
          className="ss-mono ss-reveal"
          style={{ fontSize: "0.85rem", color: "rgba(255,255,255,0.45)", marginBottom: "2rem", position: "relative", zIndex: 1, animationDelay: "0.2s" }}
        >
          {t("description")}
        </p>
        <Link
          href="/curso-armonia"
          className="ss-mono ss-reveal"
          style={{
            background: "linear-gradient(135deg,#8b5cf6,#3b82f6)",
            color: "white",
            padding: "1rem 2.5rem",
            borderRadius: "0.875rem",
            fontSize: "0.85rem",
            fontWeight: 500,
            boxShadow: "0 8px 40px rgba(139,92,246,0.4)",
            position: "relative",
            zIndex: 1,
            animationDelay: "0.3s",
            textDecoration: "none",
            display: "inline-block",
          }}
        >
          {t("button")}
        </Link>
      </div>
    </section>
  );
}
