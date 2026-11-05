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
