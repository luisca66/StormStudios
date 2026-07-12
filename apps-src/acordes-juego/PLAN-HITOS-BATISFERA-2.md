# BATISFERA — Plan de hitos v2 (post-lanzamiento)

Escrito por Claude (Fable 5) el 2026-07-12 con las decisiones de Luis de esa sesión.
**Autocontenido**: cualquier modelo (Claude, Sol/GPT, Gemini) debe poder ejecutar un
hito leyendo SOLO este documento + los archivos que el hito lista. Complementa (no
sustituye) a `PLAN-CONSTRUCCION-BATISFERA.md` (diseño original) y
`BITACORA-DESARROLLO.md` (historial).

> **El código vive AQUÍ**: `apps-src/acordes-juego/` del repo del sitio.
> La carpeta `D:\claude_code\acordes-reconocer-webapp-juego\` es el prototipo
> standalone y quedó DESACTUALIZADA — no trabajar ahí.
> El juego está EN PRODUCCIÓN: https://www.stormstudios.com.mx/es/apps/acordes/juego

---

## 0. REGLAS DE ECONOMÍA DE TOKENS (obligatorias para el agente)

El costo de las sesiones es la restricción #1 de Luis. Por eso:

1. **Un hito por sesión.** Terminas el hito, actualizas la bitácora (5–10 líneas,
   no ensayos) y TE DETIENES para que Luis revise su usage.
2. **Lee SOLO**: la sección de tu hito aquí + las últimas 2 entradas de la bitácora +
   los archivos que tu hito lista. **NO explores el repo**, no leas archivos "por
   contexto", no releas archivos completos que este plan ya te resume.
3. **Verificación barata**: `npm run build` (corre tsc) + los checks de consola del
   navegador listados en el hito. **Máximo 1 screenshot por hito.** Nada de bucles
   de prueba-error visuales: si el criterio de aceptación pasa, sigue.
4. Ediciones quirúrgicas con Edit; Write solo para archivos nuevos.
5. **NUNCA** `git commit`/`push` ni `npm run deploy` sin permiso explícito de Luis.
6. El dev server es `npm run dev` (puerto 5173) DENTRO de `apps-src/acordes-juego/`.
7. Si algo del plan resulta imposible, anótalo en la bitácora y pregunta — no
   improvises un rediseño.

---

## 1. Estado actual (2026-07-12, verificado)

- Juego completo en producción, integrado vía iframe (`GameShell`) en
  `app/[locale]/apps/acordes/juego/page.tsx`; catálogo con `gameUrl`/`gameLabel`.
- Fases F0–F8 del plan original: TERMINADAS (ver bitácora). Arquitectura:
  `src/config.ts` (todas las constantes), `src/music/` (33 acordes + teoría),
  `src/audio/samples.ts` (samples R2 + loops ambientales), `src/game/`
  (state, questions, persistence — lógica pura), `src/3d/` (renderer, player,
  environment, cockpit, creatures/), `src/ui/` (hud, sonar, bitacora en main),
  `src/main.ts` (orquestador), `src/i18n.ts` (es/en).
- Cambios de Sol (GPT) post-migración: cuota Expedición = **20** (cumulativa, H1 la
  vuelve racha), `interactMaxDistance` = 80, loop `thrusters.mp3` cuando la nave se
  mueve (getter `isMoving` en player), aviso de zona desbloqueada fusionado con el
  feedback de captura, fullscreen en todo el sitio.
- Audio ambiental en R2: `{AUDIO_BASE}/batisfera/water-bubbles.mp3` y
  `{AUDIO_BASE}/batisfera/thrusters.mp3` (AUDIO_BASE en config.ts).
- Pendientes heredados de QA (bitácora): densidad de spawns en zona 4, prueba táctil
  en dispositivo real, foco poco visible en agua vacía.

## 2. Decisiones NUEVAS de Luis (cerradas, no renegociar)

1. **Desbloqueo por racha**: abrir una termoclina exige **20 aciertos CONSECUTIVOS
   en la zona**. Un error reinicia el contador de la zona a 0. (H1)
2. **La nave se mueve como nave espacial y SIEMPRE horizontal**: nunca de cabeza.
   Thrust adelante/atrás, giro de rumbo, subir/bajar vertical puro. La vista libre
   con mouse actual hace demasiado fácil encontrar criaturas → la búsqueda debe
   requerir MOVER la nave (el sonar se vuelve la herramienta central). (H2)
3. **Entornos con más adornos y puntos de referencia**, crítico en las zonas
   profundas donde no hay luz ni referencia espacial. (H3)
4. **Terminar todas las criaturas** (pulido a calidad final). (H4)

---

## HITO H1 — Desbloqueo por racha de 20 ⏱ sesión corta

**Archivos**: `src/game/state.ts`, `src/game/questions.ts`, `src/main.ts`,
`src/i18n.ts`, `src/ui/hud.ts` (solo si hace falta un método nuevo).

### Especificación
- En `DiveState.answer()`, un error pone `zoneCaptures[zoneIndex] = 0` (SOLO la zona
  actual; las ya abiertas no se cierran: `isZoneOpen` de zonas completadas debe
  seguir true — implementar con un set `openedZones` que se llena al llegar a cuota
  y ya no se vacía, en lugar de comparar `zoneCaptures >= quota` al vuelo).
- `allowedBottomY()` pasa a usar `openedZones` (mismo barrido consecutivo).
- **Los grupos de introducción NO regresan**: hoy `introducedPool(zone, captures,
  quota)` usa `capturesInZone`, que ahora se reinicia. Añadir en `DiveState` un
  `introHighWater: Partial<Record<number, number>>` = máximo histórico de
  `capturesInZone` por zona en la sesión; `main.ts` pasa ese valor a
  `questions.next()` y `optionsFor()` en lugar del contador vivo. Así un error no
  te regresa a "solo Mayor/Menor".
- Alcance: la regla de racha aplica a los TRES modos (la cuota de cada modo ya
  difiere: 20/4/6 — ver MODES en config.ts). El desbloqueo PERSISTENTE
  (`saveUnlockedZone`) sigue siendo solo Expedición (ya está así en main.ts).
- Feedback: al fallar con progreso > 0, además del "Huyó… Era: X" existente,
  mostrar la cuota reiniciada (el `setQuota(0, quota)` ya lo refleja en el panel;
  añadir clave i18n `feedback.quotaReset` es/en — ej. "Racha de zona perdida" /
  "Zone streak lost" — y mostrarla 1.7 s después del feedback de error con un
  setTimeout, patrón que ya existía para zoneOpen).

### Aceptación (consola, `?debug=1` no requerido)
- `window.__batisfera`: simular 3 correctas + 1 error → `capturesInZone === 0`,
  pool introducido NO regresa (si ya entró el grupo 2, sigue disponible).
- Completar 20 seguidas → termoclina abre; error posterior en la MISMA zona no la
  cierra (`allowedBottomY` no sube).
- `npm run build` limpio.

---

## HITO H2 — Movimiento tipo nave espacial ⏱ sesión media

**Archivos**: `src/3d/player.ts` (principal), `src/config.ts` (constantes nuevas),
`src/main.ts` (solo si cambia el cableado táctil), `PLAN §9` como referencia vieja.

### Especificación del nuevo modelo de control
La nave tiene **rumbo** (yaw). El cuerpo JAMÁS se inclina de verdad:

| Input | Acción |
|---|---|
| `W/S`, `↑/↓` | Thrust adelante/atrás **en el plano horizontal** (proyección del rumbo; ignorar todo componente vertical) |
| `A/D`, `←/→` | **Girar el rumbo** (timón, yaw). Deja de existir el strafe |
| `Q/E`, `Space/Shift` | Subir / bajar (thrust vertical puro) |
| Drag horizontal del mouse | También gira el rumbo (misma mecánica que A/D, sensibilidad en config) |
| Drag vertical del mouse | **Peek de cámara** limitado a ±20°, con auto-recentrado suave (~0.6 s) al soltar el botón |
| Click corto | Tocar criatura (SIN CAMBIOS: raycast, cursor visible) |

- **Banqueo cosmético** (solo la cámara, nunca la física): roll proporcional a la
  velocidad de giro (máx ~5°) y pitch visual ±2° al acelerar/frenar; ambos decaen a
  0 — la nave siempre vuelve sola a horizontal. Sumar al roll del balanceo submarino
  existente (`camRollAmplitude`).
- **Inercia con masa**: conservar el lerp exponencial; bajar `accelLerp` a ~1.8 y
  añadir constantes nuevas en `PHYSICS`: `turnSpeed` (rad/s con tecla, ~1.6),
  `peekPitchMax` (20°), `peekRecenter` (velocidad de recentrado). Mantener clamps de
  mundo (depthLimit, cilindro) tal cual.
- **Táctil**: joystick eje Y = thrust, eje X = girar rumbo (ya no strafe);
  ▲/▼ = subir/bajar (sin cambios); drag en pantalla = girar + peek con recentrado.
- El raycast/hover no cambia. `isMoving` (usado por el loop de thrusters) debe
  seguir reflejando cualquier thrust o giro activo.
- Consecuencia buscada: encontrar criaturas exige navegar y leer el **sonar** —
  no basta barrer con la vista.

### Aceptación
- Consola: con W sostenida 1 s, `player.position.y` NO cambia (antes sí, porque
  seguía la mirada). Q/E cambian solo Y.
- El pitch de cámara nunca excede ±20° y vuelve a 0 solo.
- Girar con A/D rota los blips del sonar coherentemente.
- 1 screenshot opcional. Build limpio.

---

## HITO H3 — Entornos: referencias en la oscuridad ⏱ sesión media-grande

**Archivos**: `src/3d/environment.ts` (principal), `src/config.ts` (colores por
zona si hace falta). Presupuesto de rendimiento: ≥ 50 fps desktop; usar
`InstancedMesh` para todo lo repetido; materiales emisivos baratos; nada de luces
dinámicas nuevas (las emisivas no iluminan, solo se ven — correcto y barato).

### 3a. Paredes de la fosa (referencia horizontal permanente)
- Hacer VISIBLE el cilindro del mundo: geometría de pared rocosa —
  `CylinderGeometry(WORLD.radius + 6, WORLD.radius + 6, 750, 48, 24, true)`
  (openEnded, BackSide), vértices desplazados con ruido barato (sin/cos compuestos,
  como el fondo existente) para que parezca roca.
- En zonas profundas (y < −300) la pared lleva **vetas emisivas** tenues del color
  de la zona (FAMILY_GLOW): segunda malla cilíndrica levemente interior con material
  aditivo y textura procedural de líneas (CanvasTexture generada una vez), opacidad
  que crece con la profundidad (0 arriba → 0.25 abajo).
- En zona 5 estrechar visualmente: anillo extra de pináculos altos cerca de la pared.

### 3b. Decoración por zona (todas estáticas, construidas una vez en init)
Usar un RNG con semilla fija (LCG simple) para que el mundo sea idéntico entre
sesiones — importante como referencia espacial y para QA.

| Zona | Adornos |
|---|---|
| 1 (0/−150) | Columnas de burbujas ascendentes (2–3 `Points` cilíndricos animados); silueta de barco hundido a lo lejos (cajas + cilindros oscuros, semienterrado) |
| 2 (−150/−300) | Arcos rocosos (toros parciales deformados, 3–4); medusas decorativas no interactivas lejanas (reusar `buildJellyfish` SIN clickSphere, 4–5, deriva lenta) |
| 3 (−300/−450) | Jardín de corales bioluminiscentes: 30–50 ramas `InstancedMesh` (conos deformados) con puntas emisivas ámbar tenues, agrupadas en 5–6 parches |
| 4 (−450/−600) | Osamenta de ballena (costillas: toros parciales blancos-grisáceos en fila, 8–10) + anémonas-farol: esferas emisivas pequeñas dispersas (15, `InstancedMesh`) con parpadeo lento por shader-less trick (escala del emissive en update, UNA sola malla parpadea alternando) |
| 5 (−600/−750) | Respiraderos con columnas de partículas ascendentes iluminadas (2 `Points` extra), más pináculos, el fondo con chimeneas ya existe |

### 3c. Balizas de expedición (referencia diegética universal)
- Baliza = poste corto + esfera emisiva parpadeante (`sin(elapsed*3 + fase)`) +
  sprite de texto con la profundidad ("−1 000 m": CanvasTexture 128×48 generada al
  construir, fuente Orbitron si ya cargó, fallback monospace).
- Colocar: 1 junto a cada termoclina (4) + 2 por zona a media altura (10) = 14.
  Color del halo = FAMILY_GLOW de la zona. Posiciones con el RNG sembrado, radio
  30–60 del centro.
- Son el "migajas de pan" vertical: siempre hay una luz con número visible a < 70 u.

### Aceptación
- Teleport a y = −380, −520, −700 (consola): en cada uno hay ≥ 2 referencias
  visibles (pared con vetas / decorado / baliza) SIN encender el foco.
- FPS ≥ 50 en desktop (medir con el snippet de rAF de la bitácora F2).
- Build limpio. 1 screenshot en zona 4 o 5.

---

## HITO H4 — Criaturas a calidad final ⏱ sesión media

**Archivos**: `src/3d/creatures/base.ts`, `species.ts`, `manager.ts` (spawn z4).

### 4a. Destello por-nota (la mejora estrella, PLAN §7 pendiente)
- `Creature.pulse()` gana el número de notas: `pulse(noteCount)`. Guarda
  timestamps: nota i → impulso en `i * 0.09 s`. En `update()`, el boost total =
  envolvente global existente + Σ mini-envolventes (ataque 0.02, caída 0.35).
- Hook opcional por especie `flashSegment(i, intensity)`; si la especie no lo
  implementa, el destello es de cuerpo completo (comportamiento actual).
  Mapeos: medusa → tentáculo i; sifonóforo → grupo de faroles i (16/nNotas);
  cardumen → sub-racimo (instancias i*N/n..); leviatán → placa dorsal i;
  calamar → par de tentáculos i; dumbo → par de brazos i; rape → parpadeo del
  señuelo i veces. El resultado: **ves el acorde nota a nota en el cuerpo**.
- `main.ts` llama `creature.pulse(chordNotes(...).length)` (ya conoce las notas).

### 4b. Tamaño por registro
- Al crear la criatura: `scale = 1.35 − (rootMidi − 48) × 0.0125` clamp [0.85, 1.35]
  (fundamentales graves = criaturas grandes). Aplicar a `group.scale` base y
  RESPETAR en capture() (que hoy hace `setScalar` — multiplicar por el base).

### 4c. Pulidos puntuales
- Zona 4 comparte especies con 3 y 5 (angler, siphonophore, dumbo) pero el spawn se
  sentía escaso: en `manager.trySpawn`, si `zoneIndex === 4` reducir el cooldown de
  repoblación a la mitad. Revisar con el check de densidad de abajo.
- Leviatán: al aparecer, un "bramido" visual — sus placas hacen una ola de destellos
  (reusar flashSegment secuencial) + evento en sonar (blip grande 3 s). Vale ×2 ya.
- Huida: el aleteo frenético actual (dt×2.5) a veces se ve cómico en el cardumen —
  para `school`, en FLEEING colapsar el radio de órbita (los peces se compactan) en
  vez de acelerar la animación.

### Aceptación
- Consola: tocar una criatura de 4 notas → 4 impulsos visibles/measurables
  (`emissiveIntensity` con 4 picos; loggear en debug si hace falta).
- Root C3 produce criatura visiblemente mayor que root C5 (comparar `group.scale`).
- Densidad z4: tras 30 s en la zona, ≥ 4 criaturas activas.
- Build limpio. 1 screenshot.

---

## HITO H5 — QA final + deploy ⏱ sesión corta

1. Ejecutar la checklist §13 del `PLAN-CONSTRUCCION-BATISFERA.md` (16 puntos) — vía
   consola donde se pueda; anotar resultados en la bitácora (una línea por punto).
2. Extras nuevos: racha-reset UX clara; nave nunca invertida; referencias visibles
   en cada zona; destello por-nota en las 7 especies; `?lang=en` completo
   (incluidas las claves nuevas de H1).
3. `npm run build` y `npm run qa` (script de Sol) limpios.
4. **Con OK de Luis**: `npm run deploy` (copia a `public/apps/acordes-juego`) y
   probar `/es/apps/acordes/juego` + `/en/...` en el dev server del SITIO
   (`npm run dev` en la raíz del repo del sitio). NO commit sin permiso.

---

## Preguntas abiertas para Luis (defaults marcados — puede ejecutarse sin respuesta)

1. ¿La racha de 20 aplica también a Contrarreloj (4) y Supervivencia (6)?
   **Default implementado: sí, con sus cuotas propias.**
2. Drag vertical del mouse: ¿peek ±20° con recentrado (default) o vista 100% fija
   al horizonte?
3. ¿Especies NUEVAS además de pulir las 7? **Default: solo pulir** (la variedad
   visual extra viene del decorado de H3 y del tamaño por registro de H4).

## Orden recomendado y costo estimado

H1 (barato, alto impacto pedagógico) → H2 (define el feel; hacerlo antes que H3
para calibrar referencias con el control real) → H3 → H4 → H5.
Cada hito cabe en una sesión de modelo económico (Sonnet/GPT-mini); H3 es el más
largo. Si una sesión se corta a medias: anotar en bitácora QUÉ archivo quedó a
medias y qué falta, en 3 líneas.
