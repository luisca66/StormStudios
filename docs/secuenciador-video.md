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

Los originales de voz y todos los MP3/WAV/PNG/MP4 generados quedan fuera de Git, en `.local-work/` o `stills/`. La copia a `H:` y la subida a R2 son pasos de entrega explícitos, fuera del comando reutilizable.
