# Medición del sitio — S5

La revisión inicial no encontró analítica implementada en dependencias, componentes,
API ni `wrangler.jsonc`. Solo existían logs operativos. Los avisos ES/EN aún
mencionaban Vercel Web Analytics; ahora describen el alojamiento en Cloudflare y
la medición propia, anónima y sin cookies.

## Implementación

- `app/api/events/route.ts`: POST del mismo origen, JSON limitado a 2 KiB,
  validación estricta y respuesta sin caché ni cookies. No lee IP, User-Agent,
  cookies ni Referer de la petición. Sin CORS para otros sitios.
- `lib/analytics/`: rutas públicas admitidas, sanitización, transporte y escritura
  síncrona en el binding de OpenNext. Ningún token de consulta vive en el Worker.
- `components/Measurement.tsx`: vistas iniciales y navegación de Next, clics de
  compra y contacto mediante atributos de los enlaces. Incluye teclado, clic
  normal y botón central. No cuenta cambios solo de query/hash; las recargas sí.
- `BotonCompra`, los MDX del libro, `HomePrivateLessons` y `LessonLayout` aportan
  formato/tienda y ubicación del contacto (`home` o `lesson`).
- `ContactForm` envía solo contexto anónimo adicional a `/api/contact`.
  `contact_success` se escribe después de que Resend confirma el correo;
  no se cuenta el honeypot ni los fallos. Un fallo de medición no impide el correo.
  Los envíos sin contexto válido siguen funcionando y no generan ese evento.
- Una vista de una ruta de ejecución genera además `app_open`. Las fichas/listas
  de apps no son aperturas. Se cubren las rutas ES/EN, Memoria, las herramientas
  y el secuenciador del catálogo.
- `public/site-measurement.js` cubre las apps HTML abiertas directamente. No se
  ejecuta dentro de iframes: la página de ejecución de Next ya cuenta la apertura.
  Las demostraciones incrustadas dentro de una lección no generan otra apertura.
  `scripts/instrument-standalone.mjs` añade una sola referencia externa a cada HTML
  de `public/apps` y `public/tools`. `apps:build` la repone después de reconstruir
  bundles; `apps:check` admite exactamente esa diferencia respecto de `dist`.
- `scripts/analytics-catalog.mjs` genera la lista de rutas de blog, Maestría y HTML;
  los demás caminos proceden del enrutador y los catálogos. La preparación del
  build actualiza esa lista y la instrumentación HTML. Tras añadir contenido en
  desarrollo, ejecuta `npm run analytics:prepare`.

No cambió la CSP: tanto el script como `/api/events` usan `'self'`. No hay cookies,
almacenamiento del navegador, fingerprint, ID de visitante/sesión, correo,
contenido del formulario, ID de intento ni ID de Resend en los eventos. El índice
de muestreo es el nombre del evento, nunca una persona. Las etiquetas UTM solo se
leen de la URL actual: no hay atribución persistente entre páginas.

Usa etiquetas de campañas públicas sin nombres de personas ni identificadores:
por ejemplo `utm_source=youtube&utm_campaign=libro_noviembre`. Solo se admiten
slugs de hasta 64 caracteres, empezando por letra, con letras, números, guiones o
guiones bajos. Se descartan URLs, correos, UUIDs e identificadores largos. Una
cadena arbitraria no permite detectar todos los nombres personales: no incluyas
datos personales en campañas. El referrer se reduce a hostname; se excluyen IPs.

El endpoint público no acredita ventas, partidas completadas ni personas únicas;
un cliente puede falsificar eventos. No sigue al usuario para deduplicar acciones.
Los reintentos de un correo ya aceptado pueden producir otro conteo de éxito.
Las métricas son orientativas y dependen de JavaScript, bloqueadores y la red.

## Binding y columnas

`wrangler.jsonc` declara `SITE_ANALYTICS` → `storm_site_events`, con `remote: false`
para no escribir en producción desde pruebas locales. Esa opción solo controla
el desarrollo local; el binding del Worker desplegado escribe en su dataset.

| Columna | Contenido |
| --- | --- |
| index1 | Nombre del evento (muestreo) |
| blob1 | `page_view`, `amazon_click`, `contact_click`, `contact_success`, `app_open` |
| blob2 | Ruta pública sin query ni hash |
| blob3 | `es` o `en` |
| blob4 | Destino: `kindle:amazon.com.mx`, `paperback:amazon.com`, `home`, `lesson`, `form` o ruta de ejecución |
| blob5 | Dominio del referrer o vacío |
| blob6 | `utm_source` o vacío |
| blob7 | `utm_campaign` o vacío |
| double1 | 1 |

Analytics Engine añade el timestamp y el peso de muestreo. El resumen usa
`SUM(_sample_interval)`, no `COUNT(*)`, y meses completos en UTC. Visitas significa
vistas de página; no son usuarios ni sesiones. Las fuentes se calculan únicamente
sobre vistas para no multiplicarlas por clics. Un referrer propio no se interpreta
como adquisición externa.

## Cómo probar en local

Con Node 24 y las dependencias instaladas:

```powershell
npm run analytics:prepare
npm run lint
npm run typecheck
npm test
npm run dev
```

En DevTools → Network filtra `events`. Visita `/es`, pulsa «Escríbeme», abre
`/es/el-libro` y pulsa los tres botones; repite en `/en/the-book`. Comprueba
`amazon_click` con sus formatos/tiendas y `contact_click` con `home`. Desde una
lección, «Escríbeme» debe usar `lesson`. Navegar atrás vuelve a contar una vista;
cambiar solo query/hash no. No debe salir información del formulario ni la URL
completa de procedencia, ni enviarse cookies con la petición de medición.

`next dev` no tiene contexto de Workers en este proyecto: `/api/events` devuelve
503 tras validar el evento; es esperado, no una escritura en Analytics Engine.
Para comprobar el binding local, ejecuta `npm run cf:preview`: construye OpenNext
y ejecuta un Worker local, sin deploy. El dataset local es simulado; no permite
consultar estadísticas reales mediante la API remota. Comprueba respuestas 204.
Abre `/es/apps/acordes/jugar` y `/apps/acordes/index.html` directamente: cada
apertura debe producir un solo POST, no otro desde el iframe.

Un envío real de contacto requiere la configuración existente de Resend y envía
un correo. Las pruebas automatizadas lo sustituyen por un mock: comprueban éxito,
fallos, honeypot y que la medición no reciba contenido personal. No hace falta
enviar correos reales para ejecutar `npm test`.

Las pruebas cubren también validación y privacidad, el contrato de escritura del
binding, iframes, transporte sin credenciales, meses UTC y muestreo. Vitest usa
`--configLoader native --pool threads` para evitar los procesos secundarios del
cargador de configuración en Windows; Node 24 ya es requisito del proyecto.

La generación con `wrangler types` y el build OpenNext no pudieron ejecutarse en
la sesión restringida: esbuild falla al iniciar un subproceso (`spawn EPERM`).
El código declara la capacidad mínima tipada de `SITE_ANALYTICS` sobre el Env de
OpenNext. Falta confirmar el empaquetado y el runtime con `npm run cf:preview`
en una terminal que permita esos procesos. No se hizo ninguna escritura remota.

## Pasos para Luis o Claude en Cloudflare

1. La integración necesita un despliegue futuro por el procedimiento habitual,
   fuera de este encargo. Después, abre la cuenta de Cloudflare → **Workers &
   Pages** → **storm-studios** → **Bindings** y verifica **SITE_ANALYTICS**,
   tipo **Analytics Engine**, dataset **storm_site_events**. La fuente del binding
   es `wrangler.jsonc`; no hace falta añadir una segunda configuración en el panel.
2. No crees el dataset a mano: Cloudflare lo crea con la primera escritura del
   Worker. Tras visitar una página del sitio desplegado, el dataset estará
   disponible para consultas. No actives Web Analytics ni instales un beacon.
3. Para el reporte, abre **My Profile → API Tokens → Create Token → Create Custom
   Token**. Nombre sugerido: `Storm Studios reportes`. En **Permissions** elige
   **Account → Account Analytics → Read**. En **Account Resources** limita a
   **Include → Specific account → la cuenta de Storm Studios**. Continúa al
   resumen y crea el token. Guárdalo en tu gestor de secretos, nunca en el repo
   ni en el chat. No necesita permisos de edición ni ser un secret del Worker.
4. En el panel abre **Workers & Pages → Account Details → Account ID** y pulsa
   copiar. También puedes pulsar **Ctrl+K**, buscar **Copy account ID** y elegir
   ese resultado. En la terminal local proporciona el ID y el token como
   variables de entorno:

```powershell
$env:CLOUDFLARE_ACCOUNT_ID = "ID_DE_CUENTA_DE_32_CARACTERES"
$analyticsToken = Read-Host "Token de lectura" -AsSecureString
$env:CLOUDFLARE_ANALYTICS_API_TOKEN = [System.Net.NetworkCredential]::new("", $analyticsToken).Password
npm run analytics:monthly -- 2026-11
Remove-Item Env:\CLOUDFLARE_ANALYTICS_API_TOKEN
```

El resultado es `reports/analytics/2026-11.md`; un tercer argumento permite otra
ruta (`npm run analytics:monthly -- 2026-11 reports/noviembre.md`). Sin mes usa el
mes anterior en UTC. La credencial solo se lee del entorno; los errores no
imprimen cuerpos de respuesta ni cabeceras. Si falla la API, no genera un informe
parcial. El reporte incluye visitas, páginas principales, Amazon por formato y
tienda, contactos, fuentes y aperturas. Ejecutarlo cada mes y archivar el Markdown:
Analytics Engine retiene los datos tres meses.

## Referencias verificadas

- [Bindings de OpenNext](https://opennext.js.org/cloudflare/bindings): acceso desde route handlers mediante `getCloudflareContext`.
- [Analytics Engine: binding y creación del dataset](https://developers.cloudflare.com/analytics/analytics-engine/get-started/).
- [API SQL, permisos del token y muestreo](https://developers.cloudflare.com/analytics/analytics-engine/sql-api/).
- [Retención y límites](https://developers.cloudflare.com/analytics/analytics-engine/limits/).
- [Copiar Account ID](https://developers.cloudflare.com/fundamentals/account/find-account-and-zone-ids/).
