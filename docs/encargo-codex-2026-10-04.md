# Encargo para Codex — 4 de octubre de 2026

Cuatro tareas en el repositorio de Storm Studios (lee `AGENTS.md` antes de tocar rutas). Hazlas en orden: A, B, C y D (D depende de B y C). Cada una va en su propia rama y su propio PR. Luis revisa desde el teléfono, así que cada PR debe incluir capturas y el enlace de Preview de Vercel.

Reglas comunes (las mismas del encargo del 1 de octubre):

- **No hagas push a `main`.** Abre una rama por tarea y un PR con `gh`.
- Antes de cada PR: `npm run lint`, `npx tsc --noEmit` y `npm test`. Para C, también `npx playwright test e2e/sequencer-stills.spec.ts --workers=2` con `npx next dev --port 3100`.
- Nunca uses `git stash` en este repositorio.
- No subas MP3, WAV, PNG ni MP4 al repositorio.

Los materiales de la Lección 5 los preparó Claude en el workspace del Maestro Virtual: `D:/claude_code/maestro-virtual/lessons/leccion-5/` (léelo como fuente; no lo modifiques).

---

## Tarea A — Tablas de las lecciones

**Problema:** `MDXRemote` se usa sin `remark-gfm`, así que las tablas Markdown salen como texto con barras `|`. Ya pasa en producción en la Lección 4 (ES y EN: la tabla de los cuatro tipos de acordes de quinta).

1. Convierte la tabla de `content/course/es/05-leccion-4.mdx` y la de `content/course/en/05-leccion-4.mdx` a `<table>` HTML con `<thead>`/`<tbody>`, sin cambiar el texto (las negritas pasan a `<strong>`).
2. En `app/storm-studios.css`, añade estilos para `.blog-prose table`, `th` y `td`, coherentes con el resto de `.blog-prose`. Referencia ya revisada por Claude:

   ```css
   .blog-prose table{width:100%;border-collapse:collapse;margin:0 0 2rem;font-size:.9rem}
   .blog-prose th,.blog-prose td{border-bottom:1px solid rgba(255,255,255,.08);padding:.5rem .6rem;text-align:left;vertical-align:top}
   .blog-prose th{color:#f0eeff;font-weight:600;border-bottom-color:rgba(139,92,246,.4)}
   ```

   En móvil, una tabla más ancha que la pantalla debe desplazarse dentro de su contenedor sin desbordar la página. Puedes envolverla en `display:block; overflow-x:auto` o en un contenedor equivalente.
3. No añadas `remark-gfm` en este PR. Agregar una dependencia es otra decisión.

**Entrega:** rama `codex/tablas-lecciones`, PR con capturas de la Lección 4 en ES y EN, a 1440 px y a 375 px.

---

## Tarea B — Lección 5 teórica en el sitio (sigue en construcción)

Luis decidió que la Lección 5 sea **explicativa, sin tarea ni Maestro Virtual**. Cubre grados, acordes por terceras, «las armonías», regiones tonales y tonalidad. El cuarteto vocal pasa a una lección posterior. La lección **sigue con `status: "construction"`** hasta que estén el video y los audios.

1. `content/course/es/06-leccion-5.mdx` y `content/course/en/06-leccion-5.mdx`: reemplázalos con `lessons/leccion-5/es.mdx` y `en.mdx` del workspace, sin cambios.
2. Copia `lessons/leccion-5/graficos/*.svg` (14 archivos) a `public/images/curso/leccion-5/` y `lessons/leccion-5/graficos/video/*.svg` (34 variantes con una parte resaltada, solo para el video) a `public/images/curso/leccion-5/video/`. No copies la carpeta `preview/`.
3. En `app/storm-studios.css`, añade el contenedor de figuras que usa el MDX:

   ```css
   .blog-prose .lesson-figure{overflow-x:auto;margin:1.5rem 0 2rem;-webkit-overflow-scrolling:touch}
   .blog-prose .lesson-figure img{display:block;width:100%;min-width:600px;height:auto}
   .blog-prose .lesson-figure.wide img{min-width:960px}
   ```

   Si A ya está fusionada, haz *rebase*; las tablas de la Lección 5 dependen de los estilos de A.
4. `data/course/lessons/06-leccion-5.ts`:
   - título ES «Lección 5 — Grados, acordes y tonalidad»; EN «Lesson 5 — Degrees, Chords and Tonality»;
   - descripción ES «Nombres y funciones de los grados, acordes por terceras, las armonías y la serie de armónicos, regiones tonales y el círculo de quintas.»; EN «Degree names and functions, chords in stacked thirds, the harmonies and the harmonic series, tonal regions and the circle of fifths.»;
   - sin `exercise` ni `feedback`, `activeRules: []`, `videos: []`, `estimatedMinutes: 30`;
   - tags acordes a los temas nuevos.
5. `data/course/lessons/lesson-configs.ts`: elimina la entrada `'06-leccion-5'` (`satb`). Sin ejercicio, la página ya no muestra el formulario.
6. `app/api/maestro-virtual/check/route.test.ts`, prueba «normalizes unsupported locale values before returning SATB feedback»: hoy depende de `06-leccion-5` como lección SATB. Consérvala con otra lección SATB de prueba, o pásala a validar el 400 de lección desconocida, manteniendo la comprobación de `cache-control` y de la normalización de idioma.
7. `data/seo/localized-slugs.ts`: el slug inglés `06-lesson-5-second-inversion-64-cadence` ya no corresponde; usa `06-lesson-5-degrees-chords-tonality`. Como la lección nunca se publicó, no hace falta redirección; confírmalo revisando si hay una redirección o un sitemap que lo referencie.
8. No toques `content/storyboards/es/borradores/06-leccion-5.json`. Es un borrador obsoleto de Gemini y Claude lo reemplazará.

**Entrega:** rama `codex/leccion-5-teorica`, PR con capturas de la página ES y EN a 1440 px y a 375 px, mostrando el círculo de quintas y la serie de armónicos.

---

## Tarea C — Stills de imagen y ejemplos musicales externos en el video

El video de la Lección 5 necesita dos cosas que el pipeline aún no hace:

- mostrar como still un gráfico SVG (círculo de quintas, serie de armónicos con las etapas);
- reproducir, después de la voz de un still, un fragmento MP3 de una obra (los 9 ejemplos de «las armonías»), en lugar del WAV de piano del secuenciador.

### C1. `kind: "image"` en el storyboard

En `lib/sequencer/storyboard.ts`, `Still` acepta `kind: "image"` con:

```ts
image?: string; // ruta pública, p. ej. "/images/curso/leccion-5/circulo-quintas-es.svg"
```

`StillStage` lo dibuja centrado en el lienzo, con `heading` y `caption` arriba como en los stills de partitura, y escalado para caber sin deformarse. El fondo del tema `storm` se conserva: los SVG son claros sobre transparente. `npm run stills` lo captura igual que los demás.

### C2. Fragmentos musicales externos

`Still` acepta además:

```ts
musicFile?: string;              // ruta relativa al storyboard o absoluta, p. ej. "../../../.local-work/06-leccion-5-musica/01-monodia.mp3"
musicTrim?: [number, number];    // segundos [inicio, fin] dentro del archivo; opcional
musicCredit?: string;            // «Obra — Compositor · Intérpretes», visible en el still mientras suena
```

- En `scripts/sequencer/video.mjs`, el fragmento suena después de la voz del still, igual que la música de `audio: true`. Lleva *fade in* y *fade out* de 0.5 s, se normaliza a −19 LUFS como la música actual y se registra en `timeline.json` y en la suma de `musicSeconds`.
- No tiene cursores. `audio` y `musicFile` son excluyentes en el mismo still; valídalo.
- `musicCredit` se dibuja como una línea pequeña al pie mientras suena. Si eso exige un PNG distinto, genera una variante del still, como ya se hace con los cursores.
- Si falta el archivo, falla con un mensaje claro que nombre el still.
- Añade pruebas unitarias y extiende `e2e/sequencer-stills.spec.ts` con un still de imagen.
- Documenta ambos campos en `docs/secuenciador-stills.md` y `docs/secuenciador-video.md`.

**Entrega:** rama `codex/video-imagen-musica`, PR con un video corto de prueba (3 stills: título, imagen SVG y uno con `musicFile`). Puedes usar cualquier MP3 local de prueba que no se suba al repositorio. Incluye las capturas del still de imagen.

---

## Tarea D — Montaje del video de la Lección 5 (ES y EN), después de B y C

Claude ya preparó todo lo demás. No modifiques la narración ni la música. Si algo no cuadra, detente y repórtalo.

| Qué | Dónde |
|---|---|
| Guion, una frase por clip (133 por idioma; ES y EN alineados línea a línea) | `content/storyboards/{es,en}/06-leccion-5.guion.txt` y `.guion.docx` |
| Storyboards (90 stills por idioma, misma música y encuadres) | `content/storyboards/{es,en}/06-leccion-5.json`, generados con `node scripts/sequencer/generar-storyboard-leccion-5.mjs` |
| Mapas de audio (cada still cubre clips completos, sin cortes internos) | `content/storyboards/{es,en}/06-leccion-5.audio.json` |
| Duraciones | `content/storyboards/{es,en}/06-leccion-5.durations.txt` (ES 654.4 s, EN 600.9 s) |
| Voz: clon de Luis en ElevenLabs (`eleven_v4`, estabilidad 0.62), verificada por transcripción | `.local-work/06-leccion-5-audio-{es,en}/{n}_Chapter_1.mp3`; copia en `H:/Website Clases/05 Lección 5/` |
| Ejemplos musicales de las 9 etapas (los entrega Luis) | `.local-work/06-leccion-5-musica/01-monodia.mp3` … `09-microtonalismo.mp3` |

1. Incluye en el PR de C (o en uno nuevo, `codex/video-leccion-5`) el generador, los guiones, los storyboards, los mapas y las duraciones. No incluyas audio.
2. Cuando estén los MP3 de las etapas, Claude añadirá `musicTrim` y `musicCredit` a cada still de etapa en el generador. Después ejecuta, para `es` y `en`:

   ```sh
   npm run stills -- content/storyboards/<locale>/06-leccion-5.json
   npm run video -- content/storyboards/<locale>/06-leccion-5.json --audio content/storyboards/<locale>/06-leccion-5.audio.json --clips .local-work/06-leccion-5-audio-<locale> --out stills/<locale>/06-leccion-5/video
   ```

3. Entrega MP4, SRT y `timeline.json` en `H:/Website Clases/05 Lección 5/Video 2026/` (sufijo `-en` para inglés) y una copia privada en el Drive de Luis. Claude hace la revisión del paso 6 de la skill `video-leccion` antes de que Luis la reciba.
