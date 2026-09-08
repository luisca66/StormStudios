# Storm Studios Learning

Website educativo bilingüe de Luis Cárdenas. Su propósito es preservar y compartir conocimiento musical: curso de armonía, entrenamiento auditivo, apps y guías de práctica.

## Desarrollo

Requiere Node.js 24 y npm. Desde la raíz:

```sh
npm ci
npm run apps:install
npm run dev
```

El sitio usa Next.js 16, React, TypeScript y next-intl. Antes de modificar APIs de Next, consulta la documentación de la versión instalada en `node_modules/next/dist/docs`.

## Verificación y publicación

```sh
npm run check
npm run apps:check
npm audit --audit-level=high
npm run apps:audit
```

`check` ejecuta lint, pruebas unitarias y build de Next. `apps:check` compila las 13 apps Vite y compara cada archivo generado con la copia servida desde `public/apps`. Si modificas fuentes de apps, ejecuta primero `npm run apps:build` y revisa el diff de fuentes y bundles. Este comando sincroniza archivos locales; no despliega a internet. Conserva assets antiguos para no romper clientes que aún cargan una versión anterior.

El proyecto de Vercel está conectado con el repositorio GitHub. Publicar en su rama de producción puede activar un despliegue. Primero revisar cambios y pruebas, y acordar la publicación. El workflow `.github/workflows/quality.yml` ejecuta controles en push y pull request; debe comprobarse su primer resultado en GitHub.

## Mapa del proyecto

- `app/[locale]`: páginas ES/EN. Las URLs públicas se traducen en `i18n/routing.ts`.
- `content/pages`, `content/course`, `content/blog`: contenido MDX público.
- `data/course` y `lib/course.ts`: lecciones, reglas y disponibilidad. `construction` muestra aviso; `hidden` no se publica.
- `data/apps/apps-catalog.ts`: catálogo público de apps, compartido por fichas y `/catalog.json`.
- `apps-src`: fuentes Vite; `public/apps`: archivos servidos en iframes y herramientas HTML heredadas.
- `lib/maestro-virtual`: validadores musicales deterministas. La revisión operativa cubre las lecciones 1–3; no usa un modelo generativo por ejercicio.
- `lib/course-progress.ts`: validación y almacenamiento local de progreso. El curso permite respaldo JSON de marcas de completado.
- `app/api/contact`: formulario vía Resend; `app/api/audio`: proxy de audio con rangos y caché controlada.
- `firestore.rules`: aislamiento por UID para App Memoria. Un archivo local no demuestra que estas reglas estén desplegadas.

## Configuración

`RESEND_API_KEY` es secreta y solo se configura en el entorno servidor. Nunca incluirla en Git, capturas o logs. Sin ella el formulario devuelve un error recuperable, no un éxito ficticio.

`AUDIO_BUCKET_BASE_URL` permite configurar el origen del proxy de audio. Su valor predeterminado es el bucket público actual. Las apps con acceso directo tienen otros orígenes; cambiar esta variable no migra todas las apps. Consulta [la guía de Cloudflare](docs/cloudflare-audio.md).

App Memoria usa Firebase anónimo para sus palabras personalizadas. El progreso del curso es local al navegador; no se sincroniza automáticamente entre dispositivos. El aviso público explica este tratamiento y los proveedores.

## Contenido y mantenimiento

Usar `updatedAt: "YYYY-MM-DD"` cuando se revise realmente una página MDX. No usar la fecha del build como fecha editorial. Mantener ES/EN y los slugs sincronizados. Las fechas desconocidas se omiten del sitemap.

Las clases ofrecen entrenamiento auditivo, composición/análisis/contrapunto/orquestación, producción de audio y música con IA, film scoring e instrumentos. Las tarifas no se publican: se invita a contactar a Luis.

La base de conocimiento privada es una fuente de contexto. No copiarla, publicarla, importarla al runtime ni incluir datos de alumnos en catálogos o documentación pública.

Ver [estado de la remediación](docs/remediacion-2026-09.md) y [operación de audio en Cloudflare](docs/cloudflare-audio.md).
