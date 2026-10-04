# Audición al arrastrar: diagnóstico de CI (2026-10-04)

Base: `main` en `fc0f097`. Las ejecuciones 37075651518 y 37228224856
fallaban en la primera comprobación de audio de `e2e/sequencer.spec.ts`,
antes de mover el mouse. Se reprodujo con `next dev --port 3100` y con
`npm run build` + `next start`, `CI=true`, dos workers y un reintento.

La prueba tenía dos problemas de preparación:

- Llenaba el textarea del HTML del servidor antes de la hidratación. React
  podía conservar el ejemplo inicial de ocho notas, aunque se hubiera escrito
  una sola C4. Ahora espera la API cliente y verifica una sola nota C4.
- `scrollIntoViewIfNeeded` consideraba visible el grupo SVG, pero el centro
  de su caja (incluye la altura completa de la fuente musical) quedaba bajo
  el transporte fijo. `document.elementFromPoint` identificó el botón
  «Ir al inicio» en las coordenadas del supuesto clic en la nota. Centrar
  explícitamente el pentagrama deja el punto de arrastre fuera del transporte.

Se mantienen los checks de fuentes Web Audio reales antes de soltar y se
amplían a dos alturas sucesivas en cada vista. El pentagrama muestra D4/E4
durante el gesto y confirma E4 al soltar; el Piano Roll confirma G4 al soltar.
Ambas vistas mantienen el modelo sin cambios mientras suena la audición.
Los ejemplos también esperan la hidratación antes de cambiar la selección.

No se encontró una regresión del motor de audición ni de la edición con
mouse. `1c078f1` distingue notas individuales de un acorde; la ruta de escritura
de una nota sigue llamando a preview al presionar y al cambiar altura.
`a6c4ba6` cambia la ubicación de «Nuevo proyecto», no el arrastre.
No se modifican ScoreView, PianoRoll, mouse-editing ni audio-engine.

## NoFallbackError

El mensaje se reproduce al pedir `/es/apps/no-existe` al servidor de
producción, independientemente del secuenciador. La prueba de humo confirma
HTTP 404, título 404 y la página completa «Página no encontrada»; el servidor
sigue atendiendo las pruebas siguientes. No es un 500 ni causa el fallo de audio.

La ruta usa `dynamicParams=false` para devolver el 404 prerenderizado cuando
el slug no está en `generateStaticParams`. Next.js filtra a consola una excepción
interna de ese flujo: [incidencia upstream #90537](https://github.com/vercel/next.js/issues/90537).
Se conserva esa configuración y la comprobación HTTP/UI del 404. No se ocultan
los logs ni se cambia el enrutamiento para evitar el mensaje.

## Validación local

- `npm run lint`, `npx tsc --noEmit` y `npm test`: 560 pruebas unitarias pasan.
- `npm run build`: build de producción correcto.
- `npx next dev --port 3100` + `npx playwright test e2e/sequencer.spec.ts --workers=2`.
- Con `CI=true`, `npx playwright test --workers=2`: 49 pasan, una prueba manual
  de muestras R2 omitida por diseño; incluye todos los e2e del secuenciador y el 404.
- El workflow remoto valida además Ubuntu, Node 24, instalación limpia,
  compilación/auditoría de apps y auditoría de dependencias.
