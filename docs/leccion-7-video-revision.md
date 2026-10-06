# Lección 7 — revisión del video v4 ES/EN

Fecha: 2026-10-06. Rama: `claude/leccion-7-video` (PR #49). Sustituye la revisión v3 y corresponde al commit `3bc77b3`, «Lección 7: figura de intervalos en dos filas, más legible en video». Se regeneraron los 80 stills por idioma, con la figura de intervalos distribuida en dos filas, y ambos montajes con los 118 clips existentes de `.local-work/08-leccion-7-audio-{es,en}/`.

## Resultados

| Medición | ES | EN |
| --- | ---: | ---: |
| Duración MP4 (s) | 683.733333 | 647.880000 |
| Duración timeline (s) | 683.720021 | 647.880021 |
| Voz decodificada / tabla oficial (s) | 538.320 / 538.320 | 502.480 / 502.480 |
| Música (s) | 54.800021 | 54.800021 |
| Pausas (s) | 90.600 | 90.600 |
| Stills / clips / entradas SRT | 80 / 118 / 118 | 80 / 118 / 118 |
| Fotogramas correctos | 172 / 172 | 172 / 172 |
| Diferencia media en gris máxima | 0.2532 | 0.2479 |
| Sonoridad integrada / pico verdadero | -16 LUFS / -1.2 dBTP | -16 LUFS / -1.4 dBTP |
| Tamaño MP4 (bytes) | 22868846 | 21357392 |

Ambos MP4: 1920×1080, H.264, yuv420p, 30 fps, AAC estéreo a 48 kHz. Diferencia MP4–timeline inferior a 0.014 s (objetivo ±0.1 s). La voz coincide con la tabla oficial. Los 118 clips se usan una vez y en orden, completos; los 80 stills son contiguos, sin huecos. Los SRT tienen 118 entradas literales del guion, sin errores de texto ni tiempos (tolerancia 0.51 ms). El segundo inicial es silencio digital: −∞ dBTP y −91 dB en volumedetect.

## Escuchas después de AAC

Voz medida desde el primer clip hasta el último del mismo still, incluidas sus pausas. Δ = música menos voz. El objetivo de −2 a −3 dB se aplica al RMS; LUFS se reporta por separado por los decaimientos del piano y el gating EBU R128.

| Idioma | Escucha | Voz LUFS | Piano LUFS | Δ LU | Voz dB RMS | Piano dB RMS | Δ dB RMS | Pico piano dBTP |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ES | intervalos-escuchar | -15.5 | -17.8 | -2.3 | -18.9 | -21.4 | -2.5 | -6.2 |
| ES | octavas-escuchar | -15.5 | -17.6 | -2.1 | -19.6 | -22.1 | -2.5 | -2.5 |
| ES | enlace-mal | -15.8 | -15.4 | 0.4 | -19.2 | -21.7 | -2.5 | -1.6 |
| ES | enlace-bien | -15.6 | -15.6 | 0.0 | -18.6 | -21.2 | -2.6 | -1.5 |
| EN | intervalos-escuchar | -15.6 | -17.7 | -2.1 | -18.8 | -21.3 | -2.5 | -6.1 |
| EN | octavas-escuchar | -15.6 | -17.6 | -2.0 | -19.7 | -22.1 | -2.4 | -2.5 |
| EN | enlace-mal | -16.1 | -15.7 | 0.4 | -19.4 | -22.0 | -2.6 | -1.8 |
| EN | enlace-bien | -15.2 | -15.0 | 0.2 | -18.0 | -20.7 | -2.7 | -1.5 |

Las ocho escuchas cumplen RMS (−2.4 a −2.7 dB), sin saturación. La mezcla completa mide −16.0 LUFS; pico verdadero ES −1.2 dBTP, EN −1.4 dBTP.

## Imagen, música y cursor

Se revisaron las ocho hojas de contacto (160 stills), ampliando la figura de intervalos en ES/EN, `iv-direccion` y el enlace correcto. La figura nueva tiene cinco intervalos arriba y cuatro abajo; notas y etiquetas aparecen completas y legibles a 1080p. Los intervalos usan notas iniciales variadas; cada compás de 4/4 contiene tres cuartos (subida y bajada) y un silencio de cuarto. Los saltos muestran Re–Sol–Re ascendente, Sol–Do–Sol descendente y Mi–La–Re como dos cuartas. Figuras y recapitulativos aparecen completos, sin recortes; los resaltados de los enlaces conservan visibles las otras voces.

Se compararon dos fotogramas por still (inicio +0.15 s y mitad de narración), más tres durante cada escucha: 344/344 correctos, diferencia media en gris <4/255. Los 24 fotogramas de cursor corresponden a sus PNG y posiciones de inicio, centro y final; se detectó el cursor verde en todos. `intervalos-escuchar` conserva 9 compases / 36 pulsos a 72 BPM y 30.2 s con cola; las otras escuchas tienen 8 pulsos a 60 BPM y 8.2 s con cola. `enlace-bien` reproduce solo los compases 3–4. Hay 60 posiciones de cursor por idioma.

## Validación y entrega

Se ejecutó `npm run stills` y `npm run video` para ambos idiomas. Revisión con ffprobe, ffmpeg (fotogramas, EBU R128, volumedetect) y Pillow mediante `.local-work/review-l7-v4.py`, con comprobaciones de continuidad, SRT, sincronía y niveles. Evidencia fuera de Git: `.local-work/l7-review-{es,en}.json`, `.local-work/l7-review-v4.log`, `.local-work/l7-review-frames-{es,en}/` y `.local-work/l7-delivery-v4.json`. Esta ronda verifica directamente los medios y no modifica herramientas.

Entrega en `H:/Website Clases/07 Lección 7/Video 2026/`: `leccion-7-v4.mp4`, `leccion-7-v4.srt`, `leccion-7-v4-en.mp4`, `leccion-7-v4-en.srt`, `timeline.json` y `timeline-en.json`. Se retiraron los cuatro archivos v3 tras verificar sus reemplazos. Antes del render se limpiaron por completo `stills/{es,en}/08-leccion-7/`, incluidos los intermedios de video. Estas carpetas y `H:/Website Clases/07 Lección 7/stills-es/` y `stills-en/` contienen exactamente los 80 PNG del manifest actual, sin nombres obsoletos. Se comprobaron las 166 copias por SHA-256. El CLI mantiene `leccion-7-v1` como nombre interno en la carpeta de trabajo; la entrega es v4.

SHA-256 MP4 ES: `91504926557139bf270c03f4d541b47828a48863af3f9242812df7b04c21874b`.

SHA-256 MP4 EN: `d94aa8395d04d23cbaf2412258d8f9664d5f2219b0a120722b1e4f9fcbe0592c`.

Se reemplazaron los bytes privados de Drive mediante `files.update`, conservando los IDs y enlaces:

- [Español v4](https://drive.google.com/file/d/1Y3pH2ozPub2monl_pqkyvHJLM79kcxaD/view): 22,868,846 bytes; modificado `2026-10-06T15:52:34.060Z`.
- [English v4](https://drive.google.com/file/d/1Q-9blFCgtIFiG_hIApK3zvAfUo24brZ_/view): 21,357,392 bytes; modificado `2026-10-06T15:53:00.522Z`.

Una lectura independiente posterior confirmó nombre v4, tamaño idéntico al local, MIME `video/mp4` y permiso exclusivo de propietario en ambos. Ambas actualizaciones se completaron al primer intento. No se añadieron medios binarios al repositorio. La rama se entrega sin fusionar.
