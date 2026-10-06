---
name: video-leccion
description: Produce the video of a Storm Studios harmony-course lesson, in Spanish and English, from Luis's script and his ElevenLabs voice clips — storyboard of stills rendered with Sequencer v4, still→clip audio map, MP4 with narration, sequencer music, beat cursors and SRT, then a frame/audio review and remote delivery. Use when Luis asks for a lesson video ("haz el video de la lección 5", "ya bajé el audio de ElevenLabs", "arma la versión en inglés"), for a lesson storyboard or stills, or to review a rendered lesson video.
---

# Video de una lección (ES + EN)

Flujo probado con la Lección 4 (1 de octubre de 2026): 58 stills, 117 clips de voz, 10 min 38 s. Cada lección se publica en **español y en inglés**: mismos stills y misma música; cambian los textos en pantalla, la narración, el audio y los subtítulos.

Documentación técnica que esta skill no repite: `docs/secuenciador-stills.md` (contrato del storyboard y `npm run stills`) y `docs/secuenciador-video.md` (montaje, tiempos, mezcla y salidas de `npm run video`). Contrato de tipos: `lib/sequencer/storyboard.ts`.

## Qué entrega Luis por idioma

Todo en `H:/Website Clases/<NN> Lección <N>/`. **No se modifica nada ahí** salvo crear `Video 2026/`.

1. **Guion `.docx`**: un párrafo por clip de ElevenLabs, en el orden de grabación. Es la fuente de verdad del texto hablado, con sus erratas incluidas.
2. **ZIP de ElevenLabs**: `{n}_Chapter_1.mp3`, uno por párrafo.
3. **`Duraciones_Leccion_<N>.txt`**: filas `001 1_Chapter_1.mp3 3.474`.

Comprueba antes de empezar: número de párrafos = número de MP3 = filas de duraciones. Si no coinciden, para y pregúntale a Luis.

## Reparto

- **Claude**: lee el guion, decide los stills, escribe la música exacta (grafía correcta, armaduras, cifrados), hace la revisión final y redacta los encargos.
- **Codex**: herramientas y montaje (`stills.mjs`, `video.mjs`), ramas y PR. El encargo va en `docs/encargo-codex-<fecha>.md` y Luis lo pega en Codex.
- **Luis**: aprueba los PR y la música; genera los audios. Nada va a `main` sin su OK; los PR son de Codex.

## Pasos

### 1. Storyboard en español

`content/storyboards/es/<lessonId>.json`, generado por un script `scripts/sequencer/generar-storyboard-leccion-<N>.mjs` (modelo: el de la Lección 4). Usa un script porque la música repetida (escalas, series de acordes, `reveal` progresivo) se escribe mejor con funciones que a mano.

- `narration` de cada still = texto **literal** de párrafos consecutivos del guion; no la corrijas. Un párrafo puede repartirse entre varios stills (Lección 4: el clip 16 cubre 3 stills) y un still puede abarcar varios párrafos.
- Un still por idea visual que la narración nombra. Mismo proyecto y encuadre en stills consecutivos; para construir, cambia solo `reveal`, `highlights` y `marks`.
- `audio: true` donde el guion dice «vamos a escuchar», «escuchemos», «voy a reproducirlos»: la música suena después de la voz del still.
- Nombres de figuras del método de Luis en el texto musical: entera, mitad, cuarto, octavo… (el analizador acepta también redonda/negra y los nombres en inglés).
- Escalas menores con armadura menor (`key: "Cm"`) y las alteraciones de armónica/melódica escritas (decisión de Luis, Lección 4).

### 2. Stills

Servidor: `npx next dev --port 3100`. Después: `npm run stills -- content/storyboards/es/<lessonId>.json`. Revisa las hojas de contacto antes de seguir: música correcta, resaltados sobre el acorde correcto, nada tapado.

### 3. Mapa de audio

```sh
npm run mapa-audio -- content/storyboards/es/<lessonId>.json --docx "<guion.docx>" --durations "<Duraciones.txt>" --zip "<ElevenLabs.zip>"
```

Escribe `content/storyboards/es/<lessonId>.audio.json`. Tolera erratas pequeñas grabadas en el audio; si la narración de un still no aparece en el guion, se detiene y muestra el still y ambos textos. Corrige el storyboard, no el guion. Anota los clips repartidos entre stills que reporte: el SRT necesita su texto parcial.

### 4. Video

Extrae el ZIP a `.local-work/<lessonId>-audio-es/` y ejecuta:

```sh
npm run video -- content/storyboards/es/<lessonId>.json --audio content/storyboards/es/<lessonId>.audio.json --clips .local-work/<lessonId>-audio-es --out stills/es/<lessonId>/video
```

### 5. Versión en inglés

- `content/storyboards/en/<lessonId>.json`: copia del español con `locale: "en"`, `title`, `heading` y `caption` traducidos, y **los mismos `projects`, música, `reveal`, `highlights` y `audio`**. Nombres de notas en inglés (C, D, E♭…); grados y cifrados iguales. Las etiquetas (`label`) se traducen: «mayor» → «major», «5ª justa» → «P5», «semitono» → «half step».
- `narration` en inglés: si el guion inglés tiene los mismos párrafos y en el mismo orden que el español, toma para cada still los párrafos de su mismo rango de clips del mapa español. Los párrafos repartidos entre stills se dividen a mano. Si los párrafos no coinciden, alinéalos leyendo ambos guiones.
- Después, los pasos 2–4 con `en` en lugar de `es` y el ZIP inglés en `.local-work/<lessonId>-audio-en/`.

### 6. Revisión (Claude)

No se puede «ver» el MP4: se revisa por partes, con `ffprobe`/`ffmpeg`.

- **Formato**: 1920×1080, H.264 yuv420p 30 fps, AAC 48 kHz. Duración = suma de voz + música + pausas de `timeline.json`, con ±0.1 s. La voz debe igualar la suma de `Duraciones.txt`.
- **Continuidad**: todos los clips usados una vez y en orden; stills contiguos, sin huecos.
- **Sincronía de imagen**: para cada still, extrae un fotograma al inicio (+0.15 s) y otro a mitad de su narración y compáralos con su PNG (diferencia media en gris < 4 sobre 255). En la Lección 4 los 116 coincidieron.
- **Audio**: `volumedetect` en cada tramo de música frente a la voz del mismo still: la música queda 2–3 dB por debajo y nunca satura. Revisa que el inicio sea silencio limpio.
- **Cursor**: tres fotogramas durante la música de un still con `audio`; el cursor debe avanzar pulso a pulso sobre los acordes.
- **Música**: amplía los stills con alteraciones y armaduras y revísalos como músico (sin alteraciones redundantes; becuadros donde la escala sube grados).
- **SRT**: una entrada por clip, más las divisiones de clips repartidos.
- **Entrega remota**: confirma que el archivo privado de Drive tiene la **última** versión y el mismo tamaño que la copia local. Luis publica el video editado en YouTube.

### 7. Entrega

- Copia MP4, SRT y `timeline.json` a `H:/Website Clases/<NN> Lección <N>/Video 2026/` (sufijo `-en` para inglés).
- Entrega el MP4 local y una copia privada en el Drive de Luis para revisión desde el teléfono. No subas videos a R2: Luis añade sus logos y entrada/salida en Vegas y los publica en su canal de YouTube. Cuando dé el embed aprobado, incorpóralo al sitio.
- No se suben al repositorio MP3, WAV, PNG ni MP4 (`.local-work/` y `stills/` están fuera de Git).

## Lecciones aprendidas (añade una línea después de cada video)

- **L4 (2026-10-01)**: un acorde de cuarto tras «vamos a escucharlo» dura ~1 s, demasiado poco. Usa entera o repítelo.
- **L4**: las series de 8 acordes en cuartos a 72 BPM (0.83 s cada uno) son rápidas para distinguir calidades de oído; considera mitades o 60 BPM.
- **L4**: la errata grabada «respectivo al su grado» (clip 38) se respeta en el mapa; si Luis regenera el clip, basta con reemplazar el MP3 y volver a montar.
- **L4**: la primera versión remota quedó desactualizada tras un cambio de armadura. Después de cada cambio, vuelve a subir el MP4 y verifica el enlace.
- **L4**: las escalas menores se escriben con armadura de Do menor (decisión de Luis).
- **L4 EN (2026-10-01)**: el DOCX final y ZIP tienen 137 párrafos/clips; no reutilizar los índices del español. El clip 17 se reparte entre la tercera y quinta, con `partialText` explícito para el SRT. Misma música y 58 pasos visuales; los tiempos siguen la voz inglesa.
- **Entrega acordada con Luis**: los videos se entregan para su edición en Vegas y publicación en YouTube; no subirlos a R2. Esta decisión reemplaza las instrucciones de R2 anteriores.

- **Tutorial secuenciador (2026-10-02)**: grabar el editor real con CDP y conservar tiempos del compositor; animar el cursor en Chromium para que la comunicación con Playwright no alargue cada paso. Convertir JPEG a rango limitado explícito (`yuv420p`). Medir la latencia del cursor en el video codificado y compensarla al colocar el WAV; en esta captura hicieron falta 60–68 ms en dos escuchas. Los resaltados deben evitar la cabecera fija. Para Piano Roll hace falta un compás libre, porque arrastrar no reemplaza eventos ocupados. En la ronda 2 se conserva Piano en el plan y se usa Synth únicamente como override de prueba.

- **Tutorial secuenciador, ronda 2 (2026-10-02)**: capturar PCM de la salida real con AudioWorklet para incluir todas las vistas previas. Vincular muestras y compositor con getOutputTimestamp; detectar anillos e insignias en video y corregir el tramo completo, preservando la continuidad 50–52. Normalizar las notas breves en dos pasadas; mantener ducking suave de 3.5 dB. Servir el módulo temporal desde /vendor/ para evitar el enrutado de idiomas. Conservar Piano en los materiales; usar Synth solo como override local.

- **Tutorial secuenciador EN (2026-10-02)**: la voz inglesa salió ~18 % más corta (352 s contra 432 s); bastó reescalar los «at» de 10 clips con la razón EN/ES. Revisar a tamaño completo un fotograma de cada pantalla: la hoja de contactos no dejó ver que el título nuevo del proyecto salía «Sin título» en inglés (bug del producto, ya corregido).

- **Prueba de herramientas C (2026-10-04)**: esperar `img.decode()` antes de capturar SVG; usar una variante con crédito únicamente durante la música externa y conservar el PNG original para voz y pausa. Resolver MP3 desde el storyboard original y validar el final del recorte antes de montar. Prueba de 3 stills: 28.433 s, 6 s de música, siete fotogramas con diferencia media en gris < 4.

- **L5 ES (2026-10-04)**: recortar el viewBox del SVG y ampliar sus etiquetas mejora el círculo de quintas a 1080p. Los nueve ejemplos completos de Cubase suman 175.848 s; junto al piano suman 192.715 s. Validar el tiempo total incluyendo música y pausas, no solo voz: 948.967 s de MP4.
- **L5 EN (2026-10-04)**: con 133 clips completos y mapas alineados se reutilizan los mismos 90 stills, música y pausas; la voz inglesa de 600.880 s da un MP4 de 895.444 s. Verificar metadatos privados y tamaño de cada copia de Drive después de subirla.

- **L5, revisión de sonoridad (2026-10-04)**: la doble pasada lineal de música evita la compresión dinámica del fragmento, pero no garantiza la diferencia respecto a voz en el MP4. Ars nova, clásico y expresionismo necesitan ganancia limitada por pico a −4.5 dBTP; el ajuste final de mezcla también puede caer en dinámico. Medir EBU R128 por segmento después de AAC y reportar los valores fuera de objetivo antes de considerar aprobado el audio.

- **L5, limitador y mezcla fija (2026-10-04)**: sobremuestrear el limitador a 192 kHz, desactivar autonivel y compensar su latencia. Añadir 3 s de silencio de análisis y recortarlo de la salida vacía el buffer de loudnorm y mejora la medición de clips cortos. Con música lineal a −19 LUFS y ganancia fija/limitador final, ambos MP4 miden −16.0 LUFS / −1.4 dBTP; 17/18 tramos cumplen la diferencia solicitada, impresionismo ES queda −1.9 LU. Respetar el encargo de reportar el desvío sin iteraciones adicionales.

- **L6 ES/EN (2026-10-05)**: en SATB, reservar margen para Contralto, centrar sistemas de 1–3 compases y separar las redondas de las firmas; las marcas necesitan su propio espacio bajo cada pentagrama. Se conservaron seis PNG de L4/L5 sin diferencias. Normalizar a −19 LUFS no dejó el Piano a 2–3 dB RMS de la voz: calibrar cada escucha con volumedetect y comprobar el MP4 después de AAC dio −2.5/−2.6 dB; reportar LUFS por separado. 76 stills, 118 clips por idioma, 328 fotogramas correctos; videos de 656.167 s y 609.933 s. Los guiones TXT requieren una línea no vacía por clip; actualizar Drive después del ajuste final y verificar tamaños.

- **L7 ES/EN (2026-10-06)**: los reveals y highlights de mitades/cuartos se revisan por pulso conservando los 9 compases; las voces SATB ocultas permiten ampliar el sistema sin perder etiquetas. Verificar el rango musical también cuando empieza en el compás 3 y comparar tres cursores por escucha contra sus PNG. 79 stills y 117 clips por idioma; 340 fotogramas correctos, 672.880 s / 638.733 s. Las ocho escuchas quedaron entre −2.4 y −2.6 dB RMS tras AAC, aunque los enlaces dieron Δ LU de 0 a +0.5: reportar RMS y LUFS por separado.

- **L7 v2 ES/EN (2026-10-06)**: el renderizador de imágenes ya llena 1760×670 con `object-fit: contain`; recortar el viewBox del SVG amplía la figura sin cambiar L5. Revisar también los cuatro recapitulativos y retirar etiquetas de highlights cuando invaden la voz superior. La entrega v2 requiere reemplazar bytes con Drive `files.update` para conservar IDs y enlaces, y comprobar después tamaño y permisos privados.

- **L7 v3 ES/EN (2026-10-06)**: al añadir una frase y un still, validar de nuevo los 118 clips y retirar PNG obsoletos por nombre contra el manifest (el render no los borra). Tres cuartos y un silencio por compás conservan los 36 pulsos del cursor. 344 fotogramas correctos; 683.733 s / 647.880 s, ocho escuchas entre −2.4 y −2.7 dB RMS tras AAC. Ante error interno de Drive, leer metadata antes de reintentar y comprobar tamaño y privacidad al terminar.

- **L7 v4 ES/EN (2026-10-06)**: al cambiar la composición de un SVG, limpiar las carpetas completas de stills antes de renderizar y revisar también sus recapitulativos. La figura de intervalos en dos filas conserva notas y etiquetas legibles a 1080p. 80 stills y 118 clips por idioma; 344/344 fotogramas correctos, 683.733 s / 647.880 s y ocho escuchas entre −2.4 y −2.7 dB RMS. Reemplazar Drive con `files.update` y comprobar nombre, tamaño y permiso exclusivo del propietario conserva los enlaces privados.

## Mejoras pendientes de las herramientas

- El montaje ya acepta `partialText` en el mapa para clips repartidos. Pendiente: que `mapa-audio` lo genere automáticamente (el generador inglés de L4 ya lo incluye).
- Script `traducir-storyboard` que cree el storyboard inglés desde el español usando los rangos de clips del mapa.
- Script `revisar-video` que haga automáticamente la revisión del paso 6.
