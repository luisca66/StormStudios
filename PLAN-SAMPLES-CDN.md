# Plan: samples con caché permanente (descargar una vez por alumno)

Instrucciones para ejecutar cuando llegue la fase de publicidad/tráfico.
Escrito por Fable 5 (2026-07-05) a partir del diagnóstico de 2026-06-12.
**Parte A = pasos de Luis (dashboards). Parte B = trabajo de Opus/Claude (código).**
El orden de ejecución (sección final) garantiza cero downtime.

---

## Contexto y objetivo

- Todos los samples de audio (Piano/Cello/etc., sfx, música) se sirven desde
  **3 buckets R2** vía URLs `pub-*.r2.dev`.
- **Buena noticia:** R2 NO cobra transferencia de salida (egress $0, a diferencia
  de S3). Las lecturas (operaciones Clase B) cuestan ~$0.36 USD por millón con
  10 millones gratis/mes. La viralización NO genera facturas de transferencia.
- **El riesgo real:** las URLs `pub-*.r2.dev` son de desarrollo — Cloudflare les
  aplica **rate limiting**. Con tráfico viral los samples empezarían a FALLAR
  (throttling), no a cobrar.
- **Objetivo de Luis:** que cada sample se descargue UNA sola vez por computadora
  de alumno.

## La solución (3 capas)

1. **Dominio propio para los buckets** (p. ej. `samples.stormstudios.com.mx`):
   quita el rate limit, activa el CDN de Cloudflare (los samples se sirven desde
   el borde, casi ni tocan el bucket).
2. **`Cache-Control: public, max-age=31536000, immutable`**: el navegador guarda
   cada sample en disco un año → una descarga por computadora. Los samples nunca
   cambian, así que `immutable` es correcto.
3. **(Opcional, blindaje extra) Service worker cache-first** en las apps: garantía
   dura de "una vez" incluso si el usuario borra caché HTTP, y semi-offline.
   Solo si 1+2 no bastan en la práctica.

---

## PARTE A — Lo que hace LUIS (dashboards, con calma)

### A1. Preparación (10 min, sin riesgo)
1. Entra a tu registrador de dominio y a Vercel → apunta en un papel/foto TODOS
   los registros DNS actuales de `stormstudios.com.mx`: los A/CNAME del sitio
   (apuntan a Vercel) y **cualquier MX/TXT de correo** (¡no perder el correo!).

### A2. Mover el DNS a Cloudflare (el hosting SIGUE en Vercel)
1. En Cloudflare (plan Free): **Add a site** → `stormstudios.com.mx`.
2. Cloudflare escanea y copia tus registros DNS automáticamente — **verifica
   contra tu lista de A1** que estén todos (especialmente MX).
3. En los registros que apuntan a Vercel (A `76.76.21.21` o CNAME
   `cname.vercel-dns.com`): pon la nube en **gris (DNS only)**, NO naranja.
   Vercel lo pide así; el sitio sigue sirviéndose igual que hoy.
4. Cloudflare te da 2 nameservers → cámbialos en tu registrador.
5. Espera propagación (minutos a horas). El sitio no se cae: los registros son
   los mismos, solo cambió quién los responde.

### A3. Dominio propio en cada bucket R2 (5 min por bucket)
1. Cloudflare → R2 → bucket de samples → **Settings → Custom Domains →
   Connect Domain** → `samples.stormstudios.com.mx`.
2. Repite para los otros 2 buckets con sus subdominios (p. ej.
   `sfx.stormstudios.com.mx`, `musica.stormstudios.com.mx` — Opus te confirmará
   nombres al ver qué hay en cada bucket).
3. Cloudflare crea los registros DNS solo. Las URLs viejas `pub-*.r2.dev`
   **siguen funcionando** — no se rompe nada todavía.

### A4. Regla de caché (esto logra el "una vez por alumno")
1. Cloudflare → tu dominio → **Caching → Cache Rules → Create rule**:
   - Nombre: `Samples inmutables`
   - When: Hostname *is in* `samples.stormstudios.com.mx`,
     `sfx.stormstudios.com.mx`, `musica.stormstudios.com.mx`
   - Then: **Eligible for cache**; **Edge TTL**: 1 año, "Override origin";
     **Browser TTL**: 1 año, "Override origin".
2. Con esto NO hace falta tocar los metadatos de miles de objetos en el bucket.

### A5. Avisar a Opus
Dile: *"Ya están los dominios de R2 y la Cache Rule, ejecuta la Parte B de
PLAN-SAMPLES-CDN.md"*. Y al final, prueba tú: cargar una app, recargar, y en
DevTools → Network los samples deben decir **"(disk cache)"** en la 2ª carga.

---

## PARTE B — Lo que hace OPUS/CLAUDE (código)

> Fuente de verdad: `grep -r "r2.dev"` en el repo AL MOMENTO de ejecutar (la
> lista de abajo es de 2026-06-12/07-05 y puede haber crecido).

### B1. CSP primero (¡antes de cambiar URLs!)
En `next.config.ts`, agregar los nuevos subdominios (`samples.`, `sfx.`,
`musica.stormstudios.com.mx`) a las directivas donde hoy están los `pub-*.r2.dev`
(`media-src` Y `connect-src` — el juego de intervalos usa **fetch**, que requiere
connect-src). NO quitar los `r2.dev` todavía (transición sin downtime).

### B2. Actualizar URLs hardcodeadas (~10+ lugares, verificar con grep)
Lista conocida:
- `apps-src/intervalos-cantados-juego/src/audio/engine.ts` (`AUDIO_BASE`)
- `apps-src/intervalos-cantados/src/config.ts` (o donde tenga su base URL)
- `lib/music-reading/audio.ts`
- `components/rhythm-reading/_lib/audio/samples.ts`
- `data/apps/memoria-data.ts`
- `GameLevel.jsx` de elefantito
- HTMLs de piano-notas / intervalos / batería / secuenciador en `public/apps/`
- Bundle de acordes-cantar: su fuente Vite vive fuera del repo (mac de Luis) —
  o se recompila allá, o se parcha la URL en el bundle compilado (sed sobre el
  JS en `public/apps/acordes-cantar/`) documentándolo.
- Juegos HTML (cosmic-ear, intervalos-cantados-juego viejo si aplica): revisar
  `music/` y `BASE_URL`.

### B3. Recompilar y desplegar las apps Vite afectadas
`npm run build` en cada `apps-src/*` tocado + espejo a `public/apps/*`
(el juego de intervalos usa `robocopy /MIR` de `dist`; otras usan su
`npm run deploy`).

### B4. Alinear lectura musical al patrón de caché en memoria
`lib/music-reading/audio.ts` usa `new Audio(url)` por nota sin caché propia —
alinearla al patrón AudioBuffer del juego de intervalos
(`apps-src/intervalos-cantados-juego/src/audio/engine.ts`, métodos
`loadNote`/`playNoteUrl`) o al caché de las demás apps.

### B5. Verificar
1. `curl -I https://samples.stormstudios.com.mx/Piano/C4.mp3` →
   debe traer `cf-cache-status: HIT` (2ª petición) y `cache-control` con max-age
   de un año.
2. En el sitio local y en prod: apps cargan, tocan notas, sin errores CSP en
   consola.
3. DevTools → Network → recargar: samples desde "(disk cache)".
4. Commit + push (workflow: directo a main).

### B6. (Opcional, fase 2) Service worker cache-first
Solo si Luis lo pide tras medir: SW en las apps con Cache API para samples
(cache-first, versionado por nombre de caché). Beneficio marginal sobre B1-B5:
sobrevive limpiezas de caché HTTP y da semi-offline.

---

## Orden de ejecución sin downtime

1. Luis: A1 → A2 (DNS a Cloudflare; sitio sigue igual).
2. Luis: A3 (dominios en buckets; URLs viejas siguen vivas) → A4 (Cache Rule).
3. Opus: B1 (CSP suma, no quita) → B2 → B3 → B5 → commit/push.
4. Semanas después, si todo está estable: retirar los `pub-*.r2.dev` del CSP.

## Qué esperar en costos tras esto

Con el CDN + caché de navegador, el bucket casi no recibe lecturas: la inmensa
mayoría se sirve del borde de Cloudflare o del disco del alumno. Incluso viral,
lo esperable es quedarse dentro del nivel gratuito de operaciones de R2.
El plan Free de Cloudflare cubre todo lo anterior.
