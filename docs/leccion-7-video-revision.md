# Lección 7 — revisión del video v5 ES/EN

Fecha: 2026-10-06. Rama: `claude/leccion-7-video` (PR #49). Sustituye la revisión v4 y corresponde al commit `cdfda01`, «Lección 7: frase sobre movimientos armónicos al final de la tarea». Se regeneraron los 81 stills por idioma, incluido el nuevo título `armonicos-despues` para el clip 111, y ambos montajes con los 119 clips regenerados de `.local-work/08-leccion-7-audio-{es,en}/`.

## Resultados

| Medición | ES | EN |
| --- | ---: | ---: |
| Duración MP4 (s) | 695.133333 | 657.366667 |
| Duración timeline (s) | 695.120021 | 657.360021 |
| Voz decodificada / tabla oficial (s) | 548.720 / 548.720 | 510.960 / 510.960 |
| Música (s) | 54.800021 | 54.800021 |
| Pausas (s) | 91.600 | 91.600 |
| Stills / clips / entradas SRT | 81 / 119 / 119 | 81 / 119 / 119 |
| Fotogramas correctos | 174 / 174 | 174 / 174 |
| Diferencia media en gris máxima | 0.2532 | 0.2476 |
| Sonoridad integrada / pico verdadero | -16 LUFS / -1.2 dBTP | -16 LUFS / -1.4 dBTP |
| Tamaño MP4 (bytes) | 23280909 | 21700203 |

Ambos MP4: 1920×1080, H.264, yuv420p, 30 fps, AAC estéreo a 48 kHz. Diferencia MP4–timeline inferior a 0.014 s (objetivo ±0.1 s). La voz coincide con la tabla oficial. Los 119 clips se usan una vez y en orden, completos; los 81 stills son contiguos, sin huecos. Los SRT tienen 119 entradas literales del guion, sin errores de texto ni tiempos (tolerancia 0.51 ms). El segundo inicial es silencio digital: −∞ dBTP y −91 dB en volumedetect.

## Escuchas después de AAC

Voz medida desde el primer clip hasta el último del mismo still, incluidas sus pausas. Δ = música menos voz. El objetivo de −2 a −3 dB se aplica al RMS; LUFS se reporta por separado por los decaimientos del piano y el gating EBU R128.

| Idioma | Escucha | Voz LUFS | Piano LUFS | Δ LU | Voz dB RMS | Piano dB RMS | Δ dB RMS | Pico piano dBTP |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ES | intervalos-escuchar | -15.5 | -17.8 | -2.3 | -18.9 | -21.4 | -2.5 | -6.2 |
| ES | octavas-escuchar | -15.5 | -17.6 | -2.1 | -19.6 | -22.1 | -2.5 | -2.6 |
| ES | enlace-mal | -15.8 | -15.4 | 0.4 | -19.2 | -21.7 | -2.5 | -1.5 |
| ES | enlace-bien | -15.6 | -15.6 | 0.0 | -18.6 | -21.2 | -2.6 | -1.6 |
| EN | intervalos-escuchar | -15.6 | -17.7 | -2.1 | -18.8 | -21.3 | -2.5 | -6.1 |
| EN | octavas-escuchar | -15.6 | -17.6 | -2.0 | -19.7 | -22.1 | -2.4 | -2.5 |
| EN | enlace-mal | -16.1 | -15.7 | 0.4 | -19.4 | -22.0 | -2.6 | -1.8 |
| EN | enlace-bien | -15.2 | -15.0 | 0.2 | -18.0 | -20.7 | -2.7 | -1.5 |

Las ocho escuchas cumplen RMS (−2.4 a −2.7 dB), sin saturación. La mezcla completa mide −16.0 LUFS; pico verdadero ES −1.2 dBTP, EN −1.4 dBTP.

## Imagen, música y cursor

Se revisaron las diez hojas de contacto (162 stills), ampliando la figura de intervalos y el nuevo título `armonicos-despues` en ambos idiomas. Los intervalos usan notas iniciales variadas; cada compás de 4/4 contiene tres cuartos (subida y bajada) y un silencio de cuarto. Los saltos muestran Re–Sol–Re ascendente, Sol–Do–Sol descendente y Mi–La–Re como dos cuartas. Figuras y recapitulativos aparecen completos, sin recortes; los resaltados de los enlaces conservan visibles las otras voces.

Se compararon dos fotogramas por still (inicio +0.15 s y mitad de narración), más tres durante cada escucha: 348/348 correctos, diferencia media en gris <4/255. Los 24 fotogramas de cursor corresponden a sus PNG y posiciones de inicio, centro y final; se detectó el cursor verde en todos. `intervalos-escuchar` conserva 9 compases / 36 pulsos a 72 BPM y 30.2 s con cola; las otras escuchas tienen 8 pulsos a 60 BPM y 8.2 s con cola. `enlace-bien` reproduce solo los compases 3–4. Hay 60 posiciones de cursor por idioma.

## Validación y entrega

Se ejecutó `npm run stills` y `npm run video` para ambos idiomas. Revisión con ffprobe, ffmpeg (fotogramas, EBU R128, volumedetect) y Pillow mediante `.local-work/review-l7-v5.py`, con comprobaciones de continuidad, SRT, sincronía y niveles. Evidencia fuera de Git: `.local-work/l7-review-{es,en}.json`, `.local-work/l7-review-v5-{es,en}.log`, `.local-work/l7-review-frames-{es,en}/` y `.local-work/l7-delivery-v5.json`. Esta ronda verifica directamente los medios y no modifica herramientas.

Entrega en `H:/Website Clases/07 Lección 7/Video 2026/`: `leccion-7-v5.mp4`, `leccion-7-v5.srt`, `leccion-7-v5-en.mp4`, `leccion-7-v5-en.srt`, `timeline.json` y `timeline-en.json`. Se retiraron los cuatro archivos v4 tras verificar sus reemplazos. `H:/Website Clases/07 Lección 7/stills-es/` y `stills-en/` contienen exactamente los 81 PNG del manifest actual, sin nombres obsoletos. Antes del render se limpiaron completamente `stills/{es,en}/08-leccion-7/`, incluidos los intermedios. Se comprobaron las 168 copias por SHA-256. El CLI mantiene `leccion-7-v1` como nombre interno en la carpeta de trabajo; la entrega es v5.

SHA-256 MP4 ES: `6fdbdaaac31ce2ed52c3134e227edd3492f7502696405ae912c3e62b3a42f8fa`.

SHA-256 MP4 EN: `ef9404d62d04db72fc73e130449d7dcecd1b48ca224a4a012c116037b6fdbdc5`.

Se reemplazaron los bytes privados de Drive mediante `files.update`, conservando los IDs y enlaces:

- [Español v5](https://drive.google.com/file/d/1Y3pH2ozPub2monl_pqkyvHJLM79kcxaD/view): 23,280,909 bytes; modificado `2026-10-06T16:46:05.629Z`.
- [English v5](https://drive.google.com/file/d/1Q-9blFCgtIFiG_hIApK3zvAfUo24brZ_/view): 21,700,203 bytes; modificado `2026-10-06T16:49:09.843Z`.

Una lectura independiente posterior confirmó nombre v5, tamaño idéntico al local, MIME `video/mp4` y permiso exclusivo de propietario en ambos. La actualización ES se completó al primer intento. El primer intento EN falló por desconexión del servidor; una lectura de metadatos confirmó que seguía en v4 y el reintento desde la copia local verificada se completó correctamente. No se añadieron medios binarios al repositorio. La rama se entrega sin fusionar.
