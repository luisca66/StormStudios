import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

interface GrowthItem {
  key: "available" | "building" | "return";
  href: "/curso-armonia" | "/apps" | "/blog";
  accentHex: string;
  accentSoft: string;
}

const growthItems: GrowthItem[] = [
  {
    key: "available",
    href: "/curso-armonia",
    accentHex: "#8b5cf6",
    accentSoft: "#c4b5fd",
  },
  {
    key: "building",
    href: "/apps",
    accentHex: "#3b82f6",
    accentSoft: "#93c5fd",
  },
  {
    key: "return",
    href: "/blog",
    accentHex: "#10b981",
    accentSoft: "#86efac",
  },
];

export async function HomeGrowthSection() {
  const t = await getTranslations("home.growth");

  return (
    <section style={{ padding: "0 2rem 6rem", position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>
      <div
        className="ss-glass ss-reveal"
        style={{
          borderRadius: "2rem",
          padding: "3rem",
          position: "relative",
          overflow: "hidden",
          boxShadow: "0 0 100px rgba(59,130,246,0.12)",
          animationDelay: "0.1s",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            borderRadius: "2rem",
            background:
              "radial-gradient(circle at top left, rgba(139,92,246,0.16) 0%, transparent 36%), radial-gradient(circle at bottom right, rgba(16,185,129,0.12) 0%, transparent 34%)",
            pointerEvents: "none",
          }}
        />

        <div style={{ position: "relative", zIndex: 1 }}>
          <div
            className="ss-mono"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: "0.65rem",
              fontSize: "0.68rem",
              letterSpacing: "0.14em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.68)",
              marginBottom: "1.5rem",
              padding: "0.45rem 0.95rem",
              borderRadius: "9999px",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.08)",
            }}
          >
            <span
              className="ss-blink"
              style={{
                width: "8px",
                height: "8px",
                borderRadius: "50%",
                background: "#34d399",
                boxShadow: "0 0 12px #34d399",
                display: "inline-block",
              }}
            />
            {t("badge")}
          </div>

          <div style={{ display: "grid", gap: "1.5rem", alignItems: "end", marginBottom: "2rem" }}>
            <div>
              <h2 className="ss-serif" style={{ fontSize: "clamp(2rem,5vw,3.6rem)", lineHeight: 1.05, marginBottom: "1rem" }}>
                {t("titleLine1")}
                <br />
                <span className="ss-text-gradient">{t("titleLine2")}</span>
              </h2>
              <p
                className="ss-mono"
                style={{
                  maxWidth: "760px",
                  fontSize: "0.92rem",
                  lineHeight: 1.9,
                  color: "rgba(255,255,255,0.56)",
                }}
              >
                {t("description")}
              </p>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "1rem" }}>
            {growthItems.map((item, index) => (
              <Link
                key={item.key}
                href={item.href}
                className="ss-card"
                style={{
                  textDecoration: "none",
                  color: "inherit",
                  borderRadius: "1.35rem",
                  padding: "1.5rem",
                  background: "rgba(8,10,18,0.58)",
                  border: "1px solid rgba(255,255,255,0.08)",
                  boxShadow: `inset 0 0 0 1px ${item.accentHex}10`,
                  display: "flex",
                  flexDirection: "column",
                  gap: "1rem",
                  minHeight: "220px",
                }}
              >
                <span
                  className="ss-mono"
                  style={{
                    fontSize: "0.62rem",
                    letterSpacing: "0.14em",
                    textTransform: "uppercase",
                    color: item.accentSoft,
                  }}
                >
                  {t(`items.${item.key}.eyebrow`)}
                </span>

                <div
                  style={{
                    width: "2.75rem",
                    height: "2.75rem",
                    borderRadius: "0.9rem",
                    background: `${item.accentHex}22`,
                    border: `1px solid ${item.accentHex}44`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: item.accentSoft,
                    fontSize: "1rem",
                  }}
                >
                  0{index + 1}
                </div>

                <h3 className="ss-serif" style={{ fontSize: "1.45rem", lineHeight: 1.2, color: "white" }}>
                  {t(`items.${item.key}.title`)}
                </h3>

                <p
                  className="ss-mono"
                  style={{
                    fontSize: "0.8rem",
                    lineHeight: 1.85,
                    color: "rgba(255,255,255,0.54)",
                    marginBottom: "auto",
                  }}
                >
                  {t(`items.${item.key}.description`)}
                </p>

                <span className="ss-mono" style={{ fontSize: "0.78rem", color: item.accentSoft }}>
                  {t(`items.${item.key}.cta`)}
                </span>
              </Link>
            ))}
          </div>

          <p
            className="ss-mono"
            style={{
              marginTop: "1.5rem",
              fontSize: "0.78rem",
              lineHeight: 1.8,
              color: "rgba(255,255,255,0.42)",
              maxWidth: "720px",
            }}
          >
            {t("footer")}
          </p>
        </div>
      </div>
    </section>
  );
}
