# BITÁCORA DE DESARROLLO — El Cometa

Registro por fases (PLAN §0.2). El agente que continúe empieza leyendo esto.

> ⚠️ **Recordatorio permanente (PLAN §0.4):** nada se sube hasta que Luis pruebe el
> juego en local. Sin `git push`, sin `npm run deploy`, sin páginas del sitio.

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
