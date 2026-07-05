# Notas de diseño pendientes — Intervalos Cantados (juego)

Especificaciones dejadas por Fable 5 (2026-07-05) para implementación futura.
Verificadas contra el código actual; rutas y funciones son reales.

---

## 1. Rango vocal (transposición de octava) — LISTA PARA IMPLEMENTAR

**Problema:** el target que el alumno debe cantar es `rootMidi - 12 + semitonos*dirección`
(`GameController.getTargetFrequency`, src/game/controller.ts). Ese `-12` fija el ejercicio
en registro grave (voz masculina). Mujeres, niños y voces agudas no alcanzan la octava
pedida: el juego les es injugable por tesitura, no por oído.

**Diseño correcto: transponer TODO el ejercicio, no relajar el matching.**
⚠️ NO aceptar la nota en cualquier octava (matching por pitch class): rompería la
direccionalidad — 5ªJ ↑ desde Do y 4ªJ ↓ desde Do dan ambas Sol. El juego distingue ↑/↓,
así que sample y target deben moverse JUNTOS.

**Implementación:**
1. `GameState` (controller.ts): nuevo campo `octaveShift: number` (0 = grave/actual, +12 = agudo).
2. Los DOS lugares que usan el offset `-12` reciben el shift:
   - `AudioEngine.noteUrl` / `playNote` (src/audio/engine.ts): `sampleMidi = midiNumber - 12 + shift`
     — más simple: pasar el midi ya transpuesto desde el controller y no tocar el engine.
   - `getTargetFrequency` (controller.ts): `sampleMidi = rootMidi - 12 + this.state.octaveShift`.
   - En `startChallenge`, la URL del sample se construye con `ch.rootMidi + octaveShift`
     (los samples en R2 cubren C2–C7; +12 cabe sobrado para todas las raíces actuales).
3. UI (main.ts): tercer selector en el menú junto a Instrumento/Velocidad —
   "Rango de voz": **Grave (hombre)** = 0 · **Agudo (mujer/niño)** = +12.
   Mismo patrón que el selector de dificultad (`selector-btn` + dataset).
4. Persistir la elección en `localStorage` (`vocal-range`) y restaurarla al cargar.
5. i18n: claves nuevas en src/i18n.ts (es/en) para el título y las dos opciones.

**Prueba:** con el mic falso (oscilador), verificar que con shift +12 el target detectado
por el barrido de octavas queda 12 MIDI arriba y que el sample pedido a R2 sube una octava
(p. ej. `Piano/G3.mp3` → `Piano/G4.mp3`).

---

## 2. Teclas físicas para deletrear notas — ⚠️ CONFLICTO A RESOLVER CON LUIS

`window keydown` en src/game/engine.ts ya captura **A y D** (y flechas) para rotar la
torreta. Mapear A–G para escribir notas chocaría: la tecla A rotaría Y escribiría.

Opciones (decisión de diseño de Luis, no tomar unilateralmente):
- **(a)** Apuntar SOLO con flechas (quitar a/d de engine.ts) y liberar A–G para notas.
  Estándar y limpio, pero cambia los controles actuales.
- **(b)** A–G para notas solo cuando el misil está cargado (`missileCharged`): mientras
  cantas apuntas con a/d, al cargar el teclado pasa a "modo deletreo". Cero cambios de
  hábito, pero estado modal (documentarlo en pantalla).
- Accidentales en ambos casos: `#` (Shift+3 en algunos layouts — mejor teclas `s`/`b`
  o `+`/`-`), Backspace ya borra, Enter ya dispara (main.ts).

---

## 3. SFX por nivel (cuando Luis termine los audios)

Luis está produciendo sonidos por nivel (en D:\ hay `sfx\level 01\` y `sfx\level 02\`
con `disparo.mp3`, `enemigo.mp3` — aún sin referenciar por código).

Plan de cableado:
1. Copiar a `apps-src/intervalos-cantados-juego/public/sfx/level-01/…` etc.
   (kebab-case, sin espacios: los espacios en rutas URL dan problemas innecesarios).
   Borrar los `.mp3.import` (metadatos de Godot, inútiles en web).
2. `AudioEngine.playSFX(name, loop, volume)` (src/audio/engine.ts) gana un parámetro
   opcional `level?: number`; si viene, intenta `./sfx/level-NN/name.mp3` y cae al
   `./sfx/name.mp3` base si no existe (probar con fetch HEAD cacheado o mantener un
   mapa estático de qué niveles tienen overrides — más simple y sin 404s en consola).
3. Los llamadores en controller.ts/engine.ts pasan `this.state.selectedLevel`.
4. Mapeo de nombres Godot→web: `disparo`→`shot`, `enemigo`→`enemy` (o renombrar los
   archivos al copiar, que es más limpio).

---

## 4. Apuntado táctil / auto-aim (pendiente desde 2026-07-04)

En móvil no hay teclas: los niveles 2D y FPS no se pueden apuntar. Opciones anotadas:
arrastrar en el canvas para rotar, o auto-aim opcional (el misil sale hacia el enemigo;
`missileAngle = atan2(enemyY - playerY, enemyX - playerX)` en engine.ts donde hoy usa
`this.playerAngle`). Si en Godot el misil auto-apuntaba, (b) es fiel al original — Luis
no ha confirmado.
