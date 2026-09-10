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

1. **Cloudflare, P2-14:** el 9 de septiembre Terra activó `samples`, `musica` y `sfx`; se migraron las referencias de esos tres buckets y se validaron CORS, descargas parciales y decodificación Web Audio. Queda el cuarto bucket de APK y voces iniciales de Elefantito; conserva su URL funcional. Detalles y política de caché en [cloudflare-audio.md](cloudflare-audio.md).
2. **Publicación:** el lote original `4d49274` se publicó el 8 de septiembre, con GitHub y Vercel correctos y revisión pública completada. La migración de audio `bcf5b38` se publicó el 9 de septiembre: 13 audios decodificados desde producción y nueve actividades abiertas sin errores JavaScript. El control npm posterior detectó GHSA-82fw-gwwq-j7x9 en las herramientas de pruebas; se actualizó Vitest a 4.1.11 en los cuatro proyectos afectados, con pruebas aprobadas y auditoría npm sin vulnerabilidades reportadas.
3. **Servicios en producción, P3-24:** la consulta autenticada a Vercel identificó el proyecto y no devolvió errores en el rango consultado. Esto no demuestra ausencia histórica de incidentes. La comprobación posterior en consola verificó el WAF y las reglas desplegadas de Firebase; el archivo local no bastó. La entrega real por Resend se confirmó con un único envío autorizado y recepción confirmada por Luis; las pruebas anteriores usaban mocks/intercepción.
4. **Pedagogía SATB, P2-10:** antes de publicar la lección 4, Luis debe revisar el temario, los ejemplos y las reglas de duplicación/conducción. Completar materiales y pruebas del validador futuro. La corrección del borrador no constituye aprobación del curso futuro.
5. **Accesibilidad de juegos, P2-16:** completar recorridos extensos de juego, dispositivos reales, lectores de pantalla y pruebas con micrófono físico. Los cambios y pruebas de este lote no garantizan accesibilidad universal de juegos 3D.
6. **Contenido, P2-18:** las nuevas prácticas mejoran las cuatro guías. Una revisión especializada de toda afirmación sobre neurociencia, eficacia y oído absoluto sigue siendo trabajo editorial; no se inventaron estudios o resultados de alumnos.

## Decisiones de alcance

- **P2-13, métricas:** se mantiene la analítica existente y se mejora el progreso local. No se añaden eventos comerciales ni una base de datos de comportamiento. El propósito de legado cambia la prioridad frente al enfoque comercial de la auditoría inicial. Si se necesita investigación de aprendizaje, definir antes preguntas, datos mínimos y conservación.
- No se añade MCP, WebMCP, pagos ni registro de usuarios como condición para que agentes encuentren el sitio. El catálogo y el HTML ofrecen una base verificable; ninguna de estas medidas garantiza recomendaciones de terceros.
- No se modifican planes ni se generan cargos. La KB privada permanece fuera del website.

## Próxima sesión

Completar el dominio del cuarto bucket cuando esté disponible en Cloudflare. Después priorizar la revisión pedagógica de la lección 4 y las verificaciones de servicios señaladas arriba. No desactivar las URLs anteriores mientras existan apps móviles o clientes externos que dependan de ellas.

## Seguimiento de auditoría — 10 de septiembre de 2026

### Evidencia obtenida

- Producción: `https://www.stormstudios.com.mx/api/contact` y `https://www.stormstudios.com.mx/api/maestro-virtual/check` respondieron desde Vercel a solicitudes deliberadamente inválidas, sin cuerpo sensible ni entrega de correo. Contacto devolvió `400` y `Cache-Control: no-store`; Maestro Virtual devolvió `400`. El dominio sin `www` redirige al canónico.
- Firebase desplegado: en Firebase Console, Firestore muestra reglas activas que coinciden con `firestore.rules`: `mnemonic_words/{uid}` y `mnemonic_words_en/{uid}` permiten operaciones sólo si `request.auth.uid == uid`; el comodín final deniega toda otra ruta. La app crea y usa el documento con el UID de Firebase Auth anónimo. No se hicieron escrituras ni se crearon usuarios de prueba.
- Protección desplegada: Vercel Firewall tiene activa la regla `Protect public form APIs`: por dirección IP, ventana fija de 600 segundos, máximo 10 POST combinados a `/api/contact` y `/api/maestro-virtual/check`, con respuesta `403`. También están activas las mitigaciones DDoS del sistema. El rate limit local en código (5/10 min para contacto; 10/10 min para Maestro) sigue siendo defensa adicional por proceso y no sustituye ese límite distribuido. Bot Protection está desactivado y el ruleset OWASP administrado no está habilitado (aparece como opción Enterprise); no se cambiaron el plan ni esas configuraciones.
- Resend desplegado: Vercel muestra `RESEND_API_KEY` y `RESEND_EMAIL_DOMAIN` como secretos configurados para todos los entornos, incluido Production, sin revelar sus valores. Se realizó un único envío autorizado desde el formulario a `info@stormstudios.com.mx`; la interfaz confirmó «Mensaje enviado» y Luis confirmó su recepción con una captura del correo. No se hicieron reintentos.
- Pruebas locales: `npm test -- --run app/api/contact/route.test.ts app/api/maestro-virtual/check/route.test.ts` aprobó 8 pruebas. Después se añadió `no-store` a las respuestas de error de Maestro Virtual y su prueba focalizada aprobó 4 pruebas. La corrección se publicó en `a4ced0b` y se verificó en producción mediante una solicitud inválida: `400` con `Cache-Control: no-store` desde Vercel.
- La lección 4 permanece en construcción; su ficha de revisión está en [revision-leccion-4-2026-09.md](revision-leccion-4-2026-09.md).

### Pendientes que requieren consola o autorización

1. **Dispositivos reales:** las páginas y sus iframes publicados declaran `allow="autoplay; microphone"`, y el código contempla permiso denegado/recuperación; falta comprobar concedido, denegado y recuperación en un teléfono y un escritorio reales, además de lector de pantalla y teclado.

### Revisión editorial propuesta

- `content/pages/es/mi-metodo.mdx` presenta «principios de neurociencia» y optimización de foco/memoria sin fuente ni alcance. Propuesta: describirlo como marco pedagógico propio y retirar la inferencia de eficacia hasta citar evidencia específica.
- `content/pages/es/quien-soy.mdx` atribuye al entrenamiento auditivo moldear el cerebro y mejorar la percepción de manera tangible. Propuesta: mantenerlo como experiencia personal o matizarlo a «la práctica puede mejorar tareas entrenadas; los resultados varían».
- `components/apps/elefantito-nextjs/{es,en}.json` contiene afirmaciones fuertes sobre corteza prefrontal, transferencia cognitiva y beneficios bidireccionales de cálculo mental y música. Requiere revisión especializada y fuentes primarias antes de publicarse como explicación científica; no se modificaron APK ni voces iniciales de Elefantito.
- Para oído absoluto, evitar prometer adquisición o resultados de alumnos. Estudios con adultos muestran aprendizaje posible para algunas personas, con resultados heterogéneos y dependientes del entrenamiento, no una garantía individual: [Van Hedger et al., 2019](https://pubmed.ncbi.nlm.nih.gov/31550277/) y [Wong et al., 2020](https://pubmed.ncbi.nlm.nih.gov/31686378/). Los estudios de neuroimagen describen asociaciones, no prueban que una actividad educativa concreta produzca esos cambios: [Loui et al., 2013](https://pubmed.ncbi.nlm.nih.gov/23302811/).
