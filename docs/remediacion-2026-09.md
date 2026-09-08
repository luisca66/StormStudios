# Remediación del website — septiembre de 2026

Revisión principal completada el 8 de septiembre de 2026; publicación autorizada por Luis. Este registro distingue correcciones implementadas de operaciones externas y trabajo editorial que todavía requieren intervención. Consultar GitHub y Vercel para el resultado del despliegue del commit que contiene este documento.

El criterio de producto es conservar y transmitir conocimiento musical. La página de clases informa la oferta real, sin convertir el website en un embudo comercial ni publicar tarifas. El catálogo para agentes incluye exclusivamente información pública.

## Correcciones implementadas

| Auditoría | Resultado |
|---|---|
| P1-01 Rastreo | `robots.txt` permite recursos de Next; las rutas antiguas pueden recibir sus respuestas finales. |
| P1-02 Privacidad | Aviso bilingüe con responsable, domicilio confirmado, contacto, usos del formulario, MIDI, micrófono, progreso, Firebase y proveedores. Enlace junto al formulario. No se presenta como certificación legal. |
| P1-03 Disponibilidad | Conteo de unidades disponibles derivado del registro; retiradas promesas de 60 lecciones ya disponibles y de evaluación generativa. Página explicativa del Maestro Virtual. |
| P1-04 Contraste | Colores compartidos y tarjetas corregidos; formularios y navegación de lecciones distinguen superficies claras y oscuras. Se respeta movimiento reducido. |
| P1-05 Dependencias | Actualizados los lockfiles afectados; corregida la fijación de PostCSS. Auditoría de raíz y 13 apps. |
| P1-06 Audio | Errores con `no-store`, HEAD real, rangos y validación condicional conservados, timeout de origen; éxitos revalidables en lugar de caché inmutable anual. |
| P2-07 Inicio móvil | Encabezado compacto, acción principal visible en la primera pantalla; avances secundarios desplegables al final. |
| P2-08 Fichas | Fondo y tipografía coherentes, práctica diferenciada del juego, orientación de uso, permisos y tarjetas sociales 1200×630. |
| P2-09 Itinerarios | Tres entradas: comenzar desde fundamentos, entrenar el oído y profundizar con guías. |
| P2-10 SATB | Eliminada la excepción contradictoria sobre duplicar la sensible y alineado el título del borrador. Lección 4 sigue en construcción y sin indexación; no se habilitó un nuevo validador. |
| P2-11 Clases | Entrenamiento auditivo como oferta principal; composición, análisis, contrapunto, orquestación, audio/IA, film scoring e instrumentos. Sesiones de una a tres horas, contacto sin tarifas. |
| P2-12 Formulario | Restricciones del cliente alineadas, autocompletado, estado accesible de éxito, clave opaca e idempotente para reintentos de la misma solicitud en Resend. |
| P2-15 QA | AP Multi incluido en pruebas; comandos para instalar, compilar y comparar las 13 apps; workflow para raíz y apps. |
| P2-16 Accesibilidad | Retiradas restricciones de zoom localizadas; foco visible; índice móvil oculto fuera de uso, Escape y devolución de foco. Las pruebas automáticas no certifican todos los estados de todos los juegos. |
| P2-17 Indexación | Raw HTML de apps/herramientas con `noindex`; fichas públicas indexables; borradores fuera del sitemap. |
| P2-18 Guías | Cuatro ejercicios originales con notas, audio sintetizado localmente, explicación y error habitual. Revisión de acentos en su catálogo; etiqueta técnica «Recurso SEO» sustituida por «Guía de estudio». |
| P3-19 Fechas | Fechas editoriales explícitas; no se publica el mtime del checkout ni una fecha ficticia común. |
| P3-20 URLs antiguas | Retiradas redirecciones que se interponían a las respuestas 410 de archivos WordPress. Se conservan redirecciones con equivalente útil. |
| P3-21 Imágenes sociales | Imágenes propias de cada app e idioma generadas a 1200×630; ya no se declara un icono cuadrado como tarjeta horizontal. |
| P3-22 Progreso | Validación de JSON, recuperación ante datos dañados y respaldo/importación que suma completados sin borrar los existentes. |
| P3-23 Mantenimiento | README operativo, guía de audio y comprobación de correspondencia entre fuentes y archivos públicos. |
| Descubrimiento por agentes | Person/organización vinculadas, SoftwareApplication y BreadcrumbList en fichas; `/catalog.json` con enlaces localizados, estado y alcance del curso. No expone la KB ni datos de alumnos. |

## Verificación

- `npm run check`: lint, 196 pruebas aprobadas y build de 140 páginas. Se conservan tres TODO previos; no equivalen a funcionalidad SATB terminada.
- `npm run apps:check`: compilan las 13 apps y sus archivos generados coinciden con los servidos desde `public/apps`.
- Auditoría npm: cero vulnerabilidades reportadas en los 14 proyectos al cierre de la actualización. Reconsultar antes de futuras publicaciones.
- Comprobación HTTP de sitemap y rutas adicionales; 404 para URL inexistente y 410 para taxonomía WordPress eliminada son resultados esperados.
- Navegador Edge, anchos 390 y 1440: 24 vistas de páginas principales y muestras de lección/guía, sin violaciones en las reglas WCAG ejecutadas, errores JavaScript ni desbordamientos. Se usó movimiento reducido para evaluar el estado estable, no fotogramas intermedios de animación.
- 82 URLs de sitemap verificadas; 93 respuestas HTTP incluyendo rutas adicionales. Nueve actividades abrieron sin errores JavaScript; Aerostato y Vocal Arcade respondieron a micrófono denegado con instrucciones y opción de recuperación.
- Interacciones probadas: progreso dañado, completar lección, exportar/importar y rechazar importación inválida; índice móvil y Escape; audio de ejemplo; formulario con respuesta interceptada, sin enviar correo; tarjetas PNG bilingües; cabeceras `noindex`.
- En 390×844, el botón principal de portada termina a 443 píxeles del borde superior, dentro de la primera pantalla.
- `.gitattributes` normaliza fuentes de código para evitar diferencias de bundles entre Windows y Linux. Las 13 apps se regeneraron tras normalizar los finales de línea de sus fuentes versionadas.

## Pendientes externos y límites reales

1. **Cloudflare, P2-14:** conectar dominios de producción, validar CORS/caché y migrar referencias directas. Luis decidió realizarlo acompañado; procedimiento en [cloudflare-audio.md](cloudflare-audio.md). El proxy configurable es preparación, no una migración terminada.
2. **Publicación:** comprobar el workflow de GitHub, el despliegue asociado en Vercel y las páginas públicas después de publicar el lote.
3. **Servicios en producción, P3-24:** la consulta autenticada a Vercel identificó el proyecto y no devolvió errores en el rango consultado. Esto no demuestra ausencia histórica de incidentes. Verificar en consola el WAF y las reglas efectivamente desplegadas de Firebase; el archivo local no basta. La entrega real por Resend requiere un envío autorizado y confirmación de recepción; las pruebas realizadas usan mocks/intercepción.
4. **Pedagogía SATB, P2-10:** antes de publicar la lección 4, Luis debe revisar el temario, los ejemplos y las reglas de duplicación/conducción. Completar materiales y pruebas del validador futuro. La corrección del borrador no constituye aprobación del curso futuro.
5. **Accesibilidad de juegos, P2-16:** completar recorridos extensos de juego, dispositivos reales, lectores de pantalla y pruebas con micrófono físico. Los cambios y pruebas de este lote no garantizan accesibilidad universal de juegos 3D.
6. **Contenido, P2-18:** las nuevas prácticas mejoran las cuatro guías. Una revisión especializada de toda afirmación sobre neurociencia, eficacia y oído absoluto sigue siendo trabajo editorial; no se inventaron estudios o resultados de alumnos.

## Decisiones de alcance

- **P2-13, métricas:** se mantiene la analítica existente y se mejora el progreso local. No se añaden eventos comerciales ni una base de datos de comportamiento. El propósito de legado cambia la prioridad frente al enfoque comercial de la auditoría inicial. Si se necesita investigación de aprendizaje, definir antes preguntas, datos mínimos y conservación.
- No se añade MCP, WebMCP, pagos ni registro de usuarios como condición para que agentes encuentren el sitio. El catálogo y el HTML ofrecen una base verificable; ninguna de estas medidas garantiza recomendaciones de terceros.
- No se modifican planes ni se generan cargos. La KB privada permanece fuera del website.

## Próxima sesión

Continuar por Cloudflare: confirmar nombre del bucket asociado a `pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev` y presencia de la zona `stormstudios.com.mx`. Después conectar el primer dominio y verificar un objeto antes de cambiar código. Para publicar el lote actual, revisar primero el diff completo y conservar los archivos ajenos a esta intervención.
