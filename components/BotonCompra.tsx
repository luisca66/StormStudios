type Props = {
  href: string;
  icono: string;
  formato: "kindle" | "paperback" | "hardcover";
  children: string;
};

export default function BotonCompra({ href, icono, formato, children }: Props) {
  return (
    <a
      href={href}
      data-measure="amazon_click"
      data-destination={`${formato}:${new URL(href).hostname.replace(/^www\./, "")}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-[0.6rem] rounded-[0.75rem] border border-[rgba(139,92,246,0.35)] bg-[rgba(139,92,246,0.15)] px-[1.25rem] py-[0.75rem] text-[0.85rem] hover:bg-[rgba(139,92,246,0.25)]"
      // Inline styles take precedence over the .blog-prose link rules.
      style={{ color: "#c4b5fd", textDecoration: "none", fontFamily: "monospace" }}
    >
      <span aria-hidden="true">{icono}</span>
      {children}
    </a>
  );
}
