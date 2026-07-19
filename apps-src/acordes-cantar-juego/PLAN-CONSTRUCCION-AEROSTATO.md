# AEROSTATO — Plan maestro de construcción

**Videojuego 3D de canto de acordes para Storm Studios Learning**
Documento de handoff escrito por Claude (Fable 5) el 2026-07-17, con diseño aprobado por
Luis Cárdenas. Este documento es **autocontenido**: un agente (Codex, Gemini, Claude) o un
desarrollador humano debe poder construir el juego completo leyendo solo esto.

> **Estado actual del proyecto: SOLO EXISTE ESTE DOCUMENTO.** No hay código aún.
> La carpeta de trabajo es `C:\Users\Luis\Documents\claude_code\aerostat\`.
> El juego se desarrolla y prueba **standalone** (Vite propio) en esa carpeta; NO toca el
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
   valor propuesto aquí como default; Luis los ajustará jugando.
8. El gemelo arquitectónico de este juego es **Batisfera** (`apps-src/acordes-juego/`):
   ante cualquier duda de "cómo se hace X en la casa", mira cómo lo hizo Batisfera y su
   plan (`apps-src/acordes-juego/PLAN-CONSTRUCCION-BATISFERA.md`).

---

## 1. Contexto: la plataforma Storm Studios

Sitio: https://www.stormstudios.com.mx — plataforma de educación musical (Next.js 15 +
next-intl es/en). Repo local del sitio:

```
C:\Users\Luis\Documents\storm-studios\StormStudios
```

> **Convención de rutas de este documento:** toda ruta que empiece con `apps-src/`,
> `public/` o `app/` es RELATIVA a ese repo del sitio (ahí viven las referencias a copiar:
> afinador, tablas de acordes, reproductor). La carpeta de trabajo del juego es la
> indicada arriba (`claude_code\aerostat`), fuera del repo.

Patrón de la casa: cada app de entrenamiento auditivo tiene dos experiencias:

| Experiencia | Ruta | Qué es |
|---|---|---|
| Webapp "seria" | `/es/apps/acordes-cantar/jugar` | Entrenador configurable con estadísticas |
| Videojuego | `/es/apps/acordes-cantar/juego` | Juego temático con la misma pedagogía |

Ambas son **apps Vite independientes** en `apps-src/<nombre>/`, compiladas a `dist/` y
copiadas a `public/apps/<nombre>/` con `scripts/copy-dist.mjs`. El sitio las embebe con
`<iframe src="/apps/<nombre>/index.html?lang={locale}">`.

Videojuegos existentes (referencia de estilo y arquitectura):

| Juego | App base | Estilo | Fuente |
|---|---|---|---|
| Cosmic Ear | Desglose | Nave 3D, cantar notas | `public/apps/cosmic-ear/js/app.jsx` |
| Synth-Kong | Intervalos–Reconocimiento | Retro 2D, 20 sectores | `public/apps/intervalos-reconocimiento-juego/` |
| Intervalos Cantados juego | Intervalos–Cantados | Torreta, cantas para disparar | `apps-src/intervalos-cantados-juego/` |
| Walking AP Multi | Oído Absoluto Multi | 3D three.js, primera persona | `apps-src/oido-absoluto-multi-juego/` |
| **Batisfera** | Acordes–Reconocimiento | **3D primera persona, fosa oceánica** | `apps-src/acordes-juego/` |

**AEROSTATO es el videojuego de la app "Cantar Acordes"** (slug `acordes-cantar`, webapp
seria compilada en `public/apps/acordes-cantar/` — su pedagogía se describe en §3.5).
**Batisfera es el modelo arquitectónico a seguir** (three.js 0.160 + Vite + TS, carpetas
`src/3d`, `src/game`, `src/audio`, `src/ui`, `src/i18n.ts`, entorno 100 % procedural).

**La tesis del juego:** Batisfera *desciende a lo oscuro reconociendo* acordes. Aerostato
*asciende a la luz cantándolos*. Son un díptico: océano/cielo, oído/voz, análisis/producción.

---

## 2. Decisiones de diseño CERRADAS (aprobadas por Luis)

1. **Nombre:** *Aerostato* (ES) / *Aerostat* (EN). Tagline: *"Asciende. Canta. Ilumina."* /
   *"Ascend. Sing. Illuminate."*
2. **Concepto:** pilotas un globo aerostático de expedición científica (estética época
   dorada de la aerostación: mimbre, latón, cuerdas, lámparas) que asciende desde un valle
   al amanecer hasta el borde del espacio. **Tu voz es el aire que te eleva.**
3. **3D en primera persona** desde la canastilla, con three.js (arquitectura Batisfera).
4. **Navegación libre 3D** flotante: WASD + mirar con drag de mouse. Más inercia que
   Batisfera (masa de globo) + deriva de viento constante por capa.
5. **Cursor SIEMPRE visible, SIN pointer lock** (patrón Batisfera).
6. **El objeto de juego son las "cuerdas de linternas"**: racimos de linternas celestes que
   flotan en cada capa, colgadas de un pequeño globo piloto. Cada cuerda lleva un acorde:
   una linterna apagada por cada nota, apiladas verticalmente **en su altura interválica
   relativa** (¡ves las terceras apiladas!). Acercarse o hacer click = amarrarse (dock).
7. **Loop de canto:** al amarrar, la consola anuncia el acorde (ej. "Sol · 7ª menor") y
   suena la **nota de referencia**. Cantas las notas de la linterna 1 (grave) a la N
   (aguda). Nota sostenida 1.5 s dentro de ±50 cents = la linterna **se enciende y suena
   su nota** (confirmación auditiva). Todas encendidas = **suena el acorde completo en
   armónico**, la cuerda se suelta y se eleva, y el quemador te da un empujón de altitud.
8. **El reloj es el desafío, no el "intento único":** cantar es un proceso de ajuste; NO
   se castiga la nota desafinada (el afinador de la consola te guía). Lo que se agota es
   el **viento**: cada cuerda tiene un temporizador visible (la cuerda se deshilacha). Si
   expira, la cuerda se pierde: racha a 0, y como feedback pedagógico suena el acorde
   completo con las linternas en "fantasma" (*así sonaba*). En Supervivencia además rasga
   la tela del globo.
9. **Altitud = complejidad**: 5 capas de cielo mapean las 5 familias de acordes (§6).
   El cielo se **oscurece hacia arriba** (físicamente real): amanecer dorado → azul de
   día → índigo estratosférico → casi-espacio con estrellas. Espejo exacto de Batisfera.
10. **Registro vocal Varón (F2–G4) / Dama (G3–A5)** como la webapp seria; TODAS las
    fundamentales se eligen para que el acorde completo quepa en el registro (§3.4).
11. **Modo de referencia** (ajuste de menú, como la webapp seria): *Fundamental* (default)
    o *Cualquier nota del acorde*.
12. **Linternas etiquetadas por GRADO** (Fund., 3ª, 5ª, 7ª, 9ª…), no por nombre de nota:
    el jugador deriva las alturas por oído + teoría. Al encenderse, la linterna revela el
    nombre de la nota. Toggle de accesibilidad "Mostrar nombres" (default OFF) las muestra
    desde el inicio.
13. **Sin deletreo de notas en el juego** (el modo híbrido nombre+afinación queda en la
    webapp seria). El juego entrena producción vocal pura.
14. **Los tres modos de la casa:** Expedición (clásico, desbloquea capas), Contrarreloj
    (gas del quemador), Supervivencia (integridad de la tela, 3 rasgaduras).
15. **Colección = Atlas del Aeronauta**: las 33 "constelaciones de linternas" (una por tipo
    de acorde) con estadísticas y **medallas de precisión en cents** (§7.6).
16. **Criatura rara:** la **Ballena Celeste** / *Sky Whale* — 1 vez por sesión en capa 5,
    lleva una cuerda de linternas de 13ª en el lomo, vale ×2. (Guiño al Leviatán de
    Batisfera.)
17. **Desktop primero; móvil queda fuera del alcance de v1** (igual que la decisión final
    de Batisfera). No bloquear el diseño: `touch-action: none` y layout flexible desde el
    inicio.
18. Bilingüe es/en vía `?lang=`, 5 timbres de R2, estadísticas en localStorage — igual que
    toda la plataforma.

---

## 3. Datos musicales y de audio (autoritativos)

### 3.1 Los 33 tipos de acorde

Fuente original: `apps-src/acordes/src/chord-types.js`. La tabla completa con familias e
intervalos (semitonos desde la fundamental) está en
`apps-src/acordes-juego/PLAN-CONSTRUCCION-BATISFERA.md` §3.1 — **cópiala tal cual** a
`src/music/chords.ts`. Resumen de familias:

| Familia | Tipos | Ejemplos |
|---|---|---|
| TRIADS | 4 | MAJOR (0,4,7), MINOR, AUGMENTED, DIMINISHED |
| SEVENTHS | 8 | DOMINANT_7, MINOR_7, MAJOR_7, MINOR_MAJOR_7, DIMINISHED_7, HALF_DIMINISHED_7, DOM_7♭5, DOM_7♯5 |
| SIXTHS | 2 | MAJOR_6 (0,4,7,9), MINOR_6 |
| SUS_ADD | 4 | SUS_4, MINOR_SUS_4, MAJOR_ADD_9 (0,4,7,14), MINOR_ADD_9 |
| EXT_9 | 7 | MAJOR_9, MINOR_9, DOMINANT_9, MAJ_6_9, MIN_6_9, DOM♭9, DOM♯9 |
| EXT_11_13 | 8 | MAJOR_11 … DOMINANT_13 (0,4,7,10,21) |

En Batisfera cada tipo tenía un botón de respuesta; aquí cada tipo es una **secuencia de
notas a cantar**. El **span máximo es 21 semitonos** (acordes de 13ª), dato clave para §3.4.

⚠️ Nota: algunos tipos de 11ª omiten la 3ª (ej. DOMINANT_11 = 0,7,10,14,17). Las linternas
se etiquetan por el grado REAL de cada intervalo (0=Fund., 7=5ª, 10=7ª, 14=9ª, 17=11ª) —
derivar la etiqueta del semitono con una tabla `intervalToDegreeLabel` (es/en), no asumir
posiciones fijas.

### 3.2 Teoría de notas (portar a TS desde `apps-src/acordes/src/music-theory.js`)

- Nombres con sostenidos: `["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]`.
- `noteToMidi("C4") = 60`; `midiToNote(midi)` inverso, siempre con sostenidos.
- `chordNotes(root, type) = type.intervals.map(i => midiToNote(noteToMidi(root) + i))`.
- `midiToFrequency(m) = 440 * 2^((m - 69) / 12)` — necesario para los targets del afinador.
- **Rango de samples: C2 (midi 36) a C7 (midi 96), inclusive.**

### 3.3 Samples de audio (CDN R2 — ya en producción, no requiere setup)

```
Base:        https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev
Nota:        {BASE}/{Instrumento}/{Nota}.mp3      ej. {BASE}/Piano/C4.mp3
Sostenidos:  el "#" va URL-encoded:               {BASE}/Piano/C%234.mp3
SFX:         {BASE}/acierto.mp3   y   {BASE}/error.mp3
```

Instrumentos (usar EXACTAMENTE estos nombres de carpeta): `Piano`, `Coro`, `Corno`,
`Cello`, `Fagot`. Sexta opción de UI: `Aleatorio` (elige uno al azar POR CUERDA de
linternas). Reproductor: portar `apps-src/acordes/src/audio-player.js` a TS (clona nodos
Audio para solapar, cache en Map, precarga con timeout 3.5 s) — igual que hizo Batisfera
(`apps-src/acordes-juego/src/audio/samples.ts`, puedes copiar ese port directamente).

Usos del reproductor en Aerostato:
- `playNote(note)` — referencia al amarrar; confirmación al encender cada linterna.
- `playChord(notes)` — recompensa al completar la cuerda; feedback "así sonaba" al expirar.

### 3.4 Registro vocal y elección de fundamental (el corazón pedagógico)

```
Registros:  Varón  F2–G4  →  MIDI [41, 67]   (26 semitonos)
            Dama   G3–A5  →  MIDI [55, 81]   (26 semitonos)
```

- Span máximo de un acorde = 21 semitonos → **siempre existe fundamental válida**.
- `validRoots(type, register) = { r ∈ [register.lo, register.hi - maxInterval(type)] }`.
- Elegir fundamental al azar dentro de `validRoots` (uniforme). Verificar además
  `r + i ∈ [36, 96]` para los samples — dentro de los registros vocales es siempre cierto,
  pero la función lo comprueba de todos modos (defensa en profundidad, patrón
  `hasSamplesFor` de la casa).
- **Las notas se cantan en su octava literal** (`r + i`), sin plegado: el jugador canta el
  acorde como estructura real apilada. NO aceptar equivalentes por pitch class ni octavas
  (misma decisión que Luis cerró para Intervalos Cantados: matching por pitch class rompe
  la estructura — ver `apps-src/intervalos-cantados-juego/NOTAS-DISENO.md` §1).
- Anti-repetición: no repetir el mismo tipo de acorde que la cuerda inmediatamente
  anterior (si el pool activo tiene > 1 tipo). Tipos recién introducidos pesan doble
  (§7.3, patrón Batisfera).

### 3.5 Pedagogía heredada de la webapp seria (referencia de diseño)

La webapp seria (`public/apps/acordes-cantar/`, solo existe compilada) hace esto — el
juego lo traduce a mecánica:

| Webapp seria | Aerostato |
|---|---|
| Setup: registro Varón/Dama | Ídem, en el menú (persistido) |
| Setup: modo de referencia (fundamental / cualquier nota) | Ídem (decisión 11) |
| "Canta el acorde": referencia + cantar nota por nota | La cuerda de linternas (decisión 7) |
| Grados mostrados por nota | Etiquetas de grado en linternas (decisión 12) |
| "Este acorde no cabe en el registro" | Nunca ocurre: `validRoots` filtra (§3.4) |
| Estadísticas por cualidad | Atlas del Aeronauta (§7.6) |
| Privacidad: "Audio 100 % local · nada se graba ni se transmite" | Mismo texto en el menú (junto al aviso de micrófono) |

### 3.6 Detección de afinación (módulo PROBADO — portar, no reinventar)

**Copiar tal cual estos dos archivos desde Intervalos Cantados juego:**

1. `apps-src/intervalos-cantados-juego/public/pitch-processor.js`
   → `public/pitch-processor.js` (AudioWorklet con YIN; postea un frame cada ~21 ms,
   silencio/no-voz llega como `frequency: -1`).
2. `apps-src/intervalos-cantados-juego/src/audio/pitch.ts`
   → `src/audio/mic.ts` (clase `MicPitchDetector` + `MicDeniedError`/`MicUnsupportedError`).

El **contrato del afinador estándar** (NO cambiar sin permiso de Luis — está calibrado):

| Constante | Valor | Significado |
|---|---|---|
| `TOLERANCE_CENTS` | ±50 | ventana alrededor del target |
| `HOLD_REQUIRED_SECONDS` | 1.5 | canto sostenido para validar la nota |
| `GRACE_SECONDS` | 0.25 | cortes menores pausan el hold (no lo resetean) |
| `MEDIAN_WINDOW` | 5 frames (~107 ms) | mata blips de octava de un frame |
| `MIN_VOICED_FRAMES` | 3 (~64 ms) | voz mínima antes de poder marcar "on pitch" |
| `STALE_FRAME_MS` | 150 | watchdog: sin frames ⇒ reportar not-on-pitch |
| Rango válido | 65–1200 Hz | cubre F2 (87 Hz) a A5 (880 Hz) con margen |

API que consume el juego: `ensureReady()` (pide permiso de mic — solo tras gesto),
`startListening(targetFreq)`, `getCurrentState() → { frequency, centsOff, isOnPitch,
holdProgress }`, `stopListening()`, `dispose()`. El loop del juego lee `getCurrentState()`
cada frame y pinta el afinador de la consola + el brillo creciente de la linterna con
`holdProgress`.

**Mic falso para QA y desarrollo:** parámetro `?fakemic=1` — sustituye el worklet por un
`OscillatorNode` interno cuya frecuencia se controla con las teclas `↑/↓` (±10 cents) y
`PageUp/PageDown` (±1 semitono), target inicial = el de la linterna activa. Implementarlo
como una clase con la MISMA interfaz (`FakePitchDetector implements PitchDetectorLike`).
Sin esto, QA de las fases 5–10 es impracticable.

Manejo de errores de mic (patrón Intervalos Cantados juego): `MicDeniedError` →
pantalla amable explicando cómo re-permitir; `MicUnsupportedError` (no HTTPS / sin
getUserMedia) → mensaje y bloqueo del inicio.

---

## 4. Stack técnico

Idéntico a Batisfera (`PLAN-CONSTRUCCION-BATISFERA.md` §4) — mismo `package.json` con
`"name": "aerostato-juego"`, Vite ^8 con `base: "./"`, TypeScript ^5.3 strict,
`three ^0.160`, **única dependencia runtime: `three`**. Persistencia en localStorage con
prefijo `aerostato-`. i18n propio (`src/i18n.ts`, `?lang=es|en`, default `es`).

**Fuentes** (única divergencia estética con la casa tech): Google Fonts **Marcellus**
(títulos — serif aeronáutica clásica) + **Rajdhani** (UI — legibilidad, continuidad con la
casa). Paleta de consola: latón `#c9a227`, crema `#f3ead7`, madera `#3d2b1f`, cielo
`#9fd4ff`. [tunable]

---

## 5. Diseño del mundo: el cielo

El eje Y del mundo three.js es la altitud, de 0 a **+750** (espejo exacto de Batisfera,
que va de 0 a −750). **Cada capa mide 150 unidades**; el altímetro interpola a metros
narrativos lineal POR CAPA. El techo del juego son **41,000 m** (guiño al récord real de
vuelo estratosférico en globo).

| # | Capa (ES / EN) | Metros narrados | Familia | Pool (n) |
|---|---|---|---|---|
| 1 | El Valle / The Valley | 0–500 m | TRIADS | 4 |
| 2 | Mar de Nubes / Sea of Clouds | 500–3,000 m | SEVENTHS | 8 |
| 3 | Cielo Abierto / Open Sky | 3,000–8,000 m | SIXTHS + SUS_ADD | 6 |
| 4 | Cielo de Auroras / Aurora Sky | 8,000–20,000 m | EXT_9 | 7 |
| 5 | Borde del Espacio / Edge of Space | 20,000–41,000 m | EXT_11_13 (+repaso) | 8 |

### 5.1 Luz y color por altitud (keyframes — interpolar linealmente por Y)

El cielo AMANECE abajo y se OSCURECE hacia el espacio. `zenith` = color del cénit del domo,
`horizon` = color del horizonte **y del fog** (misma variable, sin costuras).

| Y mundo | Metros | zenith | horizon/fog | FogExp2 density | Ambiente | Sol |
|---|---|---|---|---|---|---|
| 0 | 0 | `#7fb2e8` | `#ffd9a0` | 0.010 | 0.90 | 1.0 (dorado `#ffe3b0`) |
| 150 | 500 | `#5f9fe0` | `#cfe6f8` | 0.008 | 1.00 | 1.2 (blanco cálido) |
| 300 | 3,000 | `#3f7dd6` | `#a8cdf0` | 0.006 | 0.95 | 1.3 |
| 450 | 8,000 | `#244fae` | `#7aa8d8` | 0.004 | 0.80 | 1.4 |
| 600 | 20,000 | `#101f56` | `#3f5a94` | 0.002 | 0.60 | 1.5 (blanco duro) |
| 750 | 41,000 | `#04061c` | `#131c3c` | 0.001 | 0.40 | 1.6 |

- **Domo de cielo**: `SphereGeometry(radio ~800, BackSide)` con `ShaderMaterial` de
  gradiente vertical de 2 paradas (zenith→horizon, `smoothstep` sobre la Y normalizada del
  vértice). Los dos colores se actualizan por uniform cada frame según los keyframes.
  `scene.fog = FogExp2(horizon, density)`. NO usar `scene.background` (el domo lo es).
- **Sol**: `DirectionalLight` + sprite de glow aditivo (textura radial de canvas) colocado
  en la dirección de la luz. Elevación del sol sube con la altitud (amanecer rasante en
  capa 1 → alto y duro en capa 5). God rays estilo Batisfera (planos aditivos rotados)
  SOLO en capa 1 (haces de amanecer entre colinas).
- **Estrellas**: `THREE.Points` (~1,200) en el domo, opacidad 0 hasta Y=450, sube a 1.0
  en Y=750. En capa 5 se ve la curvatura: banda de "atmósfera" azul en el horizonte
  (anillo de gradiente en el domo, mismo shader).
- **Partículas de viento**: UN SOLO `THREE.Points` (~800 rayitas) reciclado en un cubo de
  120 u alrededor del jugador (patrón "nieve marina" de Batisfera, literal la misma
  clase adaptada); deriva según el vector de viento de la capa. Vende velocidad.
- **Esclusas de viento** (fronteras de capa — las "termoclinas" de Aerostato): disco
  horizontal de nubes turbulentas en Y = 150, 300, 450, 600 (`CircleGeometry` r=120 +
  material aditivo con textura de canvas animada por opacidad). **Cerrada** = semiopaca +
  clamp de Y del jugador. **Abierta** = se disuelve en jirones al cumplir la cuota.

### 5.2 Decorado por capa (100 % procedural, cero assets — presupuestos incluidos)

RNG sembrado (LCG, seed fija `20260717`) para que el mundo sea idéntico entre sesiones —
copiar `makeRng` de `apps-src/acordes-juego/src/3d/environment.ts`.

| Elemento | Capas | Técnica | Presupuesto |
|---|---|---|---|
| Terreno del valle (abajo) | 1–2 | `PlaneGeometry` 200×200 seg., desplazada con ruido, vertex colors (campos, río especular = franja emisiva) | 1 draw call |
| Mar de nubes (suelo de la capa 2) | 2–3 | Plano grande en Y≈140 con shader de ruido de 2 octavas scrolleando, alpha suave en bordes | 1 draw call |
| Nubes cúmulo | 1–4 | Racimos de 5–12 `THREE.Sprite` (3 texturas de canvas: gradiente radial + ruido suave), tamaño 10–40 u, deriva lenta | ~35 racimos ≈ 300 sprites vivos, reciclar por capa |
| Nubes lenticulares | 3 | 2–3 pilas de discos aplanados semitransparentes | trivial |
| Golondrinas / gansos en V | 1–2 | `InstancedMesh` (cuerpo cono + 2 alas triángulo), 40 instancias, aleteo por fase en CPU | 1 draw call |
| Halcones en círculos | 3 | ídem, 6 instancias, órbitas lentas | 1 draw call |
| Auroras | 4 | 3–5 cintas `PlaneGeometry` largas (200 u) con vertex shader de ondas seno + gradiente verde→magenta aditivo | 5 draw calls |
| Globos sonda / dirigibles lejanos | 1–5 | 3 modelos procedurales (esfera+canasta, elipsoide, cometa caja), 2–4 instancias muy lejos, deriva | ~6 draw calls |
| Ballena Celeste | 5 | Spline de cuerpo (elipsoides encadenados) + aletas planas + placas emisivas; cruza lento el campo visual | 1 grupo, 1 vez por sesión |

- Límites laterales: cilindro virtual de radio ~90 con empuje suave al centro (patrón
  Batisfera; la niebla/lejanía oculta el borde).
- **Presupuesto de rendimiento: ≥ 50 fps desktop, < 200 draw calls.** Sin sombras
  (`castShadow` OFF global — el cielo no las necesita). Sin postprocesado en v1; bloom
  aditivo se finge con sprites (patrón Batisfera).

### 5.3 Las cuerdas de linternas (el objeto de juego)

- Estructura: un **globo piloto** pequeño arriba (esfera + reflejo especular), una cuerda
  (`CatmullRomCurve3` → `TubeGeometry` delgada o `Line`) y **N linternas** colgando, una
  por nota del acorde. Separación vertical **proporcional al intervalo real** (1 semitono
  = 0.55 u [tunable]): una tríada mayor "se ve" 0-4-7 y un 13ª se ve como la torre que es.
- Linterna = farol de papel: esfera achatada (`SphereGeometry` escalada) con
  `MeshStandardMaterial` emissive + `THREE.Sprite` de halo aditivo + tapa/base cilindros.
  **Apagada**: emissive 0.08, halo mínimo, etiqueta de grado visible (sprite de texto de
  canvas). **Activa** (la que toca cantar): balanceo suave + anillo señalador.
  **Encendida**: emissive 1.0, halo grande, color de familia, revela el nombre de la nota.
  **Fantasma** (feedback al expirar): 0.35, gris-azul.
- Color por familia (MISMA paleta que Batisfera — continuidad del universo):
  TRIADS cian `#7fd7ff`, SEVENTHS violeta `#b48cff`, SIXTHS+SUS ámbar `#ffd27f`,
  EXT_9 magenta `#ff7fd0`, EXT_11_13 verde `#7fffc8`.
- NADA de `PointLight` por linterna (presupuesto): la "luz" es emissive + halo sprite.
- Spawning: 3–4 cuerdas activas simultáneas, radio 25–70 u del jugador, separadas ≥ 20 u,
  dentro de la banda Y de la capa. Deriva lenta con el viento de la capa; se reciclan si
  se alejan > 90 u. Radio de click lógico = 1.5× el visual (raycast contra esfera
  invisible que envuelve toda la cuerda, patrón Batisfera).

---

## 6. La canastilla (cockpit)

Híbrido 3D + overlay HTML (el overlay es más nítido y bilingüe — patrón Batisfera §8):

**En 3D (hijos de la cámara):**
- Borde de la canastilla: toro/cilindros bajos con textura de mimbre generada en canvas
  (líneas entrecruzadas), visible al mirar abajo.
- 4 cuerdas (`CylinderGeometry` delgadas) subiendo fuera del encuadre hacia el globo.
- **Al mirar arriba: la boca del globo** (disco/cono interior con gradiente cálido) y el
  **quemador**: cono + sprite de llama aditivo que RUGE (escala + brillo) al ascender o al
  completar una cuerda. Es el "efecto firma" del juego, cuídalo.
- Balanceo procedural de cámara: roll ±1°, seno lento (flotar, no nadar).

**En overlay HTML/CSS (la CONSOLA DE LATÓN, parte inferior):**
- **El Afinador** (canvas 2D, centro, ~260×90 px): aguja horizontal de cents (−50…+50),
  zona verde central, lectura de Hz/nota detectada, y el **anillo de hold** (0→1.5 s) que
  se llena alrededor. Es el instrumento principal — más grande que todo lo demás.
- **La cuerda actual**: fila de medallones-linterna (grado + estado apagada/activa/
  encendida) + nombre del acorde anunciado + botón "🔊 Referencia" (re-escucha ilimitada,
  sin penalización).
- **Temporizador de viento**: cuerda que se deshilacha (barra estilizada) por cuerda de
  linternas.
- **Altímetro**: metros narrativos + nombre de la capa (mapeo lineal por capa, §5).
- **Catalejo de viento** (canvas ~120 px): franja de brújula con blips = cuerdas activas
  según el yaw de la cámara (el "sonar" de Aerostato).
- **Medidor de modo**: gas (contrarreloj) o 3 parches de tela (supervivencia).
- **Score + racha** arriba a la derecha; racha con animación al crecer.
- Rasgaduras de tela (supervivencia): overlay CSS de jirones ondeando en las esquinas +
  silbido de viento (WebAudio).
- Viñeta CSS cálida (madera/latón en los bordes inferiores) — vende la canastilla gratis.

---

## 7. Gameplay

### 7.1 Máquina de estados por cuerda de linternas

```
EXPLORANDO ──(click en cuerda | proximidad < 12 u + tecla E)──► AMARRADO
  AMARRADO: · el globo se frena suave (auto-hover, inputs de movimiento ignorados)
            · consola anuncia el acorde: "Sol · 7ª menor" (nombre es/en de la tabla 3.1)
            · suena la NOTA DE REFERENCIA (fundamental o aleatoria según ajuste §2.11)
            · empieza el temporizador de viento (§7.2)
            · linterna 1 (la más grave) pasa a ACTIVA; mic empieza a escuchar su target
  AMARRADO/CANTANDO linterna i:
            · afinador pinta getCurrentState() cada frame; el brillo de la linterna
              crece con holdProgress (¡se enciende poco a poco mientras sostienes!)
            · holdProgress = 1 → linterna i ENCENDIDA: suena su nota (sample), +2 pts,
              revela nombre; i+1 pasa a ACTIVA
            · botón Referencia / tecla R: re-escucha (ilimitado)
            · tecla S o botón "Soltar cuerda": abandona sin completar (racha a 0, la
              cuerda queda; sin rasgadura) — válvula anti-atasco vocal
  AMARRADO ──(todas encendidas)──► COMPLETADA
      · SFX acierto.mp3 + suena el ACORDE COMPLETO armónico + rugido del quemador
      · la cuerda se suelta y asciende brillando; +altitud (empujón ~6 u [tunable])
      · racha += 1 ; score += 10 + racha*2 ; medalla de precisión (§7.6) ; Atlas
      · spawn de reemplazo (mantener 3–4 activas)
  AMARRADO ──(temporizador de viento = 0)──► PERDIDA
      · SFX error.mp3 ; racha = 0 ; Atlas registra intento
      · feedback pedagógico: las linternas restantes se encienden en FANTASMA una a una
        (arpegio rápido) y luego suena el acorde completo — "así sonaba"
      · la cuerda se desprende y se pierde en el viento (despawn ~1.5 s)
      · en Supervivencia: además, 1 rasgadura de tela
      · vuelve a EXPLORANDO
```

- Solo UNA cuerda puede estar AMARRADA a la vez. Amarrar otra suelta la anterior sin
  penalización (estado vuelve a intacto).
- Alejarse no aplica (estás amarrado, el globo está en hover). `Esc` = pausa (congela
  temporizador y mic).
- **Nota desafinada NUNCA castiga** (decisión 8): el afinador te guía, el reloj presiona.

### 7.2 Temporizador de viento

`T = 12 + 10 × n` segundos, con n = número de notas del acorde [tunable].
(Tríada: 42 s · séptima: 52 s · 13ª de 7 notas: 82 s.) El hold de 1.5 s por nota hace
que el mínimo teórico sea ~2 s/nota; el resto es tiempo de búsqueda vocal. En
Contrarreloj el temporizador de viento NO existe (el gas global ya presiona).

### 7.3 Progresión dentro de cada capa (pools incrementales — patrón Batisfera §6.3)

Los tipos se introducen por grupos (grupo 2 al llegar a la mitad de la cuota; grupo 3, si
existe, a 3/4). **Copiar la tabla de grupos de Batisfera §6.3 tal cual** (misma partición
de las 5 zonas/capas). Tipos recién introducidos pesan doble en el sorteo.

**Repaso en capa 5:** tras la mitad de la cuota, 1 de cada 3 cuerdas nuevas es "canto del
pasado": acorde de CUALQUIER capa anterior (aquí no hay límite de botones que cuidar —
solo se canta). La consola lo anuncia con su familia y color.

### 7.4 Modos de juego

| | **Expedición** (clásico) | **Contrarreloj** (gas) | **Supervivencia** (tela) |
|---|---|---|---|
| Inicio | Capa más alta desbloqueada (o el valle) | Valle | Valle |
| Cuota para abrir esclusa | 6 cuerdas | 3 cuerdas | 4 cuerdas |
| Recurso | Ninguno (sin muerte) | Gas: 120 s inicial, **+6 s por linterna, +15 s por cuerda completa** | Tela: 3 de integridad |
| Cuerda perdida | Racha = 0 | Racha = 0 (el gas ya castiga) | Ídem + **1 rasgadura** |
| Fin | Techo del mundo (41,000 m) → créditos + resumen | Gas = 0 → descenso, resumen con altitud máx | 3 rasgaduras → descenso de emergencia, resumen |
| Desbloqueo persistente | SÍ: abre capas para todos los modos | No | No |

Todos los valores [tunable]. Puntuación en todos los modos: racha primero, luego
`10 + racha × 2` por cuerda (primera = 12) + 2 por linterna + bonus 50 por capa + medalla
(oro +10, plata +5) + Ballena Celeste ×2 sobre el total de su cuerda.

### 7.5 La Ballena Celeste

1 vez por sesión en capa 5: cruza lentamente a 40–60 u con una cuerda de linternas de
acorde de 13ª en el lomo. Amarrarse a ella funciona igual (ella sigue nadando lento,
el globo la acompaña). Vale ×2 y tiene entrada propia destacada en el Atlas.

### 7.6 Atlas del Aeronauta (colección = estadísticas)

Pantalla desde el menú y el resumen. Una entrada por tipo de acorde (33), agrupadas por
capa, contador `12/33 catalogadas`:

- Estados: **No avistada** (silueta), **Intentada** (constelación tenue), **Completada**
  (constelación de linternas dibujada con sus intervalos reales + datos).
- Datos: nombre es/en, familia/capa, intentos, completadas, mejor racha, fecha de primera
  completada, y **mejor precisión media** (media de |cents| de todas las notas de la mejor
  pasada) con **medalla**: 🥇 oro ≤ 15 cents · 🥈 plata ≤ 30 · 🥉 bronce > 30 [tunable].
- Es el equivalente de las estadísticas de la webapp seria con piel de cuaderno de
  expedición aeronáutica.

### 7.7 Persistencia (localStorage — guardar tras CADA cuerda resuelta)

| Clave | Contenido |
|---|---|
| `aerostato-progress` | `{ unlockedLayer: 1..5, expeditionBest, timeAttackBest, survivalBest }` |
| `aerostato-atlas` | `{ [chordTypeId]: { attempts, completed, bestStreak, bestAvgCents, firstCompletedISO } }` |
| `aerostato-settings` | `{ instrument, volume, register: "male"|"female", refMode: "root"|"any", showNames: bool }` |

---

## 8. Controles

### Desktop (v1 — móvil fuera de alcance, decisión 17)

| Input | Acción |
|---|---|
| `W/S` o `↑/↓` | Avanzar / retroceder hacia donde miras |
| `A/D` o `←/→` | Strafe lateral |
| `Q/E` o `Space/Shift` | Ascender / descender puro (quemador / válvula) |
| Drag botón izquierdo (sobre cielo) | Mirar (yaw libre, pitch clamp ±85°) |
| Click (sin drag: < 5 px, < 250 ms) | Amarrarse a una cuerda (raycast) |
| `E` (cerca de una cuerda, < 12 u) | Amarrarse (alternativa sin puntería) |
| `R` | Re-escuchar referencia |
| `S` sostenida 0.5 s (amarrado) | Soltar cuerda |
| `Esc` | Pausa / menú |

**SIN pointer lock, cursor siempre visible** (pointer sobre cuerdas — hover-raycast con
throttle ~10/s). Física: velocidad máx 6 u/s horizontal, 4 u/s vertical, aceleración
exponencial LENTA (lerp α~0.03 — masa de globo, más pesado que Batisfera) + deriva de
viento constante por capa (~0.4 u/s, dirección fija por capa vía RNG sembrado).
**Cantar no requiere manos: durante AMARRADO el movimiento se ignora** — el jugador solo
canta y mira.

---

## 9. SFX y música

- SFX de assets R2: `acierto.mp3` (cuerda completa), `error.mp3` (cuerda perdida).
- SFX WebAudio sintetizados (osciladores + noise + envolventes, CERO assets — patrón
  `synth-sfx.ts` de Batisfera): rugido del quemador (noise filtrado + sub), viento por
  capa (noise loop, gana con la altitud y la velocidad), crujido de mimbre (ráfagas cortas
  al acelerar), campanilla al encender linterna (opcional, ADEMÁS del sample de la nota),
  silbido de rasgadura, chasquido de amarre.
- La nota de cada linterna encendida y el acorde completo suenan con el TIMBRE elegido
  (samples R2) — son la recompensa pedagógica central, no adornos.
- Música ambiental: Luis la producirá después — dejar `startAmbient(layer)` como stub
  documentado (patrón Batisfera §15).

---

## 10. Pantallas y flujo de UI

```
[MENÚ PRINCIPAL]
  título AEROSTATO + tagline ("Asciende. Canta. Ilumina." / "Ascend. Sing. Illuminate.")
  · Modo: Expedición | Contrarreloj | Supervivencia
  · Registro vocal: Varón F2–G4 | Dama G3–A5
  · Timbre: Piano | Coro | Corno | Cello | Fagot | Aleatorio · Volumen (slider)
  · Referencia: Fundamental | Cualquier nota   · Toggle "Mostrar nombres de nota"
  · En Expedición: capa inicial (solo desbloqueadas)
  · Botón ATLAS · Botón INICIAR ASCENSO (aquí se pide el micrófono + unlock de audio)
  · Nota de privacidad del mic + crédito obligatorio (decisión §0.6)
[PERMISO MIC DENEGADO] pantalla amable con instrucciones de re-permitir (patrón §3.6)
[JUEGO] canvas + consola  → pausa (Esc): reanudar / abandonar ascenso
[TRANSICIÓN DE CAPA] overlay 2.5 s: nombre de capa + metros + familia nueva
[RESUMEN] cuerdas completadas, precisión media en cents, mejor racha, altitud máx,
  medallas nuevas → Reintentar / Menú / Atlas
[ATLAS] grid por capas, 33 constelaciones, 3 estados + medallas
```

i18n: TODOS los textos vía `src/i18n.ts` (`{ es: {...}, en: {...} }`, helper `t(key)`,
`data-i18n` en HTML estático). Nombres de acordes: columnas ES/EN de la tabla 3.1.
Audio-unlock: INICIAR ASCENSO es el gesto — ahí se llama `ensureReady()` del mic, se
precargan SFX y primeras notas.

---

## 11. Estructura de archivos objetivo

```
C:\Users\Luis\Documents\claude_code\aerostat\
├── PLAN-CONSTRUCCION-AEROSTATO.md   ← este documento
├── BITACORA-DESARROLLO.md           ← lo mantiene el agente (crear en F0)
├── package.json / tsconfig.json / vite.config.ts / index.html
├── public/
│   └── pitch-processor.js           ← COPIA VERBATIM (§3.6)
├── scripts/copy-dist.mjs            ← F11 (adaptar de Walking AP Multi)
└── src/
    ├── main.ts            ← bootstrap: lang, pantallas, unlock audio+mic, crea Game
    ├── i18n.ts            ← diccionario es/en + t()
    ├── style.css          ← pantallas, consola latón, viñeta, Marcellus/Rajdhani
    ├── config.ts          ← TODOS los [tunable]: capas, keyframes, física, tiempos, cuotas
    ├── music/
    │   ├── chords.ts      ← tabla 3.1 completa + intervalToDegreeLabel
    │   └── theory.ts      ← noteToMidi, midiToNote, midiToFrequency, chordNotes, validRoots
    ├── audio/
    │   ├── samples.ts     ← AudioPlayer TS (cache, playNote, playChord, SFX R2)
    │   ├── mic.ts         ← MicPitchDetector portado + FakePitchDetector (?fakemic=1)
    │   └── synth-sfx.ts   ← quemador, viento, mimbre, rasgadura (WebAudio, sin assets)
    ├── game/
    │   ├── state.ts       ← GameStateManager: modo, capa, pools, cuotas, score, racha,
    │   │                     gas/tela, máquina de estados de cuerda, eventos (subscribe)
    │   ├── questions.ts   ← sorteo de tipo + fundamental (§3.4) con pesos y anti-repetición
    │   └── persistence.ts ← load/save progress, atlas, settings
    ├── 3d/
    │   ├── renderer.ts    ← escena, cámara, loop, resize, raycast click/hover
    │   ├── player.ts      ← controles, física de globo, viento, límites, clamps
    │   ├── environment.ts ← domo shader, sol, keyframes §5.1, esclusas, partículas viento
    │   ├── scenery.ts     ← terreno, mar de nubes, cúmulos, fauna decorativa, ballena (§5.2)
    │   ├── lanterns/
    │   │   ├── string.ts  ← clase LanternString: acorde, estados, encendido, fantasma
    │   │   └── manager.ts ← spawn/despawn, deriva, asignación de acordes, ballena
    │   └── basket.ts      ← canastilla, cuerdas, quemador, boca del globo
    └── ui/
        ├── screens.ts     ← menú, transición de capa, resumen, pausa, mic-denegado
        ├── hud.ts         ← consola: cuerda actual, altímetro, medidores, feedback
        ├── tuner.ts       ← canvas del afinador (aguja de cents + anillo de hold)
        ├── compass.ts     ← canvas del catalejo de viento
        └── atlas.ts       ← pantalla de colección/estadísticas
```

Regla de dependencias (patrón Batisfera §11): `game/` NO importa de `3d/` ni `ui/`
(lógica pura); `3d/` y `ui/` se suscriben al `GameStateManager` (observer).

---

## 12. El afinador en pantalla (especificación del instrumento central)

Canvas 2D, redibujado cada frame con `getCurrentState()`:

- Escala horizontal −50…+50 cents; marcas cada 10; zona verde ±15 [tunable solo visual].
- Aguja con suavizado exponencial (lerp 0.2) sobre `centsOff` — sin nervosismo.
- Sin voz (`frequency = 0`): aguja cae al centro atenuada, texto "Escuchando…" / "Listening…".
- `isOnPitch = true`: la aguja y el arco se tiñen del color de la familia; el **anillo de
  hold** alrededor del afinador se llena con `holdProgress` y la linterna activa brilla
  en paralelo (mismo valor). Al llegar a 1: flash + nota.
- Bajo el afinador: nota detectada (`midiToNote` del target más cercano) + Hz — SOLO si
  el toggle "Mostrar nombres" está ON; si está OFF, muestra únicamente la desviación
  (el jugador no debe leer la respuesta en el afinador).
- Fuera de rango grueso (> 200 cents): flecha ▲/▼ indicando la dirección (¿estás una
  octava abajo? sube) — crucial para principiantes.

---

## 13. Fases de construcción (con criterios de aceptación)

> Tras CADA fase: `npm run build` limpio (incluye `tsc --noEmit`) y entrada en
> `BITACORA-DESARROLLO.md`.

**F0 — Scaffold.** package.json, tsconfig strict, vite.config (`base: "./"`), index.html
con secciones de pantalla vacías, style.css base (fuentes, paleta latón), main.ts que
muestra el menú, i18n.ts con las claves del menú.
✓ `npm run dev` levanta; título AEROSTATO visible en es y en `?lang=en`.

**F1 — Música y samples.** `music/` completo, `audio/samples.ts`.
✓ En consola del navegador: `chordNotes("F2", DOMINANT_13)` correcto;
`validRoots(MAJOR_13, MALE)` ⊆ [41, 46]; botón temporal reproduce nota y acorde en piano
y coro; `F#3` suena (el `%23` va bien).

**F2 — Afinador.** Copiar worklet + portar `mic.ts`; `FakePitchDetector`; `ui/tuner.ts`
en una pantalla-arnés temporal (target fijo A3).
✓ Con mic real: cantar A3 llena el anillo en 1.5 s y valida; soltar antes de 0.25 s no
resetea el hold (gracia); con `?fakemic=1` las teclas mueven la aguja de forma determinista.
✓ Permiso denegado muestra la pantalla amable.

**F3 — Mundo y navegación.** `3d/renderer.ts`, `player.ts`, `environment.ts` (sin
cuerdas de linternas; esclusas visibles pero no bloqueantes).
✓ Vuelas de 0 a +750; domo/fog/sol/estrellas transicionan según §5.1; partículas de
viento visibles; god rays solo abajo; inercia "pesada" y deriva por capa se sienten;
60 fps desktop.

**F4 — Escenografía.** `scenery.ts`: terreno, mar de nubes, cúmulos, aves, auroras,
globos lejanos (sin ballena).
✓ Cada capa tiene identidad visual reconocible de un vistazo; draw calls < 200; ≥ 50 fps.

**F5 — Canastilla y consola.** `basket.ts`, `ui/hud.ts`, `ui/compass.ts` (blips falsos),
altímetro real (mapeo Y→metros por capa §5), afinador integrado en la consola.
✓ Canastilla + quemador visibles (el quemador ruge al ascender); consola completa con
datos reales; viñeta cálida.

**F6 — Cuerdas de linternas y loop de canto.** `lanterns/`, `game/state.ts` (máquina
§7.1), `questions.ts`, amarre por click y por proximidad+E, canto nota a nota con mic,
encendido progresivo, completada/perdida con sus feedbacks, temporizador de viento.
✓ Con `?fakemic=1`: completar una tríada enciende 3 linternas (cada una suena), suena el
acorde completo y el globo recibe el empujón; dejar expirar muestra el arpegio fantasma;
racha y score correctos (10 + racha×2 + 2/linterna).

**F7 — Expedición completa.** Cuotas, esclusas bloqueantes que se abren, pools
incrementales por grupos, transiciones de capa, repaso en capa 5, resumen final, techo
del mundo.
✓ Partida completa jugable del valle al techo (cuota reducida temporal para QA); las
esclusas no dejan pasar antes de cuota; el repaso anuncia familia y color correctos.

**F8 — Contrarreloj y Supervivencia.** Gas (+6 s/linterna, +15 s/cuerda), rasgaduras
(overlay + lógica + silbido), reglas §7.4.
✓ Los tres modos terminables con resumen correcto; el gas se congela en pausa.

**F9 — Atlas y persistencia.** `persistence.ts`, `ui/atlas.ts`, medallas de precisión,
guardado tras cada cuerda, desbloqueo persistente.
✓ Cerrar y reabrir conserva todo; los 3 estados + medallas se ven; `bestAvgCents` solo
mejora (nunca empeora).

**F10 — Ballena Celeste, pulido y QA.** `scenery.ts` ballena + su cuerda ×2; balanceo de
cámara; pulido de partículas del quemador; checklist §14 completo; `npm run build` +
`npm run preview` + `?lang=en`.
✓ Checklist §14 al 100 %.

**F11 — Migración al website. ⚠️ SOLO CON OK EXPLÍCITO DE LUIS.** Pasos en §15.

---

## 14. Checklist de QA manual (F10)

- [ ] Los 33 tipos se pueden cantar (al menos 2 por capa con `?fakemic=1`, timbres Piano
      y Fagot; ningún 404 de mp3 en Network).
- [ ] Fundamental con sostenido suena (ej. F#2 en registro varón) — `%23` correcto.
- [ ] `Aleatorio` cambia de timbre entre cuerdas.
- [ ] Registro Dama: todos los targets caen en G3–A5; registro Varón: en F2–G4.
- [ ] Modo referencia "Cualquier nota" reproduce una nota ≠ fundamental a veces.
- [ ] Re-escuchar referencia ilimitado no penaliza.
- [ ] El hold respeta la gracia de 0.25 s (toser no resetea) y el watchdog de 150 ms
      (suspender el mic no deja un "on pitch" congelado).
- [ ] Flechas ▲/▼ del afinador aparecen al cantar una octava equivocada.
- [ ] Toggle "Mostrar nombres" OFF: ni linternas ni afinador revelan nombres de nota
      antes de encender.
- [ ] Esclusa no deja pasar antes de cuota; se disuelve después.
- [ ] Repaso en capa 5: 1 de cada 3 tras media cuota, familia/color correctos.
- [ ] Gas llega a 0 → resumen con altitud máx; +6 s por linterna y +15 s por cuerda exactos.
- [ ] 3 rasgaduras → descenso de emergencia; los jirones se acumulan visualmente.
- [ ] Ballena Celeste aparece en capa 5, vale ×2, entra al Atlas.
- [ ] Soltar cuerda (S sostenida) resetea racha pero NO rasga tela.
- [ ] `?lang=en` traduce TODO (menú, consola, capas, resumen, atlas, nombres de acordes,
      etiquetas de grado).
- [ ] Sin audio ni mic antes del gesto INICIAR ASCENSO.
- [ ] Guardado tras cada cuerda: matar la pestaña a media partida no pierde el Atlas.
- [ ] `Esc` pausa: temporizador de viento, gas y mic congelados.
- [ ] Sin errores en consola del navegador en una partida completa.
- [ ] Móvil: fuera de alcance v1 (documentado); el layout no explota en ventana angosta.

---

## 15. Migración al website (F11 — solo con OK de Luis)

0. Copiar el proyecto (sin `node_modules`, sin `dist`) de
   `C:\Users\Luis\Documents\claude_code\aerostat\` a
   `<repo sitio>\apps-src\acordes-cantar-juego\` (convención: `<slug>-juego`).
1. `scripts/copy-dist.mjs` igual al de Walking AP Multi
   (`apps-src/oido-absoluto-multi-juego/scripts/copy-dist.mjs`) con target
   `public/apps/acordes-cantar-juego`. Respetar `STORM_WEBSITE_ROOT` (⚠️ el default de ese
   script apunta a una ruta vieja de Cowork — usar la raíz real del repo actual).
2. `npm install && npm run deploy` dentro de `apps-src/acordes-cantar-juego`.
3. Página `app/[locale]/apps/acordes-cantar/juego/page.tsx` calcada de
   `app/[locale]/apps/oido-absoluto-multi/juego/page.tsx`:
   - título: `Aerostato — Modo juego de Cantar Acordes` / `Aerostat — Sing Chords game mode`
   - `getLocalizedRouteUrls("/apps/acordes-cantar/juego")`, `noIndex: true`
   - `background="#0a1428"`, badge `{ label: es ? "Modo juego 3D" : "3D game mode",
     bg: "rgba(255,210,127,0.14)", border: "rgba(255,210,127,0.35)", color: "#ffd27f" }`
   - tagline: `Asciende · Canta · Ilumina` / `Ascend · Sing · Illuminate`
   - iframe `src={`/apps/acordes-cantar-juego/index.html?lang=${locale}`}` con
     `allow="autoplay; microphone"` ← ¡el `microphone` es NUEVO respecto a Batisfera y
     obligatorio, sin él el iframe no puede pedir mic!
4. En `data/apps/apps-catalog.ts`, entrada `slug: "acordes-cantar"`: añadir
   `gameUrl: "/apps/acordes-cantar/juego"`,
   `gameLabel: { es: "Modo juego 3D", en: "3D game mode" }` y feature nueva al inicio:
   `{ es: "Modo juego 3D: Aerostato, asciende al borde del espacio encendiendo linternas con tu voz",
      en: "3D game mode: Aerostat, ascend to the edge of space lighting lanterns with your voice" }`.
5. Probar en el sitio local `/es/apps/acordes-cantar/juego` y `/en/...` — verificar que el
   mic FUNCIONA dentro del iframe (paso 3, `allow`).
6. NO hacer commit/push sin que Luis lo pida.

---

## 16. Trampas conocidas / notas técnicas

- **`allow="autoplay; microphone"` en el iframe** — la trampa nueva de este juego. Sin
  `microphone` en el atributo `allow`, `getUserMedia` falla dentro del iframe aunque el
  usuario dé permiso. Probarlo ANTES de dar F11 por terminada.
- **El mic requiere contexto seguro** (HTTPS o localhost). `npm run dev` en 127.0.0.1
  funciona; abrir el index.html por `file://` NO.
- **`# → %23`** en URLs de samples, siempre.
- **`base: "./"` en Vite es obligatorio** (el juego vive bajo `/apps/acordes-cantar-juego/`).
- **Un solo AudioContext** compartido entre samples-unlock, synth-sfx y el worklet del mic
  (creado tras el gesto). No crear contextos por módulo.
- **El worklet se carga con `?v=N`** para bust de cache (patrón del original) — si tocas
  `pitch-processor.js`, sube el número.
- **Domo y fog**: el color de horizonte del domo y el del fog son LA MISMA variable o se
  ve la costura. El domo NO recibe fog (`material.fog = false`).
- **Raycast con throttle** (~10/s para hover) y solo contra las esferas de colisión de las
  cuerdas.
- **Sprites de nubes**: 3 texturas de canvas compartidas entre TODOS los sprites (no
  generar una por sprite); reciclar racimos entre capas, no crear/destruir.
- **Cero `PointLight` dinámicos** por linterna/llama: emissive + halos. El presupuesto de
  luces es: ambiente + sol + (opcional) 1 luz cálida fija de la canastilla.
- **localStorage dentro de iframe** funciona (mismo origen); guardar tras CADA cuerda.
- **`tsc --noEmit` corre en `npm run build`**: mantener tipado siempre.
- Los tipos de 11ª sin 3ª (§3.1 ⚠️): derivar etiquetas de grado del semitono real.
- El altímetro es narrativo: Y ∈ [0, 750] son 41,000 m narrados, lineal POR CAPA (§5).
- SFX sintetizados con WebAudio, no buscar assets. Música ambiental: stub
  `startAmbient(layer)` para cuando Luis entregue audio.
- **Pausa** debe congelar: temporizador de viento, gas, deriva del globo Y el tracking del
  mic (`stopListening()` al pausar, `startListening(target)` al reanudar — no dejar el
  hold corriendo en pausa).
