# Auditoría de los juegos de las apps (estado de la renovación)

> Claude, 2026-09-24, a pedido de Luis. Revisé `apps-src/`, los planes y las bitácoras de cada juego,
> `PLAN-3D-BLENDER.md` y el catálogo (`data/apps/apps-catalog.ts`). **No se cambió código.**
> Los números de mallas son conteos de `new THREE.Mesh` en el código, no mediciones de draw calls;
> no se midieron FPS (eso va en la PC de Luis).

---

## 1. Resumen

Hay **9 juegos** en el catálogo. Cuatro ya están renovados casi por completo con modelos de Blender;
uno (Walking AP Multi) va a la mitad; los otros cuatro siguen con el arte original.

| Juego | App | Tecnología | Renovación con Blender | Estado |
|---|---|---|---|---|
| **Expreso Tonal** | Grados mayores | Three 0.160 | Cabina, tren de carga, Terminal, landmarks de biomas | ✅ Completo |
| **Batisfera** | Acordes | Three 0.160 | 7/7 criaturas, cabina sci-fi, marco envolvente, entorno 6/7 | 🟡 Falta 1 pieza (chimeneas) |
| **Aerostato** | Acordes cantados | Three 0.160 | Nube, aguja/faro, Ballena Celeste, 4 aeronaves, canasta | ✅ Completo |
| **El Cometa** | Grados menores | Three 0.160 | Carlinga y proa de hielo | 🟡 Exterior del cometa, anillos y perihelio siguen procedurales |
| **Walking AP Multi** | Oído absoluto multitímbrico | Three 0.160 | Nivel 2 «El Océano» y nivel 5 «Las Nubes» completos | 🟠 Niveles 1, 3 y 4 siguen con primitivas |
| **Resonancia** | Oído absoluto guitarra | Three 0.160 | Robot luthier articulado | 🟠 Laberinto procedural |
| **Cosmic Ear** | Desglose auditivo | Three **0.128** + React | Ninguna | 🔴 Sin renovar; motor viejo |
| **Synth-Kong** | Intervalos (reconocer) | 2D (DOM + canvas de FX) | No aplica | ⚪ Fuente recién recuperada |
| **Intervalos Cantados** (torreta) | Intervalos cantados | 2D (canvas) | No aplica | ⚪ Pendientes de diseño en espera de Luis |

---

## 2. Walking AP Multi — dónde está el mayor hueco

Es el juego más visible a medio renovar: dos niveles se ven de Blender con iluminación y entorno
nuevos, y los otros tres siguen siendo el port de primitivas del Godot original. El contraste
entre niveles salta a la vista al jugar en orden.

| Nivel | Intervalo | Jugador | Objetivo de nota | Compuerta | Entorno | Estado |
|---|---|---|---|---|---|---|
| 1 · La Pradera | Tritono | Glub (9 primitivas) | Cubo de color | Puertas con bisagra | Castillo, laberinto de setos, árboles, rocas, mariposas (~43 mallas) | 🔴 Procedural |
| 2 · El Océano | 3ª mayor | Pez (Blender) | Almeja con perla (Blender) | Portal atlante (Blender) | Atlántida, arrecife, ballena, tortugas, cangrejos, cáusticas | ✅ |
| 3 · El Cosmos | 3ª menor | Nave (13 primitivas) | Cristal espacial | Anillos | Planetas, estrellas fugaces (~10 mallas) | 🔴 Procedural |
| 4 · El Pantano | 2ª mayor (tonos enteros) | Cocodrilo (18 primitivas) | Fuego fatuo | Anillos + disco | Manglares, rocas con musgo, nenúfares, juncos, arañas (~41 mallas) | 🔴 Procedural |
| 5 · Las Nubes | Cromática completa | Unicornio-pegaso (Blender) | Globo aerostático (Blender) | Portal arcoíris (Blender) | Nubes instanciadas, islas, cometas, pájaros | ✅ |

### Sugerencias

1. **Auditar cada nivel antes de modelar**, igual que se hizo con `AUDITORIA-NUBES-BLENDER.md`:
   inventario de piezas, draw calls medidos en el juego y reparto Claude/Astra. Esa auditoría
   permitió bajar Las Nubes de 367 a 173 draw calls; es el método que ya funcionó.
2. **Orden propuesto: Pradera → Pantano → Cosmos.**
   - **Pradera primero** porque es el nivel 1: es lo primero que ve cada alumno y hoy es el peor
     contraste con el resto. Glub es el personaje de la marca del juego y merece el modelo más cuidado.
   - **Pantano** después: tiene tantas piezas como la Pradera y se presta a un kit instanciado
     (manglar, roca con musgo, nenúfar, junco), igual que el arrecife del Océano.
   - **Cosmos** al final: tiene pocas piezas y el espacio tolera mejor lo procedural (estrellas,
     brillos); la nave es la pieza que más se nota.
3. **Reparto sugerido** (sigue el criterio de la auditoría de Las Nubes):
   - **Astra:** los tres personajes (Glub, cocodrilo, nave). Son orgánicos o de primer plano y van
     en pantalla todo el nivel.
   - **Claude con bpy:** kits instanciados de vegetación y rocas, compuertas, objetivos de nota,
     castillo y laberinto de setos.
   - **Se quedan en código:** mariposas, luciérnagas, estrellas fugaces, ondas del agua (son efectos).
4. **Definir la dirección visual de cada nivel antes del primer brief**, como la sección 2 de
   `PLAN-OCEANO-BLENDER.md` (paleta, estilo, qué lo distingue del resto). El Océano funcionó porque
   se decidió «arrecife tropical soleado, caricatura amable» antes de modelar. Ojo con el Cosmos:
   no debe parecerse a El Cometa, que ya ocupa el espacio.
5. **Falta el inspector `dev/`** que pide `PLAN-3D-BLENDER.md` (§2, convenciones) y
   `PLAN-OCEANO-BLENDER.md` (§4.5). No existe `oido-absoluto-multi-juego/dev/`. Con 13 modelos ya
   integrados y ~12 más por venir, vale la pena hacerlo antes de la siguiente ronda.

---

## 3. Otros juegos 3D

### Batisfera (acordes-juego) 🟡
- **Única pieza pendiente del entorno: las chimeneas hidrotermales** (pieza 5), brief listo en
  `art/blender/chimeneas-hidrotermales/BRIEF.md` desde el 2026-09-17, esperando a Astra. Es
  lo que cierra el juego completo.
- `PLAN-3D-BLENDER.md` §4.1 sigue diciendo «Pendiente: que Luis la vea en el juego» sobre la
  cabina sci-fi y la posible pasada de pulido. La cabina ya se publicó; conviene cerrar ese
  punto (pulir o darlo por bueno) y actualizar el plan.

### El Cometa (grados-menores-juego) 🟡
- Siguen procedurales el cometa visto desde fuera, los anillos y el perihelio. **Propuesta:** un
  brief para el cometa exterior (núcleo de hielo + coma), porque es el protagonista en las
  cinemáticas. Los anillos y el perihelio pueden quedarse en shader.
- Pendientes que la bitácora marca «no se deben olvidar»: el **checklist §14** (timbre Aleatorio
  en partida real, teclado completo, pausa con pregunta viva, ventana angosta) y los **FPS en
  navegador real**.

### Resonancia (oido-absoluto-guitarra-juego) 🟠
- El robot ya es de Blender; el laberinto (paredes, piso, roseta) sigue procedural. **Propuesta:**
  un kit instanciado de paredes de taller de luthier (madera, herrajes, piezas de guitarra
  colgadas) que haga juego con el robot. Es trabajo tipo Claude con bpy.
- **El `README.md` está desactualizado:** dice «No está conectado al catálogo, a rutas de Next.js
  ni a `public/apps`», pero ya está en el catálogo (`/apps/oido-absoluto-guitarra/juego`) y
  publicado en `public/apps/oido-absoluto-guitarra-juego`.

### Expreso Tonal y Aerostato ✅
- Sin piezas de arte pendientes. Solo queda lo transversal: medir FPS en la PC de Luis con todo
  cargado (el plan lo pide antes de cada publicación y las bitácoras lo marcan pendiente).

---

## 4. Juegos sin renovar

### Cosmic Ear (desglose auditivo) 🔴
- Usa **Three r128** (el resto usa 0.160), React 18 y está todo en **un solo archivo de 1 740
  líneas** (`src/main.jsx`), con naves y planetas de esferas, cajas y cilindros.
- Recién migrado a Vite (2026-09-24), así que ya se puede trabajar como los demás.
- **Propuesta en dos pasos:** (1) subir a Three 0.160 y partir `main.jsx` en módulos
  (escena, nave, planetas, audio, UI) — es condición para meter modelos de Blender con el
  mismo `kit.export_parts`; (2) después, nave y planetas de Blender.

### Synth-Kong (intervalos-reconocimiento-juego) ⚪
- Es 2D retro (DOM + canvas de efectos con Tone.js). Blender no aplica. La fuente se recuperó
  hace días; la prioridad es estabilidad (que `apps:check` lo cubra, ya se hizo) y no rediseño.
- Si se quiere «renovar», la opción coherente es **sprites/pixel art**, no 3D.

### Intervalos Cantados — torreta (intervalos-cantados-juego) ⚪
- 2D en canvas. Sus pendientes son de diseño, no de arte (`NOTAS-DISENO.md`):
  1. **Tesitura por nivel** — en espera de la tabla de Luis. Es el pendiente que más afecta a
     alumnas y niños: hoy el juego está fijo en registro grave.
  2. Conflicto de teclas A–G con la rotación de la torreta (A/D).
  3. SFX por nivel (cuando estén los audios).
  4. Apuntado táctil / auto-aim.
- Limpieza menor: `src/assets/hero.png`, `typescript.svg` y `vite.svg` son restos de la
  plantilla de Vite y nadie los importa.
- `PLAN-3D-BLENDER.md` lo lista como «sin ruta» hasta definir qué significa renovar. Propuesta:
  **no llevarlo a 3D**; primero la tesitura (valor pedagógico) y luego SFX.

---

## 5. Hallazgos transversales

1. **`PLAN-3D-BLENDER.md` tiene el «por definir» viejo.** La sección 4 dice que falta definir
   qué es «renovar» en `oido-absoluto-multi-juego`; ya se definió con el Océano (modelos +
   entorno + iluminación). Conviene actualizarlo y anotar que Pradera, Cosmos y Pantano siguen
   sin ruta. Tampoco menciona Cosmic Ear ni Synth-Kong.
2. **Los `copy-dist.mjs` tienen una ruta de Windows como valor por defecto**
   (`C:\Users\Luis\Documents\Claude Cowork\...`) en 8 juegos. Si alguien corre `npm run deploy`
   fuera de la PC de Luis sin `STORM_WEBSITE_ROOT`, copia a una carpeta que no existe en vez de
   a `public/apps`. Propuesta: resolver la raíz relativa al repo (`../../..`) y dejar la variable
   solo como override.
3. **Peso de los JSON de geometría** (P3-04, pospuesto por decisión de Luis). Sigue siendo válido
   posponerlo; solo recordar que con 12 modelos más en Walking AP Multi el total del juego crecerá.
   Si se retoma, hacerlo una sola vez en `kit.export_parts`.
4. **FPS sin medir** en varios juegos. Propuesta: una sola sesión en la PC de Luis que mida todos
   con el mismo método (nivel más pesado de cada juego, pantalla completa) y deje una tabla en
   este documento.

---

## 6. Orden sugerido

Ordenado por impacto para el alumno y porque cada paso reutiliza lo anterior. **Nada de esto
está decidido: es propuesta para que Luis elija.**

| # | Qué | Quién | Por qué ahora |
|---|---|---|---|
| 1 | Chimeneas hidrotermales de Batisfera | Astra (brief listo) | Cierra un juego completo con un solo encargo |
| 2 | Actualizar `PLAN-3D-BLENDER.md` y el README de Resonancia | Claude | Documentos desactualizados; 15 minutos |
| 3 | Inspector `dev/` de Walking AP Multi | Claude | Prepara la ronda grande de modelos |
| 4 | Auditoría + dirección visual del nivel 1 «La Pradera» | Claude, OK de Luis | Es el primer nivel que ve el alumno |
| 5 | Modelos de La Pradera (Glub → castillo/setos → vegetación) | Astra + Claude | El mayor salto visual pendiente |
| 6 | Nivel 4 «El Pantano» (mismo flujo) | Astra + Claude | Muchas piezas, buen candidato a kit |
| 7 | Nivel 3 «El Cosmos» (mismo flujo) | Astra + Claude | Pocas piezas; nave primero |
| 8 | Tesitura por nivel en Intervalos Cantados | Claude, con la tabla de Luis | Pedagógico; bloqueado por datos |
| 9 | Cosmic Ear: Three 0.160 + módulos, luego modelos | Claude | Deuda técnica antes de arte |
| 10 | Cometa exterior de El Cometa | Astra | Mejora de protagonista en cinemáticas |
| 11 | Kit de taller para el laberinto de Resonancia | Claude con bpy | Completa el juego |
| 12 | Sesión de FPS en todos los juegos | Luis | Transversal; puede ir en cualquier momento |

**Preguntas para Luis:**
- ¿Arrancamos Walking AP Multi por La Pradera, o prefieres otro nivel primero?
- ¿Glub se queda como está en diseño (solo pasa a Blender) o se rediseña el personaje?
- ¿Cosmic Ear entra en la ruta de renovación o se queda como está?

---

## 7. Plan propuesto: una mejor manera de hacer la renovación

> **Estado (2026-09-24, tarde):** plan aprobado por Luis. Fases A, B y C hechas y probadas (en la nube y,
> la parte de Blender, en la PC de Luis): `apps-src/shared-3d`, `kit.export_glb` y el inspector. Cómo se
> usa: `MANUAL-RENOVACION-3D.md`. Cambio respecto al texto de abajo: `kit.py` **no** se mueve a
> `plantillas-blender/` (unos 30 scripts lo importan de su ruta actual). Sigue la fase D, piloto de La Pradera.
>
> Agregado el 2026-09-24 a pedido de Luis. **Propuesta, no decidida.** El flujo actual funciona y los
> resultados se ven bien; lo que sigue busca que cada modelo nuevo cueste menos y se vea mejor en el juego.

### 7.1 Diagnóstico del flujo actual

| Punto | Hoy | Costo |
|---|---|---|
| Formato | JSON propio (`kit.export_parts`) por modelo | 38 cargadores `blender-*.ts` casi iguales; 10 MB de JSON solo en Walking AP Multi |
| Código común | `kit.py` vive en `grados-mayores-juego`; `vertex-emission.ts` solo en Batisfera | Cada juego reescribe carga, emisión, `dispose` e inspector |
| Aprobación | Renders de Cycles | La luz de Cycles no es la del juego (problema conocido en `PLAN-3D-BLENDER.md`): rondas extra con Astra |
| Piezas genéricas | Todo se modela a medida | Tokens de Astra en rocas y vegetación |
| Personajes | Partes rígidas animadas por código | Bien para robot y cangrejo; limitado para Glub o el cocodrilo |
| Materiales | Color plano por vértice | Formas sin volumen ni contacto |
| Orden | Pieza por pieza | Cada brief fija su propia referencia; más rondas |

### 7.2 Los siete cambios

1. **GLB en lugar de JSON.** Blender exporta glTF de fábrica: partes con pivote → nodos con nombre,
   colores por vértice, `meta` → `extras`, emisión por vértice como atributo propio (`_EMISSION`).
   Comprimir con `gltfpack` (meshopt). Un solo `GLTFLoader` sustituye los 38 cargadores y resuelve
   P3-04 sin trabajo aparte.
2. **Librería común `apps-src/shared-3d`.** Cargador GLB, emisión por vértice, `dispose`, presupuestos
   e inspector `dev/` genérico. `kit.py` pasa a `plantillas-blender/` como fuente única.
3. **Aprobar con capturas del juego.** Al exportar, un visor con la luz y la niebla del nivel real
   genera capturas automáticas en Chromium (Playwright). Luis aprueba lo que de verdad se ve. En el
   mismo paso se leen draw calls y triángulos (`renderer.info`) y se marca lo que pase del presupuesto.
   Los FPS se siguen midiendo en la PC de Luis.
4. **Assets CC0 para lo genérico.** Rocas, pasto, árboles, juncos y nenúfares desde Kenney, Quaternius
   o Poly Haven, ajustados en Blender a la paleta del nivel. Astra solo modela protagonistas.
   Registrar origen y licencia de cada asset en el README del juego.
5. **Esqueleto y animaciones de Blender para personajes orgánicos** (Glub, cocodrilo): malla con
   esqueleto y clips (caminar, saltar, festejar) reproducidos con `AnimationMixer`. Las partes rígidas
   se quedan para robots, naves y crustáceos.
6. **Oclusión ambiental horneada** en los colores por vértice desde Blender. Sin costo en tiempo de juego.
7. **Por nivel, no por pieza:** dirección visual + imagen de concepto → bloqueo con figuras simples
   en el juego (escala y composición) → paquete de modelos con una sola referencia.

### 7.3 Fases

| Fase | Qué | Quién | Dónde | Criterio de salida |
|---|---|---|---|---|
| A | `shared-3d`: cargador GLB, emisión, `dispose`, inspector genérico | Claude | Aquí | Un modelo existente (p. ej. el cangrejo) carga igual desde GLB que desde JSON |
| B | Exportación GLB + `gltfpack` + AO horneado en `kit.py` | Claude escribe, Luis corre | PC de Luis (bpy) | El cangrejo exportado pesa menos y se ve igual o mejor en el inspector |
| C | Capturas automáticas con luz del nivel + medición de presupuesto | Claude | Aquí | Un comando genera capturas y tabla de draw calls/triángulos por modelo |
| D | **Piloto: La Pradera** con el flujo completo (dirección visual, bloqueo, CC0 + Glub de Astra con esqueleto) | Claude + Astra, OK de Luis | Ambos | Nivel publicado; comparar tiempo y rondas contra El Océano |
| E | Pantano y Cosmos con el flujo ya probado; luego Cosmic Ear y Resonancia | Claude + Astra | Ambos | — |

- **No se migran los modelos publicados.** Cada uno pasa a GLB solo cuando haya que tocarlo por otra razón.
- Si el piloto no mejora contra El Océano (rondas, peso, calidad vista en el juego), se vuelve al flujo
  JSON sin pérdida: los modelos existentes no se tocaron.
- Todo lo de Blender se prueba en la PC de Luis; esta sesión en la nube no tiene bpy.

### 7.4 Lo que cambia en los documentos si se aprueba

- `PLAN-3D-BLENDER.md` §2 (formato GLB como opción por defecto) y §6 (el brief pide GLB y capturas del juego).
- `plantillas-blender/BRIEF.md` e `INSTRUCCIONES-ASTRA.md`: entregar GLB y, en personajes, esqueleto y clips.
