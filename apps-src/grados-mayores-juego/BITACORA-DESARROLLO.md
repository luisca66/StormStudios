# BITÁCORA DE DESARROLLO — Expreso Tonal

Registro por fases (PLAN §0.2). El agente que continúe empieza leyendo esto.

---

## 2026-07-19 — F0 Scaffold ✅ (Claude Fable 5)

**Hecho:**
- `package.json` / `tsconfig.json` (strict) / `vite.config.ts` (`base: "./"`) calcados de
  Batisfera; única dependencia runtime `three`. `npm run build` (incluye `tsc --noEmit`)
  limpio.
- `index.html` con todas las secciones de pantalla del PLAN §10 (menú, hud, llegada,
  resumen, salón, pausa, toast) — hud/llegada/salón vacías, se llenan en F5/F8/F9.
- `src/style.css`: paleta latón/esmalte/hierro/caoba, fuentes Playfair Display + Rajdhani,
  sistema de pantallas, chips, botones, toast, crédito.
- `src/i18n.ts`: patrón de la casa (`?lang=`, `t()`, `data-i18n`), claves del menú es/en.
- `src/config.ts`: TODOS los tunables del plan (viaje, vía, velocidades, puntos, audio,
  cámara, rutas bioma×hora, swatches).
- `src/music/degrees.ts`: constantes VERBATIM de `referencias/data.js` que el menú
  necesita (SCALES, grados, timbres, glosario, orden canónico). **Pendiente para F1:**
  `scaleDegrees`, `NOTE_FILES`, `pitchClassSemitone`, `triadFiles`, selector.
- `src/main.ts`: menú FUNCIONAL — selección de ruta (15 chips con swatch de bioma y
  tooltip bioma·hora), timbre, velocidad (muestra ventana en segundos y multiplicador),
  grados con "Solo diatónicos"/"Todo" y validación de mínimo 2 (aviso + INICIAR
  deshabilitado), volumen. INICIAR VIAJE y Salón muestran toast "en construcción".

**Decisiones:**
- **Puerto dev 5175** (5173 = Batisfera, 5174 = Aerostato). Registrado en el
  `launch.json` del repo del sitio como configuración `expreso-tonal`.
- `music/degrees.ts` se creó en F0 (adelantado del plan) porque el menú necesita las
  listas de grados; solo constantes, cero lógica.
- Settings del menú viven en memoria; persistencia en localStorage llega en F9 (plan).

**Verificado (criterios F0):** `npm run dev` levanta en 127.0.0.1:5175; título y menú
completos en es y en `?lang=en`; validación de 2 grados funciona con clicks reales;
0 errores en consola del navegador.

**Nota QA local:** `vite --host 127.0.0.1` no responde en `localhost` (IPv6 en Windows);
abrir siempre por `http://127.0.0.1:5175`.

---

## 2026-07-19 — F1 Música y samples ✅ (Claude Fable 5)

**Hecho:**
- `music/degrees.ts` completo: `scaleDegrees` y `NOTE_FILES` VERBATIM de referencias,
  `writtenMidi`, `degreeOfPitchClass`, `triadFiles` (tríadas de cadencia I–IV–V).
- `music/selector.ts`: port fiel de `buildQuestionSet`, `makeDegreeNoteSelector`
  (bolsa barajada intacta), `timbreDirsForSelection`, `supportTimbreDir`.
- `audio/samples.ts`: `SamplePlayer` (patrón Batisfera: cache + clonado + unlock con
  WAV silencioso + precarga con timeout) con `audioUrl` de encode POR SEGMENTO,
  `playNote`, `playTonicChord`, `playTriad`, `playScaleWalk` (cancelable), SFX.
- `src/dev/harness.ts`: arnés de QA montado SOLO con `?dev=1` (import dinámico, chunk
  aparte). Pruebas puras automáticas + botones de audio + sondas de red al CDN +
  `window.ExpresoQA` para QA manual. REUTILIZAR este arnés en fases siguientes.

**Decisión técnica (desviación documentada del PLAN §3.5):** la regla simple de octavas
del plan ("octava 3 si semitono > fundamental, si no 4") falla con clases que cruzan el
límite de octava por alteración (ej. B# en la tríada V de C#: semitono 0 pero suena
POR ENCIMA de G#3 como B#3=midi 60). Se implementó con MIDI real respetando la
convención de archivos (la octava sigue a la LETRA: B#3≈C4, C♭4≈B3). Cumple la
intención del plan; verificado por test sobre las 45 tríadas (inventario + interválica
4+3 exacta).

**Verificado (criterios F1):** pruebas puras 9/9 (mapa C#/G♭, tríadas C# V = G#3/B#3/D#4
y C♭ IV = F♭3/A♭3/C♭4, 45 tríadas en inventario, selector sin repetición consecutiva y
con cobertura por ciclo con 3 y con 12 grados, encoding de URLs); sondas de red:
**75/75 Major Chords** y **11/11 muestras críticas** (♭♭, ##, B#, E#, C♭7, SFX) OK;
reproducción real confirmada con clicks de usuario (nota, tríada, silbato-tónica,
cadencia C♭) sin errores en consola; `npm run build` limpio.

**Siguiente fase: F2** — Vía y tren: `3d/renderer.ts`, `track.ts` (spline por segmentos
con seed por tonalidad, rieles/durmientes/balasto, streaming), `train.ts` (avance,
sprint, balanceo, peralte), `cab.ts` básico, traqueteo sintetizado al ritmo de los
durmientes, mirada con drag + auto-recentrado. Criterios en PLAN §13-F2.

---

## 2026-07-19 — F2 Vía y tren ✅ (Claude Fable 5 → Codex)

**Hecho:**
- Se recuperó y cerró el trabajo incompleto de Fable en `track.ts`, `train.ts` y
  `cab.ts`: spline Catmull–Rom determinista por tonalidad, frames por distancia,
  streaming de rieles/balasto/durmientes, descarte de geometría rezagada, avance con
  sprint y rampa de salida, peralte, balanceo y microvibración.
- `3d/renderer.ts`: escena Three.js, cámara FOV 60, resize/DPR limitado, loop con `dt`
  acotado, iluminación y suelo neutrales de transición (el mundo final llega en F3).
- La cabina básica queda anclada al tren y no a la mirada: marco, tablero, manómetros,
  caldera, chimenea y ventanillas laterales.
- Drag sin pointer-lock con clamps yaw/pitch y auto-recentrado; se corrigió la capa HTML
  para que el canvas reciba eventos cuando no hay una pantalla activa.
- `INICIAR VIAJE` ya abre la escena usando ruta, velocidad y volumen elegidos. `Esc`
  pausa/reanuda; el diálogo permite volver al menú sin dejar loop o audio activos.
- `audio/train-sound.ts` usa **el único asset local entregado por Luis**,
  `sfx/smooth_train_sound.mp3` (30 s), en loop. Playback rate y mezcla siguen la
  velocidad real; no se añadieron capas de traqueteo sintetizadas.
- En `?dev=1`, `window.ExpresoF2.snapshot()` expone distancia, velocidad, chunks y pausa
  para QA manual sin contaminar producción.

**Decisiones:**
- El pedido de Luis sustituye la indicación original de PLAN §9 para F2: el bed del tren
  es el MP3 entregado, no un clickety-clack WebAudio. Los sonidos pedagógicos ya
  existentes en el arnés F1 no forman parte de este bed.
- F3 reemplazará cielo, fog y suelo neutrales por los biomas; F2 no adelanta decorado.

**Verificado:** `npm run build` limpio; Vite incluye el MP3 versionado en `dist/assets`
(721,197 bytes). Queda para la revisión perceptual de Luis ajustar, si hiciera falta,
la relación exacta playback-rate/velocidad desde `audio/train-sound.ts`.

### Ajuste perceptual F2 — continuidad de vía y puesto del maquinista

- Corregido el salto lateral al final de cada intervalo: la aproximación `t + epsilon`
  producía tangente cero exactamente en `t=1` y durante un frame obligaba al tren a mirar
  al rumbo global. `track.ts` usa ahora la derivada analítica continua de Catmull–Rom.
- Cámara desplazada al puesto izquierdo del maquinista, 28 cm más alta y ligeramente
  atrás; mirada de reposo inclinada 8° hacia abajo. El auto-recentrado vuelve a ese ángulo,
  no al horizonte, y el rango de drag se conserva alrededor de él.
- Los cuatro valores perceptuales viven en `config.ts` para afinarlos con Luis sin tocar
  la lógica. `npm run build` limpio después del cambio.

### Rediseño de cabina F2 — vía despejada

- Por decisión de Luis se eliminó por completo la trompa: caldera, chimenea, domo,
  laterales altos y tablero voluminoso ya no forman parte de la vista.
- `cab.ts` es ahora una cabina ferroviaria ligeramente más moderna: parabrisas
  panorámico trapezoidal, postes metálicos delgados, divisor descentrado, cristal apenas
  tintado, visera corta, tablero bajo y dos limpiaparabrisas discretos.
- La composición deja libre casi todo el campo central e inferior para leer rieles y
  durmientes. F5 añadirá instrumentos sobre el tablero bajo sin volver a bloquear la vía.
- `npm run build` limpio.

### Referencia visual de cabina metropolitana

- Luis validó la vía y la cámara existentes: **no se modifican**.
- La nueva referencia se aplicó solo a `cab.ts`: parabrisas panorámico sin poste central,
  carcasa marfil, consola clara envolvente bajo la ventana, dos pantallas, instrumentos
  analógicos mínimos, palanca, botones y limpiaparabrisas laterales.
- La geometría reproduce la composición funcional de la referencia sin incorporar la
  fotografía ni sus marcas de agua. `npm run build` limpio.

---

## 2026-07-19 — F3 Cielo y biomas ✅ (Codex)

**Hecho:**
- `3d/environment.ts`: domo shader de gradiente sin costura, `FogExp2` del mismo color
  de horizonte, luz hemisférica, sol con glow y arco temporal por variante de hora. El
  sol avanza con la distancia equivalente al progreso del viaje.
- `3d/scenery.ts`: terreno-cinta que sigue posición, altura y curvatura de la vía; tres
  segmentos por delante, uno de margen atrás y disposición de geometría rezagada.
- **Valle Dorado (C):** terreno verde-dorado, maizales y árboles instanciados, río y
  torre de agua. La paleta de mediodía es luminosa y de baja niebla.
- **Sierra de Niebla (E♭):** pinos y roca instanciados, jirones de niebla baja como
  `Points`, pilares de viaducto, cascada y túnel corto atravesable.
- El túnel interpola niebla/luz para oscurecer y aplica un feedback-delay corto al mismo
  `smooth_train_sound.mp3`; no añade ningún otro SFX.
- `renderer.ts` conecta ambiente y decorado a la ruta elegida. El arnés `?dev=1` expone
  ahora FPS suavizados, draw calls y chunks de vía/decorado en
  `window.ExpresoF2.snapshot()` para QA de rendimiento.
- Las otras rutas reciben por ahora solo su paleta de cielo y terreno neutral; sus biomas
  completos corresponden a F4.

**Rendimiento/memoria:** vegetación y cultivos usan `InstancedMesh`; niebla baja usa un
`Points` por chunk; no hay sombras dinámicas. Geometrías propias de cada chunk se liberan
al salir del margen de streaming.

**Verificado:** `tsc --noEmit` + build de Vite limpios. Pendiente únicamente la revisión
perceptual de Luis y confirmar ≥50 fps en su navegador mediante el snapshot de QA.

---

## 2026-07-19 — Revisión de F2/F3 (Claude Sonnet 5)

**Contexto:** esta sesión no pudo tomar screenshots reales — el Browser pane falló desde
el primer intento (`document.visibilityState: "hidden"`, `requestAnimationFrame` nunca
dispara en la pestaña, `computer{screenshot}` siempre agota el tiempo). Es una limitación
de la herramienta en esta sesión, no del juego: confirmado clonando el loop de `rAF` en
una pestaña nueva con el mismo resultado. **No hay evidencia visual propia de esta
revisión** — la validación perceptual de la cabina/cámara ya la hizo Luis directamente
(ver entradas de arriba); esta revisión cubre correctitud de código y comportamiento en
ejecución real, no estética.

**Método:** con `?dev=1`, `window.ExpresoF2.journey` expone la instancia real de
`JourneyRenderer`; invocar `journey["frame"](t)` repetidamente (avanzando `t` en pasos de
16.67 ms) ejecuta el loop de juego real —incluido `renderer.render()`— sin depender de
`requestAnimationFrame`. Permite simular minutos de viaje y capturar excepciones.

**Verificado (sin errores en ninguna prueba):**
- Build limpio (`tsc --noEmit` + `vite build`).
- Simulación larga en Valle Dorado (C): >1100 unidades de viaje (~8 segmentos), 0
  excepciones, `trackChunks`/`sceneryChunks` se mantienen acotados (19 / 4) — el streaming
  y `dispose()` de geometría funcionan, no hay fuga de memoria a lo largo del viaje.
- Sierra de Niebla (E♭): arranque limpio; **túnel verificado con precisión** — en
  distancia 219 (dentro de 203–241) el fog sube exactamente al tope de túnel (0.045); al
  salir (distancia 266) vuelve exactamente a la niebla base de Sierra (0.0065). La
  transición smoothstep de entrada/salida funciona sin artefactos.
- Las 3 rutas sin bioma propio aún (Desierto D, Costa F#, Páramo C#) arrancan sin
  excepción con su paleta neutral de respaldo, como documenta la entrada de F3.
- Asset local `sfx/smooth_train_sound.mp3` carga correctamente (206 Partial Content,
  normal para streaming de audio).
- `drawCalls` observados entre 60–87 en todas las pruebas — dentro del presupuesto de 200
  del plan.

**Nota para Luis:** el código de F2/F3 pasa revisión funcional exhaustiva. Cuando puedas,
confirma tú visualmente en tu navegador (esta sesión no lo pudo hacer) — en particular la
cabina metropolitana rediseñada y el puesto de cámara del maquinista, ya que fueron los
últimos cambios puramente estéticos y no llevan test automatizado.

**Siguiente fase: F4** — Desierto de Agaves, Costa de Salinas y Páramo de Estrellas
completos (terreno + landmarks propios de cada bioma), fauna transversal, postes de
telégrafo, tren de carga cruzado con doppler, guiños a Aerostato/Batisfera. Criterios en
PLAN §13-F4.

---

## 2026-07-19 — Cabina metropolitana (copia fiel de referencia) ✅ (Claude Opus 4.8)

**Contexto:** Luis entregó una foto de referencia (cabina de metro moderna) y pidió
copiarla bien. Es el cuarto rediseño de la cabina (ver historial de F2); este queda como
el definitivo salvo que Luis pida más.

**Hecho — `cab.ts` reescrito para reproducir la referencia:**
- Carcasa marfil envolvente (`IVORY`/`IVORY_SHADE`), parabrisas panorámico trapezoidal
  con empaque negro de goma y cristal apenas tintado.
- Escritorio de acero cepillado en TRES cuerpos (central + dos alas anguladas), con
  faldones marfil y hueco de rodillas con placa de registro y 4 tornillos.
- Puente de instrumentos inclinado hacia el maquinista: pantalla izq · placa de
  manómetros (2 arriba + 3 abajo, caras negras con aguja) · matriz de botones verdes 4×3
  con fila ámbar · placa de 2 manómetros · pantalla der · pantalla pequeña del ala.
- Micrófono de cuello de ganso (tubo curvo + cápsula) al centro del escritorio.
- Mando maestro en T + hongo rojo de emergencia (centro-derecha).
- Botoneras verde/rojo/blanco en las alas + basculantes (izq) y rotativo (der).
- Torres laterales con pasamanos de acero; auricular con cable en espiral (tubo helicoidal)
  solo en la torre izquierda, como la foto.
- Dos limpiaparabrisas colgando del borde superior del cristal.
- Techo con losa, chaflán profundo sobre la ventana, plafón de luz y consola central.

**Decisión técnica — 1 mesh por material:** toda la geometría estática se FUSIONA con
`mergeGeometries` (helper `MergedBuilder` con buckets por material). La cabina entera son
~14 draw calls en vez de ~120. Confirmado en QA: `drawCalls` 57–58 con la cabina + vía +
Valle completos (presupuesto del plan: 200).

**Decisión de encuadre:** la referencia está tomada desde el puesto CENTRADO (pupitre al
centro, típico de metro), así que `CAB_VIEW_OFFSET_X` pasó de `-0.48` (puesto izquierdo)
a `0`. Si Luis prefiere el puesto lateral, es una línea en `config.ts`.

**Verificado VISUALMENTE (¡por fin!):** truco de captura — el canvas WebGL sale negro si
se lee fuera de tiempo (buffer descartado tras componer). Solución: en `?dev=1`,
`journey["frame"](t)` renderiza síncronamente; capturar el canvas a dataURL en el MISMO
tick (sin await entre medias) y POSTearlo a un receptor Node local (`scratchpad/
save-server.mjs`, puerto 5209) da un JPEG real. Con esto se confirmó de vista que la
cabina reproduce fielmente la referencia y que por el parabrisas se ve el Valle Dorado con
la vía al horizonte. **Este método sirve para capturar el juego en sesiones donde el
screenshot del Browser pane falla — documentado para reusar.** `npm run build` limpio.

**Pendiente F5 (no ahora):** animar agujas de manómetros y pantallas; la composición
estática NO debe volver a moverse.

---

## 2026-07-26 — Parabrisas panorámico: dos ventanillas laterales ✅ (Claude Opus 5)

**Pedido de Luis:** la franja marfil que quedaba a izquierda y derecha del parabrisas
debía volverse cristal, para que la ventana leyera panorámica. Sin tocar nada más.

**Hecho — solo `cab.ts`:**
- Dos hojas laterales nuevas (`SIDE_IN_*`/`SIDE_OUT_*`, x 1.53–1.87 abajo y 1.45–1.79
  arriba) con la MISMA altura e inclinación de trapecio del parabrisas: hueco en la pared,
  empaque negro propio y cristal. Las tres hojas se fusionan en un solo mesh, así que el
  cristal sigue costando 1 draw call.
- El pilar A pasa de bloque macizo (0.34 ancho × 0.5 fondo en x=±1.62) a montante plano
  (0.18 × 0.09 en x=±1.41), pegado al plano del parabrisas.
- Pared frontal ampliada de ±1.95 a ±2.12.

**Dos trampas encontradas (anotar, son de perspectiva, no de código):**
1. Cortar el hueco NO bastaba: el pilar viejo tenía 0.5 de FONDO y estaba a ~0.3 u del
   ojo; a esa distancia y en ángulo oblicuo su cara interior se proyecta ancha y tapaba
   por completo la franja lateral. Verificado tiñendo el material `GLASS` de magenta con
   opacidad 0.85 en runtime: solo aparecía la hoja central. **Aplanar el montante en z
   fue lo que destapó las ventanillas**, no el hueco.
2. Al adelgazar el pilar se abrió un hueco al mundo en el borde extremo del encuadre (el
   frustum horizontal llega a ±2.10 en el plano del parabrisas y la pared solo a ±1.95;
   el pilar gordo lo venía tapando por accidente). De ahí la pared a ±2.12.

**Verificado:** `npm run build` limpio; `drawCalls` 58 y 60 fps sin cambio respecto a
antes; capturas de frente y con la mirada a ±55° — ambas ventanillas muestran paisaje, el
montante separa limpio y la pared ampliada no asoma ningún borde al mirar de lado. Se
reutilizó el método de captura documentado arriba (receptor Node en 5209), porque el
Browser pane de esta sesión tampoco compone frames.

**Nota (pre-existente, no tocado):** mirando a ±55° se ve un vano entre el borde de la
pared frontal y la torre lateral — la cabina nunca tuvo costado alto. Si molesta, es un
panel más en `cab.ts`.

---

## 2026-07-26 — F4 Biomas restantes y vida ✅ (Claude Opus 5)

**Hecho:**
- **Desierto de Agaves** (D·mediodía, A·atardecer, E·amanecer): mesas rojas instanciadas
  al fondo, agaves (roseta de 7 conos fusionada) y cactus columnares con brazos,
  tolvaneras como `Points` con textura de canvas, y el esqueleto de rueda de carreta.
- **Costa de Salinas** (F#·atardecer, B·mediodía, D♭·amanecer): mar con `ShaderMaterial`
  de dos octavas de senos cruzados, palmeras (tronco curvo + corona de 7 frondas),
  salinas espejo, y el faro plantado en el agua.
- **Páramo de Estrellas** (C#·noche, C♭·crepúsculo, G♭·aurora): altiplano nevado, rocas,
  laguna helada, nieve en `Points` reciclada alrededor del tren, campo de 900 estrellas
  y auroras de shader (cilindro envolvente, tres senos desfasados).
- **Transversal en TODAS las rutas:** postes de telégrafo cada 18 u con catenaria colgante
  (`Line` con punto bajo a mitad de vano) y mojones de km.
- **Fauna** (`FAUNA_BY_BIOME`): garzas, halcones, aves de sierra, gaviotas y liebres del
  páramo. Un solo `InstancedMesh` de 14 individuos que se reciclan por delante del tren;
  el aleteo es escala en Y y el salto de la liebre desplazamiento en Y (patrón Aerostato).
- **Tren de carga cruzado** (`3d/crossing-train.ts`): corre por una vía paralela sobre la
  MISMA spline desplazada 13 u, con rieles y durmientes propios que nacen y mueren con el
  evento. 2 apariciones por viaje, siempre en zona muerta. `setSuppressed()` queda listo
  para que F6 lo calle si hay pregunta activa.
- **Bocina con doppler** (`TrainSound.playHorn`): por la regla §2.10 NO es un oscilador
  sino ruido blanco por dos pasabanda desafinados (430/611 Hz, Q 7.5/6) que caen durante
  el paso; el paneo barre de un lado al otro con `StereoPannerNode`.
- **Guiños:** globo dorado de Aerostato a 150 u de altura en Valle/Sierra; barco con grúa
  y esfera de Batisfera mar adentro en la Costa.

**Tres trampas encontradas (las tres costaron una vuelta entera, anotarlas):**
1. `ShaderMaterial` con `fog: true` **revienta** en `refreshFogUniforms` si no declaras
   los uniforms `fogColor`/`fogDensity` de `UniformsLib`. Las 3 rutas de Costa no
   arrancaban. El mar lleva `fog: false` y calcula su propia niebla exponencial.
2. **`metalness` alto sin environment map se renderiza casi negro.** Salinas y batisfera
   salían como manchas oscuras. Bajados a 0.16/0.25, siguiendo el `waterMaterial` de F3.
3. `exponentialRampToValueAtTime` **no admite 0 como destino**. Con el volumen del menú
   al mínimo la bocina lanzaba y tumbaba el frame loop entero. `playHorn` ahora sale
   temprano si el volumen es ~0 y además clampa el destino.

**Dos ajustes de composición:**
- El corredor de terreno (82 u) tapaba el mar y la Costa se leía como llanura con una
  tira azul al fondo. Ahora `corridorHalfWidth()` es asimétrico: 30 u del lado del agua.
  `sampleSide` clampa contra ese ancho para que no floten palmeras en el mar.
- La aurora era un arco de 143° y quedaba fuera del rumbo según la ruta. Cilindro completo
  y los huecos entre cortinas los abre el shader. Además hubo que empujar saturación y
  alfa (×1.25): con ACES y mezcla aditiva sobre cielo violeta se lavaba hasta desaparecer.

**Verificado (criterios F4):**
- **Las 15 rutas cargan sin una sola excepción** con su combinación bioma×hora.
- **Draw calls 57–77** en todas las rutas, con el tren cruzado en pantalla incluido
  (presupuesto del plan: 200).
- **Tren cruzado solo en zona muerta:** los eventos sorteados caen a 30.5 y 17 u dentro
  del segmento (zona muerta = primeras 40 u). Simulación hasta la distancia 1012: el
  convoy visible 210 frames y las 2 bocinas disparadas, sin excepciones.
- **Sin fuga de memoria:** viaje de 2304 u (16+ segmentos) con geometrías de 57→54→51 y
  chunks acotados (18–19 vía / 4–5 decorado).
- `npm run build` limpio. Capturas de Desierto, Costa, Páramo-aurora y Valle revisadas.

**Pendiente de revisión perceptual de Luis:** los cuatro biomas nuevos en su navegador.
En particular si la aurora del Páramo le parece demasiado sólida (se ajusta con
`uIntensity` y el `smoothstep` del shader) y si las salinas de la Costa son muy grandes.

**Siguiente fase: F5** — Consola y HUD: `ui/hud.ts`, `routemap.ts`, instrumentos vivos
sobre la cabina ya construida (agujas, pantallas, palanca de silbato) y viñeta.
Criterios en PLAN §13-F5.

---

## 2026-07-26 — F5 Consola y HUD ✅ (Claude Opus 5)

**Hecho:**
- **`ui/hud.ts` — la consola de latón.** Construye su propio DOM (`index.html` solo aporta
  la sección vacía). Palancas de grado con romano grande, sufijo cromático, tecla en la
  esquina y tooltip del glosario; marcadores de puntos/racha/velocidad; telegrama;
  ventana de respuesta; 3 silbatos que quedan en silueta al gastarse; botón Repetir.
  **No tiene lógica de juego**: pinta un `HudState` y avisa por callbacks.
- **`ui/routemap.ts` — la tira de ruta.** 20 nudos hacia la silueta de la Terminal, vía
  recorrida en latón, tren como punto crema, y lazos grises de desvío en el nudo donde
  ocurrieron. Se dibuja a DPR real.
- **`ui/hud-demo.ts` — simulador de F5.** Genera preguntas falsas para poder juzgar la
  consola antes de que exista el juego. **⚠️ F6 BORRA ESTE ARCHIVO ENTERO** y conecta el
  Hud al `GameStateManager`; el cableado vive en `main.ts` justamente para eso.
- **Cabina viva (`cab.ts`).** Las 7 agujas dejaron de estar pintadas en la textura: ahora
  son UN `InstancedMesh` que gira por matriz (1 draw call) con inercia y un temblor
  proporcional a la velocidad. Añadido sector rojo al final de la escala. Nueva **palanca
  de silbato** de latón en el ala izquierda que se tira al usarlo. Las pantallas laten.
  `Cab.update(dt, readout)` recibe lecturas ya normalizadas: la cabina no sabe de reglas.
- **`renderer.ts`** deriva las lecturas: velocidad respecto al crucero y "presión" que
  sube con el sprint de la zona muerta. `pullWhistle()` da el tirón y la cabina lo deja
  caer sola. F6 atará la presión al estado real.
- **Viñeta cálida** y estilos de consola en `style.css`. Claves `hud.*` en es/en.

**Trampa de CSS que hay que recordar:** `#hud.hud-layer` es un selector de ID (1,1,0) y
le ganaba a `.screen.hidden` (0,2,0) — la consola **no se ocultaba nunca** al volver al
menú. Hizo falta `#hud.hud-layer.hidden` (1,2,0). Si en F6/F8 se añaden más capas con id,
ojo con lo mismo.

**Regla de oro respetada:** la capa del HUD es `pointer-events:none` y solo la consola
(y la viñeta nunca) reactivan el puntero — el drag de la mirada sigue llegando al canvas
por encima de la consola. Verificado con `getComputedStyle`.

**Verificado:**
- Palancas: con solo diatónicos salen 7 (teclas 1–7); con "Todo" salen 12 **en orden
  canónico** y con las teclas de §8 (IIfr=Q, IIImen=W, IVly=E, VImen=R, VIIST=T) — ojo,
  el orden de las TECLAS es el de escala, no el canónico, y así está.
- Ciclo completo pilotado a mano (rAF no dispara en esta sesión): sin pregunta las 12
  palancas salen deshabilitadas; al plantearse, ventana al 96.7 % y bajando; fallo → marca
  roja, racha a 0, desvío anotado y telegrama revelando el grado; acierto → marca verde,
  +16 puntos (10 base + 2×racha + 4 de rapidez), progreso +1; silbato gasta un icono.
- Tira de ruta capturada: nudos dorados, lazos de desvío y Terminal al final. Se corrigió
  que dos desvíos en el mismo nudo se dibujaban superpuestos (ahora se apilan).
- Agujas verificadas a 0 / 0.5 / 1: barren los 270° de la cara y a fondo apuntan al
  sector rojo. Palanca de silbato responde al tirón. Draw calls 77.
- `?lang=en` íntegro en la consola. `npm run build` limpio.

**Pendiente de revisión perceptual de Luis:** la consola entera en su navegador — es la
primera vez que hay HUD, y el tamaño de las palancas y cuánto ocupa la consola sobre la
vía son decisiones suyas. Todo el aspecto vive en el bloque "CONSOLA DE LATÓN" de
`style.css`.

**Siguiente fase: F6** — Loop de juego: `game/state.ts` con la máquina de §7.1, agujas
funcionales con espadines animados, semáforos, señal avanzada que dispara la pregunta,
respuesta por click/teclado, cadencia de salida y regla de silencio. Al conectar el
`GameStateManager` se borra `ui/hud-demo.ts`. Criterios en PLAN §13-F6.

---

## 2026-07-26 — F6 Loop de juego ✅ (Claude Opus 5)

**EL JUEGO YA SE JUEGA.** `ui/hud-demo.ts` borrado, como estaba previsto.

**Hecho:**
- **`game/state.ts` — la máquina de §7.1.** LÓGICA PURA: no importa nada de `3d/` ni de
  `ui/` (regla §11), así que se ejercita entera desde consola. Fases IDLE → DEPARTING →
  ROLLING → QUESTION → RESOLVED → ARRIVED. Todo efecto sale por `JourneyPorts`
  (audio, agujas, consola), que es lo que la hace testeable sin pintar un pixel.
- **La ventana de respuesta ES distancia, no un temporizador** (§7.3): sale de
  `(SEGMENT_LENGTH − along) / ANSWER_DISTANCE`, así que la física del tren de F2 ya la
  implementaba sin saberlo. Si el tren frena, la ventana se estira sola: correcto.
- **`3d/signals.ts`:** señal avanzada con disco de aviso al salir de la zona muerta,
  semáforo de ala junto a la aguja y espadines que se alinean de verdad. Verde + ala
  caída = acierto; rojo + ala horizontal = desvío.
- **Cadencia de salida I–IV–V–I con el tren PARADO** (§7.1). `releaseBrakes()` lo suelta
  al terminar: si no, la primera pregunta pisaba la cadencia y rompía la regla de
  silencio antes de empezar.
- **Regla de silencio §2.10 real:** `TrainSound.setDuck()` agacha el bed al 30 % mientras
  hay pregunta viva, y el tren cruzado de F4 se calla vía `setSuppressed()`. Además el
  manómetro de presión se desfonda: la cabina dice "te toca" sin una palabra.
- **`playClunk()`** — el golpe del espadín, ruido filtrado como la bocina (§2.10: nada
  fuera del material pedagógico tiene altura). Suena antes que `acierto.mp3`, que va a
  volumen bajo para no taparlo (§9).
- Pantalla de **resumen** con medalla, gala, precisión, mejor racha y silbatos.

**Nota de arquitectura:** el clunk y la bocina viven en `audio/train-sound.ts` y no en el
`audio/synth-sfx.ts` que lista el PLAN §11. Es deliberado: `TrainSound` ya es el dueño del
`AudioContext`, y partirlo obligaría a compartir el contexto entre módulos. Si F8 añade
frenos y campanas y el archivo crece, ese es el momento de extraer `synth-sfx.ts`.

**Trampa encontrada (y cómo NO diagnosticarla):** creí que el ala del semáforo subía en
vez de caer y cambié el signo del giro. Estaba equivocado: **el signo original ya era el
correcto** y yo estaba leyendo mal una captura donde el brazo engaña por la perspectiva.
Lo resolvió medir la punta del brazo en coordenadas de mundo (`dy = −0.99` ⇒ cae). Para
geometría 3D, **medir el vector, no mirar el JPEG**.

**Verificado (criterios F13-F6):**
- **Partida completa de 20 decisiones forzando aciertos, sin un solo desvío**, hasta la
  pantalla de resumen: 🥇 oro, GALA, precisión 100 %, mejor racha ×20.
- **Puntos = fórmula §7.5 exacta.** Recalculada aparte para las 20 respuestas: 19 cuadran
  al punto y la nº 20 "falla" solo porque el bonus de llegada entra en esa misma llamada
  (69 + 320 = 389). Total **1220 = 900 aciertos + 125 llegada + 45 silbatos + 150 gala**.
- **Silbatos:** los 3 se gastan, el 4º intento devuelve `false` y el botón queda
  deshabilitado, sin castigo extra.
- **Regla de silencio:** `duckBed(0.3)` disparado exactamente 20 veces (una por pregunta)
  y devuelto a 1 al resolver. 20 clunks, uno por aguja acertada.
- **Rutas de fallo:** con progreso 4, fallar deja 2 (−2). Sin respuesta → `timedOut:true`
  con su mensaje propio y progreso 2 → 0 (piso respetado). El telegrama SIEMPRE revela
  nota, grado y glosario: "Desvío. Era A (VI — Superdominante)."
- Draw calls 83 con señalización incluida. `npm run build` limpio.

**Pendiente de revisión de Luis:** jugar una partida de verdad **con sonido** — todo lo de
arriba se verificó con el volumen a 0 y pilotando la máquina a mano, porque en esta sesión
`requestAnimationFrame` no dispara. La mezcla (nota vs bed agachado vs clunk vs
`acierto.mp3`) es justo lo que no puedo juzgar yo.

**Siguiente fase: F7** — El desvío: ramal físico y lazo gris §5.5, feedback pedagógico
(revelación + tónica→nota), desaturación del mundo y reintento del mismo segmento con
pregunta nueva. El hueco ya está marcado en `state.ts` con el comentario `DETOUR-F7`.
Criterios en PLAN §13-F7.

---

## 2026-07-26 — F7 El desvío ✅ (Claude Opus 5)

**Hecho:**
- **`3d/detour.ts` — el apartadero.** Decisión de diseño: el ramal **NO es otra spline**,
  es un DESPLAZAMIENTO LATERAL sobre la misma vía (`detourOffsetAt()`: abre, corre
  paralelo 13 u, cierra). Es literalmente la forma de un apartadero real y hereda gratis
  curvas, peralte y streaming sin duplicar el mundo. `train.lateralOffset` hace el resto.
- Vía propia del ramal, durmientes con **hierba alta entre ellos**, árboles secos, y el
  **andén fantasma con farol oxidado parpadeante** (dos senos desfasados: nunca un
  parpadeo regular) a media vuelta, justo donde cae la revelación.
- **Desaturación §5.5:** el fog tira a `#7a7d82` y la luz baja 40 %. Entra de golpe y
  vuelve en 2 s. **Ojo:** F3 dejó el domo y la niebla compartiendo el color de horizonte
  para que no se vea la costura; agrisar solo la niebla la habría roto. Por eso ahora
  existe `liveHorizon` (color vivo) separado de `horizonColor` (paleta), y el uniform del
  domo lee el vivo.
- **Revelación (§2.6):** tónica → nota, con 900 ms de hueco. Se reproduce el **archivo
  exacto** de la pregunta (`lastQuestion.filePath`), no una ruta reconstruida: así la
  octava y el timbre son los que el alumno acaba de oír.
- Traqueteo amortiguado en el ramal, sin pisar el ducking de pregunta de F6.

**Decisión de alcance:** el lazo ocupa **exactamente un segmento**, no `DETOUR_LOOP_LENGTH`
(200). Así la reincorporación cae justo en un límite de segmento y la pregunta siguiente
llega con **ventana completa** — verificado: 0.999. Con 200 u la reincorporación caía a
media zona muerta y la pregunta siguiente habría salido con la mitad del tiempo, que es
un castigo que el plan NO pide. `DETOUR_LOOP_LENGTH` queda como tunable visual sin uso.

**Interpretación de "el mismo segmento se re-intenta" (§7.1):** se ha leído como el
**reintento pedagógico** que describe §7.4 —pregunta nueva del selector, sin quemar
cobertura de la bolsa— y no como volver a conducir las mismas 140 u de terreno. El tren
sigue hacia adelante; lo que se repite es la decisión, no la geografía. Si Luis prefiere
lo segundo, hay que rebobinar `train.distance`, y eso sí toca streaming.

**Dos bugs encontrados, los dos en el caso "SIN RESPUESTA" (que resuelve justo al cruzar
el límite del segmento, y por eso escapaba a la ruta normal):**
1. `beginDetour` recalculaba la aguja de salida con `Math.ceil(distanciaDelTren)`. Al
   resolver por silencio el tren ya había cruzado el límite, así que el ramal se
   construía **un segmento entero más adelante** y el desvío no se veía. Ahora la
   distancia la manda el estado, que ya la sabe, y NO se recalcula fuera.
2. El bloque de cambio de segmento forzaba `phase = "ROLLING"` siempre, **comiéndose la
   fase DETOUR** que `resolve()` acababa de poner. Ahora solo vuelve a RODANDO desde
   `RESOLVED`.

**Verificado (criterios F13-F7):**
- **Fallar en la decisión 19 NO regresa a 0:** 19 → 17, racha a 0, 1 desvío anotado.
- **El mundo desatura y recupera color:** gris a 1 instantáneo al fallar, y a 0 tras 2 s
  de la reincorporación.
- **El caso "sin respuesta" tiene su mensaje propio:** "APARTADERO. Sin respuesta. Era B
  (VII — Sensible)." — con nota, grado y glosario.
- **Pregunta nueva tras el ramal con ventana completa (0.999)** y progreso conservado.
- El tren se aparta de verdad: `lateralOffset` llega a ±13 y vuelve a 0 al reincorporarse.
- **Sin regresión de F6:** partida limpia de 20 decisiones sigue dando 1220 exactos, oro
  y gala. Draw calls 94 con el apartadero montado. `npm run build` limpio.

**Pendiente de revisión de Luis:** la desaturación tira más a "anochecer" que a "gris"
porque afecta a fog y luces pero no a los materiales del terreno (que es lo que pide
§5.5 al pie de la letra). Si quieres el gris más sucio, se toca `DETOUR_GREY` en
`environment.ts`. Y como siempre: la mezcla de la revelación tónica→nota necesita tu oído.

**Siguiente fase: F8** — La Terminal: `station.ts`, silueta creciente desde el acto 3,
los 8 arcos que cantan la escala, rosetón por tonalidad, gala y secuencia de llegada
saltable. Criterios en PLAN §13-F8.

---

## 2026-07-26 — F8 La Terminal ✅ (Claude Opus 5)

**Hecho:**
- **`music/degrees.ts` → `scaleWalkFiles()`**: la escala mayor ascendente completa
  I–II–III–IV–V–VI–VII–I(8ª) con la ortografía de la tonalidad. Las octavas se eligen
  **por MIDI real**, no por número de grado: en G♭ mayor el IV es C♭, y "C♭4" suena por
  DEBAJO de la tónica G♭4, así que le toca **C♭5**. Es la misma trampa de la letra vs. la
  octava que ya obligó la regla de las tríadas en F1.
- **`3d/station.ts`**: bóveda de cañón parabólica (costillas de hierro + paños de vidrio
  emissive), dos torres con **rosetón de 12 husos** cuyo patrón rota con la tónica (cada
  ruta tiene su reloj), vitral de sol de canvas al fondo, andenes con faroles y tope de
  vía. Impostor de silueta desde el acto 3 que se acerca y crece con el progreso.
- **Los 8 arcos** como pórticos de hierro con medallón, encendidos uno a uno.
- **Gala** (0 desvíos y 0 silbatos): fuegos artificiales tras la bóveda.
- **`playBell()` y `playBrakes()`** en `train-sound.ts`. La campana usa cuatro parciales
  en razones IRRACIONALES (1, 2.76, 5.4, 8.93) porque una campana real es inarmónica:
  suena a campana de estación y no delata una altura, que es lo que exige §2.10.

**La idea de la que estoy más contento — el ritardando de pulso constante:** los arcos no
están a distancia fija. Sus posiciones se **integran sobre el perfil de velocidad**
(`s(t) = v₀t + (v₁−v₀)t²/2T`) para que cada cruce caiga exactamente a `ARCH_NOTE_GAP_S`
del anterior. Como el tren frena, **los arcos se van juntando**: de 15.7 u a 8.5 u.
El tren hace ritardando y la escala mantiene el pulso clavado. Verificado: los 8 huecos
dan 0.900 s exactos. Además los arcos se disparan **por posición y no por reloj**, así el
medallón y la nota caen en el mismo frame aunque el navegador dé un tirón.

**Bug encontrado:** los arcos se añadían a la escena Y al grupo de la estación. En three,
un segundo `add` REPARENTA, así que la geometría —ya horneada en coordenadas de mundo—
recibía encima la transformación de la estación y los 8 pórticos acababan en otro sitio.
Ahora cuelgan sueltos de la escena y se liberan aparte.

**Verificado (criterios F13-F8):**
- **Los 8 arcos suenan la escala con ortografía correcta.** QA sobre las **15**
  tonalidades: todas ascienden, todas abarcan una 8ª justa y **todos los archivos existen
  en el inventario**. C#: `C#4 D#4 E#4 F#4 G#4 A#4 B#4 C#5` (B#, no C). G♭: `G♭4 A♭4 B♭4
  C♭5 D♭5 E♭5 F5 G♭5`.
- **El acorde final es el sample `Major Chords`** — el MISMO del silbato: el círculo se
  cierra. Confirmado espiando `HTMLMediaElement.play`: `Major Chords/G♭major.mp3`.
- La ceremonia es **saltable con Esc tras 5 s** (durante la llegada Esc no pausa).
- Draw calls 111 con la Terminal entera montada. `npm run build` limpio.

**Rough edge conocido (para F10):** la nave se planta con el frame de la vía en su boca,
pero la spline sigue curvando a lo largo de sus 150 u de fondo, así que con una curva
fuerte la estación queda descentrada respecto al eje. §5.2 pide para el acto 4 "vía llana
y RECTA" y el generador de F2 todavía no la garantiza: el arreglo bueno es forzar la
recta en `track.ts` al acercarse el final, no mover la estación.

**Pendiente de revisión de Luis:** la ceremonia entera con sonido — el ritardando contra
la escala, el acorde final y la campana. Y si la proporción de la nave le convence
(subí el semiancho de 26 a 34 porque a 26 la parábola leía a aguja gótica).

**Siguiente fase: F9** — Salón de Rutas y persistencia: `game/persistence.ts`, las tres
claves de localStorage de §7.7 guardadas tras CADA decisión, tablero de las 15 rutas con
medallas, estadísticas por grado y borrado con confirmación. Criterios en PLAN §13-F9.

---

## 2026-07-26 — F9 Salón de Rutas y persistencia ✅ (Claude Opus 5)

**Hecho:**
- **`game/persistence.ts`** (lógica pura): las tres claves de §7.7 —`expreso-stats`,
  `expreso-rutas`, `expreso-settings`— con lectura tolerante a JSON corrupto y escritura
  que no revienta en modo privado ni con la cuota llena: si no se puede persistir, se
  juega igual y solo no se recuerda.
- **Se guarda tras CADA decisión**, no al final del viaje (§7.7): si se cierra la pestaña
  a mitad de ruta, los grados ya respondidos siguen en las estadísticas.
- **La llegada se apunta ANTES de la ceremonia**, no después: los 35 s de arcos son
  tiempo de sobra para que alguien cierre la pestaña y pierda su oro.
- **`ui/salon.ts`**: tablero de salidas con las 15 tonalidades (swatch de bioma, estado,
  mejor puntuación, mejor racha, velocidad del récord y fecha de primera llegada) y la
  precisión por grado en orden canónico con barras. Borrado en DOS PASOS: el primer clic
  solo avisa.
- Ajustes del menú restaurados al arrancar, **validando todo contra las listas vivas**:
  un `localStorage` viejo con una tonalidad o un grado que ya no existan no puede tumbar
  el arranque.

**Detalle que el plan no pedía explícito pero se nota:** `velocidadRecord` acompaña
SIEMPRE a la puntuación récord. Si se guardara la velocidad de la última partida, el
tablero diría "Lento" junto a un récord conseguido en Maestro.

**Verificado (criterios F13-F9):**
- **Cerrar y reabrir conserva todo:** cambiados ruta (F#), timbre (Fagot), velocidad
  (Maestro), 12 grados y volumen (37) por la UI real; tras recargar, los cinco vuelven.
- **`mejorMedalla` y `mejorScore` SOLO MEJORAN:** tras un oro con gala (1220), un viaje
  posterior de bronce con 300 puntos deja intactos medalla, score, racha, gala y fecha de
  primera llegada, y solo incrementa `llegadas`. Al superar el récord (1500 en Maestro),
  `velocidadRecord` pasa a Maestro.
- **Borrar progreso pide confirmación:** el primer clic cambia el botón a "¿Seguro?
  Pulsa otra vez" y NO borra; el segundo vacía las tres claves y el tablero vuelve a 15
  filas sin viajar.
- **El tablero muestra las 15 rutas con sus estados**, y la fila de C mostraba
  "🥇 GALA · 1500 · ×20 · Maestro · 26/7/2026". `npm run build` limpio.

**Pendiente de revisión de Luis:** el aspecto del tablero (es lo único de F9 que se ve) y
si quiere que el Salón muestre además algo del histórico por bioma.

**Siguiente fase: F10** — Pulido y QA: checklist §14 completo, pases de rendimiento,
`npm run preview` y `?lang=en` íntegro. Hay dos deudas anotadas para ahí: la vía del acto
4 debe forzarse RECTA para que la Terminal no quede descentrada (ver F8), y conviene
revisar si `synth-sfx.ts` merece extraerse de `train-sound.ts` (ver F6).

---

## 2026-07-26 — F10 Pulido y QA ✅ (Claude Opus 5)

**Tres arreglos:**
1. **"La aguja no recibió orden."** — §7.1 pide ese mensaje EXTRA al quedarse callado, y
   solo estaba el genérico "Sin respuesta. Era X". Añadido en es/en, delante de la
   revelación.
2. **Terminal descentrada en curva** (deuda de F8). La nave es rígida y mide 150 u, pero
   la vía sigue curvando dentro de ella. Ahora se orienta con la **cuerda boca→fondo** en
   vez de con la tangente de la boca: el error se reparte a los dos extremos en lugar de
   acumularse al final. Es lo que se puede hacer sin tocar el generador de vía ya
   validado; el arreglo de fondo (forzar la recta del acto 4 en `track.ts`) sigue
   pendiente y anotado.
3. **La frenada de llegada se arrastraba.** El perfil lineal caía a un suelo de 0.4 u/s y
   dejaba ~23 s de puro gateo hasta el tope. Cambiado a **deceleración constante**
   (`v = v₁·√(restante/total)`), que es como frena un tren de verdad. La ceremonia
   completa dura ahora 46.5 s medidos.

**Checklist §14 — verificado automáticamente:**
- **`Major Chords`: 75/75** (15 tónicas × 5 timbres). Ojo: la sonda con `fetch` da 0/75
  por CORS del bucket; hay que sondear con elementos `Audio`, como hacía F1.
- **Cadencia I–IV–V–I correcta en C# y C♭**, tríadas apiladas y no samples de acorde:
  C# → C#3+E#3+G#3 / F#3+A#3+C#4 / G#3+B#3+D#4.
- **Selector:** con 2 grados activos, **0 repeticiones seguidas en 200 sorteos**; con 12
  activos, los 12 distintos aparecen en los 12 primeros.
- **Ventana de respuesta = §7.3 exacta:** 12.5 / 9.1 / 6.3 / 4.0 s con ×1 / ×1.25 / ×1.5 / ×2.
- **i18n:** 82 claves en es y 82 en en, **cero desparejadas**. Resumen en inglés íntegro:
  "🥇 Gold medal · GALA ARRIVAL!".
- **Sin audio antes del gesto:** 0 peticiones .mp3 hasta pulsar INICIAR VIAJE.
- **Seed:** misma tonalidad = vía idéntica entre arranques; tonalidad distinta = distinta.
- **Esc congela de verdad:** con pregunta viva, distancia y ventana quedan EXACTAS
  (0.9140920102465034 antes y después de 300 frames en pausa).
- **Viaje completo con 3 desvíos en el Páramo con auroras (la ruta más cargada): CERO
  errores y cero warnings en consola**, y **114 draw calls** de pico (presupuesto 200).
- **`npm run preview` sirve la build**: HTTP 200 y los dos assets resuelven.

**Pendiente para Luis (lo que una máquina no puede firmar):** los ítems del checklist que
son de oído y de ojo — que los 12 grados suenen bien en 3 tonalidades y 2 timbres, el
timbre `Aleatorio` cambiando por pregunta, la mezcla de la regla de silencio, el
cronometraje real de las 4 ventanas y el layout en ventana angosta. Todo lo demás de §14
está firmado arriba.

**Deudas vivas (documentadas, no bloqueantes):**
- Forzar la vía RECTA en el acto 4 (`track.ts`) para que la Terminal quede perfectamente
  centrada; hoy está mitigado, no resuelto.
- Extraer `audio/synth-sfx.ts` de `train-sound.ts` si F11 hace crecer más los sintetizados.
- El chunk de JS pasa de 600 kB (es three.js entero); si molesta, code-splitting.

**Siguiente fase: F11 — Migración al website. ⚠️ SOLO CON OK EXPLÍCITO DE LUIS** (PLAN
§13-F11 y §15). No se toca sin que él lo pida.

---

## 2026-07-31 — Pulido: cadencia y fauna (Claude Opus 5)

Dos peticiones de Luis tras jugar.

**1. La cadencia de salida se embarraba.** `CADENCE_CHORD_GAP_S` 1.0 → **2.0 s**: a un
segundo las tríadas se solapaban entre sí y no se distinguía I–IV–V–I. La cadencia
completa dura ahora 8 s con el tren parado. `ARCH_NOTE_GAP_S` (los 8 arcos de la llegada)
NO se toca: ahí el pulso de 0.9 s es deliberado.

**2. Las aves iban en escuadrón.** Causa raíz: cada individuo avanzaba sobre la SPLINE DE
LA VÍA (`unit.distance`) y se orientaba con su tangente, así que toda la fauna volaba en
paralelo al tren por construcción. Ahora cada unidad lleva posición en mundo, rumbo propio
(`heading`) y deriva propia (`turn`), y se mueve libre del trazado.

Hicieron falta DOS correcciones más, porque con solo el rumbo aleatorio seguían
agrupándose (coherencia 0.505 — "algo agrupado"):
- **Velocidad.** Las aves iban a 5–12 u/s y el tren a 11–20: desde la cabina lo único
  que se veía era a todas quedándose atrás, que ES el efecto escuadrón. Subidas a
  **15–29 u/s** para que su rumbo propio domine sobre el arrastre del tren.
- **Reciclado radial.** Descartar por "ha quedado atrás" premiaba a las que volaban con
  el tren y sesgaba la población hacia un rumbo común. Ahora la burbuja es puramente
  radial (250 u), sin mirar delante/detrás.

**Verificado:** coherencia del movimiento APARENTE (restando la velocidad del tren, que es
lo que ve el maquinista) de **0.505 → 0.218** = disperso; los ángulos aparentes cubren el
círculo entero (162°, −66°, 64°, 74°, −177°, 3°, −125°…). 101 draw calls. Build limpio.

**Nota de método:** la primera medición dio un falso negativo porque medí el
desplazamiento en una ventana de 15 s, y las reapariciones por reciclado dominaban el
vector. Para juzgar trayectorias hay que medir en ventana corta y descartar los saltos.

---

## 2026-07-31 — Pulido: revelación del desvío y timbre del acorde (Claude Opus 5)

**1. En el apartadero ya NO se repite la nota preguntada.** Desviación deliberada del
PLAN §2.6, que cerraba "tónica → nota": Luis, jugando, notó que volver a soltar la nota
la REGALA en vez de reanclar el oído. Ahora la revelación es solo el acorde de tónica; el
grado y la nota se siguen revelando por escrito en el telegrama.

**2. El acorde de tónica sonaba en otro instrumento.** Con Piano seleccionado se oía un
cello. Diagnóstico: el código pedía la ruta CORRECTA (`Piano/Major Chords/Cmajor.mp3`),
así que el fallo está en el ASSET del bucket, no en el código — y de hecho Piano, Cello y
Coro comparten duración exacta (4.968 s), mientras Corno (2.976) y Fagot (5.064) difieren.

Como el bucket no se toca desde aquí, el acorde de tónica pasa a **apilarse desde las
notas sueltas del timbre** con `triadFiles(scale, "I", dir)` — exactamente el mecanismo
que la cadencia de §3.5 ya usaba y que sí respeta la carpeta. Afecta a los tres sitios:
silbato, revelación del desvío y acorde final de la llegada.

**Desviación de §3.4 y del criterio F8** (que pedían el sample `Major Chords` como firma
sonora): se abandona ese sample por completo. El círculo silbato↔llegada SIGUE cerrado,
porque ambos son ahora la misma tríada I en el timbre del viaje.

**Verificado:** con Fagot todo lo que suena sale de `Fagot/`; con Piano, de `Piano/`; y
en ningún caso se pide ya un `Major Chords`. Build limpio.

**Nota si algún día se arregla el bucket:** `SamplePlayer.playTonicChord()` y
`tonicChordPath()` siguen existiendo intactos; volver al sample es cambiar `playTonicTriad`
en `main.ts` y nada más.

---

## 2026-08-27 — Tormenta eléctrica en el desvío + lados del tren cruzado (Claude Opus 5)

**1. Tren cruzado y apartadero ya no comparten carril.** Luis: "se cruzan muy chistoso de
frente". Causa exacta: `CROSSING_TRACK_OFFSET` (13) y el `MAX_OFFSET` del ramal (13) son
el MISMO desplazamiento, así que al coincidir de lado ocupaban la misma vía. Se extrajo
`detourSideFor(distance)` a `detour.ts` —la regla determinista que ya alternaba con el
segmento— y el convoy toma ahora SIEMPRE el contrario. Además el lado se decide al
APARECER y no al sortear el evento. Verificado: barrido de 0 a 4000 u, cero coincidencias.

**2. Tormenta eléctrica (`3d/storm.ts` + `audio/storm-sound.ts`).** Se enciende con el
apartadero: su intensidad ES el gris de `Detour.greyAmount()`, así que entra de golpe con
el desvío y se va con el color en los mismos 2 s.

Luis entregó primero un único `02 Thunder.mp3` (231 s, lluvia con 27 truenos embebidos) y
luego las pistas separadas — que es lo que se usa: `41 Rain.mp3` en bucle y tres
`Thunder Clap`. **`02 Thunder.mp3` y los `.wav` quedan sin usar** (solo se importan mp3;
comprobado que `dist/` no lleva ningún wav).

**El detalle que hace que el relámpago coincida con su trueno:** los tres clips tienen
~1 s de entrada ANTES del golpe (medido con envolvente RMS: 1.16 / 0.96 / 0.86 s).
Disparar el fogonazo en `play()` lo habría adelantado un segundo entero. El relámpago
espera a que el `currentTime` DEL PROPIO CLIP alcance su golpe, así que la sincronía
aguanta aunque el clip tarde en arrancar. **Medido en marcha: 11 ms de desfase.**

**Tres cosas que hubo que corregir al verlo:**
- Las gotas salían como manchones de nieve. `PointsMaterial` dibuja sprites CUADRADOS, así
  que la textura alta y estrecha se deformaba; ahora la raya es fina dentro de un lienzo
  cuadrado y el `size` bajó de 1.5 a 0.5.
- El fogonazo dejaba la cabina en blanco puro: la luz ambiente bajó de ×5.5 a ×2.4.
- El rayo no se veía nunca, por DOS motivos a la vez: nacía a 210 u de altura (por encima
  del parabrisas) y era una `THREE.Line`, cuyo grosor en WebGL es SIEMPRE 1 px. Ahora nace
  a 74–108 u, se sesga al frente (±75° del rumbo) y es un `TubeGeometry` de radio 1.7.

**Alcance:** la tormenta sale en TODOS los desvíos, también en el de "sin respuesta". Luis
la pidió "cuando te desvía por nota equivocada"; se interpretó que el castigo es el mismo
y que ver tormenta solo a veces despistaría. Limitarlo a la respuesta errónea es una línea.

**Verificado:** 104 draw calls con tormenta y rayo en pantalla. Build limpio, sin wav.

---

## 2026-08-27 — La Terminal, punto fijo que crece (Claude Opus 5)

Luis: "cuando se comienza a ver la estación no está fija y cambia de tamaño todo el
tiempo… ¿puede ser un punto fijo que vaya creciendo y se revele con todas sus
características?". Sí, y el diagnóstico eran DOS fallos que se sumaban:

1. La silueta se colocaba en `trainDistance + lead`: iba **clavada a una distancia fija
   por delante del tren**, así que nunca se acercaba — una zanahoria en un palo.
2. Ese punto se recortaba con `Math.min(..., track.endDistance())`, y la vía solo está
   construida ~420 u por delante, creciendo A SALTOS. La distancia del sprite oscilaba a
   cada chunk nuevo y por eso **el tamaño palpitaba sin parar**.

**Rehecho:**
- **Fuera el impostor plano de §12.** La Terminal se planta con su geometría COMPLETA en
  cuanto asoma (progreso ≥ 0.55), en un punto fijo del mundo, y ya solo crece porque el
  tren se acerca. `Station.relocate()` recoloca el grupo sin reconstruirlo (la geometría
  es local al grupo).
- **Único caso en que se mueve:** un desvío, que sí alarga el viaje un segmento entero,
  la empuja otro segmento. Ocurre con el mundo en gris y la tormenta encima; no se nota.
- **La ceremonia entra en ESA estación** en vez de fabricar otra delante del tren. Se
  añadió una fase de aproximación: el tren rueda a crucero hasta el primer arco, que se
  calcula hacia ATRÁS desde la boca de la nave (`stationDistance − NAVE_LEAD − archSpan`),
  con `archSpan` = integral del ritardando. Verificado: último arco 3215.3, boca 3261.3
  → los 46 u previstos, y el tope dentro de la nave.

**Trampa de la niebla:** con la estación a ~1300 u y `fogDensity` 0.0018, el fog la tapaba
al 93 % — invisible. Por eso §12 pedía un impostor *emissive*. Solución sin volver atrás:
las partes ILUMINADAS (cristal, faroles, husos del rosetón, vitral) llevan `fog: false`,
así de lejos se ve el farol en el horizonte —"la estación ES una linterna"— y el hierro y
la piedra, que sí llevan niebla, emergen de la bruma al acercarse.

**Verificado:** plantada en 3261.3 y **cero movimiento** en todo el acercamiento (una sola
posición distinta en 60 muestras) mientras la distancia al tren baja de 1806 a 956.
Capturas a 1000 u (punto de luz) y a 500 u (nave completa con vitral). 94–113 draw calls.

---

## 2026-08-27 — Vía desaparecida en medio viaje (Claude Opus 5)

Luis: "por un buen tramo se me desaparecieron las vías, ya para llegar a la estación
reaparecieron". Regresión introducida al plantar la Terminal en punto fijo.

**Causa:** `TrackManager.ensureBuilt(trainDist)` recibe la distancia **DEL TREN** y con
ella PODA todo lo que queda detrás (`endDist < trainDist − DISPOSE_BEHIND`). Yo la llamé
con la distancia de la Terminal (~3491) mientras el tren iba por ~1450, así que borró
todos los chunks con `endDist < 3291`: la vía entera alrededor del jugador. Reaparecía al
alcanzar la zona no podada, justo antes de la estación — exactamente lo que se veía.

**Arreglo — se separa extender la spline de construir geometría:**
- `ensureReach(distance)`: extiende SOLO los frames, sin geometría y sin podar. Es lo que
  usa la Terminal para poder llamar a `frameAt` muy por delante del tren.
- `extendOneInterval()` ya no construye geometría: encola el intervalo en `pendingChunks`.
- `flushChunks(target)` materializa la geometría solo hasta el alcance pedido, así que
  `ensureBuilt(trainDist)` sigue construyendo cerca del tren y podando por detrás como
  siempre. Plantar la Terminal ya no llena la escena de tramos lejanos invisibles.

Queda el comentario de aviso en `ensureReach`: **nunca pasar un punto lejano a
`ensureBuilt`**, su argumento es la posición del jugador.

**Verificado:** viaje completo, 4260 muestras — **0 huecos** bajo el tren y 0 a 120 u por
delante; chunks acotados entre 12 y 19; 2 intervalos con spline y sin geometría (el tramo
hacia la Terminal, por diseño); 96 draw calls. Build limpio.

---

## 2026-08-27 — Chapiteles de las torres fuera de sitio (Claude Opus 5)

Luis: "los triángulos de las torres no están en su sitio, están como adelante".

**Causa:** en `buildTowers` el cono se trasladaba y DESPUÉS se rotaba:
`new ConeGeometry(...).translate(x, 80, -6)` y luego `cap.rotateY(Math.PI / 4)`.
`BufferGeometry.rotateY` gira alrededor del **ORIGEN**, no del centro de la propia
geometría, así que el chapitel ya movido a x=41 salía despedido a (24.7, 80, −33.2):
adelantado y hacia dentro respecto a su torre. Arreglado rotando ANTES de trasladar.

**Barrido del mismo patrón en el resto del proyecto:** los otros `translate` seguidos de
`rotate` (hojas de agave, frondas de palmera, alas de las aves, ramas de árbol seco,
husos del rosetón) son el idioma CORRECTO e intencionado — trasladar hacia fuera y rotar
sobre el origen es justo como se reparte algo en abanico. Solo el chapitel estaba mal,
porque su traslación era a un punto lejano y no un radio.

---

## 2026-08-27 — Fuegos artificiales de la gala, al estilo Sea of Thieves (Claude Opus 5)

Luis: "hazle los fuegos artificiales del final como los de Sea of Thieves, ¿se puede?" y,
a mitad, "te dejo en sfx el audio fireworks.mp3 para que se lo integres".

**Lo que había:** `startGala` creaba 420 puntos QUIETOS repartidos al azar tras la bóveda
y les subía y bajaba la opacidad con dos senos desfasados. Nube que parpadea, no fuegos:
sin cohete, sin estallido, sin caída y sin color.

**Lo que hay ahora — `3d/fireworks.ts`:** el ciclo entero de un fuego de verdad.
1. Un COHETE sube desde los morteros de detrás de la nave, frenándose (gravedad +
   arrastre) y soltando estela de brasas más una cabeza incandescente: el cometa.
2. Al acabarse la mecha, ESTALLA: fogonazo blanco al centro y una **cáscara** de chispas
   con dirección uniforme sobre la esfera (Arquímedes) y rapidez casi constante (±12 %).
   Es lo que hace que se lea como una bola que se abre y no como una nube.
3. Las chispas nacen BLANCAS y se tiñen del color de la bomba en 0.2 s (metal que se
   enfría), luego cuelgan, caen a velocidad terminal (g/arrastre) y titilan al morir.
4. Tres bombas: peonía, crisantemo (más ancha, toda con purpurina) y sauce (pocas,
   pesadas, cortina que se descuelga). Siete colores saturados de un solo tono cada uno.

Un solo `THREE.Points` con pool de 2200 y pila de ranuras libres (reciclar es O(1)):
**1 draw call** para el cielo entero, y `step` cuesta 0.01 ms por frame. Material propio
porque hace falta tamaño y opacidad POR PARTÍCULA, que `PointsMaterial` no da.

**Manda el audio, como el relámpago del apartadero.** `audio/fireworks-sound.ts` lleva
las **84 detonaciones** de `fireworks.mp3` medidas sobre su envolvente (ventana de 20 ms,
pico local ≥ 2× el entorno) con su segundo exacto y su fuerza. Como un cohete tarda
1–3 s en subir, la bomba se ENCARGA con antelación (`update` mira el `currentTime` y
avisa antes) para que el fogonazo caiga sobre su trueno: es el problema de los `onset`
de los Thunder Clap, resuelto al revés. Verificado: bombas a 1.54 / 2.14 / 3.38 / 5.00 /
6.44 / 7.25 / 8.69 s contra una tabla de 1.66 / 2.14 / 3.38 / 5 / 6.44 / 7.26 / 8.7.
Si la grabación pasa 3 s sin detonar, `Fireworks` lanza por su cuenta: nunca hay cielo
vacío, y si el navegador rechaza el audio la gala se ve igual.

**Dos trampas que costaron sus pasadas:**
- *El material crudo se salta la cadena de color.* Un `ShaderMaterial` propio no recibe
  los chunks `tonemapping_fragment` / `colorspace_fragment` que el renderer inyecta en
  los materiales de three, así que los fuegos se pintaban fuera del ACES de la escena:
  planos y apagados. Incluidos los dos chunks, entran por el mismo aro que todo lo demás.
- *ACES desatura lo que pasa de 1.* Con el brillo alto —y las chispas se SUMAN unas
  sobre otras— las siete bombas se volvían la misma mancha blanca. El pico se dejó
  rozando 1 y el núcleo se refuerza con el PROPIO color de la bomba, no con blanco.
  También hubo que triplicar el tamaño: a 200 u una chispa de 1.1 daba 2 px y no hay
  bloom que la salve.

**Encuadre:** apex 76–142 u (la bóveda mide 62), x a ±20–90 y z entre −45 y −190. Más
alto o más abierto y se salían del parabrisas justo en el tramo final, que es donde hay
que verlas.

**Verificado** con capturas a 420, 210 y 60 u de la boca: silueta lejana con el castillo
encima, bombas encuadradas por la ventana, y cohetes subiendo entre las torres. 79–91
draw calls (presupuesto 200), pico de ~1000 partículas vivas. Build limpio.

---

## 2026-08-28 — Migración al sitio y los sfx a R2 (Claude Opus 5)

**La migración (§15 del plan), completa:** copia a `apps-src/grados-mayores-juego/`,
`scripts/copy-dist.mjs` a `public/apps/grados-mayores-juego`, página
`app/[locale]/apps/grados-mayores/juego/page.tsx` calcada de Batisfera, ruta en
`i18n/routing.ts` con alias EN `/game`, y `gameUrl`/`gameLabel`/feature en el catálogo.
Verificado con `next build`: `/es/…/juego` y `/en/…/game` 200, `/en/…/juego` 307 al
alias, el juego arranca dentro del iframe en ambos idiomas.

Dos rutas del plan estaban vencidas: el repo del sitio se movió a
`Documents\Claude Cowork
uevo_website\storm-studios\StormStudios` y el del juego
vive en `D:\codex\`. Corregidas.

**Los sfx salieron del bundle.** Luis los subió a R2 (`storm-samples/expreso-tonal/`),
que resultó ser el MISMO bucket de los samples de notas — el `AUDIO_BASE` de siempre.
`dist` pasó de ~11 MB a 660 kB, y el repo del sitio se ahorra otros 11 MB de mp3 que ya
no hacen falta para compilar (por eso `apps-src/grados-mayores-juego/` va sin `sfx/`;
la carpeta se queda aquí como archivo, junto a R2).

`sfxUrl()` vive en `audio/samples.ts`, al lado de `audioUrl()` y por la misma razón:
"41 Rain.mp3" lleva espacio, y las URLs de samples no se concatenan a mano (§16).

**La trampa: el tren se habría quedado mudo.** Es el único sfx que pasa por WebAudio
—`ensureEffects` le cuelga el eco del túnel con `createMediaElementSource`— y un
elemento remoto sin CORS no lanza error al enchufarlo: devuelve SILENCIO. Lleva
`crossOrigin = "anonymous"` puesto ANTES del `src`, o la carga arranca sin él.

Y como la lista CORS del bucket tiene `localhost:3000` y los dominios de producción
pero no el `127.0.0.1:5175` del servidor de desarrollo, `vite.config.ts` monta un proxy
`/r2` → el bucket: en dev los sfx son del mismo origen y no hay CORS de por medio.
`SFX_BASE` conmuta con `import.meta.env.DEV`. Verificado: el proxy sirve
`smooth_train_sound.mp3` y `41 Rain.mp3` con 200 en 5175, y desde el iframe del sitio
el bucket responde 206 con CORS a `http://localhost:3000`.

El CSP del sitio ya cubría esto sin tocar nada: `media-src` lleva `https:` y
`connect-src` lleva `*.r2.dev`.
