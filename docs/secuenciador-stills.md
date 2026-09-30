# Stills de lecciones para agentes

El agente escribe un storyboard JSON y ejecuta un comando. Chromium renderiza VexFlow en `/<locale>/sequencer/v4/stage` y captura exclusivamente `[data-testid="still"]`. No requiere mouse ni interacción con el editor.

## De la lección al storyboard

1. Lee `content/course/<locale>/<lesson>.mdx` y su narración. Haz una lista de las ideas musicales que se nombran.
2. Usa **un still por idea que la narración nombra**: una nota nueva, un intervalo, un cambio de acorde o una voz que se explica. No conviertas cada oración en una imagen si la idea visual no cambia.
3. Escribe la música completa una sola vez en `projects`. Reutiliza el mismo proyecto para las construcciones progresivas.
4. Para mostrar nota a nota, pon `reveal` en la posición de la primera nota que debe permanecer oculta. Las notas anteriores aparecen; las de esa posición y posteriores tienen opacidad cero y conservan el espacio de VexFlow.
5. Mantén **el mismo proyecto, rango de compases, voces, formato y encuadre en stills consecutivos**. Cambia reveal, marcas y resaltados sin recortar la partitura. Usa encabezados cortos, con una o dos líneas de caption.
6. Añade `narration` y `duration` para el futuro montaje. Genera las imágenes y revísalas antes de editar el video.

Ejemplo completo: `content/storyboards/es/ejemplo-intervalos.json`. Contiene ocho stills: título, tres notas sucesivas, los dos semitonos, notas coloreadas y SATB I–V con foco en el bajo.

## Ejecución

Con el servidor de desarrollo existente en el puerto 3100:

```sh
npm run stills -- content/storyboards/es/ejemplo-intervalos.json
npm run stills -- content/storyboards/es/ejemplo-intervalos.json --only semitono-mi-fa,satb-bajo --out stills/revision
npm run stills -- content/storyboards/es/ejemplo-intervalos.json --base http://localhost:3101
```

Si Chromium no está instalado: `npx playwright install chromium`. El comando no inicia servidores. Si no hay servidor disponible en 3100, inicia `npx next dev --port 3101` y usa `--base http://localhost:3101`.

| Argumento | Significado |
| --- | --- |
| `<storyboard.json>` | Archivo JSON obligatorio, relativo al directorio actual o absoluto |
| `--out <dir>` | Carpeta de salida, relativa al directorio actual; por defecto `stills/<locale>/<lesson>` |
| `--base <url>` | Origen del sitio; por defecto `http://localhost:3100` |
| `--only id1,id2` | Exporta únicamente esos ids, conservando el orden y número original del storyboard |
| `--help` | Muestra la sintaxis |

Los PNG se llaman `NN-id.png`; `NN` es el índice de origen, empezando en 01. El manifest se escribe al terminar correctamente. Una ejecución vuelve a escribir los archivos seleccionados y el manifest; no elimina PNG de ejecuciones anteriores. Con `--only`, el manifest incluye solo la selección: usa un `--out` separado si quieres conservar el manifest completo. Los errores salen por stderr y devuelven código distinto de cero; una ejecución fallida puede haber dejado PNG parciales.

## Referencia JSON (versión 1)

El contrato de tipos está en `lib/sequencer/storyboard.ts`; `validateStoryboard(unknown)` devuelve una copia validada o lanza un error con la ruta del campo y el id del still afectado. Se rechazan campos desconocidos para detectar errores de escritura.

| Campo raíz | Tipo y comportamiento |
| --- | --- |
| `version` | Obligatorio: `1` |
| `lesson` | Identificador obligatorio, letras, números, guion y guion bajo; comienza con letra o número |
| `locale` | Obligatorio: `es` o `en` |
| `title` | Título obligatorio del video, guardado en manifest |
| `format` | Opcional: `{aspect, width, theme}` |
| `projects` | Objeto obligatorio que asocia nombres con fuentes de partituras; puede estar vacío si solo hay títulos |
| `stills` | Lista obligatoria no vacía; el orden determina la secuencia |

`format.aspect`: `16:9` (por defecto), `9:16` o `1:1`. Tamaños por defecto: **1920×1080**, **1080×1920** y **1080×1080** respectivamente. `width` es un entero opcional de 64 a 7680 píxeles; escala el lienzo completo. La altura se redondea al entero más cercano manteniendo la proporción. `theme`: `storm` (oscuro, papel claro) o `paper` (todo claro). Se captura a un píxel por píxel CSS.

### Fuentes de proyectos

Cada proyecto admite exactamente una alternativa:

```json
{ "file": "../../../scores/mi-partitura.json" }
```

La ruta se resuelve **desde la carpeta del storyboard**, no desde el directorio de ejecución. El CLI lee el JSON del editor y lo incrusta antes de validar. `resolveProject` es puro y no lee archivos: si recibe `{file}`, indica que falta incrustarlo.

```json
{ "score": { "version": 1, "...": "objeto Score completo exportado por el editor" } }
```

`score` debe contener el objeto completo real; los puntos suspensivos de arriba son solo ilustrativos. La importación usa `importScore` y sus reglas de validación/migración.

```json
{
  "setup": { "mode": "single", "title": "Do mayor", "key": "C", "time": [4, 4], "measures": 2, "tempo": 80, "clef": "treble" },
  "text": "voz melody\ncompas 1\nC4 negra; D4 negra; E4 negra; F4 negra\ncompas 2\nG4 negra; A4 negra; B4 negra; C5 negra",
  "annotations": [{ "measure": 1, "beat": 1, "text": "I", "kind": "roman" }]
}
```

| Campo de setup | Regla |
| --- | --- |
| `mode` | Obligatorio: `single` o `satb` |
| `measures` | Obligatorio: entero de 1 a 128; se crean antes de aplicar texto |
| `title` | Opcional; por defecto `Sin título` |
| `key` | Opcional; por defecto `C`; armaduras admitidas por el modelo, p. ej. `G`, `Bb`, `F#m` |
| `time` | Opcional; por defecto `[4,4]`; numerador/denominador validados por el modelo |
| `tempo` | Opcional; por defecto 100; sujeto al rango del modelo |
| `clef` | Opcional: `treble` o `bass`; afecta a melody en modo single |

`text` es obligatorio en esta alternativa. Usa la gramática del editor: `voz melody` (o soprano/alto/tenor/bass), `compas 1`, notas `C4 negra`, acordes `[C4 E4 G4] blanca` y `silencio negra`; separa eventos con `;` o saltos de línea. Las posiciones no pueden exceder los compases preparados. Un error aborta el proyecto e incluye **línea y mensaje**. `annotations` es una lista opcional de `{measure, beat, text, kind}`, con `kind: "roman" | "text"`; se generan ids automáticamente.

### Campos de cada still

| Campo | Regla |
| --- | --- |
| `id` | Obligatorio y único, no vacío: letras minúsculas, números y guiones (`[a-z0-9-]+`); se usa en el nombre del PNG |
| `kind` | `score` por defecto; `title` muestra solo tarjeta de heading/caption |
| `project` | Nombre de proyecto obligatorio para score; title no lo necesita |
| `heading` | Texto opcional grande, visible |
| `caption` | Texto opcional debajo del encabezado |
| `narration` | Narración opcional, solo en manifest, no se dibuja |
| `duration` | Segundos sugeridos, número positivo; por defecto 5 |
| `measures` | `[inicio, final]` inclusivo; por defecto toda la partitura |
| `voices` | `"all"` o lista no vacía de voces del modo; por defecto todas |
| `focusVoice` | Voz visible que conserva intensidad; las demás notas se atenúan |
| `reveal` | `{measure, beat?}`: oculta música en esa posición y después sin quitar notas ni alterar el formato |
| `highlights` | Lista de cajas de rango, descrita abajo |
| `marks` | Lista de notas coloreadas, descrita abajo |
| `cursor` | `{measure, beat?}`: cursor en el espaciado real de VexFlow |
| `showCiphers` | Booleano; por defecto true; muestra/oculta annotations |
| `audio` | Reservado para exportación WAV futura; actualmente solo advierte y genera PNG |

Voces: `melody` en single; `soprano`, `alto`, `tenor`, `bass` en satb. Voces omitidas no se dibujan. El rango de compases, reveal, cursor, highlights y marks deben ser coherentes con las voces y compases visibles.

Todas las posiciones usan **compás desde 1 y pulsos en negras desde 1**, no índices de notas. `beat: 2.5` es la segunda mitad del segundo pulso. En 6/8 hay tres negras: los límites válidos son 1 a 4. `beat` omitido equivale a 1; el límite final del compás se admite para reveal, cursor y endBeat.

Highlight: `{measure, endMeasure?, beat?, endBeat?, voice?, color?, label?}`. `endMeasure` es inclusivo y por defecto igual a measure. Sin beats abarca los compases completos; `endBeat` es exclusivo. Sin voz abarca todas las voces visibles. Las cajas de un rango de varios compases se dividen por compás. El label se dibuja en la primera caja.

Mark: `{measure, beat, voice?, color?, label?}`. Debe existir una nota en esa posición. Sin voz, colorea las cabezas de todas las notas que empiezan allí; un acorde colorea todas sus cabezas. No colorea los pentagramas ni las plicas. `label` es opcional y aparece bajo el pentagrama.

Colores (por defecto amber): `amber` **#f5b942**, `rose` **#f0567a**, `cyan` **#3cc7e0**, `violet` **#8b5cf6**, `green` **#34c77b**.

### Manifest

`manifest.json` sigue `StillsManifest`: `lesson`, `locale`, `title`, `width`, `height`, `generatedAt` (ISO) y `stills`. Cada entrada contiene `id`, `file` (relativo al manifest), `duration` y, si fueron dados, `heading`, `caption`, `narration`. El campo opcional `audio` queda reservado y no se emite todavía.

## API de captura

```js
const { storyboard, scores } = window.stormStage.prepare(jsonConArchivosIncrustados);
const still = storyboard.stills[0];
await window.stormStage.render(still, scores[still.project] ?? null, storyboard.format);
// document.documentElement.dataset.stageReady === "1"
// Capturar [data-testid="still"].
```

`render()` valida, reinicia stageReady a `"0"`, renderiza todos los compases, espera `document.fonts.ready` y frames de pintura, ajusta la partitura al papel y marca `"1"`. Devuelve una promesa que rechaza con el id del still si falla. Las llamadas deben ser secuenciales. La capa fixed cubre header/footer sin modificar el layout del sitio.

El espaciado completo se conserva durante reveal. Las notas posteriores tienen `opacity: 0`; barras de corcheas, tresillos y ligaduras se recortan en el límite revelado. Highlights y cursor interpolan entre las posiciones de notas grabadas por VexFlow; no suponen pulsos equidistantes. La cuadrícula es de dos columnas en paisaje y una en vertical/cuadrado; partituras largas se reducen para caber. Para conservar legibilidad, selecciona pocos compases por still. Encabezados y labels largos no se reescriben automáticamente: revísalos visualmente.

## API lista para conectar al editor

`lib/sequencer/agent-api.ts` exporta `installAgentApi({getScore, loadScore})`, que instala `window.stormSequencer` y devuelve limpieza. El integrador debe pasar un getter del estado **actual** (p. ej. una ref) y un handler que cargue el Score mediante el flujo normal del editor (historial, reproducción, selección). Aún no está conectada a SequencerStudio.

```ts
const cleanup = installAgentApi({
  getScore: () => scoreRef.current,
  loadScore: score => replaceEditorScore(score),
});
// En el cleanup del efecto: cleanup();
```

| API | Resultado |
| --- | --- |
| `version` | 1 |
| `getScore()` | Copia del Score actual; mutarla no altera el editor |
| `loadScore(json)` | Acepta string JSON exportado u objeto Score; valida antes de llamar al handler; lanza si falla |
| `loadText(text)` | Devuelve ParseResult (`score`, `issues`, `count`); aplica solo si no hay errores; reemplazo por voz/compás según gramática del editor |
| `describe()` | Resumen de título, modo, tempo, voces, compases y eventos con pulso, pitches y figura |

## Verificación

```sh
npx vitest run lib/sequencer
npx tsc --noEmit
npx eslint lib/sequencer/storyboard-resolve.ts lib/sequencer/storyboard-resolve.test.ts lib/sequencer/agent-api.ts lib/sequencer/agent-api.test.ts lib/sequencer/capture-decoration.ts components/sequencer/ScoreView.tsx components/sequencer/StillStage.tsx scripts/sequencer/stills.mjs "app/[locale]/sequencer/v4/stage/page.tsx" e2e/sequencer-stills.spec.ts
npx playwright test e2e/sequencer-stills.spec.ts --workers=1
```
