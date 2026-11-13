# Auditoría Storm Studios — 2026-11-09 (Claude Fable 5.2)

Auditoría integral de solo lectura del repo `StormStudios` (commit `b556a1d`) y del sitio en vivo
https://www.stormstudios.com.mx, **dos días después de migrar de Vercel a Cloudflare Workers**.
No se modificó ningún archivo del proyecto; este documento es el único archivo nuevo.

Auditorías previas: `AUDITORIA-OPUS55-2026-09-23.md`, `AUDITORIA-JUEGOS-2026-09-24.md`,
`docs/remediacion-seguridad-2026-11.md`. Aquí solo aparece lo nuevo o lo que sigue abierto.

**Idea central:** el código está sano (lint, tipos, 709 pruebas, build y `npm audit` en verde). Casi
todo lo importante viene de dos cosas: **(1) lo que Vercel hacía solo y Cloudflare no hace** (HSTS,
HTTPS forzado, caché de `/_next/static`, optimización de imágenes, WAF, analítica) y **(2) el sitio
todavía no está preparado para vender** (no mide nada, la página del libro tiene un enlace mal
rotulado, el correo del dominio no tiene SPF).

---

## 0. Instrucciones para Opus (o el modelo que implemente esto)

1. **Lee primero** `README.md`, `AGENTS.md` y `docs/remediacion-seguridad-2026-11.md`. Next.js 16
   tiene cambios incompatibles: antes de tocar APIs de Next, consulta `node_modules/next/dist/docs/`.
   Antes de tocar `wrangler.jsonc`, consulta el esquema en `node_modules/wrangler/config-schema.json`.
2. **Flujo de publicación actual** (cambió): `main` está protegida. Rama `claude/...` → PR → esperar
   los 3 checks (`verify`, `security`, `firestore`) → merge. **Workers Builds publica `main` solo en
   unos 5 minutos.** Publica solo con el OK de Luis.
3. **Verificación tras cada bloque:** `npm run check`; si tocas `apps-src/`, `npm run apps:build` y
   `npm run apps:check`; si tocas `wrangler.jsonc`, `open-next.config.ts`, `public/_headers` o
   cabeceras, **`npm run cf:preview`** y `curl -I` contra el preview antes de abrir el PR.
4. **No toques** los negative-lookaheads de CSP en `next.config.ts` (cada ruta debe recibir una sola
   CSP). **No borres** bundles antiguos de `public/apps/*/assets` antes del 3 de febrero de 2027.
5. Paridad ES/EN en todo texto nuevo. Todo lo que lee Luis va en español; commits y PRs en inglés.
6. Etiquetas: **[Consola]** = se hace en el panel de Cloudflare, Zoho, Vercel, Firebase o Google, no
   en código (guiar a Luis de una en una). **[Decisión de Luis]** = requiere su aprobación antes.
7. Al terminar, añade una sección «Estado de ejecución» al inicio de este archivo, como en la
   auditoría de septiembre.

---

## 1. Resumen ejecutivo

| Área | Estado | Evidencia |
|---|---|---|
| Lint / tipos / pruebas | ✅ 0 errores, 2 warnings · `tsc` limpio · 709 pruebas + 3 `todo` | Clon aislado: `eslint`, `tsc --noEmit`, `vitest run` |
| Build | ✅ 216 páginas estáticas; dinámicas solo las 3 API, `/catalog.json` y `/og/apps/*` | `next build` (Next 16.4.5) |
| `npm audit` raíz y 21 sub-apps | ✅ 0 vulnerabilidades | `npm audit`, `npm run apps:audit` |
| Sitemap en vivo | ✅ 122/122 → 200 · ⚠️ faltan 6 posts del blog (P1-08) | Crawler propio |
| Enlaces | ✅ 308 comprobados, 0 rotos · ⚠️ 1 enlace interno sin idioma (P1-09) | Crawler |
| Canonical / og:url / hreflang / H1 / alt | ✅ exactos y recíprocos en las 122 páginas | Crawler |
| Ortografía ES / español residual en EN | ✅ limpio, salvo «Guia» en la portada | Barrido de texto visible |
| CSP, XFO, nosniff, Referrer, Permissions | ✅ presentes | `curl -I` |
| **HSTS y HTTPS forzado** | 🔴 **perdidos en la migración** (P1-02) | `curl -I http://www…` → 200 |
| **Rate limit de las API** | 🔴 **no funciona en Workers** (P1-03) | ~50 POST seguidos, 3 respuestas 429 |
| **Caché de `/_next/static`** | 🔴 `max-age=0` en archivos con hash (P1-01) | `curl -I` |
| **Imágenes** | 🔴 se sirven originales: 2,7 MB para iconos de 64 px (P1-06) | `curl` sobre `/es/apps` |
| **Analítica** | 🔴 no hay ninguna (P1-05) | HTML sin beacon; CSP lo bloquearía |
| Rendimiento (portada, escritorio) | ✅ TTFB ≈ 0,25 s · LCP ≈ 1,8 s (H1) · CLS 0 · ≈195 KB de JS | Navegador integrado |
| PageSpeed Insights | ⚠️ sin medir: cuota diaria agotada (429), igual que en septiembre | P3-13 |

### Lo que está bien (no romperlo)
- Migración limpia: 122 URLs en 200, redirecciones 308/410/404 intactas, CSP correcta por ruta,
  `workers.dev` apagado, apex → www con 308, juegos 3D con brotli e `immutable`.
- Samples de audio ya con dominio propio, `Cache-Control` de un año y CDN en HIT
  (`samples.` / `musica.` / `sfx.stormstudios.com.mx`). El plan `PLAN-SAMPLES-CDN.md` está
  prácticamente cumplido.
- APIs endurecidas (tamaño de cuerpo, Origin, `no-store`, sin datos personales en logs), reglas de
  Firestore con validación, honeypot y tiempo mínimo en el formulario.
- SEO on-page coherente y probado; i18n con 77 claves en paridad exacta.

---

## 2. 🔴 Prioridad ALTA

### P1-01 · `/_next/static/*` se sirve sin caché larga
**Qué pasa.** Los chunks de JS, CSS y fuentes llevan hash en el nombre, pero Cloudflare los entrega
con `Cache-Control: public, max-age=0, must-revalidate`. Cada visita y cada cambio de página
revalida ~20 archivos (y como `run_worker_first` es `true`, cada revalidación invoca el Worker y
cuenta en la cuota). En Vercel eran `immutable` automáticamente.
**Evidencia.** `curl -I https://www.stormstudios.com.mx/_next/static/chunks/<hash>.js` →
`max-age=0, must-revalidate`. En cambio `/apps/*/assets/*` y `/vendor/*` sí salen `immutable`
(los cubre `next.config.ts`).
**Arreglo.** Crear `public/_headers` (lo recomienda la documentación de OpenNext):
```
/_next/static/*
  Cache-Control: public, max-age=31536000, immutable
```
**Verificación.** `npm run cf:preview` y `curl -I` al chunk. Si con `run_worker_first: true` la
cabecera no aparece, cambia `run_worker_first` a lista (`["/*", "!/_next/static/*"]`) para que esos
archivos se sirvan directo desde la capa de assets, donde `_headers` aplica siempre. Repetir el
`curl` en producción tras el deploy.

### P1-02 · Sin HSTS y sin redirección de HTTP a HTTPS
**Qué pasa.** `http://www.stormstudios.com.mx/es` responde **200 con la página completa por HTTP
sin cifrar**, y ninguna respuesta lleva `Strict-Transport-Security`. Vercel hacía las dos cosas
solo (la auditoría de septiembre las marcó ✅).
**Arreglo.**
- **[Consola]** Cloudflare → dominio → SSL/TLS → Edge Certificates: activar **Always Use HTTPS** y
  **HSTS** (12 meses, `includeSubDomains`; los subdominios `samples`, `musica` y `sfx` ya son HTTPS).
  Revisar de paso que el modo sea **Full (strict)** y TLS mínimo 1.2.
- En código, para que viaje con el repo: añadir a `baseSecurityHeaders` en `next.config.ts`
  `{ key: "Strict-Transport-Security", value: "max-age=31536000; includeSubDomains" }`.
**Verificación.** `curl -I http://www.stormstudios.com.mx/es` → 301/308 a https;
`curl -I https://…/es | grep -i strict`.

### P1-03 · El rate limit del formulario y del Maestro Virtual no funciona en Workers
**Qué pasa.** El límite vive en un `Map` en memoria. En Workers cada petición puede caer en un
isolate distinto, así que el contador no se comparte. Además el WAF que protegía estas rutas era
de Vercel y ya no aplica. Y `getClientIp()` lee `x-vercel-forwarded-for` y luego **el primer valor
de `x-forwarded-for`, que en Cloudflare lo controla el visitante**.
**Evidencia (pruebas mías contra producción, con el honeypot lleno: no se envió ningún correo).**
Límite nominal: 5 peticiones cada 10 min. Envié ~50 POST a `/api/contact` desde una IP en 3 minutos
y solo 3 recibieron 429. Con un `X-Forwarded-For` falso distinto en cada una: 10 de 10 pasaron.
**Riesgo.** Spam al buzón, agotar la cuota de Resend (el formulario deja de funcionar justo cuando
es el canal para contratar clases) y consumo de CPU de pago en `/api/maestro-virtual/check`.
**Arreglo.**
1. Extraer la lógica duplicada a `lib/http/client-ip.ts` y `lib/http/rate-limit.ts`. La IP debe
   salir de **`cf-connecting-ip`**; quitar `x-vercel-forwarded-for` y no confiar en `x-forwarded-for`.
2. Usar el **binding de Rate Limiting de Workers**: en `wrangler.jsonc`,
   `"ratelimits": [{ "name": "CONTACT_LIMITER", "namespace_id": "1001", "simple": { "limit": 5, "period": 60 } }, { "name": "MAESTRO_LIMITER", "namespace_id": "1002", "simple": { "limit": 10, "period": 60 } }]`
   (confirma la sintaxis en el esquema de wrangler; el periodo solo admite 10 o 60 s). En la ruta:
   `getCloudflareContext().env.CONTACT_LIMITER.limit({ key: ip })`. Conservar el `Map` como respaldo
   para `next dev`/`next start`, donde el binding no existe. Actualizar las pruebas de ambas rutas.
3. **[Consola]** Regla de rate limiting en Cloudflare WAF (el plan gratuito incluye una): rutas
   `/api/contact` y `/api/maestro-virtual/check`, por IP, bloquear ráfagas.
4. **[Decisión de Luis]** Añadir Cloudflare Turnstile al formulario (gratis, sin cookies de
   seguimiento). Es la protección más sólida contra bots; exige tocar la CSP y el aviso de privacidad.
5. Actualizar `DEPLOYMENT-GUIDE.md` y `docs/remediacion-seguridad-2026-11.md`, que aún describen el
   WAF de Vercel.
**Verificación.** En `cf:preview` y luego en producción: 6 POST inválidos seguidos → el sexto da 429,
con y sin `X-Forwarded-For` falso.

### P1-04 · El aviso de privacidad dice que Vercel aloja el sitio y mide la navegación
**Qué pasa.** `content/pages/{es,en}/privacy-notice.mdx` (líneas 43 y 47) afirma «Vercel aloja el
sitio y su herramienta Web Analytics permite consultar estadísticas de navegación» y enlaza la
política de Vercel. Desde el 7 de noviembre el sitio está en Cloudflare y no hay analítica. Este
aviso es además la URL de privacidad declarada en Google Play para AP Super.
**Arreglo.** Reescribir ese párrafo en ES y EN: Cloudflare aloja el sitio y sirve el audio; quitar
Vercel; describir la analítica solo si se activa (P1-05) y Turnstile si se adopta (P1-03).
Actualizar la fecha de «última actualización». **[Decisión de Luis]**: que lea el texto final.

### P1-05 · El sitio no mide nada **[Decisión de Luis] [Consola]**
**Qué pasa.** Al migrar se quitó `@vercel/analytics` «porque Cloudflare Web Analytics lo
reemplaza», pero no hay beacon en el HTML y la CSP lo bloquearía (`script-src` no incluye
`static.cloudflareinsights.com` ni `connect-src` incluye `cloudflareinsights.com`). Hoy no se sabe
cuánta gente entra, de dónde viene ni qué páginas llevan a un contacto o a Amazon, justo al lanzar.
**Arreglo.**
1. **[Consola]** Cloudflare → Analytics & Logs → Web Analytics → añadir el sitio y copiar el token.
2. Insertar el beacon en `app/[locale]/layout.tsx` solo en producción y solo en los hosts reales,
   y añadir esos dos orígenes a `appCsp` (los juegos no lo necesitan: cuenta la página que los
   contiene). No usa cookies; mencionarlo en el aviso de privacidad (P1-04).
3. Segundo paso, cuando lo primero funcione: eventos de embudo propios (clic en «Comprar en Amazon»,
   envío del formulario, abrir una app, descargar APK) con **Workers Analytics Engine** detrás de un
   `POST /api/event` mínimo, sin cookies ni datos personales. Web Analytics no admite eventos.
**Verificación.** `read_network_requests` en el navegador: la petición al beacon sale con 200/204 y
no hay errores de CSP en consola.

### P1-06 · Las imágenes se sirven sin optimizar (2,7 MB para miniaturas de 64 px)
**Qué pasa.** Con `images.unoptimized: true`, `next/image` entrega el archivo original. La página
`/apps` muestra 20 iconos a 64×64 px y descarga **2,7 MB**: `app-intervalos-cantados.png` 469 KB,
`app-memoria.png` 454 KB, `app-ap-multi.png` 313 KB, `app-intervals-listening.jpeg` 211 KB… (son
PNG/JPG de 512 px o más). Lo mismo con `portada-libro.jpg` (247 KB para 260×350), `medrano.jpg`
(196 KB para 160 px) y `secuenciador.png` (191 KB). En Vercel el optimizador las reducía y
convertía a WebP.
**Arreglo recomendado (sin piezas móviles).** `sharp` ya está instalado. Crear
`scripts/optimize-images.mjs` (`npm run images`) que genere WebP al tamaño real de uso ×2: iconos
de app a 320 px, portada del libro a 520 px de ancho, retratos a 320 px. Apuntar
`data/apps/apps-catalog.ts` y las páginas a los `.webp`, y mover los originales a
`archive/public-unused/`. Meta: `/apps` por debajo de 300 KB de imágenes.
**Alternativa.** Loader propio de `next/image` con Cloudflare Image Transformations
(`/cdn-cgi/image/...`); requiere activarlo en el panel y tiene cuota. No lo recomiendo aquí.
**Verificación.** Repetir la suma de `curl` sobre las imágenes de `/es/apps`; revisar que ningún
icono se vea borroso en la ficha (160 px) ni en pantallas retina.

### P1-07 · En el teléfono no se ve el botón «Siguiente» al final de cada lección
**Qué pasa.** En `components/course/LessonNav.tsx` las dos tarjetas van en una fila `flex` sin
`min-w-0`. A 375 px la tarjeta «Anterior» ocupa todo el ancho y «Siguiente» queda fuera de la
pantalla (de x=371 a x=592), recortada por `.ss-root { overflow: hidden }`. El alumno termina la
lección y no encuentra cómo avanzar.
**Evidencia.** Medido y capturado en `/es/curso-armonia/02-leccion-1` y `/09-leccion-8` a 375×812.
**Arreglo.** Apilar en móvil (`flex-col sm:flex-row`), `min-w-0` en los dos contenedores para que
`truncate` funcione, `aria-label` en el `<nav>`, y de paso pasar las tarjetas al tema oscuro (hoy
son blancas sobre fondo oscuro). Añadir un caso a `e2e/smoke.spec.ts` que compruebe a 375 px que
el enlace «Siguiente» queda dentro del viewport.

### P1-08 · Seis posts del blog no están en el sitemap ni tienen hreflang
**Qué pasa.** Los posts del 9 de octubre (Lección 7 y Lección 8) y del 20 de octubre (juegos 3D y
Utility Apps), en ES y EN, no están en `data/seo/blog-post-translations.ts`. Resultado: no salen en
`sitemap.xml` y cada uno solo declara su propio idioma, sin enlazar su traducción.
**Arreglo.** Añadir las 3 entradas. Y para que no vuelva a pasar: una prueba en
`data/seo/blog-post-translations.test.ts` que lea `content/blog/{es,en}` y falle si algún `.mdx`
no está registrado (lo mismo para `content/maestria` con `mastery-translations.ts`). Añadir el paso
al skill o al checklist de publicación de posts.

### P1-09 · El botón «Go to Course» de los posts en inglés lleva al curso en español
**Qué pasa.** `components/blog/BlogLayout.tsx` importa `Link` de `next/link` y usa
`href="/curso-armonia"` sin idioma. El proxy responde 307 a `/es/curso-armonia`. Afecta a los 11
posts de cada idioma, 22 en total (en ES solo cuesta una redirección; en EN cambia de idioma al
lector).
**Arreglo.** Usar `Link` de `@/i18n/navigation` o `getLocalizedPathname("/curso-armonia", locale)`.
Revisar también `BlogCard.tsx`. Añadir en `eslint.config.mjs` una regla `no-restricted-imports` que
prohíba `next/link` fuera de `app/not-found.tsx`, para que no reaparezca.

### P1-10 · Página del libro: enlace mal rotulado y título por confirmar **[Decisión de Luis]**
**Qué pasa.** Es la página que vende y tiene tres problemas:
1. En español, «📗 Impreso en español — Amazon.com.mx» apunta a `amazon.com.mx/dp/B0DK4B9892`, que
   es el **mismo ASIN del Kindle** (Amazon redirige a `…-ebook/dp/B0DK4B9892`). No hay enlace real
   a la tapa blanda ni a la tapa dura, que existen.
2. La página titula «Los Seres Musicales: Una Historia de Transformación», pero la URL de Amazon
   dice `Los-Seres-Musicales-Liberando-potencial…` (en inglés, `Unleash-hidden-Potential`). El
   subtítulo del sitio y el de Amazon parecen distintos.
3. Es muy breve (≈1.400 caracteres): sin índice, sin extracto, sin formatos ni precios.
**Arreglo.** Luis confirma subtítulo y ASIN de cada formato (Kindle, tapa blanda, tapa dura) en
amazon.com y amazon.com.mx. Luego: botones correctos por formato y tienda, índice del libro, un
extracto, y ampliar el JSON-LD `Book` con `workExample` por formato, `bookFormat`, `isbn` y `offers`.

### P1-11 · El sitio dice que el Maestro Virtual solo revisa las lecciones 1 a 3
**Qué pasa.** Hoy revisa las lecciones 1, 2, 3, 4, 6, 7 y 8 (y el validador de la 9 ya existe), pero
siguen diciendo «lecciones 1–3»: la página `/maestro-virtual` y su meta descripción, la tarjeta de
la portada (`messages/{es,en}/common.json`, `home.features…`) y `app/catalog.json/route.ts`.
**Arreglo.** Generar la lista desde `data/course/lessons/lesson-configs.ts` (lecciones publicadas con
`validator`) para que no vuelva a quedar atrás, y actualizar los tres textos.

### P1-12 · El dominio no tiene SPF y DMARC está en `p=none` **[Consola]**
**Qué pasa.** `stormstudios.com.mx` recibe correo en Zoho (MX correctos), pero el dominio raíz **no
tiene registro SPF** (solo el TXT de verificación de Zoho) y no encontré DKIM de Zoho con los
selectores habituales. Las respuestas que Luis manda desde `info@` a quien pregunta por clases
pueden caer en spam. El envío del formulario (Resend, subdominio `send.`) sí tiene SPF y DKIM.
**Arreglo.** En Zoho Mail Admin → Dominios → Autenticación de correo, copiar los valores exactos
de SPF y DKIM y crearlos en el DNS de Cloudflare. Tras dos semanas de reportes limpios, subir DMARC
a `p=quarantine`.
**Verificación.** `nslookup -type=TXT stormstudios.com.mx 1.1.1.1` muestra `v=spf1 …`; enviar un
correo de `info@` a una cuenta de Gmail y revisar «Mostrar original» (SPF, DKIM y DMARC en PASS).

---

## 3. 🟡 Prioridad MEDIA

### P2-01 · La copia en Vercel sigue viva **[Consola] [Decisión de Luis]**
`https://storm-studios.vercel.app/es` responde 200 con el sitio completo e `index, follow` (su
canonical apunta a www, así que el riesgo SEO es bajo). El motivo de migrar fue que Hobby prohíbe el
uso comercial. Fijar una fecha para cerrar el respaldo: desconectar el repositorio en Vercel (para
que deje de construir en cada push) y luego borrar o pausar el proyecto. Después, limpiar `.vercel/`,
el `.gitignore` y las rutas `**/_vercel/**` de `e2e/*.spec.ts`.

### P2-02 · Documentación y comentarios que aún describen Vercel
- `README.md` (línea 30) y todo `DEPLOYMENT-GUIDE.md` explican el despliegue en Vercel. Reescribir
  para Cloudflare: Workers Builds, `wrangler.jsonc`, secretos (`RESEND_API_KEY`), rollback
  (`apps-src/cloudflare-migracion/ROLLBACK-DNS.md` está fuera de git: pasar lo esencial al repo),
  cómo ver logs y cómo publicar a mano con `npm run cf:deploy`.
- `next.config.ts:158` dice «Workers Free»; el plan es Workers Paid.
- `PLAN-SAMPLES-CDN.md` describe como pendiente algo que ya está hecho: marcarlo como cumplido.
- No hay `.env.example` en la raíz (sí en tres apps): añadir `RESEND_API_KEY` y
  `AUDIO_BUCKET_BASE_URL`.

### P2-03 · Quedan dependencias de `r2.dev`
- **Diapasón** (publicado el 20 de octubre) carga sus samples de
  `pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev` (`apps-src/diapason/src/engine.js:7`). Ese bucket ya
  tiene dominio propio: cambiar `BASE` a `https://musica.stormstudios.com.mx/`, recompilar y publicar.
- **APK** de Elefantito y Memoria: `pub-2de970e8bf224791a9ab6d06fa62ce19.r2.dev/APKs/…`
  (`data/apps/apps-catalog.ts`). **[Consola]** dar dominio propio al bucket `storm-files` (por
  ejemplo `descargas.stormstudios.com.mx`) y actualizar los 4 enlaces.
- Cuando pasen los 90 días de la política de bundles, quitar los dos `pub-*.r2.dev` de `gameCsp`.

### P2-04 · El despliegue no se prueba antes del merge y no hay logs
- El CI corre `next build`, no la compilación de OpenNext. Un fallo del adaptador solo se vería
  después del merge, en Workers Builds, y el sitio se quedaría en la versión anterior sin que nadie
  lo note. Añadir al job `verify` un paso `npx opennextjs-cloudflare build`.
- `wrangler.jsonc` no activa logs: añadir `"observability": { "enabled": true }` para poder leer
  los `console.error` de las API en el panel.
- El workflow solo corre en `push` y `pull_request`. Añadir `schedule` semanal al job `security`
  (y, si Luis quiere, Dependabot agrupado) para enterarse de vulnerabilidades aunque no haya commits.
- **[Consola]** Activar notificaciones de Workers Builds por correo cuando falle un deploy.

### P2-05 · Peticiones que gastan Worker sin necesidad
- `/og/apps/[locale]/[slug]` genera el PNG en cada petición (0,5–0,8 s de TTFB; en Vercel lo
  cacheaba el CDN). Prerenderizarlo: `generateStaticParams` con las apps × idiomas y
  `export const dynamic = "force-static"`. Igual para `/catalog.json`.
- `/api/audio/[...path]` solo se usa en `localhost` (`lib/sequencer/audio-engine.ts:71`), pero en
  producción queda abierto como proxy público al bucket. Responder 404 en producción.
- `run_worker_first: true` hace pasar cada archivo estático por el Worker. Con P1-01 resuelto, las
  repeticiones bajan mucho; si aun así el consumo importa, excluir `/_next/static/*` con la forma
  de lista y medir en el panel antes de tocar más.

### P2-06 · Tema visual inconsistente: cabecera blanca en las apps y en el 404
**Qué pasa.** Todo el sitio es oscuro, pero el tema base sigue siendo claro (`<body class="bg-white
text-gray-900">`, cabecera `bg-white/95`) y se oscurece con `body:has(.ss-root)` y 33 reglas
`!important` en `app/storm-studios.css`. Las páginas con `GameShell` (todas las `/jugar` y `/juego`)
no tienen `.ss-root`, así que muestran **cabecera blanca y fondo blanco** sobre una app oscura. El
404 raíz también es blanco.
**Arreglo.** Hacer oscuro el tema por defecto: fondo `#050508` y `color-scheme: dark` en `body`,
cabecera oscura sin condiciones, y borrar los `body:has(.ss-root) … !important`. Rehacer
`app/not-found.tsx` con el mismo estilo y un enlace al curso. Comparar capturas antes y después en
portada, curso, una lección, `/apps`, una app y el 404.

### P2-07 · Detalles en el teléfono
- En `/apps/afinador/jugar` a 375 px, la etiqueta «UTILITY APP» se encima con «Escucha · Mide ·
  Afina». `GameShell` ya tiene `taglineHiddenOnMobile`: activarlo en las cinco Utility Apps.
- En las lecciones hay dos botones ☰ idénticos con funciones distintas (menú del sitio arriba,
  índice de lecciones flotante abajo). Dar al flotante otro icono y la etiqueta «Lecciones».
- Ese botón flotante tapa texto del contenido y del pie de página.
- En la portada hay etiquetas a 9,6–10,4 px (`ARMONÍA CLÁSICA`, `UNIDADES DISPONIBLES`…). Subirlas
  a 11–12 px.
- Los enlaces del pie miden 20 px de alto; subir a 24 px o más (`py-1`) para tocar con el dedo.

### P2-08 · SEO: lo que falta
- **Títulos largos:** 44 de 122 pasan de 60 caracteres. El sufijo « | Storm Studios Learning» ocupa
  25. Cambiar la plantilla del layout a « | Storm Studios» (16) y acortar los 10 más largos.
- **Lecciones sin datos estructurados:** las 28 páginas de lección no tienen JSON-LD. Añadir
  `LearningResource` (con `isPartOf` → el `Course`), `BreadcrumbList` y `VideoObject` cuando hay
  video de YouTube. Es lo que hace elegibles los resultados enriquecidos de video.
- **Etiqueta «Guía indexable»** visible en `/recursos`, y frases como «los temas más buscados» en la
  portada: es jerga de SEO a la vista del lector. Cambiar por «Guía de estudio» y texto natural.
- Títulos idénticos en ES y EN para Etimológica y los dos secuenciadores; añadir un descriptor.
- `lastModified` vacío en el sitemap para las 40 fichas de apps y las 8 guías.
- 40 páginas comparten la imagen social por defecto. Generar imágenes OG por lección y por post con
  la misma técnica de `/og/apps`, pero prerenderizadas.
- **[Consola]** Confirmar en Google Search Console que la propiedad sigue verificada tras el cambio
  de DNS y reenviar el sitemap cuando P1-08 esté publicado.

### P2-09 · `robots.txt` administrado por Cloudflare bloquea a los rastreadores de IA **[Decisión de Luis]**
Cloudflare antepone su bloque «Managed content»: `Content-Signal: ai-train=no` y `Disallow: /` para
GPTBot, ClaudeBot, Google-Extended, Applebot-Extended, CCBot, meta-externalagent y otros. Los
buscadores normales y los asistentes que buscan en vivo no se ven afectados. Si el propósito del
sitio es «preservar y compartir conocimiento musical» (lo dice `catalog.json`), quizá Luis prefiera
que los modelos sí aprendan de su método y lo citen; si prefiere reservarse ese derecho, dejarlo
como está. Se cambia en Cloudflare → Security → Bots → «Manage robots.txt» y «Block AI bots».

### P2-10 · Preparar el sitio para vender **[Decisión de Luis]**
El lanzamiento es mixto (web gratis; libro, clases y apps de pago), pero el sitio todavía se
presenta solo como proyecto gratuito. Propuestas, de mayor a menor efecto:
1. **Portada:** una franja «Estudia conmigo / El libro / Apps en tu teléfono» con tres llamados
   claros. Hoy el libro es una tarjeta más y las clases no aparecen.
2. **Google Play:** el campo `playStoreUrl` ya existe en el catálogo y en `AppCard`, pero ninguna
   app lo usa. En cuanto Google apruebe AP Super, enlazarla en su ficha, en `/apps` y en la portada.
3. **Clases:** añadir al formulario un selector «¿Qué quieres estudiar?» (entrenamiento auditivo,
   composición, film scoring, instrumento, otro) y modalidad; llega al correo ya clasificado.
   Considerar un botón de WhatsApp (`wa.me`) junto al teléfono.
4. **Captura de correo:** no hay lista ni aviso de nuevas lecciones; el blog tampoco tiene RSS.
   Una suscripción sencilla convierte visitas en alumnos recurrentes.
5. **Redes:** el pie no enlaza YouTube ni Facebook, que sí existen; añadirlos, y Facebook a `sameAs`.
6. **Confianza:** testimonios de alumnos en `/clases-taller` y perfil de Google Business para
   «clases de música en CDMX».

### P2-11 · Pendientes de Firebase que siguen abiertos **[Consola]**
- Restringir la clave web de Firebase por sitio (propuesta ya escrita en
  `docs/remediacion-seguridad-2026-11.md`); quitar `storm-studios.vercel.app` cuando se cierre Vercel.
- App Check: revisar métricas el **7 de diciembre de 2026** antes de exigirlo.

### P2-12 · Fuentes: seis archivos precargados en cada página
El layout precarga 6 `woff2` (≈110 KB): Inter, DM Serif normal e itálica, y DM Mono en tres pesos.
Dejar DM Mono en 400 y 500 (no encontré ningún uso del peso 300 en `app`, `components` ni `lib`), y poner `preload: false` a la itálica de DM
Serif. Comprobar con capturas que nada cambia de aspecto.

---

## 4. 🟢 Prioridad BAJA / pulido

- **P3-01** · «Guia» sin acento en la portada (`components/home/HomeResourcesSection.tsx:60`, 4 veces).
- **P3-02** · Tailwind escanea todo el repo (`apps-src/`, `archive/`, `docs/`, `public/`). Limitando
  las fuentes en `app/globals.css` (`@import "tailwindcss" source(none)` + `@source` de `app`,
  `components`, `content`, `data`, `lib`) el CSS global baja de 191 KB a 134 KB. Lo medí en un clon;
  antes de publicar, comparar capturas para confirmar que no falta ninguna clase.
- **P3-03** · `NEXT_LOCALE`: next-intl pone la cookie aunque `localeDetection` es `false` y `/`
  redirige fijo a `/es`. Nadie la lee. Añadir `localeCookie: false` en `i18n/routing.ts`.
- **P3-04** · El 404 se sirve con `<html lang="es">` también bajo `/en/…`. Aceptable por la limitación
  de Next 16 ya documentada; al rehacerlo (P2-06) poner el inglés primero cuando la ruta empiece
  por `/en`, con un script mínimo, o dejarlo bilingüe.
- **P3-05** · `manifest.ts`: sin icono de 192 px ni `purpose: "maskable"`; descripción solo en español.
- **P3-06** · 2 warnings de lint: variables sin usar en
  `scripts/sequencer/generar-figuras-leccion-7.mjs:168` y `generar-storyboard-leccion-8.mjs:12`.
- **P3-07** · Dependencias. Dentro de semver: next-intl 4.14.9, resend 6.37, @playwright/test 1.64.1,
  zustand 5.0.16, @types/node 24.19, wrangler 4.156.2 → `npm update` + `npm run check`. Mayores, cada
  una en su tarea: React 19.3, firebase 13, vitest 5, eslint 10, TypeScript 7,
  @firebase/rules-unit-testing 6.
- **P3-08** · Repo local: `.git` pesa 582 MB con 11.751 objetos sueltos y 37 `tmp_obj_*` huérfanos.
  `git gc --prune=now` lo compacta (operación local, no cambia el historial). La carpeta `.agents/`
  está sin versionar: decidir si se sube o se ignora.
- **P3-09** · El chunk compartido incluye el analizador ICU de next-intl (40 KB, 12 KB comprimido)
  solo para las etiquetas del menú. Pasar esos textos como props desde el servidor lo evitaría.
- **P3-10** · `/ES` responde 307 a `/es`; debería ser 308. La cabecera interna
  `x-middleware-set-cookie` se filtra en las respuestas.
- **P3-11** · Tras cada deploy desaparecen los chunks anteriores; quien tenga una pestaña abierta
  puede ver un error al navegar. OpenNext ofrece *skew protection* (experimental); evaluarlo solo
  si aparecen reportes.
- **P3-12** · Deuda conocida que sigue igual: 348 ternarios `es ? … : …` fuera de `messages/`, 3
  pruebas `todo`, fuente de `acordes-cantar` sin recuperar, modelos 3D en JSON (pospuesto).
- **P3-13** · PageSpeed Insights sigue sin medirse (cuota sin clave). Crear una clave gratuita o
  añadir Lighthouse CI al workflow con presupuesto para portada, `/apps` y una lección.

---

## 5. Orden de ejecución sugerido

| # | Ítems | Quién | Esfuerzo |
|---|---|---|---|
| 1 | P1-02 HTTPS y HSTS · P1-12 SPF/DKIM · P1-03 regla WAF | Luis en consola, guiado | ~40 min |
| 2 | P1-01 `_headers` · P1-03 rate limit con binding · P2-04 CI y logs | Opus | ~3 h |
| 3 | P1-07 «Siguiente» en móvil · P1-09 enlace EN · P1-08 sitemap del blog · P1-11 Maestro Virtual · P3-01 | Opus | ~2 h |
| 4 | P1-06 imágenes · P2-05 OG y catálogo estáticos · P2-12 fuentes | Opus | ~3 h |
| 5 | P1-04 aviso de privacidad · P1-05 analítica | Opus + OK de Luis | ~2 h |
| 6 | P1-10 página del libro | Luis confirma ASIN; Opus implementa | ~2 h |
| 7 | P2-06 tema oscuro por defecto · P2-07 móvil · P2-08 SEO | Opus | ~5 h |
| 8 | P2-01 cerrar Vercel · P2-02 documentación · P2-03 `r2.dev` | Luis + Opus | ~2 h |
| 9 | P2-09 robots de IA · P2-10 preparar la venta · P2-11 Firebase | Decisiones de Luis | según alcance |
| 10 | P3-* | Opus | según tiempo |

Los bloques 1 a 3 son los que más protegen el lanzamiento con menos trabajo.

---

## Anexo A · Método

- Clon del repo en una carpeta temporal con `npm ci`: `eslint`, `tsc --noEmit`, `vitest run`,
  `next build`, `npm audit`, `npm outdated`, `npm run apps:audit` y un segundo build de prueba para
  medir el CSS de Tailwind. El repo de trabajo no se tocó.
- Crawler Node propio sobre `sitemap.xml`: estado, título, descripción, canonical, og:*, hreflang
  (con reciprocidad), robots, H1, JSON-LD, imágenes y 308 enlaces. Barrido de ortografía en ES y de
  español residual en EN sobre el texto visible de 142 páginas.
- `curl -I` para cabeceras, caché, compresión, redirecciones, rutas límite y DNS (`nslookup`).
- Navegador integrado a 1280 px y 375×812: LCP, CLS, recursos, contraste calculado, desbordes,
  objetivos táctiles, nombres accesibles y capturas.
- Lectura de `next.config.ts`, `proxy.ts`, `wrangler.jsonc`, `open-next.config.ts`, las API,
  layouts, SEO, sitemap, componentes de portada, curso, blog y apps, reglas de Firestore y CI.

## Anexo B · Lo que no pude comprobar

- El panel de Cloudflare (WAF, Bots, SSL/TLS, Web Analytics, notificaciones), Search Console, Zoho
  y la ficha real de Amazon. Los ítems **[Consola]** parten de lo que se ve desde fuera.
- DKIM de Zoho: no aparece con los selectores comunes, pero el selector es libre; confirmar en Zoho.
- PageSpeed Insights (cuota agotada) y pruebas en teléfono real.
- El navegador integrado estaba oculto durante la sesión y varias capturas fallaron; las revisiones
  visuales de escritorio se apoyan sobre todo en medidas del DOM.
- **Pruebas activas que sí hice en producción:** ~50 POST a `/api/contact` con el honeypot lleno
  (no generan correo) para medir el rate limit. Nada más escribió ni envió datos.
