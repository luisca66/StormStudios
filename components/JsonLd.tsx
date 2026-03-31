/**
 * JsonLd — inyecta structured data (Schema.org) como <script type="application/ld+json">
 * Uso: <JsonLd data={{ "@context": "https://schema.org", ... }} />
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
