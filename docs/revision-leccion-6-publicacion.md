# Lección 6 preparada para publicación

Estado final: `construction`. Para publicar cuando Luis entregue los embeds,
cambiar `status` a `published` y añadir `videosByLocale` en
`data/course/lessons/07-leccion-6.ts`. No se agregaron IDs provisionales.

## Contenido y figuras

Los MDX de `content/course/{es,en}/07-leccion-6.mdx` son copias idénticas
(verificadas por SHA-256) de `D:/claude_code/maestro-virtual/lessons/leccion-6/`.
El frontmatter se carga y el MDX se renderiza sin errores. El slug inglés existente
es `07-lesson-6-harmonic-vocal-quartet`, bajo `/en/harmony-course/`.

Las diez figuras están en `public/images/curso/leccion-6/`. Las notas proceden del
storyboard ES de la rama del video; el snapshot y su commit quedan registrados en
`scripts/sequencer/leccion-6-figures.json`. Los ejemplos de separaciones muestran
solo la pareja correspondiente, y las tesituras muestran límites independientes,
sin presentar esos extremos como acordes simultáneos.

Para regenerar:

```powershell
$env:LESSON_6_SOURCE_DIR = 'D:/claude_code/maestro-virtual/lessons/leccion-6/graficos'
node scripts/sequencer/generar-figuras-leccion-6.mjs
```

Se copiaron allí los SVG y las fuentes de generación (script y snapshot).
Se usa el VexFlow 4.2.2 ya incluido en el repositorio para producir glifos vectoriales
autónomos, como L5, con Georgia, sus tres colores y ancho de 860 px. La altura de
700 px permite los cuatro pentagramas y sus líneas adicionales sin solapar etiquetas.
El generador comprueba las 92 posiciones de notas de ambas versiones, las tesituras,
las separaciones y los cruces, y decodifica cada SVG exportado antes de generar su PNG.

## Flujo de publicación

Se conserva el caso especial de L6 en `LessonLayout`: es necesario para ofrecer
la subida SATB durante la construcción. Con `published`, esa rama deja de ejecutarse
y aparece exactamente un formulario en el flujo normal, después del texto, igual
que L4. Publicar no exige otro cambio en el layout; se puede retirar el caso especial
cuando ya no se necesite admitir subidas en construcción.

## Verificación

Con `published` temporal, en el servidor de desarrollo se verificaron ES y EN:
HTTP 200, cinco imágenes cargadas del idioma correspondiente, tres tablas (incluida
la de tesituras), un formulario, cero errores de JavaScript y respuesta 100/100 al
MIDI correcto. Se revisó también a 390 px de ancho. Se restauró `construction` antes
del build y del commit.

Se probaron preferencias de color `light` y `dark`. El sitio actual fija el fondo
oscuro del curso con `--ss-bg`; ambas preferencias conservan la presentación de L5.
No existe un selector de tema claro para esta página.

Capturas revisadas y conservadas en `docs/reviews/leccion-6-publicacion/`:

- `published-{es,en}-{dark,light}-full.png`: páginas completas.
- `published-{es,en}-mobile.png`: páginas móviles.
- `published-es-dark-tesituras.png`, `published-en-light-tesituras.png`: notación.
- `published-es-dark-ranges-table.png`, `published-en-light-ranges-table.png`: tablas.
- `published-es-dark-teacher.png`, `published-en-light-teacher.png`: análisis MIDI.
- `review.json`: comprobaciones de las cuatro vistas de escritorio.

Además se revisaron individualmente los diez PNG exportados en
`.local-work/leccion-6/figures/{tesituras,separaciones,estados,posicion-melodica,disposicion}-{es,en}.png`
y capturas por figura en `.local-work/leccion-6/pages/`.

Validación final con `construction`:

- `npm run lint`: pasa.
- `npx tsc --noEmit`: pasa.
- `npm test`: 575 pasan; tres pendientes existentes.
- `npm run build`: pasa, 171 páginas generadas.
- `npx playwright test e2e/lesson-6.spec.ts e2e/lesson-4.spec.ts e2e/smoke.spec.ts`:
  11 pasan, incluidas subidas SATB correctas e incorrectas en ES y EN.

## Duda del texto (sin modificaciones)

En «Separación entre voces y cruces» / «Voice Separation and Voice Crossing»,
confirmar la explicación acústica sobre la separación del bajo, los armónicos
y la robustez del acorde. La relación causal se presenta de forma general;
conviene confirmar si Luis quiere mantenerla como explicación pedagógica del método.
No se detectaron errores de sintaxis MDX ni discrepancias entre las figuras y el texto.
