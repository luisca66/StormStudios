# Lección 7 — revisión del video v2 ES/EN

Fecha: 2026-10-06. Rama: `claude/leccion-7-video`. Esta revisión sustituye la de v1 y corresponde al commit de figuras `321f220`, «Lección 7: figuras recortadas y enlace IV–V sin etiquetas encimadas». Se regeneraron los 79 stills y ambos montajes con las carpetas existentes `.local-work/08-leccion-7-audio-{es,en}/`. La voz se conservó íntegra.

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
| Diferencia media en gris máxima (sobre 255) | 0.2531 | 0.2546 |
| Sonoridad integrada / pico verdadero | −16.0 LUFS / −1.4 dBTP | −16.0 LUFS / −1.4 dBTP |
| Tamaño MP4 (bytes) | 22,539,366 | 21,159,871 |

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

Se revisaron a 1920×1080 los 11 stills de imagen de cada idioma: `intervalos-figura`, `clasificacion`, `disminuidos-figura`, `saltos-figura`, `paralelas-figura`, `no-justas`, `simultaneos-figura` y los cuatro `recap-*`. Las seis figuras SVG por idioma aparecen grandes, centradas, completas y sin recortes; se conservan notas, títulos y etiquetas. También se revisó `enlace-mal` en ES/EN: solo hay recuadros sobre tenor y bajo; el Re4/D4 de contralto queda visible y la explicación está en el caption.

El `<img>` ya mide 1760×670 px, igual que su área de contenido, con `object-fit: contain`. No fue necesario ajustar el renderizador. El diff contra `3486496` confirma que `StillStage.tsx`, `stills.module.css`, las figuras y los storyboards de L5 no cambiaron; no se regeneraron ni modificaron sus PNG.

Se compararon dos fotogramas por still (inicio +0.15 s y mitad de narración), más tres durante cada escucha, contra sus PNG de origen. Los 340 cumplen diferencia media en gris <4. Los 24 fotogramas de cursor coinciden con las imágenes del pulso correspondiente y muestran el avance en inicio, centro y final de la escucha, incluidos los compases 3–4 del enlace correcto. El timeline contiene 60 posiciones de cursor por idioma.

## Validación y entrega

Capturas: `npm run stills` para ambos storyboards; montaje: `npm run video` con los mapas y carpetas de voz existentes. Se repitió la revisión completa con ffprobe, ffmpeg (select, EBU R128, volumedetect) y comparación de imágenes en gris con Pillow mediante `.local-work/review-l7.py`. Mediciones y fotogramas v2 quedan en `.local-work/l7-review-{es,en}.json`, `.local-work/l7-review-v2.log` y `.local-work/l7-review-frames-{es,en}/`, fuera de Git. Las 181 pruebas del secuenciador pasaron en v1; esta ronda no modifica código y verifica los nuevos medios directamente.

Entrega en `H:/Website Clases/07 Lección 7/Video 2026/`: `leccion-7-v2.mp4`, `leccion-7-v2.srt`, `leccion-7-v2-en.mp4`, `leccion-7-v2-en.srt`, `timeline.json` y `timeline-en.json`. Se borraron los cuatro archivos v1 de esa carpeta después de verificar las nuevas copias. Se reemplazaron los 79 PNG en cada carpeta `H:/Website Clases/07 Lección 7/stills-{es,en}/`, conservando la ubicación de v1. Se comprobaron las 164 copias por SHA-256. El CLI conserva el nombre interno `leccion-7-v1` en sus salidas de trabajo; la entrega corresponde al montaje nuevo y se identifica como v2.

SHA-256 MP4 ES: `a6df94e635cee584cbbfbc502fe98c12200d0c7912191637bb929531dd98be15`.

SHA-256 MP4 EN: `7d256c832d681a1e7d792da84b81fa135b2f671042cbe67f20e5633112909654`.

Las copias de Drive se verificaron por metadata: tamaños idénticos a los locales y permiso únicamente de propietario para la cuenta de Luis. No se añadieron MP3, WAV, PNG ni MP4 al repositorio.

Se reemplazaron los bytes mediante `files.update`, conservando los IDs de v1 y sus enlaces:

- [Español v2](https://drive.google.com/file/d/1Y3pH2ozPub2monl_pqkyvHJLM79kcxaD/view): 22,539,366 bytes; modificado `2026-10-06T14:17:28.122Z`; MIME `video/mp4`.
- [English v2](https://drive.google.com/file/d/1Q-9blFCgtIFiG_hIApK3zvAfUo24brZ_/view): 21,159,871 bytes; modificado `2026-10-06T14:17:47.481Z`; MIME `video/mp4`.

Una lectura posterior independiente de metadata confirmó nombre v2, tamaño, fecha y permiso exclusivo de propietario en ambos archivos. La rama se entrega sin fusionar.
