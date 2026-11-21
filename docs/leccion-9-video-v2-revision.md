# Lección 9 v2 — revisión ES/EN

Fecha: 2026-10-21. Rama `claude/leccion-9-video`, PR #58, sin fusionar.

El commit `f3c3630` («Lección 9: highlights por tiempo») conserva los cambios entregados por Claude. Se regeneraron 45 stills por idioma. La comparación SHA-256 contra la entrega v1 confirma que cambian exactamente `dos-ultimos`, `seis-cuatro`, `mismo-bajo`, `pulso-24`, `pulso-34`, `pulso-44` y `excepcion`; los otros 38 PNG por idioma son idénticos.

La revisión ampliada de los 14 PNG confirma que los recuadros incluyen únicamente los acordes señalados; sus etiquetas dejan libres los cifrados y la métrica. En `excepcion`, el recuadro incluye el segundo tiempo y excluye el primero, el V del tercero y la firma 3/4. `mismo-bajo` usa un único recuadro continuo sobre el bajo desde I 6/4 hasta V, excluyendo IV e I final. Para ello, el renderizador une los fragmentos de un mismo highlight por voz entre compases adyacentes del mismo sistema, después de completar VexFlow. Los rangos de sistemas distintos permanecen separados. Una prueba visual comprueba el recuadro único y su cruce de la barra de compás en ambos idiomas.

## Revisión técnica final

| Medición | ES | EN |
| --- | ---: | ---: |
| Duración MP4 (s) | 524.880 | 505.766667 |
| Duración timeline (s) | 524.880 | 505.760 |
| Voz (s) | 420.480 | 401.360 |
| Música (s) | 49.800 | 49.800 |
| Pausas (s) | 54.600 | 54.600 |
| Stills / clips / entradas SRT | 45 / 79 / 79 | 45 / 79 / 79 |
| Fotogramas correctos | 117/117 | 117/117 |
| Diferencia media máxima en gris (sobre 255) | 1.511462 | 1.502020 |
| Mezcla final | −16 LUFS / −1.4 dBTP | −16 LUFS / −1.4 dBTP |
| Tamaño final MP4 (bytes) | 17852114 | 17054135 |

Ambos MP4: H.264 1920×1080, yuv420p, 30 fps; AAC estéreo 48 kHz. Diferencia MP4–timeline dentro de ±0.1 s. Los 79 clips por idioma se usan completos, una vez y en orden; los stills son contiguos. Los SRT tienen texto literal y tiempos correctos (tolerancia 0.51 ms), y son idénticos a v1 por SHA-256. También son idénticos los tiempos y rangos de clips de ambos timelines respecto a v1.

Se compararon dos fotogramas por still (inicio +0.15 s y mitad de narración), más tres por escucha: 234/234 correctos, MAE <4/255. Los 54 fotogramas musicales coinciden con sus PNG de cursor y muestran el cursor verde; 48 posiciones por idioma. Las 18 escuchas quedan entre −2.4 y −2.6 dB RMS respecto a su voz, sin saturación. El segundo inicial es silencio digital (−91 dB RMS, pico verdadero −∞). Los valores por escucha, incluidos LUFS, están en `.local-work/l9-v2-review-{es,en}.json`.

Después de montar la imagen, se incorporó por copia directa la pista AAC original de cada v1, sin recodificarla. Toda la revisión anterior se ejecutó sobre estos MP4 finales. Así, voz y música son idénticas byte por byte a v1; hashes SHA-256 de los paquetes AAC:

- ES: `6c7a95a814f7f227237f7a5b720f795334528f5f37c40c4c6eb2b1c025ff235f`.
- EN: `3eb864a50392ac71da6336272710a825aa7070266b2b0e5c3fb00785c2168801`.

Pasaron TypeScript, ESLint de los archivos modificados y 17 pruebas Playwright (L9 ES/EN, regresión L8 y stills generales). No se modificaron partituras, guiones, mapas, narraciones ni textos de pantalla entregados por Claude.

## Entrega

En `H:/Website Clases/09 Lección 9/Video 2026/`:

- `leccion-9-v2.mp4`, `leccion-9-v2.srt` y `timeline-v2.json`.
- `leccion-9-v2-en.mp4`, `leccion-9-v2-en.srt` y `timeline-v2-en.json`.
- `stills-es/` y `stills-en/` reemplazados: 45 PNG y manifest por idioma.

Se conservaron los MP4, SRT y timelines de v1. Las 98 copias de v2 en H: se comprobaron por SHA-256; evidencia en `.local-work/l9-v2-delivery.json`. Las evidencias de diferencias y audio idéntico están en `.local-work/v2-changes.json`.

Subida mediante el plugin Google Drive, con autorización explícita en el encargo de esta v2, a «Mi unidad» de `luisca66@gmail.com`, ID `0AOgZ_gJdvasJUk9PVA`. La lectura posterior de metadata de ambos archivos confirma tamaño idéntico al local, el padre indicado, `shared: false` y un solo permiso: propietario `luisca66@gmail.com`.

| Idioma | Archivo privado de Drive | Tamaño (bytes) |
| --- | --- | ---: |
| ES | [19vkxvlmyUZleU6Q3TgA6spR4RZzrsSVO](https://drive.google.com/file/d/19vkxvlmyUZleU6Q3TgA6spR4RZzrsSVO/view?usp=drivesdk) | 17852114 |
| EN | [1Ylv_nvbdHcerHwwWOWOWkGYN4MbGa7sC](https://drive.google.com/file/d/1Ylv_nvbdHcerHwwWOWOWkGYN4MbGa7sC/view?usp=drivesdk) | 17054135 |

No se compartieron los videos. No se añadieron binarios al repositorio. `public/apps/diapason/index.html` queda fuera de todos los commits de esta entrega.
