# Migración de audio a dominios de producción

Estado: preparado, pendiente de realizar con Luis en su cuenta. Los orígenes actuales siguen activos. No se han cambiado DNS, buckets ni planes.

Cloudflare indica que `r2.dev` es para desarrollo y tiene límites variables. Los dominios propios permiten utilizar su caché. Se conectan desde la configuración del bucket; **no crear un CNAME manual apuntando a `r2.dev`**. [Documentación oficial](https://developers.cloudflare.com/r2/buckets/public-buckets/).

## Identificar los cuatro buckets

Los nombres internos se deben confirmar en el panel. Comparar la URL pública de cada bucket con esta tabla; los dominios de destino son propuestas, no dominios ya configurados.

| URL pública actual, antes de `.r2.dev` | Uso observado | Dominio propuesto |
|---|---|---|
| `pub-16e19eafae5742d9b4b9472f6e0faed8` | Samples, música y recursos compartidos | `assets.stormstudios.com.mx` |
| `pub-905d3540e35b4c49bb36ccc2d2d99752` | Samples de guitarra | `guitarra.stormstudios.com.mx` |
| `pub-d7ddf9faaf4e4e83b747c800e18466a7` | Percusión | `bateria.stormstudios.com.mx` |
| `pub-2de970e8bf224791a9ab6d06fa62ce19` | Descargas APK | `descargas.stormstudios.com.mx` |

## Pasos con Luis

1. Abrir Cloudflare y entrar en la cuenta que contiene R2. Verificar que la zona `stormstudios.com.mx` esté en esa cuenta. Si no aparece, detenerse y revisar quién administra DNS; no cambiar nameservers sin inventariar antes correo y otros registros.
2. Abrir **R2 → bucket → Settings → Custom Domains → Add**. Empezar con el bucket de samples compartidos, comprobando su URL de la tabla.
3. Conectar el dominio propuesto, revisar la confirmación de acceso público y esperar a que quede activo con certificado HTTPS. Mantener habilitado `r2.dev` durante la transición.
4. Revisar la política CORS existente antes de editarla. Conservar orígenes legítimos de otras aplicaciones. Añadir las necesidades del website: GET y HEAD desde `https://www.stormstudios.com.mx` y `https://stormstudios.com.mx`, cabeceras de solicitud `Range`, `If-None-Match`, `If-Modified-Since`, y exposición de `Accept-Ranges`, `Content-Range`, `Content-Length`, `ETag`. Añadir localhost solo si se necesita desarrollo. No habilitar escrituras públicas. [CORS en R2](https://developers.cloudflare.com/r2/buckets/cors/).
5. Probar un archivo real con el dominio nuevo: certificado válido, 200, `Content-Type` correcto, y contenido idéntico al original. Ejemplo del bucket compartido: `/Cello/F%232.mp3`. Probar también un nombre con espacios y una descarga parcial con `Range: bytes=0-1023`.
6. Probar GET desde el navegador del website, incluyendo fetch/Web Audio. Si cambió CORS y hay caché previa, actualizar la caché de los objetos afectados según la documentación de Cloudflare.
7. Repetir para guitarra, percusión y APK. No modificar ni copiar objetos de la base de conocimiento privada.

## Cambio de código después de verificar los dominios

- Configurar `AUDIO_BUCKET_BASE_URL` con el nuevo origen del bucket compartido para el proxy servidor.
- Sustituir los orígenes directos, revisando cada correspondencia: `lib/music-reading/audio.ts`, `data/apps/memoria-data.ts`, `components/rhythm-reading/_lib/audio`, fuentes de las apps en `apps-src`, Elefantito, herramientas HTML de `public/apps` y enlaces APK del catálogo.
- AP Guitar y AP Multi ya admiten `VITE_AP_GUITAR_AUDIO_BASE_URL` y `VITE_AP_MULTI_AUDIO_BASE_URL`; se aplican en el build de cada app. Confirmar el nombre exacto en su fuente antes de configurar.
- Añadir los dominios exactos nuevos a `connect-src` y, si corresponde, `img-src` de ambas CSP en `next.config.ts`. El permiso actual para `*.r2.dev` no autoriza automáticamente dominios nuevos.
- Ejecutar `npm run apps:build`, `npm run apps:check` y `npm run check`. Probar canto, reproducción, secuenciador, percusión, juegos, imágenes y APK en una vista previa.
- Publicar después de comprobar la vista previa y revisar errores/redes. Retirar `r2.dev` solo tras confirmar que no quedan clientes, apps móviles o sitios externos que dependan de esas direcciones.

## Caché y reversión

Los samples mantienen nombres estables: no aplicar un año de caché inmutable a archivos que puedan reemplazarse. Los errores 404/5xx del proxy llevan `no-store`; los éxitos se revalidan tras una hora. Para modificar esa política, usar nombres versionados o un procedimiento explícito de purga.

Si falla el dominio nuevo, revertir variables/orígenes al valor previo y volver a desplegar la versión conocida. Conservar los buckets, objetos y URLs anteriores durante todo el cambio. Esta guía no supone compras ni migraciones de planes.
