# Revisión editorial y pedagógica — Lección 4

Estado al 10 de septiembre de 2026: **en construcción**. Esta ficha prepara la revisión de Luis; no constituye aprobación didáctica ni habilita la lección.

## Alcance confirmado

- Configuración: `data/course/lessons/05-leccion-4.ts` conserva `status: "construction"`.
- Tema previsto: tríadas mayor, menor, disminuida y aumentada; estado fundamental y primera inversión.
- Ejercicio previsto: coral SATB de 4 a 8 acordes, en Do, Sol, Fa o Re, con primera inversión y cadencia auténtica perfecta.
- La ruta `POST /api/maestro-virtual/check` responde `501` para esta lección. El motor SATB no está publicado; no debe presentarse como retroalimentación disponible.

## Decisiones que requiere Luis

1. Confirmar la terminología: si «acordes de 5a» será el título público, explicar en la introducción que se refiere a tríadas; en inglés, revisar si «fifth chords» expresa la misma convención para el público objetivo.
2. Validar que la cadencia exigida (V–I con fundamental en soprano y bajo) corresponda al ejercicio y a las tonalidades elegidas antes de redactar ejemplos.
3. Revisar las reglas de duplicación: el borrador dice evitar duplicar la tercera en primera inversión y no duplicar la sensible. Debe especificar los casos musicales que se enseñarán y evitar presentarlo como regla sin excepciones.
4. Aprobar ejemplos escritos y sus soluciones antes de añadir video, MIDI o feedback automatizado.
5. Decidir qué reglas de la lista extensa se comprobarán realmente cuando exista el validador. La configuración actual del validador enumera cuatro, mientras que el borrador pedagógico declara trece; hoy ninguna se ejecuta porque SATB devuelve 501.

## Criterio de salida

Luis aprueba temario, ejemplos, terminología y alcance del validador. Después se implementan pruebas con MIDI representativos y se cambia el estado sólo junto con la publicación de esos materiales.
