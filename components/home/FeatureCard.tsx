import { Link } from "@/i18n/navigation";

export interface CardProps {
  icon: string;
  tag: string;
  tagColor: string;
  accentHex: string;
  title: string;
  description: string;
  delay: string;
  href: string;
  ctaLabel: string;
}

export function FeatureCard({ icon, tag, tagColor, accentHex, title, description, delay, href, ctaLabel }: CardProps) {
  return (
    <Link
      href={href as Parameters<typeof Link>[0]["href"]}
      className="ss-glass ss-card ss-reveal"
      style={{
        borderRadius: "1.25rem",
        padding: "2rem",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        animationDelay: delay,
        textDecoration: "none",
      }}
    >
      <div
        style={{
          width: "3rem",
          height: "3rem",
          borderRadius: "0.75rem",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "1.25rem",
          background: `${accentHex}22`,
          border: `1px solid ${accentHex}44`,
        }}
      >
        {icon}
      </div>

      <span
        className="ss-mono"
        style={{
          fontSize: "0.6rem",
          letterSpacing: "0.15em",
          textTransform: "uppercase",
          padding: "0.25rem 0.75rem",
          borderRadius: "9999px",
          alignSelf: "flex-start",
          background: `${accentHex}22`,
          color: tagColor,
          border: `1px solid ${accentHex}40`,
        }}
      >
        {tag}
      </span>

      <h3 className="ss-serif" style={{ fontSize: "1.5rem", lineHeight: 1.2, color: "white" }}>
        {title}
      </h3>

      <p className="ss-mono" style={{ fontSize: "0.8rem", lineHeight: 1.8, color: "rgba(255,255,255,0.5)" }}>
        {description}
      </p>

      <span
        className="ss-mono"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "0.4rem",
          fontSize: "0.78rem",
          fontWeight: 500,
          marginTop: "auto",
          color: tagColor,
        }}
      >
        {ctaLabel}
      </span>
    </Link>
  );
}
