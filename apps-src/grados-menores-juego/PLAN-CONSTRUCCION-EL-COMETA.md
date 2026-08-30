# EL COMETA — Plan maestro de construcción

**Videojuego 3D de grados de las escalas menores para Storm Studios Learning**
Documento de handoff escrito por Claude (Fable 5) el 2026-08-29, con diseño aprobado por
Luis Cárdenas. Este documento es **autocontenido**: un agente (Opus, Sonnet, Codex,
Gemini) o un desarrollador humano debe poder construir el juego completo leyendo solo
esto (más los dos archivos de `referencias/` y el código del gemelo, ver §0.8).

> **Estado actual del proyecto: SOLO EXISTEN ESTE DOCUMENTO Y `referencias/`.** No hay
> código. La carpeta de trabajo es
> `<repo sitio>\apps-src\grados-menores-juego\` — el juego se desarrolla **directamente
> aquí, standalone** (Vite propio, puerto 5176). Vivir en `apps-src/` NO publica nada:
> el sitio solo sirve lo que llega a `public/apps/` vía deploy (fase F11).

---

## 0. Instrucciones para el agente que continúe

1. Trabaja **por fases en orden** (sección 13). No saltes fases: cada una tiene
   criterios de aceptación verificables.
2. Mantén un archivo `BITACORA-DESARROLLO.md` en esta carpeta: al terminar cada fase
   anota fecha, qué se hizo, decisiones tomadas y pendientes. El siguiente agente
   empieza leyéndolo.
3. **No renegocies las decisiones de diseño** de la sección 2: ya fueron discutidas y
   aprobadas por Luis. Si algo es técnicamente imposible, anótalo en la bitácora y
   pregunta a Luis antes de cambiar el diseño.
4. **NADA SE SUBE HASTA QUE LUIS PRUEBE EL JUEGO EN LOCAL** (instrucción explícita de
   Luis, 2026-08-29). Concretamente, y hasta nuevo aviso:
   - **NO `git push`** (ni commits a `main` que se vayan a empujar): en este repo
     publicar = push a main con deploy automático en Vercel.
   - **NO ejecutes `npm run deploy` / `copy-dist.mjs`**: escribir en `public/apps/` es
     lo que hace visible el juego en el sitio.
   - **NO crees las páginas** `app/[locale]/apps/grados-menores/juego/` ni toques
     `apps-catalog.ts` — todo eso es F11.
   El desarrollo vive SOLO en `apps-src/grados-menores-juego/` y se prueba SOLO con
   `npm run dev` (puerto 5176) y `npm run preview`. Al terminar cada hito, avisa a Luis
   para que juegue esa fase; él decide cuándo se avanza y cuándo se publica.
   **F11 requiere confirmación explícita de Luis.**
5. Idioma del código: identificadores y comentarios en inglés o español (consistente);
   textos de UI SIEMPRE bilingües es/en vía i18n.
6. Crédito obligatorio en el menú: *"Desarrollado por Luis Cardenas para Storm Studios
   Learning"*.
7. Los valores numéricos marcados como **[tunable]** viven TODOS en `src/config.ts` con
   el valor propuesto aquí como default. **Luis es un maestro exigente y va a endurecer
   el juego jugándolo**: cualquier cosa que un tirano querría apretar (tiempos,
   radiofaros, castigo de deriva, cuota de decisiones) DEBE ser un tunable, no una
   constante enterrada.
8. **El gemelo arquitectónico de este juego es el EXPRESO TONAL**
   (`apps-src/grados-mayores-juego/` — código TERMINADO y funcionando, más su
   `PLAN-CONSTRUCCION-EXPRESO-TONAL.md` y su `BITACORA-DESARROLLO.md`). El Cometa es su
   hermano del modo menor: **misma mecánica exacta, otro mundo**. Ante cualquier duda de
   "cómo se hace X", copia el patrón (a veces el archivo entero) del Expreso: selector,
   player de samples, máquina de estados, spline/streaming, HUD, persistencia,
   pantallas, harness de QA (`?dev=1`). Los abuelos son Batisfera
   (`apps-src/acordes-juego/`) y Aerostato (`apps-src/acordes-cantar-juego/`).
9. La teoría musical autoritativa está COPIADA en `referencias/data.js` y
   `referencias/engine.js` (tomados de la webapp seria `apps-src/grados-menores/`). Las
   tablas se portan de ahí **verbatim** — no re-derivar ortografías enarmónicas de
   memoria, JAMÁS. ⚠️ La teoría menor NO es la del Expreso: 15 tonalidades menores,
   **11 grados** (no 12), otro inventario de samples, fallbacks enharmónicos propios y
   acordes `Minor Chords` (§3).

---

## 1. Contexto: la plataforma Storm Studios

Sitio: https://www.stormstudios.com.mx — plataforma de educación musical (Next.js +
next-intl es/en). Repo local del sitio (esta carpeta vive dentro):

```
C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios
```

Patrón de la casa: cada app de entrenamiento auditivo tiene dos experiencias:

| Experiencia | Ruta | Qué es |
|---|---|---|
| Webapp "seria" | `/es/apps/grados-menores/jugar` | Entrenador configurable con estadísticas |
| Videojuego | `/es/apps/grados-menores/juego` | Juego temático con la misma pedagogía |

Las apps son estáticas bajo `public/apps/<nombre>/`; los juegos modernos son **apps
Vite independientes** en `apps-src/<nombre>/`, compiladas a `dist/` y copiadas con
`scripts/copy-dist.mjs`. El sitio las embebe con
`<iframe src="/apps/<nombre>/index.html?lang={locale}">`.

Familia de videojuegos (los "verticales" de la casa): Batisfera **desciende** (fosa
oceánica), Aerostato **asciende** (cielo), el Expreso Tonal **avanza hacia casa** por
tierra. **EL COMETA es el videojuego de la app "Grados Escala Menor"** (slug
`grados-menores`) y completa la familia: **orbita hacia casa** por el espacio.

**La tesis del juego: la gravedad es la tonalidad.** En la música tonal todo tiende a
la tónica como todo cuerpo celeste cae hacia su estrella. Eres el piloto de un cometa
que vuelve a casa: cada anillo de navegación de la ruta es un grado que reconocer, y el
destino del viaje — el **Perihelio**, el punto más cercano a tu estrella natal — ES la
tónica hecha astro. El modo menor es, naturalmente, el modo del cielo nocturno.

---

## 2. Decisiones de diseño CERRADAS (aprobadas por Luis)

1. **Nombre:** *El Cometa* (ES) / *The Comet* (EN).
   Tagline: *"Toda órbita vuelve a casa."* / *"Every orbit returns home."*
2. **Concepto:** pilotas un pequeño cometa con una **carlinga de época incrustada en el
   hielo** (madera, latón, instrumentos de bronce — estética Julio Verne espacial,
   continuidad estética con la cabina del Expreso), **vista SIEMPRE en primera persona**.
   La órbita te lleva sola — la gravedad hace el trabajo; tu única tarea musical es
   decidir en cada anillo de navegación. Se eligió cometa (y no nave) para no chocar
   con Cosmic Ear, la nave de la generación vieja.
3. **El marco es el observatorio:** el juego abre en un **observatorio de montaña, de
   noche** (menú = eliges constelación apuntando el telescopio) y las estadísticas
   viven en el **Planetario** (§7.6). Al iniciar el viaje, la cúpula se abre y partes.
4. **Loop central (idéntico al Expreso):** al acercarse cada **anillo de navegación**
   suena un **grado aleatorio** del pool que el alumno eligió (lo emite la **baliza**,
   un púlsar de latón que precede al anillo). Responder el grado correcto alinea el
   anillo y el cometa recibe un *slingshot* hacia casa; **20 decisiones correctas**
   [tunable] llevan al Perihelio.
5. **El radiofaro de casa es el acorde de tónica MENOR** (sample real `Minor Chords`
   de R2, §3.4). Sintonizarlo recuerda el centro tonal pero **cuesta 1 transmisión**;
   hay **3 transmisiones por viaje** [tunable]. Re-escuchar la NOTA de la pregunta es
   gratis e ilimitada (igual que "Repetir" en la webapp seria).
6. **Error o silencio = deriva real, NO reset total:** el anillo desalineado escupe al
   cometa a una **nebulosa oscura** (~10 s de deriva gris entre polvo), se reincorpora
   a la ruta y **pierde 2 de progreso** (piso 0) [tunable]. La **racha** sí se resetea
   a 0 con cada error. Reset total reservado para un futuro modo duro (§7.8), NO en v1.
7. **Durante la deriva hay feedback pedagógico:** la consola revela la respuesta
   ("Era F# — IVly, IV lidio") y se reproduce tónica → nota, para re-anclar el oído.
   **Además (mecánica propia del menor):** si el error confundió un **par mutable**
   (VI↔VImel o VIIST↔VIIsen), la consola lo dice ("Confundiste la subtónica con la
   sensible") y reproduce tónica → nota respondida → nota correcta: la comparación
   directa de las dos estrellas del sistema binario (§5.7). [tunable: on/off]
8. **Progresión elegida por el alumno, no por niveles:** el setup es como el de la
   webapp seria — eliges tonalidad (15), timbre (6) y **qué grados trabajar** (7
   diatónicos + 4 cromáticos). Los presets son **la taxonomía real del menor** (§7.9):
   chips "Natural" / "Armónica" / "Melódica" / "Todo". **Nosotros ofrecemos la
   velocidad**: Lento / Normal / Rápido / Maestro (§7.3). Sin capas ni desbloqueos.
9. **Visualmente muy interesante desde la carlinga** (prioridad de Luis): rutas largas
   con escenografía evolutiva. 15 tonalidades = 15 rutas fijas y reconocibles (seed por
   tonalidad), construidas con **5 regiones del espacio × 3 variantes de color** (§5.4),
   con landmarks celestes, cometas que se cruzan y guiños al universo Storm (§5.6).
   Cada tonalidad tiene además su **constelación** (§5.8), que es a la vez selector de
   ruta, mapa de progreso y figura coleccionable.
10. **El Perihelio es una maravilla de la creación** (mismo listón que la Terminal del
    Expreso): la estrella natal con su planeta y, en la superficie nocturna, diminuto,
    el observatorio del que partiste. La aproximación final atraviesa **15 anillos de
    entrada en espiral que cantan la escala melódica completa: sube melódica, baja
    natural** (§12) — el gesto clásico del modo menor hecho trayectoria. El viaje
    entero es el V–i; el Perihelio es la resolución.
11. **Regla de silencio pedagógico:** desde que suena la nota de la pregunta hasta que
    el anillo se resuelve, NINGÚN otro audio con altura suena (el murmullo del cometa
    baja a 30 %, eventos ambientales suprimidos). Todo sonido afinado del mundo
    proviene solo de: preguntas, repeticiones, radiofaro-tónica, cadencia de salida y
    la llegada.
12. **Sin micrófono.** Reconocimiento por botones/teclado, como Batisfera y el Expreso.
13. **Un solo modo en v1: "El Viaje"** (las 20 decisiones). La webapp seria ya tiene
    los tres modos de la casa. Ideas de modos duros futuros en §7.8, sin implementar.
14. **Colección = Planetario**: cúpula con las 15 constelaciones, estados (No viajada /
    Perihelio / Perihelio de Gala) y medallas (§7.6), más estadísticas por grado como
    la webapp seria.
15. **Desktop primero; móvil fuera del alcance de v1.** No bloquear el diseño:
    `touch-action: none` y layout flexible desde el inicio.
16. Bilingüe es/en vía `?lang=`, 5 timbres de R2, estadísticas en localStorage — igual
    que toda la plataforma.

---

## 3. Datos musicales y de audio (autoritativos — portar de `referencias/`)

⚠️ **NO copiar el `degrees.ts` del Expreso y "ajustarlo"**: la teoría menor se porta
desde `referencias/data.js` de ESTA carpeta. El Expreso sirve de patrón de código, no
de fuente de datos.

### 3.1 Tonalidades y grados

Portar **verbatim** de `referencias/data.js` a `src/music/degrees.ts`:

- `SCALES` — las 15 tonalidades menores, en este orden:
  `["Am","Em","Bm","F#m","C#m","G#m","D#m","A#m","Dm","Gm","Cm","Fm","B♭m","E♭m","A♭m"]`.
- `DIATONIC_DEGREES = ["I","II","III","IV","V","VI","VIIST"]` — ojo: el diatónico del
  menor natural incluye **VIIST (♭7, subtónica)**, no VII.
- `CHROMATIC_DEGREES = ["IIfr","IVly","VImel","VIIsen"]`
  (♭2 frigio, #4 lidio, **#6 melódico**, **#7 sensible** — los dos últimos son los
  grados mutables de las escalas melódica y armónica).
- `ALL_DEGREES_OPTIONS = ["I","II","IIfr","III","IV","IVly","V","VI","VImel","VIIST","VIIsen"]`
  — **orden canónico de presentación (11 grados, orden de escala)**. Botones y
  estadísticas SIEMPRE en este orden (helper `sortDegrees` de `referencias/engine.js`).
  Nota: a diferencia del Expreso (7 diatónicos + 5 cromáticos al final), aquí el orden
  canónico ya viene INTERCALADO por altura. Respetarlo.
- `scaleDegrees` — el mapa tonalidad → { pitchClass → grado }, con la **ortografía
  enarmónica correcta por tonalidad** (en C#m el IVly es F##; en A♭m el IIfr es B♭♭;
  en D#m el VIIsen es C##). Este mapa es sagrado: copiar tal cual.
- `DEGREE_GLOSSARY` — nombres bilingües (Tónica/Tonic … VII sensible (#7)/Leading-tone
  VII (#7)).

### 3.2 Inventario de samples (idéntico en los 5 timbres)

`NOTE_FILES` de `referencias/data.js`: **131 notas por timbre**, octavas 2–6 (C♭ va de
3 a 7; C llega a C7). ⚠️ Difiere del inventario del Expreso: incluye **dobles
sostenidos C##, D##, F##, G##** y el doble bemol **B♭♭**, pero NO tiene A♭♭/D♭♭/E♭♭/G♭♭
ni C♭2. Copiar la lista tal cual.

**Fallbacks enharmónicos de audio** (portar `AUDIO_NOTE_FALLBACKS` y
`normalizeAudioSegment` de `referencias/engine.js`): `C##→D` y `G##→A` se resuelven al
construir la URL (el nombre TEÓRICO se conserva para mensajes y grados; solo el archivo
cambia). `D##` y `F##` SÍ existen como archivos.

**Auditoría del inventario contra la teoría (hecha en F1, 2026-08-29):** cruzando las
26 clases que usan las 15 tonalidades contra `NOTE_FILES` aparecen exactamente dos
anomalías, y ninguna más:
- **`E##` se usa pero no existe** → es la trampa de A#m de aquí abajo.
- **`D##` existe en el inventario pero NINGUNA tonalidad menor lo usa** → es inventario
  muerto. Su archivo además da 404 en el bucket (sondeado), pero da igual: el selector
  nunca lo puede sortear. No "arreglarlo" ni quitarlo de `NOTE_FILES` (la lista se porta
  verbatim); solo saberlo para no asustarse en una sonda.

Las otras 24 clases cargan sin fallo (sondeadas en Piano y Fagot, 50/50).

⚠️ **Trampa conocida — A#m no tiene IVly:** en A#m el IVly se escribe `E##`, que no
está en `NOTE_FILES` ni en los fallbacks. `buildQuestionSet` simplemente nunca lo
sortea (comportamiento heredado de la webapp seria — NO "arreglarlo" distinto que
ella). Consecuencia para el juego: si el jugador activa IVly y elige A#m, ese grado no
aparecerá en el viaje. Mostrar un avisito en el menú cuando esa combinación exacta esté
activa ("En A#m el IVly no está disponible") y descontarlo del mínimo de 2 grados.

### 3.3 URLs de audio (CDN R2 — ya en producción, no requiere setup)

```
Base:          https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev
Nota:          {BASE}/{Timbre}/{NoteFile}.mp3      ej. {BASE}/Piano/F%234.mp3
Acorde tónica: {BASE}/{Timbre}/Minor%20Chords/{tónicaSinM}minor.mp3
                                              ej. {BASE}/Coro/Minor%20Chords/E♭minor.mp3 (encoded)
SFX:           {BASE}/acierto.mp3   y   {BASE}/error.mp3
```

Timbres (carpetas EXACTAS): `Piano`, `Cello`, `Corno`, `Coro`, `Fagot`. Sexta opción de
UI: `Aleatorio`. El nombre del acorde sale de `minorChordFileName()` de
`referencias/data.js` (quita la "m" del nombre de escala: `A♭m` → `A♭minor.mp3`).
**Codificación: usar `audioUrl()` de `referencias/engine.js`** (fallback enharmónico +
`encodeURIComponent` POR SEGMENTO — cubre `#`, `♭` U+266D, `♭♭`, `##` y el espacio de
`Minor Chords`). No construir URLs a mano.

Reproductor: copiar `src/audio/samples.ts` del Expreso (cache + clonado + unlock +
precarga con timeout) y adaptar: `playTonicChord` apunta a `Minor Chords`, y `audioUrl`
incorpora `normalizeAudioSegment`. API: `playNote`, `playTonicChord`, `playTriad`,
`playScaleWalk` (cancelable), SFX.

En timbre `Aleatorio`, el timbre se sortea **por pregunta**, y los sonidos de apoyo
(radiofaro, cadencia, llegada) usan el timbre de la pregunta vigente — portar
`getSupportAssetBaseDir` de `referencias/engine.js`.

### 3.4 El radiofaro de casa (acorde de referencia)

**El radiofaro toca el sample real** `{Timbre}/Minor Chords/{tónica}minor.mp3`, con el
nombre que da `minorChordFileName()`. Es exactamente la ruta que usa la webapp seria en
su `playChord()` (`apps-src/grados-menores/app.js`), **que es la referencia de ruteo de
este juego**: ante cualquier duda de qué URL pedir, mirar ahí.

**Los `Minor Chords` están SANOS — verificado por hash en F1 (2026-08-29).** Conviene
dejarlo escrito, porque el Expreso Tonal sí tuvo un problema con SUS acordes y es muy
fácil generalizarlo mal (yo lo hice; Luis lo corrigió):

- **Menores: 75/75 archivos distintos** (15 tónicas × 5 timbres), cero duplicados, cero
  errores de carga. Cada timbre tiene su propia grabación.
- **Mayores: `Piano/Major Chords/*` es byte a byte idéntico a `Cello/Major Chords/*` en
  las 15 tónicas.** Ese —y solo ese— es el fallo que oyó Luis en el Expreso (un cello
  saliendo del piano). Corno, Coro y Fagot están bien. Es un asset que habría que
  re-subir al bucket; **no afecta a este juego**.

⚠️ **Cómo verificar identidad de assets (técnica de la casa; no repetir mi error):**
comparar **duración o tamaño NO sirve como prueba** — cuatro de los cinco acordes
menores pesan 202560 bytes y duran 5.064 s siendo grabaciones distintas. Hay que
comparar el **contenido**: en dev, `fetch` al proxy `/r2` (mismo origen, sin CORS) y
hash SHA-256 de los bytes. El arnés de QA (`?dev=1`) lleva ese botón.

Al tocar el radiofaro, superponer una envolvente corta de **estática de radio + barrido
de sintonía** (WebAudio: ruido filtrado con sweep) para que "sea" una transmisión desde
casa además del acorde — el acorde es la información, la estática es el teatro.
[tunable: mezcla]

### 3.5 La cadencia de salida (establece el centro tonal MENOR)

Al abrirse la cúpula del observatorio y partir, suena **i – iv – V – i** (~1 acorde/s):
la cadencia que DEFINE el modo menor (el V mayor viene de la armónica — su tercera es
el VIIsen, la sensible).

⚠️ **NO usar los samples `Minor Chords` para iv y V**: solo existen acordes de las 15
tónicas (en A#m no hay un `D#minor.mp3` para su iv). Construir iv y V **apilando 3
samples de nota** con la ortografía del mapa
`scaleDegrees` — las clases salen del mapa y están todas en el inventario (con
fallback de audio donde aplique, ej. el G## del V de A#m suena con el archivo de A):

| Tríada | Clases (grados del mapa) | Calidad |
|---|---|---|
| i | I, III, V | menor |
| iv | IV, VI, I | menor |
| V | V, **VIIsen**, II | **MAYOR** (armónica) |

Regla de octavas: copiar `writtenMidi` + `triadFiles` del `degrees.ts` del Expreso (la
versión por MIDI real, no la regla simple por semitono — ver la desviación documentada
en su bitácora F1): fundamental en octava 3, cada voz toma la octava que la deja dentro
de (0, 12] semitonos reales por encima de la fundamental. Tests de consola para C#m,
D#m y A♭m (los casos con dobles alteraciones).

El acorde final de la cadencia (i) SÍ es el sample `Minor Chords` (más rico que la
tríada apilada) — así la cadencia termina con el sonido exacto del radiofaro: el jugador
aprende de entrada *qué* le va a recordar la transmisión. La llegada (§12) cierra con
ese mismo sample. Los tres momentos de la tónica suenan igual.

### 3.6 Selección de preguntas (portar VERBATIM, está calibrado)

De `referencias/engine.js`, portar a `src/music/selector.ts` (o copiar el
`selector.ts` del Expreso, que es el mismo port, verificando contra las referencias de
ESTA carpeta):

- `buildQuestionSet(scale, selectedDegrees, timbre)` — pool `{pitchClass, filePath}`.
- `makeDegreeNoteSelector()` — selector de "bolsa barajada": cubre TODOS los grados
  seleccionados una vez antes de repetir, nunca repite grado dos veces seguidas (ni en
  el límite entre ciclos), y varía octava/timbre dentro de cada grado. Es el corazón
  pedagógico del sorteo: **no lo "mejores"**.

Regla de setup: **mínimo 2 grados activos con samples disponibles** para iniciar viaje
(recordar la excepción A#m/IVly de §3.2). Mensaje amable si falta.

---

## 4. Stack técnico

Idéntico al Expreso: `package.json` con `"name": "el-cometa-juego"`, Vite ^8 con
`base: "./"`, TypeScript ^5.x strict, `three` (misma versión que el Expreso), **única
dependencia runtime: `three`**. Persistencia en localStorage con prefijo `cometa-`.
i18n propio (`src/i18n.ts`, `?lang=es|en`, default `es`).
**Dev server: puerto 5176** (5173 Batisfera, 5174 Aerostato, 5175 Expreso). Registrar
la configuración `el-cometa` en el `launch.json` del repo.

**Fuentes**: Google Fonts **Playfair Display** (títulos — cartelería astronómica del
XIX) + **Rajdhani** (UI) — continuidad con la casa. **Paleta de consola**: latón
`#c9a227` (compartido con el Expreso — son hermanos), azul noche `#0e1428`, índigo
profundo `#1a2340`, marfil lunar `#e8e6dc`, hielo `#9fd8e8`, verde señal `#38d17c`,
rojo señal `#e04545`. [tunable]

---

## 5. Diseño del mundo: la órbita

### 5.1 Geometría de la ruta

**Misma ingeniería que la vía del Expreso** (copiar `track.ts` como base y re-vestir):

- La órbita es una **spline continua** (`CatmullRomCurve3`) generada por segmentos con
  RNG sembrado (LCG `makeRng`). **Seed fija por tonalidad**: `20260829 +
  índiceDeTonalidad` — cada ruta es idéntica entre sesiones (la ruta de Dm SIEMPRE es
  la ruta de Dm: el alumno la reconoce).
- **Segmento** = tramo entre anillos: longitud 140 u [tunable]. Offset lateral ±30 u y
  vertical ±14 u (en el espacio la ondulación vertical puede ser mayor que en tierra;
  la aproximación final es una espiral regular, §12). El anillo de decisión queda
  oculto tras polvo/asteroides/curva hasta ~60 u.
- **Estructura del segmento** (por distancia desde su inicio):
  - 0–40 u: **zona muerta** — respiro, landmarks, eventos ambientales permitidos.
  - 40 u: **la baliza** (púlsar de latón con anillo giratorio, análogo de la señal
    avanzada): al cruzarla SUENA la pregunta y arranca la ventana de respuesta. Su
    pulso de luz late al tempo del corazón del jugador imaginario — teatro, no info.
  - 140 u: **el anillo de navegación** (aro doble de bronce y luz, análogo de la
    aguja): deadline. La ruta principal continúa a través del anillo alineado; la
    salida desalineada se desvía hacia una nebulosa gris.
- **La deriva**: lazo en forma de lágrima de ~200 u que se reincorpora a la ruta al
  inicio del MISMO segmento (se re-intenta el tramo con una pregunta NUEVA del
  selector). Ambiente §5.5.
- **Render de la ruta — el análogo de los rieles:** la **Estela de Polvo**: la ruta se
  ve como una doble cinta de partículas de hielo brillante (dos `TubeGeometry` finas
  translúcidas offset ±0.8 u con shader de brillo, o cintas de puntos), salpicada de
  **boyas de navegación** (`InstancedMesh` de faroles flotantes cada 18 u — el ritmo
  visual hipnótico que en el tren dan los postes de telégrafo). Los anillos: torus
  doble con espadines de luz que SE MUEVEN al resolverse (animación 0.4 s con "clang"
  metálico-cristalino).
- **Streaming**: 3 segmentos por delante, dispose > 200 u por detrás. Coordenadas
  < 5000 u; `Float32` aguanta.

### 5.2 El arco del viaje (escenografía evolutiva)

4 actos ligados al progreso (n = decisiones correctas netas):

| Acto | Progreso | Paisaje |
|---|---|---|
| 1. Partida | 0–25 % | Se aleja el planeta natal de noche; la cúpula del observatorio brilla atrás; campo de estrellas se abre |
| 2. Corazón de la región | 25–60 % | Máxima densidad de landmarks de la región (§5.4) |
| 3. Obras del cielo | 60–85 % | Megaestructuras: anillos planetarios que se cruzan, campos de boyas, estaciones-faro abandonadas |
| 4. Aproximación | 85–100 % | Ruta limpia y solemne, la estrella natal domina el cielo, la espiral de 15 anillos (§12) |

**La estrella natal se ve desde lejos**: desde el acto 1 es un punto identificable
(glow cálido único en el cielo) y **CRECE con cada decisión correcta** — la distancia a
la tónica se ve, no solo se cuenta. Es el análogo exacto de la Terminal creciendo en el
horizonte. Además, durante el viaje la **cola del cometa** se orienta siempre alejada
de la estrella (dato astronómico real, y brújula diegética gratis: la cola apunta a
"lejos de casa").

### 5.3 Luz y cielo

Adaptación espacial del sistema de la casa: domo `SphereGeometry(BackSide)` con
`ShaderMaterial` — aquí el gradiente es sutil (negro azulado → índigo del horizonte
galáctico) y encima va la **textura de nebulosas de canvas** (manchas de color con
ruido, 2–3 capas de opacidad) + **estrellas** (`THREE.Points`, 2 tamaños, twinkle por
shader barato). `FogExp2` MUY tenue color índigo (el "polvo interplanetario" — da
profundidad sin matar el negro). `DirectionalLight` cálida desde la estrella natal +
sprite de glow que crece con el progreso (§5.2). Keyframes de color POR REGIÓN Y
VARIANTE (§5.4), interpolados por progreso. Sin sombras dinámicas.

### 5.4 Regiones y asignación de rutas (15 = 5 regiones × 3 variantes)

RNG sembrado por tonalidad; geometría compartida por región, paleta según variante.

| Región | Identidad | Landmarks propios | Rutas (tonalidad · variante) |
|---|---|---|---|
| **Nebulosa Lumbre** | telones de nebulosa incendiada (naranjas/rosas/magentas), columnas de gas | pilares de creación lejanos, huevos de estrella (glows nacientes), bandadas de polvo luminoso | Am · rescoldo, Dm · magenta, Em · dorada |
| **Cinturón de Rocas** | asteroides instanciados (5 mallas low-poly rotando), polvo | asteroide-catedral con cristales, mina abandonada con faroles, pecio de carguero | Gm · ocre, Cm · gris azul, Fm · violeta |
| **Anillos de Hielo** | plano de anillos planetarios visto desde dentro: bandas de partículas de hielo, un gigante gaseoso enorme al fondo | el gigante con su bandeado (canvas), lunas pastoras, géiseres de hielo | Bm · zafiro, F#m · turquesa, B♭m · perla |
| **Cúmulo de Faroles** | cúmulo estelar denso: cientos de soles cercanos (sprites), luz de linterna por todos lados | estrellas dobles orbitándose (¡los sistemas binarios §5.7!), estación-faro de latón activa que barre un haz | C#m · oro blanco, G#m · azul eléctrico, E♭m · ámbar |
| **El Vacío** | el espacio profundo: casi nada, y por eso TODO se ve — la galaxia entera de canto cruzando el cielo | la galaxia espiral (canvas glow), un cometa hermano lejanísimo, silencio visual | D#m · noche absoluta, A#m · alba galáctica, A♭m · violeta profundo |

Las tonalidades "exóticas" (D#m, A#m, A♭m) reciben la región más sobrecogedora:
recompensa visual por estudiar las escalas difíciles. El menú muestra un swatch de la
región junto a cada constelación.

### 5.5 La deriva (nebulosa oscura)

Paleta desaturada instantánea (lerp del fondo a gris `#5a5d66`, estrellas se apagan a
20 %, luz −40 %), jirones de polvo opaco que pasan por la ventana, un pecio fantasma
con una luz oxidada parpadeante, el murmullo del cometa amortiguado. A la mitad del
lazo, la consola muestra la respuesta correcta y suena tónica → nota (y el protocolo de
par mutable si aplica, §2.7). Al reincorporarse, el color y las estrellas VUELVEN en
2 s — el contraste gris→cielo es el castigo emocional y el alivio.

### 5.6 Decorado transversal y guiños (presupuestos)

| Elemento | Técnica | Presupuesto |
|---|---|---|
| Estela propia del cometa | sprites de vapor/hielo reciclados saliendo hacia atrás desde los bordes de la carlinga (venden velocidad, patrón vapor del Expreso) | ~120 sprites vivos |
| Boyas de navegación | `InstancedMesh` cada 18 u junto a la estela | 1 draw call |
| Polvo cercano | `THREE.Points` en caja reciclada alrededor de la cámara (parallax de velocidad, patrón nieve de Batisfera) | 1 draw call |
| Nebulosas de fondo | 2–3 planos enormes con textura canvas aditiva, lejísimos | 3 draw calls |
| Asteroides / hielo / cúmulo | `InstancedMesh` por región, rotación en CPU por fase | ≤ 4 draw calls |
| Fauna del espacio: bandadas de "golondrinas de polvo" (motas que vuelan en V), mantarrayas de gas en Nebulosa | `InstancedMesh` low-poly, aleteo por fase (patrón golondrinas de Aerostato) | ≤ 3 draw calls |
| **Cometa hermano que se cruza** | 1–2 por viaje, trayectoria paralela en zona muerta, núcleo + cola de sprites, **rugido SIN altura definida** (cluster de ruido — regla §2.11) con doppler manual | 1 grupo |
| Guiño Expreso | en la aproximación final, sobre el planeta natal de noche se ve una hebra dorada con una lucecita avanzando: la vía del Expreso Tonal | trivial |
| Guiño Aerostato | el globo dorado MUY alto en la atmósfera del planeta natal, al partir (acto 1) | trivial |
| El Perihelio | §12 | presupuesto propio |

**Presupuesto de rendimiento: ≥ 50 fps desktop, < 200 draw calls.** Texturas SOLO de
canvas (cero assets de imagen). Materiales compartidos por tipo. Eventos ambientales
SOLO en zonas muertas, suprimidos si hay pregunta activa (regla de silencio §2.11).

### 5.7 Los sistemas binarios (identidad pedagógica del menor)

Los pares mutables del modo menor — **VI/VImel** y **VIIST/VIIsen** — son los que todo
alumno confunde. En este juego son **estrellas binarias**: dos soles casi idénticos
orbitándose. Se manifiestan en tres lugares:

1. **En la consola**: las palancas de cada par van visualmente ENLAZADAS (un arito de
   latón las une, como binarias en un mapa celeste). Distintas pero hermanadas.
2. **En la deriva**: el protocolo de comparación de §2.7 cuando la confusión fue
   dentro de un par.
3. **En el paisaje**: la región Cúmulo de Faroles tiene binarias decorativas
   orbitándose. Sin texto, para el que se fija.

### 5.8 Las 15 constelaciones

Cada tonalidad menor tiene una constelación fija (nombres clásicos, es/en):

| Tonalidad | Constelación | | Tonalidad | Constelación | | Tonalidad | Constelación |
|---|---|---|---|---|---|---|---|
| Am | La Lira / Lyra | | G#m | El Dragón / Draco | | Cm | La Ballena / Cetus |
| Em | El Cisne / Cygnus | | D#m | El Fénix / Phoenix | | Fm | El Escorpión / Scorpius |
| Bm | El Águila / Aquila | | A#m | El Pegaso / Pegasus | | B♭m | El Can Mayor / Canis Major |
| F#m | El Delfín / Delphinus | | Dm | La Osa / Ursa Major | | E♭m | La Corona / Corona Borealis |
| C#m | Casiopea / Cassiopeia | | Gm | Orión / Orion | | A♭m | La Cruz del Sur / Crux |

Usos: (a) **selector de ruta en el menú** — el telescopio apunta y el ocular muestra la
figura + swatch de región; (b) **mapa de progreso en el HUD** (§6): la figura se dibuja
con 20 estrellas apagadas que se encienden una por decisión correcta — llegar =
constelación completa; las derivas añaden estrellitas grises fuera de la figura;
(c) **placa del Planetario** (§7.6). Las figuras se definen como polilíneas de 20
puntos en `config.ts` (aproximación libre de la figura clásica, no astronomía exacta).

---

## 6. La carlinga (cockpit)

Híbrido 3D + overlay HTML (patrón de la casa; copiar la arquitectura de `cab.ts` +
`hud.ts` del Expreso).

**En 3D (hijos de la cámara):**
- Marco de la ventana frontal: montantes de madera/latón engastados en **hielo del
  cometa** (material cristalino con vetas por textura canvas, bordes glaseados que
  refractan un glow tenue). Delante se ve la **proa de hielo** del cometa (análogo de
  la caldera) desprendiendo la estela.
- Laterales: portillas redondas de bronce (pasa el paisaje en periferia — vende
  velocidad).
- Abajo: tablero físico con **instrumentos de bronce**: un orrery en miniatura girando
  (planetitas de latón), un sextante, y un manómetro de "empuje de cola"; la **llave
  del radiofaro** (palanca telégrafo) se mueve al usarlo.
- **Balanceo procedural**: cabeceo y roll ±0.8° con dos senos desfasados + micro-deriva
  lateral lenta (en el espacio no hay traqueteo: hay flotación — frecuencias más bajas
  y amplitudes algo mayores que el tren [tunable]). En curvas, roll hacia el interior
  (+2°). Es EL efecto que hace que "ser cometa" se sienta.
- Cámara: FOV 60, drag de mouse SIN pointer lock (patrón de la casa): yaw ±100°, pitch
  ±35°, auto-recentrado suave 2 s.

**En overlay HTML/CSS (la CONSOLA DE LATÓN Y HIELO, parte inferior):**
- **Panel de grados** (instrumento principal, centro): fila de palancas-botón de latón,
  SOLO los grados activos del setup, en **orden canónico §3.1 (11 máx, intercalado)**.
  Número romano grande + etiqueta corta del cromático (IIfr→"♭2", IVly→"#4",
  VImel→"#6", VIIsen→"#7"); tooltip con el glosario. Pares mutables enlazados (§5.7).
  Estados: reposo / hover / bloqueada / correcta (verde) / incorrecta (roja).
- **La constelación** (canvas ~200×160 px, esquina): mapa de progreso §5.8 — el
  análogo de la tira de ruta del Expreso.
- **Radiofaros**: 3 iconos de antena; usados quedan en silueta. Botón grande
  "📡 Radiofaro (tónica)".
- **Repetir nota** (gratis, ilimitado): botón "🔊 Repetir".
- **Ventana de respuesta**: barra fina que se vacía (distancia baliza→anillo). En
  Maestro parpadea al 25 % final.
- **Marcadores**: puntos, racha (animación al crecer), velocidad elegida.
- **Mensajes**: línea de consola estilo bitácora de a bordo ("Correcto. Era F#
  (IVly).", patrón `correctMsg/wrongMsg` de la webapp seria — siempre revela nota y
  grado al resolverse).
- Viñeta CSS fría en bordes (hielo/latón) — vende la carlinga gratis.

**En 3D sobre la ruta** (información diegética duplicada): el anillo de navegación se
ilumina verde y sus espadines de luz giran a posición al acertar; rojo y
desalineado = deriva. Un **cartel astral** en la bifurcación: "PERIHELIO →" /
"← NEBULOSA".

---

## 7. Gameplay

### 7.1 Máquina de estados del viaje

**Idéntica al Expreso** (copiar `game/state.ts` y renombrar vocabulario):

```
MENÚ → PARTIENDO:
  · fundido desde negro en el observatorio; la cúpula se abre (rumor mecánico)
  · CADENCIA i–iv–V–i (§3.5) — el centro tonal MENOR queda establecido
  · el cometa despega (aceleración 3 s); HUD aparece
RODANDO (zona muerta):
  · velocidad de crucero × sprint 1.8 [tunable]
  · eventos ambientales permitidos
  ──(cruza la baliza)──► PREGUNTA
PREGUNTA:
  · frena a velocidad de pregunta (ventana §7.3 = distancia/velocidad)
  · suena la nota (selector §3.6); murmullo baja a 30 %; ambiente suprimido
  · [Repetir] gratis · [Radiofaro] toca acorde de tónica menor y resta 1 (si quedan)
  · el jugador pulsa una palanca de grado → SE BLOQUEA
  ──(correcta)──► ACIERTO:
      · anillo verde + espadines a posición + CLANG + slingshot (breve empujón de
        velocidad y estela más brillante 1 s) + SFX acierto.mp3 (volumen bajo)
      · progreso +1 · racha +1 · puntos §7.5 · stats por grado · estrella de la
        constelación se enciende
      · consola: "Correcto. Era {nota} ({grado})." → RODANDO (siguiente segmento)
  ──(incorrecta O el anillo llega sin respuesta)──► DERIVA:
      · anillo rojo + SFX error.mp3 · racha = 0 · progreso −2 (piso 0) · stats
      · el cometa TOMA la salida desalineada: nebulosa gris §5.5 (~10 s [tunable])
      · a media vuelta: consola revela "Era {nota} ({grado} — {nombre glosario})"
        y suena TÓNICA → NOTA; si fue confusión de par mutable, protocolo §2.7
      · sin respuesta: mensaje extra "El anillo no recibió rumbo."
      · reincorporación → RODANDO (MISMO segmento, pregunta nueva)
PROGRESO = 20 ──► LLEGADA (§12): espiral de 15 anillos, acorde final, RESUMEN
Esc en cualquier momento ──► PAUSA (congela todo; reanudar/abandonar)
```

Notas:
- El radiofaro NO pausa la ventana de respuesta [tunable `BEACON_PAUSES_WINDOW=false`].
- Radiofaros restantes al llegar: bonus +15 c/u — premia la memoria tonal.
- Con 0 radiofaros el botón queda deshabilitado (silueta), sin castigo extra.

### 7.2 Progreso

`progreso = clamp(aciertos_netos, 0, 20)`; acierto +1, deriva −2. Se llega al Perihelio
al alcanzar 20 [tunable `DECISIONS_TO_ARRIVE`]. No existe "perder": el viaje siempre
puede completarse; la calidad se mide en derivas, racha y puntos.

### 7.3 Velocidades (la dificultad que ofrecemos nosotros)

Ventana = 100 u de distancia baliza→anillo ÷ velocidad de pregunta. **Misma tabla que
el Expreso** [tunable]:

| Velocidad | u/s en pregunta | Ventana | Multiplicador |
|---|---|---|---|
| Lento | 8 | ~12.5 s | ×1.0 |
| Normal | 11 | ~9.1 s | ×1.25 |
| Rápido | 16 | ~6.3 s | ×1.5 |
| Maestro | 25 | ~4.0 s | ×2.0 |

Viaje limpio en Normal: ~4 min + llegada.

### 7.4 Anti-frustración calibrada

- La pregunta NUNCA suena tapada (regla de silencio §2.11).
- Repetir la nota es gratis SIEMPRE.
- La deriva re-intenta el mismo segmento con pregunta nueva (la bolsa sigue su curso).

### 7.5 Puntuación

`(10 + racha × 2 + bonusRapidez) × multiplicadorVelocidad` por acierto, con
`bonusRapidez = round(5 × fracciónDeVentanaRestante)`. Llegada: +100 × multiplicador.
Radiofaros sin usar: +15 c/u. Gala (§7.6): +150. Todos [tunable]. (Fórmula idéntica al
Expreso — los récords de ambos juegos son comparables a propósito.)

### 7.6 Medallas y Planetario

Por viaje completado, medalla según derivas: 🥇 **0** · 🥈 **≤ 2** · 🥉 **llegar**.
**Perihelio de Gala** = 0 derivas Y 0 radiofaros: la cola del cometa se vuelve dorada
en la secuencia final, lluvia de meteoros extra, placa dorada en el Planetario.

El **Planetario** (pantalla desde menú y resumen) es la cúpula del observatorio por
dentro: 15 placas de constelación (figura dibujada; completa si hubo llegada, dorada si
Gala) con estado (— / Perihelio / GALA), mejor medalla, mejor puntuación, mejor racha,
velocidad del récord y fecha de primera llegada. Abajo, **estadísticas por grado**
(precisión correct/total, orden canónico de 11, barras) — con las barras de los pares
mutables enlazadas visualmente (§5.7) — y botón de borrado con confirmación.

### 7.7 Persistencia (localStorage — guardar tras CADA decisión)

| Clave | Contenido |
|---|---|
| `cometa-stats` | `{ [grado]: { correct, total } }` (esquema de la webapp seria, almacén separado — NO tocar `GradosMenoresStats`) |
| `cometa-rutas` | `{ [tonalidad]: { llegadas, gala, mejorMedalla, mejorScore, mejorRacha, velocidadRecord, primeraLlegadaISO } }` |
| `cometa-settings` | `{ escala, timbre, velocidad, gradosSeleccionados: string[], volumen }` |

### 7.8 Futuro (documentado, NO construir en v1 — el cajón del tirano)

- **Órbita Decadente** (supervivencia): 3 derivas = el cometa cae al vacío, fin.
- **Combustible de Cola** (contrarreloj): la cola se apaga y solo la reavivan aciertos.
- **Modo Tirano**: reset total al fallar, 0 radiofaros, solo Maestro, cromáticos
  obligatorios. Placa propia en el Planetario.
- Tunables listos para endurecer sin código: ventanas §7.3, `DRIFT_COST`,
  `BEACON_COUNT`, `DECISIONS_TO_ARRIVE`, `BEACON_PAUSES_WINDOW`.

### 7.9 Presets de grados (la taxonomía del menor)

Chips de acceso rápido en el setup (además de los 11 chips individuales):

| Preset | Grados activos | Qué es |
|---|---|---|
| **Natural** | I II III IV V VI VIIST (7) | La eólica pura |
| **Armónica** | Natural + VIIsen (8) | Aparece la sensible |
| **Melódica** | Armónica + VImel (9) | El sexto elevado |
| **Todo** | 11 | + IIfr (♭2) y IVly (#4) |

El preset marca los chips; el alumno puede afinar a mano después (mínimo 2, §3.6).

---

## 8. Controles

| Input | Acción |
|---|---|
| Click en palanca / `1`–`7` | Grado diatónico en orden: I II III IV V VI VIIST |
| `Q` `W` `E` `R` | Cromático en orden de escala: IIfr(♭2), IVly(#4), VImel(#6), VIIsen(#7) |
| `Espacio` | Repetir la nota (gratis) |
| `B` | Radiofaro (acorde de tónica menor, cuesta 1) |
| Drag botón izquierdo | Mirar (yaw ±100°, pitch ±35°, auto-recentrado) |
| `Esc` | Pausa |

Los atajos solo responden si ese grado está activo. Cada palanca muestra su tecla en
una esquinita. **El cometa se conduce solo: no hay controles de movimiento** — toda la
atención del jugador es para el oído.

---

## 9. SFX y música

- SFX de assets R2: `acierto.mp3` (volumen bajo — no tapar el "clang"), `error.mp3`.
- SFX WebAudio sintetizados (patrón `synth-sfx.ts` del Expreso, CERO assets):
  **murmullo del cometa** (rumble grave filtrado + siseo de hielo sublimando, loop
  proporcional a velocidad — el análogo del traqueteo), **clang del anillo** (transient
  metálico-cristalino), **slingshot** (whoosh con pitch-up SIN altura tonal definida),
  campanilla del observatorio, rumor de la cúpula al abrirse, **rugido del cometa
  hermano** (cluster de ruido, §5.6) con doppler manual, estática del radiofaro (§3.4),
  crujidos de hielo aleatorios en zonas muertas (cabina viva).
- Ducking: durante PREGUNTA todo el bed baja a 30 % [tunable].
- El radiofaro-tónica = sample `Minor Chords` + capa de estática (§3.4). Firma sonora.
- Música ambiental: stub `startAmbient(region)` para cuando Luis produzca audio.

---

## 10. Pantallas y flujo de UI

```
[MENÚ = EL OBSERVATORIO]
  título EL COMETA + tagline ("Toda órbita vuelve a casa." / "Every orbit returns home.")
  interior del observatorio de noche (CSS/canvas, no 3D); crédito obligatorio §0.6
  · Constelación (tonalidad): 15 opciones con figura §5.8 + swatch de región (§5.4)
  · Timbre: Piano | Cello | Corno | Coro | Fagot | Aleatorio · Volumen (slider)
  · Velocidad: Lento | Normal | Rápido | Maestro (ventana en segundos visible)
  · Grados: 11 chips en orden canónico + presets "Natural / Armónica / Melódica / Todo"
    (mínimo 2; contador de activos; aviso A#m/IVly §3.2)
  · Botón PLANETARIO · Botón INICIAR VIAJE (gesto de unlock de audio + precarga)
[JUEGO] canvas + consola → Esc: PAUSA (reanudar / abandonar viaje)
[LLEGADA] secuencia §12 (no interactiva, saltable con Esc tras 5 s)
[RESUMEN] decisiones, derivas, precisión, mejor racha, radiofaros restantes, puntos,
  medalla (+GALA), novedades del Planetario → Reintentar ruta / Menú / Planetario
[PLANETARIO] placas §7.6 + estadísticas por grado + borrar progreso (confirmación)
```

i18n: TODOS los textos vía `src/i18n.ts` (`{ es: {...}, en: {...} }`, `t(key)`,
`data-i18n`). Nombres de grados: `DEGREE_GLOSSARY` §3.1. Sin audio antes del gesto
INICIAR VIAJE (ahí se precargan cadencia, primeras preguntas y SFX).

---

## 11. Estructura de archivos objetivo

```
apps-src\grados-menores-juego\
├── PLAN-CONSTRUCCION-EL-COMETA.md       ← este documento
├── BITACORA-DESARROLLO.md               ← lo mantiene el agente (crear en F0)
├── referencias\data.js, engine.js       ← webapp seria copiada (SOLO lectura, no se importa)
├── package.json / tsconfig.json / vite.config.ts / index.html
├── scripts/copy-dist.mjs                ← F11 (adaptar del Expreso)
└── src/
    ├── main.ts            ← bootstrap: lang, pantallas, unlock audio, crea Game
    ├── i18n.ts            ← diccionario es/en + t()
    ├── style.css          ← pantallas, consola latón/hielo, viñeta, Playfair/Rajdhani
    ├── config.ts          ← TODOS los [tunable] + polilíneas de constelaciones §5.8
    ├── dev/harness.ts     ← arnés QA con ?dev=1 (copiar patrón del Expreso)
    ├── music/
    │   ├── degrees.ts     ← SCALES, scaleDegrees, glosario, NOTE_FILES, fallbacks,
    │   │                     minorChordFileName, writtenMidi, triadFiles,
    │   │                     scaleWalkFiles melódica↑/natural↓ (§3.1–3.5, §12)
    │   └── selector.ts    ← buildQuestionSet + makeDegreeNoteSelector (port §3.6)
    ├── audio/
    │   ├── samples.ts     ← player TS (playNote/playTonicChord Minor Chords/playTriad/
    │   │                     playScaleWalk, SFX R2, normalizeAudioSegment)
    │   └── synth-sfx.ts   ← murmullo, clang, slingshot, estática, crujidos (§9)
    ├── game/
    │   ├── state.ts       ← máquina §7.1 (copiar del Expreso), lógica PURA
    │   └── persistence.ts ← stats, planetario, settings (§7.7)
    ├── 3d/
    │   ├── renderer.ts    ← escena, cámara, loop, resize
    │   ├── track.ts       ← spline, estela de polvo, boyas, anillos, balizas,
    │   │                     deriva, streaming (§5.1)
    │   ├── comet.ts       ← avance sobre spline, sprint/frenado, flotación (§6)
    │   ├── cab.ts         ← carlinga 3D: marco de hielo, orrery, llave, estela
    │   ├── environment.ts ← domo estrellado, nebulosas, estrella natal creciente,
    │   │                     keyframes por región/variante (§5.3)
    │   ├── scenery.ts     ← regiones, landmarks, binarias, cometa hermano, guiños
    │   └── perihelion.ts  ← estrella natal, planeta, espiral de 15 anillos, gala (§12)
    └── ui/
        ├── screens.ts     ← observatorio/setup, pausa, resumen, planetario
        ├── hud.ts         ← consola: palancas (11, pares enlazados), radiofaros,
        │                     ventana, marcadores, bitácora
        └── constellation.ts ← canvas de la constelación de progreso (§5.8)
```

Regla de dependencias (patrón de la casa): `game/` y `music/` NO importan de `3d/` ni
`ui/` (lógica pura, testeable en consola); `3d/` y `ui/` se suscriben al
`GameStateManager` (observer).

---

## 12. El Perihelio (especificación de la maravilla)

El presupuesto de asombro del juego se gasta AQUÍ. Es la recompensa por 20 decisiones y
la resolución tonal hecha astro.

**El lugar** (100 % procedural, LOD de silueta → detalle):
- La **estrella natal**: esfera con shader de granulación suave (ruido animado lento) +
  corona de sprites + protuberancias tenues (cintas). Cálida, no agresiva: es CASA. Su
  color por tonalidad (leve tinte tomado del swatch de la región — cada tónica tiene su
  sol).
- El **planeta natal** en primer término orbital: de noche del lado visible, con
  ciudades-lucecitas (puntos emissive), un mar que refleja la estrella, y el
  **observatorio en su montaña, con la cúpula abierta e iluminada** — el lugar exacto
  del menú, visto desde el cielo. Círculo cerrado, sin texto.
- **El rosetón celeste**: alrededor del punto de perihelio flota un anillo de 12
  medallones de latón (las 12 clases de altura); los de los grados del viaje están
  iluminados — cada ruta tiene su rosetón. (Herencia directa del reloj de la Terminal;
  detalle para el que se fija.)

**La secuencia de llegada** (~40 s, no interactiva, saltable con Esc tras 5 s):
1. Acto 4 §5.2: ruta limpia, la estrella domina el cielo, el murmullo se calma
   (ritardando literal: la velocidad baja), la cola del cometa se pliega.
2. **La espiral de 15 anillos**: la ruta se enrosca en espiral de entrada a órbita.
   **Subida (8 anillos): la escala MELÓDICA ascendente** — I II III IV V **VImel
   VIIsen** I' — cada anillo se ilumina y SUENA su grado al cruzarlo. **Bajada (7
   anillos): la escala NATURAL descendente** — **VIIST VI** V IV III II I — mientras la
   espiral desciende hacia el punto de perihelio. Sube melódica, baja natural: el gesto
   clásico del modo menor, hecho trayectoria. Ortografía del mapa `scaleDegrees`,
   timbre del viaje, un anillo por ~0.9 s (velocidad de cruce sincronizada — no confiar
   en que "más o menos coincide"; implementar `scaleWalkFiles(scale, "melodicUp" |
   "naturalDown", timbre)` con la regla de octavas por MIDI real del Expreso).
3. Al cruzar el anillo 15: **acorde de tónica menor** (sample `Minor Chords` — el MISMO
   sonido del radiofaro: el círculo se cierra), campanilla del observatorio a lo lejos,
   y el cometa queda en órbita serena sobre el planeta, con **auroras** en el limbo
   nocturno (cintas shader, patrón Aerostato) y una **lluvia de meteoros** cruzando
   (sprites con estela).
4. Placa de resumen estilo lámina astronómica de época → pantalla RESUMEN.
5. **Gala** (0 derivas y 0 radiofaros): además, la cola del cometa se vuelve DORADA
   (visible desde la carlinga), la lluvia de meteoros se multiplica, y en el planeta el
   observatorio enciende un haz de luz vertical de saludo.

**Presupuesto**: el Perihelio completo ≤ 60 draw calls, construido al entrar al acto 3
(lejos = impostor glow; cerca = geometría).

---

## 13. Fases de construcción (con criterios de aceptación)

> Tras CADA fase: `npm run build` limpio (incluye `tsc --noEmit`) y entrada en
> `BITACORA-DESARROLLO.md`. Recordatorio permanente: ante la duda de implementación,
> abrir el archivo equivalente del Expreso y copiar el patrón.

**F0 — Scaffold.** package.json, tsconfig strict, vite.config (`base: "./"`, puerto
5176), index.html con secciones de pantalla vacías, style.css base (fuentes, paleta
latón/azul noche), main.ts con el menú-observatorio funcional, i18n.ts con claves del
menú, config.ts con TODOS los tunables de este plan (constelaciones pueden ser
polilíneas placeholder). Registrar `el-cometa` en launch.json del repo.
✓ `npm run dev` levanta en 127.0.0.1:5176 (abrir por IP, no localhost — nota IPv6 de la
bitácora del Expreso); título EL COMETA en es y `?lang=en`; presets §7.9 marcan chips;
mínimo 2 grados validado; aviso A#m/IVly aparece solo en esa combinación.

**F1 — Música y samples.** `music/degrees.ts` + `music/selector.ts` + `audio/samples.ts`
+ `dev/harness.ts` (ports §3).
✓ En consola: `scaleDegrees["C#m"]["F##"] === "IVly"` y
`scaleDegrees["A♭m"]["B♭♭"] === "IIfr"`; `audioUrl` con `C##4` resuelve al archivo
`D4.mp3` y con `G##3` a `A3.mp3` (fallbacks §3.2), `B♭♭3` y `F%23%234` cargan sin 404;
sonda de `Minor Chords` con elementos `Audio` + escucha real en Piano y Fagot, con el
veredicto anotado en la bitácora (§3.4); `triadFiles` de la cadencia
correcta en C#m, D#m y A♭m (V con VIIsen, octavas por MIDI real);
`buildQuestionSet("A#m", {IVly}, ...)` devuelve vacío (trampa §3.2 verificada); el
selector en 50 sorteos con {I, IV, V} nunca repite grado seguido y cubre los 3 antes de
repetir.

**F2 — Ruta y cometa.** `3d/renderer.ts`, `track.ts` (spline, estela de polvo, boyas,
streaming, sin anillos funcionales aún), `comet.ts` (avance, sprint, flotación),
`cab.ts` básico.
✓ El cometa recorre 5+ segmentos con seed fija a 60 fps; el murmullo late proporcional
a la velocidad; la flotación y el roll en curva se sienten; drag de mirada con
auto-recentrado funciona; la estela propia sale hacia atrás.

**F3 — Cielo y regiones (2 de 5).** `environment.ts` + `scenery.ts` (domo estrellado
con twinkle, nebulosas canvas, estrella natal creciente, 2 regiones completas:
Nebulosa Lumbre y Cinturón de Rocas).
✓ Las rutas de Am y Gm se distinguen de un vistazo; la estrella natal crece al simular
progreso; asteroides rotan sin costo perceptible; ≥ 50 fps.

**F4 — Regiones restantes y vida.** Anillos de Hielo (gigante gaseoso), Cúmulo de
Faroles (binarias §5.7), El Vacío (galaxia de canto), fauna de polvo, cometa hermano
con doppler, guiños.
✓ Las 15 rutas cargan con su combinación región×variante de §5.4; el cometa hermano
solo aparece en zonas muertas; draw calls < 200 en la ruta más cargada.

**F5 — Consola y HUD.** `ui/hud.ts`, `constellation.ts`, carlinga 3D completa (orrery,
llave de radiofaro), viñeta.
✓ Consola completa con datos simulados; palancas muestran solo los grados activos en
orden canónico intercalado con sus teclas y los pares mutables enlazados; la
constelación enciende estrellas; ventana de respuesta animada.

**F6 — Loop de juego.** `game/state.ts` (máquina §7.1), anillos funcionales con
espadines animados, baliza dispara pregunta, respuesta por click/teclado, acierto
(clang + slingshot + progreso), radiofaro con descuento, cadencia de salida i–iv–V–i
con apertura de cúpula.
✓ Partida jugable de principio a fin SIN derivas (forzando aciertos): 20 decisiones,
puntos = fórmula §7.5, radiofaros se agotan y deshabilitan, regla de silencio audible;
la cadencia suena MENOR (verificar V mayor con sensible en Am de oído).

**F7 — La deriva.** Lazo físico, nebulosa gris §5.5, feedback pedagógico (revelación +
tónica→nota + protocolo de par mutable §2.7), progreso −2 piso 0, racha 0, reintento
con pregunta nueva.
✓ Fallar en la decisión 19 NO regresa a 0; el mundo desatura y recupera; "sin
respuesta" muestra su mensaje propio; responder VIIST cuando era VIIsen dispara la
comparación tónica→respondida→correcta con su mensaje; el mismo segmento se repite con
nota distinta.

**F8 — El Perihelio.** `perihelion.ts`: estrella creciente desde acto 1, planeta con
observatorio, espiral de 15 anillos sincronizada (melódica↑ natural↓), rosetón,
auroras + meteoros, gala, resumen.
✓ Los 15 anillos cantan melódica arriba y natural abajo con la ortografía de la
tonalidad (QA en C#m y A♭m); el acorde final es el sample `Minor Chords`; la gala solo
con 0 derivas y 0 radiofaros; saltable tras 5 s.

**F9 — Planetario y persistencia.** `persistence.ts`, pantalla del Planetario con las
15 placas de constelación, medallas, stats por grado (11, pares enlazados), settings
persistidos, guardado tras cada decisión.
✓ Cerrar y reabrir conserva todo; `mejorMedalla`/`mejorScore` solo mejoran; borrar pide
confirmación; las 15 placas muestran sus estados; el almacén de la webapp seria
(`GradosMenoresStats`) queda intacto.

**F10 — Pulido y QA.** Checklist §14 completo, pases de rendimiento, `npm run build` +
`npm run preview` + `?lang=en` íntegro.
✓ Checklist §14 al 100 %.

**F11 — Publicación en el website. ⚠️ SOLO CON OK EXPLÍCITO DE LUIS.** Pasos en §15.

---

## 14. Checklist de QA manual (F10)

- [ ] Los 11 grados suenan y se responden en al menos 3 tonalidades (Am, C#m, A♭m) y 2
      timbres (Piano, Fagot); ningún 404 en Network (¡ojo con `♭♭`, `##` y los
      fallbacks C##/G##!).
- [ ] `Minor Chords` carga para las 15 tónicas en los 5 timbres (75 URLs) y **los 75 son
      archivos distintos** (hash por el proxy `/r2`, §3.4 — la duración no vale).
- [ ] **Todo lo que suena sale de la carpeta del timbre elegido**: con Fagot, TODO de
      `Fagot/`; con Piano, de `Piano/`. Verificar espiando `HTMLMediaElement.play`.
- [ ] Cadencia i–iv–V–i correcta en C#m y A♭m (tríadas apiladas; V MAYOR con VIIsen).
- [ ] Timbre `Aleatorio`: cambia por pregunta; radiofaro y llegada usan el timbre de la
      pregunta vigente.
- [ ] Selector: con 2 grados jamás el mismo seguido; con los 11 activos, los 11
      aparecen antes de repetirse alguno (en tonalidad ≠ A#m).
- [ ] A#m con IVly activo: aviso en menú, el grado nunca suena, el juego no se rompe.
- [ ] Radiofaro: resta 1, toca el acorde MENOR de la tonalidad correcta, a 0 se
      deshabilita, los no usados suman +15.
- [ ] Deriva: −2 piso 0; racha 0; revelación + tónica→nota; par mutable dispara la
      comparación; color desatura y regresa; reintento con pregunta nueva.
- [ ] Sin respuesta = deriva con mensaje "El anillo no recibió rumbo".
- [ ] Regla de silencio: ni cometa hermano ni rugidos ni guiños durante pregunta.
- [ ] Ventana coincide con §7.3 en las 4 velocidades (cronometrar).
- [ ] Puntos: `(10 + racha×2 + rapidez) × mult`, llegada +100×mult, gala +150.
- [ ] Las 15 rutas cargan; misma tonalidad = mismo cielo entre sesiones (seed); las 15
      constelaciones se dibujan y progresan.
- [ ] La espiral canta melódica↑ y natural↓ con la ortografía de la tonalidad
      (verificar C#m y A♭m).
- [ ] Gala solo con 0 derivas Y 0 radiofaros.
- [ ] Teclado completo: 1–7, QWER (solo activos), Espacio, B, Esc.
- [ ] `?lang=en` traduce TODO (menú, consola, bitácora de a bordo, Planetario,
      glosario, resumen).
- [ ] Sin audio antes del gesto INICIAR VIAJE.
- [ ] Guardado tras cada decisión: matar la pestaña a medio viaje no pierde stats.
- [ ] `Esc` congela: cometa, ventana, ducking, timers de eventos.
- [ ] ≥ 50 fps y < 200 draw calls en la ruta más cargada (Cúmulo de Faroles).
- [ ] Sin errores en consola del navegador en un viaje completo con derivas.
- [ ] Móvil: fuera de alcance v1 (documentado); el layout no explota en ventana
      angosta.

---

## 15. Publicación en el website (F11 — solo con OK de Luis)

El proyecto YA vive en `apps-src/grados-menores-juego/` (no hay paso de copia de
carpeta). Pasos:

1. `scripts/copy-dist.mjs` igual al del Expreso
   (`apps-src/grados-mayores-juego/scripts/copy-dist.mjs`) con target
   `public/apps/grados-menores-juego`.
2. `npm install && npm run deploy` dentro de `apps-src/grados-menores-juego`.
3. Página `app/[locale]/apps/grados-menores/juego/page.tsx` calcada de
   `app/[locale]/apps/grados-mayores/juego/page.tsx` (el Expreso — tampoco usa mic):
   - título: `El Cometa — Modo juego de Grados Escala Menor` /
     `The Comet — Minor Scale Degrees game mode`
   - `getLocalizedRouteUrls("/apps/grados-menores/juego")`, `noIndex: true`
   - `background="#0e1428"`, badge `{ label: es ? "Modo juego 3D" : "3D game mode",
     bg: "rgba(159,216,232,0.14)", border: "rgba(159,216,232,0.35)", color: "#9fd8e8" }`
   - tagline: `Toda órbita vuelve a casa` / `Every orbit returns home`
   - iframe `src={`/apps/grados-menores-juego/index.html?lang=${locale}`}` con
     `allow="autoplay"` (SIN `microphone`).
4. En `data/apps/apps-catalog.ts`, entrada `slug: "grados-menores"`: añadir
   `gameUrl: "/apps/grados-menores/juego"`,
   `gameLabel: { es: "Modo juego 3D", en: "3D game mode" }` y feature nueva al inicio:
   `{ es: "Modo juego 3D: El Cometa, pilota tu cometa de vuelta a casa decidiendo cada grado de oído",
      en: "3D game mode: The Comet, pilot your comet back home by recognizing each degree by ear" }`.
5. Revisar si `i18n/routing.ts` y `proxy.ts` requieren registrar la ruta nueva (calcar
   cómo quedó registrada `/apps/grados-mayores/juego` en F11 del Expreso).
6. Probar en el sitio local `/es/apps/grados-menores/juego` y `/en/...`.
7. Commit y push a `main` (workflow de la casa: publicar = push a main, deploy en
   Vercel) — pero solo cuando Luis dé el OK de F11.

---

## 16. Trampas conocidas / notas técnicas

- **`♭` es U+266D, no la letra "b"**; `Minor Chords` lleva espacio (→ `%20`). Usar
  SIEMPRE el `audioUrl()` portado, que además aplica los **fallbacks enharmónicos
  C##→D y G##→A** (§3.2) — sin él, D#m y A#m dan 404 en su sensible.
- **A#m no tiene samples de IVly (E##)**: comportamiento heredado de la webapp seria —
  el grado simplemente no se sortea. Aviso en menú, sin crash (§3.2).
- **No existen samples de acorde para iv/V** (solo las 15 tónicas): esas dos tríadas se
  apilan desde notas sueltas. **El V es MAYOR** (con VIIsen): si suena menor, la tríada
  está mal construida. El acorde de tónica sí usa su sample (§3.4).
- **La referencia de ruteo es la webapp seria** `apps-src/grados-menores/` (`app.js` +
  `engine.js`): sus URLs funcionan en producción. Antes de "arreglar" una ruta, mirar
  cómo la construye ella.
- **`scaleDegrees` es la única fuente de ortografía**: jamás derivar nombres por
  semitono. La espiral, la cadencia y los mensajes toman la clase escrita del mapa. El
  nombre TEÓRICO se muestra siempre (ej. "Era C## (VIIsen)") aunque el AUDIO use el
  archivo fallback.
- **Regla de octavas por MIDI real** (no por semitono simple): copiar `writtenMidi` y
  la lógica de `triadFiles`/`scaleWalkFiles` del `degrees.ts` del Expreso — la
  convención de archivos hace que la octava siga a la LETRA (B#3 suena C4; C♭4 suena
  B3). La bitácora del Expreso (F1) documenta por qué la regla simple falla.
- **El orden canónico menor está INTERCALADO** (`ALL_DEGREES_OPTIONS` §3.1): no
  agrupar "diatónicos primero, cromáticos después" como el Expreso — la consola menor
  presenta los 11 por altura.
- **`base: "./"` en Vite es obligatorio** (vivirá bajo `/apps/grados-menores-juego/`).
- **Un solo AudioContext** compartido entre samples, synth-sfx y ducking (creado tras
  el gesto). No crear contextos por módulo.
- **Frame de Frenet de la spline**: para boyas y roll usar `computeFrenetFrames` o
  up-vector con corrección — los flips de normal se notan feo en la estela doble.
- **Streaming**: `geometry.dispose()`/`material.dispose()` de segmentos viejos (los
  materiales compartidos NO). Vigilar `renderer.info.memory` en QA.
- **Fondo espacial ≠ negro puro**: usar azul noche `#0e1428` como piso de color — el
  negro absoluto mata la percepción de movimiento. La estela, las boyas y el polvo
  cercano son los que venden velocidad; cuidarlos como el Expreso cuida su traqueteo.
- **Sprites de estela/polvo**: 3 texturas de canvas compartidas entre TODOS; reciclar,
  no crear/destruir. **Cero `PointLight` dinámicos** por boya/anillo: emissive + halos
  sprite. Luces: ambiente + estrella natal + (opcional) 1 luz cálida fija de carlinga.
- **localStorage dentro de iframe** funciona (mismo origen); prefijo `cometa-`;
  guardar tras CADA decisión; NO tocar `GradosMenoresStats` (webapp seria).
- **`tsc --noEmit` corre en `npm run build`**: mantener tipado siempre.
- **Pausa** congela TODO: avance, ventana, agenda de eventos y ducking (no dejar el
  murmullo al 30 % en pausa).
- **Dev server por IP**: `http://127.0.0.1:5176` (en Windows `localhost` puede
  resolver a IPv6 y no responder — nota heredada de la bitácora del Expreso).
- SFX sintetizados con WebAudio, no buscar assets. Música ambiental: stub
  `startAmbient(region)` para cuando Luis entregue audio.
