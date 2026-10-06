# Lección 7 — revisión del video ES/EN

Fecha: 2026-10-06. Rama: `claude/leccion-7-video`. Primer commit: `3220472`, «Lección 7: storyboard, guion y figuras», con los 22 archivos originales de Claude. La voz existente se conservó íntegra; no se regeneró.

## Resultados

| Medición | ES | EN |
| --- | ---: | ---: |
| Duración MP4 (s) | 672.880 | 638.733333 |
| Duración timeline (s) | 672.880021 | 638.720021 |
| Voz decodificada / tabla oficial (s) | 528.480 / 528.480 | 494.320 / 494.320 |
| Música (s) | 54.800021 | 54.800021 |
| Pausas (s) | 89.600 | 89.600 |
| Stills / clips / entradas SRT | 79 / 117 / 117 | 79 / 117 / 117 |
| Fotogramas comparados / correctos | 170 / 170 | 170 / 170 |
| Diferencia media en gris máxima (sobre 255) | 0.2531 | 0.2324 |
| Sonoridad integrada / pico verdadero | −16.0 LUFS / −1.4 dBTP | −16.0 LUFS / −1.4 dBTP |
| Tamaño MP4 (bytes) | 22,490,363 | 21,067,329 |

Ambos archivos: 1920×1080, H.264, yuv420p, 30 fps, AAC estéreo a 48 kHz. La diferencia entre duración MP4 y timeline es inferior a 0.014 s, dentro de ±0.1 s. Los 117 clips aparecen una vez y en orden, sin recortes internos; los stills contiguos no tienen huecos. Las entradas SRT conservan literalmente el guion y sus tiempos coinciden con los clips con tolerancia de 0.51 ms. El segundo inicial analizado es silencio digital (pico verdadero −∞, volumedetect −91 dB).

## Escuchas: medición del MP4 después de AAC

Los niveles de voz incluyen las pausas entre clips del mismo still. Δ RMS y Δ LU son música menos voz; se aplica el objetivo de −2 a −3 dB al RMS, siguiendo la calibración de L6. LUFS se reporta por separado: los decaimientos del piano y el gating de EBU R128 producen diferencias distintas.

| Idioma | Escucha | Voz LUFS | Piano LUFS | Δ LU | Voz dB RMS | Piano dB RMS | Δ dB RMS | Pico piano dBTP |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ES | intervalos-escuchar | −15.6 | −18.7 | −3.1 | −20.0 | −22.5 | −2.5 | −4.7 |
| ES | octavas-escuchar | −15.5 | −17.6 | −2.1 | −19.6 | −22.1 | −2.5 | −2.5 |
| ES | enlace-mal | −15.9 | −15.4 | +0.5 | −19.2 | −21.7 | −2.5 | −1.6 |
| ES | enlace-bien | −15.6 | −15.6 | 0.0 | −18.6 | −21.2 | −2.6 | −1.5 |
| EN | intervalos-escuchar | −15.6 | −18.2 | −2.6 | −19.4 | −22.0 | −2.6 | −4.3 |
| EN | octavas-escuchar | −15.6 | −17.7 | −2.1 | −19.7 | −22.1 | −2.4 | −2.6 |
| EN | enlace-mal | −16.1 | −15.7 | +0.4 | −19.5 | −22.0 | −2.5 | −1.9 |
| EN | enlace-bien | −15.2 | −15.0 | +0.2 | −18.1 | −20.7 | −2.6 | −1.5 |

Las ocho escuchas cumplen el objetivo RMS y no saturan. `intervalos-escuchar` contiene 9 compases / 36 pulsos a 72 BPM (30.2 s con cola). Las otras tres contienen 2 compases / 8 pulsos a 60 BPM (8.2 s con cola). `enlace-mal` abarca los compases 1–2; `enlace-bien`, exclusivamente 3–4. El manifest conserva los rangos de ticks 0–34560, 0–7680, 0–7680 y 7680–15360 respectivamente.

## Imagen, música y cursor

Se revisaron las ocho hojas de contacto ES/EN y se ampliaron los ejemplos de intervalos, voces ocultas, unísono y melodías con armadura. Los SVG están centrados, completos y con su título propio; las notas, mitades, cuartos, silencios, armaduras de Sol/Re/Si♭, voces seleccionadas y foco se dibujan correctamente. Los reveals dentro del compás mantienen el espaciado y los highlights corresponden a sus pulsos. No fue necesario cambiar headings, captions, labels ni el render genérico.

Se compararon dos fotogramas por still (inicio +0.15 s y mitad de narración), más tres durante cada escucha, contra sus PNG de origen. Los 340 cumplen diferencia media en gris <4. Los 24 fotogramas de cursor coinciden con las imágenes del pulso correspondiente y muestran el avance en inicio, centro y final de la escucha, incluidos los compases 3–4 del enlace correcto. El timeline contiene 60 posiciones de cursor por idioma.

## Validación y entrega

`npx vitest run lib/sequencer`: 12 archivos y 181 pruebas aprobadas. Capturas: `npm run stills` para ambos storyboards; montaje: `npm run video` con los mapas y carpetas de voz existentes. Revisión: ffprobe, ffmpeg (select, EBU R128, volumedetect) y comparación de imágenes en gris con Pillow. Mediciones y fotogramas de trabajo quedan en `.local-work/l7-review-{es,en}.json` y `.local-work/l7-review-frames-{es,en}/`, fuera de Git.

Entrega en `H:/Website Clases/07 Lección 7/Video 2026/`: `leccion-7-v1.mp4`, `leccion-7-v1.srt`, `timeline.json` y sus variantes `-en`. Los 79 PNG de cada idioma están en `stills-es/` y `stills-en/`. Se comprobaron las 164 copias por SHA-256.

SHA-256 MP4 ES: `7f96197a322935681f38f7a8438a517cfb10b04e14b176d4b926c1a321192323`.

SHA-256 MP4 EN: `450676ca6609a5c839f4e02703d4a28420600a634c2ab9790e6b7dfc478103ee`.

Las copias de Drive se verificaron por metadata: tamaños idénticos a los locales y permiso únicamente de propietario para la cuenta de Luis. No se añadieron MP3, WAV, PNG ni MP4 al repositorio.
