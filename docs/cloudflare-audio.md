# Migración de audio a dominios de producción

Estado al 9 de septiembre de 2026: Terra conectó y activó tres dominios en Cloudflare. El proyecto usa ahora `samples.stormstudios.com.mx` para samples compartidos, `musica.stormstudios.com.mx` para guitarra y `sfx.stormstudios.com.mx` para percusión. Se conservan los orígenes anteriores para clientes existentes. El cuarto bucket (APK y voces iniciales de Elefantito) sigue pendiente y mantiene su URL original.

Se comprobó un archivo de cada bucket: HTTPS, HTTP 200, contenido idéntico al original, CORS desde `https://www.stormstudios.com.mx` y HTTP 206 con Range. Se actualizaron las fuentes, el origen predeterminado del proxy y la CSP; las 13 apps se regeneraron. `AUDIO_BUCKET_BASE_URL`, si está definida en un entorno, prevalece sobre el origen predeterminado.

Cloudflare indica que `r2.dev` es para desarrollo y tiene límites variables. Los dominios propios permiten utilizar su caché. Se conectan desde la configuración del bucket; **no crear un CNAME manual apuntando a `r2.dev`**. [Documentación oficial](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## Identificar los cuatro buckets

Correspondencia confirmada para los primeros tres buckets. El cuarto dominio sigue siendo una propuesta.

| URL pública actual, antes de `.r2.dev` | Uso observado | Dominio propuesto |
|---|---|---|
| `pub-16e19eafae5742d9b4b9472f6e0faed8` | `storm-samples`: samples y recursos compartidos | `samples.stormstudios.com.mx` (activo) |
| `pub-905d3540e35b4c49bb36ccc2d2d99752` | `samples-guitarra`: guitarra y efectos | `musica.stormstudios.com.mx` (activo) |
| `pub-d7ddf9faaf4e4e83b747c800e18466a7` | `samples-bateria`: percusión | `sfx.stormstudios.com.mx` (activo) |
| `pub-2de970e8bf224791a9ab6d06fa62ce19` | APK y voces de Elefantito, niveles 1–2 | `descargas.stormstudios.com.mx` (pendiente) |

## Procedimiento de referencia para nuevas conexiones

1. Abrir Cloudflare y entrar en la cuenta que contiene R2. Verificar que la zona `stormstudios.com.mx` esté en esa cuenta. Si no aparece, detenerse y revisar quién administra DNS; no cambiar nameservers sin inventariar antes correo y otros registros.
2. Abrir **R2 → bucket → Settings → Custom Domains → Add**. Empezar con el bucket de samples compartidos, comprobando su URL de la tabla.
3. Conectar el dominio propuesto, revisar la confirmación de acceso público y esperar a que quede activo con certificado HTTPS. Mantener habilitado `r2.dev` durante la transición.
4. Revisar la política CORS existente antes de editarla. Conservar orígenes legítimos de otras aplicaciones. Añadir las necesidades del website: GET y HEAD desde `https://www.stormstudios.com.mx` y `https://stormstudios.com.mx`, cabeceras de solicitud `Range`, `If-None-Match`, `If-Modified-Since`, y exposición de `Accept-Ranges`, `Content-Range`, `Content-Length`, `ETag`. Añadir localhost solo si se necesita desarrollo. No habilitar escrituras públicas. [CORS en R2](https://developers.cloudflare.com/r2/buckets/cors/).
5. Probar un archivo real con el dominio nuevo: certificado válido, 200, `Content-Type` correcto, y contenido idéntico al original. Ejemplo del bucket compartido: `/Cello/F%232.mp3`. Probar también un nombre con espacios y una descarga parcial con `Range: bytes=0-1023`.
6. Probar GET desde el navegador del website, incluyendo fetch/Web Audio. Si cambió CORS y hay caché previa, actualizar la caché de los objetos afectados según la documentación de Cloudflare.
7. Repetir para guitarra, percusión y APK. No modificar ni copiar objetos de la base de conocimiento privada.

## Mantenimiento del código después de verificar los dominios

- Configurar `AUDIO_BUCKET_BASE_URL` con el nuevo origen del bucket compartido para el proxy servidor.
- Sustituir los orígenes directos, revisando cada correspondencia: `lib/music-reading/audio.ts`, `data/apps/memoria-data.ts`, `components/rhythm-reading/_lib/audio`, fuentes de las apps en `apps-src`, Elefantito, herramientas HTML de `public/apps` y enlaces APK del catálogo.
- AP Guitar y AP Multi ya admiten `VITE_AP_GUITAR_AUDIO_BASE_URL` y `VITE_AP_MULTI_AUDIO_BASE_URL`; se aplican en el build de cada app. Confirmar el nombre exacto en su fuente antes de configurar.
- Añadir los dominios exactos nuevos a `connect-src` y, si corresponde, `img-src` de ambas CSP en `next.config.ts`. El permiso actual para `*.r2.dev` no autoriza automáticamente dominios nuevos.
- Ejecutar `npm run apps:build`, `npm run apps:check` y `npm run check`. Probar canto, reproducción, secuenciador, percusión, juegos, imágenes y APK en una vista previa.
- Publicar después de comprobar la vista previa y revisar errores/redes. Retirar `r2.dev` solo tras confirmar que no quedan clientes, apps móviles o sitios externos que dependan de esas direcciones.

## Caché y reversión

Terra configuró un año de caché en Cloudflare y navegador para los tres dominios. Por ello, al sustituir un audio se debe publicar con un nombre o ruta nuevos y actualizar su referencia: purgar Cloudflare no elimina copias ya guardadas en los navegadores. Si se quieren reemplazar archivos conservando el nombre, revisar primero esa política. Esta actualización del código no modifica la regla configurada por Terra. Los errores 404/5xx del proxy llevan `no-store`; sus éxitos se revalidan tras una hora.

Si falla el dominio nuevo, revertir variables/orígenes al valor previo y volver a desplegar la versión conocida. Conservar los buckets, objetos y URLs anteriores durante todo el cambio. Esta guía no supone compras ni migraciones de planes.
