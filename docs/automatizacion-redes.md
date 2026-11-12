# Automatización de redes de Storm Studios

Node 24, módulos nativos, sin instalaciones adicionales. Código en `scripts/redes/`. Cada semana Luis revisa el lote y sus fechas y da un «sí» explícito para ese lote; la skill ejecuta después `publicar-lote --confirmar`. Este documento no constituye aprobación para publicar. Durante la implementación no se autorizaron cuentas ni se llamaron APIs reales.

## Flujo semanal

1. `lote-redes` prepara y revisa los cuatro MP4 y los textos. Escribe `LOTE.md` y `manifiesto.json` juntos en `apps-src/plan-lanzamiento/redes/lotes/AAAA-SNN/`.
2. Ejecuta la simulación y resuelve errores de fechas o archivos. Muestra las siete entradas y sus horarios a Luis.
3. Luis revisa contenido, audiencia infantil y declaración de contenido sintético y aprueba ese lote. El agente ejecuta una sola confirmación que programa los siete destinos. No se requiere aprobar cada subida.
4. Las plataformas publican en sus propios servidores; la PC puede apagarse después de programar. YouTube procesa el video; Meta también puede rechazar el procesamiento después de aceptar la solicitud.
5. El reporte semanal consulta los IDs guardados y comprueba visibilidad real. El Programador de tareas puede ejecutar la consulta semanal sin otro «sí»; la configuración se describe al final.

```powershell
node scripts/redes/calendario.mjs 2026-S47
node scripts/redes/publicar-lote.mjs apps-src/plan-lanzamiento/redes/lotes/2026-S46/manifiesto.json
# SOLO tras aprobar el lote, en una sesión autorizada para publicar:
node scripts/redes/publicar-lote.mjs apps-src/plan-lanzamiento/redes/lotes/2026-S46/manifiesto.json --confirmar
# Simulación del reporte, sin credenciales ni red:
node scripts/redes/reporte-semanal.mjs apps-src/plan-lanzamiento/redes/lotes/2026-S46/manifiesto.json
# Consulta real de lectura, cuando se autorice operar las cuentas:
node scripts/redes/reporte-semanal.mjs apps-src/plan-lanzamiento/redes/lotes/2026-S46/manifiesto.json --consultar
```

`--dry-run` es opcional y equivale al modo predeterminado del publicador. No lee credenciales, no usa red y no escribe archivos; sí comprueba la existencia de los MP4 y los horarios. No combine `--dry-run` con `--confirmar`. No se permite una programación a menos de 15 minutos. Facebook usa una ventana conservadora de 28 días para todos los formatos. Las fechas vencidas se corrigen y se vuelven a mostrar antes de aprobar; nunca se convierten en publicación inmediata.

## Calendario y manifiesto

La estrategia pide dos cortos por semana y español en Facebook; no fija horas. Propuesta inicial: martes 19:00 texto con enlace, jueves 19:00 corto 1 ES (YouTube y Facebook) y 19:30 EN (solo YouTube), domingo 12:00 corto 2 ES y 12:30 EN. Son horarios de prueba, ajustables según resultados. No publicar si faltan revisión, cimientos del canal o aprobación del producto.

El calendario usa semana ISO (lunes–domingo), zona `America/Mexico_City` y fechas explícitas `AAAA-MM-DDTHH:mm:00-06:00`, validadas contra la zona IANA. El primer lote S46 conserva **13, 16 y 18 de noviembre** del original como excepción: en 2026 caen viernes, lunes y miércoles. El LOTE fue corregido para que coincida; los EN se separaron 30 minutos. Las fechas atraviesan semanas ISO porque el lote original ya lo hacía.

Modelo completo: `scripts/redes/ejemplo-manifiesto.json`. El ejemplo usa rutas relativas ficticias; el manifiesto real S46 usa las rutas absolutas de los renders existentes. La carpeta `apps-src/plan-lanzamiento/` es local y no se versiona: el ejemplo conserva el contrato en el código entregable. No mover un manifiesto con rutas relativas sin mover sus archivos.

| Campo | Significado |
|---|---|
| `version`, `batch`, `timeZone` | `1`, `AAAA-SNN`, `America/Mexico_City` |
| `pieces[].key` | Clave estable y única dentro del lote |
| `platform`, `kind`, `language` | `youtube`/`short`/`es` o `en`; `facebook`/`reel`, `video` o `link`/`es` |
| `file` | MP4 absoluto o relativo al manifiesto; `null` para texto con enlace |
| `title`, `description`, `tags` | Texto final; etiquetas como array, también vacío. Facebook recibe título y descripción; `tags` queda como metadato editorial, no como etiquetas de personas |
| `publishAt` | Fecha y hora explícitas de CDMX |
| `width`, `height`, `durationSeconds` | Render verificado: 1080×1920, 3–60 s, contrato conservador de estos cortos |
| `madeForKids`, `containsSyntheticMedia` | Booleanos obligatorios para YouTube; revisar el contenido real, no inferirlos del idioma o del uso de IA |
| `link` | URL HTTPS para publicaciones de texto |
| `remote` | Registro administrado por el script: estado, ID y fecha de intento; no lleva credenciales |

No hay parámetro API «Shorts»: YouTube clasifica el video por su formato y duración; estos MP4 verticales breves cumplen el formato editorial. YouTube se sube con `videos.insert` mediante sesión resumible, `privacyStatus=private` y `publishAt` UTC. Facebook Reel usa `/PAGE/video_reels` en tres fases (start → binario local a rupload → finish `video_state=SCHEDULED`); `video` usa `/PAGE/videos`; texto usa `/PAGE/feed` con `published=false`. No necesita URL pública del MP4. Los hashtags que se quieran mostrar en Facebook deben formar parte del texto revisado.

## Credenciales: preparación local

1. Cree una carpeta **fuera del repositorio**, por ejemplo `C:\Users\Luis\.storm-redes`. No usar `.env` del sitio, archivos dentro del repo ni carpetas públicas/sincronizadas.
2. Con el Bloc de notas cree allí `config-inicial.json` con los campos de la tabla siguiente. Empiece con Google; puede añadir Meta después. Los valores de ejemplo son marcadores, nunca credenciales reales.
3. Limite el acceso de esa carpeta a su cuenta de Windows con Propiedades → Seguridad. El script crea tokens con modo `0600`, pero Windows requiere ACL para controlar acceso efectivo. El JSON no está cifrado: protéjalo como una contraseña.
4. En la terminal configure `$env:REDES_CREDENTIALS_FILE = 'C:\Users\Luis\.storm-redes\config-inicial.json'`. Las rutas deben ser absolutas; el script rechaza archivos dentro del repo incluso a través de enlaces/junctions.

```json
{
  "YT_CLIENT_ID": "ID_DEL_CLIENTE_DE_ESCRITORIO",
  "YT_CLIENT_SECRET": "SECRETO_DEL_CLIENTE",
  "YT_CHANNEL_ID": "UC_ID_DEL_CANAL",
  "FB_PAGE_ID": "ID_NUMERICO_PAGINA",
  "FB_PAGE_ACCESS_TOKEN": "TOKEN_DE_PAGINA",
  "FB_GRAPH_VERSION": "VERSION_vNN.0_DEL_PANEL_DE_LA_APP"
}
```

Todos estos nombres también se admiten como variables de entorno y prevalecen sobre el JSON. `YT_REFRESH_TOKEN` se añade mediante OAuth. No pegue secretos en comandos (quedan en historial), chat, bitácora o capturas; edite el archivo externo. No se usa App Secret de Meta durante la publicación. Los errores HTTP no imprimen respuestas, URLs de subida ni cabeceras. No active trazas de HTTP con credenciales. La URL de consentimiento OAuth se muestra solo en terminal; contiene client ID y estado temporal, nunca el refresh token.

## Google Cloud: una sola configuración

1. Entre en [Google Cloud Console](https://console.cloud.google.com/) con la cuenta que administra el canal. Cree un proyecto llamado, por ejemplo, `Storm Studios Redes` y selecciónelo.
2. En **APIs y servicios → Biblioteca**, habilite **YouTube Data API v3** y **YouTube Analytics API**. No necesita cuenta de servicio ni clave API para estos scripts.
3. En **Google Auth Platform → Branding**, configure nombre, correo de soporte y contacto del desarrollador. En **Audience**, use External si es una cuenta personal. Para la primera prueba añada su correo como usuario de prueba.
4. En **Data Access → Add or remove scopes**, solicite exactamente `https://www.googleapis.com/auth/youtube.upload`, `https://www.googleapis.com/auth/youtube.readonly` y `https://www.googleapis.com/auth/yt-analytics.readonly`. Son necesarios para subir, verificar canal/visibilidad y obtener retención.
5. En **Clients → Create client → Desktop app**, cree `Storm redes local`. Copie Client ID y Client secret al JSON externo como `YT_CLIENT_ID` y `YT_CLIENT_SECRET`. Si descarga el JSON de Google, guárdelo fuera del repo; el script espera los nombres propios de la tabla, no el formato `installed` del archivo descargado.
6. En YouTube Studio → Configuración → Canal → Configuración avanzada → configuración avanzada de la cuenta, o en [configuración avanzada de YouTube](https://www.youtube.com/account_advanced), copie el ID `UC…` del canal esperado a `YT_CHANNEL_ID`. Con cuenta de marca, elija el canal correcto durante OAuth. El publicador comprueba `channels.list(mine=true)` antes de subir.
7. Con `REDES_CREDENTIALS_FILE` apuntando al archivo inicial, ejecute `node scripts/redes/autorizar-youtube.mjs C:\Users\Luis\.storm-redes\credenciales.json`. La carpeta debe existir y el archivo de salida debe ser nuevo. El script no sobrescribe credenciales anteriores.
8. Abra la URL que muestra, seleccione la cuenta/canal correcto y conceda los tres permisos. El navegador vuelve a `127.0.0.1` en un puerto local aleatorio; no configure una URL pública, no use el flujo OOB ni comparta el código. El servidor escucha solo en loopback durante tres minutos; valida `state` y usa PKCE S256. Permita acceso local si el firewall lo pide.
9. El refresh token se guarda en el archivo externo de salida junto con la configuración. Cambie `REDES_CREDENTIALS_FILE` a `C:\Users\Luis\.storm-redes\credenciales.json`. No copie el token al manifiesto. Añada Meta a ese mismo archivo cuando corresponda.
10. Para no reautorizar cada semana, pase la audiencia OAuth de **Testing** a **In production** y vuelva a autorizar hacia un archivo nuevo si el token se emitió en Testing. Con estos scopes, Testing produce refresh tokens que expiran a los siete días. Publicar el consentimiento OAuth no publica videos. La verificación OAuth y la auditoría de YouTube son procesos distintos; si Google exige verificación para la audiencia/uso escogidos, complete la solicitud. Para uso personal por el propietario, consulte la excepción de uso personal que muestre el panel; no asuma que permite incorporar otros usuarios.

El refresh token puede revocarse, expirar por inactividad o invalidarse al cambiar permisos. Si ocurre, repita OAuth y sustituya la ruta externa; no regenere tokens en cada lote. El script renueva access tokens en memoria durante ejecuciones largas y no conserva access tokens.

**Privacidad y auditoría de YouTube.** La [referencia actual de videos](https://developers.google.com/youtube/data/reference/rest/v3/videos?hl=en) consultada el 12-11-2026 indica que las cargas de proyectos no verificados ya no están restringidas obligatoriamente a privado. Documentación histórica describe el bloqueo para proyectos sin auditar creados después del 28-07-2020; no debe asumirse que esa regla histórica siga aplicándose a todos los proyectos actuales. El script siempre solicita privado con fecha futura. Una aceptación de subida no prueba que vaya a hacerse público: verifique el primer resultado en Studio y en el reporte; si su proyecto sigue mostrando «bloqueado como privado», resuelva con el [proceso de cumplimiento/auditoría](https://developers.google.com/youtube/v3/guides/quota_and_compliance_audits) antes de depender de la programación automática. No intente evadir restricciones cambiando proyectos. Cuotas, copyright y procesamiento también pueden impedir una publicación.

Fuentes de Google: [OAuth de escritorio y PKCE](https://developers.google.com/identity/protocols/oauth2/native-app), [caducidad de refresh tokens](https://developers.google.com/identity/protocols/oauth2), [métricas de Analytics](https://developers.google.com/youtube/analytics/metrics).

## Meta for Developers: camino para una página propia

El camino más corto es **Luis como administrador/desarrollador de la app y con control total de su propia página**, token de esa página y acceso estándar en modo Development si el panel lo permite. No incorpora páginas de clientes ni usuarios ajenos. No necesita automatizar el perfil personal, Instagram, grupos o WhatsApp.

1. Confirme en Facebook → Página → Configuración → Acceso a la página que tiene control total y permiso para crear contenido y consultar estadísticas. Anote el ID numérico en Información de la página/Business Suite.
2. Regístrese en [Meta for Developers](https://developers.facebook.com/) con esa cuenta; active la autenticación de dos factores que solicite Meta.
3. En **My Apps → Create App**, cree `Storm Studios Redes`. Seleccione el caso de uso de administrar contenido de una página; si aparece la selección clásica, elija **Other → Business**. Asocie su Business Portfolio si el panel lo exige. Los nombres cambian según la cuenta: el resultado necesario es una app con Pages API/Facebook Login para obtener permisos de página, no una app de anuncios.
4. En **App roles**, confirme que su cuenta es administrador o desarrollador y acepte la invitación si existe. Mantenga Development para el uso propio cuando haya acceso estándar disponible. En el panel anote una versión Graph soportada por la app en `FB_GRAPH_VERSION`, literalmente `vNN.0`; no use `latest`. La implementación no fija una versión inventada.
5. En **App Review → Permissions and Features / caso de uso → Customize**, habilite/solicite para la prueba `pages_show_list`, `pages_read_engagement`, `pages_manage_posts` y `read_insights`. Sirven, respectivamente, para elegir la página, leerla/verificar estado, publicar y consultar métricas. No pida permisos de anuncios, mensajería o de personas etiquetadas. Si la versión/producto de video de su panel exige además `publish_video`, solicítelo para la misma app; no sustituye los permisos de página.
6. Abra **Tools → Graph API Explorer**, elija **su app**, obtenga un **User Access Token** con esos permisos, inicie sesión como Luis y seleccione solo la página de Storm Studios. No use la app predeterminada del Explorer: el token debe pertenecer a su app.
7. Para evitar el token corto, abra **Tools → Access Token Debugger**, inspeccione el token de usuario de su app y use **Extend Access Token** si está disponible. Si no aparece, haga el intercambio de token corto a largo con `/oauth/access_token`, `grant_type=fb_exchange_token`, client ID, App Secret y token corto mediante una herramienta local segura que no registre parámetros. El App Secret se consulta en **App settings → Basic**; nunca lo añada al repo. Esa operación es configuración de credenciales, no publicación.
8. Con el token de usuario largo, en el Explorer ejecute `GET /me/accounts?fields=id,name,access_token,tasks`. Seleccione la fila de la página propia y copie **su `access_token` de página**, no el token de usuario, al archivo externo como `FB_PAGE_ACCESS_TOKEN`; copie `id` a `FB_PAGE_ID`. Si la página no aparece, revise asignación de activos del portfolio y las selecciones del consentimiento; no pruebe IDs de otra página.
9. Inspeccione el token de página en el Debugger: compruebe app, página, permisos concedidos y vencimientos/data access expiration. Los tokens de página derivados de usuario largo pueden ser duraderos, pero no son irrevocables: pérdida del rol, cambios de seguridad y revocación pueden invalidarlos. Renueve cuando el Debugger o el reporte lo indiquen. No prometa «para siempre».
10. En el Explorer, con el token de página seleccionado, compruebe `GET /me?fields=id,name`: debe devolver el ID de Storm Studios. Este mismo control se hace antes de publicar. Cierre/limpie las herramientas de depuración tras copiar los valores al archivo externo.
11. Antes del primer lote aprobado, verifique en la referencia de **esa versión** los endpoints `video_reels`, `videos`, `feed` y `video_insights`, y los campos/ventanas de programación. Después de autorizar expresamente el primer lote, compruebe en Business Suite que las tres publicaciones ES están programadas y que los videos terminan de procesar. Si Meta rechaza `SCHEDULED` o una métrica, no se publica inmediatamente como sustitución: se detiene y se revisa compatibilidad.

Si en el paso 7 no aparece **Extend Access Token**, este es el intercambio local exacto para PowerShell. Ejecútelo solamente durante la configuración autorizada de Meta. Pide el secreto y token sin eco, no los incluye literalmente en el historial y guarda el resultado fuera del repo. No active transcripciones ni depuración HTTP. El directorio externo del ejemplo debe existir. El ID de app y App Secret se obtienen en **App settings → Basic**; el token corto es el del paso 6. No copie el bloque con valores reales a ningún archivo del repositorio.

```powershell
$metaAppId = Read-Host 'App ID de Meta'
$metaVersion = Read-Host 'Version Graph de la app (vNN.0)'
$metaSecret = [System.Net.NetworkCredential]::new('', (Read-Host 'App Secret' -AsSecureString)).Password
$metaShort = [System.Net.NetworkCredential]::new('', (Read-Host 'Token corto de usuario' -AsSecureString)).Password
try {
  if ($metaVersion -notmatch '^v\d+\.0$') { throw 'Version invalida' }
  $metaQuery = 'grant_type=fb_exchange_token&client_id=' + [uri]::EscapeDataString($metaAppId) + '&client_secret=' + [uri]::EscapeDataString($metaSecret) + '&fb_exchange_token=' + [uri]::EscapeDataString($metaShort)
  $metaLong = Invoke-RestMethod -Method Get -Uri ('https://graph.facebook.com/' + $metaVersion + '/oauth/access_token?' + $metaQuery) -ErrorAction Stop
  if (-not $metaLong.access_token) { throw 'Sin token' }
  $metaLong | ConvertTo-Json | Set-Content -LiteralPath 'C:\Users\Luis\.storm-redes\usuario-largo.json' -Encoding utf8
  Write-Host 'Guardado fuera del repo. Abrir en Bloc de notas para continuar el paso 8.'
} catch {
  Write-Host 'No se pudo intercambiar el token. Revise app, version y token; no copie el error HTTP con credenciales.'
} finally {
  Remove-Variable metaSecret,metaShort,metaQuery,metaLong -ErrorAction SilentlyContinue
}
```

Abra ese JSON externo con Bloc de notas y copie `access_token` al selector de token del Explorer para el paso 8. El resultado de `/me/accounts` proporciona el token de **página** que va en `credenciales.json`. Al terminar, elimine el archivo temporal `usuario-largo.json` y borre el portapapeles. El intercambio de token usa la URL oficial con parámetros sensibles, solo dentro de esta herramienta local sin registro; la publicación y los reportes usan cabeceras de autorización.

**Revisión de Meta.** Para administrar páginas de personas que no tienen rol en la app normalmente se necesita Live, acceso avanzado y App Review para `pages_manage_posts`, `pages_read_engagement`, `pages_show_list` y `read_insights`; puede exigir verificación del negocio, política de privacidad, instrucciones y grabación del flujo. Live por sí solo no concede esos permisos. Para una sola página propia, pruebe primero acceso estándar con Luis en ambos roles; si el panel exige revisión o verificación incluso para su configuración, cumpla ese requisito. Los scripts no la evitan. No se solicita Page Public Content Access para recoger páginas ajenas.

**Límite de verificación de esta entrega:** Meta devolvió HTTP 429 al consultar su documentación pública. Las llamadas están implementadas y probadas con simulaciones, pero no se ha validado su comportamiento en una cuenta real ni una versión Graph elegida por Luis. Las capacidades exactas de programación de Reels, permisos adicionales y nombres/unidades de métricas deben confirmarse con el panel y la prueba autorizada. Los errores se muestran como N/D o subida incierta, no como éxito inventado.

Referencias oficiales para esa comprobación: [publicación de Reels](https://developers.facebook.com/docs/video-api/guides/reels-publishing/), [posts de página](https://developers.facebook.com/docs/pages-api/posts/), [videos de página](https://developers.facebook.com/docs/graph-api/reference/page/videos/), [video insights](https://developers.facebook.com/docs/graph-api/reference/video/video_insights/), [permisos](https://developers.facebook.com/docs/permissions/), [modos de app](https://developers.facebook.com/docs/development/build-and-test/app-modes/), [tokens de página](https://developers.facebook.com/docs/pages-api/getting-started/).

## Idempotencia, fallos y reconciliación

Cada manifiesto se bloquea con un archivo `.lock` creado exclusivamente. El publicador valida **todo el lote y todos los archivos** antes de red. Comprueba cuentas por lectura antes de subir. Guarda `remote.state=uploading` antes de cada mutación; guarda el ID tan pronto como lo recibe; guarda `scheduled` tras aceptación. Una segunda ejecución omite los IDs ya programados aunque su fecha haya pasado. No cambia contenidos remotos ya enviados.

Si la red falla después de subir pero antes de guardar respuesta, no existe una transacción conjunta entre disco y plataforma: el script marca `uncertain` y detiene todo. Si el proceso muere, queda `uploading`. Ambos bloquean nuevos intentos: **no borrar el estado y volver a lanzar a ciegas**. El bloqueo protege el mismo archivo, no copias del manifiesto en otras máquinas; use siempre una única copia canónica. Haga respaldo de la carpeta local de lotes porque contiene los IDs.

Para reconciliar:

1. Confirme que no hay otra ejecución activa. Si quedó un `.lock` por cierre inesperado, elimine solo ese archivo después de comprobarlo; no borre el manifiesto.
2. Busque en Studio/Business Suite por título, hora de intento y, si se guardó, ID. Compruebe también borradores, privados y publicaciones programadas. Un Reel con ID puede haberse creado sin finalizar.
3. Si existe y está correctamente programado, anote el ID verificado en `remote.id` y `remote.state="scheduled"`, conservando `attemptedAt`. No marque un borrador como programado.
4. Si existe sin programar, termine su programación en la herramienta de la plataforma y luego registre ese resultado. Si la plataforma confirma que no se creó nada, quite únicamente el `remote` de esa pieza. Si no puede descartarse que exista, conserve `uncertain`.
5. Vuelva a simular. El resto continúa con `--confirmar` bajo la aprobación vigente solo si piezas y fechas siguen siendo las aprobadas. Si cambian, Luis debe revisar el calendario actualizado.

No hay reintentos automáticos de mutaciones ni borrado de publicaciones remotas. La sesión resumible de YouTube se usa para la transferencia; no se persiste ni se reanuda tras reiniciar el proceso, porque su URL es sensible. Las transferencias consumen el MP4 como stream, sin cargar todo el archivo en memoria. Un upload aceptado no garantiza procesamiento, alcance o visibilidad final.

## Reportes y tarea semanal

El reporte escribe `apps-src/plan-lanzamiento/redes/reportes/AAAA-MM-DD-LOTE.md` y añade una entrada con estados por destino a `redes/BITACORA.md`. Repetir el mismo día actualiza esa entrada sin duplicarla; no sobrescribe las filas editoriales agregadas que también incluyen WhatsApp. Comprueba público en YouTube y publicado en Facebook; la fecha pasada por sí sola no prueba publicación. No rellena estados desconocidos como publicados.

YouTube: vistas acumuladas de Data API, duración media y porcentaje medio visto de Analytics desde el día anterior al lanzamiento (para cubrir el desfase CDMX/Pacífico) hasta la fecha UTC de consulta. Analytics usa fechas del Pacífico y puede demorar días o no exponer datos por umbrales. Facebook: `total_video_views`/`total_video_avg_time_watched` para video; `blue_reels_play_count`/`blue_reels_avg_watch_time` para Reel; `post_clicks_by_type['link clicks']` para enlaces. Los tiempos de Meta se interpretan en milisegundos; la proporción respecto de la duración del archivo es una aproximación, no una curva de retención. Las métricas dependen de versión y permisos y pueden estar retiradas: en ese caso se indica N/D, nunca cero.

Los clics externos de Shorts y Reels no se infieren de vistas, likes o clics en tarjetas. Los enlaces de las descripciones de Shorts no son clicables; use los UTM y la analítica del sitio para visitas, consultas y conversiones. Este alcance no consulta GA4 ni inventa esa atribución. El reporte es una instantánea acumulada por pieza, **no las vistas ganadas solo esa semana**. No compare directamente cifras de vistas entre plataformas.

Configuración opcional única en Windows, después de probar credenciales y autorizar las consultas:

1. En Variables de entorno de **su usuario** cree `REDES_CREDENTIALS_FILE` con la ruta externa final, sin tokens en los argumentos. Cierre y vuelva a abrir las sesiones para cargarla.
2. Abra Programador de tareas → Crear tarea, usuario Luis, sin privilegios elevados, desencadenador semanal lunes 10:00 (hora CDMX). Use «Ejecutar lo antes posible si se omitió el inicio».
3. En Acciones → Iniciar programa, seleccione el `node.exe` de Node 24 (obtenga la ruta con `(Get-Command node).Source`). Argumentos: `scripts/redes/reportar-todos.mjs --consultar`. Iniciar en: `C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios`.
4. Configure «No iniciar una instancia nueva» si ya está en ejecución. La PC debe estar encendida y tener internet a esa hora; si desea ejecutarlo con sesión cerrada, configure las credenciales de Windows en el Programador. La tarea solo consulta: no publica ni necesita `--confirmar`.
5. Ejecute manualmente la tarea una vez **cuando se autoricen consultas reales** y compruebe los Markdown y el historial de la tarea. Sin piezas con IDs no hay nada que medir. `node scripts/redes/reportar-todos.mjs` permite simular el recorrido sin red.

## Pruebas locales

```powershell
node --test --test-isolation=none scripts/redes/redes.node-test.mjs
node scripts/redes/publicar-lote.mjs apps-src/plan-lanzamiento/redes/lotes/2026-S46/manifiesto.json --dry-run
node scripts/redes/reportar-todos.mjs
```

Las pruebas inyectan respuestas HTTP y adaptadores: calendario, validación, rechazo de fechas pasadas, journal previo, IDs, exclusión concurrente, incertidumbre tras fallo, privacidad, errores sin secretos y reportes repetibles. Usan archivos temporales y nunca APIs reales. `--test-isolation=none` evita el `spawn EPERM` del entorno restringido de Windows. No sustituye la primera comprobación de permisos, publicación y métricas reales por Luis. No se añadieron dependencias ni cambios al sitio Next.js.
