# Lección 8 — revisión del video v2 ES/EN

Fecha: 2026-10-07. Sustituye la revisión v1 y corresponde al encargo `encargo-codex-video-v2.md`. PR #53, sin fusionar. Rama: `claude/leccion-8-video`. Storyboard, guiones, mapas y figuras guardados tal cual en el commit inicial `9ed000f`. La voz original se conservó sin regenerarla: 118 MP3 y 118 párrafos por idioma.

## Resultados

| Medición | ES | EN |
| --- | ---: | ---: |
| Duración MP4 (s) | 839.066667 | 810.333333 |
| Duración timeline (s) | 839.050021 | 810.330021 |
| Voz decodificada / tabla oficial (s) | 655.200 / 655.200 | 626.480 / 626.480 |
| Música (s) | 103.000021 | 103.000021 |
| Pausas (s) | 80.850 | 80.850 |
| Stills / clips / entradas SRT | 67 / 118 / 118 | 67 / 118 / 118 |
| Fotogramas correctos | 179 / 179 | 179 / 179 |
| Diferencia media en gris máxima | 0.2915 | 0.289 |
| Sonoridad integrada / pico verdadero | -16.0 LUFS / -1.3 dBTP | -16.0 LUFS / -1.3 dBTP |
| Tamaño MP4 (bytes) | 29563818 | 28568016 |

Ambos MP4: 1920×1080, H.264, yuv420p, 30 fps, AAC estéreo a 48 kHz. Diferencia MP4–timeline: ES 0.016646 s, EN 0.003312 s (objetivo ±0.1 s). Todos los clips se usan una vez y en orden, completos; los 67 stills son contiguos sin huecos. Los SRT tienen 118 entradas literales, sin errores de texto ni tiempos (tolerancia 0.51 ms). El segundo inicial es silencio digital: −∞ dBTP, −91 dB RMS en volumedetect.

## Escuchas después de AAC

La voz se mide desde el inicio del primer clip hasta el final del último del mismo still, incluidas las pausas internas. Δ = música menos voz. Todas las 30 escuchas cumplen −2 a −3 dB RMS: rango observado −2.4 a −2.7 dB. LUFS se informa por separado; el gating y el decaimiento del piano producen diferencias distintas.

| Idioma | Escucha | Voz LUFS | Piano LUFS | Δ LU | Voz dB RMS | Piano dB RMS | Δ dB RMS | Pico piano dBTP |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ES | enlazar | -15.9 | -18.2 | -2.3 | -19.1 | -21.6 | -2.5 | -3.3 |
| ES | tres-cosas | -14.7 | -15.1 | -0.4 | -18.2 | -20.9 | -2.7 | -1.4 |
| ES | repetir | -16.3 | -18.2 | -1.9 | -19.1 | -21.6 | -2.5 | -3.3 |
| ES | ej1 | -15.5 | -17.6 | -2.1 | -18.5 | -21.0 | -2.5 | -2.6 |
| ES | ej2 | -15.2 | -18.2 | -3.0 | -17.9 | -20.4 | -2.5 | -2.1 |
| ES | ej3 | -15.7 | -18.3 | -2.6 | -18.6 | -21.1 | -2.5 | -2.2 |
| ES | ej4 | -16.3 | -18.2 | -1.9 | -19.0 | -21.4 | -2.4 | -2.9 |
| ES | ej5 | -15.5 | -17.4 | -1.9 | -18.5 | -21.1 | -2.6 | -2.5 |
| ES | ej6 | -14.7 | -17.4 | -2.7 | -17.6 | -20.2 | -2.6 | -1.7 |
| ES | ej7 | -15.9 | -17.6 | -1.7 | -18.6 | -21.1 | -2.5 | -2.8 |
| ES | ej8 | -15.6 | -17.7 | -2.1 | -18.7 | -21.2 | -2.5 | -3.3 |
| ES | error-paralelas | -16.3 | -17.7 | -1.4 | -19.2 | -21.6 | -2.4 | -3.2 |
| ES | error-paralelas-bien | -16.1 | -17.6 | -1.5 | -18.9 | -21.3 | -2.4 | -2.9 |
| ES | error-sensible | -16.5 | -18.1 | -1.6 | -19.2 | -21.6 | -2.4 | -3.5 |
| ES | error-sensible-bien | -16.4 | -18.1 | -1.7 | -19.0 | -21.5 | -2.5 | -3.1 |
| EN | enlazar | -15.9 | -18.1 | -2.2 | -19.0 | -21.5 | -2.5 | -3.2 |
| EN | tres-cosas | -14.9 | -15.2 | -0.3 | -18.3 | -21.0 | -2.7 | -1.5 |
| EN | repetir | -16.2 | -18.4 | -2.2 | -19.2 | -21.7 | -2.5 | -3.4 |
| EN | ej1 | -15.9 | -17.9 | -2.0 | -18.9 | -21.3 | -2.4 | -3.0 |
| EN | ej2 | -15.6 | -18.6 | -3.0 | -18.4 | -20.8 | -2.4 | -2.7 |
| EN | ej3 | -16.3 | -18.7 | -2.4 | -19.0 | -21.5 | -2.5 | -2.7 |
| EN | ej4 | -15.8 | -18.3 | -2.5 | -18.9 | -21.4 | -2.5 | -2.9 |
| EN | ej5 | -15.8 | -17.5 | -1.7 | -18.7 | -21.2 | -2.5 | -2.6 |
| EN | ej6 | -16.0 | -18.7 | -2.7 | -19.0 | -21.4 | -2.4 | -3.0 |
| EN | ej7 | -16.2 | -18.4 | -2.2 | -19.4 | -21.8 | -2.4 | -3.5 |
| EN | ej8 | -15.6 | -17.4 | -1.8 | -18.4 | -20.9 | -2.5 | -2.9 |
| EN | error-paralelas | -16.4 | -17.7 | -1.3 | -19.2 | -21.6 | -2.4 | -3.1 |
| EN | error-paralelas-bien | -16.3 | -17.7 | -1.4 | -19.0 | -21.4 | -2.4 | -3.0 |
| EN | error-sensible | -16.1 | -17.7 | -1.6 | -18.8 | -21.2 | -2.4 | -3.1 |
| EN | error-sensible-bien | -16.3 | -18.5 | -2.2 | -19.4 | -21.9 | -2.5 | -3.5 |

Las mezclas finales usan ganancia fija y limitador sobremuestreado, sin compresión loudnorm dinámica en la salida. Ambas cumplen −16 LUFS; picos −1.3 dBTP ES / −1.3 dBTP EN. `tres-cosas` queda a −2.7 dB RMS aunque su Δ LU sea −0.5 ES / −0.3 EN. Ninguna escucha satura.

## Imagen, música y cursor

Se revisaron las seis hojas de contacto que contienen todos los stills modificados, ampliando los casos de tenor y las cuatro voces de `ej2-voces`. Los otros 54 PNG por idioma son idénticos a v1 por SHA-256 y conservan su revisión musical y visual. Los proyectos ej1–ej8 muestran dos mitades en un solo compás, con Sol, Re, Fa, Si♭, La, Mi♭, Do y Mi mayor. No hay alteraciones redundantes: por ejemplo Do♯ en Re mayor procede de la armadura. Los cifrados se alinean con los acordes de pulsos 1 y 3, incluidos I 6/3, VII 6/3 e IV 6/3. Material conserva sus 11 acordes en redondas y el mismo encuadre durante reveals y highlights. Las figuras transparentes se muestran completas y centradas.

La v2 corrige los recuadros por voz: `ScoreView.tsx` conserva por evento los límites de cabezas, modificadores y plicas de VexFlow. `capture-decoration.ts` extiende el recuadro únicamente con notas de esa voz en el rango de pulsos visible, con 8 px de margen sobre el trazo que sale del pentagrama. Se conservan los márgenes normales del pentagrama. Esto incluye los tenores Sol4–Mi4 y Fa4–Sol4 y las plicas hacia abajo. El relleno va detrás de la música y los bordes por encima de todos los rellenos, para distinguir recuadros vecinos solapados sin cubrir notas. Las etiquetas laterales siguen el centro del recuadro extendido. `focusVoice` conserva la voz elegida y atenúa las demás, sin alterar la geometría. Se probó la contención y alineación con y sin foco en siete casos por idioma.

Auditoría de stage: los 134 stills pasan los límites de encabezados y etiquetas; las etiquetas por voz no colisionan con notas ni entre sí. Las cajas tipográficas de redondas abarcan el ascenso completo de la fuente y no representan los píxeles del glifo: los resaltados de material se verificaron visualmente. Los ejemplos no tienen accidentales redundantes y cada cifrado está bajo su acorde (desviación horizontal <15 px).

Se compararon dos fotogramas por still (inicio +0.15 s y mitad de narración), más tres durante cada una de las 15 escuchas: 358/358 correctos, MAE en gris <4/255, máximo 0.2915. Los 90 fotogramas de cursor coinciden con sus PNG de inicio, centro y final, con cursor verde detectado. Cada idioma contiene 100 posiciones de cursor: 44 para `tres-cosas` y 4 por cada una de las otras 14 escuchas. `tres-cosas` dura 44.2 s y los ejemplos de un compás 4.2 s, incluida cola; todos a 60 BPM. `error-*` conserva únicamente el compás visible, incluso los rangos [2,2].

## Validación y entrega

Validación: `npx tsc --noEmit`, ESLint de los dos archivos modificados y la prueba nueva, 181 pruebas del secuenciador y 15 pruebas Playwright (regresión de stills y etiquetas L8 ES/EN), todas correctas. Se ejecutaron `npm run stills` y `npm run video` por idioma. La revisión utiliza ffprobe, ffmpeg (fotogramas, EBU R128 y volumedetect) y Pillow. Evidencias fuera de Git: `.local-work/review-l8-v2.py`, `l8-review-v2-{es,en}.json`, `l8-review-v2-{es,en}.log`, `l8-review-v2-frames-{es,en}/`, `l8-stage-audit.json` y `l8-delivery-v2.json`.

Entrega en `H:/Website Clases/08 Lección 8/Video 2026/`: `leccion-8-v2.mp4`, `leccion-8-v2.srt`, `leccion-8-v2-en.mp4`, `leccion-8-v2-en.srt`, `timeline.json`, `timeline-en.json` y 67 PNG en cada subcarpeta `stills-es/` y `stills-en/`. Se comprobaron las 140 copias por SHA-256. Se retiraron los cuatro MP4/SRT v1 después de verificar los reemplazos v2; `stills-es/` y `stills-en/` contienen exactamente los 67 PNG actuales. El CLI conserva v1 como nombre interno; los archivos entregados son v2. No se añadieron MP3/WAV/PNG/MP4 al repositorio.

SHA-256 MP4 ES: `3c1a62e7cf0974e5a1718ad282b57df3fbf6eb579ce21ed9a6fd222202472d07`.

Drive [ES v2](https://drive.google.com/file/d/12kt3BGeBpXB5Tl9nXh9OEHC1FVUmEAB5/view): ID `12kt3BGeBpXB5Tl9nXh9OEHC1FVUmEAB5`, 29,563,818 bytes.

SHA-256 MP4 EN: `fb0d346620133399533ff87d2795d0fb36301ac850b65b9367d80411a71056a3`.

Drive [EN v2](https://drive.google.com/file/d/1OBxyD8z0-QXqmi7vTYj5GOz2U4s39Kxa/view): ID `1OBxyD8z0-QXqmi7vTYj5GOz2U4s39Kxa`, 28,568,016 bytes.

Se actualizaron bytes y nombre mediante Drive `files.update`, conservando los IDs y enlaces. Una lectura posterior independiente confirmó nombres v2, MIME video/mp4, tamaños idénticos al local y permiso único de propietario `luisca66@gmail.com` en ambos. Modificados: ES `2026-10-07T17:40:26.660Z`; EN `2026-10-07T17:40:51.727Z`.

Se añadió una línea L8 en «Lecciones aprendidas» de la skill. La rama se entrega por PR hacia main, sin fusionar.

## Stills modificados respecto a v1

Mismos 13 IDs en ES y EN (comparación SHA-256):

- `nota-comun`
- `sensible`
- `ej1-voces`
- `ej2-voces`
- `ej3-voces`
- `ej4-voces`
- `ej5-voces`
- `ej6-voces`
- `ej7-voces`
- `ej8-voces`
- `error-paralelas`
- `error-sensible`
- `error-sensible-bien`
