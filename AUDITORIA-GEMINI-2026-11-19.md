# Auditoría Integral de Seguridad, Código y Sitio en Vivo — 2026-11-19 (Gemini)

> ## Estado de ejecución (19 de noviembre de 2026 — rama `gemini/seguridad-2026-11-19`)
>
> **Implementado y verificado en código (sin publicar todavía; pendiente de revisión y OK de Luis):**
> - **S1-02 (Modo Autor blindado):** `StudioV5.tsx:35` exige `NODE_ENV === "development" && NEXT_PUBLIC_SEQUENCER_AUTHOR === "1"`; `postbuild` (`scripts/verify-no-author-bundle.mjs`) y `cf:build` verifican automáticamente los chunks de `.next/static` y `.open-next/assets/_next/static`; regla `no-restricted-imports` añadida en `eslint.config.mjs` para módulos de autor y `next/link`; `docs/secuenciador-v5.md` actualizado.
> - **S1-03 (Correo `/api/contact` y `/api/notify`):** `hasAllowedOrigin` ahora exige `Origin` exacto y bloquea `Sec-Fetch-Site: cross-site`; añadido `NOTIFY_LIMITER` (`2 req/60s`) en `wrangler.jsonc`; `email` acotado a `max(254)` en API y `ContactForm`; logs de fallo estáticos sin PII en `/api/notify`. *(Cloudflare Turnstile queda como decisión opcional de Luis).*
> - **S1-04 (Borde API):** Añadido `EVENTS_LIMITER` (`60 req/60s`) + respaldo en memoria en `/api/events`; `Origin`/`Sec-Fetch-Site` y `Cache-Control: no-store` en `200 OK` en `/api/maestro-virtual/check`; `/api/audio/[...path]` cerrado (`404`) fuera de `localhost`/`127.0.0.1` o con cabecera `cf-ray` (manteniendo intactos `npm run stills` y desarrollo local).
> - **S2-01 (Privacidad de hardware):** `Permissions-Policy` endurecida con `microphone=(self), midi=(self), usb=(), payment=(), display-capture=()`; `useMicInput.ts` (Sequencer v5) y los 3 juegos Vite (`desglose`, `intervalos-cantados-juego`, `cosmic-ear`) liberan el micrófono en `visibilitychange`/`pagehide`/`beforeunload` y fueron recompilados y validados con `apps:check` (conservando bundles anteriores en caché); retirado `microphone` del iframe de `intervalos/page.tsx`.
> - **S2-02 (Robustez Sequencer v5):** Límite previo `file.size <= 4 MB` en `loadFile`; tope de 512 tokens y 128 compases en `writeProgression` + `maxLength={2048}` en `ChordPanel`; cota en `parseScoreText`; rechazo de `@` y prefijo `gap:` en `uniqueId`.
> - **S2-04 (`/.well-known/*`):** Excluido `.well-known` en `proxy.ts` y publicado `public/.well-known/security.txt`.
> - **S2-05 (CI, analítica y scripts):** `lib/analytics/public-paths.json` sincronizado con test automático en `events.test.ts`; `.github/workflows/quality.yml` añade `schedule` semanal, `workflow_dispatch` y `npm run cf:build`; `.gitignore` ampliado (`/reports/`, `/public/vendor/tutorial-pcm-*.js`, `/test-midis/`); `batchFile()` confina los MP4 dentro de la carpeta del lote en `scripts/redes/`; limpiados los 2 warnings de ESLint en scripts de lecciones 7 y 8.
> - **S3-01 / S3-02 / S3-03:** Enlaces localizados en `StudioV5.tsx` (`/en/harmony-course`), `intervalos/page.tsx` y `StoreInvitation.tsx` (App Store `/mx` y `/us` + `target="_blank" rel="noopener noreferrer"`); `e.source` verificado en `GameShell.tsx`; `rel="noopener noreferrer"` + `www.` en `cosmic-ear`; `privacy-notice.mdx` (ES/EN) actualizado al 19-nov-2026; `/catalog.json` y los 42 `/og/apps/*` prerenderizados estáticamente (`force-static`); retirado el `backgroundImage` 404 de WordPress y traducida la cadena fija en App Memoria.
>
> **Verificación ejecutada:** `npm run lint` (0 errores, 0 warnings) · `npm run typecheck` (limpio) · `npm test` (851 aprobadas) · `npm run test:microphones` (32 aprobadas) · `node --test scripts/redes/redes.node-test.mjs` (21 aprobadas) · `npm run apps:check` (21 sub-apps aprobadas) · `npm run build` + `verify-no-author-bundle` (0 símbolos de autor en `.next/static`) · `npm run test:e2e` (83 aprobadas, 1 omitida opcional de R2) · `npm run cf:build` + `verify-no-author-bundle --open-next`.
>
> **Pendientes exclusivos de Consola (requieren acción directa de Luis):**
> 1. **S1-01:** Borrar `RESEND_API_KEY` y pausar/eliminar el proyecto antiguo `storm-studios` en el panel de Vercel.
> 2. **S2-03:** Restringir la API Key web de Firebase por HTTP Referrer en Google Cloud Console; ~24 nov subir DMARC a `p=quarantine`; 7 dic revisar métricas de App Check.
> 3. **Opcional (S1-03):** Decidir si se añade Cloudflare Turnstile en Contacto y «Avísame».
> 4. **Limpieza local opcional:** Mover `deep-research-report-lanzamiento-apps.md` a `apps-src/plan-lanzamiento/` y mover `NEXT_PUBLIC_SEQUENCER_AUTHOR=1` de `.env.local` a `.env.development.local`.

---

Auditoría de solo lectura original sobre el commit `0c5b65f` y el sitio en producción `https://www.stormstudios.com.mx`, con foco prioritario en **seguridad** y en todos los cambios incorporados entre el 9 y el 19 de noviembre de 2026 (Storm Sequencer v5 y su Modo Autor, medición sin cookies en Workers Analytics Engine, formulario «Avísame» / invitación a tiendas, anuncios de App Store y automatización de redes sociales).

---

## 1. Resumen Ejecutivo

La base técnica y defensiva del proyecto está en **excelente estado general**:

| Verificación | Estado actual (19 nov 2026) | Evidencia comprobada |
|---|---|---|
| **Dependencias (`npm audit`)** | ✅ **0 vulnerabilidades** | Raíz (`284` prod / `697` dev) + **21 sub-apps** (`npm run apps:audit`) |
| **Lint y tipos (`eslint`, `tsc`)** | ✅ **0 errores** · `tsc --noEmit` limpio | Solo 2 warnings menores en scripts antiguos de storyboard |
| **Pruebas unitarias (`vitest`)** | ✅ **845 pruebas aprobadas** (66 suites) | Parser MIDI, reglas armónicas, APIs, rate-limit, analítica y Sequencer v5 |
| **HTTPS, HSTS y caché estática** | ✅ **Corregidos en vivo** | `http://` → `301 https://`; HSTS `max-age=31536000; includeSubDomains`; `/_next/static/*` con `immutable` y `CF-Cache-Status: HIT` |
| **Correo saliente / DNS** | ✅ **SPF + DKIM + CAA activos** | `v=spf1 include:zohomail.com ~all`, `zmail._domainkey` válido; DMARC en `p=none` listo para endurecer |
| **CORS en buckets R2 (`samples.`)** | ✅ **Restringido a `www.stormstudios.com.mx`** | `Origin` externo no recibe `Access-Control-Allow-Origin`; `Cache-Control: max-age=31536000` |
| **Modo Autor en vivo (`www.`)** | ✅ **Ausente en producción actual** | Escaneo de los 17 chunks JS de `/es/sequencer/v5` en vivo: 0 símbolos de autor |
| **Despliegue antiguo en Vercel** | 🔴 **Sigue vivo (`200 OK`) — bypass de WAF/límite** | `https://storm-studios.vercel.app/es` y sus rutas `/api/*` siguen activas (**S1-01**) |
| **Build local en PC de autor** | 🔴 **Contiene Modo Autor compilado en `.next/static`** | `.env.local` entra en `next build`; un `npm run cf:deploy` local filtraría el motor (**S1-02**) |
| **Protección de APIs en borde** | 🟠 **Brechas puntuales en 4 endpoints** | Falta Turnstile y `Origin` obligatorio en correo (**S1-03**); `/api/events` sin rate limit, `/api/maestro-virtual/check` sin `Origin` y `/api/audio/*` abierto en vivo (**S1-04**) |

### Controles de seguridad que ya están muy bien resueltos (conservar así)
- **Prevención de XSS, XXE y Prototype Pollution:** `components/JsonLd.tsx:9` escapa `<` como `\u003c`; `next-mdx-remote` v6 bloquea JS arbitrario en MDX; `lib/sequencer/graphics.ts:7` escapa entidades XML al exportar SVG; `lib/sequencer/import-musicxml.ts:6-9` limita a 4 MB y bloquea `<!ENTITY` / `<!DOCTYPE ... [`; `lib/sequencer/model.ts:361-496` (`validateScore`) reconstruye objetos limpios rechazando claves desconocidas.
- **Parser MIDI blindado (`lib/maestro-virtual/midi-parser.ts:51-55`):** Cotas estrictas (`MAX_MIDI_TRACKS = 32`, `MAX_MIDI_EVENTS = 10_000`, `MAX_MIDI_TICKS = 1_000_000`, VLQ de 4 bytes).
- **Firestore Rules (`firestore.rules:9-60`):** Denegación global por defecto, propiedad estricta por `uid`, claves cerradas a los 12 rangos mnemónicos y rechazo de no-strings y bytes NUL.
- **Privacidad en analítica (`lib/analytics/*`, `public/site-measurement.js`):** Cero cookies, cero IP en el dataset, `credentials: "omit"`, `referrerPolicy: "no-referrer"` y normalización contra lista blanca de rutas.
- **Automatización de redes (`scripts/redes/core.mjs`, `apis.mjs`, `autorizar-youtube.mjs`):** `external()` exige con `realpath` que las credenciales vivan fuera del repo; `redirect: 'error'` evita fugas de cabeceras `Authorization`; OAuth local usa `127.0.0.1` + PKCE `S256` + `state`, sin imprimir tokens en errores.
- **Supply chain y CI (`.github/workflows/quality.yml`, `.npmrc`, `package.json`):** Acciones fijadas por SHA de 40 caracteres, `persist-credentials: false`, `permissions: contents: read`, `min-release-age=7` y `allowScripts` acotado a versiones exactas de `esbuild` y `workerd`.

---

## 2. 🔴 Prioridad 1 — Seguridad Inmediata (Atacar Primero)

### S1-01 · El proyecto antiguo en `storm-studios.vercel.app` sigue activo y permite saltarse Cloudflare **[Consola]**
- **Evidencia en vivo:**
  - `curl -I https://storm-studios.vercel.app/es` devuelve **`HTTP/1.1 200 OK`** (`X-Vercel-Id: sfo1...`).
  - `https://storm-studios.vercel.app/es/sequencer/v5` devuelve `404` (el repo ya no despliega ahí), pero las **Serverless Functions** de esa instantánea congelada siguen ejecutándose (`X-Vercel-Id: sfo1::iad1...` en `/api/*`).
- **Riesgo de seguridad real:**
  1. Ese dominio **no pasa por Cloudflare WAF** ni dispone de los bindings `CONTACT_LIMITER` / `MAESTRO_LIMITER` (`getCloudflareContext()` falla fuera de Workers y hace *fail-open* al `Map` efímero de cada instancia fría).
  2. Si `RESEND_API_KEY` continúa definida en las variables de entorno de Vercel, un atacante puede enviar peticiones POST directamente a `https://storm-studios.vercel.app/api/contact` (sin cabecera `Origin` o con `Origin: https://storm-studios.vercel.app`) para **saltarse todos los controles de Cloudflare**, agotar la cuota diaria de Resend (dejando en `503` el formulario real en `www.stormstudios.com.mx`) e inundar `info@stormstudios.com.mx`.
  3. Al estar congelado sin nuevos deploys, cualquier CVE futuro de runtime quedará sin parchear ahí, además de la restricción comercial del plan Hobby de Vercel.
- **Solución:**
  1. **[Consola — Vercel]** Eliminar las variables de entorno (`RESEND_API_KEY`) y **pausar o borrar** el proyecto `storm-studios` en Vercel.
  2. **[Código]** Una vez cerrado, limpiar `.vercel/` y los interceptores `**/_vercel/**` en `e2e/*.spec.ts`.

---

### S1-02 · El Modo Autor de Sequencer v5 se compila en `.next/static` en tu PC y se filtraría si usas `npm run cf:deploy` **[Código]**
- **Ubicación:** `components/sequencer/v5/StudioV5.tsx:35-36`, `docs/secuenciador-v5.md:90-94`, `package.json:11-14`, `e2e/sequencer-v5.spec.ts:55-66`, `eslint.config.mjs`.
- **Evidencia comprobada:**
  - **En producción hoy está limpio:** escaneamos los 17 archivos JS servidos por `https://www.stormstudios.com.mx/es/sequencer/v5` y no aparece ningún símbolo del Modo Autor (porque compiló Cloudflare Workers Builds desde GitHub, donde la variable no existe).
  - **En tu disco local sí se empaquetó en producción:** `docs/secuenciador-v5.md:90` indica colocar `NEXT_PUBLIC_SEQUENCER_AUTHOR=1` en `.env.local`. **Next.js carga `.env.local` también durante `next build` y `opennextjs-cloudflare build` (`NODE_ENV=production`)**, no solo en `next dev`. Hoy mismo, en `.next/static/chunks/2dh6733ye6kyj.js` local están compilados `AuthorPanel`, `realizeChordTrack`, `harmonizeOptions`, `transposeScore` y `reviewScore`.
  - Si en cualquier momento ejecutas `npm run cf:deploy` (`package.json:14`) desde tu PC para un arreglo rápido, **se publicarían la pestaña «Modo autor» y todo el motor armónico propietario en abierto**, rompiendo la regla innegociable de `AGENTS.md`.
  - Además, `e2e/sequencer-v5.spec.ts:63-64` solo verifica el DOM renderizado, no el contenido de los chunks JS.
- **Solución concreta (4 candados):**
  1. En `components/sequencer/v5/StudioV5.tsx:35`, exigir entorno de desarrollo además de la variable:
     ```ts
     const AUTHOR =
       process.env.NODE_ENV === "development" &&
       process.env.NEXT_PUBLIC_SEQUENCER_AUTHOR === "1";
     ```
  2. Mover `NEXT_PUBLIC_SEQUENCER_AUTHOR=1` de `.env.local` a **`.env.development.local`** (archivo estándar de Next.js que `next dev` lee pero `next build` **ignora siempre**) y actualizar `docs/secuenciador-v5.md:90`.
  3. Añadir una comprobación automática al final de `build` / `cf:build` que falle si algún `.js` dentro de `.next/static/chunks` contiene `author-voice` o `realizeChordTrack`.
  4. Añadir `no-restricted-imports` en `eslint.config.mjs` prohibiendo importar `@/lib/sequencer/harmony/{score-bridge,realize,harmonize,voicing,review,transpose}` fuera de `AuthorPanel.tsx`, `lib/sequencer/harmony/**` y `*.test.ts`.

---

### S1-03 · Endurecimiento anti-bot y aislamiento de cuota en `/api/contact` y `/api/notify` **[Código] [Decisión de Luis]**
- **Ubicación:** `lib/http/mail-form.ts:119-125`, `app/api/contact/route.ts:20,25,33,71`, `app/api/notify/route.ts:16,23,35,47,54`, `wrangler.jsonc:31`.
- **Qué ocurre:**
  1. **`Origin` opcional:** `hasAllowedOrigin` (`lib/http/mail-form.ts:124`) acepta cualquier petición que **no envíe cabecera `Origin`** (`!origin`) y no revisa `Sec-Fetch-Site` (a diferencia de `/api/events`, que sí exige ambos). Ningún navegador legítimo al enviar estos dos formularios JSON omite `Origin`.
  2. **Riesgo de denegación de servicio sobre el buzón comercial:** Ni `/api/contact` ni `/api/notify` tienen verificación anti-bot (Turnstile). Los campos `website: ""` y `elapsedMs: 5000` los envía el propio cliente en el JSON. Ambos endpoints comparten `CONTACT_LIMITER` (`3 req/min` por IP) y la misma cuenta de Resend: unas pocas IPs automatizadas pueden agotar los 100 correos/día del plan gratuito de Resend en «Avísame» y dejar fuera de servicio (`503`) el formulario para contratar clases. *(Punto positivo: `/api/notify` envía el correo solo a `info@stormstudios.com.mx`, por lo que no permite usar tu dominio para hacer *email bombing* a terceros).*
  3. **Falta de logs de fallo en `/api/notify`:** `app/api/notify/route.ts:35,47,54` no emite `console.error` estático (sin datos personales) cuando falta `RESEND_API_KEY` o Resend rechaza el envío, a diferencia de `contact/route.ts:78,107,124`. Además, `contact/route.ts:20` no incluye `.max(254)` explícito en `z.email()`.
- **Solución:**
  1. En `lib/http/mail-form.ts:119-125`, exigir `origin === request.nextUrl.origin && request.headers.get("sec-fetch-site") !== "cross-site"`.
  2. Crear un `NOTIFY_LIMITER` separado en `wrangler.jsonc` (`limit: 2, period: 60`), añadir `.max(254)` en `contact/route.ts:20` y agregar mensajes `console.error` fijos (cero PII) en `notify/route.ts`.
  3. **[Decisión de Luis]** Incorporar **Cloudflare Turnstile** (gratuito, modo *Invisible* o *Managed*, sin cookies de rastreo) en `ContactForm` y `NotifyForm`, validando el token en servidor antes de llamar a Resend (y añadir una línea al aviso de privacidad si se activa).

---

### S1-04 · Tres endpoints en borde con protecciones incompletas (`/api/events`, `/api/maestro-virtual/check`, `/api/audio/[...path]`) **[Código]**
1. **`POST /api/events` sin rate limiting (`app/api/events/route.ts:8-40`, `wrangler.jsonc:25-33`):**
   - Aunque valida rutas y destinos por lista blanca, no pasa por ningún `RateLimitBinding`. Un script que envíe `Origin: https://www.stormstudios.com.mx` puede inyectar miles de eventos por minuto, distorsionar por completo tus métricas mensuales (`amazon_click`, `store_click`, `page_view` y combinaciones arbitrarias de `referrer`/`utm_*`) y activar el muestreo (`_sample_interval`) de Analytics Engine.
   - **Arreglo:** Añadir `EVENTS_LIMITER` (`limit: 60, period: 60`) en `wrangler.jsonc` y verificarlo con `passesEdgeRateLimit("EVENTS_LIMITER", getClientIp(request.headers))` (la IP solo se hashea en memoria para el límite y jamás se escribe en `SITE_ANALYTICS`).
2. **`POST /api/maestro-virtual/check` sin `Origin` / `Sec-Fetch-Site` ni `no-store` en `200` (`app/api/maestro-virtual/check/route.ts:199-226, 383`):**
   - `multipart/form-data` es un *CORS simple request*: cualquier página externa maliciosa puede disparar envíos desde el navegador de sus visitantes sin *preflight* CORS, consumiendo CPU síncrona del Worker (~1,3 s por evaluación compleja como Lección 4) y agotando el `MAESTRO_LIMITER` del visitante. Además, `MAX_MIDI_FILE_BYTES` está en `2 MB` (un ejercicio real pesa < 15 KB) y el `NextResponse.json` del `200 OK` (`línea 383`) no incluye `headers: NO_STORE_HEADERS`.
   - **Arreglo:** Exigir `Origin === request.nextUrl.origin && sec-fetch-site !== "cross-site"` al inicio de `POST`, añadir `headers: NO_STORE_HEADERS` en la línea 383 y bajar `MAX_MIDI_FILE_BYTES` a `256 * 1024` (256 KB).
3. **Proxy `/api/audio/[...path]` abierto en producción (`app/api/audio/[...path]/route.ts:46-90`):**
   - **Verificado hoy en vivo:** `curl -I https://www.stormstudios.com.mx/api/audio/Piano/C4.mp3` responde **`200 OK` (`audio/mpeg`)** retransmitiendo el archivo desde R2 a través del Worker. En producción el secuenciador ya lee directo de `https://samples.stormstudios.com.mx` (`lib/sequencer/audio-engine.ts:71`), cuyo CORS está restringido a tu dominio; dejar `/api/audio/*` abierto en producción permite a terceros hacer *hotlinking* de tus samples saltándose el CORS de R2 y gastando invocaciones de tu Worker.
   - **Arreglo:** En `app/api/audio/[...path]/route.ts`, devolver `new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } })` cuando `process.env.NODE_ENV === "production"`.

---

## 3. 🟡 Prioridad 2 — Privacidad de Hardware, Navegador, Consola y CI/CD

### S2-01 · Liberación de micrófono en segundo plano, `Permissions-Policy` e iframes sobreprivilegiados **[Código]**
- **Micrófono activo al cambiar de pestaña:**
  - En **Storm Sequencer v5** (`components/sequencer/v5/useMicInput.ts:17-47`), apagar el botón `Mic` o desmontar la página sí cierra las pistas, pero **no hay listener para `visibilitychange` ni `pagehide`** (ni `track.onended` si se desconecta el micrófono USB). Si el alumno deja `Mic` encendido y cambia de pestaña o minimiza la ventana, el navegador mantiene el micrófono capturando indefinidamente.
  - En 3 juegos Vite ocurre lo mismo: en **`apps-src/desglose/src/audio/pitch.ts:241`** y **`apps-src/intervalos-cantados-juego/src/audio/pitch.ts:198`** existe el método `dispose()` pero **nunca se llama** (el micrófono queda abierto incluso al volver al menú), y **`apps-src/cosmic-ear/src/main.jsx:82-88`** solo cierra al desmontar sin escuchar `visibilitychange`/`pagehide` (a diferencia de `Aerostato`, `Afinador` e `Intervalos Cantados` 2D, que ya lo liberan ejemplarmente).
- **Cabecera `Permissions-Policy` (`next.config.ts:75`):**
  - Hoy envía `camera=(), geolocation=(), browsing-topics=()`. Cambiar a:
    `camera=(), geolocation=(), browsing-topics=(), microphone=(self), midi=(self), usb=(), payment=(), display-capture=()`
    permite el micrófono y Web MIDI en tu propio origen (`self` e iframes propios `/apps/*`), pero **bloquea a nivel navegador** que iframes externos (`youtube-nocookie.com`, `vimeo.com`, `google.com/recaptcha`) puedan solicitarlos.
- **Iframes con permiso innecesario:** En `app/[locale]/sequencer/page.tsx:54` (v3) y `app/[locale]/intervalos/page.tsx:51`, cambiar `allow="autoplay; microphone"` por `allow="autoplay"` (ninguno de los dos usa micrófono; no modifica la v3 en sí, solo el atributo del contenedor).

---

### S2-02 · Cotas previas anti-DoS e IDs reservados en Sequencer v5 **[Código]**
- **Lectura en memoria sin revisar `file.size` (`components/sequencer/v5/useStudio.ts:339`):** `loadFile` ejecuta `await file.text()` antes de comprobar el tamaño; seleccionar por error un archivo grande (p. ej. un WAV/video de cientos de MB) lo carga entero en RAM antes del corte de `4_000_000` caracteres de `importScore` / `importMusicXml`. Comprobar `if (file.size > 4 * 1024 * 1024)` antes de `file.text()`.
- **Bucle $O(N^2)$ en `writeProgression` (`lib/sequencer/harmony/chord-track.ts:59` y `ChordPanel.tsx:25`):** Pegar miles de tokens en el campo de progresión (que no tiene `maxLength`) ejecuta `while (scoreTicks(next) < end) { next.measures.push(...); }` antes de que `validateScore` aplique el tope de `128` compases, congelando la pestaña. Añadir `maxLength={2048}` en `ChordPanel.tsx:25`, rechazar `tokens.length > 512` en `writeProgression` y verificar `text.length <= MAX_IMPORT_CHARS` al inicio de `parseScoreText` (`lib/sequencer/model.ts:748`).
- **Validación de `uniqueId` (`lib/sequencer/model.ts:341-346`):** Hoy acepta `@` (rompiendo el separador `id@pitch` de `lib/sequencer/note-selection.ts:13`) y el prefijo interno `gap:` (usado por `ScoreView.tsx:120` para calcular fracciones de VexFlow, donde `"gap:abc"` produce `NaN`). Restringir `uniqueId` a `/^[A-Za-z0-9_.:-]{1,64}$/` y rechazar `id.startsWith("gap:")`.

---

### S2-03 · Controles pendientes en Consola (Firebase, App Check y DMARC de correo) **[Consola]**
1. **Restricción de la API Key web de Firebase por dominio:** Ya está verificado en `docs/remediacion-seguridad-2026-11.md:51-65` que solo la usa App Memoria en la web (los APK usan `localStorage`). Aplicar en Google Cloud Console → Credenciales la restricción de **Sitios web** (`https://www.stormstudios.com.mx/*`, `https://stormstudios.com.mx/*`, `https://app-memoria-storm.firebaseapp.com/*`, `http://localhost:3000/*`) impide que un script externo cree cuentas anónimas masivas y agote las 20,000 escrituras diarias gratuitas del plan Spark.
2. **Firebase App Check:** Mantener en modo supervisión hasta el **7 de diciembre de 2026** y revisar el porcentaje de solicitudes verificadas antes de activar *Enforce*.
3. **Subir DMARC de `p=none` a `p=quarantine`:** SPF y DKIM de Zoho ya están publicados y funcionando en vivo (`stormstudios.com.mx` y `zmail._domainkey`). Revisar en Cloudflare DMARC Management que no haya envíos legítimos fallando tras cumplir 2 semanas (~24 de noviembre) y cambiar `_dmarc.stormstudios.com.mx` a `v=DMARC1; p=quarantine; ...` para proteger el dominio contra suplantación.

---

### S2-04 · `proxy.ts` redirige `/.well-known/*` con `307` a `/es/.well-known/*` **[Código]**
- **Evidencia en vivo:** `curl -I https://www.stormstudios.com.mx/.well-known/security.txt` devuelve `307 Temporary Redirect` porque `proxy.ts:103` no excluye `.well-known` del matcher de `next-intl`.
- **Impacto:** Bloquea rutas estándar RFC 8615 como `/.well-known/apple-app-site-association` (Universal Links de iOS), `/.well-known/assetlinks.json` (Android App Links para Google Play) y `/.well-known/security.txt` (RFC 9116 para contacto de seguridad).
- **Solución:** Añadir `\\.well-known(?:/|$)|` al negative-lookahead de `proxy.ts:103` y publicar `public/.well-known/security.txt` con `Contact: mailto:info@stormstudios.com.mx` y fecha `Expires`.

---

### S2-05 · CI/CD, árbol de trabajo, `.gitignore` y scripts locales **[Código]**
1. **`lib/analytics/public-paths.json` desactualizado en `HEAD`:** El commit `839f94d` publicó los 4 posts del 15 de noviembre (`2026-11-15-ap-super-app-store` y `2026-11-15-storm-sequencer-v5` en ES/EN) sin incluir `public-paths.json` actualizado (por eso aparece modificado hoy en `git status`). Commitearlo y añadir un test en `lib/analytics/events.test.ts` que verifique que todo `.mdx` de `content/blog` y `content/maestria` exista en `public-paths.json` (ya que en CI `npm test` corre antes de `prebuild`).
2. **Archivos sin seguimiento en la raíz (`git status`):**
   - `deep-research-report-lanzamiento-apps.md` contiene tokens internos de citación y notas personales de equipo: moverlo a `apps-src/plan-lanzamiento/` (ignorado por git) para no commitearlo por error en la raíz.
   - Decidir si `.agents/` se versiona o se añade a `.gitignore`, y revisar el cambio local en `.claude/launch.json` (`E:/APSuper-timbres-nuevos`).
3. **CI (`.github/workflows/quality.yml`):**
   - Añadir `npm run cf:build` (`opennextjs-cloudflare build`) en el job `verify` para detectar incompatibilidades con el runtime de Workers antes de fusionar a `main`.
   - Añadir `schedule` semanal (`cron: '0 12 * * 1'`) y `workflow_dispatch` para que `npm audit` avise de nuevas vulnerabilidades aunque no haya pushes esa semana, y alinear `--audit-level` entre raíz (`moderate`) y `apps-maintenance.mjs` (`low`).
4. **`.gitignore` y confinamiento de rutas en scripts locales:**
   - Añadir `/reports/`, `/public/vendor/tutorial-pcm-*.js` y `/test-midis/` a `.gitignore`.
   - En `scripts/redes/core.mjs:80` y `scripts/redes/apis.mjs:68,79,87` (así como `scripts/sequencer/stills.mjs:26`), comprobar con `realpath` + `path.relative` que `p.file` permanezca dentro de la carpeta del lote (`this.base`).
   - En `scripts/agentes/gemini-politica.toml:9`, acotar `commandPrefix` para que no admita encadenar comandos mediante `;`, `|` o `&` tras la ruta del script de Blender.

---

## 4. 🟢 Prioridad 3 — Calidad Web, i18n, Privacidad Fina y Rendimiento

1. **S3-01 · Enlaces e i18n en componentes recientes:**
   - **`components/sequencer/v5/StudioV5.tsx:14, 193`:** Usa `next/link` con `href={"/" + locale + "/curso-armonia"}`, generando `/en/curso-armonia` en inglés en lugar de `/en/harmony-course`. Cambiar a `Link` de `@/i18n/navigation` y añadir `no-restricted-imports` sobre `"next/link"` en `eslint.config.mjs`.
   - **`lib/store-links.ts:7` y `components/StoreInvitation.tsx:14-15`:** Usar las URLs regionales de App Store (`/mx` para ES y `/us` para EN, igual que en `data/apps/apps-catalog.ts:421-425`) y añadir `target="_blank" rel="noopener noreferrer"` para no interrumpir la sesión del alumno cuando juega Oído Absoluto Multi.
   - **`apps-src/cosmic-ear/src/main.jsx:376` y `components/apps/GameShell.tsx:111`:** Añadir `rel="noopener noreferrer"` y `https://www.stormstudios.com.mx` en Cosmic Ear; validar `e.source === iframe.contentWindow` en el listener `postMessage` de `GameShell.tsx`.
2. **S3-02 · Ajustes finos en el Aviso de Privacidad (`content/pages/{es,en}/privacy-notice.mdx`):**
   - El aviso actualizado el 15 de noviembre está muy completo (cubre Cloudflare, Analytics Engine sin cookies, Resend, «Avísame», Firebase + App Check y App Store / Google Play). Solo conviene:
     1. En la línea 33, mencionar que además de los ejercicios de canto, el **Afinador Cromático** y **Storm Sequencer v5** pueden solicitar permiso local de micrófono (y **Web MIDI** en Sequencer v5), procesándose todo en el navegador.
     2. En la línea 23 («Avísame»), indicar que también aplica el identificador temporal derivado de IP para prevenir abuso, igual que en el formulario de contacto.
3. **S3-03 · Consumo de Worker, caché de audio y pulido heredado:**
   - **Prerender estático de `/catalog.json` y `/og/apps/[locale]/[slug]`:** Añadir `export const dynamic = "force-static"` (y `generateStaticParams` + `dynamicParams = false` en `/og/apps`), además de `Cache-Control: no-store` en el `404` de `app/og/apps/[locale]/[slug]/route.tsx:13`.
   - **Caché de samples en Sequencer (`lib/sequencer/audio-engine.ts:73`):** Cambiar `{ cache: "no-cache" }` por `{ cache: "default" }` cuando carga desde `samples.stormstudios.com.mx` (que ya sirve `Cache-Control: max-age=31536000`), evitando revalidaciones innecesarias en cada sesión.
   - **App Memoria (`MemoriaGame.tsx:259`, `MemoriaPractice.tsx:299`, `MemoriaChallenge.tsx:210`):** Quitar el `backgroundImage` roto `/wp-content/themes/Apps%20video%20juegos/Fondo%20app%20memoria.png` (cada carga provoca un `404` que pasa por el Worker) y traducir `"Tiempo A Ciegas: "` en modo inglés.
   - **Pendientes no urgentes de la auditoría del 9-nov que siguen abiertos:** Tema oscuro nativo en `app/[locale]/layout.tsx:82` y `app/not-found.tsx` (evita cabecera blanca en `GameShell`), quitar peso `300` de `DM_Mono` (`layout.tsx:29`), `localeCookie: false` en `i18n/routing.ts` (evita enviar `Set-Cookie: NEXT_LOCALE` innecesaria), actualizar `DEPLOYMENT-GUIDE.md` y `README.md` de Vercel a Cloudflare, y migrar las 4 URLs restantes de `pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev` (APKs y audios de Elefantito) a dominio propio.

---

## 5. Plan de Trabajo Sugerido (En Orden para Avanzar Limpio)

| Paso | Qué hacemos | Tipo | Tiempo est. |
|---|---|---|---|
| **1** | **Cerrar `storm-studios.vercel.app`** (quitar `RESEND_API_KEY` ahí y pausar/eliminar proyecto en Vercel) y **restringir la API Key de Firebase** por HTTP Referrer en Google Cloud Console (`S1-01`, `S2-03`) | **[Consola]** | 15 min |
| **2** | **Blindar el Modo Autor de Sequencer v5** (`NODE_ENV === "development"`, pasar flag a `.env.development.local`, guard en build + regla ESLint `no-restricted-imports`) y **limpiar árbol git / `public-paths.json`** (`S1-02`, `S2-05`) | **[Código]** | 30 min |
| **3** | **Endurecer las 5 rutas `/api/*` y `proxy.ts`:** `Origin` + `Sec-Fetch-Site` en `contact`, `notify` y `maestro-virtual/check`; `NOTIFY_LIMITER` y `EVENTS_LIMITER` en `wrangler.jsonc`; apagar `/api/audio/*` en producción; liberar `/.well-known/*` + `security.txt` (`S1-03`, `S1-04`, `S2-04`) | **[Código]** | 1 h |
| **4** | **[Decisión de Luis]** Activar **Cloudflare Turnstile** en Contacto y «Avísame» + actualizar 2 líneas del Aviso de Privacidad (`S1-03`, `S3-02`) | **[Consola + Código]** | 1 h |
| **5** | **Privacidad de micrófono y Sequencer v5:** `Permissions-Policy` con `microphone=(self), midi=(self)`, auto-apagado en `visibilitychange`/`pagehide` en `useMicInput` y los 3 juegos Vite, cotas en `loadFile`/`writeProgression`/`uniqueId` y enlace `/en/harmony-course` (`S2-01`, `S2-02`, `S3-01`) | **[Código]** | 1.5 h |
| **6** | **CI/CD, tiendas y optimización Worker:** `cf:build` y `schedule` en GitHub Actions, `.gitignore`, enlaces localizados de App Store en `StoreInvitation`, `/og/apps` + `/catalog.json` estáticos y limpieza del 404 en Memoria (`S2-05`, `S3-01`, `S3-03`) | **[Código]** | 1.5 h |
| **7** | **Calendario programado:** ~24 nov subir DMARC a `p=quarantine`; 7 dic revisar métricas de Firebase App Check antes de exigir *enforcement* (`S2-03`) | **[Consola]** | 15 min |
