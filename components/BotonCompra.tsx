type Props = {
  href: string;
  icono: string;
  children: string;
};

export default function BotonCompra({ href, icono, children }: Props) {
  return (
    <a
      href={href}
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
