import { Link } from "@/i18n/navigation";
import { getTranslations } from "next-intl/server";

export async function HomePrivateLessons() {
  const t = await getTranslations("home.privateLessons");

  return (
    <section style={{ padding: "0 2rem 6rem", position: "relative", zIndex: 1, maxWidth: "1280px", margin: "0 auto" }}>
      <div className="ss-glass rounded-2xl p-6 sm:p-8">
        <h2 className="ss-serif mb-3" style={{ fontSize: "clamp(1.5rem,3vw,2rem)" }}>
          {t("title")}
        </h2>
        <p className="ss-mono text-sm mb-5" style={{ color: "var(--ss-muted)", lineHeight: 1.8 }}>
          {t("description")}
        </p>
        <Link
          href="/contacto"
          data-measure="contact_click"
          data-destination="home"
          className="ss-mono inline-block rounded-lg px-5 py-3 text-sm"
          style={{ color: "var(--ss-violet-text)", background: "rgba(139,92,246,0.1)", border: "1px solid rgba(139,92,246,0.3)", textDecoration: "none" }}
        >
          {t("button")}
        </Link>
      </div>
    </section>
  );
}
