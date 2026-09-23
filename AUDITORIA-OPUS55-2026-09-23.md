# Auditoría Storm Studios — 2026-09-23 (Claude Opus 5.5)

Auditoría integral de solo lectura del repo `StormStudios` (commit `adca477`) y del sitio en vivo
https://www.stormstudios.com.mx. **No se modificó ningún archivo del proyecto**; este documento es
el único archivo nuevo.

Auditorías previas: `AUDITORIA-FABLE5-2026-07-03.md` (resuelta) y `docs/remediacion-2026-09.md`
(8–10 sep). Aquí no se repite lo ya corregido; solo aparece lo que sigue abierto o es nuevo.

---

## 0. Instrucciones para el modelo que implemente esto

1. **Lee primero** `README.md`, `AGENTS.md` y `docs/remediacion-2026-09.md`. Next.js 16 tiene
   cambios incompatibles. Antes de tocar APIs de Next, consulta `node_modules/next/dist/docs/`.
2. **Verificación obligatoria tras cada bloque:** `npm run check` (lint + 196 tests + build) y, si
   tocas `apps-src/`, `npm run apps:build` y después `npm run apps:check`.
3. **No publiques sin acuerdo con Luis.** Un push a la rama de producción despliega en Vercel. El
   README pide revisar los cambios y acordar la publicación antes.
4. **No toques** los negative-lookaheads de CSP en `next.config.ts`. Cada ruta debe recibir una sola
   cabecera CSP. **No borres** bundles antiguos de `public/apps/*/assets`: pueden servir a clientes
   con una versión en caché.
5. Mantén la paridad ES/EN. Cualquier texto nuevo va en ambos idiomas.
6. Los ítems marcados **[Decisión de Luis]** requieren su aprobación. Los marcados **[Consola]**
   se hacen en Vercel, Cloudflare o Firebase, no en el código.
7. **Ruido de Git:** `git status` muestra 34 archivos modificados, pero **solo cambian los finales
   de línea** (`git diff --ignore-cr-at-eol --stat` sale vacío). No los mezcles en tus commits.
   Ver P3-14.

---

## 1. Resumen ejecutivo

**Estado general: sólido.** La base técnica es buena. Lo que queda son sobre todo mejoras de
rendimiento transversal, deuda en las herramientas heredadas (CDN y fuentes ausentes), ortografía
visible, detalles de SEO/datos estructurados y pulido móvil.

| Área | Estado | Evidencia |
|---|---|---|
| Lint / Tests / Tipos | ✅ 0 errores · 196 pruebas aprobadas, 3 `todo` · `tsc` limpio | Clon aislado: `npm run lint`, `vitest run`, `tsc --noEmit` |
| Build | ✅ 140 páginas SSG. Solo las APIs, `/catalog.json` y `/og/apps/*` son dinámicas | `next build` (Next 16.3.3, Turbopack) |
| `npm audit` (raíz) | ✅ 0 vulnerabilidades | `npm audit` |
| Sitemap en vivo | ✅ 82/82 URLs → 200 | Crawler propio sobre `/sitemap.xml` |
| Enlaces internos y externos | ✅ 144 comprobados, 0 rotos (1 redirección 307 evitable, P2-11) | Crawler |
| Canonical / og:url / hreflang | ✅ Exactos en las 82 páginas | Crawler |
| H1 | ✅ Exactamente 1 por página | Crawler |
| Títulos y descripciones | ✅ Únicos (solo se repite el título del Sequencer) · ⚠️ 33 títulos de más de 60 caracteres | Crawler |
| Imágenes sin `alt` | ✅ 0 | Crawler |
| Cabeceras de seguridad | ✅ CSP (dos políticas), HSTS, XFO, nosniff, Referrer-Policy, Permissions-Policy | `curl -I` |
| Caché CDN | ✅ HTML con HIT en Vercel · bundles con hash `immutable` · OG y proxy de audio con HIT | `curl -I` ×2 |
| Web vitals (home, escritorio, sin limitar red) | LCP ≈ 1,5 s (el H1) · CLS 0 · ≈200 KB de JS transferido · HTML de 16 KB | PerformanceObserver en el navegador |
| PageSpeed Insights | ⚠️ Sin medir: la API sin clave agotó la cuota diaria (429) | Ver P3-16 |

### Lo que está bien (no romperlo)
- SEO on-page coherente: `createPageMetadata` y `buildAlternates` en `lib/seo/page-alternates.ts`,
  y un sitemap con slugs localizados y fechas editoriales reales.
- APIs endurecidas: límite de tamaño del cuerpo, comprobación de Origin, `no-store`, rate limit
  local más regla WAF en Vercel, y ningún dato personal en los logs.
- Reglas de Firestore limitadas al dueño del documento, más un comodín de denegación.
- Respuestas 410 para la taxonomía antigua de WordPress y 404 real con `noindex`.
- Enlace para saltar al contenido, menú móvil con `aria-expanded`, cierre con Escape y devolución
  del foco, soporte de `prefers-reduced-motion` y botones con `aria-pressed`.
- Progreso del curso validado, con respaldo e importación.

---

## 2. 🔴 Prioridad ALTA

### ✅ P1-01 — HECHO · Google Fonts cargado con `@import` (bloquea el render; proveedor no declarado)
**Problema:** `app/globals.css:1` hace
`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display…&family=DM+Mono…')`.
Esto crea una cadena CSS → CSS de terceros → woff2 que bloquea el render en **todas** las páginas.
El elemento LCP de la home es el H1 en *DM Serif Display*, así que el LCP depende de esa fuente
externa. Además, cada visitante envía su IP a Google, y el aviso de privacidad
(`content/pages/*/privacy-notice.mdx`) no menciona Google Fonts. Inter ya se autoaloja con
`next/font`; las otras dos familias no.

**Evidencia:** en vivo, `/es` solicita `fonts.googleapis.com/css2?...` y
`getComputedStyle(h1).fontFamily === "DM Serif Display"`.

**Fix:**
1. En `app/[locale]/layout.tsx`, junto a `Inter`:
   ```ts
   import { DM_Mono, DM_Serif_Display, Inter } from "next/font/google";
   const dmSerif = DM_Serif_Display({ weight: "400", style: ["normal", "italic"], subsets: ["latin"], variable: "--font-dm-serif", display: "swap" });
   const dmMono  = DM_Mono({ weight: ["300", "400", "500"], subsets: ["latin"], variable: "--font-dm-mono", display: "swap" });
   // <html lang={locale} className={`${inter.variable} ${dmSerif.variable} ${dmMono.variable}`}>
   ```
2. Quita la línea 1 de `app/globals.css`.
3. En `app/storm-studios.css`, sustituye cada `'DM Serif Display'` y `'DM Mono'` por
   `var(--font-dm-serif)` y `var(--font-dm-mono)` con el mismo fallback. Están en las líneas 24,
   123, 124, 234, 239, 246 y 276, que son todas las apariciones en `app/` y `components/`. El
   `fontFamily: "monospace"` genérico de `MusicPlayer` y `GameShell` no depende de estas fuentes y
   puede quedarse.
4. En `appCsp` (`next.config.ts`), retira `https://fonts.googleapis.com` de `style-src` y
   `https://fonts.gstatic.com` de `font-src`. **Mantenlos en `gameCsp`**, porque varias apps
   embebidas (por ejemplo `public/apps/acordes-cantar/index.html`) cargan sus propias Google Fonts.
5. Actualiza el aviso de privacidad solo si alguna app embebida sigue usando Google Fonts
   (ver P2-12). **[Decisión de Luis]** para el texto legal.

**Verificación:** en la pestaña Red de `/es` no aparece ninguna petición a `fonts.googleapis.com`.
Las fuentes se ven iguales y `npm run build` pasa.

---

### ✅ P1-02 — HECHO · El selector de idioma mete el catálogo completo de guías en ~130 páginas
**Problema:** `components/ui/LanguageSwitcher.tsx:8-10` es un componente cliente que forma parte
del `Header` (presente en todas las páginas). Importa `getResourceBySlug` de
`data/resources/resources-catalog.ts` (553 líneas con el **texto completo** de las cuatro guías en
ES y EN) y `lib/course.ts` (todas las lecciones). El resultado es un chunk de **63,7 KB (21 KB
gzip)** que se descarga en todas las páginas que llevan header.

**Evidencia:** en el build, el chunk que contiene el texto "De los ejercicios aislados a la escucha
musical" aparece referenciado en 130 HTML prerenderizados. En vivo, `/es/contacto` carga
`/_next/static/immutable/chunks/2qwhdl273fj97.js` (63.941 bytes), que contiene ese texto.

**Fix:**
1. Crea un módulo ligero, por ejemplo `data/seo/localized-slugs.ts`, que exporte solo los mapas de
   slugs:
   - `RESOURCE_SLUGS: Record<key, {es, en}>`
   - `LESSON_URL_SLUGS` (hoy está en `lib/course.ts:40-81`)
   - reutiliza `BLOG_POST_TRANSLATIONS`, que ya es ligero.
2. Haz que `resources-catalog.ts` y `lib/course.ts` **importen** esos mapas, para que haya una sola
   fuente de verdad.
3. `LanguageSwitcher` debe importar solo ese módulo.
4. Opcional, recomendado: convierte el botón en un `<Link>` real al URL alternativo, calculado en el
   cliente con `usePathname` y `useParams`. Así se puede abrir en otra pestaña, lo rastrean los
   buscadores y funciona sin JS.

**Verificación:** tras `npm run build`, busca en `.next/static` una frase del catálogo; solo debe
aparecer en los chunks de las páginas `/recursos`. El JS inicial de `/es/contacto` baja unos 21 KB
gzip.

---

### P1-03 · Scripts de CDN sin versión fija ni SRI en herramientas heredadas (cadena de suministro)
**Problema:** los HTML autónomos de `public/` cargan librerías de CDNs públicos **sin `integrity`**.
Un caso usa además una **versión sin fijar**:
- `public/apps/{tetris,burbujas,laberinto,ranita}-gemini.html` (juegos distractores de App Memoria)
  cargan `https://unpkg.com/@phosphor-icons/web` **sin versión**. Hoy resuelve a `@2.1.2`; cualquier
  publicación futura del paquete, legítima o maliciosa, entraría directo al sitio. La CSP de juegos
  permite `unpkg.com` y `'unsafe-eval'`.
- `public/tools/secuenciador.html`, `public/tools/sequencer.html` y
  `public/apps/piano-notas{,-en}.html` cargan `vexflow@4.2.2/releases/vexflow-debug.js`. Es el
  **build de depuración sin minificar**: 318 KB comprimidos con brotli.
- `cdn.tailwindcss.com` (Tailwind *Play CDN*, que Tailwind marca como no apto para producción:
  126 KB más compilación en tiempo de ejecución) se carga en el secuenciador (herramienta central
  del curso y del Maestro Virtual), los 4 juegos distractores y Cosmic Ear.
- `public/apps/storm-bateria-v9.6*.html` carga Tone.js, @tonejs/midi y VexFlow desde
  cdnjs/jsDelivr sin SRI.

**Fix rápido (≈15 min):**
1. Fija `@phosphor-icons/web@2.1.2` en las 4 páginas `*-gemini.html`.
2. Añade `integrity="sha384-…"` y `crossorigin="anonymous"` a **todos** los `<script src="https://…">`
   de `public/apps/*.html`, `public/apps/*/index.html` y `public/tools/*.html`. Genera cada hash con
   `curl -sL URL | openssl dgst -sha384 -binary | openssl base64 -A`.
3. Sustituye `releases/vexflow-debug.js` por el build minificado de la misma versión. Mejor aún,
   autoaloja el archivo en `public/vendor/`.

**Fix completo (P2-12):** autoalojar o empaquetar esas dependencias y precompilar el CSS de Tailwind.

**Verificación:** las 12 páginas HTML cargan sin errores de consola. En la pestaña Red, cada script
de CDN lleva su hash `integrity`.

---

### P1-04 · Bundle en producción que depende de una URL `r2.dev` (no apta para producción)
**Problema:** la práctica **Cantar Acordes** (`/es/apps/acordes-cantar/jugar` →
`public/apps/acordes-cantar/assets/index-BQDY00jd.js`, el bundle vigente según su `index.html`)
descarga `acierto.mp3` y `error.mp3` desde `https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev`.
Cloudflare limita el tráfico de las URLs `r2.dev` y no las recomienda para producción. Ese bucket
ya tiene dominio propio: `https://samples.stormstudios.com.mx/Piano/C4.mp3` responde 200 igual que
la URL de `r2.dev`. **Esta app no tiene fuente en `apps-src/`** (ver P2-12), así que la migración
de audio del 9 de septiembre no la alcanzó.

**Fix:**
1. Confirma que `https://samples.stormstudios.com.mx/acierto.mp3` y `/error.mp3` responden 200 con
   CORS válido. Compara con `curl -I -H "Origin: https://www.stormstudios.com.mx"`.
2. Sin fuente disponible, reemplaza el literal del host en el bundle vigente **y publícalo con un
   nombre nuevo** (por ejemplo `index-<nuevo-hash>.js`, actualizando `index.html`). El
   `Cache-Control: immutable` impediría que los navegadores vieran un cambio hecho sobre el mismo
   nombre. Conserva el archivo viejo.
3. Añade una línea al registro de `docs/cloudflare-audio.md`.

**Nota:** `pub-2de970e8…r2.dev` (APKs y voces de Elefantito) es el "cuarto bucket" pendiente que ya
documenta la remediación. No es nuevo, pero debe seguir en la lista.

---

### ✅ P1-05 · Errores visibles en la portada — HECHO (op. 61 corregido; Luis puede ajustar la obra)
1. **El visualizador de ondas se desborda en móvil.** `components/WaveVisualizer.tsx` pinta 40
   barras de 6 px con 4 px de separación (≈396 px de ancho mínimo) y `.ss-bar { flex-shrink: 0 }`
   (`app/storm-studios.css:107`). A 375 px de ancho, las barras salen de la tarjeta de cristal hasta
   los bordes de la pantalla (verificado con captura).
   **Fix:** `overflow: hidden` en el contenedor de la tarjeta (`HomeHero.tsx:130-137`) y barras
   flexibles (`flex: 1 1 0; max-width: 6px; min-width: 2px`), o menos barras por debajo de `sm`.
2. **Dato musical incorrecto en el hero.** `messages/{es,en}/common.json:90`
   (`home.hero.analysisLabel`) dice *"análisis · sonata op. 64 nº 2 — shostakovich"*. Shostakovich
   no tiene una "Sonata op. 64 nº 2"; su **Sonata para piano nº 2 es el op. 61**. En un sitio que
   presume el linaje Shostakovich, un músico lo notará. **[Decisión de Luis]**: corregir a
   *"sonata nº 2, op. 61 — shostakovich"* o a la obra que se quiera citar.
3. **Doble icono en el botón de música.** `components/MusicPlayer.tsx:91-94` pinta un SVG ▶ **y**
   el carácter "▸" ("▶ ▸ REPRODUCIR DEMO"). Quita el "▸ " del texto.
4. El visualizador es decorativo: añade `aria-hidden="true"` a su contenedor. Además no necesita
   `"use client"`, porque solo usa CSS; quitarlo ahorra hidratación.

**Verificación:** captura a 375×812 y 1440×900. Ninguna barra sale de la tarjeta.

---

### ✅ P1-06 · Acentos faltantes — HECHO · en textos públicos en español (credibilidad y SEO)
Las **guías de estudio**, que son páginas SEO indexadas, y varios botones tienen decenas de palabras
sin tilde. El MDX (`content/`) está bien; el problema está en cadenas escritas en TS/TSX.
- `data/resources/resources-catalog.ts`, textos `es:` en las líneas **81, 91, 120, 154, 220, 283,
  319, 331, 357, 404, 444, 450, 482** y otras: *propedeutico, conduccion (×4), armonica (×5),
  melodica, gramatica, analitica, notacion, solida, estan, funcion, relacion, progresion, vision,
  separacion, tematicas, paginas, articulos, cantalo, colocalo, lineas, "Asi", "como" interrogativo…*
- `components/home/HomeResourcesSection.tsx:31,37,69`: "Explora guias", "curso de armonia
  tradicional", "estas paginas", "mas buscados", "Abrir guia".
- `app/[locale]/apps/page.tsx:125,128,131`: "armonia", "guias", "metodo".
- `app/[locale]/curso-armonia/page.tsx:212,217,223`: "guias", "armonia", "teoria", "articulos".
- `app/[locale]/privacidad/page.tsx:16,19`: "Politica", "basico" (título y meta descripción).
- `app/[locale]/memoria/page.tsx:18`: "practica musical" → "práctica".
- `app/[locale]/apps/[slug]/page.tsx:37`: keyword "educacion musical".

**Fix:** haz una pasada ortográfica completa de **todas** las cadenas `es:` y de los ternarios
`es ? "…"` en `app/`, `components/` y `data/`. **No cambies los slugs**: `curso-de-armonia-tradicional`
y similares son URLs publicadas y no se tocan.

**Verificación:**
```bash
grep -rnE "[ \"'>](armonia|teoria|metodo|guias?|articulos|conduccion|armonica|melodica|notacion|analitica|paginas?|Politica|basico)[ ,.:;\"'<]" app components data --include=*.ts --include=*.tsx
```
Debe devolver 0 resultados fuera de slugs e identificadores.

---

### P1-07 · Formulario de contacto: el anti-bot depende del reloj del visitante
**Problema:** `components/ContactForm.tsx:60-61` guarda `startedAt = Date.now()` **del cliente**, y
`app/api/contact/route.ts:249` rechaza si `Date.now()` **del servidor** `- startedAt < 3000`.
- Si el reloj del visitante va adelantado más que el tiempo que tardó en escribir (≈1 minuto), el
  envío se rechaza con **400 "Revisa los datos del formulario"**, un mensaje falso para un error que
  el usuario no puede corregir. Es la única vía de contacto para clases.
- Al revés, la comprobación se salta enviando cualquier `startedAt` antiguo.

**Fix:**
1. En el cliente, mide el tiempo transcurrido con un reloj monótono:
   `startRef.current = performance.now()` al montar, y al enviar
   `elapsedMs: Math.round(performance.now() - startRef.current)`.
2. En el servidor, cambia el esquema a `elapsedMs: z.number().int().min(0).max(86_400_000)` y
   rechaza si `elapsedMs < 3000`.
3. Para la idempotencia, genera `attemptId = crypto.randomUUID()` al montar, reutilízalo en los
   reintentos y úsalo en el hash de la clave en lugar de `startedAt`.
4. Opcional: responde con un éxito simulado (sin enviar correo) cuando el honeypot `website` venga
   lleno. Así el bot no aprende nada.
5. Actualiza `app/api/contact/route.test.ts`. Añade un caso con el reloj del cliente adelantado
   10 minutos y otro con `elapsedMs` de 500 → 400.

La protección real sigue siendo la regla WAF de Vercel (10 POST cada 10 minutos por IP). Si llega
spam, considera Cloudflare Turnstile. **[Decisión de Luis]**

---

## 3. 🟡 Prioridad MEDIA

### P2-01 · Maestro Virtual: los errores de la API solo están en español
`app/api/maestro-virtual/check/route.ts` lee `locale` del formulario, pero casi todos los mensajes
de error están fijos en español (líneas 199, 202, 209, 214, 217, 228, 242, 245, 248, 253, 270, 280 y
116). `components/course/ExerciseUpload.tsx:82-85` los muestra tal cual. Un estudiante en
`/en/harmony-course/…` que sube un MIDI corrupto ve "Archivo MIDI inválido o corrupto".

**Fix:** devuelve un **código** estable (`{ error: "invalid_midi" }`, `"too_large"`,
`"wrong_extension"`, `"unknown_lesson"`, `"rate_limited"`, `"satb_unavailable"`, `"internal"`) y
traduce en el cliente con un mapa ES/EN, como ya hace `ContactForm`. Mantén el 400/413/429/501. En
`ExerciseUpload.tsx:152,161`, los nombres de nota del ejercicio de la Lección 1 salen en solfeo
(Do · Sol · Re…) también en inglés: usa C · G · D… cuando `locale === "en"`.

---

### P2-02 · Títulos SEO: sin marca en la home y demasiado largos en 33 de 82 páginas
- **La home no incluye la marca.** El `title.template` del layout no se aplica al propio segmento, así
  que `/es` sale como "Curso de Armonía Tradicional, Entrenamiento Auditivo y Teoría Musical" (69
  caracteres). Usa `title: { absolute: "Storm Studios Learning · Curso de armonía y entrenamiento auditivo" }`
  o similar, sin pasar de ≈60 caracteres (`app/[locale]/page.tsx:23-26`).
- **Títulos largos (Google los trunca hacia 60 caracteres):** las 8 guías (88–113 caracteres, por
  ejemplo "Fundamentos de Teoría Musical | Una Ruta Práctica hacia Armonía y Entrenamiento Auditivo |
  Storm Studios Learning"), los 4 posts del blog (94–100 caracteres, porque usan la primera frase como
  título), `/es/recursos` (82) y `/es/clases-taller` (84). Acorta `metaTitle` en
  `resources-catalog.ts` y añade un `seoTitle` corto al frontmatter del blog.
- **H1 genéricos:** `/es/el-libro` → "El Libro" (el H1 debería ser *Los Seres Musicales*) y
  `/es/quien-soy` → "Quién Soy" (mejor *Luis Cárdenas*, con "Quién soy" como antetítulo).
  `/en/apps/desglose-auditivo` → "Unlocking" no dice nada en inglés; considera "Unlocking —
  Chord-tone isolation". **[Decisión de Luis]**
- **Descripciones fuera de rango:** la home (179 y 186 caracteres), P01 y P02 (51–66), Desglose y
  Cantar Acordes en EN (161–175).

---

### P2-03 · Datos estructurados incompletos o incoherentes
| Página | Hoy | Recomendación |
|---|---|---|
| `/el-libro` | Nada | `Book` con `author` (Person `#luis-cardenas`), `inLanguage`, `bookFormat` (EBook/Paperback), `isbn` si existe, `offers` o `url` a Amazon (Kindle en amazon.com, impreso en amazon.com.mx; los enlaces ya están en el MDX) |
| `/quien-soy` | Nada | `ProfilePage` con `mainEntity` Person `#luis-cardenas` + `sameAs` (YouTube, Instagram) + `image` |
| Home (`HomeStructuredData.tsx`) | Person con `jobTitle` fijo en español y `url` fijo a `/es/quien-soy`; `areaServed: "MX"` | Localizar `jobTitle` y `url`; `areaServed` mundial o eliminarlo (el curso es en línea y bilingüe) |
| `/curso-armonia` | `Course` con descripción fija "lecciones 1–3" (`curso-armonia/page.tsx:233-254`) | Derivar la descripción de `getAllLessons()`. Añadir `hasCourseInstance` (`courseMode: "online"`, `courseWorkload`) y `offers` (`price: 0`), que Google exige para *Course info* |
| Lecciones | Nada | `LearningResource` o `Course` con `isPartOf` → curso, más `BreadcrumbList`. La miga de pan visible (`LessonLayout.tsx:30-43`) debería ir en `<nav aria-label="breadcrumb">` |
| Fichas de apps | `SoftwareApplication` sin `offers` | Añadir `offers: { "@type": "Offer", price: "0", priceCurrency: "USD" }`. Considerar `operatingSystem: "Web, Android"` cuando haya APK |
| Blog (`blog/[slug]/page.tsx:35-46`) | `author` Organization; `image` genérica | `author` Person `#luis-cardenas` (autor real, mejor para E-E-A-T); `image` específica |
| Guías (`resources/[slug]/page.tsx:169-191`) | `Article` sin fechas ni imagen | `datePublished`, `dateModified` (de datos, no fijas) e `image` |
| `twitter:creator` (todas) | `@StormStudiosLearning` (`lib/seo/page-alternates.ts:7`) | **Handle inválido**: X admite 15 caracteres como máximo y `x.com/StormStudiosLearning` da 404. Pon el handle real o elimina `creator` y `TWITTER_HANDLE`. **[Decisión de Luis]** |

Valida cada cambio con el *Rich Results Test* de Google.

---

### P2-04 · Contenido mínimo o provisional en lecciones indexadas
Estas páginas están en el sitemap y se indexan:
- `content/course/{es,en}/p04-secuenciador.mdx` → "*(Contenido próximamente)*" en ambos idiomas.
- `content/course/en/p03-intervalos.mdx` → "*(Content coming soon)*", mientras la versión ES tiene
  123 palabras. Hay que **traducirla**.
- `content/course/{es,en}/02-leccion-1.mdx` → el cuerpo MDX está vacío (10 palabras). La Lección 1
  depende del video.

**Fix:** traduce P03 al inglés. Para P04 y la Lección 1, añade un resumen escrito, los objetivos y
los pasos clave (idealmente un resumen o transcripción del video). Mientras no exista contenido,
considera `noIndex` en las lecciones cuyo MDX sea solo el marcador. **[Decisión de Luis]** para el
texto pedagógico.

---

### P2-05 · Videos de YouTube incrustados directamente (peso en las lecciones)
`components/course/LessonLayout.tsx:100-108` inserta el `<iframe>` de youtube-nocookie al cargar la
página. Cada iframe descarga el reproductor completo (cientos de KB de JS de terceros) aunque nadie
pulse *play*, y eso penaliza LCP, TBT e INP en móvil.

**Fix:** usa una fachada: miniatura `https://i.ytimg.com/vi/<id>/hqdefault.jpg` (ya está en
`images.remotePatterns`) con botón de play. Al hacer clic, se inyecta el iframe con `autoplay=1`.
Implementa un componente propio sin dependencias, respetando la CSP (`frame-src` ya permite
youtube-nocookie). El botón debe llevar `aria-label` con el título del video.

---

### P2-06 · Móvil: altura de las apps y controles flotantes que se solapan
1. `components/apps/GameShell.tsx:132` usa `height: calc(100vh - 64px)`. En iOS y Android, `100vh`
   incluye la barra del navegador y la parte inferior del iframe (controles del juego) queda oculta.
   Usa `100dvh`, con `100vh` como respaldo. `FullscreenShell.tsx:54` también usa `100vh`, pero
   solo en pantalla completa, donde el impacto es menor.
2. En las lecciones, a 375 px, el botón flotante "Ver índice del curso" tapa el botón "Abrir →" de
   la primera herramienta (verificado en `/es/curso-armonia/p01-notas`). Añade un
   `padding-bottom` al contenido igual a la altura del botón más el margen, o sube el botón.
3. El botón "Reproducir demo" de la home (`MusicPlayer`, fijo abajo a la derecha, `z-index: 50`)
   tapa contenido al hacer scroll en móvil. Considera ocultarlo tras el hero o hacerlo más pequeño.

---

### P2-07 · Numeración confusa de lecciones ("Lección 1.1")
`LessonLayout.tsx:57,61` muestra `lesson.lessonNumber ?? lesson.order`. Para el propedéutico
(`order: 1.1…1.4`) aparece **"LECCIÓN 1.1"** encima de "P01 – Escritura…", y la introducción muestra
"Lección 0". La lección real "Lección 1" es otra. **Fix:** añade a `LessonConfig` un campo
`label: {es, en}` (por ejemplo "P01", "Intro") y úsalo en la insignia y en el antetítulo. Muestra
"Lección N" solo si existe `lessonNumber`.

---

### P2-08 · 404 en rutas dinámicas: HTML vacío en el servidor, título genérico, `/apps` sin prefijo
1. `/es/apps/no-existe`, `/es/blog/no-existe` y otras llamadas a `notFound()` dentro de `[slug]`
   devuelven un **404 correcto**, pero el HTML del servidor tiene el `<body>` vacío (el contenido solo
   llega en el payload RSC y se pinta con JS). El `<title>` es "Storm Studios Learning". Sin JS, la
   página queda en blanco. **Fix a probar:** `export const dynamicParams = false` en
   `app/[locale]/{apps,blog,resources}/[slug]/page.tsx` para que los slugs desconocidos caigan en
   el 404 raíz, que sí se renderiza completo (`/es/pagina-inexistente` funciona bien). Verifica en
   `next build && next start` que el HTML incluye "Página no encontrada". Añade también un título
   404 al `not-found` del segmento.
   ⚠️ **En `curso-armonia/[slug]` no lo apliques tal cual.** Esa página acepta el slug interno
   antiguo y lo redirige con 308 al slug localizado (por ejemplo `/en/harmony-course/05-leccion-4`
   → `/en/harmony-course/05-lesson-4-triads-fifth-chords`). Con `dynamicParams = false`, esos
   enlaces antiguos darían 404. Antes, añade los slugs internos a `generateStaticParams` o conserva
   la redirección en `proxy.ts`.
2. `https://www.stormstudios.com.mx/apps` y `/tools` → **404**. El `matcher` de `proxy.ts` excluye
   `apps` y `tools`, así que next-intl no añade el locale. Añade a `redirects()` en `next.config.ts`:
   `{ source: "/apps", destination: "/es/apps", permanent: true }` (y lo mismo para `/tools`).

---

### P2-09 · Redirecciones temporales donde deberían ser permanentes (✅ enlace del blog corregido; 308 del dominio pendiente en consola)
- **[Consola]** `https://stormstudios.com.mx/*` → `https://www.stormstudios.com.mx/*` responde **307**.
  En Vercel → Project → Settings → Domains → `stormstudios.com.mx` → "Redirect to www" → elige
  **308**.
- `components/blog/BlogLayout.tsx:103` enlaza a `` `/${locale}/curso-armonia` ``. En inglés eso es
  `/en/curso-armonia`, que hace un **307** a `/en/harmony-course` (lo detectó el crawler en los dos
  posts EN). **Fix:** `href="/curso-armonia"`, porque el `Link` de next-intl localiza el path.
- Las URLs raíz antiguas sin locale (`/curso-armonia`, `/contacto`, `/about-me`…) redirigen con 307
  desde next-intl. Si vienen de la web de WordPress y tienen enlaces entrantes, añádelas como 308
  explícitas en `redirects()`.

---

### P2-10 · Firestore (App Memoria): escrituras innecesarias y reglas sin validación
1. `components/apps/memoria/useFirebaseMnemonic.ts:69-72`: si el documento no existe, se hace
   `setDoc(docRef, defaultsGame)`. **Cada visitante** de `/memoria` crea un usuario anónimo **y** un
   documento con las palabras por defecto, aunque nunca personalice nada. Eso acumula documentos y
   usuarios y crea un identificador persistente sin necesidad. **Fix:** no escribas al cargar; usa
   los valores por defecto en memoria y escribe solo en `saveRangeWords`. Mejor aún, haz la sesión
   anónima perezosa: `signInAnonymously` solo al guardar por primera vez.
2. `firestore.rules`: el dueño puede escribir **cualquier estructura de cualquier tamaño** (hasta
   1 MiB por documento) y cualquiera puede crear usuarios anónimos ilimitados. **Fix:** valida
   `request.resource.data.keys().hasOnly([...rangos válidos])`, el tipo `map` de cada rango y el
   tamaño de las cadenas. **[Consola]** Activa App Check (reCAPTCHA Enterprise o v3) y la limpieza
   automática de cuentas anónimas (Identity Platform). Después de desplegar las reglas, verifícalas
   en la consola, como documenta la remediación.

---

### P2-11 · Coste de render de los efectos visuales (móvil de gama baja)
- `.ss-reveal` (`app/storm-studios.css:76-80`) arranca con `opacity: 0` y anima 0,9 s. Está aplicado
  **al H1 del hero**, que es el elemento LCP: el LCP se mide cuando termina la animación.
  **Fix:** no apliques `.ss-reveal` al H1 del hero (ni a los H1 de las páginas interiores), o haz que
  solo anime `transform` partiendo de `opacity: 1`.
- `.ss-orb` (líneas 41-52): tres círculos `position: fixed` de hasta 700 px con `filter: blur(110px)`
  y animación infinita, en todas las páginas oscuras. `.ss-root::before` añade una capa fija a
  pantalla completa con `feTurbulence` SVG. `.ss-glass` usa `backdrop-filter: blur(20px)` en decenas
  de tarjetas. **Fix:** sustituye los orbes por un `radial-gradient` estático, o pausa su animación
  por debajo de `md` y en `prefers-reduced-motion`. Convierte el ruido en un PNG pequeño en mosaico.
  Limita `backdrop-filter` a elementos grandes y pocos.
- `app/globals.css:24-28` aplica `transition` a **todos** los elementos (`* {}`). Quítalo y usa
  `transition-colors` de Tailwind donde haga falta.
- `@media (prefers-reduced-motion)` solo cubre `.ss-root *`. El header, el footer y el `MusicPlayer`
  (animación `ping`) quedan fuera; extiéndelo a `*`.

Durante las pruebas, las capturas a 1440×900 del navegador integrado fallaron varias veces por
timeout de render tras hacer scroll. No es concluyente, pero va en la misma dirección.

---

### P2-12 · Apps publicadas sin código fuente y herramientas con Babel en el navegador
**Sin fuente en `apps-src/`** (no se pueden regenerar ni auditar, y `apps:check` no las cubre):
`public/apps/acordes-cantar` (con un parche manual `spelling-answer.js` encima del bundle),
`cosmic-ear`, `grados-mayores`, `intervalos-reconocimiento` e `intervalos-reconocimiento-juego`.
- **Cosmic Ear** (`public/apps/cosmic-ear/index.html`) carga React 18 UMD, Three r128, Tailwind Play
  y **`@babel/standalone`, que transpila JSX en el navegador** (631 KB brotli solo Babel; ≈950 KB en
  total) desde unpkg y cdnjs. **Fix:** migrarlo a Vite + TypeScript como las otras 13 apps.
- **Synth-Kong** (`intervalos-reconocimiento-juego`) usa el proxy `/api/audio`. Cada sample pasa por
  una función serverless de Vercel. **Fix:** apúntalo directo a `https://samples.stormstudios.com.mx`
  (el CORS ya está validado para las otras apps).
- **Fix general:** recupera las fuentes en `apps-src/<carpeta>` (usando el mapeo de
  `scripts/apps-maintenance.mjs`) o documenta en el README que son binarios congelados. Integra
  `spelling-answer.js` en la fuente de acordes-cantar (la lógica ya existe en
  `lib/acordes-cantar/spelling.ts`).
- Las apps de Vite también cargan Google Fonts desde su `index.html` (por ejemplo `acordes-cantar`).
  Autoalójalas al migrar.

---

### P2-13 · i18n: mensajes sin usar y todos enviados al cliente
- `messages/{es,en}/common.json` tiene los namespaces `common`, `course`, `blog` y `contact`
  completos (≈43 claves), más `footer.madeWith` y `home.structuredData.website.inLanguage`, y
  **nada los usa**. `ContactForm.tsx` duplica `contact.*` en un objeto `LABELS` local.
- `app/[locale]/layout.tsx:59,70` pasa **todos** los mensajes a `NextIntlClientProvider`, así que
  viajan en cada página. **Fix:** pasa solo lo que usan los componentes cliente
  (`nav`, `language`, `footer`) con `pick(messages, [...])` y elimina las claves muertas.
- **Arquitectura:** casi toda la UI usa ternarios en línea (`es ? "…" : "…"`) repartidos en decenas
  de archivos, en lugar de `messages`. No es urgente, pero dificulta revisar la paridad ES/EN y la
  ortografía (el origen de P1-06). Centraliza al menos los textos de UI repetidos: "Volver", "Abrir →",
  "Curso de Armonía", etc.

---

### P2-14 · Datos duplicados o fijos que se desincronizan
- `app/[locale]/curso-armonia/page.tsx:31-38`: `INTRO_LESSON` y `PROPEDEUTICO_LESSONS` repiten
  títulos que ya existen en `data/course/lessons/*`. Además hay un "4 lecciones" fijo (línea 132).
  Deriva ambos de `getLessonsByModule("introduccion" | "propedeutico")`.
- `app/[locale]/resources/[slug]/page.tsx:92` pone "Actualizado el 7 de septiembre de 2026" **fijo
  para todas las guías**. Añade `updatedAt` por recurso en `resources-catalog.ts` y úsalo también en
  el JSON-LD (P2-03).
- **Lección huérfana:** `data/course/lessons/01-propedeutico.ts` y
  `content/course/{es,en}/01-propedeutico.mdx` no se importan en `lib/course.ts:17-35`. Elimínalos o
  muévelos a `archive/`. **[Decisión de Luis]**
- `data/course/course-config.ts:18`: el comentario dice "actualmente 7 publicadas" y hay 8
  unidades; `COURSE_CONFIG.description` dice "Domina la Armonía en el nuevo mundo de la IA". Revisa
  si sigue siendo el mensaje deseado.

---

### P2-15 · Navegación: las guías no aparecen en el menú principal
`components/layout/Navigation.tsx:7-16` tiene 8 enlaces, pero no **Guías** (`/resources`), que son
las 8 páginas SEO del sitio. Solo se llega desde el footer, la home y enlaces cruzados. **Fix:**
añade `{ key: "resources", href: "/resources" }` (la clave `nav.resources` ya existe). Si el espacio
en escritorio no alcanza, agrupa "Quién soy" y "Mi método" bajo "Sobre mí". **[Decisión de Luis]**
sobre el orden. En el footer (`Footer.tsx:32-34`), el encabezado de la columna de navegación dice
"Inicio"; mejor "Explorar" o "Secciones".

---

### P2-16 · Contacto en inglés no localizado
`app/[locale]/contacto/page.tsx`:
- Líneas 51-52: "Ciudad de México / México" también en EN → "Mexico City, Mexico".
- Línea 59: `tel:5551031758` **sin prefijo internacional**, cuando el footer ya usa `tel:+525551031758`.
  Unifica a `+52` y muestra "+52 55 5103 1758" en EN.
- Línea 64: "Lunes–Viernes, 9am–7pm" **sin zona horaria**. Añade "(hora de Ciudad de México,
  UTC−6)".
- `ContactForm.tsx:235`: "enquiry" (inglés británico) cuando el hreflang es `en-US` → "inquiry".

---

### P2-17 · Blog sin actividad desde el 27 de mayo de 2026 **[Decisión de Luis]**
Hay 2 posts, el último de hace casi 4 meses. La sección "Proyecto vivo · en expansión" de la home y
el CTA "Seguir el proyecto →" (que lleva al blog) prometen novedades. Desde entonces hubo avances
publicables: Batisfera, Aerostato, Expreso Tonal, El Cometa, Walking AP Multi, la migración de audio
y la Lección 4 en construcción. Recomendación: un post corto por cada juego 3D nuevo (con capturas),
que además aportaría contenido indexable a las fichas de apps.

---

## 4. 🟢 Prioridad BAJA / pulido

### P3-01 · Icono y manifiesto
- `app/icon.png` pesa **363 KB** (512×512) y los navegadores pueden descargarlo como favicon.
  Recomprímelo (menos de 40 KB con `oxipng` o `pngquant`).
- No hay `manifest.webmanifest` ni `theme-color`. Añade `app/manifest.ts` (nombre, iconos 192/512,
  `theme_color: "#050508"`) y `viewport.themeColor`.

### P3-02 · Archivos públicos sin uso
Ninguna referencia en `app/`, `components/`, `data/`, `lib/`, `content/`, `messages/`, `apps-src/`
ni `public/*.html|js`:
- `public/{file,globe,next,vercel,window}.svg` (restos de create-next-app)
- `public/images/{iconos-apps.jpg, emiliano-aguila.jpeg, medrano.webp, logo-favicon.png, emoji-brain.svg, emoji-headphones.svg}`

Muévelos a `archive/` o bórralos tras confirmarlo. `medrano.webp` podría **sustituir** a
`medrano.jpg` en `curso-armonia/page.tsx:83`, aunque `next/image` ya optimiza.

### P3-03 · Caché de estáticos sin hash
`/images/*`, `/og/*.jpg` y `/audio/background-theme.mp3` se sirven con
`Cache-Control: public, max-age=0, must-revalidate`, así que el navegador revalida en cada visita.
Añade en `headers()` una regla para `/images/:path*`, `/og/:path*` y `/audio/:path*` con
`public, max-age=86400, stale-while-revalidate=604800`. Asume hasta un día de caché vieja si se
reemplaza un archivo con el mismo nombre. **No la apliques a `/apps` ni a `/tools`.**

### P3-04 · Peso de los modelos 3D
Los assets de los juegos son geometría JSON de Blender. Por ejemplo
`grados-mayores-juego/assets/terminal-*.json` pesa 5,4 MB (688 KB con brotli), `atlantida` 3,2 MB y
`cabina-vapor` 2,8 MB. Con brotli viajan bien, pero **el parseo de JSON de varios MB en móviles**
tarda y consume memoria. Evalúa exportar a GLB con meshopt o Draco (`gltfpack`), o a buffers
binarios, en el pipeline de `plantillas-blender`. Mide antes y después con el panel Performance.

### P3-05 · Accesibilidad
- `components/apps/AppCard.tsx:35`: la imagen tiene `alt={name}` dentro de un enlace que ya contiene
  el nombre en el `<h3>`, así que el lector lo anuncia dos veces. Usa `alt=""`.
- `GameShell.tsx`: la *tagline* con `rgba(255,255,255,0.35)` (y `0.4` en Sequencer, Memoria e
  Intervalos) sobre fondo casi negro tiene un contraste estimado de ≈3:1, por debajo de 4,5:1, con
  tamaños de 0,6–0,72 rem. Sube la opacidad a 0,6 como mínimo y el tamaño a 0,75 rem.
- `GameShell.tsx:89-95` mueve el foco al iframe **al cargar la página**, lo que salta el header para
  quien navega con teclado o lector de pantalla. Enfoca el iframe solo tras una acción del usuario
  (pantalla completa, clic en "Jugar").
- Las páginas de juego no tienen `<h1>`. Convierte el título del `GameShell` en `<h1>` con el mismo
  estilo.
- `LessonLayout.tsx:88,126`: los títulos de video y herramientas son `<h3>` directamente bajo el
  `<h1>`. Usa `<h2>`.
- `LanguageSwitcher.tsx:68`: el texto del botón está en el otro idioma ("English" en ES y
  "Español" en EN). Añade al span `lang={locale === "es" ? "en" : "es"}`.
- Los dos `<nav>` del footer no tienen `aria-label`, y los landmarks no se distinguen del nav
  principal.
- `MusicPlayer.tsx`: usa `aria-pressed={playing}` en lugar de cambiar el `aria-label`.
- `mi-metodo/page.tsx:57`: el `alt` "Diagrama del Camino de la Señal" está fijo en español también
  para EN.

### P3-06 · Detalles de código
- `app/[locale]/privacidad/page.tsx:29`: `return null` si falta el MDX. Usa `notFound()`.
- `lib/mdx.ts:35-40,78-83`: si falta la versión EN, se sirve el **contenido español bajo la URL
  inglesa**, con hreflang en-US. Si el fallback es intencional, añade `noindex` en ese caso.
- `data/seo/blog-post-translations.ts:34-43`: si un post no tiene traducción, `getBlogPostUrls`
  genera un hreflang hacia una URL inexistente (`/en/blog/<slug-es>`). Emite alternates solo cuando
  exista la contraparte.
- `app/og/apps/[locale]/[slug]/route.tsx:12` corta la descripción a 190 caracteres a mitad de
  palabra. Corta en el último espacio y añade "…".
- `MusicPlayer.tsx:20-30` crea un `Audio` con `preload="metadata"` al montar, lo que dispara una
  petición parcial del mp3 en cada visita a la home. Créalo en el primer clic.
- La imagen de la ficha de app (`apps/[slug]/page.tsx:74-80`) está *above the fold* con
  `loading=lazy`. Añade `priority`.
- `.env.example` de `apps-src/ap-guitar`, `ap-multi` y `oido-absoluto-multi-juego` **no están
  versionados**: el patrón `.env*` de `.gitignore:37` los excluye. Añade `!.env.example`.
- `RESEND_EMAIL_DOMAIN` está configurada en Vercel, pero el código usa
  `noreply@stormstudios.com.mx` fijo (`api/contact/route.ts:263`). Úsala o elimínala.

### P3-07 · Tooling y pruebas
- `package.json`: `@types/node` es `^20`, pero el proyecto exige **Node 24** (README y CI). Súbelo a
  `^24` y añade `"engines": { "node": ">=24 <25" }` y un `.nvmrc`.
- `vitest.config.ts` genera un aviso de Vite ("ESM syntax in a file loaded as CommonJS").
  Renómbralo a `vitest.config.mts`.
- `vitest.config.ts:6-22` usa una **lista cerrada** de rutas: un `*.test.ts` nuevo fuera de ellas no
  se ejecuta sin avisar. Cámbiala por un glob (`**/*.test.ts`) excluyendo `node_modules`, `archive`
  y los `apps-src` con toolchain propio.
- Sin pruebas: `lib/music-reading/*` (scoring, generador, almacenamiento de progreso).
  `components/rhythm-reading/_tests/progresion.test.ts` tiene 3 `it.todo`.
- No hay E2E. Añade un smoke test con Playwright: la home carga, el cambio de idioma en una lección,
  el 404, el envío del formulario (API interceptada), la subida del MIDI de ejemplo
  (`lib/maestro-virtual/__fixtures__/leccion3-correcta.mid`) y una app en iframe sin errores de
  consola.
- CI (`.github/workflows/quality.yml`): fija las actions por SHA, añade
  `concurrency: { group: ${{ github.ref }}, cancel-in-progress: true }` y `timeout-minutes`.

### P3-08 · Cabeceras de seguridad (endurecimiento opcional)
- HSTS: `max-age=63072000` sin `includeSubDomains`. Añádelo cuando confirmes que todos los
  subdominios (`samples.`, `musica.`, `sfx.`) sirven HTTPS; es el caso. `preload` solo si Luis lo
  quiere.
- `connect-src` de `appCsp` permite `https://*.r2.dev` (cualquier bucket público de cualquier
  cuenta). Tras cerrar P1-04 y el cuarto bucket, limítalo a los hosts concretos.
- Opcional: `Cross-Origin-Opener-Policy: same-origin`. `script-src 'unsafe-inline'` sigue siendo
  necesario con render estático, una limitación conocida y documentada.

### P3-09 · Hreflang regional
El sitio declara `es-MX` y `en-US`. El contenido no es regional: es un curso en línea para cualquier
hispanohablante o anglohablante. Considera `es` y `en` (más `x-default`) en `getLanguageCode`, en el
sitemap y en `og:locale` (este último sí admite región). El sitemap tampoco incluye `x-default`,
aunque las páginas sí; unifícalo. **[Decisión de Luis]**

### P3-10 · Herramientas heredadas: migración completa (sigue a P1-03)
Autoaloja VexFlow, Tone.js, @tonejs/midi y los iconos Phosphor en `public/vendor/`, y precompila el
CSS de Tailwind de `secuenciador.html`, `sequencer.html` y los 4 juegos `*-gemini.html` con la CLI
de Tailwind. Después retira `cdn.tailwindcss.com` y `unpkg.com` de `gameCsp`.

### P3-11 · Afirmaciones científicas pendientes de revisión editorial **[Decisión de Luis]**
Siguen **sin cambios** las propuestas de `docs/remediacion-2026-09.md` ("Revisión editorial
propuesta"):
- `content/pages/es/mi-metodo.mdx:13`: "Utiliza principios de neurociencia…"
- `content/pages/es/quien-soy.mdx:36,54`
- `content/pages/es/el-libro.mdx:15`: "la neurociencia del aprendizaje"
- `components/apps/elefantito-nextjs/es.json:39-53`: corteza prefrontal, Kawashima, "han demostrado"
- `data/apps/apps-catalog.ts`: `longDescription` de Elefantito ("fortalecer memoria de trabajo,
  atención, velocidad de procesamiento…") y de Memoria ("rutina saludable de cuidado cognitivo").

La literatura sobre *brain training* muestra poca transferencia a capacidades generales. Formúlalo
como objetivo pedagógico, no como efecto demostrado, o cita fuentes primarias.

### P3-12 · Enlaces de Instagram y YouTube
`HomeStructuredData.tsx:27-30` declara `sameAs` a YouTube (existe) e Instagram (no se pudo
verificar sin sesión). **[Luis]** confirma el handle de Instagram. Considera enlazar ambos también
en el footer.

### P3-13 · Bundles antiguos
Por diseño se conservan bundles viejos en `public/apps/*/assets` (9 archivos huérfanos, entre ellos
`acordes/assets/index-{BbNg9fCN,qo19SFVQ}.js` e `intervalos-cantados-juego/assets/index-IB792rFt.js`).
Varios apuntan a `r2.dev`. Define una política de retirada (por ejemplo, 90 días sin referencia) y
anótala en el README.

### P3-14 · Árbol de trabajo con ruido de finales de línea
34 archivos aparecen modificados solo por CRLF frente a LF (`.gitattributes` exige LF). Tras
confirmarlo con `git diff --ignore-cr-at-eol --stat` (vacío), ejecuta `git add --renormalize .` en
un commit aparte, o `git checkout -- <archivos>`. No hay cambios de contenido que perder. También
quedan sin versionar `AGENTS.md` (con una línea "Imported Claude Cowork project instructions" al
inicio), `docs/guion-leccion-4-*` y `docs/revision-fuentes-lecciones-2026-09-18.md`. Decide si se
versionan. `.codex-remote-attachments/` debería ir a `.gitignore`. **[Decisión de Luis]**

### P3-15 · Tareas de consola **[Consola]**
- Vercel: redirección del dominio raíz a www con 308 (P2-09).
- Firebase: App Check y limpieza de usuarios anónimos (P2-10).
- Google Search Console: si no está hecho, verifica la propiedad del dominio, envía `sitemap.xml` y
  revisa *Páginas → No indexadas*. Útil para P2-02 y P2-04.

### P3-16 · Medición de rendimiento
PageSpeed Insights no se pudo ejecutar (cuota agotada sin API key). Luis puede crear una clave
gratuita en Google Cloud y usar
`https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=…&strategy=mobile&key=…`, o añadir
Lighthouse CI al workflow. Toma una **línea base** antes de P1-01, P1-02, P2-05 y P2-11, y compárala
después. Vercel Speed Insights es una alternativa sin cambiar la CSP.

---

## 5. Orden de ejecución sugerido

| # | Ítems | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | P1-06 ortografía · P1-05 portada · P2-09 (enlace del blog) | ~1,5 h | Credibilidad y SEO |
| 2 | P1-01 fuentes · P1-02 selector de idioma | ~1,5 h | Rendimiento en todo el sitio y privacidad |
| 3 | P1-03 fijar versiones y SRI · P1-04 r2.dev de Cantar Acordes | ~1 h | Seguridad y fiabilidad |
| 4 | P1-07 formulario · P2-01 errores del Maestro Virtual | ~1,5 h | Conversión y experiencia EN |
| 5 | P2-02 títulos · P2-03 datos estructurados · P2-08 404 y `/apps` | ~3 h | SEO |
| 6 | P2-05 fachada de YouTube · P2-06 móvil · P2-07 numeración · P2-11 efectos | ~3 h | Rendimiento y UX móvil |
| 7 | P2-10 Firestore · P2-13 i18n · P2-14 datos duplicados · P2-15 nav · P2-16 contacto EN | ~3 h | Mantenimiento y privacidad |
| 8 | P2-12 fuentes de apps y Cosmic Ear en Vite | varios días | Deuda técnica |
| 9 | P3-* | según tiempo | Pulido |
| — | P2-04 contenido de lecciones · P2-17 blog · P3-11 afirmaciones | Luis | Contenido editorial |

Tras cada bloque: `npm run check` (y `npm run apps:check` si aplica), revisión visual a 375 px y
1440 px, y comprobación en vivo con `curl -I` o el crawler tras el despliegue acordado.

---

## Anexo A · Método y comandos usados (todos de solo lectura)
- Clon local en un directorio temporal (`git clone` + `npm ci`) para ejecutar `lint`, `vitest run`,
  `tsc --noEmit --incremental false`, `next build`, `npm audit` y `npm outdated` **sin tocar** el
  repo de trabajo.
- Crawler Node propio: descarga `sitemap.xml` y analiza en cada URL el estado, title, description,
  canonical, og:url, hreflang, robots, og:image, twitter:creator, H1, JSON-LD e imágenes sin alt.
  Después comprueba los 144 enlaces encontrados.
- `curl -I` para cabeceras, caché (doble petición para ver HIT), redirecciones y rutas límite (404,
  410, sin locale, mayúsculas, barra final).
- Navegador integrado (375×812 y 1280/1440): capturas, `PerformanceObserver` (LCP y CLS), recursos
  cargados, `document.fonts`, prueba del menú móvil, el índice de lecciones y el 404 dinámico.
- Revisión manual de todas las páginas en `app/[locale]`, las APIs, `proxy.ts`, `next.config.ts`,
  el SEO, los componentes de layout, home, curso, apps, formulario y Firebase, las reglas, el CI,
  los scripts y el contenido MDX.

## Anexo B · Dependencias con actualización disponible (sin vulnerabilidades)
Dentro de semver: next 16.3.3→16.3.6, @next/mdx y eslint-config-next →16.3.6, next-intl
4.13.1→4.14.6, firebase 12.15→12.19, resend 6.16→6.28, zod 4.4→4.6, tailwindcss y
@tailwindcss/postcss 4.3.2→4.3.3, zustand, tailwind-merge y @types/react. `npm update` y después
`npm run check`. **No subas versiones mayores** (eslint 10, typescript 7, vitest 5, @types/node 26)
sin una tarea dedicada.
