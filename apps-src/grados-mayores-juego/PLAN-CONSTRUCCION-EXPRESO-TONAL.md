# EXPRESO TONAL — Plan maestro de construcción

**Videojuego 3D de grados de la escala mayor para Storm Studios Learning**
Documento de handoff escrito por Claude (Fable 5) el 2026-07-19, con diseño aprobado por
Luis Cárdenas. Este documento es **autocontenido**: un agente (Codex, Gemini, Claude) o un
desarrollador humano debe poder construir el juego completo leyendo solo esto (más los dos
archivos de `referencias/`).

> **Estado actual del proyecto: SOLO EXISTEN ESTE DOCUMENTO Y `referencias/`.** No hay código.
> La carpeta de trabajo es `C:\Users\Luis\Documents\claude_code\expreso-tonal-mayores\`.
> El juego se desarrolla y prueba **standalone** (Vite propio) en esta carpeta; NO toca el
> repo del sitio hasta la fase final de migración (F11).

---

## 0. Instrucciones para el agente que continúe

1. Trabaja **por fases en orden** (sección 13). No saltes fases: cada una tiene criterios
   de aceptación verificables.
2. Mantén un archivo `BITACORA-DESARROLLO.md` en esta carpeta: al terminar cada fase anota
   fecha, qué se hizo, decisiones tomadas y pendientes. El siguiente agente empieza leyéndolo.
3. **No renegocies las decisiones de diseño** de la sección 2: ya fueron discutidas y
   aprobadas por Luis. Si algo es técnicamente imposible, anótalo en la bitácora y
   pregunta a Luis antes de cambiar el diseño.
4. **NO ejecutes la fase F11 (migración al website) sin confirmación explícita de Luis.**
5. Idioma del código: identificadores y comentarios en inglés o español (consistente con
   los juegos existentes, que mezclan); textos de UI SIEMPRE bilingües es/en vía i18n.
6. Crédito obligatorio en el menú: *"Desarrollado por Luis Cardenas para Storm Studios Learning"*.
7. Los valores numéricos marcados como **[tunable]** viven TODOS en `src/config.ts` con el
   valor propuesto aquí como default. **Luis es un maestro exigente y va a endurecer el
   juego jugándolo**: cualquier cosa que un tirano querría apretar (tiempos, silbatos,
   castigo de desvío, cuota de decisiones) DEBE ser un tunable, no una constante enterrada.
8. Los gemelos arquitectónicos de este juego son **Batisfera** (`apps-src/acordes-juego/`)
   y **Aerostato** (`apps-src/acordes-cantar-juego/`), ambos en el repo del sitio: ante
   cualquier duda de "cómo se hace X en la casa", mira cómo lo hicieron ellos y sus planes
   (`PLAN-CONSTRUCCION-BATISFERA.md`, `PLAN-CONSTRUCCION-AEROSTATO.md`). Batisfera es la
   referencia principal (este juego, como ella, NO usa micrófono).
9. La teoría musical autoritativa está COPIADA en `referencias/data.js` y
   `referencias/engine.js` (tomados de la app base). Las tablas se portan de ahí
   **verbatim** — no re-derivar ortografías enarmónicas de memoria, JAMÁS.

---

## 1. Contexto: la plataforma Storm Studios

Sitio: https://www.stormstudios.com.mx — plataforma de educación musical (Next.js 15 +
next-intl es/en). Repo local del sitio:

```
C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios
```

> **Convención de rutas de este documento:** toda ruta que empiece con `apps-src/`,
> `public/` o `app/` es RELATIVA a ese repo del sitio. La carpeta de trabajo del juego es
> la indicada arriba (`D:\codex\expreso-tonal-mayores`), fuera del repo.

Patrón de la casa: cada app de entrenamiento auditivo tiene dos experiencias:

| Experiencia | Ruta | Qué es |
|---|---|---|
| Webapp "seria" | `/es/apps/grados-mayores/jugar` | Entrenador configurable con estadísticas |
| Videojuego | `/es/apps/grados-mayores/juego` | Juego temático con la misma pedagogía |

Las apps son estáticas bajo `public/apps/<nombre>/`; los juegos modernos son **apps Vite
independientes** en `apps-src/<nombre>/`, compiladas a `dist/` y copiadas con
`scripts/copy-dist.mjs`. El sitio las embebe con
`<iframe src="/apps/<nombre>/index.html?lang={locale}">`.

Videojuegos existentes (referencia de estilo y arquitectura):

| Juego | App base | Estilo | Fuente |
|---|---|---|---|
| Cosmic Ear | Desglose | Nave 3D, cantar notas | `public/apps/cosmic-ear/js/app.jsx` |
| Synth-Kong | Intervalos–Reconocimiento | Retro 2D | `public/apps/intervalos-reconocimiento-juego/` |
| Intervalos Cantados juego | Intervalos–Cantados | Torreta, cantas para disparar | `apps-src/intervalos-cantados-juego/` |
| Walking AP Multi | Oído Absoluto Multi | 3D three.js, primera persona | `apps-src/oido-absoluto-multi-juego/` |
| **Batisfera** | Acordes–Reconocimiento | **3D primera persona, fosa oceánica** | `apps-src/acordes-juego/` |
| Aerostato | Cantar Acordes | 3D primera persona, cielo + mic | `apps-src/acordes-cantar-juego/` |

**EXPRESO TONAL es el videojuego de la app "Grados Escala Mayor"** (slug `grados-mayores`,
webapp seria en `public/apps/grados-mayores/` — JS plano, sin build; su `data.js` y
`engine.js` están copiados en `referencias/`).

**La tesis del juego:** en la música tonal, *todos los caminos llevan a la tónica*. El
jugador es maquinista: cada bifurcación de la vía es un grado que reconocer, y el destino
del viaje — la Estación Terminal — ES la tónica hecha arquitectura. Batisfera desciende,
Aerostato asciende; el Expreso **avanza hacia casa**: el eje de este juego no es vertical,
es la *distancia a la tónica*.

---

## 2. Decisiones de diseño CERRADAS (aprobadas por Luis)

1. **Nombre:** *Expreso Tonal* (ES) / *Tonal Express* (EN).
   Tagline: *"Escucha. Decide. Llega."* / *"Listen. Decide. Arrive."*
2. **Concepto:** conduces una locomotora de vapor de época (madera, latón, manómetros)
   **vista SIEMPRE en primera persona desde la cabina**. La vía corre sola; tu única
   tarea musical es decidir en cada bifurcación.
3. **Loop central:** al acercarse cada bifurcación suena un **grado aleatorio** del pool
   que el alumno eligió. Responder el grado correcto alinea la aguja hacia la línea
   principal; **20 decisiones correctas** [tunable] llevan a la Estación Terminal.
4. **El timbre del tren es el acorde de tónica** (sample real `Major Chords` de R2, §3.4).
   Tocarlo recuerda el centro tonal pero **cuesta 1 silbato**; hay **3 silbatos por
   viaje** [tunable]. Re-escuchar la NOTA de la pregunta es gratis e ilimitado (igual que
   el botón "Repetir" de la webapp seria).
5. **Error o silencio = desvío real, NO reset total** (aprobado por Luis): el tren toma
   físicamente la vía equivocada, recorre un apartadero gris y neblinoso (~10 s), se
   reincorpora a la línea principal y **pierde 2 de progreso** (piso 0) [tunable]. La
   **racha** sí se resetea a 0 con cada error (es multiplicador de puntos, no progreso).
   El reset total de progreso queda reservado para un futuro modo duro (§7.8), NO en v1.
6. **Durante el desvío hay feedback pedagógico**: la consola revela la respuesta
   ("Era B♭ — IVly, IV lidio"), y se reproduce tónica → nota, para re-anclar el oído.
7. **Progresión elegida por el alumno, no por niveles** (decisión explícita de Luis): el
   setup es como el de la webapp seria — eliges tonalidad (15), timbre (6) y **qué grados
   trabajar** (7 diatónicos + 5 cromáticos, chips con "Solo diatónicos" / "Todo").
   **Nosotros ofrecemos la velocidad**: Lento / Normal / Rápido / Maestro, que determina
   cuánto tiempo hay para responder (§7.3). No hay capas ni desbloqueos de contenido.
8. **Visualmente muy interesante desde la cabina** (prioridad explícita de Luis): rutas
   largas con escenografía evolutiva. 15 tonalidades = 15 rutas fijas y reconocibles
   (seed por tonalidad), construidas con 5 biomas × 3 variantes de hora (§5.4), con
   landmarks, fauna, trenes que se cruzan y guiños al universo Storm (§5.6).
9. **La Estación Terminal es una maravilla de la creación** (pedido textual de Luis):
   catedral de hierro y cristal, y la aproximación final pasa bajo **8 arcos que cantan
   la escala mayor completa**, grado por grado, hasta el acorde de tónica con campanas
   (§12). El viaje entero es el V–I; la estación es la resolución.
10. **Regla de silencio pedagógico:** desde que suena la nota de la pregunta hasta que la
    aguja se resuelve, NINGÚN otro audio con altura suena (traqueteo baja a 30 %, eventos
    ambientales suprimidos). Todo sonido afinado del mundo proviene solo de: preguntas,
    repeticiones, silbato-tónica, cadencia de salida y la llegada.
11. **Sin micrófono.** Es un juego de reconocimiento: entrada por botones/teclado, como
    Batisfera. (Simplifica todo el stack respecto a Aerostato.)
12. **Un solo modo en v1: "El Viaje"** (las 20 decisiones). No se copian los tres modos de
    la casa: la webapp seria ya los tiene. Ideas de modos duros futuros quedan
    documentadas en §7.8 sin implementarse.
13. **Colección = Salón de Rutas**: tablero de salidas de estación con las 15 tonalidades,
    con estados (No viajada / Llegada / Llegada de Gala) y medallas (§7.6), más
    estadísticas por grado como la webapp seria.
14. **Desktop primero; móvil fuera del alcance de v1** (igual que Batisfera/Aerostato).
    No bloquear el diseño: `touch-action: none` y layout flexible desde el inicio.
15. Bilingüe es/en vía `?lang=`, 5 timbres de R2, estadísticas en localStorage — igual que
    toda la plataforma.

---

## 3. Datos musicales y de audio (autoritativos — portar de `referencias/`)

### 3.1 Tonalidades y grados

Portar **verbatim** de `referencias/data.js` a `src/music/degrees.ts`:

- `SCALES` — las 15 tonalidades mayores:
  `["C♭","C","C#","D♭","D","E♭","E","F","F#","G♭","G","A♭","A","B♭","B"]`.
- `DIATONIC_DEGREES = ["I","II","III","IV","V","VI","VII"]`.
- `CHROMATIC_DEGREES = ["IVly","VImen","IIfr","VIIST","IIImen"]`
  (#4 lidio, ♭6 menor, ♭2 frigio, ♭7 subtónica, ♭3 menor — el sistema de "colores
  cromáticos" de Storm Studios).
- `scaleDegrees` — el mapa tonalidad → { pitchClass → grado }, con la **ortografía
  enarmónica correcta por tonalidad** (en C# mayor el IVly es F##; en G♭ el IIfr es A♭♭).
  Este mapa es sagrado: copiar tal cual, incluidas dobles alteraciones.
- `DEGREE_GLOSSARY` — nombres bilingües (Tónica/Tonic … VII subtónica (♭7)/Subtonic VII (♭7)).
- Orden canónico de presentación de grados = `ALL_DEGREES_OPTIONS`
  (diatónicos I…VII, luego IVly, VImen, IIfr, VIIST, IIImen). Los botones de respuesta y
  las estadísticas SIEMPRE usan este orden (helper `sortDegrees` de `referencias/engine.js`).

### 3.2 Inventario de samples (idéntico en los 5 timbres)

`NOTE_FILES` de `referencias/data.js`: **136 notas por timbre**, octavas 2–6 (C♭ va de 3
a 7; C llega a C7), incluyendo sostenidos, bemoles, **dobles bemoles (♭♭) y dobles
sostenidos (##)** — ej. `F##4`, `B♭♭3`, `A♭♭5`. Copiar la lista tal cual.

### 3.3 URLs de audio (CDN R2 — ya en producción, no requiere setup)

```
Base:        https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev
Nota:        {BASE}/{Timbre}/{NoteFile}.mp3        ej. {BASE}/Piano/F%234.mp3
Acorde tónica: {BASE}/{Timbre}/Major%20Chords/{tonic}major.mp3
                                                  ej. {BASE}/Coro/Major%20Chords/E♭major.mp3 (encoded)
SFX:         {BASE}/acierto.mp3   y   {BASE}/error.mp3
```

Timbres (carpetas EXACTAS): `Piano`, `Cello`, `Corno`, `Coro`, `Fagot`. Sexta opción de
UI: `Aleatorio`. **Codificación: usar `audioUrl()` de `referencias/engine.js`** (aplica
`encodeURIComponent` POR SEGMENTO — cubre `#`, `♭` (U+266D), `♭♭`, `##` y el espacio de
`Major Chords`). No construir URLs a mano.

Reproductor: portar a TS el patrón de la casa (clona nodos `Audio` para solapar, cache en
`Map`, precarga con timeout 3.5 s) — copiar el port ya hecho de Batisfera
(`apps-src/acordes-juego/src/audio/samples.ts`) y añadirle:

- `playNote(filePath)` — pregunta y repeticiones.
- `playTonicChord(timbre, tonic)` — el silbato del tren (sample `Major Chords`).
- `playTriad(files: string[])` — dispara 3 samples de nota a la vez (para la cadencia §3.5).
- `playScaleWalk(files, gapMs)` — secuencia con separación fija (para los arcos §12).

En timbre `Aleatorio`, el timbre se sortea **por pregunta**, y los sonidos de apoyo
(silbato, cadencia, llegada) usan el timbre de la pregunta vigente — portar
`getSupportAssetBaseDir` de `referencias/engine.js`.

### 3.4 El silbato-tónica (acorde de referencia)

Sample real por tonalidad y timbre: `{Timbre}/Major Chords/{tonic}major.mp3` — existe
para las 15 tonalidades en los 5 timbres (la webapp seria ya lo consume, ver
`playChord()` en `public/apps/grados-mayores/app.js`). Al tocarlo, superponer una
envolvente corta de ruido filtrado (WebAudio) para que "sea" un silbato de vapor además
del acorde — el acorde es la información, el vapor es el teatro. [tunable: mezcla]

### 3.5 La cadencia de salida (establece el centro tonal)

Al partir, el jefe de estación da el banderazo y suena **I – IV – V – I** (~1 acorde/s).

⚠️ **NO usar los samples `Major Chords` para IV y V**: en C# mayor no existe `G#major.mp3`
ni en C♭ mayor `F♭major.mp3` (solo hay acordes de las 15 tónicas). En su lugar,
**construir cada tríada apilando 3 samples de nota** con la ortografía del mapa
`scaleDegrees` — las tres clases de cada tríada son siempre diatónicas y están TODAS en
el inventario de 136:

| Tríada | Clases (grados del mapa) |
|---|---|
| I | I, III, V |
| IV | IV, VI, I |
| V | V, VII, II |

Regla de octavas: la fundamental en octava 3; tercera y quinta en octava 3 si su semitono
(mod 12) es mayor que el de la fundamental, si no en octava 4. Semitono de una clase
escrita: natural (C0 D2 E4 F5 G7 A9 B11) + 1 por `#`, +2 por `##`, −1 por `♭`, −2 por `♭♭`,
mod 12. Implementar `pitchClassSemitone()` y `triadFiles(scale, grado, timbre)` en
`src/music/degrees.ts` con tests de consola para C#, C♭ y G♭ (los casos con dobles).

El acorde final de la cadencia (I) SÍ puede ser el sample `Major Chords` (más rico) —
así la cadencia termina con el mismo sonido exacto que el silbato: el jugador aprende
*qué* le va a recordar el silbato. La llegada (§12) cierra con ese mismo sample.

### 3.6 Selección de preguntas (portar VERBATIM, está calibrado)

De `referencias/engine.js`, portar a `src/music/selector.ts`:

- `buildQuestionSet(scale, selectedDegrees, timbre)` — genera el pool
  `{pitchClass, filePath}` cruzando inventario × mapa de grados × grados activos ×
  carpetas de timbre (todas si es Aleatorio).
- `makeDegreeNoteSelector()` — selector de "bolsa barajada": cubre TODOS los grados
  seleccionados una vez antes de repetir, nunca repite grado dos veces seguidas (ni en el
  límite entre ciclos), y varía octava/timbre dentro de cada grado (nunca el mismo archivo
  exacto seguido). Es el corazón pedagógico del sorteo: **no lo "mejores"**.

Regla de setup: **mínimo 2 grados activos** para iniciar viaje (con 1 no hay decisión que
tomar; la webapp seria sirve para ese caso). Mensaje amable si falta.

---

## 4. Stack técnico

Idéntico a Batisfera (`apps-src/acordes-juego/PLAN-CONSTRUCCION-BATISFERA.md` §4) — mismo
`package.json` con `"name": "expreso-tonal-juego"`, Vite ^8 con `base: "./"`, TypeScript
^5.3 strict, `three ^0.160`, **única dependencia runtime: `three`**. Persistencia en
localStorage con prefijo `expreso-`. i18n propio (`src/i18n.ts`, `?lang=es|en`, default `es`).

**Fuentes**: Google Fonts **Playfair Display** (títulos — cartelería ferroviaria del XIX)
+ **Rajdhani** (UI — continuidad con la casa). Paleta de consola: latón `#c9a227`,
esmalte crema `#f3ead7`, hierro `#2b2b30`, caoba `#4a2c1a`, verde semáforo `#38d17c`,
rojo semáforo `#e04545`. [tunable]

---

## 5. Diseño del mundo: la ruta

### 5.1 Geometría de la vía

- La vía es una **spline continua** (`CatmullRomCurve3`) generada por segmentos con RNG
  sembrado (LCG — copiar `makeRng` de `apps-src/acordes-juego/src/3d/environment.ts`).
  **Seed fija por tonalidad**: `20260719 + índiceDeTonalidad` — cada ruta es idéntica
  entre sesiones (la ruta de Mi♭ SIEMPRE es la ruta de Mi♭: el alumno la reconoce).
- **Segmento** = tramo entre bifurcaciones: longitud 140 u [tunable]. Puntos de control
  con offset lateral ±30 u (curvas suaves en S, nunca recta aburrida) y ondulación
  vertical ±6 u (excepto la aproximación final, llana y solemne). El tren nunca decide
  la dirección visualmente ANTES de la aguja: la bifurcación siempre queda oculta tras
  una curva o elemento de paisaje hasta ~60 u.
- **Estructura del segmento** (por distancia desde su inicio):
  - 0–40 u: **zona muerta** — respiro, landmarks, eventos ambientales permitidos.
  - 40 u: **señal avanzada** (poste con disco amarillo): al cruzarla SUENA la pregunta
    y arranca la ventana de respuesta.
  - 140 u: **la aguja** (bifurcación física con semáforo de ala): deadline. La línea
    principal continúa; el ramal del desvío se aparta a la derecha hacia la niebla.
- **El desvío**: lazo en forma de lágrima de ~200 u que se reincorpora a la línea
  principal al inicio del MISMO segmento (el tren re-intenta el tramo con una pregunta
  NUEVA del selector). Ambiente §5.5.
- **Render de vía**: 2 rieles (`TubeGeometry` sobre curvas paralelas offset ±0.8 u),
  durmientes (`InstancedMesh` de cajas orientadas por el frame de Frenet, cada 1.6 u),
  balasto (cinta `PlaneGeometry` con vertex colors grises). La aguja: corazón + espadines
  que SE MUEVEN al resolverse (animación de 0.4 s con "clunk").
- **Streaming**: generar 3 segmentos por delante, disponer (dispose) los que queden > 200 u
  por detrás. El viaje completo son 20+ segmentos ≈ 3 km; las coordenadas se mantienen
  < 5000 u — sin rebase de origen, `Float32` aguanta.

### 5.2 El arco del viaje (escenografía evolutiva — el "escenario largo" que pidió Luis)

La ruta atraviesa 4 actos ligados al progreso (n = decisiones correctas netas):

| Acto | Progreso | Paisaje |
|---|---|---|
| 1. Partida rural | 0–25 % | Apeadero de madera, corrales, huertas, el bioma se insinúa |
| 2. Corazón del bioma | 25–60 % | Máxima densidad de landmarks del bioma (§5.4) |
| 3. Obras del hombre | 60–85 % | Puentes/viaductos, patios de carga, semáforos múltiples, catenarias |
| 4. Aproximación | 85–100 % | Vía llana y recta, la Terminal crece en el horizonte, los 8 arcos (§12) |

**La Terminal se ve desde lejos**: a partir del acto 3 aparece su silueta luminosa en el
horizonte y CRECE con cada decisión correcta — el progreso se ve, no solo se cuenta.
Además el **sol avanza durante el viaje** (elevación interpolada inicio→fin según la
variante de hora §5.4): el tiempo pasa, el mundo vive.

### 5.3 Luz y cielo

Mismo sistema de Batisfera/Aerostato: domo `SphereGeometry(BackSide)` con `ShaderMaterial`
de gradiente vertical de 2 paradas + `FogExp2` cuyo color ES el color de horizonte del
domo (misma variable, sin costuras; el domo no recibe fog). `DirectionalLight` + sprite
de glow para el sol. Keyframes de color POR BIOMA Y VARIANTE (§5.4), interpolados por
progreso del viaje (no por altitud). Estrellas (`THREE.Points`) solo en las variantes
nocturnas/crepusculares del Páramo. Sin sombras dinámicas (`castShadow` OFF global).

### 5.4 Biomas y asignación de rutas (15 = 5 biomas × 3 horas)

RNG sembrado por tonalidad; geometría compartida por bioma, paleta según hora.

| Bioma | Identidad | Landmarks propios | Rutas (tonalidad · hora) |
|---|---|---|---|
| **Valle Dorado** | campiña, río especular, maizales | molino de agua, torre de agua, vacas, garzas | C · mediodía, G · amanecer, F · atardecer |
| **Desierto de Agaves** | mesas rojas, agaves y cactus instanciados | tolvaneras (sprites), esqueleto de rueda de carreta, halcones | D · mediodía, A · atardecer, E · amanecer |
| **Sierra de Niebla** | pinos, barrancas, jirones de niebla baja | **viaducto de piedra**, **túnel corto**, cascada | E♭ · amanecer, A♭ · mediodía, B♭ · atardecer |
| **Costa de Salinas** | mar al fondo (plano shader 2 octavas de ruido, patrón "mar de nubes" de Aerostato), palmeras, salinas espejo | **faro**, gaviotas, barco lejano | F# · atardecer, B · mediodía, D♭ · amanecer |
| **Páramo de Estrellas** | altiplano nevado, cielo violeta profundo | **auroras** (cintas shader, patrón Aerostato), liebres, nieve (partículas recicladas, patrón "nieve marina" Batisfera) | C# · noche estrellada, C♭ · crepúsculo, G♭ · aurora |

Las tonalidades "exóticas" (C#, C♭, G♭) reciben el bioma más exótico: recompensa visual
por estudiar las escalas difíciles. El menú muestra un swatch del bioma junto a cada
tonalidad.

### 5.5 El desvío (apartadero)

Paleta desaturada instantánea (lerp del fog a gris `#7a7d82`, luz −40 %), árboles secos,
un andén fantasma con un farol oxidado parpadeante, hierba alta entre durmientes,
traqueteo amortiguado. A la mitad del lazo, la consola muestra la respuesta correcta y
suena tónica → nota (§2.6, decisión cerrada). Al reincorporarse, el color VUELVE en 2 s
— el contraste gris→color es el castigo emocional y el alivio.

### 5.6 Decorado transversal y guiños (presupuestos)

| Elemento | Técnica | Presupuesto |
|---|---|---|
| Terreno | `PlaneGeometry` por tile 200×200 seg. bajos, ruido + vertex colors por bioma, 3×3 tiles reciclados alrededor del tren | 9 draw calls |
| Postes de telégrafo | `InstancedMesh` cada 18 u junto a la vía, catenaria simple (Line) — el ritmo visual hipnótico del tren | 2 draw calls |
| Mojones de km + señales viejas | InstancedMesh, decorativos | 1 draw call |
| Nubes | racimos de 5–12 `THREE.Sprite` (3 texturas canvas compartidas), reciclados | ~200 sprites vivos |
| Fauna por bioma (aves en V, halcones, gaviotas, liebres) | `InstancedMesh` low-poly, aleteo por fase en CPU (patrón golondrinas de Aerostato) | ≤ 3 draw calls |
| **Tren de carga que se cruza** | 1–2 por viaje, vía paralela en zona muerta, 8–12 vagones instanciados, **bocina SIN altura definida** (cluster de ruido sintetizado — regla §2.10) con doppler manual (rampa de playbackRate + paneo) | 1 grupo |
| Guiño Aerostato | el globo dorado de Aerostato MUY alto en el cielo, 1 vez por viaje (biomas Valle/Sierra) | trivial |
| Guiño Batisfera | en Costa: barco con grúa y esfera de batisfera colgando, lejano | trivial |
| Estación Terminal | §12 | presupuesto propio |

**Presupuesto de rendimiento: ≥ 50 fps desktop, < 200 draw calls.** Texturas SOLO de
canvas (cero assets de imagen). Materiales compartidos por tipo. Los eventos ambientales
(tren cruzado, guiños) se agendan SOLO en zonas muertas y se suprimen si hay pregunta
activa (regla de silencio §2.10).

---

## 6. La cabina (cockpit)

Híbrido 3D + overlay HTML (patrón Batisfera: el overlay es más nítido y bilingüe).

**En 3D (hijos de la cámara):**
- Marco de la ventana frontal: montantes de madera/hierro, cristal con reflejo especular
  fingido (sprite tenue). Se ve la **caldera** alargada delante (cilindro con remaches
  por textura canvas + chimenea humeando: sprites de vapor reciclados).
- Laterales: ventanillas abiertas (se ve pasar el paisaje en periferia — vende velocidad).
- Abajo: tablero físico con **manómetros** (agujas animadas: velocidad, "presión") y la
  **palanca de silbato** que se mueve al usarlo.
- **Balanceo procedural**: cabeceo y roll ±0.8° con dos senos desfasados + microvibración
  de traqueteo proporcional a velocidad (amplitud 0.05 u [tunable]). En curvas, roll
  peraltado hacia el interior (+1.5°). Es EL efecto que hace que "ser tren" se sienta;
  cuidarlo como Aerostato cuida su quemador.
- Cámara: FOV 60, mirar con drag de mouse SIN pointer lock (patrón de la casa): yaw
  clamp ±100°, pitch ±35°, y **auto-recentrado suave** al soltar (2 s) — la vista
  descansa siempre al frente, donde está el juego.

**En overlay HTML/CSS (la CONSOLA DE LATÓN, parte inferior):**
- **Panel de grados** (el instrumento principal, centro): una fila de palancas-botón de
  latón, SOLO los grados activos del setup, en orden canónico §3.1. Cada una muestra el
  número romano grande y su etiqueta corta (IVly → "#4"); tooltip con el nombre del
  glosario. Estados: reposo / hover / **bloqueada** (ya respondida esta pregunta) /
  correcta (verde) / incorrecta (roja).
- **Tira de ruta** (canvas ~420×40 px): 20 nudos hacia la silueta de la Terminal; nudos
  completados en dorado, desvíos como pequeños lazos grises añadidos donde ocurrieron,
  tren = punto que avanza. Es el altímetro de este juego.
- **Silbatos**: 3 iconos de silbato de latón; usados quedan en silueta. Botón grande
  "𝄞 Silbato (tónica)" junto a ellos.
- **Repetir nota** (gratis, ilimitado): botón "🔊 Repetir".
- **Ventana de respuesta**: barra fina que se vacía (distancia señal→aguja). En Maestro
  parpadea al 25 % final.
- **Marcadores**: puntos, racha (con animación al crecer), velocidad elegida.
- **Mensajes**: línea de consola estilo telegrama ("Correcto. Era F# (IVly).", patrón
  `correctMsg/wrongMsg` de la webapp seria — siempre revela nota y grado al resolverse).
- Viñeta CSS cálida (madera/latón en bordes inferiores) — vende la cabina gratis.

**En 3D sobre la vía** (información diegética duplicada): el semáforo de ala de la aguja
(brazo horizontal = pendiente; cae + luz verde = correcto; luz roja = desvío) y un
**cartelón de destino** en la bifurcación: "TERMINAL →" / "← APARTADERO".

---

## 7. Gameplay

### 7.1 Máquina de estados del viaje

```
MENÚ → PARTIENDO:
  · fundido desde negro en el apeadero; banderazo del jefe de estación
  · CADENCIA I–IV–V–I (§3.5) — el centro tonal queda establecido
  · el tren arranca (aceleración 3 s); HUD aparece
RODANDO (zona muerta):
  · velocidad de crucero × sprint 1.8 [tunable] (el tren corre entre señales)
  · eventos ambientales permitidos
  ──(cruza señal avanzada)──► PREGUNTA
PREGUNTA:
  · frena a velocidad de pregunta (la ventana de respuesta §7.3 es distancia/velocidad)
  · suena la nota (selector §3.6); traqueteo baja a 30 %; ambiente suprimido
  · [Repetir] gratis · [Silbato] toca acorde de tónica y resta 1 (si quedan)
  · el jugador pulsa una palanca de grado → SE BLOQUEA (sin cambio posterior)
  ──(palanca correcta)──► ACIERTO:
      · semáforo verde + ala cae + CLUNK de aguja + SFX acierto.mp3 (volumen bajo)
      · progreso +1 · racha +1 · puntos §7.5 · stats por grado
      · consola: "Correcto. Era {nota} ({grado})."  → RODANDO (siguiente segmento)
  ──(palanca incorrecta O la aguja llega sin respuesta)──► DESVÍO:
      · semáforo rojo + SFX error.mp3 · racha = 0 · progreso −2 (piso 0) · stats
      · el tren TOMA el ramal: apartadero gris §5.5 (~10 s [tunable])
      · a media vuelta: consola revela "Era {nota} ({grado} — {nombre glosario})"
        y suena TÓNICA → NOTA (re-anclaje §2.6)
      · sin respuesta: mensaje extra "La aguja no recibió orden."
      · reincorporación → RODANDO (el MISMO segmento se re-intenta con pregunta nueva)
PROGRESO = 20 ──► LLEGADA (§12): frenado ceremonial, 8 arcos, acorde final, RESUMEN
Esc en cualquier momento ──► PAUSA (congela tren, ventana, audio; reanudar/abandonar)
```

Notas:
- El silbato NO pausa la ventana de respuesta (gastar memoria cuesta tiempo también —
  guiño al tirano). [tunable: `WHISTLE_PAUSES_WINDOW = false`]
- Silbatos restantes al llegar: bonus +15 c/u (§7.5) — premia la memoria tonal.
- Con 0 silbatos el botón queda deshabilitado (silueta), sin castigo extra.

### 7.2 Progreso

`progreso = clamp(aciertos_netos, 0, 20)`; cada acierto +1, cada desvío −2. Se llega a
la Terminal al alcanzar 20 [tunable `DECISIONS_TO_ARRIVE`]. No existe "perder": el viaje
siempre puede completarse; la calidad se mide en desvíos, racha y puntos. (Modo con
fracaso posible: futuro, §7.8.)

### 7.3 Velocidades (la dificultad que ofrecemos nosotros)

Ventana de respuesta = 100 u de distancia señal→aguja ÷ velocidad de pregunta:

| Velocidad | u/s en pregunta | Ventana | Multiplicador de puntos |
|---|---|---|---|
| Lento | 8 | ~12.5 s | ×1.0 |
| Normal | 11 | ~9.1 s | ×1.25 |
| Rápido | 16 | ~6.3 s | ×1.5 |
| Maestro | 25 | ~4.0 s | ×2.0 |

Todos [tunable]. Duración aproximada de un viaje limpio en Normal: ~4 min + llegada.

### 7.4 Anti-frustración calibrada

- La pregunta NUNCA suena tapada: regla de silencio §2.10.
- Repetir la nota es gratis SIEMPRE (identidad pedagógica de la casa: castigar la
  re-escucha castiga la atención).
- El desvío re-intenta el mismo segmento con pregunta nueva del selector (la bolsa sigue
  su curso — no se "quema" cobertura).

### 7.5 Puntuación

`(10 + racha × 2 + bonusRapidez) × multiplicadorVelocidad` por acierto, donde
`bonusRapidez = round(5 × fracciónDeVentanaRestante)` (responder al instante vale +5).
Llegada: +100 × multiplicador. Silbatos sin usar: +15 c/u. Gala (§7.6): +150.
Todos [tunable].

### 7.6 Medallas y Salón de Rutas

Por viaje completado, medalla según desvíos: 🥇 **0 desvíos** · 🥈 **≤ 2** · 🥉 **llegar**.
**Llegada de Gala** = 0 desvíos Y 0 silbatos usados: livery dorado del tren en la
secuencia final, fuegos artificiales en la Terminal, placa dorada en el Salón.

El **Salón de Rutas** (pantalla desde menú y resumen) es un tablero de salidas de
estación de época (tipografía de solapas): 15 filas = 15 tonalidades, con estado
(— / Llegada / GALA), mejor medalla, mejor puntuación, mejor racha, velocidad de ese
récord y fecha de primera llegada. Abajo, la sección de **estadísticas por grado**
(precisión correct/total, orden canónico, barras) — equivalente del histórico de la
webapp seria, con botón de borrado con confirmación.

### 7.7 Persistencia (localStorage — guardar tras CADA decisión)

| Clave | Contenido |
|---|---|
| `expreso-stats` | `{ [grado]: { correct, total } }` (mismo esquema que la webapp seria, almacén separado) |
| `expreso-rutas` | `{ [tonalidad]: { llegadas, gala: bool, mejorMedalla, mejorScore, mejorRacha, velocidadRecord, primeraLlegadaISO } }` |
| `expreso-settings` | `{ escala, timbre, velocidad, gradosSeleccionados: string[], volumen }` |

### 7.8 Futuro (documentado, NO construir en v1 — el cajón del tirano)

- **Expreso Nocturno** (supervivencia): 3 desvíos = fin del viaje, de noche, sin bonus.
- **Vapor Contado** (contrarreloj): presión de caldera global que solo recargan los aciertos.
- **Modo Tirano**: reset total de progreso al fallar (la idea original de Luis), 0
  silbatos, solo Maestro, cromáticos obligatorios. Con placa propia en el Salón.
- Tunables ya listos para endurecer sin código: ventanas §7.3, `DETOUR_COST`,
  `WHISTLE_COUNT`, `DECISIONS_TO_ARRIVE`, `WHISTLE_PAUSES_WINDOW`.

---

## 8. Controles

| Input | Acción |
|---|---|
| Click en palanca / `1`–`7` | Responder grado diatónico I–VII |
| `Q` `W` `E` `R` `T` | Responder cromático, en orden de escala: IIfr(♭2), IIImen(♭3), IVly(#4), VImen(♭6), VIIST(♭7) |
| `Espacio` | Repetir la nota (gratis) |
| `B` | Silbato (acorde de tónica, cuesta 1) |
| Drag botón izquierdo | Mirar (yaw ±100°, pitch ±35°, auto-recentrado) |
| `Esc` | Pausa |

Los atajos cromáticos solo responden si ese grado está activo en el setup. Cada palanca
muestra su tecla en una esquinita. **El tren se conduce solo: no hay controles de
movimiento** — toda la atención del jugador es para el oído.

---

## 9. SFX y música

- SFX de assets R2: `acierto.mp3` (acierto, volumen bajo — no debe tapar el "clunk"),
  `error.mp3` (desvío).
- SFX WebAudio sintetizados (osciladores + noise + envolventes, CERO assets — patrón
  `synth-sfx.ts` de Batisfera): **traqueteo** clickety-clack en loop sincronizado a la
  velocidad real (2 golpes por par de durmientes), **chug de vapor** grave, **clunk de
  aguja** (transient metálico), campanilla de estación, **frenos** (noise agudo filtrado)
  para la llegada, bocina del tren cruzado (cluster SIN altura, §5.6), reverb corta al
  pasar túnel (convolver sintético o feedback delay), banderazo/silbatazo del jefe de
  estación (agudo, no confundible con el silbato-tónica).
- Ducking: durante PREGUNTA todo el bed sintetizado baja a 30 % [tunable].
- El silbato-tónica = sample `Major Chords` + capa de vapor (§3.4). Es la firma sonora.
- Música ambiental: stub `startAmbient(bioma)` documentado para cuando Luis produzca
  audio (patrón de la casa).

---

## 10. Pantallas y flujo de UI

```
[MENÚ PRINCIPAL]
  título EXPRESO TONAL + tagline ("Escucha. Decide. Llega." / "Listen. Decide. Arrive.")
  cartel de estación de época; crédito obligatorio §0.6
  · Ruta (tonalidad): 15 opciones con swatch de bioma + hora (§5.4)
  · Timbre: Piano | Cello | Corno | Coro | Fagot | Aleatorio · Volumen (slider)
  · Velocidad: Lento | Normal | Rápido | Maestro (con ventana en segundos visible)
  · Grados: chips diatónicos (7) + cromáticos (5) + accesos "Solo diatónicos" / "Todo"
    (mínimo 2; contador de grados activos como la webapp seria)
  · Botón SALÓN DE RUTAS · Botón INICIAR VIAJE (gesto de unlock de audio + precarga)
[JUEGO] canvas + consola → Esc: PAUSA (reanudar / abandonar viaje)
[LLEGADA] secuencia §12 (no interactiva, saltable con Esc tras 5 s)
[RESUMEN] decisiones totales, desvíos, precisión, mejor racha, silbatos restantes,
  puntos, medalla (+GALA), novedades del Salón → Reintentar ruta / Menú / Salón
[SALÓN DE RUTAS] tablero §7.6 + estadísticas por grado + borrar progreso (confirmación)
```

i18n: TODOS los textos vía `src/i18n.ts` (`{ es: {...}, en: {...} }`, helper `t(key)`,
`data-i18n` en HTML estático). Nombres de grados: `DEGREE_GLOSSARY` §3.1. Sin audio antes
del gesto INICIAR VIAJE (ahí se precargan cadencia, primeras preguntas y SFX).

---

## 11. Estructura de archivos objetivo

```
C:\Users\Luis\Documents\claude_code\expreso-tonal-mayores\
├── PLAN-CONSTRUCCION-EXPRESO-TONAL.md   ← este documento
├── BITACORA-DESARROLLO.md               ← lo mantiene el agente (crear en F0)
├── referencias\data.js, engine.js       ← app base copiada (SOLO lectura, no se importa)
├── package.json / tsconfig.json / vite.config.ts / index.html
├── scripts/copy-dist.mjs                ← F11 (adaptar de Walking AP Multi)
└── src/
    ├── main.ts            ← bootstrap: lang, pantallas, unlock audio, crea Game
    ├── i18n.ts            ← diccionario es/en + t()
    ├── style.css          ← pantallas, consola latón, viñeta, Playfair/Rajdhani
    ├── config.ts          ← TODOS los [tunable]: velocidades, ventana, silbatos,
    │                         DECISIONS_TO_ARRIVE, DETOUR_COST, puntos, biomas
    ├── music/
    │   ├── degrees.ts     ← SCALES, scaleDegrees, glosario, NOTE_FILES,
    │   │                     pitchClassSemitone, triadFiles (§3.1–3.5)
    │   └── selector.ts    ← buildQuestionSet + makeDegreeNoteSelector (port §3.6)
    ├── audio/
    │   ├── samples.ts     ← player TS (cache, playNote/playTonicChord/playTriad, SFX R2)
    │   └── synth-sfx.ts   ← traqueteo, vapor, clunk, frenos, bocina, túnel (§9)
    ├── game/
    │   ├── state.ts       ← GameStateManager: máquina §7.1, progreso, racha, silbatos,
    │   │                     score, eventos (subscribe) — lógica PURA
    │   └── persistence.ts ← stats, salón de rutas, settings (§7.7)
    ├── 3d/
    │   ├── renderer.ts    ← escena, cámara, loop, resize
    │   ├── track.ts       ← spline por segmentos, rieles/durmientes/balasto, agujas,
    │   │                     semáforos, señales avanzadas, desvío, streaming (§5.1)
    │   ├── train.ts       ← avance sobre spline, sprint/frenado, balanceo, vibración (§6)
    │   ├── cab.ts         ← cabina 3D: marco, caldera, manómetros, palanca, vapor
    │   ├── environment.ts ← domo shader, sol viajero, fog, keyframes por bioma/hora (§5.3)
    │   ├── scenery.ts     ← biomas, landmarks, fauna, tren cruzado, guiños (§5.4–5.6)
    │   └── station.ts     ← Terminal, 8 arcos, secuencia de llegada, gala (§12)
    └── ui/
        ├── screens.ts     ← menú/setup, pausa, resumen, salón de rutas
        ├── hud.ts         ← consola: palancas, silbatos, ventana, marcadores, telegrama
        └── routemap.ts    ← canvas de la tira de ruta (20 nudos + lazos de desvío)
```

Regla de dependencias (patrón de la casa): `game/` y `music/` NO importan de `3d/` ni
`ui/` (lógica pura, testeable en consola); `3d/` y `ui/` se suscriben al
`GameStateManager` (observer).

---

## 12. La Estación Terminal (especificación de la maravilla)

El presupuesto de asombro del juego se gasta AQUÍ. Es la recompensa por 20 decisiones y
la resolución tonal hecha lugar.

**Arquitectura** (100 % procedural, LOD de silueta → detalle):
- Nave central de **hierro y cristal** estilo gran terminal del XIX elevada a lo
  imposible: bóveda de cañón de arcos parabólicos (~80 u de alto), costillas de hierro
  oscuro, paños de vidrio con **emissive cálido** desde dentro (la estación ES una
  linterna al atardecer/noche; de día brilla el oro de la piedra).
- Dos torres de reloj flanqueando la boca; el reloj es un **rosetón de 12 husos** (las 12
  clases de altura): los husos de los grados DIATÓNICOS de la tonalidad del viaje están
  iluminados — cada ruta tiene su rosetón. (Detalle para el que se fija; sin texto.)
- Vitral de fondo al final de la nave: sol radiante con rayos (canvas texture, emissive).
- Andenes con faroles, columnas de palmera de hierro, bancas, carritos de equipaje;
  vapor ambiental (sprites); palomas que despegan al entrar (InstancedMesh, una vez).

**La secuencia de llegada** (~35 s, no interactiva, saltable tras 5 s):
1. Acto 4 §5.2: vía llana, la silueta ya domina el horizonte, catenarias y agujas
   ornamentales pasan; el traqueteo se calma (ritardando literal: la velocidad baja).
2. **Los 8 arcos**: pórticos de hierro sobre la vía, cada uno con un medallón. Al cruzar
   cada arco se ilumina y SUENA el grado: I – II – III – IV – V – VI – VII – **I**
   (octava arriba), con la ortografía de la tonalidad, timbre del viaje, un arco por
   ~0.9 s (la velocidad de cruce se sincroniza — `playScaleWalk` §3.3). La escala mayor
   completa, ascendente, como alfombra de entrada.
3. Al cruzar el 8º arco: **acorde de tónica** (sample `Major Chords` — el MISMO sonido
   del silbato: el círculo se cierra), campana de estación, frenos suaves, y el tren
   entra a la nave dorada hasta detenerse en el tope con un suspiro de vapor.
4. Placa de resumen sobre el andén (estilo tablero de llegadas) → pantalla RESUMEN.
5. **Gala** (0 desvíos y 0 silbatos): además, livery dorado en la caldera visible desde
   la cabina, fuegos artificiales tras la bóveda de cristal, confeti de vapor dorado, y
   la campana repica 3 veces.

**Presupuesto**: la Terminal completa ≤ 60 draw calls, construida y añadida a escena al
entrar al acto 3 (lejos = impostor de silueta emissive de 2 planos; cerca = geometría).

---

## 13. Fases de construcción (con criterios de aceptación)

> Tras CADA fase: `npm run build` limpio (incluye `tsc --noEmit`) y entrada en
> `BITACORA-DESARROLLO.md`.

**F0 — Scaffold.** package.json, tsconfig strict, vite.config (`base: "./"`), index.html
con secciones de pantalla vacías, style.css base (fuentes, paleta latón), main.ts que
muestra el menú, i18n.ts con claves del menú, config.ts inicial con TODOS los tunables
de este plan.
✓ `npm run dev` levanta; título EXPRESO TONAL visible en es y en `?lang=en`.

**F1 — Música y samples.** `music/degrees.ts` + `music/selector.ts` (ports §3.1/3.6),
`audio/samples.ts`.
✓ En consola del navegador: `scaleDegrees["C#"]["F##"] === "IVly"`;
`triadFiles("C#","V",...)` = G#/B#/D# y `triadFiles("C♭","IV",...)` = F♭/A♭/C♭ (octavas
correctas); botón temporal reproduce nota, tríada y `playTonicChord` en Piano y Coro;
`B♭♭3` y `F%23%234` cargan sin 404; el selector en 50 sorteos con {I,IV,V} nunca repite
grado seguido y cubre los 3 antes de repetir.

**F2 — Vía y tren.** `3d/renderer.ts`, `track.ts` (spline, rieles, durmientes, streaming,
sin agujas funcionales aún), `train.ts` (avance, sprint, balanceo), `cab.ts` básico.
✓ El tren recorre 5+ segmentos generados con seed fija a 60 fps; el traqueteo sintetizado
late al ritmo de los durmientes; el balanceo y el peralte se sienten; drag de mirada con
auto-recentrado funciona.

**F3 — Cielo y biomas.** `environment.ts` + `scenery.ts` (terreno, domo, sol viajero,
2 biomas completos: Valle Dorado y Sierra de Niebla).
✓ Las rutas de C y E♭ se distinguen de un vistazo; el sol avanza durante el trayecto;
niebla baja en Sierra; túnel atravesable con oscurecimiento y reverb; ≥ 50 fps.

**F4 — Biomas restantes y vida.** Desierto, Costa (mar shader), Páramo (nieve + auroras
+ estrellas), fauna, postes de telégrafo, tren cruzado con doppler, guiños.
✓ Las 15 rutas cargan con su combinación bioma×hora de §5.4; el tren cruzado solo aparece
en zonas muertas; draw calls < 200.

**F5 — Consola y HUD.** `ui/hud.ts`, `routemap.ts`, cabina 3D completa (manómetros,
palanca de silbato), viñeta.
✓ Consola completa con datos simulados; palancas muestran solo los grados activos en
orden canónico con sus teclas; tira de ruta pinta nudos y lazos; ventana de respuesta
animada.

**F6 — Loop de juego.** `game/state.ts` (máquina §7.1), agujas funcionales con espadines
animados, semáforos, señal avanzada dispara pregunta, respuesta por click/teclado,
acierto (clunk + progreso), silbato-tónica con descuento, cadencia de salida.
✓ Partida jugable de principio a fin SIN desvíos (forzando aciertos): 20 decisiones,
puntos = fórmula §7.5, silbatos se agotan y deshabilitan, regla de silencio audible
(traqueteo baja durante pregunta).

**F7 — El desvío.** Ramal físico, lazo gris §5.5, feedback pedagógico (revelación +
tónica→nota), progreso −2 piso 0, racha 0, reintento del segmento con pregunta nueva.
✓ Fallar en la decisión 19 NO regresa a 0 (pierde 2); el mundo desatura y recupera color;
el caso "sin respuesta" muestra su mensaje propio; el mismo segmento se repite con nota
distinta.

**F8 — La Terminal.** `station.ts`: silueta creciente desde acto 3, arquitectura
completa, secuencia de llegada con los 8 arcos sincronizados, rosetón por tonalidad,
gala, resumen.
✓ Los 8 arcos suenan la escala de la tonalidad del viaje con ortografía correcta (QA en
C# y G♭); el acorde final es el sample `Major Chords`; la gala solo dispara con 0
desvíos y 0 silbatos; la secuencia es saltable tras 5 s.

**F9 — Salón de Rutas y persistencia.** `persistence.ts`, pantalla del Salón, medallas,
stats por grado, settings persistidos, guardado tras cada decisión.
✓ Cerrar y reabrir conserva todo; `mejorMedalla` y `mejorScore` solo mejoran; borrar
progreso pide confirmación; el tablero muestra las 15 rutas con sus estados.

**F10 — Pulido y QA.** Checklist §14 completo, pases de rendimiento, `npm run build` +
`npm run preview` + `?lang=en` íntegro.
✓ Checklist §14 al 100 %.

**F11 — Migración al website. ⚠️ SOLO CON OK EXPLÍCITO DE LUIS.** Pasos en §15.

---

## 14. Checklist de QA manual (F10)

- [ ] Los 12 grados suenan y se responden en al menos 3 tonalidades (C, C#, G♭) y 2
      timbres (Piano, Fagot); ningún 404 en Network (¡ojo con `♭♭` y `##`!).
- [ ] `Major Chords` carga para las 15 tónicas en los 5 timbres (75 URLs — script de
      consola vale).
- [ ] Cadencia I–IV–V–I correcta en C# y C♭ (tríadas apiladas, no samples de acorde).
- [ ] Timbre `Aleatorio`: cambia por pregunta; silbato y llegada usan el timbre de la
      pregunta vigente.
- [ ] Selector: con 2 grados activos jamás suena el mismo grado dos veces seguidas; con
      12 activos, los 12 aparecen antes de repetirse alguno.
- [ ] Silbato: resta 1, toca el acorde de la tonalidad correcta, a 0 se deshabilita, los
      no usados suman +15 en el resumen.
- [ ] Desvío: −2 con piso 0; racha a 0; revelación + tónica→nota a media vuelta; color
      desatura y regresa; reintento con pregunta nueva.
- [ ] Sin respuesta = desvío con mensaje "La aguja no recibió orden".
- [ ] Regla de silencio: ni tren cruzado ni bocinas ni guiños durante pregunta activa.
- [ ] Ventana de respuesta coincide con §7.3 en las 4 velocidades (cronometrar).
- [ ] Puntos: `(10 + racha×2 + rapidez) × mult`, llegada +100×mult, gala +150.
- [ ] Las 15 rutas cargan; misma tonalidad = mismo paisaje entre sesiones (seed).
- [ ] Los 8 arcos cantan la escala con la ortografía de la tonalidad (verificar C# y G♭).
- [ ] Gala solo con 0 desvíos Y 0 silbatos.
- [ ] Teclado completo: 1–7, QWERT (solo grados activos), Espacio, B, Esc.
- [ ] `?lang=en` traduce TODO (menú, consola, telegramas, Salón, glosario, resumen).
- [ ] Sin audio antes del gesto INICIAR VIAJE.
- [ ] Guardado tras cada decisión: matar la pestaña a medio viaje no pierde stats.
- [ ] `Esc` congela: tren, ventana de respuesta, ducking, timers de eventos.
- [ ] ≥ 50 fps y < 200 draw calls en la ruta más cargada (Páramo con auroras).
- [ ] Sin errores en consola del navegador en un viaje completo con desvíos.
- [ ] Móvil: fuera de alcance v1 (documentado); el layout no explota en ventana angosta.

---

## 15. Migración al website (F11 — solo con OK de Luis)

0. Copiar el proyecto (sin `node_modules`, sin `dist`, sin `referencias/`) de esta
   carpeta a `<repo sitio>\apps-src\grados-mayores-juego\` (convención `<slug>-juego`).
1. `scripts/copy-dist.mjs` igual al de Walking AP Multi
   (`apps-src/oido-absoluto-multi-juego/scripts/copy-dist.mjs`) con target
   `public/apps/grados-mayores-juego`. Respetar `STORM_WEBSITE_ROOT`; el default de los
   scripts hermanos ya apunta a la raíz real de arriba.
2. `npm install && npm run deploy` dentro de `apps-src/grados-mayores-juego`.
3. Página `app/[locale]/apps/grados-mayores/juego/page.tsx` calcada de
   `app/[locale]/apps/acordes/juego/page.tsx` (Batisfera — tampoco usa mic):
   - título: `Expreso Tonal — Modo juego de Grados Escala Mayor` /
     `Tonal Express — Major Scale Degrees game mode`
   - `getLocalizedRouteUrls("/apps/grados-mayores/juego")`, `noIndex: true`
   - `background="#1a1410"`, badge `{ label: es ? "Modo juego 3D" : "3D game mode",
     bg: "rgba(201,162,39,0.14)", border: "rgba(201,162,39,0.35)", color: "#c9a227" }`
   - tagline: `Escucha · Decide · Llega` / `Listen · Decide · Arrive`
   - iframe `src={`/apps/grados-mayores-juego/index.html?lang=${locale}`}` con
     `allow="autoplay"` (SIN `microphone` — este juego no lo usa).
4. En `data/apps/apps-catalog.ts`, entrada `slug: "grados-mayores"`: añadir
   `gameUrl: "/apps/grados-mayores/juego"`,
   `gameLabel: { es: "Modo juego 3D", en: "3D game mode" }` y feature nueva al inicio:
   `{ es: "Modo juego 3D: Expreso Tonal, conduce el tren a la Terminal decidiendo cada grado de oído",
      en: "3D game mode: Tonal Express, drive the train to the Terminal by recognizing each degree by ear" }`.
5. Revisar si `i18n/routing.ts` y `proxy.ts` requieren registrar la ruta nueva (buscar
   cómo están registradas `/apps/acordes/juego` y `/apps/cosmic-ear/jugar` y calcar).
6. Probar en el sitio local `/es/apps/grados-mayores/juego` y `/en/...`.
7. NO hacer commit/push sin que Luis lo pida.

---

## 16. Trampas conocidas / notas técnicas

- **`♭` es U+266D, no la letra "b"**: los nombres de archivo usan el símbolo real.
  Cualquier URL construida sin `encodeURIComponent` por segmento fallará. `Major Chords`
  lleva espacio (→ `%20`). Usar SIEMPRE el `audioUrl()` portado.
- **No existen samples de acorde para IV/V de todas las tonalidades** (§3.5): la cadencia
  usa tríadas apiladas de notas. Solo la tónica tiene sample de acorde.
- **`scaleDegrees` es la única fuente de ortografía**: jamás derivar nombres de nota por
  semitono (saldría D# donde la tonalidad pide E♭). Los 8 arcos, la cadencia y los
  mensajes de consola toman la clase escrita del mapa.
- **`base: "./"` en Vite es obligatorio** (el juego vivirá bajo `/apps/grados-mayores-juego/`).
- **Un solo AudioContext** compartido entre samples, synth-sfx y ducking (creado tras el
  gesto). No crear contextos por módulo.
- **Frame de Frenet de la spline**: para durmientes y peralte usar
  `curve.computeFrenetFrames` o un up-vector fijo con corrección — los flips de normal en
  curvas cerradas se notan feo en los rieles. Curvas suaves (§5.1) minimizan el riesgo.
- **Sincronía de los 8 arcos**: la llegada fija la velocidad del tren a
  `separaciónDeArcos / 0.9 s` — no confiar en que "más o menos coincide".
- **Streaming**: `geometry.dispose()` y `material.dispose()` de segmentos viejos (los
  materiales compartidos NO se disponen). Vigilar `renderer.info.memory` en QA.
- **Domo y fog comparten color de horizonte** (misma variable); el domo con
  `material.fog = false`.
- **Sprites de nubes/vapor**: 3 texturas de canvas compartidas entre TODOS; reciclar,
  no crear/destruir.
- **Cero `PointLight` dinámicos** por farol/arco: emissive + halos sprite. Luces: ambiente
  + sol + (opcional) 1 luz cálida fija de cabina.
- **localStorage dentro de iframe** funciona (mismo origen); guardar tras CADA decisión.
- **`tsc --noEmit` corre en `npm run build`**: mantener tipado siempre.
- **Pausa** congela TODO: avance del tren, ventana de respuesta, agenda de eventos
  ambientales y ducking (no dejar el traqueteo al 30 % en pausa).
- SFX sintetizados con WebAudio, no buscar assets. Música ambiental: stub
  `startAmbient(bioma)` para cuando Luis entregue audio.
