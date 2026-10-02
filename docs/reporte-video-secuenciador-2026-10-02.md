# Tutorial del secuenciador · reporte de ronda 2 · 2026-10-02

La ronda 2 captura el audio real de la página, incluidas todas las vistas previas. Piano permanece en el plan, la grabadora y el proyecto. La grabación final con Piano queda para Claude; aquí se hicieron ensayos y una grabación de prueba con un override de Synth únicamente en memoria.

Comandos exactos para Claude:

```sh
npm run tutorial -- content/tutoriales/secuenciador-es.json --clips .local-work/video-secuenciador-audio-es --out stills/es/tutorial-secuenciador/video
node scripts/sequencer/revisar-tutorial.mjs stills/es/tutorial-secuenciador/video
```

- **Captura:** AudioWorklet PCM estéreo a 48 kHz, instalado antes de cargar la app. Un tap recibe todas las conexiones a la salida audible del motor sin duplicarlas. Se descarta la reconstrucción por WAV de escucha. Los lotes llevan el índice de su primera muestra, sin padding de Opus ni demora de MediaRecorder. El módulo temporal usa /vendor/ y se elimina al cerrar.
- **Alineación:** getOutputTimestamp vincula las muestras con performance y las marcas del compositor CDP. Se recorta cada tramo por captureEpoch. Los anillos e insignias se programan desde el reloj de salida del sonido; se detectan en fotogramas H.264 para calibrar la pista real completa por clip. La reproducción 50–52 se desplaza como un solo tramo. Se detiene el montaje si no hay una alineación común de ±40 ms, falta una marca o se necesita un ajuste superior a 150 ms.
- **Mezcla medida:** voz **−16.00 LUFS**, notas aisladas del clip 12 **−19.00 LUFS**, escucha 20 **−19.01 LUFS**. Bajo narración, ducking de solo **3.5 dB**, ataque 40 ms y liberación 150 ms. Normalización musical en dos pasadas para que una vista previa corta después de silencio no quede baja. Mezcla AAC final de prueba: **−16.11 LUFS**, pico verdadero **−1.38 dBTP**, sin saturación.
- **Audio verificado:** 12–19, 25–27, 37–40, más escuchas 20, 21, 44 y 50: **19 clips por encima de −45 dBFS**, comprobados en la pista separada y, en el montaje completo, después del ducking. El ensayo con video detectó **27 marcas de vistas previas**, todas dentro de ±40 ms tras la calibración: rango **−33.3 a +33.3 ms**. Una prueba independiente de reloj con tono conocido midió 30.4 ms.
- **Escuchas en el MP4 de prueba:** desfases **5.8, 22.2, −14.1, −33.1 y 11.8 ms** en clips 18, 20, 21, 44 y 50. El clip 50 necesitó compensar **60.5 ms**; el 44, **36.1 ms**. La revisión final vuelve a medir el MP4 y falla si se excede ±40 ms.
- **Clip 30:** «Desde el compás» = **6**; tarjeta visible entre y=673 y 1049.5, partitura entre y=527.9 y 809.6. Se corrigió el selector para resaltar la tarjeta exacta y se mantuvo el panel de trabajo visible con una decoración sticky temporal, restaurada al terminar. Evidencia: work/clip-30-tarjeta.png.
- **Acciones ajustadas:** borrar, deshacer/rehacer, duración y silencio no producen notas por sí mismos. Se añadieron audiciones reales antes de borrar (15), después de recuperar (16 y 40), y al comenzar 26; → devuelve el cursor al pulso 4 antes de insertar el silencio. Se conserva C–D–E, el sexto compás vacío de Piano Roll y A4 → B4, octavo → cuarto. No hay sonidos añadidos artificialmente.
- **Prueba completa:** **511.933 s (8:31.933)**, voz **432.000 s**, 52 clips y 52 subtítulos en orden. H.264 1920×1080, 30 fps, yuv420p, AAC estéreo a 48 kHz, faststart. Reservas: 18 +5 s, 21 +2 s, 44 +18 s y 52 +1 s de fundido; ampliaciones y redondeo adicionales: +0.833 s en conjunto (18 usa 0.180 s adicionales). Se generaron MP4, SRT, timeline y hoja de contactos de prueba, sin sustituir los entregables v1 de la carpeta final.
- **Pruebas de código:** npm run test: **539 aprobadas**, 1 archivo omitido y 3 pendientes preexistentes. npm run lint y git diff --check: aprobados. No se modificaron components/sequencer, lib/sequencer ni código de Next.
- **Git:** rama conservada codex/video-tutorial-secuenciador. Cambios **sin commit**: git add rechazó crear .git/index.lock con Permission denied. No hubo push ni subida de binarios.

Evidencias locales (fuera de Git):

- .local-work/tutorial-ronda2-synth/work/rehearsal.json y revision-rehearsal.json: audio y sincronía de marcas en el ensayo corto con video.
- .local-work/tutorial-ronda2-grabacion-synth/tutorial-secuenciador-v2.mp4 (**40,230,911 bytes**), tutorial-secuenciador-v2.srt, timeline.json y hoja-contactos.png: grabación completa de prueba con sintetizador.
- .local-work/tutorial-ronda2-grabacion-synth/revision.json y niveles-ronda2.json: revisión del último montaje y mediciones de nivel.

Claude generará tutorial-secuenciador-v2.mp4 y tutorial-secuenciador-v2.srt en **stills/es/tutorial-secuenciador/video/** y actualizará timeline.json, hoja-contactos.png y revision.json allí. La duración indicada corresponde a la prueba; la grabación final puede variar ligeramente por redondeo y tiempos de las acciones. Documentación: docs/tutorial-secuenciador-grabacion.md.
