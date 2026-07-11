# BITÁCORA DE DESARROLLO — Batisfera

Registro de avance por fases. **Léela junto con `PLAN-CONSTRUCCION-BATISFERA.md`**
(el plan maestro manda; aquí solo se anota qué está hecho y qué sigue).
Regla: al terminar (o interrumpir) trabajo, anota fecha, fase, qué quedó y pendientes.

---

## Sesión 1 — 2026-07-11 (Claude Fable 5)

- Plan maestro escrito y aprobado por Luis.

### ✅ F0 — Scaffold (COMPLETADA Y VERIFICADA)
- `package.json` (three 0.160, vite 8, TS 5.3), `tsconfig.json` (strict, alias `@/`),
  `vite.config.ts` (`base: "./"`), `index.html` (secciones de pantalla), `src/style.css`
  (tema abisal glass+neón), `.claude/launch.json` (dev server para preview).
- Verificado en navegador: menú completo en `?lang=es` y `?lang=en` (BATISFERA /
  BATHYSPHERE), selectores de modo/timbre/zona funcionando, zonas 2–5 bloqueadas,
  settings persisten en localStorage. `npm run build` limpio.

### ✅ F1 — Música y audio (COMPLETADA Y VERIFICADA)
- `src/music/chords.ts` (33 acordes, 6 familias, nombres es/en),
  `src/music/theory.ts` (noteToMidi/midiToNote/chordNotes/hasSamplesFor, rango C2–C7),
  `src/audio/samples.ts` (SamplePlayer: cache+clonado, playChord armónico, SFX R2),
  `src/config.ts` (zonas §5, keyframes de luz §5.1, modos §6.4, scoring, física,
  claves localStorage — TODO el dato del plan ya está tipado aquí).
- Verificado en navegador (`?debug=1` muestra panel de pruebas):
  `chordNotes("C4",MAJOR)=[C4,E4,G4]` · `hasSamplesFor("A6",MAJOR)=false` ·
  `hasSamplesFor("B5",DOM13)=false` (la trampa §15) · `depthMeters(-225)=600` ·
  Cmaj7 suena con 4 audios simultáneos desde R2 (readyState 4) ·
  F#3 mayor en Fagot carga `Fagot/F%233.mp3` (el %23 funciona).
- `window.__batisfera` expone teoría+player para verificación por consola.

### ✅ F2 — Mundo 3D y navegación (COMPLETADA Y VERIFICADA)
- `src/3d/environment.ts`: keyframes §5.1 interpolados (fog+background mismo color),
  god rays (9 planos aditivos, solo superficie), nieve marina (1 THREE.Points ×1500,
  reciclada en cubo de 120 alrededor del jugador), superficie vista desde abajo,
  fondo de fosa con relieve + 6 chimeneas hidrotermales emisivas con PointLights.
- `src/3d/player.ts`: rig yaw→pitch→cámara; WASD/flechas (avance sigue la mirada
  completa), Q/E–Space/Shift vertical, drag-para-mirar con cursor visible (SIN pointer
  lock), detección de tap corto (<5px, <250ms) → `onTap` (para raycast F4), clamps
  vertical y cilindro radial suave, balanceo de cámara, inercia exponencial.
- `src/3d/renderer.ts`: Game3D con iluminación moderna de Three, foco SpotLight hijo
  de cámara con rampa −120→−300, loop
  setAnimationLoop, `onDepth` callback. `startDive(zona)` / `stopDive()`.
- `main.ts`: INICIAR INMERSIÓN → `startDive(zonaSeleccionada)`; Esc → menú (pausa real
  en F5); mundo visible de fondo del menú; `__batisfera.game` expuesto para pruebas.
- **Verificado en navegador:** 5 m con god rays y superficie · 413 m penumbra (mapeo
  por zona exacto: −190 → 413 m) · 2000 m oscuridad · 9833 m fondo con brasas naranjas ·
  tecla W mueve 4.2 u en 0.8 s con inercia · **61 FPS**. Build limpio (496 KB js).
- Nota de pulido (F8): el foco no se "ve" en agua vacía porque PointsMaterial no
  reacciona a luces — opción: cono translúcido sutil o nieve con material lit.

### ✅ F3 — Cabina y HUD (COMPLETADA Y VERIFICADA)
- `src/3d/cockpit.ts`: esfera de cristal con shader fresnel (BackSide, brillo de borde).
  **Decisión de diseño:** el marco de la burbuja NO es 3D — los toros cruzaban el centro
  de la vista o no se adaptaban al aspect ratio. El marco vive en CSS
  (`.bubble-vignette`): elipse oscura que entra por las esquinas + halo cian interior +
  reflejo especular. Se adapta a cualquier viewport.
- `src/ui/hud.ts`: consola inferior (profundímetro con metros narrativos + nombre de
  zona, área central para botones de respuesta [F5], sonar a la derecha, medidores
  O₂/casco ocultos [F6], banner de feedback [F5]); stats PUNTOS/RACHA arriba a la
  derecha (racha ≥3 se pinta ámbar `.hot`).
- `src/ui/sonar.ts`: canvas 2D circular con anillos, barrido cónico animado y blips
  rotados al rumbo de la cámara (`player.yaw`); blip `active` en ámbar (F5).
- `renderer.ts`: `onFrame(dt, elapsed)` para animar el HUD; `player.yaw` getter.
- `main.ts`: HUD conectado a `onDepth`/`onFrame` con blips FALSOS (F4 los reemplaza);
  INICIAR → `showScreen("hud")`. El debug encadena `onDepth` sin robar el del HUD.
- **Verificado:** consola con 8 m/Zona Soleada · sonar girando con 3 blips · viñeta
  burbuja visible · Esc → menú (HUD oculto, controles off). Build limpio.

### ✅ F4 — Criaturas (COMPLETADA Y VERIFICADA)
- `src/3d/creatures/base.ts`: clase Creature — estados IDLE/LISTENING/FLEEING/
  CAPTURED/GONE, envolvente de brillo (pulse() al sonar el acorde, caída 1.6 s),
  huida acelerando a la oscuridad (1.6 s), captura nadando a cámara + blanco (1.25 s),
  esfera de click invisible ×1.5 del radio, deriva idle, dispose() de geometrías.
- `src/3d/creatures/species.ts`: las 7 especies procedurales §7 (medusa, cardumen
  InstancedMesh×46, calamar, rape con señuelo emisivo, sifonóforo 16 faroles, pulpo
  dumbo, leviatán 9 segmentos con placas) + halo sprite compartido (CanvasTexture).
  Color de emisión = FAMILY_GLOW[familia].
- `src/3d/creatures/manager.ts`: población 4–6 en banda Y de la zona, separación ≥15,
  reciclaje a >90 u, leviatán 12% una vez por visita a zona 5, blips con rumbo
  relativo (0=frente, +=derecha), `setAssigner()` para el generador de preguntas.
- `renderer.ts`: raycast tap→`onCreatureTapped` + hover con cursor pointer (throttle
  8/s). `main.ts`: asignador TEMPORAL (pool completo de zona, raíz C3–C5 validada) —
  **F5 debe sustituirlo por questions.ts (§6.3 grupos + pesos + anti-repetición)**;
  timbre Aleatorio se resuelve UNA vez por criatura (WeakMap); exclusividad de
  LISTENING; re-click = re-escuchar.
- **Verificado en navegador:** 6 criaturas spawn en zona 1 (especies correctas),
  acordes del pool con raíces válidas, tap → LISTENING + 3 audios simultáneos
  (tríada) + pulso visual, 6 blips en sonar, hover cambia el cursor.

### ✅ F4.5 — Cabina rediseñada según foto de Luis (COMPLETADA)
- Luis subió `art/cabina-submarino.png` (sumergible real: ventana circular, paneles
  laterales, consola central con joysticks). El HUD se rediseñó para replicarla:
  ventana CIRCULAR (radial-gradient `--win-r: 47vmin`), marco metálico con filo
  iluminado, 2 focos superiores, luces de estado en el marco, panel izq (sonar CRT +
  brújula animada + tira de luces), panel der (pantallas PROFUNDIDAD y PUNTOS/RACHA +
  medidores O₂/casco ocultos), consola inferior (prompt + botones de respuesta +
  perillas decorativas) flanqueada por joysticks CSS con botón rojo.
- ⚠️ LECCIÓN: la clase `.screen` ya la usan las SECCIONES de pantalla (menú, hud…);
  las pantallitas de instrumentos se llaman `.crt`. No reutilizar `.screen`.
- Responsive: <640px oculta panel derecho y joysticks, encoge sonar arriba-izquierda.
- Verificado con screenshot: composición fiel a la foto (ventana + paneles + consola).

### ✅ F5 — Loop de Expedición (COMPLETADA Y VERIFICADA)
- `game/questions.ts`: QuestionMachine — grupos §6.3 (g2 a ½ cuota, g3 a ¾), peso ×2
  al grupo recién introducido, anti-repetición, ecos hadal (zona 5, tras ½ cuota,
  1 de cada 3 con acorde de zonas 1–4; `optionsFor` devuelve su familia completa).
- `game/state.ts`: DiveState — capturas POR ZONA (revisitar no resetea), cuota por
  modo, score 10+racha×2 (+50 al abrir zona, ×2 leviatán), `allowedBottomY()`
  (barrera física), `reachedBottom`, accuracy. Lógica pura sin DOM/escena.
- `player.ts`: `depthLimit` — clamp de Y + amortiguación al tocar la termoclina.
- `environment.ts`: 4 discos termoclina shimmer (aditivos) que se disuelven al abrir
  (`setThermoclineOpen`). La barrera FÍSICA es depthLimit; el disco es visual.
- `hud.ts`: `showQuestion` (🔊 re-escuchar + botones del pool o de la familia del eco
  con `hud.family`), `clearQuestion`, `showFeedback` (banner 1.7 s), `setQuota`,
  `pickByIndex` (teclas 1–9). `main.ts`: teclas 1–9 responden, R re-escucha.
- `index.html`: secciones estáticas de transición de zona, resumen y pausa (data-i18n).
- `main.ts`: sesión completa — startDive (reset+termoclinas según isZoneOpen),
  answerCurrent (captura/huida+SFX+feedback "Era: X"), cruce de zona por onDepth
  (transición 2.6 s + recálculo de límite), fondo→endDive(COMPLETE)→resumen con 5
  stats, pausa Esc (congela controles; F6 debe congelar O₂ aquí), Reintentar/Menú.
- **Verificado por consola:** tap→3 botones+LISTENING · correcta: score 12, CAPTURED ·
  incorrecta: racha 0, FLEEING, "Huyó… Era: Mayor" · 8/8 capturas → termoclina abierta,
  depthLimit −298, score 202 EXACTO (12+14+16+18+20+22+24+26+50) · cruce a zona 2: transición "Zona
  Crepuscular" + cuota 0/8 · **la barrera física bloqueó un teleport ilegal** (el test
  tuvo que abrirla a mano) · pausa Esc/reanudar OK · fondo → "¡Fondo de la fosa
  alcanzado!", 5 filas, precisión 89% (8/9). Screenshot final: consola preguntando
  "¿Qué acorde canta?" con cardumen brillando en la ventana.

### ✅ F6 — Contrarreloj y Supervivencia (COMPLETADA Y VERIFICADA)
- `state.ts`: `o2` (90 s, +8 por captura en TIME_ATTACK), `hull` (3, −1 por error en
  SURVIVAL), `tickO2(dt)`, `hullRemaining` en AnswerResult.
- `hud.ts`: `setModeMeters(modo)` (muestra barra O₂ o pips de casco), `setO2(frac)`,
  `setHull(n,total)` (rombos clip-path), `addCrack()` — grietas "✱" semitransparentes
  sobre el cristal con animación de impacto (pulir a SVG en F8+ si se quiere).
- `main.ts`: drenaje de O₂ en onFrame (respeta pausa), 0→O2_OUT; error en
  supervivencia → grieta+pip, 0→HULL_OUT.
- **Verificado:** O₂ drena y +8.0 exactos por captura, barra 97%, agotado → "Oxígeno
  agotado — ascenso"; 3 fallos → 3 grietas + 3 pips rotos → "Casco comprometido".
  Cuotas por modo correctas (4 contrarreloj, 6 supervivencia).

### ✅ F7 — Bitácora y persistencia (COMPLETADA Y VERIFICADA)
- `game/persistence.ts`: `recordAttempt` (guarda tras CADA respuesta: intentos,
  aciertos, primera captura ISO, especie), `saveUnlockedZone` (solo sube, máx 5),
  `loadBitacora`.
- `main.ts`: hook en answerCurrent; termoclina abierta en EXPEDICIÓN → desbloqueo
  persistente; pantalla Bitácora (grid 33 cards: ??? no visto / avistado con intentos /
  capturado con especie y % — borde izq del color de la familia), contador X/33.
- **Verificado:** localStorage con entrada MAJOR {5 int, 4 ok, especie jellyfish,
  timestamp}; unlockedZone=2 persistido; chip "Zona Crepuscular" habilitado en menú;
  pantalla 2/33 con 33 cards (2 capturadas, 31 ???).

### ✅ F8 — Controles táctiles (COMPLETADA — falta prueba en dispositivo real)
- `player.ts`: `externalMove` sumado a teclado + `attachTouchControls` (joystick
  propio ~60 líneas: touch por identifier, knob visual, normalizado; ▲▼ por
  pointerdown/up). Se conecta solo si el dispositivo es touch (`body.touch`).
- CSS: `.joy-zone`/`.joy-knob` abajo-izq, `.vert-btns` abajo-der (touch-action none).
- **Verificado en viewport 375×812** (touch forzado): layout completo — sonar mini
  arriba-izq, ventana circular, joystick, ▲▼, consola con pregunta y botones.
  ⚠️ Pendiente: probar drag-look + joystick simultáneos en un teléfono REAL.

### ✅ Extra (pedido directo de Luis, 2026-07-12): sonido ambiental + abortar misión
- `config.ts`: `AMBIENT_BUBBLES_URL` = `${AUDIO_BASE}/batisfera/water-bubbles.mp3`
  (bucket R2 compartido, carpeta `batisfera/` propia del juego — mismo patrón que
  Walking AP Multi documenta en su config.ts: la ruta interna de R2 es
  `storm-samples/batisfera/...` pero la URL pública NO lleva el prefijo del bucket).
- `audio/samples.ts`: `SamplePlayer.startLoop(name, url, volumeScale)` /
  `stopLoop(name)` — loop genérico con HTMLAudioElement (`loop=true`), volumen
  reactivo al slider global (`setVolume` ahora también reescala loops activos).
- `main.ts`: `startDive()` arranca `"bubbles"` al 35% del volumen tras el primer
  gesto; `returnToMenu()` y `endDive()` lo detienen.
- `ui/hud.ts`: botón **"✕ Abortar misión"** SIEMPRE visible (esquina sup. izquierda
  del HUD, no escondido tras Esc/pausa) → mismo camino que "Abandonar inmersión":
  `returnToMenu()` (para loop, limpia criaturas, dive=null, refresca menú).
- **Verificado:** loop reproduciendo con volumen exacto 0.28 (0.8 global × 0.35),
  `readyState=4` sin error (audio real, no 404), `currentTime` avanzando; clic en
  Abortar → menú visible, HUD oculto, loop pausado, `dive === null`.

### ✅ F9 — QA final de escritorio (COMPLETADA)
- `npm run qa`: verifica 33 acordes, cobertura de 5 zonas, 150 preguntas válidas,
  pools, puntuación (primera captura 12; ocho + bono = 202), termoclina, O₂ +8,
  tres fallos de casco, repaso hadal, multiplicador del Leviatán y cancelación de
  escucha a 30 s o más de 45 u.
- `npm run build`: TypeScript y build de producción limpios. El bundle de Three.js
  queda dentro del presupuesto desktop explícito de 600 kB.
- Audio: desbloqueo silencioso ejecutado dentro del primer gesto y reintento del loop
  en el siguiente pointerdown/keydown si el navegador aplica `NotAllowedError`.
- Three.js: retirada la iluminación legacy obsoleta; apariencia de superficie revisada
  en preview sin advertencias del renderer.
- Navegador desktop: menú, HUD, ES/EN, pausa con O₂ congelado, acierto/fallo,
  re-escucha sin puntuar y persistencia inmediata en bitácora verificados.
- Alcance confirmado por Luis: esta versión es solo laptop/desktop. Android y iPhone
  se desarrollarán después como versiones propias.

### ✅ F10 — Migración al website (COMPLETADA, sin publicar)
- Proyecto copiado a `apps-src/acordes-juego` sin `node_modules` ni `dist`.
- `scripts/copy-dist.mjs` construye y copia a `public/apps/acordes-juego`, respetando
  `STORM_WEBSITE_ROOT`; `npm run deploy` completado localmente.
- Ruta bilingüe creada con `GameShell`: `/es/apps/acordes/juego` y ruta localizada
  `/en/apps/acordes/game`; iframe con `allow="autoplay"` y assets relativos verificados.
- Catálogo de Reconocimiento de Acordes actualizado con botón "Modo juego 3D" y la
  característica de Batisfera al inicio.
- Website verificado: 166 tests pasan, ESLint limpio, `next build` limpio (129 páginas),
  rutas ES/EN e iframe revisados en navegador sin errores de consola.
- No se hizo commit, push ni despliegue a producción.
