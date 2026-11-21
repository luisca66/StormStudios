# Lección 9 — revisión de video ES/EN

Fecha: 2026-10-21. Rama: `claude/leccion-9-video`. Storyboard, guiones, duraciones y mapas conservados tal cual en el commit inicial `33d4145` («Lección 9: storyboard y guion»). Voz original sin regeneración: 79 MP3, 79 párrafos y 79 duraciones por idioma.

## Resultados técnicos

| Medición | ES | EN |
| --- | ---: | ---: |
| Duración MP4 (s) | 524.88 | 505.766667 |
| Duración timeline (s) | 524.880 | 505.760 |
| Voz decodificada / tabla (s) | 420.480 / 420.480 | 401.360 / 401.360 |
| Música (s) | 49.800 | 49.800 |
| Pausas (s) | 54.600 | 54.600 |
| Stills / clips / entradas SRT | 45 / 79 / 79 | 45 / 79 / 79 |
| Fotogramas correctos | 117 / 117 | 117 / 117 |
| Diferencia media máxima en gris (sobre 255) | 1.5115 | 1.5020 |
| Mezcla final / pico verdadero | −16.0 LUFS / −1.4 dBTP | −16.0 LUFS / −1.4 dBTP |
| Tamaño MP4 (bytes) | 17852538 | 17053547 |

Ambos archivos: una pista H.264, 1920×1080, yuv420p, 30 fps; una pista AAC estéreo, 48 kHz. Diferencia MP4–timeline: ES 0 s, EN 0.006667 s; límite ±0.1 s. La suma de voz, música y pausas coincide con el timeline. Los 79 clips se usan completos, una sola vez y en orden; los 45 stills son contiguos. Los SRT conservan literalmente las 79 líneas y sus tiempos reales, con tolerancia de 0.51 ms. El segundo inicial es silencio digital (−91 dB RMS en volumedetect, −∞ dBTP).

## Escuchas medidas después de AAC

Voz medida desde el inicio del primer clip hasta el final del último de cada still, incluidas sus pausas internas. Δ = piano menos voz. Las 18 escuchas cumplen −2 a −3 dB RMS; LUFS se reporta por separado porque el gating y el decaimiento de las notas producen otra diferencia.

| Idioma | Escucha | Voz LUFS | Piano LUFS | Δ LU | Voz dB RMS | Piano dB RMS | Δ dB RMS | Piano dBTP |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| ES | final-frase | -16.3 | -18.8 | -2.5 | -19.4 | -21.9 | -2.5 | -3.2 |
| ES | autentica-escucha | -15.0 | -17.6 | -2.6 | -18.2 | -20.7 | -2.5 | -2.1 |
| ES | plagal-escucha | -15.1 | -17.2 | -2.1 | -18.4 | -20.9 | -2.5 | -2.5 |
| ES | completa-escucha | -15.6 | -16.4 | -0.8 | -18.5 | -21.1 | -2.6 | -1.5 |
| ES | ampliada-escucha | -15.6 | -17.8 | -2.2 | -18.8 | -21.3 | -2.5 | -3.0 |
| ES | semi-v | -15.6 | -18.8 | -3.2 | -18.6 | -21.1 | -2.5 | -2.9 |
| ES | semi-v64 | -16.7 | -17.3 | -0.6 | -19.1 | -21.6 | -2.5 | -2.3 |
| ES | semi-iv | -16.0 | -18.2 | -2.2 | -19.1 | -21.6 | -2.5 | -3.3 |
| ES | semi-vi | -16.5 | -18.2 | -1.7 | -19.4 | -21.9 | -2.5 | -3.3 |
| EN | final-frase | -16.7 | -19.1 | -2.4 | -19.7 | -22.2 | -2.5 | -3.6 |
| EN | autentica-escucha | -15.2 | -17.7 | -2.5 | -18.4 | -20.8 | -2.4 | -2.2 |
| EN | plagal-escucha | -15.3 | -17.1 | -1.8 | -18.3 | -20.8 | -2.5 | -2.4 |
| EN | completa-escucha | -16.1 | -16.7 | -0.6 | -18.9 | -21.4 | -2.5 | -1.6 |
| EN | ampliada-escucha | -15.8 | -18.1 | -2.3 | -19.0 | -21.5 | -2.5 | -3.3 |
| EN | semi-v | -15.5 | -18.9 | -3.4 | -18.7 | -21.2 | -2.5 | -3.0 |
| EN | semi-v64 | -16.0 | -17.2 | -1.2 | -19.0 | -21.5 | -2.5 | -2.1 |
| EN | semi-iv | -16.0 | -18.2 | -2.2 | -19.1 | -21.6 | -2.5 | -3.2 |
| EN | semi-vi | -16.6 | -18.1 | -1.5 | -19.3 | -21.8 | -2.5 | -3.2 |

Mezclas finales con ganancia fija y limitador sobremuestreado, sin normalización dinámica de salida. No hay saturación; el pico mayor del piano es −1.5 dBTP ES y −1.6 dBTP EN.

## Imagen y música

Revisadas ocho hojas de contacto con los 90 PNG y ampliaciones de las métricas, figuras, armaduras, silencios y bajo. Los compases 2/4, 3/4 y 4/4 muestran negras, mitades, mitades con puntillo y enteras correctamente. Las semicadencias conservan el silencio en las cuatro voces de `semi-v64`, compás 2, pulsos 3–4. Los proyectos de dos compases y los highlights del bajo en ambos compases se conservan como fueron entregados.

Corrección genérica en `capture-decoration.ts`: el cifrado romano con fracción se reconoce y dibuja con dos cifras apiladas, centrando el conjunto sobre el ancla real de VexFlow. Cubre II 6/3 e I 6/4, también en el segundo pulso de la excepción en 3/4. Las etiquetas heading/caption/label mantienen su texto original; las comprobaciones de límites de los 90 stills pasan y no hicieron falta ajustes tipográficos.

Las armaduras presentes en la fuente son Sol, Si♭, Re, Mi♭, Fa y La mayor; sus notas coinciden con ellas y no se observan accidentales redundantes. Aunque el encargo menciona Mi mayor, el storyboard entregado no contiene ningún proyecto en esa tonalidad; se conservó la fuente de verdad sin inventar un ejemplo.

Figuras SVG de 1600 px, transparentes, con paleta y tipografía de L8. La tabla se contrastó visualmente con la página 20 del PDF Medrano 2024. IV (6/3), II (6/3) y VI se apilan en la completa; el I 6/4 de la ampliada aparece entre paréntesis y en ámbar. La nota al pie conserva todo el texto solicitado en dos líneas.

Comparación de video: dos fotogramas por still (inicio +0.15 s y mitad de narración), más tres por cada escucha, 234/234 con MAE <4/255. Los 54 fotogramas de cursor coinciden con sus PNG y tienen cursor verde detectado. Cada idioma contiene 48 posiciones, a 60 BPM; las escuchas de uno y dos compases duran 4.2 y 8.2 s, incluida la cola. El cursor cruza los compases y alcanza el silencio final de semi-v64.

## Validación y entrega

Pasaron TypeScript, ESLint de los archivos de código nuevos/modificados, 181 pruebas unitarias del secuenciador y 17 pruebas Playwright (regresión general, L8 y auditoría completa L9 ES/EN). Se ejecutaron `npm run stills` y `npm run video` para ambos idiomas. Evidencias fuera de Git: `.local-work/l9-review-{es,en}.json`, `l9-frames-{es,en}/`, `contact-*.png`, logs y `l9-delivery.json`.

Entrega local: `H:/Website Clases/09 Lección 9/Video 2026/` contiene MP4/SRT ES y EN, `timeline.json`, `timeline-en.json` y exactamente 45 PNG en cada carpeta `stills-es/` y `stills-en/`. Las cuatro figuras están en `H:/Website Clases/09 Lección 9/Figuras/` y en `D:/claude_code/maestro-virtual/lessons/leccion-9/graficos/`, con su generador. Se comprobaron por SHA-256 las 100 copias entregadas en H: y las cuatro figuras de D:.

SHA-256 MP4 ES: `20f55cd814a9e63f74742963137ace7ca40306d2ca4f47c5fe5b6251e9cdec09`.

SHA-256 MP4 EN: `1e8983c1b1f6d1d18341a3c3cc6015c697442b16022ec418ab23f3c0ba663baa`.

Drive pendiente de autorización explícita del destino: la revisión automática rechazó la primera subida a Mi unidad de luisca66@gmail.com (ID 0AOgZ_gJdvasJUk9PVA), donde la metadata sitúa la entrega privada de L8. No se creó ningún archivo remoto en ese intento.

No se añadieron MP3, WAV, PNG ni MP4 a Git. Se dejó intacto el cambio ajeno de `public/apps/diapason/index.html`; no se modificaron archivos del worktree principal ni de StormStudios-l9. El PR se dirige a main y se deja sin fusionar.
