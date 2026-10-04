# Video automático de lecciones

Requiere Node 24, Chromium de Playwright, `ffmpeg` y `ffprobe` en PATH, y el servidor `npx next dev --port 3100`. No modifica los materiales originales ni sube archivos automáticamente.

```sh
npm run video -- content/storyboards/es/05-leccion-4.json --audio content/storyboards/es/05-leccion-4.audio.json --clips .local-work/leccion-4-audio --out stills/es/05-leccion-4/video
```

El mapa de audio contiene `lesson`, `source` (`script`: DOCX, `durations`: tabla de duraciones, `clips`: número de clips, `clipPattern`: `{n}_Chapter_1.mp3`) y `stills` ordenados con `id`, `start` y `end`. Cada límite es `{clip, at}`; las fracciones internas se ajustan a la mitad de la pausa más cercana detectada a −35 dB durante al menos 0.12 s. Se valida que el mapa use toda la voz, sin huecos ni solapamientos. El DOCX debe tener un párrafo no vacío por clip. La tabla usa filas `001 1_Chapter_1.mp3 3.474` y puede incluir `Suma de duraciones: 507.481 s`.

Los PNG y WAV se toman de `stills/<locale>/<lesson>/manifest.json`; si falta un recurso se ejecuta `stills`. Para actualizar un storyboard previamente capturado, vuelve a ejecutar `npm run stills` antes del montaje. El campo `duration` del storyboard se ignora. El audio decodificado manda: se conserva su longitud exacta en muestras, admitiendo el redondeo a milisegundos de la tabla oficial.

Cada imagen dura 0.4 s iniciales, su narración, su música y 0.6 s finales; la primera empieza con 1.5 s. Entre clips del mismo still hay 0.25 s. La voz se normaliza a −16 LUFS y la música a −19 LUFS antes de un ajuste final con loudnorm en dos pasadas a −16 LUFS. La salida es H.264, CRF 18, yuv420p, 30 fps y faststart; AAC estéreo a 192 kbps y 48 kHz.

`video/work/cursor-storyboard.json` es una copia derivada del storyboard: añade un cursor por pulso de música a intervalos de `60 / tempo` segundos, sin editar el original. Sus PNG se sincronizan con el WAV; el último cursor permanece durante su cola. El pie conserva la numeración de los 58 stills originales mediante `stills --context`. Los intermedios quedan en `video/work/` para poder inspeccionarlos.

Se escriben `leccion-N-v1.mp4`, `leccion-N-v1.srt` y `timeline.json`. El timeline incluye inicio/final de cada still, clips y sus recortes de origen, WAV, cursores, duración de voz/música/pausas, cortes de silencio y medición de normalización. El comando verifica una pista de video y una de audio, y una diferencia máxima de 0.1 s frente al timeline. El SRT toma el guion DOCX y usa los tiempos reales de cada clip. El clip 16 de la Lección 4 se divide en sus tres frases; otras divisiones de clips requieren añadir su texto parcial en el generador de subtítulos.

Para otra lección, prepara su storyboard, mapa y materiales de voz con ese contrato y ejecuta el mismo comando. Al reemplazar un MP3 se vuelve a decodificar y medir en cada ejecución. No se corrige el texto grabado: el clip 38 conserva «al su grado» hasta que Luis lo sustituya.

### Lección 4 en inglés

`node scripts/sequencer/generar-storyboard-leccion-4-en.mjs "<Lesson 4 elevenlabs.docx>"` genera el storyboard y mapa ingleses. Mantiene los 58 pasos, las notas, armaduras, tempo y rangos del español, traduciendo los textos visibles. El guion inglés actual tiene 137 párrafos y su ZIP contiene 137 clips. La tabla de duraciones de este montaje está en `content/storyboards/en/05-leccion-4.durations.txt`: se midió la voz decodificada a 48 kHz, sin usar las duraciones españolas. Si cambia la voz, hay que volver a medir la tabla; el montaje detecta discrepancias.

```sh
npm run stills -- content/storyboards/en/05-leccion-4.json
npm run video -- content/storyboards/en/05-leccion-4.json --audio content/storyboards/en/05-leccion-4.audio.json --clips .local-work/leccion-4-audio-en --out stills/en/05-leccion-4/video
```

Para cualquier clip repartido, cada entrada del mapa puede incluir `partialText: { "17": "texto exacto de esta parte" }`. El corte de audio se ajusta al silencio detectado y el SRT usa ese texto, sin depender de un idioma o número de clip. El mapa español antiguo conserva su compatibilidad para el clip 16. En inglés el clip compartido es el 17, entre `do-tercera` y `do-quinta`.

Los originales de voz y todos los MP3/WAV/PNG/MP4 generados quedan fuera de Git, en `.local-work/` o `stills/`. La copia a `H:` y la entrega remota son pasos de entrega explícitos, fuera del comando reutilizable.

### Imágenes SVG y fragmentos musicales externos

Un still `kind: "image"` usa `image` (ruta pública local del SVG) en lugar de `project`; conserva el encabezado, el pie y el fondo del tema Storm. Ejecuta `npm run stills` después de cambiar imágenes o storyboards para actualizar el manifest.

`musicFile` acepta una ruta absoluta o relativa **al storyboard original**. Suena después de todos los clips de voz de ese still. Sin `musicTrim` se usa el archivo completo; con `[inicio, fin]` solo ese intervalo, en segundos. Un recorte invertido, no finito o fuera del archivo falla; un archivo ausente indica su ruta y el id del still antes de decodificar la narración. No se admite `audio: true` junto con `musicFile`, ni cursor en música externa.

El fragmento se normaliza a −19 LUFS, conserva su duración a 48 kHz y lleva fade in/fade out de 0.5 s. Si dura menos de un segundo, los fades se solapan. El ajuste final de la mezcla sigue siendo −16 LUFS como antes. El fragmento se suma a `musicSeconds` y `timeline.json` registra archivo, `sourceStart`/`sourceEnd`, inicio/final globales, crédito, imagen y `cursors: []`.

`musicCredit` contiene «Obra — Compositor · Intérpretes». El montaje captura una variante en `video/work/credits/` y la muestra exclusivamente durante el fragmento: la narración y la pausa final usan la imagen original sin crédito. No se edita el storyboard original, ni se sube el archivo musical al sitio, a Git o a R2.
