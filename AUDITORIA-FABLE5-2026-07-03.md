# Auditoría Storm Studios — 2026-07-03 (Claude Fable 5)

Auditoría integral del repo + sitio en vivo (https://www.stormstudios.com.mx).
Auditoría anterior: 2026-05-29 (Opus 4.8) — resolvió render estático, 62 lint issues y headers de seguridad.

> **Para quien continúe este trabajo (Opus 4.8 o quien sea):** cada hallazgo incluye
> archivo, evidencia y fix concreto. Los ítems son independientes entre sí salvo que
> se indique. Workflow del proyecto: commit + push directo a `main` (deploy automático en Vercel).

---

## Resumen ejecutivo

**Estado general: muy bueno.** El sitio está sano en lo fundamental:

| Área | Estado | Evidencia |
|---|---|---|
| Tests | ✅ 155 pasan, 3 todo (14 archivos) | `npm run test` |
| Lint | ✅ 0 errores | `npm run lint` |
| Build | ✅ Todo SSG/estático, sin SSR accidental | `npm run build` — todas las rutas `●`/`○` |
| Seguridad en vivo | ✅ CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy | `curl -I https://www.stormstudios.com.mx/es` |
| SEO on-page | ✅ canonical, hreflang (es-MX/en-US/x-default), OG + Twitter cards por página, JSON-LD (WebSite + EducationalOrganization) | HTML en vivo de `/es` |
| Sitemap/robots | ✅ 82 URLs con alternates bilingües; robots.txt bloquea rutas legacy | `/sitemap.xml`, `/robots.txt` en vivo |
| i18n | ✅ Paridad total de claves es/en (`messages/es/common.json` vs `messages/en/common.json`) | script de comparación |
| Rutas en vivo | ✅ Todas las rutas de apps/juegos responden 200 (incluidas las EN localizadas tipo `/en/apps/intervalos-cantados/game`); 404 devuelve 404 real con `noindex` | curl a 9 URLs |
| Secretos | ✅ Nada commiteado (no hay .env ni claves de servidor; el config de Firebase es client-side, eso es normal) | `git ls-files` |
| Accesibilidad básica | ✅ alt en imágenes, aria-label/aria-expanded en menú móvil, HTML semántico | grep + revisión de componentes |

Lo que sigue son las mejoras encontradas, **ordenadas por impacto**.

---

## 🔴 Alta prioridad

### 1. No existe página 404 ni página de error personalizada
**Problema:** No hay `not-found.tsx` ni `error.tsx` en `app/`. El 404 en vivo es la página
genérica de Next ("404: This page could not be found."), en inglés, sin header, sin
navegación y sin diseño. Un visitante que llegue a un enlace roto queda en un callejón sin salida.
(Sí tiene `noindex`, así que el daño SEO es menor — el daño es de UX/marca.)

**Evidencia:** `curl https://www.stormstudios.com.mx/es/pagina-inexistente-404-test` → título "404: This page could not be found."

**Fix:**
- Crear `app/[locale]/not-found.tsx` bilingüe con el diseño del sitio (header/footer los pone el layout) y links a inicio/apps/curso.
- Crear `app/not-found.tsx` raíz (catch para rutas fuera de `[locale]`) que ofrezca links a `/es` y `/en`.
- Crear `app/[locale]/error.tsx` (client component con `"use client"`) y opcionalmente `app/global-error.tsx`.
- Nota next-intl: en `app/[locale]/not-found.tsx` se puede usar `useTranslations` si el layout provee mensajes; si da problemas en render estático, textos bilingües inline con `locale` funcionan igual (patrón ya usado en las páginas jugar/juego).

### 2. Logo de 1.9 MB sin optimizar en la webapp ap-multi
**Problema:** `public/apps/ap-multi/brand/storm-studios-logo.png` pesa **1,887,837 bytes**.
Es exactamente el mismo problema que ya se resolvió en AP Guitar (commit `03df539`,
"perf: optimizar logo de AP Guitar (1.8 MB → 53 KB)") pero la copia de ap-multi quedó sin optimizar.
Cada usuario que abre Oído Absoluto Multi descarga ~1.8 MB innecesarios.

**Fix (replicar el de ap-guitar):**
1. Ver cómo quedó el de ap-guitar: `git show 03df539` (redimensionar al tamaño de render real + recomprimir PNG→WebP o PNG optimizado).
2. Optimizar el asset fuente en `apps-src/ap-multi/` (hay un `scripts/sync-assets.mjs` que lo copia).
3. `cd apps-src/ap-multi && npm run deploy` para regenerar `public/apps/ap-multi/`.
4. Commit del dist regenerado.

### 3. Assets hasheados de los juegos se sirven sin caché
**Problema:** Los bundles de Vite bajo `/apps/*/assets/*` tienen nombre con hash de contenido
(p. ej. `index-Dvu1rc3L.js`, 580 KB) pero se sirven con `Cache-Control: public, max-age=0, must-revalidate`.
Cada visita re-valida (y en frío re-descarga) cientos de KB por juego.

**Evidencia:** `curl -I https://www.stormstudios.com.mx/apps/ap-multi/assets/index-Dvu1rc3L.js` → `max-age=0`.

**Fix:** En `next.config.ts`, dentro de `headers()`, añadir ANTES de las reglas existentes una regla
solo de caché para assets hasheados (en Next, si dos reglas matchean, ambas aplican y la última
gana por clave — la regla de `/apps/:path*` existente no pone Cache-Control, así que no chocan):
```ts
{
  source: "/apps/:app/assets/:asset*",
  headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
},
```
Verificar tras deploy con el mismo curl. **No tocar** las reglas CSP existentes (los negative-lookaheads están calibrados: cada ruta debe recibir UNA sola CSP).

---

## 🟡 Prioridad media

### 4. Dependencias: 4 vulnerabilidades (fix trivial) + actualizaciones patch pendientes
**Problema:** `npm audit` reporta 4 vulnerabilidades — 1 high (`vite` 8.0.x, solo dev/tooling),
2 moderate (`js-yaml` vía gray-matter, se usa en build; `protobufjs` vía firebase, sí llega al cliente),
1 low (`@babel/core`). Ninguna es crítica en producción, pero todas tienen fix automático.
Además hay actualizaciones patch/minor seguras: next 16.2.6→16.2.10, firebase 12.13→12.15,
zod, tailwind, next-intl, resend, etc.

**Fix:**
```bash
npm audit fix
npm update        # respeta semver del package.json
npm run test && npm run build   # verificar antes de commitear
```
No subir a majors (eslint 10, typescript 6, @types/node 26) sin necesidad — eso sí puede romper.

### 5. Archivos basura commiteados en la raíz del repo
**Problema:** Estos archivos están trackeados en git en la raíz y no los usa nada del sitio
(verificado con grep sobre app/components/lib/data/public):
- `background-theme.mp3.mpeg` — **7 MB**, duplicado de `public/audio/background-theme.mp3`
- `sequencer.html` — la página real usa `/tools/secuenciador.html` y `/tools/sequencer.html` de `public/tools/`
- `Logo Storm ChatGPT.png`
- `COSMIC-EAR-i18n-TASK.md` — notas de una tarea ya terminada
- `public/apps/memoria-data.js` — legacy muerto (la app memoria importa de `data/apps/memoria-data`; ningún HTML lo referencia) y expone el config de Firebase en un archivo público suelto

**Fix:** `git rm` de los cinco (o mover los .md/notas a `archive/` que ya existe). Reduce ~9 MB del repo y de cada deploy.

### 6. Sin analytics — no hay forma de medir nada
**Problema:** No hay ninguna herramienta de medición (se buscó gtag, GA, Plausible, Umami,
Vercel Analytics — nada). Con la fase de publicidad del sitio en el horizonte
(la optimización de samples/CDN está diferida justo para esa fase), no habrá datos de baseline.

**Opciones (elegir una):**
- **Vercel Analytics** (`npm i @vercel/analytics`, `<Analytics />` en el layout) — cero config, privacy-friendly, gratis en hobby con límites.
- **Plausible/Umami** — privacy-first, sin banner de cookies; requiere cuenta/instancia.
- **GA4** — gratis y potente pero requeriría banner de consentimiento (el sitio hoy no usa cookies de tracking; añadir GA4 obligaría a gestionar consentimiento).

**Ojo con la CSP:** cualquier opción requiere añadir su dominio a `script-src`/`connect-src` en la CSP estricta de `next.config.ts`. Con Vercel Analytics basta `'self'` + `/_vercel/insights/*` (mismo origen) — es la que menos fricción tiene con la CSP actual.

### 7. MusicPlayer: textos con idiomas mezclados
**Problema:** En `components/MusicPlayer.tsx` (botón flotante del homepage), el `aria-label`
sí está localizado, pero el texto visible está hardcodeado mezclando idiomas:
siempre muestra "Pausar demo" (español) al reproducir y "▸ Play demo" (inglés) al pausar,
sin importar el locale.

**Fix:** usar `es ? ... : ...` también en los `<span>` visibles (líneas ~87 y ~94), igual que ya se hace en title/aria-label.

**Bonus perf:** `public/audio/background-theme.mp3` pesa 7.3 MB. No se descarga hasta que
el usuario pulsa play (`preload="metadata"` ✅), pero al pulsarlo baja 7 MB. Recomprimir a
128 kbps (~3 MB) o mover a R2 como los samples.

---

## 🟢 Prioridad baja / pulido

### 8. Accesibilidad: falta skip-link
`components/layout/Header.tsx` no tiene enlace "saltar al contenido" para usuarios de teclado/lector.
Fix estándar: primer hijo del `<body>` en `app/[locale]/layout.tsx`:
```tsx
<a href="#main" className="sr-only focus:not-sr-only ...">{/* Saltar al contenido / Skip to content */}</a>
...
<main id="main" className="flex-1">
```

### 9. Imágenes OG de ~500 KB
`public/og/book-{es,en}.jpg` (~534 KB) y `blog-{es,en}.jpg` (~520 KB). Para previews sociales
basta JPEG calidad 75–80 (~150–200 KB). Recomprimir sin cambiar dimensiones (1200×630).

### 10. Inconsistencias cosméticas en `proxy.ts` (middleware)
No rompen nada (verificado en vivo: todas responden 200 gracias al fallback de next-intl), pero
el código miente un poco y puede confundir en el futuro:
- `APP_ROUTE_PATTERNS` no incluye `grados-mayores/jugar` ni `intervalos-cantados/juego`, aunque esas rutas existen.
- `APP_ROUTE_REWRITES` no incluye `/en/apps/intervalos-cantados/game` (sí incluye los `game`/`play` de las demás).

**Decisión recomendada:** o alinear las listas con `i18n/routing.ts`, o (mejor) evaluar si
`APP_ROUTE_REWRITES`/`APP_ROUTE_PATTERNS` sobran por completo dado que next-intl ya resuelve
los pathnames localizados — probar en local eliminándolos y verificando las 9 URLs de apps en es/en.

### 11. Endurecimiento menor de las APIs
- `app/api/contact/route.ts:82` devuelve `parsed.error.issues` al cliente (expone detalles de validación internos). Devolver solo un mensaje genérico.
- `app/api/contact/route.ts:15` usa `z.string().email()`, deprecado en Zod 4 → `z.email()`.
- `app/api/maestro-virtual/check/route.ts:106` devuelve `err.message` crudo al cliente. Devolver mensaje genérico y loggear el detalle.
- El rate-limit del contacto es in-memory por instancia (limitación conocida y documentada en el código; aceptable a esta escala — Vercel KV/Upstash si algún día hay abuso real).

### 12. Verificar reglas de seguridad de Firestore (no auditable desde el repo)
La app de memoria usa auth anónima + Firestore (`components/apps/memoria/useFirebaseMnemonic.ts`).
En la consola de Firebase, confirmar que las reglas solo permitan leer/escribir el documento del
propio `request.auth.uid` (p. ej. `match /{collection}/{uid} { allow read, write: if request.auth.uid == uid; }`).
Si las reglas son abiertas, cualquiera podría leer/escribir las palabras guardadas de otros usuarios.

### 13. Observaciones sin acción requerida
- `/privacidad`, `/memoria`, `/intervalos`, `/sequencer` tienen `noIndex: true` y no están en el sitemap — **consistente e intencional** (nota: indexar /privacidad es válido si algún día se quiere; no urge).
- Las páginas jugar/juego tienen `noIndex` ✅ — las páginas de detalle `/apps/[slug]` son las indexables. Correcto.
- El proxy de audio `/api/audio/*` valida segments contra path traversal ✅ y pasa Range/ETag ✅. `X-Vercel-Cache: MISS` en frío es el tema ya diagnosticado y **diferido a la fase de publicidad** (ver memoria `samples-cdn-pendiente`).
- El juego nuevo Walking AP Multi es build Vite compilado — no le aplican los landmines de Babel-en-navegador de los juegos HTML viejos.
- `tsconfig.tsbuildinfo` en la raíz ya está correctamente ignorado (`.gitignore:43`) — sin acción.

---

## Orden de ejecución sugerido

| # | Ítem | Esfuerzo | Impacto |
|---|---|---|---|
| 1 | 404/error pages (§1) | ~1 h | UX/marca alto |
| 2 | Logo ap-multi 1.9 MB (§2) | ~15 min | Perf alto |
| 3 | Cache-Control assets juegos (§3) | ~15 min | Perf alto |
| 4 | `npm audit fix` + updates (§4) | ~20 min + verificación | Seguridad/mantenimiento |
| 5 | Limpiar archivos raíz (§5) | ~10 min | Higiene |
| 6 | Analytics (§6) | ~30 min | Estratégico (pre-publicidad) |
| 7 | MusicPlayer i18n (§7) | ~10 min | Pulido |
| 8–12 | Skip-link, OG, proxy.ts, APIs, Firestore rules | ~2 h total | Pulido/hardening |

Tras cada cambio: `npm run test && npm run lint && npm run build`, commit a `main`, y verificar
en vivo con `curl -I` la URL afectada.
