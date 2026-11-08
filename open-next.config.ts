import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// El contenido se publica con cada build; actualmente no usa ISR/revalidación.
// Conserva las páginas prerenderizadas sin crear buckets R2 ni Durable Objects.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: true,
});
