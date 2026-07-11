# Plan maestro: evolución visual de Storm Studios

> Documento autónomo para ejecutar una vuelta visual ambiciosa del sitio. No autoriza publicar ni modificar producción sin la aprobación explícita de Luis.

## 1. Contexto

- **Proyecto:** Storm Studios.
- **Repositorio local:** `C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios`.
- **Producción:** [www.stormstudios.com.mx](https://www.stormstudios.com.mx).
- **Stack:** Next.js/React desplegado en Vercel.
- **Estado técnico conocido:** auditoría, reparaciones, pruebas, build, APIs, formulario, seguridad y despliegue ya fueron validados.
- **Flujo de publicación:** probar completamente en local; con autorización explícita, hacer push directo a `main`. No abrir un PR salvo que Luis lo pida.

## 2. Objetivo

Elevar el sitio de correcto y profesional a una experiencia visual distintiva, contemporánea y memorable para un estudio musical, sin perder:

- Contenido, rutas y SEO existentes.
- Accesibilidad y rendimiento.
- Funciones actuales, incluidas las APIs y el formulario de contacto.
- Mantenibilidad y coherencia del código.

El resultado debe comunicar música, creatividad, oficio y tecnología con una sensación humana, sofisticada y accesible. Debe sentirse propio de Storm Studios, no como una plantilla tecnológica genérica.

## 3. Límites creativos

Evitar clichés decorativos de producción musical: ondas de audio sin función, ecualizadores genéricos, neón por defecto, interfaces falsas de consola y efectos que compitan con el contenido.

El movimiento y los recursos gráficos deben aportar jerarquía, orientación o respuesta a una interacción; no ser adorno.

## 4. Fase 0: proteger el estado actual

Antes de editar:

1. Leer `README.md`, `package.json`, la estructura de rutas, los componentes, estilos y configuración relevantes.
2. Revisar si existe un archivo `AGENTS.md` y obedecerlo.
3. Ejecutar `git status` y preservar cualquier cambio ajeno.
4. Registrar el commit actual como punto de vuelta.
5. Ejecutar la línea base de calidad disponible: lint, TypeScript, tests y build de producción.
6. Tomar capturas locales de las páginas principales en escritorio y móvil.

**Entregable:** reporte breve de línea base. No realizar cambios funcionales durante esta fase.

## 5. Fase 1: diagnóstico visual

Revisar todas las rutas públicas y documentar:

- Jerarquía visual y claridad de la propuesta de valor.
- Tipografía, paleta, contraste y espaciado.
- Composición, calidad de imágenes y tratamiento editorial.
- Navegación, botones, llamadas a la acción y estados interactivos.
- Consistencia entre páginas.
- Experiencia móvil.
- Movimiento y transiciones.
- Elementos que hacen que el sitio parezca plantilla.

Clasificar cada hallazgo como **conservar**, **refinar**, **rediseñar**, **eliminar** o **investigar**.

**Entregable:** diagnóstico priorizado con referencias concretas o capturas, y una lista explícita de los elementos que no deben cambiar.

## 6. Fase 2: direcciones artísticas

Preparar tres propuestas sin implementarlas todavía. Cada una debe incluir concepto, referencias, paleta con valores exactos, pareja tipográfica, tratamiento fotográfico, iconografía, composición, ejemplo de hero, ejemplo de sección interior, ejemplo móvil, ventajas, riesgos e impacto estimado en rendimiento.

### A. Estudio editorial

- Fotografía protagonista y tipografía expresiva.
- Composición de revista cultural, espacios amplios y ritmo sereno.
- Sensación artística, sobria y atemporal.

### B. Precisión sonora

- Geometría limpia y detalles sutiles inspirados en señal, espectro o notación.
- Contraste controlado y acabado cinematográfico.
- Sensación técnica, premium y contemporánea.

### C. Energía experimental

- Capas, recortes y tipografía de gran escala.
- Movimiento más presente, pero sin perjudicar legibilidad ni rendimiento.
- Sensación joven, musical y muy reconocible.

**Punto de aprobación obligatorio:** Luis debe elegir una dirección —o una combinación concreta— antes de implementar el rediseño.

## 7. Fase 3: prototipo de homepage

Implementar solo una versión local de la página de inicio con la dirección aprobada. Debe cubrir:

1. Navegación.
2. Hero y propuesta de valor.
3. Servicios o áreas principales.
4. Pruebas de experiencia o credibilidad.
5. Proyectos, contenido o recursos destacados.
6. Llamada a la acción.
7. Footer.

Requisitos:

- Usar contenido real, no texto de relleno.
- Diseñar desktop y móvil desde el principio.
- Optimizar imágenes y evitar dependencias pesadas sin justificación.
- Respetar `prefers-reduced-motion`.
- Mantener foco visible, navegación por teclado y contraste WCAG AA.
- No romper rutas, SEO ni APIs.

**Entregable:** homepage local navegable, capturas comparativas antes/después y resumen de las decisiones tomadas.

**Punto de aprobación obligatorio:** no extender el sistema a todas las páginas sin validar visualmente el homepage con Luis.

## 8. Fase 4: sistema visual reutilizable

Convertir la dirección aprobada en un sistema mantenible:

- Colores semánticos.
- Escala tipográfica y de espaciado.
- Grid, anchos máximos y breakpoints.
- Bordes, radios y sombras.
- Botones, enlaces, tarjetas, etiquetas y formularios.
- Navegación, avisos, modales y estados de éxito/error/carga.
- Estados `hover`, `focus` y `active`.
- Duraciones y curvas de animación.

Centralizar los tokens y evitar valores arbitrarios repetidos o componentes duplicados.

**Entregable:** guía visual breve dentro del repositorio y componentes base coherentes.

## 9. Fase 5: extensión por familias de páginas

Aplicar el sistema por grupos, validando cada grupo antes de avanzar:

1. Layout global, navegación y footer.
2. Homepage.
3. Páginas de servicios.
4. Páginas editoriales o educativas.
5. Herramientas interactivas, incluido Maestro Virtual.
6. Acordes y contenido musical.
7. Contacto.
8. Estados vacíos, errores y páginas especiales.

En cada familia:

- Identificar la plantilla común y crear componentes reutilizables.
- Validar textos cortos y largos.
- Revisar escritorio, tablet y móvil.
- Verificar teclado, foco y estados de interacción.
- Comparar consistencia contra el homepage aprobado.

## 10. Fase 6: movimiento y detalle

Permitido:

- Entradas suaves y cortas.
- Microinteracciones claras en botones y tarjetas.
- Transiciones entre elementos relacionados.
- Motivos gráficos sutiles asociados con música.

Evitar:

- Scroll secuestrado o parallax agresivo.
- Animaciones largas o permanentes.
- Contenido oculto por efectos.
- Movimiento que afecte rendimiento o accesibilidad.

## 11. Fase 7: validación local completa

Antes de publicar, ejecutar y registrar:

### Técnica

- Lint sin errores.
- TypeScript sin errores.
- Todos los tests aprobados.
- Build de producción aprobado.
- Sin regresiones en APIs.
- Sin secretos incluidos en el repositorio.
- Sin errores relevantes de consola.
- Sin enlaces internos rotos.
- Rutas principales y sitemap válidos.

### Visual

Validar como mínimo en 320 px, 375 px, 768 px, 1024 px y 1440 px. Revisar desbordamientos, saltos de layout, textos cortados, menú móvil, hero, imágenes, formularios, estados de foco y contenido muy largo.

### Funcional

- Navegación completa.
- Formulario de contacto y sus mensajes de éxito/error.
- Maestro Virtual, MIDI y controles relacionados.
- Elementos interactivos.
- Uso exclusivo con teclado.
- Preferencia de reducción de movimiento.

**Entregable:** matriz de pruebas con resultado y evidencia visual.

## 12. Fase 8: control de calidad final

Responder, con evidencia, antes de solicitar publicación:

- ¿La marca es más reconocible?
- ¿Se entiende más rápido qué ofrece Storm Studios?
- ¿Las llamadas a la acción son más claras?
- ¿La experiencia móvil mejoró?
- ¿La accesibilidad y el rendimiento se mantienen o mejoran?
- ¿El diseño puede mantenerse sin duplicar código?
- ¿Quedan patrones inconsistentes o regresiones?

Corregir cualquier respuesta negativa importante antes de publicar.

## 13. Publicación

Solo tras aprobación explícita de Luis:

1. Confirmar `git status` y revisar el diff completo.
2. Incluir únicamente archivos relacionados con el rediseño.
3. Crear un commit descriptivo.
4. Hacer push directo a `main`.
5. Esperar el despliegue de producción en Vercel.
6. Verificar el dominio real: navegación, consola, APIs y formulario.
7. Revisar logs de producción.
8. Entregar commit, estado del despliegue y resumen de pruebas.

## 14. Criterios de terminado

El trabajo está terminado únicamente cuando:

- La dirección visual fue aprobada.
- Todas las páginas relevantes usan un sistema coherente.
- No hay regresiones funcionales.
- Las pruebas locales y el build pasan.
- La experiencia móvil y la accesibilidad básica fueron verificadas.
- Producción responde correctamente y el formulario entrega correos.
- El repositorio termina limpio.
- Luis recibe un resumen claro de cambios y validaciones.

## 15. Restricciones para la IA ejecutora

- No publicar sin autorización explícita.
- No cambiar textos importantes sin señalarlo.
- No sustituir la identidad por tendencias genéricas.
- No eliminar funciones para simplificar el diseño.
- No imprimir ni versionar secretos.
- No añadir dependencias sin una necesidad justificada.
- No reescribir el proyecto completo si puede evolucionarse de manera incremental.
- No sacrificar accesibilidad o rendimiento por estética.
- Comunicar avances de forma clara para una persona no técnica.

