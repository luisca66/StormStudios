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
