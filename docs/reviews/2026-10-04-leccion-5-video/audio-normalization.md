# Revisión de sonoridad — Lección 5

Se aplicó la normalización solicitada de `musicFile`: primera medición después del recorte/fades, segunda pasada lineal a −19 LUFS / −4.5 dBTP con los cuatro parámetros medidos y LRA objetivo al menos igual a la medida. Se verifica que FFmpeg confirme `linear`. Si la ganancia necesaria supera el pico permitido, se aplica únicamente ganancia constante limitada por pico; cada decisión queda en `music.normalization` del timeline.

**El objetivo final de −2 a −3.5 LU no se alcanza en todos los fragmentos.** Ars nova, clásico y expresionismo activan la ganancia limitada por pico en ambos idiomas. Además, la normalización final de la mezcla no puede elevarla a −16 LUFS manteniendo −1.5 dBTP solo con ganancia: su pico de entrada ya es −1.5 dBTP. FFmpeg cae en modo dinámico y modifica la relación entre segmentos. No se añadió compresión a los fragmentos ni se modificó la normalización de voz o mezcla final.

Medición directamente del AAC de cada MP4 con `ffmpeg -ss <inicio> -i <mp4> -t <duración> -vn -af ebur128=peak=true -f null -`. Voz: desde el inicio del primer clip hasta el final del último del mismo still, incluidas las pausas internas de 0.25 s. Música: intervalo completo del timeline, incluidos los fades. Valores integrados del resumen final, a 0.1 LU; intervalos y niveles absolutos en `loudness.json`.

| Still | Música − voz ES (LU) | Música − voz EN (LU) | Modo del fragmento |
| --- | --- | --- | --- |
| monodia | -2.6 | -2.8 | linear |
| organum | -2.1 | -2.0 | linear |
| ars-nova | -3.3 | **-3.7** | peak-limited-gain |
| preclasico | -2.4 | -2.4 | linear |
| clasico | **-3.7** | -3.4 | peak-limited-gain |
| impresionismo | **-1.7** | **-1.9** | linear |
| expresionismo | **-4.6** | **-4.7** | peak-limited-gain |
| dodecafonia | -2.4 | -2.3 | linear |
| microtonalismo | **-1.7** | **-1.8** | linear |

No hay saturación: pico verdadero máximo de todo el MP4 ES −1.3 dBTP y EN −1.4 dBTP después de AAC. El límite de −4.5 dBTP corresponde al fragmento antes del ajuste final de mezcla.

Remontaje con `npm run video` en ES/EN, reutilizando los 90 PNG base capturados (el comando genera sus variantes de cursor/crédito). Duraciones, 133 clips/SRT, continuidad y formato comprobados; se conservaron narración, música de origen, storyboard y tiempos. Copias de H: verificadas byte por byte. Archivos de Drive reemplazados en los mismos IDs, conservando nombres y privacidad; tamaño verificado por metadatos.

Pruebas: lint y TypeScript aprobados; 559 unitarias aprobadas, 3 todo; 9 Playwright aprobadas. La revisión visual/SRT anterior fue aprobada por Claude; esta revisión de audio documenta una incidencia pendiente, no una aprobación del objetivo de sonoridad.
