import { isIP } from "node:net";

/**
 * IP del visitante para limitar abusos.
 *
 * En producción el sitio corre en Cloudflare, que fija `cf-connecting-ip` en el
 * borde y reemplaza cualquier valor que mande el cliente. `x-forwarded-for` sí lo
 * controla el visitante, así que solo se usa cuando no hay Cloudflare delante
 * (`next dev`, `next start` y las pruebas).
 */
export function getClientIp(headers: Headers): string {
  const cloudflareIp = headers.get("cf-connecting-ip")?.trim();
  if (cloudflareIp) {
    return isIP(cloudflareIp) ? cloudflareIp : "unknown";
  }

  const candidates = [
    headers.get("x-real-ip")?.trim(),
    headers.get("x-forwarded-for")?.split(",")[0]?.trim(),
  ];

  for (const candidate of candidates) {
    if (candidate && isIP(candidate)) {
      return candidate;
    }
  }

  return "unknown";
}
