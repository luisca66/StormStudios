# BITÁCORA DE DESARROLLO — El Cometa

Registro por fases (PLAN §0.2). El agente que continúe empieza leyendo esto.

> ✅ **PUBLICADO el 2026-08-30.** Luis lo probó en local, encontró el bug de la consola,
> se arregló, y dio el OK explícito para publicar. Vive en
> `/es/apps/grados-menores/juego` y `/en/apps/grados-menores/game`.
> A partir de aquí, cada cambio que se quiera en línea necesita `npm run deploy` en esta
> carpeta (que recompila y copia a `public/apps/`) **más** commit y push a `main`.

---

## 2026-08-29 — F0 Scaffold ✅ (Claude Fable 5)

**Hecho:**
- `package.json` / `tsconfig.json` (strict, `noUnusedLocals`) / `vite.config.ts`
  (`base: "./"`, puerto **5176**, proxy `/r2` para el audio en dev) calcados del Expreso
  Tonal; única dependencia runtime `three`. `npm run build` (incluye `tsc --noEmit`)
  limpio.
- `index.html` con todas las secciones de pantalla del PLAN §10 (menú-observatorio, hud,
  llegada, resumen, planetario, pausa, toast) — hud/llegada/planetario vacías, se llenan
  en F5/F8/F9.
- `src/style.css`: paleta latón/azul noche/hielo, fuentes Playfair Display + Rajdhani,
  sistema de pantallas, chips, botones, toast, crédito, y el **arito de las binarias**
  (`.pair-group`) para los pares mutables. El cielo del observatorio son
  `radial-gradient`s: cero assets.
- `src/i18n.ts`: patrón de la casa (`?lang=`, `t()`, `data-i18n`). **97 claves en es y 97
  en en, cero desparejadas** (verificado).
- `src/config.ts`: TODOS los tunables del plan (viaje, órbita, velocidades, puntos,
  audio, cámara, física del cometa, decorado, rendimiento), las **15 rutas
  región×variante**, los swatches y las **15 constelaciones** con su helper
  `constellationStars()`.
- `src/music/degrees.ts`: constantes VERBATIM de `referencias/data.js` que el menú
  necesita (SCALES, los 11 grados en orden canónico intercalado, timbres, glosario,
  sufijos cortos, `MUTABLE_PAIRS`/`mutablePartner`, `minorChordFileName`).
  **Pendiente para F1:** `scaleDegrees`, `NOTE_FILES`, fallbacks enharmónicos,
  `writtenMidi`, `triadFiles`, `scaleWalkFiles`, selector, player.
- `src/main.ts`: menú FUNCIONAL — constelación (15 chips con swatch de región y tooltip
  figura·región·variante), timbre, velocidad (muestra ventana en segundos y
  multiplicador), grados con los **4 presets de la taxonomía menor** y validación de
  mínimo 2, volumen. INICIAR VIAJE y Planetario muestran toast "en construcción".

**Decisiones:**
- **Puerto dev 5176** (5173 Batisfera, 5174 Aerostato, 5175 Expreso). Registrado en el
  `launch.json` del repo como configuración `el-cometa` (con `url` explícita a
  `http://127.0.0.1:5176`, por la nota de IPv6 heredada del Expreso).
- **Las constelaciones se definen por ANCLAS, no por 20 puntos sueltos.** `config.ts`
  guarda una polilínea de 5–11 anclas por figura y `constellationStars(id, n)` reparte
  las n estrellas uniformemente por su longitud. Así el mapa de progreso del HUD (F5)
  dibuja la figura al ritmo del viaje, y retocar una constelación es mover anclas, no
  recontar estrellas. Verificado: las 15 dan 20 puntos dentro de [0,1] sin NaN.
- `music/degrees.ts` se creó en F0 (adelantado del plan) porque el menú necesita las
  listas de grados; solo constantes y helpers puros, cero lógica de audio.
- Los presets salen de `DIATONIC_DEGREES` (fuente única) en vez de repetir las listas.
- Settings del menú viven en memoria; persistencia en localStorage llega en F9 (plan).

**Corrección al PLAN antes de escribir código (§3.4, §3.5, §12, §14, §16):** revisando la
bitácora del Expreso (entrada 2026-08-26) apareció que **los samples de acorde del bucket
R2 no respetan su carpeta de timbre** — pidiendo `Piano/Major Chords/Cmajor.mp3` sonaba un
cello, y Piano/Cello/Coro comparten duración exacta. El Expreso los abandonó y apila la
tríada desde notas sueltas. El plan de El Cometa pedía `Minor Chords` como firma sonora
del radiofaro: se cambió a **tríada i apilada** en los tres sitios donde suena la tónica
(radiofaro, revelación de la deriva, acorde final del Perihelio). F1 debe sondear igual
`Minor Chords` y anotar el veredicto, pero el default ya es la tríada.

**Verificado (criterios F0):** `npm run dev` levanta en 127.0.0.1:5176; menú completo en
es y en `?lang=en` (título, tagline, regiones, presets, timbres, velocidades); los presets
marcan chips y el chip del preset activo se ilumina; validación de mínimo 2 grados con
clicks reales (a 1 grado: aviso rojo + INICIAR VIAJE deshabilitado); **la trampa A#m/IVly
funciona** (al elegir A#m el chip IVly se deshabilita, el contador dice "10 activos" con
el preset Todo, y aparece el aviso "En A#m el IV lidio no está disponible: su nota (E##)
no existe en las muestras"); las 15 rutas tienen tonalidad, constelación y variante
únicas, 3 por región; **0 errores en consola** del navegador.

**Nota heredada del Expreso, confirmada:** abrir siempre por `http://127.0.0.1:5176`
(`localhost` puede resolver a IPv6 en Windows y no responder).

**Siguiente fase: F1** — Música y samples: `music/degrees.ts` completo (`scaleDegrees` y
`NOTE_FILES` VERBATIM, fallbacks C##→D y G##→A, `writtenMidi`, `triadFiles` con el V
MAYOR de la armónica, `scaleWalkFiles` melódica↑/natural↓), `music/selector.ts`,
`audio/samples.ts` y `dev/harness.ts` con `?dev=1`. Criterios en PLAN §13-F1.

---

## 2026-08-29 — F1 Música y samples ✅ (Claude Fable 5)

**Hecho:**
- `music/degrees.ts` completo: `scaleDegrees` y `NOTE_FILES` (131 notas) VERBATIM de
  referencias, `AUDIO_NOTE_FALLBACKS`, `writtenMidi`, `pitchClassOfDegree`,
  `degreeOfPitchClass`, `triadFiles` (cadencia i–iv–V) y `scaleWalkFiles`
  (`melodicUp` / `naturalDown`, la espiral de §12).
- `music/selector.ts`: port fiel de `buildQuestionSet`, `makeDegreeNoteSelector` (bolsa
  barajada intacta), `timbreDirsForSelection`, `supportTimbreDir`.
- `audio/samples.ts`: `SamplePlayer` (patrón Expreso: cache + clonado + unlock con WAV
  silencioso + precarga con timeout) con `audioUrl` que aplica **fallback enharmónico +
  encode POR SEGMENTO**, `playNote`, `playTriad` (equipotencia 1/√n), `playScaleWalk`
  (cancelable), SFX y `playTonicChord`/`tonicChordPath` sin uso (ver abajo).
- `src/dev/harness.ts`: arnés de QA montado SOLO con `?dev=1` (import dinámico, chunk
  aparte de 14.8 kB). 22 pruebas puras automáticas + botones de audio + sondas de red +
  `window.CometaQA`. **REUTILIZAR este arnés en fases siguientes.**

**Hallazgo 1 — los `Minor Chords` están SANOS (cierra §3.4).** ⚠️ Ojo al leer esta
entrada: primero llegué a la conclusión CONTRARIA y estaba equivocada. Ver la corrección
de más abajo (misma fecha), que es la buena. Resumen bueno: el radiofaro usa el sample
real `{Timbre}/Minor Chords/{tónica}minor.mp3`, la misma ruta que la webapp seria.

**Hallazgo 2 — auditoría del inventario contra la teoría.** Crucé las 26 clases que usan
las 15 tonalidades contra `NOTE_FILES`: hay exactamente dos anomalías y ninguna más.
`E##` se usa pero no existe (la trampa de A#m, ya conocida) y **`D##` existe en el
inventario pero ninguna tonalidad menor lo usa** — es inventario muerto, y además su
archivo da 404 en el bucket. Da igual porque el selector no puede sortearlo, pero queda
anotado en el plan §3.2 para que nadie se asuste en una sonda futura. Las otras 24
clases: **50/50 OK** sondeadas en Piano y Fagot.

**Verificado (criterios F1):**
- **Pruebas puras 22/22**: mapa sagrado (C#m/F##=IVly, A♭m/B♭♭=IIfr, D#m/C##=VIIsen, los
  15 mapas con sus 11 grados); convención de octavas (B#3=60, C♭4=59, F##4=67);
  **las 45 tríadas con inventario y sonoridad correcta — i/iv menores [3,4] y V MAYOR
  [4,3]**; las **15 espirales** (8+7 anillos, monótonas, subida con #6/#7, bajada con
  ♭7/♭6, misma tónica de ida y vuelta); la trampa de A#m en los dos sentidos; selector
  con 3, con 11 y con 2 grados (200 sorteos sin repetición seguida); URLs (fallback
  C##→D y G##→A, D##/F## intactos, ♭♭ y espacio codificados).
- **Reproducción real** (espiando `HTMLMediaElement.play`): la cadencia de Am suena
  `A3+C4+E4` → `D3+F3+A3` → **`E3+G#3+B3`** → `A3+C4+E4`. El V es E MAYOR con la
  sensible G#: la cadencia establece el modo menor de verdad.
- **Fallback en vivo:** la tríada V de D#m en Fagot pide `Fagot/A#3`, **`Fagot/D4`** y
  `Fagot/E#4` — el C##4 teórico suena con el archivo D4 sin perder su nombre.
- **Espiral en vivo:** los 15 anillos de A♭m en Coro suenan
  `A♭4 B♭4 C♭5 D♭5 E♭5 F5 G5 A♭5` ↑ y `G♭5 F♭5 E♭5 D♭5 C♭5 B♭4 A♭4` ↓ — ortografía de
  A♭m (C♭, F♭, G♭), no enarmónicos.
- **Disciplina de timbre:** todo lo que suena sale de la carpeta elegida (`Piano/` con
  Piano, `Fagot/` con Fagot, `Coro/` con Coro). En ningún caso se pidió un `Minor Chords`.
- `npm run build` limpio; 0 errores en consola del navegador.

---

## 2026-08-29 — CORRECCIÓN de F1: los acordes menores nunca estuvieron rotos

**Luis rechazó el hallazgo 1** ("¿a qué te refieres con lo de los acordes menores? Usa
como referencia la webapp que ya tenemos para todos los ruteos, esa no tiene ningún
problema"). Tenía razón, y el error es mío y de método.

**Qué hice mal:** deduje "es el mismo archivo" de que cuatro timbres compartían
**duración** (5.064 s). Eso no prueba nada. Además arrastré por analogía el problema del
Expreso, generalizándolo de "unos acordes mayores" a "los samples de acorde del bucket",
y cambié el diseño (radiofaro con tríada apilada) sobre esa base falsa.

**Cómo se comprueba de verdad:** comparando el CONTENIDO. En dev hay proxy `/r2`
(mismo origen), así que `fetch` sí puede leer los bytes y sacar un SHA-256. Resultados:

- **`Minor Chords`: 75/75 archivos DISTINTOS** (15 tónicas × 5 timbres), cero
  duplicados, cero errores. Los acordes menores están perfectos.
- Cuatro de los cinco `Aminor.mp3` pesan lo mismo (202560 bytes) y duran lo mismo, y aun
  así **tienen hash distinto**: son grabaciones diferentes. Ahí murió mi inferencia.
- **`Major Chords`: `Piano/*` es byte a byte idéntico a `Cello/*` en las 15 tónicas.**
  Ese es el fallo real que oyó Luis en el Expreso — un asset mal subido, acotado a ese
  par. Corno, Coro y Fagot están bien. **No afecta a este juego.**

**Revertido:** el radiofaro, el acorde final de la cadencia y el del Perihelio vuelven a
usar el sample `Minor Chords` como pedía el plan original (más rico que la tríada
apilada). iv y V siguen apilándose, porque de esos no existen samples en el bucket.
Corregidos §3.4, §3.5, §12, §14 y §16 del plan, más los comentarios de `degrees.ts` y
`samples.ts` que repetían la afirmación falsa.

**En el arnés:** el botón de diagnóstico por duración se sustituyó por
**"🔬 Hash de los 75 Minor Chords"**, que compara contenido y da `75/75 distintos`.
`CometaQA.probeHash(ruta)` queda expuesto para futuras auditorías de assets.

**Regla que queda para las siguientes fases (y que el plan ya recoge en §16):** la
referencia de ruteo es la webapp seria `apps-src/grados-menores/`. Sus URLs funcionan en
producción; antes de "arreglar" una ruta o declarar roto un asset, mirar cómo lo hace
ella — y si hay que acusar a un archivo, comparar hashes, no metadatos.

**Para Luis (fuera del alcance de este juego):** si algún día quieres arreglar el
Expreso, el fallo es que `Piano/Major Chords/*` contiene la grabación de cello en las 15
tónicas. Re-subiendo esos 15 archivos, el Expreso podría volver a su sample de acorde en
vez de la tríada apilada a la que se replegó en F10.

---

**Siguiente fase: F2** — Ruta y cometa: `3d/renderer.ts`, `track.ts` (spline por segmentos
con seed por tonalidad, estela de polvo, boyas, streaming), `comet.ts` (avance, sprint,
flotación), `cab.ts` básico, murmullo sintetizado proporcional a la velocidad, mirada con
drag + auto-recentrado. Criterios en PLAN §13-F2.

---

## 2026-08-29 — F2 Ruta y cometa ✅ (Claude Fable 5)

**Hecho:**
- `3d/track.ts`: spline Catmull-Rom por puntos de control con RNG sembrado, frames con
  distancia acumulada, roll por curvatura y **streaming** de chunks. La ingeniería se
  porta del Expreso con sus dos arreglos ya pagados (tangente ANALÍTICA y `ensureReach`
  separado de `ensureBuilt`). Vestida distinto: **estela de polvo** (banda central tenue
  + dos cintas de hielo aditivas, 1 draw call por chunk) y **boyas** instanciadas.
- `3d/comet.ts`: avance sobre la spline con rampa de salida, sprint en zona muerta,
  slingshot, **flotación** (no traqueteo: senos lentos + micro-deriva lateral), roll en
  curva y mirada por drag con auto-recentrado.
- `3d/cab.ts`: carlinga básica — marco de latón/hielo con alféizar remachado, proa de
  hielo con esquirlas, portillas laterales y la **estela propia**.
- `3d/renderer.ts`: escena, cámara, loop, resize, campo de estrellas y polvo cercano
  reciclado por envoltura. Cielo/regiones de verdad en F3–F4.
- `audio/comet-sound.ts`: murmullo 100 % sintetizado (rumble grave + siseo de hielo
  sublimando) que sigue la velocidad, con `setDuck` para la regla de silencio y crujidos
  de hielo. Cero assets, ninguna altura reconocible (§2.11).
- `main.ts`: INICIAR VIAJE ya vuela; Esc pausa; "Abandonar viaje" vuelve al menú.

**Decisiones de diseño tomadas mirando por la ventana:**
- **Fuera el montante central** de la ventana. Lo puse por carácter de época y parte el
  encuadre justo por la mitad, que es donde ocurre el juego. El carácter lo dan ahora el
  alféizar remachado con filo de latón y las jambas.
- **La proa encoge y baja** (r 1.5→0.95, y −1.5→−2.3, z −4.4→−6.2): tiene que ASOMAR por
  el borde inferior, no comerse medio encuadre.
- **Las boyas se apartan** (±2.6→±4.6 u, r 0.42→0.24): marcan el ritmo por la periferia
  sin meterse en la vista.
- **La estela va en UN `THREE.Points`, no en sprites.** Con sprites, además de gastar un
  draw call por mota, el material se comparte y la opacidad de una sería la de todas. El
  desvanecido se hace por COLOR: con blending aditivo, negro = invisible.

**Bug encontrado y corregido:** `scene.add(this.camera)` —puesto para "que se vean los
hijos de la cámara"— **reparenta**, y arrancaba la cámara del rig del cometa: se veía la
carlinga desde fuera y a 40 u de distancia. La cámara ya cuelga de `comet.root`, que está
en la escena, así que sus hijos se pintan sin tocarla. Anotado en el propio archivo.

**⚠️ Nota de método para las fases siguientes — el pane estrangula `requestAnimationFrame`
a ~1 fps** aunque `document.visibilityState` diga "visible". Consecuencias:
1. **El reloj de pared no mide nada aquí.** Con el clamp de `dt` a 0.05 s, la simulación
   avanza ~20× más lenta que el tiempo real y parece que el cometa no se mueve.
2. **La forma correcta de verificar es conducir el loop a paso fijo** desde consola
   (`comet.update(1/60)` en bucle): es determinista y no depende del pane. Todo lo de
   abajo se midió así.
3. **El criterio de ≥50 fps queda PENDIENTE de comprobar por Luis** en un navegador de
   verdad. Lo que sí se pudo medir es el presupuesto de dibujo: **62 draw calls** de 200.

**Verificado (criterios F2):**
- **Recorrido:** 60 s simulados a paso fijo → 914 u y **6 segmentos** (el criterio pide
  5+), velocidad estable en crucero.
- **Streaming:** los chunks se mantienen entre **16 y 19** durante todo el recorrido; se
  podan por detrás, no crecen sin límite.
- **Sprint de zona muerta:** perfil dentro de un segmento = 11.2 → **19.3** (a 40 u) →
  12.7 → 11.0. Justo el diseño (crucero 11 × 1.8).
- **Roll en curva:** máximo **2.0°**, que es exactamente el clamp de `CURVE_BANK_DEG`.
  Ondulación vertical de la ruta: −3.1 a +2.3 u.
- **Seed por tonalidad:** la huella de Am es idéntica entre reinicios y distinta de la de
  Dm (Am curva a la izquierda, Dm a la derecha).
- **Murmullo proporcional:** rumble 0.080 → 0.167 → 0.320 → **0.464** y corte del filtro
  28 → 79 Hz para velocidades 0/4/11/20. Monótono creciente. (Ojo al medirlo: hay que
  pausar el loop antes, o él mismo pisa el valor con la velocidad real.)
- **Mirada:** tras arrastrar, yaw −36°; a los 3 s vuelve a −0.4° y el pitch a su neutro.
- **Pausa congela:** la distancia no se mueve ni un decimal mientras está pausado.
- `npm run build` limpio; **0 errores** en consola en un vuelo completo.

**Siguiente fase: F3** — Cielo y regiones (2 de 5): `environment.ts` (domo estrellado con
twinkle, nebulosas de canvas, estrella natal que crece con el progreso, keyframes de
color por región/variante) y `scenery.ts` con Nebulosa Lumbre y Cinturón de Rocas.
Criterios en PLAN §13-F3.

---

## 2026-08-30 — F3 Cielo y regiones ✅ (Claude Fable 5)

**Hecho:**
- `3d/environment.ts`: domo con shader (gradiente sutil + **nebulosa de canvas aditiva**
  sembrada por ruta), **campo de 1600 estrellas con twinkle** (un seno por estrella con
  fase propia, en el vertex shader), **estrella natal** que crece con el progreso, niebla
  que comparte color con el fondo, paletas de las **5 regiones** y tinte de las 15
  variantes, y el gancho `setDriftGrey` listo para la deriva de F7.
- `3d/scenery.ts`: escenografía por chunks (construye por delante, libera por detrás) con
  las dos primeras regiones — **Nebulosa Lumbre** (pilares de gas, huevos de estrella,
  polvo luminoso) y **Cinturón de Rocas** (cinturón de asteroides girando y
  asteroide-catedral con vetas de cristal).
- `3d/renderer.ts`: fuera el cielo provisional de F2; ahora orquesta Environment y
  Scenery, y expone `setProgress` para dirigir el progreso desde fuera.

**Tres bugs encontrados y corregidos:**
1. **Los `THREE.Points` sin textura se dibujan como CUADRADOS.** El polvo cercano y las
   motas de la Nebulosa salían como cuadraditos naranjas sobre el cielo. Se les puso una
   mota redonda de canvas. Apuntado en el código de los dos sitios, porque es un fallo
   que se repite en cuanto uno añade partículas.
2. **La estrella natal no se veía.** Estaba a +46 de altura y quedaba SIEMPRE por encima
   del dintel de la ventana: creciendo pero invisible, que es tanto como no tenerla. Bajó
   a +14 y ahora se planta en el punto de fuga de la ruta — la estela lleva a casa.
3. **`setProgress` no servía para nada.** El loop recalculaba el progreso desde la
   distancia CADA frame, así que pisaba el valor externo al frame siguiente. Ahora hay un
   flag `progressDriven`: en cuanto alguien manda el progreso, el loop deja de estimarlo.
   Es el mismo patrón de trampa que ya me mordió midiendo el murmullo en F2 — **cuando el
   loop y una llamada manual escriben lo mismo, gana el loop.**

**Decisión de rendimiento: el cinturón pasa a InstancedMesh.** Primero lo escribí con una
malla suelta por asteroide y comenté que instanciar "saldría más caro" por tener que
recomponer matrices. Lo medí y era falso: instanciado cuesta **menos** (0.037 ms/frame
frente a 0.048) y baja los draw calls de **151 a 90**. Las geometrías y el material ya se
compartían; lo que faltaba era compartir también la llamada de dibujo. El comentario
equivocado está corregido en el archivo.

**Verificado (criterios F3):**
- **Am y Gm se distinguen de un vistazo:** Am es la Nebulosa Lumbre (cielo granate,
  pilares de gas naranja, huevos de estrella); Gm es el Cinturón de Rocas (cielo casi
  negro, campo denso de asteroides y cristales turquesa). Capturas comparadas.
- **La estrella natal crece:** escala 14 → 132 y luz 0.97 → 2.4 entre progreso 0.05 y 1,
  y se VE hacerlo (comprobado ocultando la escenografía para aislarla).
- **Los asteroides giran sin coste perceptible:** 151 rocas vivas, la matriz de instancia
  cambia frame a frame, y la escenografía entera cuesta **0.037 ms por frame**.
- **Draw calls dentro de presupuesto:** LUMBRE 114, ROCAS 90, de 200.
- `npm run build` limpio; **0 errores** en consola.

**A vigilar en F4:** en LUMBRE, **93 de los 114 draw calls son sprites** (cada bocanada de
gas es uno). Las tres regiones que faltan no se suman a ésta (solo hay una activa por
ruta), pero si al añadir fauna, cometa hermano y guiños alguna región se acerca a 200, el
arreglo conocido es pasar las bocanadas a un `THREE.Points` con tamaño por partícula en
el shader: un draw call por chunk en vez de ~23.

**Sigue pendiente de Luis:** el criterio de **≥50 fps** no se puede medir aquí (el pane
estrangula rAF a ~1 fps, ver la nota de F2). Hay que comprobarlo en un navegador real.

**Siguiente fase: F4** — Regiones restantes y vida: Anillos de Hielo (gigante gaseoso),
Cúmulo de Faroles (estrellas binarias §5.7), El Vacío (galaxia de canto), fauna de polvo,
cometa hermano con doppler y los guiños a Expreso y Aerostato. Criterios en PLAN §13-F4.

---

## 2026-08-30 — F4 Regiones restantes y vida ✅ (Claude Fable 5)

**Hecho:**
- **Anillos de Hielo:** se viaja DENTRO del plano de anillos. Bandas de partículas con
  huecos de Cassini (el radio se sortea por bandas, no uniforme), lunas pastoras,
  géiseres de hielo y un **gigante gaseoso** con bandeado ondulado de canvas.
- **Cúmulo de Faroles:** cientos de soles cercanos y las **estrellas binarias** (§5.7),
  dos hermanas casi idénticas orbitándose — el par mutable del modo menor puesto en el
  paisaje, sin una palabra. Más una estación-faro de latón que barre su haz.
- **El Vacío:** casi nada, y por eso todo se ve. Su lujo es la **galaxia vista de canto**
  cruzando el cielo, con bulbo central y veta de polvo.
- **Fauna:** bandada de polvo en formación de V que vuela por delante, ondulando con un
  seno por individuo (patrón de las golondrinas de Aerostato). Un solo `THREE.Points`.
- **Cometa hermano:** núcleo de hielo + cola, cruza en sentido contrario, con
  **rugido de doppler** sintetizado (cluster de ruido, filtro que barre de agudo a grave
  y paneo que cruza) — sin altura reconocible, como manda §2.11.
- **Guiño al Aerostato:** el globo dorado asoma muy alto durante los dos primeros
  segmentos y se apaga.
- `nebulaStrength` por región en `environment.ts`, y el interruptor `ambientAllowed` que
  F6 usará para la regla de silencio.

**Decisión de arquitectura repetida a conciencia:** todo lo masivo va en `THREE.Points`
—soles del cúmulo, anillos, géiseres, bandada, cola del hermano—. Con un sprite por
cuerpo, el Cúmulo solo habría costado cientos de draw calls. Es la misma lección que las
rocas de F3, aplicada antes de tropezar esta vez.

**Tres cosas que hubo que corregir mirando la pantalla:**
1. **Faroles salía como una niebla marrón.** Supuse que eran los soles acumulándose en
   aditivo; los oculté para comprobarlo y el marrón seguía ahí — era la nebulosa del
   domo. En vez de trastear con el número de manchas, cada región tiene ahora su
   `nebulaStrength`: alta donde el gas es el protagonista (Lumbre 1.0), baja donde lo son
   los cuerpos (Faroles 0.30). El cúmulo pasó a leerse como soles y no como sopa.
2. **La galaxia de canto salió como una hilera de agujeros redondos.** La veta de polvo
   la había pintado con círculos negros sueltos y grandes, que recortan el disco en vez
   de cruzarlo. Ahora es una **banda continua** con degradado vertical y unas
   irregularidades pequeñas encima. Al segundo intento se lee como la Vía Láctea.
3. El **gigante gaseoso** no se veía de frente: está a un lado fijo de la ruta, que es lo
   correcto (es un planeta, no un decorado que persigue al jugador). Se comprobó girando
   la vista hacia él — y ahí domina el cielo entero.

**Verificado (criterios F4):**
- **Las 15 rutas cargan** con su combinación región×variante de §5.4: 15 de 15, cero
  errores, y cada región con los cuerpos que le tocan (Rocas 81–114, Hielo 1–2 lunas,
  Faroles su torre, Vacío 0–1).
- **El cometa hermano solo aparece en zona muerta:** de 63 apariciones muestreadas,
  **todas** cayeron dentro de los primeros 40 u del segmento (máximo 39.9) y **ninguna**
  fuera. Con la regla de silencio activada (`ambientAllowed = false`), **0 apariciones**
  en 20 000 frames.
- **Draw calls < 200 en las cinco regiones:** Lumbre 111, Rocas 91, Hielo 68, Faroles 73,
  Vacío 67. El máximo bajó respecto a F3 pese a triplicar el contenido.
- El **globo del Aerostato** se ve al partir y se apaga pasados dos segmentos.
- `npm run build` limpio; **0 errores** en consola recorriendo las cinco regiones.

**Pendiente por diseño (no es olvido):** el **guiño al Expreso Tonal** —la hebra dorada
con una lucecita avanzando sobre el planeta natal— necesita el planeta, que se construye
en F8. Queda anotado ahí.

**Sigue pendiente de Luis:** el criterio de **≥50 fps** (el pane estrangula rAF; ver F2).

**Siguiente fase: F5** — Consola y HUD: `ui/hud.ts` con las palancas de los 11 grados en
orden canónico y los pares mutables enlazados, `ui/constellation.ts` con el mapa de
progreso, la carlinga 3D completa (orrery, sextante, llave del radiofaro) y la viñeta.
Criterios en PLAN §13-F5.

---

## 2026-08-30 — F5 Consola y HUD ✅ (Claude Fable 5)

**Hecho:**
- `ui/hud.ts`: la **consola de latón y hielo** completa — bitácora de a bordo, ventana de
  respuesta, marcadores (puntos/racha/velocidad), palancas de grado, radiofaros con sus
  iconos, botón de repetir y el teclado de §8. No tiene lógica de juego: pinta un
  `HudState` y avisa por callbacks, así que F6 puede enchufarle el estado real sin
  tocarla.
- `ui/constellation.ts`: el **mapa de progreso**. Es el análogo de la tira de ruta del
  Expreso, pero aquí el progreso DIBUJA la figura de la tonalidad: 20 estrellas que se
  encienden una por acierto, con la siguiente señalada en hielo y las líneas de la
  constelación tenues de fondo (la figura existe antes de recorrerla).
- `3d/cab.ts`: el tablero de bronce — **orrery** de tres planetas girando a distinta
  velocidad, **sextante**, **manómetro de empuje de cola** cuya aguja persigue la lectura
  con inercia, y la **llave del radiofaro** que baja al transmitir y vuelve sola.
- `style.css`: consola, palancas con sus estados, aritos de los pares, panel derecho y la
  **viñeta fría**. La capa del HUD es `pointer-events:none` y solo la consola lo reactiva,
  para no robarle al canvas el drag de la mirada.
- `main.ts`: un **simulador** que da vida a la consola (§F5 pide "datos simulados"). Está
  marcado como desechable: F6 lo sustituye entero por el `GameStateManager`.

**Decisión de diseño:** los pares mutables se hermanan en su arito **solo si los DOS
están activos**. Con uno solo no hay confusión posible que señalar, y dibujar el arito
alrededor de una palanca suelta sería decorar sin decir nada. Por eso en el preset
Natural no aparece ningún arito y en Melódica aparecen los dos.

**Verificado (criterios F5):**
- **Consola completa y viva** con el simulador: la ventana se vacía, la bitácora revela
  nota y grado al resolverse, y los marcadores se mueven.
- **Palancas correctas**: con el preset Melódica salen las 9 activas en orden canónico
  intercalado con sus teclas (1–6, E, 7, R) y **los dos pares hermanados** (VI+VImel,
  VIIST+VIIsen), leído del DOM, no a ojo.
- **Estados de palanca**: al pulsar I con la respuesta III, la I quedó *incorrecta* (roja),
  la III *correcta* (verde) y el resto *bloqueadas*; la bitácora dijo "Deriva. Era III
  (Mediante)". El camino de tiempo agotado también revela: "Sin respuesta. Era VIIsen
  (VII sensible (#7))".
- **Radiofaros**: dos pulsaciones de `B` dejaron 2 iconos gastados y 1 disponible.
- **La constelación enciende estrellas** y marca las derivas como cicatrices aparte.
- `npm run build` limpio.

**⚠️ Anomalía sin atribuir (honestidad, no la vendo como resuelta):** la consola del
navegador reporta un `500 Internal Server Error` en cada carga, pero **no he podido
atribuirlo a la app**: el log de vite está limpio, los 22 recursos que pide la página
devuelven 200/304, y `/favicon.ico` da 404 (no 500). Reinicié el servidor por si era
caché y persiste. El juego funciona por completo. Sospecho que viene de la maquinaria
del propio pane de vista previa, pero **no está demostrado** — conviene volver a mirarlo
en un navegador de verdad, junto con la comprobación de fps.

**Siguiente fase: F6** — Loop de juego: `game/state.ts` con la máquina de estados §7.1,
anillos funcionales con sus espadines, la baliza que dispara la pregunta, respuesta por
click/teclado, acierto con clang + slingshot, radiofaro con descuento y la cadencia de
salida i–iv–V–i al abrirse la cúpula. Criterios en PLAN §13-F6.

---

## 2026-08-30 — F6 Loop de juego ✅ (Claude Fable 5)

**El juego ya se juega.** Suena la cadencia, la baliza dispara la nota, respondes con la
palanca o la tecla, el anillo se alinea o se queda cruzado, y a las 20 decisiones se
llega al Perihelio.

**Hecho:**
- `game/state.ts`: la máquina de estados de §7.1 como **lógica pura** — no importa nada
  de `3d/` ni de `ui/`, así que se ejercita entera desde consola (y así se verificó todo
  lo de abajo). Todo efecto sale por `JourneyPorts`.
- `3d/rings.ts`: la señalización diegética. **Baliza** (púlsar de latón que late y gira)
  al salir de la zona muerta, y **anillo de navegación** al final del segmento con
  espadines de luz que se alinean en ~0.4 s al acertar y se quedan cruzados al fallar.
- `main.ts`: los **puertos** que unen lógica y mundo, la **cadencia de salida** y el
  cambio del simulador de F5 por el juego real. El HUD no se enteró del cambio: sigue
  pintando un `HudState`, que era justamente el objetivo de separarlo.
- Un detalle del modo menor que ya viaja en la resolución: `mutableMix` marca cuándo la
  confusión fue entre las dos hermanas de un par (VI↔VImel, VIIST↔VIIsen). La bitácora
  ya lo nombra, y F7 lo usará para comparar las dos notas en la nebulosa.

**Verificado (criterios F6):**
- **Partida completa forzando aciertos**: 20 decisiones, fase ARRIVED, medalla de oro y
  **gala** (0 derivas, 0 radiofaros).
- **La fórmula de puntos §7.5 cuadra al punto.** No me fié del número: registré la racha
  y la ventana EXACTA de cada acierto, recalculé
  `(10 + racha×2 + round(5×ventana)) × 1.25` + llegada + radiofaros + gala por separado,
  y dio **1220 esperados contra 1220 reales**.
- **La cadencia suena MENOR**, comprobado por los archivos que de verdad se reproducen:
  **i** = A3+C4+E4, **iv** = D3+F3+A3, **V** = E3+**G#3**+B3 (mi MAYOR, con la sensible),
  e **i** final con el sample `Minor Chords/Aminor.mp3` — el mismo sonido del radiofaro.
  Y acto seguido la primera nota de pregunta. El cometa no se suelta hasta que termina.
- **Regla de silencio §2.11**: con pregunta viva, el bed baja a `duck 0.3` y el ambiente
  queda suprimido (nada de cometas hermanos); al resolver, ambos vuelven a 1 y a true.
- **Radiofaros**: tres usos válidos y el cuarto rechazado, con el botón deshabilitado.
- **Fallo**: respondiendo I cuando era VIIST, la racha cae a 0, el progreso baja con piso
  en 0, y el anillo de ese segmento queda `wrong` con los espadines cruzados (`aligned 0`).
- **El selector se reparte bien en una partida real**: con 7 grados en 20 preguntas salió
  3/3/3/3/3/3/2 — la bolsa barajada haciendo su trabajo.
- `npm run build` limpio.

**Añadido de paso:** un **favicon** en línea (SVG de un cometa, cero assets). El
navegador pedía `/favicon.ico` en cada carga y no existía.

**Anomalía del entorno, sin novedad:** siguen apareciendo un `500` y un `404` en la
consola del pane que **no logro atribuir a la app** (ver F5). Todos los recursos propios
cargan: los mp3 de R2 responden con estado 0, que es lo normal para audio opaco entre
orígenes. Insisto en comprobarlo en un navegador de verdad.

**Siguiente fase: F7** — La deriva: el lazo físico por la nebulosa gris, el feedback
pedagógico (revelación + tónica→nota + la comparación del par mutable que ya viaja en
`mutableMix`), progreso −2 con piso 0 y reintento del segmento con pregunta nueva.
El hueco donde engancha está marcado en `state.ts` con `DERIVA-F7`. Criterios en
PLAN §13-F7.

---

## 2026-08-30 — F7 La deriva ✅ (Claude Fable 5)

**El juego ya tiene consecuencias.** Fallar echa al cometa fuera de la ruta, a un lazo
por la nebulosa oscura donde el mundo se apaga y se revela la respuesta.

**Hecho:**
- `3d/drift.ts`: el lazo. NO es otra spline —es un **desvío lateral sobre la misma ruta**
  que ocupa un segmento, con garganta suave a la entrada y a la salida para que no haya
  tirón. Decorado: polvo denso y un **pecio** a la deriva con su luz oxidada parpadeando
  (dos senos desfasados, nunca un parpadeo regular). El pecio es lo que convierte el
  castigo en un LUGAR y no en una pausa gris.
- `game/state.ts`: fase **DRIFT** integrada en el hueco que dejó F6, con la revelación a
  media deriva y la reincorporación al llegar al segmento siguiente.
- `main.ts`: el **re-anclaje del oído** — tónica, y en caso de par mutable, la nota que
  respondiste seguida de la que era.

**El lazo ocupa EXACTAMENTE un segmento a propósito**, no un tiempo fijo: así la
reincorporación cae en un límite de segmento y la pregunta siguiente llega con ventana
COMPLETA, en vez de a media zona muerta con la mitad del tiempo. Es una lección heredada
del Expreso, igual que la de no forzar "ROLLING" al cruzar segmento (si no, el caso "sin
respuesta" —que resuelve justo en el límite— se comería la fase DRIFT entera).

**Decisión pedagógica que conviene que Luis revise al jugarlo.** El PLAN §2.6 pide
"tónica → nota" en la revelación. El **Expreso acabó quitando la nota** (bitácora del
2026-08-26: "volver a soltarla la regala en vez de reanclar") y dejó solo el acorde.
Aquí se sigue el plan y la nota SÍ suena, porque en menor la nota suele ser justo la que
distingue una escala de otra — pero es un tunable: `DRIFT_REVEAL_NOTE` en `config.ts`.
Si al jugarlo convence más la versión del Expreso, es cambiar `true` por `false`.

**Verificado (criterios F7):**
- **Fallar en la decisión 19 NO regresa a 0**: con progreso 18, responder mal deja **16**
  y entra en DRIFT; el viaje continúa y termina en ARRIVED con medalla de plata y sin
  gala.
- **El mundo se apaga y vuelve**: gris a 1 de golpe al entrar, desvío lateral hasta las
  26 u fuera del eje, y el color regresa a 0 en los 2 s de §5.5.
- **"Sin respuesta" tiene su mensaje propio**: *"El anillo no recibió rumbo. Sin
  respuesta. Era B (II — Supertónica)."*
- **La comparación del par mutable funciona**, que era lo más importante de esta fase:
  con la pregunta en **VIIST** (subtónica, G) respondí **VIIsen** (sensible), `mutableMix`
  se marcó, y en la deriva sonó **tónica (Aminor) → G#4 (la que dije) → G4 (la que era)**.
  Las dos hermanas seguidas sobre la tónica, que es la única forma de separarlas de oído.
- **Tras la deriva llega pregunta NUEVA**: antes `Piano/B4` (II), después `Piano/E6` (V),
  y el segmento avanzó 0 → 2 porque el lazo consumió el 1.
- `npm run build` limpio; **27 recursos, 0 fallidos**.

**Dos fallos que cacé mirando la pantalla:**
1. **El polvo de la deriva salía como CUADRADOS.** Es exactamente el mismo fallo que
   documenté en F3 (un `THREE.Points` sin `map` se dibuja como un cuadrado) y volví a
   cometerlo. Ya está la mota redonda, y el comentario del archivo lo dice con todas las
   letras por si reaparece una tercera vez.
2. **El mundo quedaba a medias.** El domo y la niebla se apagaban, pero la escenografía
   —el gas, los cuerpos, el latón— seguía en color, lo que es peor que no apagar nada.
   Ahora `scenery.setDim()` atenúa los materiales compartidos de una vez.

**Siguiente fase: F8** — El Perihelio: la estrella natal con su planeta y el observatorio
en la montaña, la espiral de 15 anillos que sube melódica y baja natural (ya la calcula
`scaleWalkFiles`), el rosetón, la gala y el resumen. Aquí entra también el guiño al
Expreso que quedó pendiente en F4. Criterios en PLAN §13-F8.

---

## 2026-08-30 — F8 El Perihelio ✅ (Claude Fable 5)

**El viaje ya tiene final.** Al llegar a las 20 decisiones el cometa deja de conducirse
solo, la espiral de anillos se enrosca hacia la estrella natal, la escala se canta anillo
a anillo y el cometa queda en órbita junto a casa.

**Hecho:**
- `3d/perihelion.ts`: la **estrella natal** (granulación que hierve + doble corona), el
  **planeta natal** de noche con sus ciudades y el **observatorio en su montaña con la
  cúpula abierta** —el lugar exacto del menú, visto desde el cielo—, el **rosetón** de 12
  medallones (los del viaje encendidos), **auroras** en el limbo del planeta, **lluvia de
  meteoros** y el **haz vertical** del observatorio saludando en la gala.
- `3d/renderer.ts`: la ceremonia con su ritardando, y el resumen.
- `main.ts`: la espiral cantada, el rosetón por tonalidad y la pantalla de bitácora final.

**Lo delicado era la sincronía, y se resolvió como el Expreso**: los 15 anillos NO se
colocan a distancia fija. Se integra el perfil de velocidad para que cada uno se cruce
exactamente a un pulso del anterior; como el cometa frena, los anillos se van JUNTANDO.
El ritardando es del vehículo, pero la escala se mantiene clavada. Y los anillos se
disparan por POSICIÓN, no por reloj, para que el latón y la nota caigan en el mismo frame
aunque el navegador dé un tirón.

**Verificado (criterios F8):**
- **La espiral canta melódica arriba y natural abajo con la ortografía de cada tonalidad**:
  C#m sube `C#4 D#4 E4 F#4 G#4 A#4 B#4 C#5` (con A#=#6 y B#=#7) y baja
  `B4 A4 G#4 F#4 E4 D#4 C#4` (con B=♭7 y A=♭6); A♭m sube `A♭4 B♭4 C♭5 D♭5 E♭5 F5 G5 A♭5`
  y baja `G♭5 F♭5 E♭5 D♭5 C♭5 B♭4 A♭4`. 15 anillos en ambas.
- **El acorde final es el sample `Minor Chords`** de la tonalidad elegida: jugando en C#m
  desde el menú sonó `Minor Chords/C#minor.mp3` — el mismo sonido del radiofaro.
- **La gala solo con 0 derivas y 0 radiofaros**: partida limpia → "🥇 Medalla de oro ·
  ¡PERIHELIO DE GALA!"; con 2 derivas → "🥈 Medalla de plata" y sin gala, 91 % de
  precisión (20 de 22).
- **Saltable solo tras 5 s**: un Esc inmediato NO corta la ceremonia; a los 5.2 s sí, y
  aterriza directo en el resumen.
- `npm run build` limpio.

**Dos fallos que cacé mirando la pantalla:**
1. **El cometa volaba hacia DENTRO del sol.** Había colocado la estrella con
   `tan * -230`, o sea 230 unidades por detrás del punto de llegada, y el planeta casi
   sobre el eje de la ruta. Corregido: la estrella va por delante y arriba, el planeta
   bien apartado a un lado (se pasa a su lado y se le ve girar), y el rosetón centrado en
   la ruta para cruzarlo por dentro como un pórtico.
2. **La consola NO se podía ocultar.** `#hud.hud-layer { display:block }` lleva un ID y
   ganaba por especificidad a `.screen.hidden`, así que las palancas seguían visibles
   debajo del resumen. Añadida `#hud.hud-layer.hidden { display:none }`. El fallo estaba
   ahí desde F5 y solo se hizo visible cuando algo se puso por encima.

**Nota de método (me pasó dos veces hoy):** conducir el juego por API desde consola es
potente, pero **la ceremonia lee `settings.scale`, que es lo que eligió el MENÚ**. En mi
primer intento pasé otra tonalidad a `game.start()` sin tocar el menú y la espiral sonó
en Am: parecía un bug de ortografía y era mi test. Para cualquier cosa que dependa de la
configuración, hay que **elegirla haciendo clic en el menú**, como un jugador. Además,
un bucle síncrono no deja resolver las promesas de audio: hay que ceder el hilo o las
notas se encolan todas al final.

**Pendiente del PLAN, no olvidado:** el **guiño al Expreso Tonal** (la hebra dorada con
una lucecita avanzando sobre el planeta natal, §5.6) sigue sin poner. Ya existe el
planeta donde plantarlo; es candidato natural para el pulido de F10.

**Siguiente fase: F9** — Planetario y persistencia: `game/persistence.ts` con `cometa-stats`,
`cometa-rutas` y `cometa-settings`, la pantalla del Planetario con las 15 placas de
constelación, medallas, estadísticas por grado con los pares enlazados, y guardado tras
CADA decisión. Criterios en PLAN §13-F9.

---

## 2026-08-30 — F9 Planetario y persistencia ✅ (Claude Fable 5)

**El juego ya recuerda.** Lo que se conquista se queda, y el Planetario lo enseña.

**Hecho:**
- `game/persistence.ts`: los tres almacenes de §7.7 (`cometa-stats`, `cometa-rutas`,
  `cometa-settings`), lógica pura y a prueba de fallos —modo privado, cuota agotada o
  JSON corrupto no rompen la partida, solo dejan de recordar—.
- `ui/planetarium.ts`: la cúpula por dentro. **15 placas**, una por constelación, con la
  figura dibujada SIEMPRE (la constelación existe aunque no la hayas viajado) y encendida
  solo si llegaste, en dorado pleno si fue de gala. Debajo, la **precisión por grado** en
  el orden canónico de los 11, con los pares mutables hermanados en su arito.
- `main.ts`: guardado tras cada decisión, registro de llegada, ajustes que se restauran
  al arrancar y el Planetario accesible desde el menú y desde el resumen.

**Verificado (criterios F9):**
- **Cerrar y reabrir conserva todo**: jugué en C#m con preset Melódica y velocidad
  Rápido; al recargar, el menú volvió con C#m, Melódica (9 activos, con sus dos aritos) y
  Rápido ya seleccionados.
- **Los récords SOLO MEJORAN**, que era la regla sutil: sobre una plata de 1285 puntos con
  racha 20 a Rápido, registré un viaje peor (bronce, 400, racha 5, Lento) y **no degradó
  nada** — solo subió el contador de llegadas. Un viaje mejor (oro, 1600, gala) sí
  ascendió medalla, puntuación, velocidad récord y gala, dejando intacta la fecha de
  primera llegada.
- **Borrar pide confirmación**: el primer clic arma el botón ("¿Seguro? Pulsa otra vez")
  y no toca nada; el segundo limpia los tres almacenes y el Planetario vuelve a quedar en
  blanco.
- **Las 15 placas muestran sus estados** y las figuras se reconocen: la W de Casiopea, la
  cruz del Cisne, Orión, la Cruz del Sur.
- **El almacén de la webapp seria queda INTACTO**: puse un centinela en
  `GradosMenoresStats` antes de jugar y sobrevivió a la partida, a la recarga y al
  borrado completo del progreso del juego. Son dos prácticas distintas con dos
  historiales distintos, y borrar una no puede llevarse la otra.
- `npm run build` limpio.

**Detalle de diseño:** la **gala no se pierde**. Una vez conseguida en una ruta, queda
marcada aunque después juegues peor: es una hazaña, no un estado actual. Lo mismo vale
para la medalla y la mejor racha; la única cifra que baja es ninguna.

**Limpieza:** desapareció el helper `toast()`. Existía solo para decir "en construcción"
en los botones que aún no hacían nada, y ya no queda ninguno.

---

## 2026-08-30 — 🐞 Sin controles para contestar (lo encontró Luis jugando)

**Síntoma:** empiezas el viaje, suena la cadencia, suena la nota… y no hay consola con la
que responder.

**Causa:** `hideAllScreens()` recorría **todos** los elementos con clase `.screen`, y
`#hud` es uno de ellos. En `startJourney` la secuencia era `hud.show()` y, dos líneas
después, `hideAllScreens()` — que se llevaba por delante la consola recién mostrada. Lo
mismo pasaba al reanudar desde la pausa.

**Por qué no salió antes:** el fallo estaba latente desde F5, pero hasta F8 la regla CSS
`#hud.hud-layer { display:block }` ganaba por especificidad a `.hidden` y la consola se
veía igual. Al arreglar esa especificidad en F8 —para que el resumen no dejara las
palancas asomando— destapé el bug de verdad. **Un arreglo correcto sacó a la luz otro
error correcto que llevaba semanas escondido.**

**Arreglo:** la consola NO es una pantalla modal. `showScreen()` y `hideAllScreens()`
operan ahora sobre `modalScreens()`, que excluye `#hud`, y la visibilidad de la consola la
gobiernan solo `hud.show()` y `hud.hide()`.

**Verificado jugando de verdad**, no por API: con pregunta viva la consola está visible y
las 9 palancas habilitadas; al pausar sigue visible con la tarjeta de pausa encima; al
reanudar sigue habilitada; y una respuesta por clic marca las dos palancas y escribe
"Deriva. Era D# (II — Supertónica)".

**Lección:** esto no lo habría encontrado yo. Conducir el juego por API salta justo el
camino donde vivía el fallo —el de arrancar por el menú y mirar la pantalla—. Es el
argumento a favor de que Luis juegue antes de publicar, ahora con un caso concreto.

---

**Siguiente fase: F10** — Pulido y QA: el checklist §14 completo, pases de rendimiento,
`npm run build` + `npm run preview` + `?lang=en` íntegro. Entra aquí el **guiño al Expreso
Tonal** que sigue pendiente desde F4 (la hebra dorada sobre el planeta natal, §5.6), y
conviene revisar de una vez el `500`/`404` de consola que no logré atribuir (ver F5) y el
criterio de fps, ambos con un navegador de verdad. Criterios en PLAN §13-F10.

---

## 2026-08-30 — F11 Publicación ✅ (Claude Fable 5)

**Autorizado por Luis** tras probarlo en local: "Creo que lo puedes publicar ya. […] es
casi personal ahora, casi nadie lo usa, y es más mi laboratorio por ahora."

Yo había recomendado esperar a F10 por el hueco de los fps; Luis reafirmó con contexto
que yo no tenía (el sitio es su laboratorio, no una plataforma con tráfico), así que
adelante. Queda dicho para que el siguiente agente no lo lea como un salto de fase.

**Hecho, siguiendo el patrón del Expreso (§15):**
- `scripts/copy-dist.mjs` con target `public/apps/grados-menores-juego`, y
  `npm run deploy` ejecutado.
- `app/[locale]/apps/grados-menores/juego/page.tsx` calcada de la del Expreso:
  `noIndex`, fondo `#0e1428`, badge de hielo, tagline "Escucha · Decide · Vuelve" /
  "Listen · Decide · Return", iframe con `allow="autoplay"` y SIN `microphone`.
- `data/apps/apps-catalog.ts`: `gameUrl`, `gameLabel` y la característica nueva al inicio.
- `i18n/routing.ts`: ruta `/apps/grados-menores/juego` con su alias inglés `/game`.
  **El `proxy.ts` NO se toca**: el Expreso tampoco está ahí, y next-intl resuelve el alias
  con solo la entrada de `routing.ts`. Comprobado en el sitio, no supuesto.

**Verificado ANTES de subir, en el sitio de verdad (localhost:3000):**
- `/es/apps/grados-menores/juego` carga con su cabecera "El Cometa · MODO JUEGO 3D" y el
  juego dentro del iframe.
- `/en/apps/grados-menores/game` carga en inglés de punta a punta: la cáscara ("← Back",
  "3D GAME MODE", "Listen · Decide · Return") y el juego dentro
  ("THE COMET", "Constellation (key)", "Degrees to train", presets Harmonic/Melodic).
- La ficha `/es/apps/grados-menores` muestra el botón "🚀 Modo juego 3D" y la
  característica nueva.
- `tsc --noEmit` del sitio limpio.

**Fuera del commit a propósito:** `AGENTS.md`, que es de Luis y de agosto, no tiene que
ver con el juego y nunca ha estado versionado.

**Lo que sigue pendiente y no se debe olvidar por estar ya publicado:**
1. El **checklist §14** completo (F10): timbre Aleatorio en partida real, teclado
   completo, que la pausa congele con pregunta viva, layout en ventana angosta.
2. El **guiño al Expreso Tonal** sobre el planeta natal (§5.6), pendiente desde F4.
3. Los **fps** en un navegador real: sigue sin medirse.
4. El `500`/`404` de consola que no logré atribuir (ver F5) — conviene mirarlo ya en
   producción, donde el entorno es el de verdad.
