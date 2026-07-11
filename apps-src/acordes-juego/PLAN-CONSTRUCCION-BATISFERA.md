# BATISFERA — Plan maestro de construcción

**Videojuego 3D de reconocimiento de acordes para Storm Studios Learning**
Documento de handoff escrito por Claude (Fable 5) el 2026-07-11, con decisiones de diseño
aprobadas por Luis Cárdenas. Este documento es **autocontenido**: un agente (Codex, Gemini,
Claude) o un desarrollador humano debe poder construir el juego completo leyendo solo esto.

> **Estado actual del proyecto: SOLO EXISTE ESTE DOCUMENTO.** No hay código aún.
> La carpeta de trabajo es `D:\claude_code\acordes-reconocer-webapp-juego\`.

---

## 0. Instrucciones para el agente que continúe

1. Trabaja **por fases en orden** (sección 12). No saltes fases: cada una tiene criterios
   de aceptación verificables.
2. Mantén un archivo `BITACORA-DESARROLLO.md` en la raíz: al terminar cada fase anota
   fecha, qué se hizo, decisiones tomadas y pendientes. El siguiente agente empezará leyéndolo.
3. **No renegocies las decisiones de diseño** de la sección 2: ya fueron discutidas y
   aprobadas por Luis. Si algo es técnicamente imposible, anótalo en la bitácora y
   pregunta a Luis antes de cambiar el diseño.
4. **NO ejecutes la fase 10 (migración al website) sin confirmación explícita de Luis.**
   El juego se desarrolla y prueba standalone en esta carpeta primero.
5. Idioma del código: identificadores y comentarios en inglés o español (consistente con
   los juegos existentes, que mezclan); textos de UI SIEMPRE bilingües es/en vía i18n.
6. Crédito obligatorio en el menú: *"Desarrollado por Luis Cardenas para Storm Studios Learning"*.

---

## 1. Contexto: la plataforma Storm Studios

Sitio: https://www.stormstudios.com.mx — plataforma de educación musical (Next.js 15 +
next-intl es/en). Repo local del sitio:

```
C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios
```

Patrón de la casa: cada app de entrenamiento auditivo tiene dos experiencias:

| Experiencia | Ruta | Qué es |
|---|---|---|
| Webapp "seria" | `/es/apps/acordes/jugar` | Entrenador configurable con estadísticas |
| Videojuego | `/es/apps/<slug>/juego` | Juego temático con la misma pedagogía |

Ambas son **apps Vite independientes** en `apps-src/<nombre>/` del repo del sitio,
compiladas a `dist/` y copiadas a `public/apps/<nombre>/` con un script `copy-dist.mjs`.
El sitio las embebe con un `<iframe src="/apps/<nombre>/index.html?lang={locale}">` dentro
del componente `GameShell`.

Videojuegos existentes (referencia de estilo y arquitectura):

| Juego | App base | Estilo | Fuente |
|---|---|---|---|
| Cosmic Ear | Desglose | Nave 3D, cantar notas | `public/apps/cosmic-ear/js/app.jsx` |
| Synth-Kong | Intervalos–Reconocimiento | Retro 2D, 20 sectores | `public/apps/intervalos-reconocimiento-juego/` |
| Intervalos Cantados juego | Intervalos–Cantados | Torreta, cantas para disparar | `apps-src/intervalos-cantados-juego/` |
| Walking AP Multi | Oído Absoluto Multi | **3D three.js, primera persona** | `apps-src/oido-absoluto-multi-juego/` |

**Walking AP Multi es el modelo arquitectónico a seguir** (three.js 0.160 + Vite + TS,
carpetas `src/3d`, `src/game`, `src/audio`, `src/ui`, `src/i18n.ts`).

**BATISFERA** es el videojuego de la app **"Reconocimiento de Acordes"**
(slug `acordes`, webapp seria en `apps-src/acordes/` — vanilla JS, léela: es la
referencia pedagógica). La webapp seria ya existe; este proyecto es SOLO el videojuego.

---

## 2. Decisiones de diseño CERRADAS (aprobadas por Luis)

1. **Nombre:** *Batisfera* (ES) / *Bathysphere* (EN).
2. **Concepto:** desciendes en un sumergible de burbuja de cristal (tipo batisfera de
   biólogos abisales) hacia una fosa oceánica. La luz disminuye con la profundidad.
3. **3D en primera persona** desde dentro de la cabina, con three.js (como Walking AP Multi).
4. **Navegación libre 3D**: WASD + mirar con mouse (drag). Elegida sobre descenso
   automático y sobre control solo-vertical.
5. **Cursor SIEMPRE visible, SIN pointer lock**: Luis quiere "tocar" las criaturas con el
   mouse. Mirar = arrastrar sobre agua vacía; tocar criatura = click directo sobre ella.
6. **Las criaturas son el botón de audio**: al tocarlas suena su acorde (re-click =
   re-escuchar, ilimitado). Respondes en la consola de la cabina qué cualidad es.
7. **Error = la criatura huye al PRIMER fallo** (un solo intento por criatura). Elegido
   sobre "segunda oportunidad". En supervivencia además agrieta el casco.
8. **Acierto = captura** (escaneo/foto): la criatura se registra en la *Bitácora del
   biólogo* (colección + estadísticas por tipo de acorde).
9. **Pocas especies visuales** (6–7 modelos procedurales) reutilizadas con variantes de
   color/brillo; NO una criatura distinta por cada uno de los 33 acordes.
10. **Profundidad = complejidad**: las 5 zonas oceánicas reales mapean a las 5 familias
    de acordes de la webapp seria (sección 5).
11. **Los tres modos de la casa:** Expedición (clásico), Contrarreloj (oxígeno),
    Supervivencia (integridad del casco).
12. Bilingüe es/en vía `?lang=`, 5 timbres de R2, estadísticas en localStorage —
    igual que todos los juegos de la plataforma.

---

## 3. Datos musicales (autoritativos — copiar tal cual)

### 3.1 Los 33 tipos de acorde

Fuente original: `apps-src/acordes/src/chord-types.js` del repo del sitio. Tabla completa
(intervalos en semitonos desde la fundamental):

| id | ES | EN | Familia | Intervalos |
|---|---|---|---|---|
| MAJOR | Mayor | Major | TRIADS | 0,4,7 |
| MINOR | Menor | Minor | TRIADS | 0,3,7 |
| AUGMENTED | Aumentado | Augmented | TRIADS | 0,4,8 |
| DIMINISHED | Disminuido | Diminished | TRIADS | 0,3,6 |
| DOMINANT_7 | 7ª dominante | Dominant 7 | SEVENTHS | 0,4,7,10 |
| MINOR_7 | 7ª menor | Minor 7 | SEVENTHS | 0,3,7,10 |
| MAJOR_7 | 7ª mayor | Major 7 | SEVENTHS | 0,4,7,11 |
| MINOR_MAJOR_7 | Menor Maj7 | Minor major 7 | SEVENTHS | 0,3,7,11 |
| DIMINISHED_7 | Disminuido 7 | Diminished 7 | SEVENTHS | 0,3,6,9 |
| HALF_DIMINISHED_7 | Semidisminuido | Half-diminished | SEVENTHS | 0,3,6,10 |
| DOMINANT_7_FLAT_5 | 7ª dom ♭5 | Dominant 7 ♭5 | SEVENTHS | 0,4,6,10 |
| DOMINANT_7_SHARP_5 | 7ª dom ♯5 | Dominant 7 ♯5 | SEVENTHS | 0,4,8,10 |
| MAJOR_6 | Mayor 6 | Major 6 | SIXTHS | 0,4,7,9 |
| MINOR_6 | Menor 6 | Minor 6 | SIXTHS | 0,3,7,9 |
| SUS_4 | Sus4 | Sus4 | SUS_ADD | 0,5,7 |
| MINOR_SUS_4 | Menor sus4 | Minor sus4 | SUS_ADD | 0,3,5,7 |
| MAJOR_ADD_9 | Mayor add9 | Major add9 | SUS_ADD | 0,4,7,14 |
| MINOR_ADD_9 | Menor add9 | Minor add9 | SUS_ADD | 0,3,7,14 |
| MAJOR_9 | Maj 9 | Maj 9 | EXT_9 | 0,4,7,11,14 |
| MINOR_9 | Min 9 | Min 9 | EXT_9 | 0,3,7,10,14 |
| DOMINANT_9 | Dom 9 | Dom 9 | EXT_9 | 0,4,7,10,14 |
| MAJOR_6_9 | Maj 6/9 | Maj 6/9 | EXT_9 | 0,4,7,9,14 |
| MINOR_6_9 | Min 6/9 | Min 6/9 | EXT_9 | 0,3,7,9,14 |
| DOMINANT_FLAT_9 | Dom ♭9 | Dom ♭9 | EXT_9 | 0,4,7,10,13 |
| DOMINANT_SHARP_9 | Dom ♯9 | Dom ♯9 | EXT_9 | 0,4,7,10,15 |
| MAJOR_11 | Maj 11 | Maj 11 | EXT_11_13 | 0,4,7,11,17 |
| MINOR_11 | Min 11 | Min 11 | EXT_11_13 | 0,3,7,10,17 |
| DOMINANT_11 | Dom 11 | Dom 11 | EXT_11_13 | 0,7,10,14,17 |
| DOMINANT_SHARP_11 | Dom ♯11 | Dom ♯11 | EXT_11_13 | 0,7,10,14,18 |
| MAJOR_SHARP_11 | Maj ♯11 | Maj ♯11 | EXT_11_13 | 0,7,11,14,18 |
| MAJOR_13 | Maj 13 | Maj 13 | EXT_11_13 | 0,4,7,11,21 |
| MINOR_13 | Min 13 | Min 13 | EXT_11_13 | 0,3,7,10,21 |
| DOMINANT_13 | Dom 13 | Dom 13 | EXT_11_13 | 0,4,7,10,21 |

Nota: la webapp seria agrupa EXT_9 y EXT_11_13 en una sola familia "EXTENSIONS"; el juego
las separa en dos zonas (decisión de diseño, sección 5). Conserva ambos ids de familia.

### 3.2 Teoría de notas (portar a TS desde `apps-src/acordes/src/music-theory.js`)

- Nombres con sostenidos: `["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"]`.
- `noteToMidi("C4") = 60` — fórmula `(octava + 1) * 12 + base + alteración`.
- `midiToNote(midi)` inverso, siempre con sostenidos.
- `chordNotes(root, type) = type.intervals.map(i => midiToNote(noteToMidi(root) + i))`.
- **Rango de samples: C2 (midi 36) a C7 (midi 96), inclusive.**
- `hasSamplesFor(root, type)`: TODAS las notas del acorde deben caer en [C2, C7].

### 3.3 Samples de audio (CDN R2 — ya en producción, no requiere setup)

```
Base:        https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev
Nota:        {BASE}/{Instrumento}/{Nota}.mp3      ej. {BASE}/Piano/C4.mp3
Sostenidos:  el "#" va URL-encoded:               {BASE}/Piano/C%234.mp3
SFX:         {BASE}/acierto.mp3   y   {BASE}/error.mp3
```

Instrumentos (usar EXACTAMENTE estos nombres de carpeta): `Piano`, `Coro`, `Corno`,
`Cello`, `Fagot`. Sexta opción de UI: `Aleatorio` (elige uno al azar POR PREGUNTA).

Un acorde se reproduce cargando los mp3 de cada nota y disparándolos **simultáneamente**
(armónico). Referencia funcional: `apps-src/acordes/src/audio-player.js` (clona nodos
Audio para solapar, cache en Map, precarga con timeout de 3.5 s). Portar esa clase a TS.

### 3.4 Generación de preguntas

Al crear una criatura:
- Elegir tipo de acorde del **pool activo** (sección 6.3), evitando repetir el mismo tipo
  que la criatura respondida inmediatamente antes (si el pool tiene > 1 tipo).
- Los tipos recién introducidos en el pool pesan doble (refuerzo de lo nuevo).
- Fundamental (root): aleatoria con `hasSamplesFor(root, type) === true`. Rango preferente
  de fundamentales **C3–C5** (registro cómodo); si el acorde no cabe (13ª desde C5 llega a
  A6, sí cabe; pero verifica siempre), reintenta hasta 50 veces como hace
  `QuestionGenerator` en `apps-src/acordes/src/game-engine.js`.

---

## 4. Stack técnico

| Cosa | Valor |
|---|---|
| Bundler | Vite ^8 (`base: "./"` — rutas relativas, obligatorio para el iframe) |
| Lenguaje | TypeScript ^5.3, `strict: true` |
| 3D | three ^0.160 (misma versión que Walking AP Multi) |
| Dependencias runtime | SOLO `three`. Nada más. Joystick virtual, sonar, partículas: a mano |
| Audio | HTMLAudioElement para samples/SFX (patrón de la casa) + WebAudio API solo para pings de sonar/burbujas generados por osciladores (sin assets) |
| Persistencia | localStorage, claves con prefijo `batisfera-` |
| i18n | `src/i18n.ts` propio, atributos `data-i18n`, parámetro `?lang=es\|en` (default `es`) |
| Fuentes | Google Fonts: Orbitron (títulos) + Rajdhani (UI) — como Synth-Kong |

`package.json` (usar tal cual, ajustando versiones menores si npm lo pide):

```json
{
  "name": "batisfera-juego",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite --host 127.0.0.1 --port 5173",
    "build": "tsc --noEmit && vite build",
    "preview": "vite preview --host 127.0.0.1 --port 5173",
    "deploy": "npm run build && node scripts/copy-dist.mjs"
  },
  "dependencies": { "three": "^0.160.0" },
  "devDependencies": {
    "@types/node": "^20.11.0",
    "@types/three": "^0.160.0",
    "typescript": "^5.3.3",
    "vite": "^8.1.0"
  }
}
```

`vite.config.ts`: `base: "./"`, alias `@` → `/src` (opcional), `server: { host: "127.0.0.1", port: 5173 }`.

---

## 5. Diseño del mundo: las cinco zonas

El eje Y del mundo three.js es la profundidad. **Cada zona mide 150 unidades de mundo**
(densidad de juego uniforme); el profundímetro de la cabina interpola esas 150 unidades al
rango narrativo de metros de la zona (no lineal global, lineal por zona).

| # | Zona (ES / EN) | Metros narrados | Familia de acordes | Pool (n) |
|---|---|---|---|---|
| 1 | Zona Soleada / Sunlit Zone | 0–200 m | TRIADS | 4 |
| 2 | Zona Crepuscular / Twilight Zone | 200–1,000 m | SEVENTHS | 8 |
| 3 | Zona de Medianoche / Midnight Zone | 1,000–4,000 m | SIXTHS + SUS_ADD | 6 |
| 4 | Zona Abisal / Abyssal Zone | 4,000–6,000 m | EXT_9 | 7 |
| 5 | Fosa Hadal / Hadal Trench | 6,000–11,000 m | EXT_11_13 (+repaso) | 8 |

### 5.1 Luz y color por profundidad (keyframes — interpolar linealmente por Y)

| Y mundo | Metros | Color agua/fog | FogExp2 density | Luz ambiente | Sol direccional |
|---|---|---|---|---|---|
| 0 | 0 | `#2e86c1` | 0.008 | 1.00 | 1.2 (con god rays) |
| −150 | 200 | `#1b4f72` | 0.012 | 0.55 | 0.4 |
| −300 | 1,000 | `#0b2438` | 0.016 | 0.30 | 0.0 |
| −450 | 4,000 | `#050d18` | 0.022 | 0.12 | 0.0 |
| −600 | 6,000 | `#01050a` | 0.028 | 0.05 | 0.0 |
| −750 | 11,000 (fondo) | `#000203` | 0.032 | 0.02 | 0.0 |

- `scene.background` y `scene.fog.color` usan el MISMO color interpolado (el agua "se
  cierra" sin costuras).
- **Foco del sumergible** (`THREE.SpotLight` hijo de la cámara, apunta adonde miras):
  intensidad 0 en zona 1, sube gradualmente desde −120 hasta máx en zona 3+. ángulo ~0.35 rad,
  penumbra 0.5, distancia ~80.
- God rays SOLO en zona 1: 6–10 planos verticales alargados con material aditivo
  translúcido blanco-azulado, rotados alrededor del eje Y, opacidad que muere a −100.
- "Nieve marina": UN SOLO `THREE.Points` (~1500 partículas) que envuelve a la cámara y se
  recicla (wrap) en un cubo de 120 unidades centrado en el jugador; deriva lenta hacia
  arriba relativa al descenso. Presente en todas las zonas; más visible con el foco.
- Termoclinas (fronteras de zona): plano horizontal shimmer (material aditivo, textura
  procedural de ondas o simple opacidad animada) en Y = −150, −300, −450, −600.
  **Cerrada** = semiopaca + el jugador no puede atravesar (clamp de Y). **Abierta** =
  se disuelve con animación al cumplir la cuota.
- Fondo marino en Y = −750: plano con relieve simple (PlaneGeometry desplazada con ruido),
  chimeneas hidrotermales emisivas — es el "final" visual del juego.
- Límites laterales: el mundo es un cilindro virtual de radio ~90; empuje suave hacia el
  centro al acercarse al borde (sin muro visible; la niebla lo oculta).

---

## 6. Gameplay

### 6.1 Loop de interacción (máquina de estados por criatura)

```
EXPLORANDO ──(click en criatura)──► ESCUCHANDO
  ESCUCHANDO: suena el acorde (armónico), la bioluminiscencia de la criatura pulsa
              sincronizada; la consola activa los botones del pool + botón "Re-escuchar";
              re-click en la criatura o botón = repetir acorde (ilimitado, sin penalización).
  ESCUCHANDO ──(botón correcto)──► CAPTURA
      · SFX acierto.mp3 + haz de escaneo (cono aditivo desde la cabina a la criatura)
      · la criatura brilla blanco, nada hacia la cámara, se desvanece en partículas
      · racha += 1 ; score += 10 + racha*2 (primera captura = 12) ; registra en bitácora (sección 6.5)
      · spawn de reemplazo en otro punto (mantener N activas)
  ESCUCHANDO ──(botón incorrecto)──► HUIDA   (UN SOLO INTENTO — decisión cerrada)
      · SFX error.mp3 ; racha = 0 ; registra intento fallido en bitácora
      · la criatura acelera y se pierde en la oscuridad (despawn en ~1.5 s)
      · en Supervivencia: además, grieta en el casco (sección 6.4)
      · muestra 1.5 s la respuesta correcta en la consola ("Era: 7ª menor") — feedback
        pedagógico, igual que la webapp seria
```

- Mientras está en ESCUCHANDO el jugador puede seguir moviéndose; si la criatura sale del
  rango de interacción (> 45 u) o pasan 30 s sin responder, vuelve a EXPLORANDO sin
  penalización (la criatura sigue ahí).
- Solo UNA criatura puede estar en ESCUCHANDO a la vez (tocar otra cancela la anterior
  sin penalización).

### 6.2 Spawning

- 4–6 criaturas activas simultáneamente, en un radio de 25–70 u alrededor del jugador,
  separadas ≥ 15 u entre sí, siempre dentro de la banda Y de la zona actual.
- Movimiento idle por especie (sección 7): deriva lenta, nunca se alejan del jugador más
  de ~90 u (se reciclan si pasa).
- Radio de click lógico = 1.5× el radio visual (clicks fáciles). Usar `THREE.Raycaster`
  contra esferas invisibles (`Mesh` con material `visible: false`) por criatura.

### 6.3 Progresión dentro de cada zona (pools incrementales)

Los botones de la consola muestran SOLO los tipos ya introducidos. Orden de introducción
(el segundo grupo entra al llegar a la mitad de la cuota de la zona; el tercero, si existe,
a 3/4):

| Zona | Grupo 1 | Grupo 2 | Grupo 3 |
|---|---|---|---|
| 1 | MAJOR, MINOR | AUGMENTED, DIMINISHED | — |
| 2 | DOMINANT_7, MINOR_7, MAJOR_7 | MINOR_MAJOR_7, DIMINISHED_7, HALF_DIMINISHED_7 | DOMINANT_7_FLAT_5, DOMINANT_7_SHARP_5 |
| 3 | MAJOR_6, MINOR_6, SUS_4 | MINOR_SUS_4, MAJOR_ADD_9, MINOR_ADD_9 | — |
| 4 | MAJOR_9, MINOR_9, DOMINANT_9 | MAJOR_6_9, MINOR_6_9 | DOMINANT_FLAT_9, DOMINANT_SHARP_9 |
| 5 | MAJOR_11, MINOR_11, DOMINANT_11 | DOMINANT_SHARP_11, MAJOR_SHARP_11 | MAJOR_13, MINOR_13, DOMINANT_13 |

**Repaso en la Fosa (zona 5):** tras cumplir la mitad de la cuota, 1 de cada 3 criaturas
nuevas es "eco del pasado": lleva un acorde de CUALQUIER zona anterior. Para no romper el
límite de 8 botones, el sonar "clasifica la familia" automáticamente: la consola anuncia
`FAMILIA DETECTADA: Séptimas` y muestra los botones de ESA familia. El jugador solo decide
la cualidad.

### 6.4 Modos de juego

| | **Expedición** (clásico) | **Contrarreloj** (O₂) | **Supervivencia** (casco) |
|---|---|---|---|
| Inicio | En la zona más profunda desbloqueada (o superficie) | Superficie | Superficie |
| Cuota para abrir termoclina | 8 capturas | 4 capturas | 6 capturas |
| Recurso | Ninguno (sin muerte) | O₂: 90 s inicial, **+8 s por captura** | Casco: 3 de integridad |
| Error | Criatura huye, racha = 0 | Ídem (perder tiempo ya castiga) | Ídem + **1 grieta** (crack visual en el cristal + SFX golpe sordo) |
| Fin | Fondo de la fosa alcanzado → créditos + resumen | O₂ = 0 → ascenso, resumen con profundidad máxima y capturas | 3 grietas → ascenso de emergencia, resumen |
| Desbloqueo persistente | SÍ: abre zonas para todos los modos | No (usa las desbloqueadas) | No (usa las desbloqueadas) |

- Puntuación en todos los modos: primero aumenta la racha y luego suma
  `10 + racha*2` por captura (primera = 12); bonus +50 por zona
  completada; criatura Leviatán ×2.
- En Contrarreloj y Supervivencia solo se puede descender hasta donde Expedición haya
  desbloqueado (incentivo a progresar en Expedición).

### 6.5 Bitácora del biólogo (colección = estadísticas)

Pantalla accesible desde el menú y desde el resumen final. Una entrada por cada uno de los
33 tipos de acorde:

- **No visto** (silueta negra), **Avistado** (intentado, nunca capturado — silueta azul),
  **Capturado** (ilustración/render de la especie + datos).
- Datos por entrada: nombre del acorde (es/en), familia/zona, intentos, aciertos,
  % de acierto, fecha de primera captura, especie con la que se capturó por primera vez.
- Vista agrupada por zona con contador `12/33 catalogados`.
- Es el equivalente de las "estadísticas por tipo de acorde" de la webapp seria, con piel
  de diario de expedición.

### 6.6 Persistencia (localStorage)

| Clave | Contenido |
|---|---|
| `batisfera-progress` | `{ unlockedZone: 1..5, expeditionBest: {...}, timeAttackBest: {...}, survivalBest: {...} }` |
| `batisfera-bitacora` | `{ [chordTypeId]: { attempts, correct, firstCaptureISO, speciesId, bestStreak } }` |
| `batisfera-settings` | `{ instrument, volume, lang? }` |

Guardar tras cada respuesta (no solo al final: cerrar el iframe no debe perder datos).

---

## 7. Criaturas (7 especies procedurales)

Todas construidas por código con primitivas three.js — **cero modelos externos, cero
texturas descargadas**. Materiales `MeshStandardMaterial` con `emissive` para la
bioluminiscencia + sprites aditivos (`THREE.Sprite` con textura de gradiente radial
generada en un canvas) para el glow. Animación por código en el loop (sin `AnimationClip`).

| # | Especie (ES / EN) | Zonas | Construcción | Idle |
|---|---|---|---|---|
| 1 | Medusa Luna / Moon Jelly | 1–2 | Campana = semiesfera (`SphereGeometry` recortada) translúcida; 8–12 tentáculos = `Line`/tubos delgados con ondulación seno | Pulso de campana (escala Y) + deriva vertical |
| 2 | Cardumen Prisma / Prism School | 1–2 | `InstancedMesh` de 40–80 conos pequeños | Boids simplificado (cohesión + separación baratas) girando en toro |
| 3 | Calamar Vela / Sail Squid | 2–3 | Cuerpo = cono alargado; aletas = 2 planos; tentáculos = 8 líneas | Propulsión a chorros: acelera-glide con estela de burbujas |
| 4 | Rape Abisal / Anglerfish | 3–4 | Cuerpo = esfera achatada; mandíbula = semiesfera; señuelo = esfera emisiva en una curva (¡el señuelo ES el punto brillante clickeable!) | Casi estático, balanceo del señuelo |
| 5 | Sifonóforo / Siphonophore | 3–5 | Cadena de 12–20 esferas pequeñas emisivas a lo largo de una `CatmullRomCurve3` que ondula | Ondulación de la curva completa |
| 6 | Pulpo Dumbo / Dumbo Octopus | 4–5 | Cuerpo = esfera suave; 2 "orejas" = planos curvos que aletean; 8 brazos cortos unidos por malla simple | Aleteo de orejas, giros lentos |
| 7 | **Leviatán / Leviathan** (raro) | 5 | Silueta ENORME a distancia (30–60 u): spline de cuerpo + placas emisivas en el lomo. Solo aparece 1 vez por sesión de zona 5, lleva acordes de 13ª, vale ×2 | Cruza lentamente el campo visual, patrón de luces ondulante |

**Variantes por acorde:** el color de emisión y el patrón de pulso se derivan de la familia
del acorde asignado (paleta sugerida: TRIADS cian `#7fd7ff`, SEVENTHS violeta `#b48cff`,
SIXTHS+SUS ámbar `#ffd27f`, EXT_9 magenta `#ff7fd0`, EXT_11_13 verde abisal `#7fffc8`).
Así una misma medusa "se ve distinta" según lo que canta.

**Pulso sincronizado con el acorde** (detalle clave aprobado por Luis): al reproducir el
acorde, `emissiveIntensity` de la criatura sigue una envolvente global (ataque 0.1 s,
caída 1.5 s). Polish opcional (fase 8): destello por-nota escalonado 60 ms para "ver" las
notas del acorde en el cuerpo de la criatura.

---

## 8. La cabina (batisfera)

Híbrido 3D + overlay HTML (el overlay es más nítido, accesible y bilingüe):

**En 3D (hijos de la cámara):**
- Esfera de cristal (radio ~1.2, `BackSide`) con material fresnel sutil (shader simple o
  `MeshPhysicalMaterial` con `transmission` bajo; si el perf sufre, un truco: opacidad
  0.06 + brillo en los bordes con fresnel en shader).
- Marco estructural: 3–4 arcos de toro (`TorusGeometry` parcial) metálicos alrededor.
- El SpotLight-foco (sección 5.1).

**En overlay HTML/CSS (la CONSOLA, parte inferior de la pantalla):**
- **Botones de respuesta**: los del pool activo (máx 8), estilo pantalla táctil retro-tech
  (Orbitron/Rajdhani, glass panel, neón cian — parentesco con Synth-Kong). Deshabilitados
  hasta estado ESCUCHANDO. Botón "🔊 Re-escuchar" siempre junto a ellos.
- **Profundímetro**: metros narrativos + nombre de la zona.
- **Sonar circular** (canvas 2D ~120 px): blips = criaturas activas, ángulo relativo al
  yaw de la cámara, anillos de distancia. Ping visual periódico + ping WebAudio suave.
- **Medidor de modo**: barra O₂ (contrarreloj) o 3 iconos de integridad (supervivencia).
- **Score + racha** arriba a la derecha; racha con animación al crecer.
- Grietas del casco: overlay SVG/PNG-CSS de fisuras que aparecen sobre el viewport
  (supervivencia).
- Viñeta del marco de la burbuja: gradiente radial CSS oscuro en las esquinas +
  reflejos especulares CSS sutiles — vende la burbuja sin costo 3D.

---

## 9. Controles

### Desktop
| Input | Acción |
|---|---|
| `W/S` o `↑/↓` | Avanzar / retroceder hacia donde miras (incluye componente vertical) |
| `A/D` o `←/→` | Strafe lateral |
| `Q/E` o `Space/Shift` | Ascender / descender puro |
| Drag botón izquierdo (sobre agua) | Mirar (yaw libre, pitch clamp ±85°) |
| Click (sin drag: < 5 px y < 250 ms) | Tocar criatura (raycast) |
| `R` | Re-escuchar acorde activo |
| `1..8` | Responder con el botón n de la consola |
| `Esc` | Pausa / menú |

**SIN pointer lock. Cursor siempre visible** (cambia a pointer sobre criaturas —
raycast en `mousemove` con throttle).

### Móvil (touch)
- Joystick virtual izquierdo (avanzar/strafe) — implementación propia (~80 líneas), SIN
  librería.
- Drag en el resto de la pantalla = mirar. Tap corto = tocar criatura.
- Botones flotantes `▲/▼` (ascender/descender) a la derecha, sobre la consola.
- Inercia suave en el movimiento (aceleración/freno exponencial) para sensación submarina.

Física de movimiento: velocidad máx ~8 u/s, aceleración exponencial (lerp), sin gravedad,
leve balanceo procedural de cámara (roll ±0.5°, seno lento) para sensación de flotar.

---

## 10. Pantallas y flujo de UI

```
[MENÚ PRINCIPAL]
  título BATISFERA + subtítulo ("Desciende. Escucha. Cataloga." /
  "Descend. Listen. Catalogue.")
  · Selector de modo: Expedición | Contrarreloj | Supervivencia
  · Selector de timbre: Piano | Coro | Corno | Cello | Fagot | Aleatorio
  · Volumen (slider) · Botón BITÁCORA · Botón INICIAR INMERSIÓN
  · En Expedición: selector de zona inicial (solo desbloqueadas)
  · Crédito: "Desarrollado por Luis Cardenas para Storm Studios Learning"
[JUEGO]  (canvas + consola HUD)
  → pausa (Esc/botón): reanudar / abandonar inmersión
[TRANSICIÓN DE ZONA]  overlay 2.5 s: nombre de la zona + metros + familia de acordes nueva
[RESUMEN]  (fin de partida, cualquier modo)
  capturas, precisión, mejor racha, profundidad máx, nuevas entradas de bitácora
  → Reintentar / Menú / Bitácora
[BITÁCORA]  grid por zonas, 33 entradas, estados No visto/Avistado/Capturado
```

i18n: TODOS los textos via diccionario `src/i18n.ts` con forma
`{ es: {...}, en: {...} }`, helper `t(key)`, atributos `data-i18n` en el HTML estático y
llamadas `t()` en lo dinámico. Leer `?lang=` en el arranque (patrón de los juegos
existentes). Los nombres de acordes usan las columnas ES/EN de la tabla 3.1.

Audio-unlock: los navegadores bloquean audio sin gesto; el primer click/keydown del
usuario debe "desbloquear" (patrón en `main.ts` de Walking AP Multi). El botón INICIAR
INMERSIÓN ya es un gesto: precargar ahí los SFX y primeras notas.

---

## 11. Estructura de archivos objetivo

```
D:\claude_code\acordes-reconocer-webapp-juego\
├── PLAN-CONSTRUCCION-BATISFERA.md   ← este documento
├── BITACORA-DESARROLLO.md           ← lo mantiene el agente (crear en fase 0)
├── package.json / tsconfig.json / vite.config.ts / index.html
├── scripts/copy-dist.mjs            ← fase 10 (adaptar de Walking AP Multi)
└── src/
    ├── main.ts            ← bootstrap: lang, pantallas, unlock audio, crea Game
    ├── i18n.ts            ← diccionario es/en + t() + initI18n(lang)
    ├── style.css          ← pantallas, consola HUD, viñeta burbuja, responsive
    ├── config.ts          ← constantes: URLS R2, zonas, colores, cuotas, física
    ├── music/
    │   ├── chords.ts      ← tabla 3.1 completa + tipos TS
    │   └── theory.ts      ← noteToMidi, midiToNote, chordNotes, hasSamplesFor (§3.2)
    ├── audio/
    │   ├── samples.ts     ← AudioPlayer TS (cache, precarga, playChord, SFX R2)
    │   └── synth-sfx.ts   ← pings de sonar, burbujas, golpe de casco (WebAudio, sin assets)
    ├── game/
    │   ├── state.ts       ← GameStateManager: modo, zona, pools, cuotas, score, racha,
    │   │                     O₂/casco, máquina de estados de pregunta, eventos (subscribe)
    │   ├── questions.ts   ← generador (§3.4) con pesos y anti-repetición
    │   └── persistence.ts ← load/save de progress, bitácora, settings
    ├── 3d/
    │   ├── renderer.ts    ← escena, cámara, loop, resize, raycasting de clicks/hover
    │   ├── player.ts      ← controles desktop+touch, física de nado, límites, clamps
    │   ├── environment.ts ← agua/fog/luz por profundidad (§5.1), nieve marina, god rays,
    │   │                     termoclinas, fondo marino
    │   ├── creatures/
    │   │   ├── base.ts    ← clase Creature: chord, estado, glow-envelope, flee(), capture()
    │   │   ├── species.ts ← las 7 fábricas procedurales (§7)
    │   │   └── manager.ts ← spawn/despawn, densidad, asignación de acordes
    │   └── cockpit.ts     ← esfera de cristal, marco, foco
    └── ui/
        ├── screens.ts     ← menú, transición de zona, resumen, pausa
        ├── hud.ts         ← consola: botones de respuesta, profundímetro, medidores, feedback
        ├── sonar.ts       ← canvas 2D del sonar
        └── bitacora.ts    ← pantalla de colección/estadísticas
```

Regla de dependencias: `game/` NO importa de `3d/` ni `ui/` (lógica pura, testeable);
`3d/` y `ui/` se suscriben al `GameStateManager` (patrón observer, igual que Walking AP
Multi con `stateManager.subscribe`).

---

## 12. Fases de construcción (con criterios de aceptación)

> Tras CADA fase: `npm run build` debe pasar sin errores de TS, y anotar la fase en
> `BITACORA-DESARROLLO.md`.

**F0 — Scaffold.** package.json, tsconfig (strict), vite.config, index.html con las
secciones de pantalla vacías, style.css base, main.ts que muestra el menú.
✓ `npm run dev` levanta y se ve el título BATISFERA en ambos idiomas (`?lang=en`).

**F1 — Música y audio.** `music/`, `audio/samples.ts`.
✓ Verificación en consola del navegador: `chordNotes("C4", MAJOR)` → `["C4","E4","G4"]`;
`hasSamplesFor("A6", MAJOR)` → false. Un botón temporal reproduce Cmaj7 en piano y en coro.

**F2 — Mundo y navegación.** `3d/renderer.ts`, `player.ts`, `environment.ts` (sin
criaturas ni termoclinas bloqueantes).
✓ Nadas libremente de 0 a −750; el color/fog/luz transiciona según §5.1; nieve marina
visible; god rays solo arriba; 60 fps en desktop.

**F3 — Cabina y HUD.** `cockpit.ts`, `ui/hud.ts`, `ui/sonar.ts` (sonar con blips falsos).
✓ Consola visible con profundímetro correcto (mapeo Y→metros por zona §5), foco
encendiéndose al bajar, viñeta de burbuja.

**F4 — Criaturas.** `creatures/` completo, clicks con raycast.
✓ Las 7 especies visibles en sus zonas, animadas, con glow por familia; click → suena su
acorde + pulsa la emisión; hover → cursor pointer; sonar muestra blips reales.

**F5 — Loop de Expedición.** `game/state.ts`, `questions.ts`, botones de respuesta,
captura/huida, pools incrementales, cuotas, termoclinas, transiciones de zona, resumen.
✓ Partida completa jugable de zona 1 a la 5 (con cuota reducida temporal para probar);
feedback de respuesta correcta al fallar; racha y score correctos (10 + racha×2).

**F6 — Contrarreloj y Supervivencia.** O₂ con +8 s/captura, grietas de casco (visual +
lógica), reglas de la tabla §6.4.
✓ Los tres modos terminables con su pantalla de resumen correcta.

**F7 — Bitácora y persistencia.** `persistence.ts`, `ui/bitacora.ts`, guardado tras cada
respuesta, desbloqueo de zonas persistente.
✓ Cerrar y reabrir el navegador conserva progreso, settings y bitácora; los 3 estados
(No visto/Avistado/Capturado) se ven en la pantalla.

**F8 — Móvil y pulido.** Joystick virtual, drag-look táctil, botones ▲/▼, layout
responsive de consola; balanceo de cámara; destello por-nota (polish §7); bloom opcional
solo desktop (`UnrealBloomPass` de three/examples — desactivar si fps < 45 o si es touch).
✓ Jugable completo en viewport móvil (usar preset mobile 375×812); desktop mantiene ≥ 50 fps.

**F9 — QA y build final.** Checklist §13 completo, `npm run build` limpio, probar
`npm run preview` y con `?lang=en`.

**F10 — Migración al website. ⚠️ SOLO CON OK EXPLÍCITO DE LUIS.** Pasos en §14.

---

## 13. Checklist de QA manual (fase 9)

- [ ] Los 33 acordes suenan (script mental: al menos 2 por zona, ambos timbres extremos
      Piano y Fagot; verificar que ningún 404 de mp3 aparece en la pestaña Network).
- [ ] Acorde con sostenido en la fundamental suena (ej. F#3 mayor) — el `%23` va bien.
- [ ] `Aleatorio` cambia de timbre entre preguntas.
- [ ] Re-escuchar ilimitado no re-penaliza ni re-puntúa.
- [ ] Responder correcto/incorrecto actualiza bitácora e inmediatamente localStorage.
- [ ] Termoclina no deja pasar antes de la cuota; sí después; animación de apertura.
- [ ] Repaso en zona 5: la consola anuncia la familia y muestra los botones correctos.
- [ ] O₂ llega a 0 → resumen con profundidad máxima; capturar suma exactamente +8 s.
- [ ] 3 grietas → ascenso de emergencia; las grietas se ven acumularse en el cristal.
- [ ] Leviatán aparece en zona 5, vale doble, entra en bitácora.
- [ ] `?lang=en` traduce TODO (menú, consola, zonas, resumen, bitácora, nombres de acordes).
- [ ] Sin audio hasta el primer gesto; después, sin bloqueos.
- [x] Móvil queda fuera del alcance de esta versión; Android/iPhone serán proyectos posteriores.
- [ ] Sin errores en consola del navegador en una partida completa.
- [ ] `Esc` pausa y el tiempo de O₂ se detiene en pausa.

---

## 14. Migración al website (fase 10 — solo con OK de Luis)

1. Copiar el proyecto (sin `node_modules`, sin `dist`) a
   `<repo sitio>\apps-src\acordes-juego\` (convención: `<slug>-juego`).
2. Crear `scripts/copy-dist.mjs` igual al de Walking AP Multi
   (`apps-src/oido-absoluto-multi-juego/scripts/copy-dist.mjs`) cambiando el target a
   `public/apps/acordes-juego`. Respeta la variable `STORM_WEBSITE_ROOT`.
3. `npm install && npm run deploy` dentro de `apps-src/acordes-juego`.
4. Crear la página `app/[locale]/apps/acordes/juego/page.tsx` calcada de
   `app/[locale]/apps/oido-absoluto-multi/juego/page.tsx` con estos valores:
   - título: `Batisfera — Modo juego de Reconocimiento de Acordes` /
     `Bathysphere — Chord Recognition game mode`
   - `getLocalizedRouteUrls("/apps/acordes/juego")`, `noIndex: true`
   - `background="#01060d"`, badge `{ label: es ? "Modo juego 3D" : "3D game mode",
     bg: "rgba(56,189,248,0.14)", border: "rgba(56,189,248,0.35)", color: "#7dd3fc" }`
   - tagline: `Desciende · Escucha · Cataloga` / `Descend · Listen · Catalogue`
   - iframe `src={`/apps/acordes-juego/index.html?lang=${locale}`}` con `allow="autoplay"`
5. En `data/apps/apps-catalog.ts`, entrada `slug: "acordes"`: añadir
   `gameUrl: "/apps/acordes/juego"`,
   `gameLabel: { es: "Modo juego 3D", en: "3D game mode" }` y una feature nueva al inicio:
   `{ es: "Modo juego 3D: Batisfera, desciende a la fosa y captura criaturas reconociendo acordes",
      en: "3D game mode: Bathysphere, descend into the trench and capture creatures by recognizing chords" }`.
6. Probar en el sitio local (`npm run dev` del repo del sitio) en
   `/es/apps/acordes/juego` y `/en/apps/acordes/juego`.
7. NO hacer commit/push sin que Luis lo pida.

---

## 15. Trampas conocidas / notas técnicas

- **`#` en URLs de samples**: siempre `encodeURIComponent` o reemplazo `# → %23`.
- **`base: "./"` en Vite es obligatorio**: el juego vive bajo `/apps/acordes-juego/` en
  producción; rutas absolutas rompen el iframe.
- **Autoplay policy**: nada de audio antes del primer gesto del usuario (§10).
- **El fog y el background deben ser el mismo color** o se ve la "caja".
- **Raycast por frame es caro**: hacer hover-raycast con throttle (~10/s) y solo contra
  las esferas de colisión de criaturas, no contra toda la escena.
- **InstancedMesh para el cardumen**: nunca 60 meshes individuales.
- **Un solo `THREE.Points` para la nieve marina**, reciclado alrededor de la cámara.
- **`tsc --noEmit` corre en `npm run build`**: mantener el proyecto siempre tipado.
- **localStorage dentro de iframe**: funciona (mismo origen), pero guarda tras CADA
  respuesta por si cierran la pestaña.
- **Móvil**: `touch-action: none` en el canvas; probar que el drag de mirar no scrollee.
- **El profundímetro es narrativo**: mundo Y ∈ [0, −750] son 11,000 m narrados; el mapeo
  es lineal POR ZONA (150 u de mundo ↔ rango de metros de esa zona, tabla §5).
- Los samples cubren C2–C7; un Dom13 desde C5 llega a A6 (cabe), desde B5 llega a G#7
  (NO cabe) — por eso `hasSamplesFor` se verifica SIEMPRE al elegir fundamental.
- SFX de sonar/burbujas/golpe: generarlos con WebAudio (osciladores + noise + envolventes),
  no buscar assets. Luis producirá música ambiental después: dejar `startAmbient(zone)`
  como stub documentado.
