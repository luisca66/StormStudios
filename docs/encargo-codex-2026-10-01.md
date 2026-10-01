# Encargo para Codex — 1 de octubre de 2026

Dos tareas independientes en el repositorio de Storm Studios (Next 16; lee `AGENTS.md` antes de tocar rutas). Haz primero la A y después la B. Luis revisará los dos resultados **a distancia, desde el teléfono**, así que cada tarea termina con un enlace que él pueda abrir.

Reglas comunes:

- **No hagas push a `main`.** Trabaja en una rama por tarea y abre un PR con `gh`. Luis aprueba y Claude o Luis fusionan.
- No toques la v3 (`public/tools/secuenciador.html`, `public/tools/sequencer.html`, `/[locale]/sequencer`).
- Todas las funciones de la v4 deben seguir funcionando (Luis exige paridad total con la v3 y comportamiento de editor profesional).
- Antes de cada PR: `npm run lint`, `npx tsc --noEmit`, `npm test` y `npx playwright test e2e/sequencer.spec.ts e2e/sequencer-parity.spec.ts e2e/sequencer-stills.spec.ts --workers=2` (con más de 2 workers el servidor de desarrollo se satura y salen fallos falsos). El servidor de desarrollo va en el puerto 3100: `npx next dev --port 3100`.
- Nunca uses `git stash` en este repositorio (hay archivos con diferencias de fin de línea que rompen el pop).

---

## Tarea A — Pulir el diseño nuevo del secuenciador v4

Contexto: el commit `bcb2a42` agregó un tema visual nuevo al final de `components/sequencer/sequencer.module.css` en tres capas sucesivas («ATELIER», «DUSK ATELIER» y «Warm graphite»), cada una sobrescribiendo la anterior. A Luis le gusta la dirección (mesa de trabajo, controles de acero, Play dorado, LCD verde pálido, título serif, lector de nota grande). Hay que pulirlo:

1. **Una sola paleta de fondo.** Hoy compiten el fondo malva-grafito, las tarjetas azul acero y el Play dorado. Deja el fondo y la barra superior en una sola familia neutra (grafito frío o azul noche, sin malva), conserva el acero para los paneles y usa el dorado **solo** en Play y en el glifo del lector de nota.
2. **Barra superior compacta.** Título y transporte ocupan unos 175 px fijos y en la vista por páginas tapan la hoja. En escritorio (≥1280 px) pon marca, transporte y «Presentar» en una sola franja de **96 px como máximo**. Debajo de 1280 px puede volver a dos filas.
3. **Casillas de cifrado ocultas otra vez.** El tema les puso `box-shadow` interior a todos los campos y ahora se ven los recuadros vacíos bajo cada compás. Deben ser invisibles (sin fondo, borde ni sombra) salvo al pasar el mouse por el compás o al tener el foco, como antes de `bcb2a42`. La regla está en el bloque «Inline cipher boxes» del CSS.
4. **Un solo tema, sin capas muertas.** Consolida las tres capas en un bloque final único: elimina las reglas que quedan totalmente sobrescritas y los `!important` innecesarios. No cambies el DOM ni los manejadores. El resultado visual debe ser el del punto 1, no un cuarto tema.
5. **Nombres de figuras consistentes.** La interfaz ya usa los nombres del método de Luis (Entera, Mitad, Cuarto, Octavo, Dieciseisavo, Treintaidosavo). Cambia también los textos de ejemplo para que los usen: `lib/sequencer/examples.ts`, el texto inicial del cuadro «Texto musical» y `scripts/sequencer/generar-storyboard-leccion-4.mjs` (regenera `content/storyboards/es/05-leccion-4.json` con `node scripts/sequencer/generar-storyboard-leccion-4.mjs content/storyboards/es/05-leccion-4.json`). El analizador debe seguir aceptando redonda/blanca/negra… y los nombres en inglés.

**Entrega para revisión remota:** rama `codex/estudio-pulido`, PR contra `main` con capturas de 1440×900 (vista continua, vista por páginas en SATB, panel derecho) y el **enlace de Preview de Vercel** que aparece en el PR. Responde con ese enlace.

---

## Tarea B — Primer video de la Lección 4, armado automáticamente

Objetivo: producir `leccion-4-v1.mp4` (1920×1080) uniendo los 58 stills del storyboard con la voz de ElevenLabs y los ejemplos musicales, y dejar un comando reutilizable para las siguientes lecciones.

### Materiales

| Qué | Dónde |
|---|---|
| Storyboard (58 stills, narración frase por frase) | `content/storyboards/es/05-leccion-4.json` |
| Mapa still → clips de voz | `content/storyboards/es/05-leccion-4.audio.json` |
| Voz: 117 clips MP3 (mono, 44.1 kHz, 192 kbps), uno por párrafo del guion | `H:/Website Clases/04 Lección 4/ElevenLabs_Lección_4_Curso_de_Armonía.zip` → `{n}_Chapter_1.mp3` |
| Duraciones oficiales (suma 507.481 s) | `H:/Website Clases/04 Lección 4/Duraciones_Leccion_4.txt` |
| Guion (117 párrafos = 117 clips, mismo orden) | `H:/Website Clases/04 Lección 4/Guión lección 4 Astra para elevenlabs.docx` |
| Generador de stills | `npm run stills -- <storyboard>` (ver `docs/secuenciador-stills.md`) |

Extrae el ZIP a `.local-work/leccion-4-audio/` (no lo subas al repositorio). **No modifiques nada en `H:`** salvo crear la carpeta de salida indicada abajo.

### Mapa de audio

Cada still reproduce su narración desde `start` hasta `end`. `at` es la fracción del clip (0 = inicio, 1 = final). Solo el clip 16 se reparte entre tres stills («Empiezo sobre Do. / Una tercera arriba tenemos Mi, / y una tercera arriba de Mi tenemos Sol.»): corta en las pausas que encuentres con `ffmpeg -af silencedetect=noise=-35dB:d=0.12` más cercanas a 0.20 y 0.56 de su duración, a la mitad del silencio.

| # | Still | Clips de voz | Música después |
|---|---|---|---|
| 01 | `titulo` | 1–3 |  |
| 02 | `que-es-acorde` | 4–5 |  |
| 03 | `ejemplos` | 6 |  |
| 04 | `armonia` | 7 |  |
| 05 | `armonias` | 8 |  |
| 06 | `construccion` | 9–11 |  |
| 07 | `plan` | 12–13 |  |
| 08 | `escala-mayor` | 14–15 |  |
| 09 | `do-fundamental` | 16 (inicio → 0.20) |  |
| 10 | `do-tercera` | 16 (0.20 → 0.56) |  |
| 11 | `do-quinta` | 16 (0.56 → fin), 17 |  |
| 12 | `acorde-de-quinta` | 18–21 | sí |
| 13 | `sobre-re` | 22–24 |  |
| 14 | `sobre-mi` | 25 |  |
| 15 | `sobre-fa` | 26 |  |
| 16 | `sobre-sol` | 27 |  |
| 17 | `sobre-la` | 28 |  |
| 18 | `sobre-si` | 29 |  |
| 19 | `mayor-escuchar` | 30 | sí |
| 20 | `mayor-tipo-mayor` | 31–33 |  |
| 21 | `mayor-tipo-menor` | 34–35 |  |
| 22 | `mayor-tipo-disminuido` | 36–37 |  |
| 23 | `grados` | 38–39 |  |
| 24 | `mayor-resumen` | 40–42 |  |
| 25 | `escala-mayor-arm` | 43–46 |  |
| 26 | `arm-1` | 47–48 |  |
| 27 | `arm-2` | 49 |  |
| 28 | `arm-3` | 50 |  |
| 29 | `arm-4` | 51 |  |
| 30 | `arm-5` | 52 |  |
| 31 | `arm-6` | 53–55 |  |
| 32 | `arm-7` | 56 |  |
| 33 | `arm-escuchar` | 57 | sí |
| 34 | `arm-cambios` | 58 |  |
| 35 | `escala-menor-nat` | 59–60 |  |
| 36 | `nat-1` | 61–62 |  |
| 37 | `nat-2` | 63–64 |  |
| 38 | `nat-3` | 65–66 |  |
| 39 | `nat-4` | 67–68 |  |
| 40 | `nat-5` | 69–70 |  |
| 41 | `nat-6` | 71–72 |  |
| 42 | `nat-7` | 73–74 |  |
| 43 | `nat-escuchar` | 75 | sí |
| 44 | `escala-menor-arm` | 76–79 |  |
| 45 | `marm-3` | 80–81 |  |
| 46 | `marm-5` | 82–84 |  |
| 47 | `marm-7` | 85–86 |  |
| 48 | `marm-resumen` | 87–88 | sí |
| 49 | `escala-menor-mel` | 89–91 |  |
| 50 | `mel-2` | 92–94 |  |
| 51 | `mel-4` | 95–96 |  |
| 52 | `mel-6` | 97–98 |  |
| 53 | `mel-resumen` | 99–100 | sí |
| 54 | `mel-descenso` | 101–103 | sí |
| 55 | `cuatro-tipos` | 104–108 | sí |
| 56 | `regla` | 109–110 |  |
| 57 | `tarea` | 111–114 |  |
| 58 | `despedida` | 115–117 |  |

### Qué construir

1. **Audio de los ejemplos musicales.** Los stills con `audio: true` (columna «Música después») deben sonar después de su narración. Implementa la exportación WAV que hoy está reservada en `scripts/sequencer/stills.mjs`: en la página `/[locale]/sequencer/v4/stage` usa `SequencerAudio.wav(score, from, to)` de `lib/sequencer/audio-engine.ts` con el instrumento Piano y el tempo del proyecto (72). Toca solo lo **visible**: desde el inicio del rango de compases hasta la posición de `reveal` si existe, o hasta el final del rango. Las muestras se cargan por el proxy `/api/audio` en localhost. Escribe `NN-id.wav` junto al PNG y su ruta en `manifest.json` (campo `audio`).
2. **Cursor que avanza mientras suena la música.** Para cada still con música, genera stills adicionales con el campo `cursor` en cada pulso del fragmento que suena (un storyboard derivado, sin editar el original) y muéstralos en sincronía con el WAV, un pulso cada `60 / tempo` segundos.
3. **Comando de video reutilizable:** `scripts/sequencer/video.mjs` y script npm `video`:
   `npm run video -- content/storyboards/es/05-leccion-4.json --audio content/storyboards/es/05-leccion-4.audio.json --clips .local-work/leccion-4-audio --out stills/es/05-leccion-4/video`
   - Usa los PNG y el `manifest.json` de `npm run stills` (si faltan, genéralos).
   - Tiempo de cada still: 0.4 s de silencio + narración + música (si hay) + 0.6 s. Entre clips dentro de un mismo still deja 0.25 s de pausa. El primer still empieza con 1.5 s de silencio. Ignora el campo `duration` del storyboard: manda la duración real del audio.
   - Video H.264 `yuv420p`, 30 fps, CRF 18, `-movflags +faststart`. Audio AAC 192 kbps, 48 kHz, normalizado con `loudnorm` a −16 LUFS (voz y música en la misma pista; la música 3 dB por debajo de la voz).
   - Escribe también `timeline.json` (inicio y fin de cada still, clips y WAV usados) y `leccion-4-v1.srt` con el texto de cada clip tomado del guion `.docx` en sus tiempos reales (sirve para subtítulos de YouTube).
   - Verifica: la duración total del MP4 debe ser 507.481 s de voz + música + pausas, con ±0.1 s de tolerancia frente a la suma de `timeline.json`. Revisa con `ffprobe` que haya una pista de video y una de audio.
4. **Copia de trabajo para Luis:** copia el MP4, el SRT y `timeline.json` a `H:/Website Clases/04 Lección 4/Video 2026/` (crea la carpeta).

### Entrega para revisión remota

- Sube el MP4 a Cloudflare R2 (Wrangler ya tiene sesión de Luis en esta PC):
  `npx wrangler@4 r2 object put storm-samples/borradores/leccion-4/leccion-4-v1.mp4 --file <mp4> --content-type video/mp4 --cache-control "no-cache" --remote`
  El enlace queda en `https://samples.stormstudios.com.mx/borradores/leccion-4/leccion-4-v1.mp4` (no listado; no lo enlaces desde el sitio). Comprueba con `curl -I` que responde 200 y `video/mp4`.
- Rama `codex/video-leccion-4` con el comando, la exportación WAV y sus pruebas (no subas MP3, WAV, PNG ni MP4 al repositorio), y un PR contra `main`.
- Responde con: el enlace del video, el enlace del PR, la duración final, y cualquier still cuya música o corte del clip 16 debas revisar.

### Aviso para Luis (no lo corrijas tú)

El clip 38 dice «el acorde respectivo **al su** grado»: es una errata del guion que quedó grabada. Si Luis vuelve a generar ese clip en ElevenLabs con «a su grado», basta con reemplazar `38_Chapter_1.mp3` y volver a correr `npm run video`.
