import { createHash } from "node:crypto";
import { getCloudflareContext } from "@opennextjs/cloudflare";

/** Binding de Rate Limiting de Workers (declarado en `wrangler.jsonc`). */
type RateLimitBinding = {
  limit(options: { key: string }): Promise<{ success: boolean }>;
};

export type EdgeLimiterName = "CONTACT_LIMITER" | "MAESTRO_LIMITER";

/**
 * Límite compartido entre todas las instancias del Worker.
 *
 * El contador en memoria de cada ruta solo ve las peticiones de su propio
 * isolate; en Cloudflare cada petición puede caer en uno distinto. Este binding
 * cuenta en el borde por clave (la IP del visitante).
 *
 * Devuelve `true` si la petición puede seguir. Fuera de Cloudflare (`next dev`,
 * `next start`, pruebas) no hay binding y siempre devuelve `true`: ahí queda el
 * límite en memoria de la ruta.
 *
 * La clave debe ser idéntica en todas las instancias, así que se deriva de la
 * IP con un hash fijo (nunca con una sal aleatoria por isolate) y no guarda la
 * IP en claro.
 */
export function edgeRateLimitKey(name: EdgeLimiterName, ip: string): string {
  return createHash("sha256").update(`${name}:${ip}`).digest("base64url");
}

export async function passesEdgeRateLimit(name: EdgeLimiterName, ip: string): Promise<boolean> {
  const key = edgeRateLimitKey(name, ip);
  let limiter: RateLimitBinding | undefined;

  try {
    const { env } = await getCloudflareContext({ async: true });
    limiter = (env as unknown as Record<string, RateLimitBinding | undefined>)[name];
  } catch {
    return true;
  }

  if (!limiter) {
    return true;
  }

  try {
    const { success } = await limiter.limit({ key });
    return success;
  } catch {
    // Si el servicio de límites falla, no bloquear a usuarios legítimos.
    return true;
  }
}
