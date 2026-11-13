# Maestro Virtual de la lección 4

Implementación local del 1 de octubre de 2026, autorizada por Luis después de verificar la teoría en el HTML. La entrega es un MIDI completo: las 12 tónicas C, C#, D, Eb, E, F, F#, G, Ab, A, Bb y B, cada una con mayor natural, mayor armónica, menor natural, menor armónica y menor melódica ascendente y descendente. Son 72 series. El formulario no pregunta tónica ni variante.

## Formato de la entrega

El orden entre series es libre. Dentro de cada serie se conserva el recorrido por grados: I–II–III–IV–V–VI–VII–I′; la bajada melódica utiliza menor natural en orden I′–VII–VI–V–IV–III–II–I. La bajada admite omitir su tónica inicial, como continuación de una subida. Una tarea completa contiene de 564 a 576 acordes.

Cada acorde tiene tres notas simultáneas, en estado fundamental y posición cerrada, sin duplicaciones ni inversiones. Registro inicial libre; las fundamentales recorren una octava. Storm Sequencer: un solo pentagrama. Escribir la primera nota y mantener Ctrl presionado mientras se hace clic para añadir las otras notas simultáneas. Las grafías SP por nota permiten comprobar enarmonías. No se aplican tesituras ni reglas de enlace SATB.

## Reconocimiento y retroalimentación

El reconocimiento compara las notas con los 72 patrones del core e infiere el registro. Una alineación de grados permite reportar acordes omitidos o adicionales sin desplazar las series siguientes. Se enumeran primero las series faltantes, luego los errores de notas, octava, grafía o cantidad de notas y las series repetidas. Cada error identificado incluye tónica, variante, grado y posición de acorde, con la nota esperada y la recibida.

Las series cuya información permite varias interpretaciones se reportan como ambiguas y no se cuentan como confirmadas. Las series demasiado dañadas se reportan como no reconocidas. El sistema no puede asegurar la intención del alumno cuando las notas distintivas faltan o son erróneas. Se limita el procesamiento a 1200 posiciones de acorde; el endpoint conserva sus límites de tamaño, frecuencia y 100 reportes visibles, colocando primero las faltantes.

## Código

- `lib/maestro-virtual/music-theory-core.ts`: armoniza los grados i, i+2 e i+4; Do mayor armónica III = Mi–Sol–Si.
- `lib/maestro-virtual/triads-validator.ts`: metadatos, patrones y validador individual para desarrollo.
- `lib/maestro-virtual/complete-triads-validator.ts`: reconocimiento y revisión del archivo completo.
- `data/course/lessons/lesson-configs.ts`: `05-leccion-4` usa `triads`; SATB posterior sigue sin evaluación disponible.
- `app/api/maestro-virtual/check/route.ts`: recibe `midi`, `lessonId` y `locale`; no requiere `root` ni `variant`.
- `components/course/ExerciseUpload.tsx` y contenido ES/EN: instrucciones de tarea completa y formulario sin selectores.

Workspace de desarrollo: `D:\claude_code\maestro-virtual`. Su tester HTML consulta las 72 combinaciones del core compilado. Las copias del motor y validador completo están sincronizadas con `engine/` y `website-snapshot/`.

## Comprobaciones y ejemplos

523 pruebas aprobadas y 3 pendientes preexistentes. TypeScript, ESLint de archivos cambiados y compilación de producción aprobados. Las pruebas cubren orden invertido, faltantes, repetidas, errores de altura y grafía, acordes omitidos, notas omitidas, registro, ambigüedad y bajadas de siete acordes. Las pruebas del endpoint cargan MIDI completo de tres pistas; Luis también comprobó tareas correctas e incorrectas en un solo pentagrama. El validador agrupa las notas por tick, independientemente de si están en una o varias pistas.

En `D:\claude_code\maestro-virtual\test-midis`:

- `Leccion_4_completa_correcta.mid`: las 72 series, 100/100.
- `Leccion_4_completa_desordenada.mid`: orden invertido y bajadas de siete acordes, 100/100.
- `Leccion_4_completa_faltantes_errores.mid`: falta B menor melódica descendente; Sol# incorrecto en el III de C mayor armónica.

Se comprobó el formulario real con los tres archivos, y la tarea completa en inglés. Los ejemplos antiguos de una sola serie se conservan para desarrollo y ahora reportan las demás series faltantes en el website.

Luis autorizó publicar esta integración en español e inglés el 1 de octubre de 2026. Se prepara en una rama dedicada y se publica desde main mediante la integración Git de Vercel.
