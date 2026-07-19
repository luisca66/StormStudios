# BITÁCORA DE DESARROLLO — Aerostato

Registro por fases (PLAN §0.2). El agente que continúe empieza leyendo esto y el
`PLAN-CONSTRUCCION-AEROSTATO.md`. Tras cada fase: `npm run build` limpio + entrada aquí.

---

## F0 — Scaffold · 2026-07-17 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `package.json` (`aerostato-juego`, única dependencia runtime `three ^0.160`, scripts
  `dev`/`build`/`preview`/`deploy` — patrón Batisfera). Puerto dev **5174** (Batisfera usa
  5173; así pueden correr en paralelo).
- `tsconfig.json` strict idéntico al de Batisfera (alias `@/* → src/*`).
- `vite.config.ts` con `base: "./"` (obligatorio, §16).
- `index.html`: todas las secciones de pantalla del flujo §10 (menú completo, mic-denegado,
  hud vacío, transición de capa, resumen, atlas, pausa, toast). Fuentes Google
  **Marcellus + Rajdhani** (§4).
- `src/style.css`: tema latón/madera/crema (§4), cards, chips, botones, toast; el canvas
  lleva un gradiente CSS de amanecer como placeholder hasta F3.
- `src/i18n.ts`: diccionario es/en completo del menú + capas + pantallas placeholder;
  `initI18n()` lee `?lang=`, helper `t()` y `applyI18n()` para `data-i18n`.
- `src/config.ts`: arranque del archivo central de [tunable]s — modos, timbres, registros
  (MIDI §3.4), capas §5 (Y + metros narrativos), `STORAGE_KEYS` con prefijo `aerostato-`,
  paleta.
- `src/main.ts`: bootstrap del menú — chips de modo/registro/timbre/referencia/capa
  inicial (capas > desbloqueada aparecen "Bloqueada" y deshabilitadas), toggle "Mostrar
  nombres", volumen; settings persistidos en `aerostato-settings` con el shape exacto de
  §7.7; INICIAR ASCENSO muestra toast "el ascenso llega en la siguiente fase".
- `.claude/launch.json` para levantar el dev server desde el harness.

**Criterios de aceptación verificados:**
- `npm run build` limpio (tsc --noEmit + vite build, 0 errores). ✓
- `npm run dev` levanta en 127.0.0.1:5174. ✓
- Título **AEROSTATO** + tagline "Asciende. Canta. Ilumina." visibles en es. ✓
- Con `?lang=en`: **AEROSTAT** + "Ascend. Sing. Illuminate." y TODO el menú traducido. ✓
- Sin errores en consola del navegador. ✓

**Decisiones tomadas:**
- Puerto 5174 (no 5173) para no chocar con Batisfera en desarrollo paralelo.
- El grupo "Capa inicial" solo se muestra en modo Expedición (§7.4: los otros modos
  siempre inician en el valle).
- `config.ts` se creó ya en F0 (no estaba en la lista mínima de la fase) porque el menú
  necesita registros/capas/timbres; es el archivo destino de todos los [tunable] (§0.7).
- Título de pestaña fijo "Aerostato — Storm Studios" (no localizado — mismo patrón que
  Batisfera).

**Pendientes / notas para el siguiente agente:**
- El botón Atlas abre un placeholder (texto "llegará en fases siguientes"); el real es F9.
- El gradiente CSS del canvas es placeholder: F3 lo sustituye por el domo three.js.
- NADA se ha tocado en el repo del sitio (`storm-studios/StormStudios`) — solo se leyó
  Batisfera como referencia. La migración es F11 y requiere OK explícito de Luis.

---

## F1 — Música y samples · 2026-07-17 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `src/music/chords.ts`: tabla de los 33 tipos copiada tal cual del plan de Batisfera
  §3.1 (`ChordType`, `FAMILY_NAMES`, `CHORD_BY_ID`, `chordsOfFamily`, `chordName`) +
  **`intervalToDegreeLabel(semitonos, lang)`** por tabla de semitono real (§3.1 ⚠️:
  los 11ª sin 3ª etiquetan bien: DOMINANT_11 → Fund., 5ª, 7ª, 9ª, 11ª — verificado).
- `src/music/theory.ts`: port TS de `music-theory.js` (noteToMidi, midiToNote,
  chordNotes, hasSamplesFor, rango C2–C7) + **`midiToFrequency`** (440·2^((m−69)/12)) +
  **`validRoots(type, register)`** (§3.4: r ∈ [lo, hi − maxInterval] ∩ samples).
- `src/audio/samples.ts`: port de Batisfera (`SamplePlayer`: cache Map, clonado de nodos,
  preload timeout 3.5 s, unlock por gesto, `%23` en sostenidos, SFX acierto/error,
  `startLoop`) + **`playNote(note, instrument)`** nuevo (referencia + confirmación de
  linterna; se solapa sin cortar lo que suena). `resolveInstrument` para "Aleatorio".
- `src/config.ts`: `AUDIO_BASE`, `INSTRUMENTS` (5 carpetas exactas del CDN) separado de
  `INSTRUMENT_CHOICES` (+Aleatorio, para el menú).
- QA temporal en `main.ts`: `window.aerostato` (teoría + player en consola del navegador)
  y panel de botones con `?qa=1` (F#3 Piano/Coro, acorde C4 Dom7 Piano, F2 Dom13 Coro).
  **Retirar en F6** cuando el loop real lo sustituya.

**Criterios de aceptación verificados (navegador, 127.0.0.1:5174/?qa=1):**
- `chordNotes("F2", DOMINANT_13)` → `["F2","A2","C3","D#3","D4"]` (41,45,48,51,62). ✓
- `validRoots(MAJOR_13, "male")` → `[41..46]` ⊆ [41, 46]. ✓
- Los 33 tipos tienen fundamentales válidas en AMBOS registros (check programático). ✓
- Los 4 botones QA reproducen sin errores de consola; los mp3 cargan con duración real
  (F#3 Piano 3.96 s, F#3 Coro 4.97 s) — **el `%23` va bien** en Piano y Coro. ✓
- `npm run build` limpio (tsc --noEmit + vite). ✓

**Decisiones tomadas:**
- `intervalToDegreeLabel`: 9 semitonos se etiqueta **"6ª"** siempre. En DIMINISHED_7 ese
  intervalo es formalmente una 7ª disminuida (enarmónico de 6ª). Se aceptó la etiqueta
  única por simplicidad de la tabla semitono→grado que pide el plan. **Preguntar a Luis**
  si prefiere "7ª" para DIMINISHED_7 (sería una excepción por tipo, trivial de añadir).
- Del samples.ts de Batisfera NO se copió la maquinaria de playlists musicales (fades,
  pistas aleatorias): llegará con la música ambiental de Luis (stub `startAmbient`, §9).
  `startLoop` sí se conservó (viento ambiental de F5+).
- El monitor de red del harness no registra cargas de `<audio>`; la verificación de CDN
  se hizo midiendo `loadeddata` + `duration` desde la página.

---

## F2 — Afinador · 2026-07-17 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `public/pitch-processor.js`: copiado VERBATIM de Intervalos Cantados juego (worklet YIN,
  frame cada ~21 ms, silencio = frequency −1). Se carga con `?v=2` (bust de cache §16).
- `src/audio/mic.ts`: port del tracker probado. La máquina de hold/gracia/mediana vive en
  una clase base `PitchTracker` que comparten `MicPitchDetector` (real) y
  `FakePitchDetector` (QA) — así el fake ejercita EXACTAMENTE la lógica de producción.
  Contrato §3.6 intacto (±50 ¢, hold 1.5 s, gracia 0.25 s, mediana 5, MIN_VOICED 3,
  watchdog 150 ms, 65–1200 Hz). `PitchDetectorLike` es la interfaz que consume el juego.
- `FakePitchDetector` (`?fakemic=1`): frames sintéticos deterministas con reloj propio
  (dt fijo 21.3 ms). Teclas: ↑/↓ ±10 ¢, PageUp/Dn ±1 st, **M sostenida = silencio**
  (añadida para poder probar gracia/reset). `pumpFrames(n)` inyecta frames síncronos
  (QA sin depender de timers). `setCentsOffset`/`setMuted` programáticos.
- `src/ui/tuner.ts` (`TunerView`): canvas §12 — escala −50…+50 con marcas cada 10, zona
  verde ±15 (`TUNER_GREEN_ZONE_CENTS` [tunable]), aguja con lerp 0.2, sin voz cae al
  centro + "Escuchando…", tinte de color de familia al estar on-pitch, **anillo de hold**
  como borde que se llena desde las 12, flechas ▲/▼ si |cents| > 200, lectura inferior
  nota+Hz SOLO con "Mostrar nombres" ON (OFF: solo desviación). DPR-aware.
- `src/config.ts`: `FAMILY_GLOW` (paleta de familias de Batisfera §5.3), tunables del
  afinador. `main.ts`: **AudioContext único compartido** creado tras gesto (§16),
  `getPitchDetector()` real/falso según `?fakemic=1`, arnés QA (botón "Afinador A3" en el
  panel `?qa=1`, target fijo A3 = 220 Hz, línea de telemetría) y ruta de errores:
  `MicDeniedError` → pantalla amable; `MicUnsupportedError` → aviso.

**Criterios de aceptación verificados (con `?fakemic=1` + `pumpFrames`, deterministas):**
- Afinado exacto sostiene: 71 frames (~1.51 s) → hold 0.98→1.0 (los primeros ~64 ms son
  el arranque MIN_VOICED_FRAMES, igual que el original). ✓
- Gracia: corte de 0.13 s pausa el hold (0.54 → 0.54) y al volver continúa (0.582) SIN
  resetear; corte de 0.32 s SÍ resetea a 0. ✓
- Teclas deterministas: 3×↑ = +30 ¢ (aguja on-pitch, f=223.8 Hz); PageDown+2×↓ = −90 ¢
  neto (off-pitch). ✓
- Permiso denegado → pantalla amable con instrucciones (verificado: el panel del harness
  bloquea el mic → `NotAllowedError` → `mic-denied-screen`). ✓
- `npm run build` limpio. ✓

**Decisiones tomadas:**
- El plan pedía "OscillatorNode interno" para el fake; se implementó con **frames
  sintéticos sobre el tracker real** (sin grafo de audio): mismo contrato, 100 %
  determinista y sin depender del worklet. Anotado por si Luis prefiere oír el tono falso.
- Tecla M (silencio) y `pumpFrames(n)` añadidos al fake más allá del plan: necesarios
  para QA determinista de gracia/reset y en entornos con timers estrangulados.
- La nota detectada bajo el afinador se deriva de `targetMidi + round(cents/100)` (no hay
  un "nearest note" global: el afinador siempre mide contra el target de la linterna).

**Pendiente de QA manual con mic REAL (no disponible en este entorno):** cantar A3 llena
el anillo en 1.5 s; toser no resetea; suspender el mic no congela "on pitch" (watchdog).
Luis puede probarlo en `http://127.0.0.1:5174/?qa=1` → botón "Afinador A3".

**Pendientes / notas para el siguiente agente:**
- El arnés del afinador y el panel `?qa=1` se retiran cuando el afinador se integre en la
  consola (F5) y el loop de canto quede montado (F6).

---

## F3 — Mundo y navegación · 2026-07-18 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `src/config.ts`: `WORLD` (topY 750, radio 90, seed 20260717), `SKY_KEYFRAMES` §5.1
  (zenith/horizon/fog/ambient/sun/sunColor por Y), `PHYSICS` §8 (maxSpeed 6/4 u·s⁻¹,
  accelLerp 1.8 s⁻¹ ≡ α 0.03/frame\@60fps, viento 0.4, pitch ±85°, roll ±1°),
  `altitudeMeters(y)` (lineal POR CAPA) y `layerAtY`.
- `src/3d/environment.ts`: domo `SphereGeometry(800, BackSide)` con ShaderMaterial de
  gradiente 2 paradas + banda de atmósfera (curvatura, aparece Y≥450), `material.fog=false`
  y `#include <colorspace_fragment>` (sin él three r160 saca el gradiente en lineal —
  oscurecido; ojo con futuros ShaderMaterial). Fog `FogExp2` = color del horizonte
  (misma variable §16). Sin `scene.background` (el domo lo es). Sol `DirectionalLight` +
  sprite glow aditivo; elevación sube con la altitud (rasante→alto). ~1200 estrellas
  (opacidad 0→1 entre Y 450–750). God rays SOLO capa 1 (mueren en Y≈140). 800 partículas
  de viento recicladas en cubo de 120 u (patrón nieve marina). 4 esclusas (discos
  aditivos con textura de turbulencia canvas, Y=150/300/450/600) con `setLockOpen` —
  en F3 visibles y NO bloqueantes. `makeRng` LCG copiado de Batisfera. Vectores de viento
  por capa (dirección fija sembrada, 0.4 u/s).
- `src/3d/player.ts`: rig yaw→pitch→cámara, mirar con drag (yaw libre, pitch ±85°),
  WASD avanzar/strafe según la vista, Q/Space sube, E/Shift baja, inercia exponencial
  lenta EN AMBOS SENTIDOS (un globo tampoco frena en seco — divergencia deliberada del
  freno instantáneo de Batisfera), deriva de viento sumada a la posición, click corto
  (<5 px, <250 ms) → onTap, flag `docked` (§7.1: amarrado ignora movimiento y frena
  suave ×2), `addImpulse` (empujón de cuerda completada), clamps techo/suelo + cilindro
  con empuje suave. Cursor siempre visible, sin pointer lock.
- `src/3d/renderer.ts`: `Game3D` — escena, cámara (far 1600 ≥ domo), loop, resize,
  `startAscent(capa)`/`stopAscent`, callbacks `onAltitude`/`onFrame`, `fps`/`drawCalls`
  de diagnóstico y `stepFrame()` (QA: fuerza un frame síncrono donde rAF está congelado).
- `main.ts`: el mundo 3D arranca como fondo vivo del menú; botón QA "Vuelo libre (F3)"
  (Esc vuelve al menú); `altitudeMeters` expuesto en `window.aerostato`.

**Criterios de aceptación verificados (programático + lectura de píxeles WebGL):**
- Keyframes §5.1: y=0/375/750 interpolan exacto (#7fb2e8/#ffd9a0 → #3369c3/#93bce4 →
  #04061c/#131c3c; fog 0.010→0.005→0.001). ✓
- Píxeles renderizados reales (`gl.readPixels` tras `stepFrame`): horizonte del valle
  dorado [252,218,167], cénit del valle [142,191,243]≈#7fb2e8, cénit Y300
  [74,138,228]≈#3f7dd6, cénit Y745 [4,7,32]≈#04061c. El domo AMANECE abajo y se
  OSCURECE arriba. ✓
- Estrellas: opacidad 0 (Y≤450) → 0.5 (Y600) → 1.0 (Y750). God rays visibles en Y=100,
  apagados en Y=200. ✓
- Física: rampa de velocidad 5.04→5.84→5.98 u/s en 3 s (inercia pesada α=1.8/s);
  tras soltar W conserva 0.96 u/s al 1 s (masa); deriva 4.0 u en 10 s = 0.4 u/s exacto;
  clamp techo 748; el cilindro re-empuja de r=300 a r=89.3. ✓
- Controles: drag → yaw −0.96 rad, pitch clampa en −85.0°; click corto dispara onTap. ✓
- Altímetro narrativo: 0/75/150/300/450/600/675/750 → 0/250/500/3 000/8 000/20 000/
  30 500/41 000 m (lineal por capa). ✓
- Draw calls: 3 en vuelo (presupuesto <200 sobra de momento). `npm run build` limpio. ✓

**Decisiones tomadas:**
- Frenado también inercial (no instantáneo como Batisfera): es la sensación de masa de
  globo que pide el plan; amarrado frena al doble de ritmo (auto-hover suave).
- `stepFrame()` público para QA: el panel del harness congela rAF; con él se pudo
  verificar el render leyendo píxeles. Inofensivo en producción.

**Pendiente de QA manual (no medible aquí):** 60 fps reales y la SENSACIÓN de inercia/
deriva — Luis: `?qa=1` → "Vuelo libre (F3)", WASD+drag, Q/Space sube, Esc sale.

---

## F4 — Escenografía · 2026-07-18 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo (`src/3d/scenery.ts`, 100 % procedural, RNG sembrado):**
- **Terreno del valle** (capas 1–2): `PlaneGeometry` 900×900 con 140² segmentos,
  desplazado con ruido seno multi-octava, valle en el centro y colinas hacia el borde;
  vertex colors por parcelas (pasto/campos dorados/bosque/roca en laderas) y **río
  serpenteante** (cauce hundido, franja clara casi emisiva). 1 draw call.
- **Mar de nubes** (suelo de capa 2, Y=140): plano 900×900 con ShaderMaterial de value
  noise 2 octavas scrolleando y borde radial suave. 1 dc.
- **Cúmulos** (capas 1–4): 300 billboards repartidos en **3 `InstancedMesh`** (uno por
  textura de canvas compartida) con billboard en el VERTEX SHADER — con `THREE.Sprite`
  serían ~300 dc; así son 3. Racimos de 5–12, tamaño 10–40 u, deriva con el viento de su
  capa y wrap horizontal (±340 u). `frustumCulled=false` (el quad se arma en vista).
- **Lenticulares** (capa 3): 3 pilas de esferas aplastadas translúcidas.
- **Aves**: `BirdFlock` — cuerpo cono + 2 alas triángulo como 3 `InstancedMesh` (3 dc por
  bandada), aleteo por fase en CPU componiendo matrices ala←cuerpo. 40
  golondrinas/gansos en 2 escuadrones en V orbitando (capas 1–2, aleteo 5 Hz) y 6
  halcones en círculos lentos (capa 3, 0.7 Hz). Verificado: las matrices cambian entre
  frames.
- **Auroras** (capa 4): 4 cintas `PlaneGeometry(240,34,72,1)` con ondas seno en vertex
  shader + gradiente verde→magenta y cortinas animadas, aditivo. Alpha 0.55 [tunable].
- **Globos lejanos**: sonda ×2 (esfera+cable+canastilla), dirigible (elipsoide+góndola+
  aletas), cometa caja — a r 200–440, deriva lenta, reaparecen al alejarse.

**Criterios de aceptación verificados (píxeles reales + introspección):**
- Identidad por capa: valle verde/dorado mirando abajo ([61,76,48]/[133,113,63]);
  mar de nubes blanco desde arriba ([219,234,246]); auroras confirmadas por diff
  visible/oculto (144 píxeles cambian, cielo [96,134,184] → [239,255,255]). ✓
- Draw calls: máx 32 en barrido de 6 altitudes (presupuesto <200). ✓
- `npm run build` limpio. ✓

**Decisiones / lecciones:**
- ⚠️ **Detectores de color con blending aditivo**: sobre cielo claro el aditivo satura
  canales (azul→255) y un test "verde dominante" da falso negativo. El método correcto
  es DIFF con el objeto visible/oculto. (Perdí una iteración por esto; el alpha de la
  aurora subió a 0.85 por error de diagnóstico y quedó ajustado a 0.55 [tunable].)
- Cúmulos como InstancedMesh + billboard en shader (no Sprite): única forma de cumplir
  el presupuesto de draw calls con 300 nubes.
- Los campos `private` de TS son accesibles en runtime desde la consola — útil para QA
  (`game.scene.traverse`, `renderer.info.programs`).

**Pendiente de QA manual:** fps reales y estética general (colores/composición) — el
panel congela rAF y no ejecuta el loop continuo.

---

## F5 — Canastilla y consola · 2026-07-18 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `src/3d/basket.ts`: hijos de la cámara — borde de canastilla (toro + pared con textura
  de mimbre canvas, visible al mirar abajo), 4 cuerdas hacia arriba, boca del globo
  (disco con gradiente cálido + gajos, al mirar arriba) y **quemador**: cono de latón +
  llama sprite aditivo que RUGE — `update(dt, elapsed, intensity)` escala/abrillanta con
  flicker; `burst()` para el rugido de cuerda completada (F6).
- `src/audio/synth-sfx.ts` (`SynthSfx`, WebAudio puro, un solo AudioContext §16): rugido
  del quemador (noise loop por lowpass + sub 52 Hz), viento (noise por bandpass, gana con
  altitud+velocidad), `burnerBurst()`, `click()` (amarre F6), `tear()` (rasgadura F8),
  y **stub documentado `startAmbient(layer)`** para la música de Luis (§9).
- `src/ui/compass.ts` (`CompassView`): franja de brújula DPR-aware — marcas cada 15°,
  cardinales N/E/S/O, aguja central, blips con pulso (color de familia; el activo
  destacado). Convención: heading = −yaw (0 = norte = −z).
- `src/ui/hud.ts` (`HUD`): consola de latón — altímetro (metros narrativos + capa),
  catalejo, afinador integrado (TunerView en `#console-tuner`), fila de cuerda actual
  (nombre + medallones-linterna off/active/lit/ghost + botón 🔊 Referencia con callback),
  temporizador de viento (cuerda que se deshilacha, roja al 25 %), score + racha (con
  animación bump), medidor de modo (para F8). API lista para F6.
- `index.html`/`style.css`: sección `#hud` completa + **viñeta cálida** (radial madera) +
  estilos de consola/medallones/temporizador. i18n: hud.score/streak/reference.
- Cableado: `Basket` en `Game3D.frame` (intensidad = velocidad vertical / máx);
  `main.ts` monta HUD, blips falsos, synth en vuelo libre (gesto = botón QA), altímetro
  real vía `onAltitude`, afinador en reposo vía `onFrame`.

**Criterios de aceptación verificados:**
- Consola completa con datos reales: y=225 → "1,750 m · Mar de Nubes"; y=700 →
  "34,000 m · Borde del Espacio" (mapeo §5 exacto). ✓
- Canastilla montada en cámara; velocidad vertical con Q llega a 3.74 u/s → intensidad
  del quemador 0.94 (llama + gain del synth ligados a ella). ✓
- Medallones (lit/active/off), nombre de acorde, temporizador 60 %, score 42, racha ×3
  con animación — todo pinta. Botón Referencia visible solo con cuerda. ✓
- Sin errores de consola; `npm run build` limpio. ✓

**Pendiente de QA manual:** OÍR el rugido del quemador y el viento (audio no verificable
aquí); estética de viñeta/consola. Luis: `?qa=1` → "Vuelo libre (F3)" y mantener Q/Space.

---

## F6 — Cuerdas de linternas y loop de canto · 2026-07-18 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `src/game/questions.ts` (`QuestionMachine`): pool activo con pesos (recién introducidos
  ×2), anti-repetición del tipo anterior, fundamental uniforme en `validRoots` (§3.4).
- `src/game/state.ts` (`GameState`): máquina §7.1 pura con eventos
  (docked/lantern/completed/expired/released/score/timer). Temporizador de viento
  `T = 12 + 10n` s (§7.2, en `GAMEPLAY` [tunable]); puntuación exacta §7.4
  (+2/linterna; al completar racha+=1 y +10+racha×2). Pausa congela el timer.
- `src/3d/lanterns/string.ts` (`LanternString`): globo piloto + cuerda (Line) + N
  linternas apiladas a **0.55 u/semitono** (las terceras SE VEN); estados
  off/active/lit/ghost vía emissive + halo sprite (cero PointLight); etiqueta de grado
  (sprite canvas) que **revela el nombre de la nota al encenderse** (§2.12); balanceo de
  la activa; esfera de colisión invisible 1.5× (`material.visible=false` — el raycast
  la ve, el render no); animaciones ascend (sube y se desvanece) / lose (se la lleva el
  viento ~1.5 s); `showNames` muestra nombres desde el inicio.
- `src/3d/lanterns/manager.ts` (`LanternManager`): mantiene 4 cuerdas vivas, spawn a
  25–70 u con separación ≥20 y banda Y de capa, deriva con el viento, reciclado a >90 u,
  blips reales del catalejo (acimut mundo, activo destacado). `onNeedQuestion` lo provee
  main (regla §11).
- `renderer.ts`: raycast de click contra esferas de colisión (far 140), hover con
  throttle 10/s → cursor pointer, `onStringTapped`.
- `main.ts` — el cableado del loop §7.1 completo: INICIAR ASCENSO = gesto (unlock audio,
  `ensureReady` mic con pantallas de error), amarre por click y proximidad+E (≤12 u),
  anuncio "Sol# · Mayor" (solfeo es / letras en — `pitchClassName` nuevo en theory.ts),
  nota de referencia según refMode, canto nota a nota (holdProgress → brillo de linterna
  → `lanternLit`), R/botón 🔊 re-escucha ilimitada, S sostenida 0.5 s suelta (cuerda
  queda intacta), completada (acierto.mp3 + acorde armónico + rugido + empujón +6 u),
  expirada (error.mp3 + **arpegio fantasma** nota a nota + acorde "así sonaba" +
  cuerda al viento), cambio de cuerda sin penalización, Esc pausa (congela timer y mic
  §16) con reanudar/abandonar. Retirados el arnés del afinador y el panel QA de F1/F2
  (queda "Vuelo libre (QA)" con `?qa=1`).

**Criterios de aceptación verificados (con `?fakemic=1` + `pumpFrames`, end-to-end):**
- Tríada completa (Sol# Mayor, Piano): 3 linternas encienden una a una, score
  **2 → 4 → 18** (= 2×3 + 10 + racha1×2, fórmula exacta), racha ×1, acorde completo
  suena, cuerda asciende, jugador des-amarrado, empujón aplicado. ✓
- Expirar: racha ×0 (score se conserva), consola limpia, cuerda pasa a "losing" tras el
  arpegio fantasma. ✓
- Soltar con S sostenida: racha ×0 y la cuerda queda INTACTA. ✓
- Amarre por E a ≤12 u funciona; amarrar otra cuerda suelta la anterior. ✓
- Catalejo con blips reales (3 cuerdas, la amarrada destacada). ✓
- Pausa: temporizador congelado entre frames, hold del mic congelado
  (`stopListening`); reanudar retoma el canto (score siguió: 2→4). ✓
- 4 cuerdas se mantienen; spawn en banda de capa. Sin errores de consola; build limpio. ✓

**Decisiones tomadas:**
- Anuncio de consola con SOLFEO en es ("Sol# · Mayor") y letras en en — el plan lo
  ejemplifica así ("Sol · 7ª menor"); las etiquetas/afinador siguen usando letra+octava.
- `window.aerostato.state` expuesto para QA (imprescindible para forzar timer/gas en
  F7–F8).
- El pool de F6 es el completo de la capa; los grupos incrementales llegan en F7.

**Pendiente de QA manual con mic real:** cantar de verdad una cuerda entera; oír
referencia/notas/acorde; sensación del temporizador.

---

## F7 — Expedición completa · 2026-07-18 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `src/config.ts`: `MODES` §7.4 (cuotas 6/3/4; gas y tela para F8) y `LAYER_BONUS` 50.
- `src/game/progression.ts`: tabla de grupos de Batisfera §6.3 copiada tal cual +
  `activePool(capa, completadas, cuota)` — grupo 2 a mitad de cuota, grupo 3 a 3/4;
  `fresh` = último grupo (pesa doble vía QuestionMachine).
- `src/game/state.ts`: `startRun(mode, layer)`, `enterLayer`, cuota por capa con evento
  `quota`, `layerCleared` (suma bonus +50 y abre esclusa), `bestStreak`, `totalCompleted`.
- `main.ts`: `applyLockState()` (esclusa b abierta ⇔ capa b superada o bajo la capa
  inicial; cerrada = `player.altitudeLimit = yTop−1` + disco visible), cruce de capa por
  Y (transición overlay 2.5 s con nombre/metros/familias + animación CSS), **repaso capa
  5** (tras media cuota, 1 de cada 3 spawns toma el pool completo de capas 1–4 y el
  anuncio añade la familia), desbloqueo persistente en `aerostato-progress` (solo
  Expedición), **techo del mundo** (Y≥747 → resumen), pantalla de RESUMEN (puntuación,
  cuerdas, mejor racha, altitud máx, precisión media en ¢ — muestras recogidas al validar
  cada linterna) con Reintentar/Menú. Cuota visible en la consola ("Cuota de capa 3/6").

**Criterios de aceptación verificados (fakemic, partida real programática):**
- Esclusa bloqueante: límite 149 al iniciar; tras 6 cuerdas → "Cuota 6/6", límite null,
  toast de esclusa. Score tras 6 tríadas = **188** (Σ(6+10+2i) + 50 bonus — exacto). ✓
- Cruce a capa 2: transición visible "Mar de Nubes · Séptimas", capa actual 2, cuota
  0/6, nuevo límite 299, `unlockedLayer=2` guardado. ✓
- Pools incrementales medidos por muestreo de spawns: a 0 completadas solo
  MAJOR/MINOR; a 3 (mitad) entran AUGMENTED/DIMINISHED. ✓
- Repaso capa 5: con media cuota, spawns incluyen tipos de capas anteriores (MINOR_7
  visto entre los de EXT_11_13). ✓
- Techo: Y=748 → resumen "¡Techo del mundo alcanzado: 41 000 m!" con stats correctas. ✓
- Build limpio; sin errores de consola. ✓

**Notas:**
- La cuota reducida para QA se logra con `window.aerostato.state.completedInLayer = n`
  (no hizo falta flag temporal).
- Bajar a una capa ya superada mantiene su esclusa abierta (clearedLayers).

---

## F8 — Contrarreloj y Supervivencia · 2026-07-18 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `state.ts`: gas (Contrarreloj: 120 s inicial, corre siempre en `update` salvo pausa,
  **+6 s por linterna y +15 s por cuerda completa**, evento `gas`, `gameOver("gas")`) y
  tela (Supervivencia: 3 de integridad, −1 por cuerda EXPIRADA — soltar con S no rasga —,
  evento `fabric`, `gameOver("fabric")`). En Contrarreloj el temporizador de viento NO
  existe (§7.2): `dock` no lo emite y `update` no lo corre.
- `main.ts`: medidor de modo combinado ("Cuota de capa 0/3 · Gas 120 s" / "· Tela 🩹🩹🩹"),
  jirones CSS acumulables en esquinas (clip-path + flutter) + `synth.tear()` por
  rasgadura, `gameOver` → resumen con razón correcta. i18n es/en completo.

**Criterios de aceptación verificados (fakemic):**
- Contrarreloj: gas inicial 120; +6.0 exacto por linterna; +27 por completar el resto de
  una tríada (2×6+15 — exacto); temporizador de viento oculto; **gas congelado en
  pausa**; gas→0 ⇒ resumen "Gas agotado — descenso". ✓
- Supervivencia: tela 3; expirar ⇒ 2 + 1 jirón visual; **soltar con S NO rasga**
  (tela y jirones intactos); 3 rasgaduras ⇒ resumen "Tela rasgada — descenso de
  emergencia". ✓
- Los tres modos terminables con resumen correcto (Expedición→techo verificado en F7). ✓
- Build limpio. ✓

---

## F9 — Atlas y persistencia · 2026-07-18 · COMPLETADA ✓

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- `src/game/persistence.ts`: `Progress` (unlockedLayer + best por modo), `Atlas`
  (`attempts, completed, bestStreak, bestAvgCents, firstCompletedISO` §7.7),
  `recordAttempt` (cuerda expirada), `recordCompleted` (media de |cents| de la pasada —
  **`bestAvgCents` SOLO mejora**), `saveUnlockedLayer`, `saveBestScore`. Escritura
  inmediata tras cada cuerda.
- `src/config.ts`: `MEDAL_THRESHOLDS` (🥇 ≤15 ¢ · 🥈 ≤30 · 🥉 [tunable]), `medalFor`,
  `MEDAL_BONUS` (+10/+5 §7.4). `state.addScore(n)` para el bonus.
- `src/ui/atlas.ts` (`renderAtlas`): 33 cartas agrupadas por capa con **constelación
  dibujada en canvas** (linternas en sus intervalos reales, escala común 21 st): No
  avistada (silueta "???"), Intentada (tenue azul-gris), Completada (color de familia +
  halo) + datos (intentos, completadas, racha, medalla+¢, fecha) + contador n/33.
- `main.ts`: cents POR CUERDA (`stringCents`), medalla y bonus al completar,
  `recordCompleted`/`recordAttempt` en los eventos, mejor score por modo al terminar,
  fila "Medallas nuevas" en el resumen, chips de capa se **rehacen al volver al menú**
  (desbloqueos visibles sin recargar), Atlas real desde el botón del menú.

**Criterios de aceptación verificados (fakemic):**
- Guardado tras CADA cuerda: el Atlas está en localStorage a media partida (sin cerrar):
  completada → `{attempts:1, completed:1, bestStreak:1, bestAvgCents:0, fecha}`;
  expirada → `{attempts:1, completed:0}`. ✓
- Score con medalla: tríada perfecta = 18 + 10 (oro) = **28**. ✓
- `bestAvgCents` solo mejora: recompletar el mismo tipo a +35 ¢ deja bestAvgCents=0
  (attempts 2, completed 2). ✓
- Cerrar y reabrir conserva TODO: 1/33 catalogadas, carta "done", 5 capas desbloqueadas
  en el menú. ✓  Los 3 estados + medallas se ven (33 cartas, 5 grupos). ✓
- `expeditionBest` guardado en el resumen. Build limpio. ✓

---

## F10 — Ballena Celeste, pulido y QA · 2026-07-18 · COMPLETADA ✓ (QA manual pendiente)

**Agente:** Claude (Fable 5)

**Qué se hizo:**
- **Ballena Celeste** (`scenery.ts`): elipsoides encadenados + aletas/cola planas +
  6 placas emisivas verdes; órbita amplia (r=48, Y≈675–684) a 0.014 rad/s con nado
  suave; `activateWhale` (vía `Game3D.activateWhale()`), `whaleBack()` y
  `whaleVelocity`. Aparece **1 vez por SESIÓN** al llegar a capa 5.
- Su cuerda: 13ª aleatoria (MAJOR/MINOR/DOMINANT_13), `multiplier=2` y `persistent`
  (no se recicla por distancia; `manager.addPersistent`). Viaja en el lomo cada frame;
  **amarrado a ella el globo la acompaña** (deriva con `whaleVelocity`).
- `state.dock(..., multiplier)`: linternas y completación ×2 (medalla sin multiplicar).
- El balanceo de cámara (±1°) y el flicker del quemador ya existían de F3/F5.

**Verificado (fakemic):** ballena activa en capa 5 con cuerda DOMINANT_13 ×2 de 5 notas
que sigue el lomo; amarrado, el globo se mueve con ella; ganancia al completar = **54**
(5×2×2 + (10+2)×2 + oro 10 — exacto); asciende al completarse y NO reaparece. ✓

**Checklist §14 — estado:**
- ✓ verificados en QA programático: samples sin 404 (F2/F#2/A5 × 5 timbres, 15/15;
  `%23` ok), Aleatorio varía (los 5 timbres en 30 sorteos), registros válidos (33 tipos
  × 2 registros, F1), gracia 0.25 s y watchdog 150 ms (F2), esclusa bloquea/abre (F7),
  repaso capa 5 (F7), gas +6/+15 y fin (F8), 3 rasgaduras → emergencia (F8), soltar no
  rasga (F8), ballena ×2 + Atlas (F9/F10), `?lang=en` TODO traducido (menú, consola,
  capas, cuota, pausa, atlas, nombres de acordes "G · Minor", grados "Root/3rd/5th"),
  guardado por cuerda (F9), pausa congela timer/gas/mic (F6/F8), sin errores de consola,
  build + `vite preview` de producción sirven index y worklet.
- ⏳ REQUIEREN QA MANUAL de Luis (imposibles en este entorno — rAF/mic/audio):
  cantar con mic real; oír samples/SFX/quemador; flechas ▲/▼ a una octava; toggle
  "Mostrar nombres" visual; fps ≥50 y estética general; layout en ventana angosta;
  modo referencia "Cualquier nota" (lógica trivial, sin verificación estadística).

---

## F11 — Migración al website · 2026-07-18 · COMPLETADA ✓ (con OK explícito de Luis)

**Agente:** Claude (Fable 5) — Luis autorizó F11 en el chat ("Adelante!").

**Qué se hizo (repo del sitio `storm-studios/StormStudios`):**
- Proyecto copiado a `apps-src/acordes-cantar-juego/` (sin node_modules/dist; incluye
  PLAN y esta bitácora). La carpeta `claude_code/aerostat/` queda como copia de trabajo.
- `scripts/copy-dist.mjs` calcado de Walking AP Multi pero con la raíz REAL del repo
  como default (resuelta relativa al script — la trampa §15.1 esquivada); respeta
  `STORM_WEBSITE_ROOT`.
- `npm install && npm run deploy` → `public/apps/acordes-cantar-juego/` (index +
  assets + pitch-processor.js).
- `app/[locale]/apps/acordes-cantar/juego/page.tsx` calcada de la de Walking AP Multi
  con los valores exactos de §15.3 (título, `background #0a1428`, badge ámbar, tagline)
  y el **iframe con `allow="autoplay; microphone"`**.
- `i18n/routing.ts`: ruta `/apps/acordes-cantar/juego` → en `/apps/acordes-cantar/game`
  (NO estaba en el plan pero `getLocalizedRouteUrls` la exige — sin ella la página
  tira 500 en `generateMetadata`).
- `data/apps/apps-catalog.ts`: `gameUrl`, `gameLabel` y la feature nueva al inicio,
  textos exactos de §15.4.
- Nota: hubo que correr `npm install` en la raíz del sitio (node_modules estaba
  desactualizado: faltaba `@vercel/analytics` — error preexistente, no de este cambio).

**Verificado en el sitio local (Next dev, puerto 3000):**
- `/es/apps/acordes-cantar/juego`: título correcto, badge "Modo juego 3D", iframe con
  `allow="autoplay; microphone"`, y DENTRO del iframe el menú AEROSTATO en es con el
  crédito obligatorio. ✓
- `/en/apps/acordes-cantar/game`: AEROSTAT · "Ascend. Sing. Illuminate." con `lang=en`. ✓
- Página de la app: botón "🚀 Modo juego 3D" → `/es/apps/acordes-cantar/juego` y la
  feature de Aerostato listada. ✓
- **Mic dentro del iframe**: `document.featurePolicy.allowsFeature("microphone") ===
  true` (la delegación del `allow` funciona — trampa §16), `getUserMedia` disponible,
  INICIAR ASCENSO dispara la petición real (bloqueada por el entorno de QA → pantalla
  amable). localStorage mismo-origen OK. ⏳ El GRANT real del permiso: probar en el
  navegador de Luis.
- **Sin commit/push** (§15.6): todos los cambios del repo del sitio están sin commitear,
  a la espera de que Luis lo pida.

**PROYECTO COMPLETO: F0–F11.** Pendiente global: QA manual con mic/audio/fps reales
(lista en F10) y el grant de mic en el sitio.

---

## Extra — Música ambiental dinámica · 2026-07-18 · COMPLETADA ✓

- Añadidas las 20 pistas R2 `music/aerostat/aerostat-01.mp3` … `aerostat-20.mp3`.
- Playlist barajada por ciclos completos: ninguna pista se repite hasta haber pasado
  por las 20, y tampoco se repite la última al comenzar el siguiente ciclo.
- Mismos niveles y fundidos de Batisfera: volumen relativo 0.35, fade-out de 320 ms y
  fade-in de 900 ms.
- Al amarrar una cuerda, la música se pausa antes de la referencia y permanece en
  silencio durante el canto. Al completar o agotar, espera 1 s desde el acorde final
  antes del fade-in; al soltar sin acorde, se reanuda inmediatamente.
- Las 20 URLs respondieron HTTP 200; `npm run deploy` compiló TypeScript/Vite y actualizó
  `public/apps/acordes-cantar-juego/`.

---

## Extra — Navegación con rumbo + radar circular (paridad Batisfera) · 2026-07-19 · EN LOCAL, SIN DEPLOY

Pedido de Luis: que la navegación y el radar se parezcan a los de la Batisfera.

- **`3d/player.ts`**: adoptado el rig de la Batisfera (yaw rumbo → lookYaw → pitch →
  cámara). A/D = timón propulsado (0.8 rad/s), W/S = thrust horizontal según el rumbo,
  Q/E-Space/Shift = vertical (navegación 3D libre). El drag ahora es vista TEMPORAL
  (lookYaw ±40°, peek ±25°) que se recentra al soltar — ya no altera el rumbo.
  Banqueo cosmético al girar y cabeceo al acelerar. Se conservan los rasgos de globo:
  inercia lenta en ambos sentidos (sin freno instantáneo), deriva de viento por capa,
  AMARRADO con auto-hover, límites de altitud y cilindro del mundo.
- **`config.ts`**: PHYSICS gana los tunables de la Batisfera (turnSpeed, lookYawMax,
  peekPitchMax, bankFactor…); `pitchMax` (±85°) eliminado.
- **`ui/compass.ts`**: la franja de brújula (N/E/S/O, ilegible para Luis) se reemplaza
  por un RADAR CIRCULAR estilo sonar: arriba = proa, anillos de latón, barrido dorado,
  anillo verde punteado = distancia de amarre por proximidad (tecla E), blips con color
  de familia y halo verde cuando ya puedes amarrar. Canvas 110×110 en `index.html`.
- **`lanterns/manager.ts`**: `blips(pos, yaw)` calcula bearing relativo a la proa +
  distancia + inRange (mismo cálculo dot/cross que las criaturas de la Batisfera).
- `.claude/launch.json`: añadida config `aerostato` (vite, puerto 5174).
- Verificación: `tsc --noEmit` limpio; el juego arranca con `?fakemic=1` sin errores de
  consola. ⏳ QA manual de las sensaciones de vuelo (timón, banqueo, radar) por Luis.
- Pendiente detectado: en móvil el drag ya no gira el rumbo (ahora es peek); la
  Batisfera lo resuelve con joystick táctil — Aerostato aún no tiene controles táctiles
  de timón/thrust.

## Extra — Amarre solo dentro del anillo del radar · 2026-07-19 · DEPLOY LOCAL ✓

Pedido de Luis: como en la Batisfera, tocar un globo fuera del anillo punteado no debe
amarrar — debe pedirte que te acerques, para que navegar el globo sea parte del juego.

- **`config.ts`**: `proximityDockDistance: 12` → `interactMaxDistance: 30` (mismo
  valor que la Batisfera; una sola distancia para click, tecla E y anillo del radar).
- **`main.ts`**: compuerta en `dockString()` — si la cuerda está a >30 u (3D), toast
  «Acércate {n} m para amarrar» y no pasa nada más. Cubre click, tecla E y la ballena.
- **`i18n.ts`**: nueva clave `feedback.approach` es/en.
- **radar/blips**: anillo verde y halo de blips ahora dibujan `interactMaxDistance`.
- `tsc` limpio; `npm run deploy` actualizó `public/apps/acordes-cantar-juego/`.

## Extra — Timón a la mitad + sonido de giro · 2026-07-19 · DEPLOY LOCAL ✓

- **`config.ts`**: `turnSpeed` 0.8 → 0.4 rad/s (Luis: la mitad — mismo ajuste que
  pidió en la Batisfera el 2026-07-12).
- **Sonido del timón**: A/D ahora suenan como el resto de las teclas de movimiento.
  Nuevo getter `player.turnRate` (|velocidad de giro suavizada|); en `main.ts` entra
  a `synth.setWind()` con el mismo peso (0.3) que la velocidad lineal de W/S — girar
  produce el mismo woosh de viento que avanzar. (Q/E ya rugían por el quemador.)
- `npm run deploy` actualizó `public/apps/acordes-cantar-juego/`.

## Extra — "← Volver" del sitio vuelve primero al menú del juego · 2026-07-19 · DEPLOY LOCAL ✓

Pedido de Luis: el Volver del marco te sacaba a la página de la app aunque estuvieras
en plena partida; debe llevarte primero a la pantalla de configuración del juego.

- Nuevo protocolo **storm:back** entre GameShell y el juego embebido (postMessage,
  con verificación de origin en ambos lados):
  - `components/apps/GameShell.tsx`: prop opcional `backAsksGame` (default false —
    Batisfera y demás apps sin cambios). Con ella, el click en "← Volver" manda
    `{type:"storm:back"}` al iframe en vez de navegar, y solo navega a `backHref`
    cuando el juego responde `{type:"storm:back-exit"}`.
  - `main.ts` (Aerostato): fuera del menú (partida, pausa, atlas, resumen, vuelo
    libre…) → `endGame()` al menú de configuración; ya en el menú → autoriza salida.
  - `app/[locale]/apps/acordes-cantar/juego/page.tsx`: activa `backAsksGame`.
- `npm run deploy` actualizó `public/apps/acordes-cantar-juego/`; `tsc` del sitio limpio.

## Fix — acierto.mp3 no sonaba al completar cuerda · 2026-07-19 · DEPLOY LOCAL ✓

Reporte de Luis: el SFX de acierto dejó de escucharse.

- Causa raíz (carrera en `state.on("completed")`): `playCorrect()` arrancaba
  `acierto.mp3` y lo registraba en `activeAudios`; el `playChord()` inmediato
  empieza con `stopChord()`, que pausa TODO `activeAudios` — mataba el acierto en
  el mismo tick. `error.mp3` sobrevivía porque el arpegio fantasma usa `playNote`
  (sin `stopChord`), por eso solo fallaba el acierto.
- Fix en `samples.ts`: `playUrl(url, vol, track=false)` para SFX — acierto/error ya
  no entran a `activeAudios`, así `stopChord` corta solo notas/acordes/referencia.
- `npm run deploy` actualizó `public/apps/acordes-cantar-juego/`.

## Extra — acierto.mp3 en cada nota afinada · 2026-07-19 · DEPLOY LOCAL ✓

Pedido de Luis: el acierto es muy buen feedback — que suene en cada linterna, no
solo al completar la cuerda.

- `main.ts`, evento "lantern": cada nota validada toca `playCorrect()` junto a su
  nota de instrumento. EXCEPTO la última de la cuerda: ahí el evento "completed"
  inmediato ya lo toca con el acorde armónico (evita el acierto doble).
- `npm run deploy` actualizó `public/apps/acordes-cantar-juego/`.

## F1 de PLAN-AERONAVES-POR-CAPA — Manager + avioneta (capa 2) · 2026-07-19 · DEPLOY LOCAL ✓

- **`src/3d/flybys.ts` nuevo**: `FlybyManager` (una aeronave activa a la vez, timer
  aleatorio 35–90 s, spawn solo si la capa del jugador tiene aeronave asignada) y
  `Flyby` (cuerda del cilindro a Y constante con offset lateral ≤40 u, Y a ≥15 u del
  jugador, lookAt al destino, dispose de geometrías/materiales al salir del radio).
  `Math.random()` a propósito — no consume el RNG sembrado del mundo.
- **Avioneta capa 2**: ala alta tipo Cessna en primitivas (crema/rojo), 6 draw calls,
  hélice girando (26 rad/s) y balanceo sutil del modelo. `KIND_BY_LAYER` deja
  rampa lista para jet (F2), estratosférico (F3) y satélite (F4).
- **`config.ts`**: bloque `FLYBY` con todos los tunables (incluye speeds de los
  4 tipos futuros). **`renderer.ts`**: instancia + update en el frame loop (corre
  también de fondo en el menú). **`main.ts`**: `game.flybys.reset()` en `endGame`.
- Tropiezo TS: `timer` infería el tipo literal `15` del `as const` — anotado `number`.
- Build limpio; `npm run deploy` actualizó `public/`. ⏳ QA visual de Luis en capa 2
  (esperar 15 s + intervalo; el primer paso puede tardar ~1 min).

## F2 de PLAN-AERONAVES-POR-CAPA — Jet comercial + estela (capa 3) · 2026-07-19 · DEPLOY LOCAL ✓

- `KIND_BY_LAYER[3] = "jet"`; `buildModel` ramificado en `buildPlane`/`buildJet`.
- **Jet**: fuselaje cilíndrico blanco + morro cónico, alas en flecha (rotación y
  ±0.42), 2 motores bajo el ala, aleta azul inclinada — 7 meshes.
- **Estela doble** (`buildContrail`, reutilizable para F3): cintas en CRUZ tras cada
  motor (30 u, se ensanchan 0.35→1.3), TODAS en un solo BufferGeometry con alpha por
  vértice (0.5 en cabeza → 0 en cola), MeshBasicMaterial vertexColors RGBA +
  depthWrite off = **1 draw call**; viaja rígida con el grupo (suficiente a distancia).
- Total jet en pantalla: 8 draw calls. Build limpio; deploy a `public/`.
- ⏳ QA visual de Luis en Cielo Abierto (capa 3).
