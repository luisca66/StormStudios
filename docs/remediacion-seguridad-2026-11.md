# Remediación de seguridad — 5 de noviembre de 2026

Actualización autorizada por Luis después de la auditoría. El informe privado y los detalles de servicios permanecen en `.local-work`; este registro describe cambios del repositorio.

## Cambios

- Next, MDX y configuración ESLint alineados en 16.4.5. Overrides dirigidos a `postcss-selector-parser` 6.1.5 y `minimatch` 11.0.1; el último cruza una versión mayor y se verificó con lint, pruebas y build. Se mantiene `min-release-age=7`; la instalación del parche urgente usó una excepción temporal para paquetes oficiales de Next.
- Auditorías independientes en CI, umbral moderado para la raíz y comprobación de todos los lockfiles aunque uno falle. Checkout sin credenciales persistidas; acciones fijadas por SHA. Pruebas de reglas en trabajo independiente con Java 21.
- HTML de entrada y generado normalizado a LF, conservando la comparación de bundles byte a byte. El desacuerdo anterior de Diapasón era de finales de línea.
- Aerostato e Intervalos Cantados liberan micrófono y nodos al finalizar, pausar, salir, ocultar página o ante errores. Permisos tardíos se cancelan y liberan; reanudación mediante interacción. Calibración preservada.
- Reglas de Firestore validan claves, tipos y palabras de hasta 100 caracteres; NUL se rechaza. Las actualizaciones validan rangos modificados para permitir reparación progresiva de datos antiguos. El cliente reemplaza sólo el rango guardado, conserva los demás y comunica errores reales.
- Batería ES/EN y copias antiguas construyen listas con `textContent`, validan archivos/datos y conservan registros inválidos sin cargarlos ni borrarlos.
- CSP de juegos permite únicamente el propio origen, los tres dominios de audio y dos buckets heredados identificados. Se retiran conexiones HTTPS/WSS arbitrarias.
- Selector de idioma desactivado hasta hidratarse; pruebas esperan el estado real del secuenciador. Paralelismo acotado de Playwright.

## Verificación

Build de Next y comparación de las 20 apps aprobados localmente. Las auditorías de raíz y 21 subproyectos no reportan vulnerabilidades. La ejecución completa de navegador aprobó 63 pruebas y omitió la prueba opcional de bancos R2 reales. Las pruebas específicas de micrófono comprobaron pistas sintéticas y reapertura sin hardware. Los resultados finales de reglas, CI Linux y producción deben contrastarse con la ejecución del commit publicado.

Los bundles nuevos de Aerostato e Intervalos Cantados reemplazan sus entradas el 5 de noviembre de 2026. Se conservan assets anteriores para clientes con caché; no retirarlos antes del 3 de febrero de 2027 y comprobar antes que ninguna entrada vigente los importe.

## Controles externos y alcance

Se revalidaron en consola el WAF activo para las dos API públicas y las cuotas gratuitas de Firebase. La publicación de reglas se verifica por separado del despliegue de Next. App Check requiere registro y una fase de métricas antes de enforcement para conservar compatibilidad; las restricciones de la clave web necesitan considerar clientes anteriores. No se activó enforcement de manera indiscriminada ni se rotó una configuración pública como si fuera una contraseña.

Los juegos aún comparten origen con el sitio y la CSP principal conserva hidratación inline estática. Migrarlos a otro origen o cambiar el modelo de renderizado es trabajo arquitectónico adicional; la nueva allowlist limita conexiones, pero no se presenta como aislamiento completo. La app histórica `acordes-cantar` sigue compilada sin fuente equivalente recuperada.

## App Check: observación sin facturación

El 5 de noviembre se registró la app web Memoria con reCAPTCHA Enterprise (Fraud Defense), clave web de puntuación restringida al dominio `stormstudios.com.mx` y sus subdominios. Se verificó el plan Spark y la ausencia de una cuenta de facturación vinculada. No se contrató un plan de pago.

El cliente inicializa App Check antes de Authentication/Firestore, únicamente en HTTPS y en los hosts de producción explícitos. Se conserva la app Firebase con nombre propio; ya no se reutiliza una app ajena como fallback. No se habilitan localhost, previews ni tokens de depuración en producción. La renovación automática en segundo plano queda desactivada: el SDK obtiene tokens cuando los servicios Firebase los necesitan y reutiliza los válidos. TTL del proveedor: una hora. La CSP permite las rutas oficiales de scripts, frames y conexión de reCAPTCHA; las políticas de juegos autónomos no cambian. Se actualiza el aviso de privacidad en ambos idiomas.

Firestore y Authentication permanecen **sin enforcement**, comprobado en consola. El registro y los tokens permiten observar solicitudes, pero todavía no rechazan clientes por App Check. Las reglas y la autenticación siguen controlando los datos. Si se agota la cuota gratuita, falla la certificación; mientras no se exija App Check, esa certificación no debe bloquear el guardado. Antes de exigirla se deben comprobar métricas reales, clientes heredados y el efecto del límite gratuito, sin vincular facturación automáticamente.

Verificación local de esta integración: 26 pruebas unitarias (App Check y esquema), 3 pruebas de navegador (CSP y conservación de edición ante fallo de red en ES/EN), lint sin errores y build de producción aprobado. La prueba local no consume cuota de reCAPTCHA ni escribe datos en producción. La emisión real de tokens se verifica por separado tras publicar.

## Seguimiento del 5 de noviembre (tarde): pendientes con evidencia

Revisión de solo lectura; no se cambió ninguna configuración de Firebase, Google Cloud ni cuentas.

### App Check: todavía sin datos suficientes para exigirlo

Consola de App Check, últimos 7 días (29 oct – 6 nov), consultada el 5 de noviembre por la tarde:

- Cloud Firestore: 8 de 10 solicitudes verificadas (80 %); 0 de clientes desactualizados; 2 de origen desconocido (20 %). Estado: Supervisión.
- Authentication (vista preliminar): 75 % verificadas, 25 % no verificadas. Estado: Supervisión.

Esas 10 solicitudes corresponden en su mayoría a la prueba de producción del mismo día; no representan tráfico real. Falta: al menos cuatro semanas de observación con usuarios reales, revisar que el porcentaje de «origen desconocido» provenga de bots o pruebas y no de navegadores legítimos (por ejemplo, bloqueadores de reCAPTCHA), y comparar el consumo mensual de evaluaciones con el límite gratuito de reCAPTCHA. Fecha sugerida para volver a revisar: 7 de diciembre de 2026. No se debe generar tráfico artificial para acelerar la decisión.

### Clientes de la clave API web de Firebase

Inventario comprobado:

- Único cliente que la usa: la App Memoria del website (`data/apps/memoria-data.ts`, Next.js en `www.stormstudios.com.mx`). Ningún juego de `public/apps` ni `public/tools` usa Firebase; sus conexiones se limitan a los dominios de audio.
- Los APK publicados de Memoria (`memoria-codigo.apk` y `memory-code.apk` en R2) son idénticos byte por byte a las copias locales (MD5 igual al ETag de R2) y **no usan Firebase**: guardan las palabras en `localStorage` del WebView. Una restricción de la clave no los afecta.
- La clave no aparece en otros proyectos locales; el proyecto Android que sí usa Firebase (AppPesas) pertenece a otro proyecto de Firebase.
- El sitio envía `Referrer-Policy: strict-origin-when-cross-origin`, por lo que las solicitudes del navegador a las API de Google incluyen el origen `https://www.stormstudios.com.mx`; `stormstudios.com.mx` redirige con 308 a `www`.

Conclusión: una restricción por sitios web es viable sin separar claves por plataforma. Propuesta (requiere decisión del propietario; no aplicada):

1. Restricción de aplicación «Sitios web» con `https://www.stormstudios.com.mx/*`, `https://stormstudios.com.mx/*`, `https://app-memoria-storm.firebaseapp.com/*` y `http://localhost:3000/*` (desarrollo). Las previews de Vercel quedarían fuera, lo cual es aceptable porque App Check y Memoria ya están limitados a producción.
2. Conservar la lista actual de 24 API.
3. Persistencia del UID: la sesión anónima se guarda en IndexedDB del origen y se renueva contra `securetoken.googleapis.com` con la misma clave. Mientras el origen de producción esté permitido, la renovación conserva el UID y las palabras; un error en la lista sólo impediría renovar tokens temporalmente, sin borrar datos en Firestore.
4. Prueba tras aplicar: abrir Memoria en producción con una sesión existente, comprobar que conserva sus palabras, guardar un cambio y recargar. Reversión: volver la restricción de aplicación a «Ninguna» en Google Cloud Console → Credenciales (efecto en minutos).

### Fuente de `acordes-cantar` histórica: no recuperada

Búsqueda sin resultados de las cadenas exclusivas del bundle («Ninguna cualidad seleccionada cabe…», `capture-processor`) en: este repositorio y su historial completo, las unidades C:, D: y H: (Documentos, Escritorio, Descargas, `D:\claude_code`, `D:\Android Studio`), todos los repositorios de GitHub de la cuenta y las sesiones guardadas de Codex y Claude Code. El bundle no incluye source maps. El repositorio privado `acordes-ear-training` es la app Android de reconocimiento de acordes, no esta app web. Los commits de integración (10–11 de junio de 2026) se hicieron con la identidad `info@stormstudios.com.mx`, posiblemente desde otra máquina o una sesión de Cowork cuyo espacio ya no existe. No se reconstruye código ni se presenta como original. Mientras no aparezca la fuente, los cambios siguen el método de copia del bundle documentado en `docs/cloudflare-audio.md`.

### Aislamiento de juegos: evaluación, sin cambios

Estado actual: 31 archivos de juegos usan `localStorage`, 7 usan pantalla completa y varios piden micrófono mediante `allow="microphone"` en iframes del mismo origen, con el protocolo `storm:back` por `postMessage` restringido a `window.location.origin`.

Mover los juegos a `juegos.stormstudios.com.mx` (proyecto estático aparte en Vercel Hobby o Cloudflare Pages, ambos sin costo al volumen actual) limitaría el alcance de un fallo en un juego, pero implica:

- **Partidas y preferencias:** `localStorage` es por origen; los datos actuales no pasarían solos. Haría falta un puente de migración de una sola vez (la página del website lee las claves y las entrega por `postMessage` al origen nuevo, validando origen y ventana emisora) y conservar el origen antiguo durante la transición.
- **Micrófono y pantalla completa:** el permiso se pediría de nuevo para el origen nuevo; los iframes necesitan `allow="microphone; autoplay; fullscreen"` delegado al origen nuevo.
- **CSP, CORS y mensajes:** `frame-src` y `connect-src` del website deben admitir el origen nuevo; los buckets de audio deben agregar ese origen a CORS; `storm:back` debe validar `event.origin` y `event.source` en ambos lados.
- **Enlaces antiguos y reversión:** redirecciones 308 de `/apps/...` y `/tools/...`; la reversión consiste en apuntar los iframes de nuevo a las rutas actuales, que deben conservarse hasta cerrar la migración.

Un `sandbox` con `allow-scripts allow-same-origin` sobre contenido del mismo origen no aporta aislamiento. Recomendación: no migrar ahora; considerarlo cuando se renueve la arquitectura de juegos o si un juego empieza a manejar datos de usuarios.

### MFA y recuperación de cuentas

No es verificable desde las credenciales disponibles (el token de GitHub no tiene permiso para leer el estado de 2FA) y no se infiere de que una sesión funcione. Queda como comprobación manual del propietario, registrada en el KB privado.
