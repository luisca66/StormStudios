# PLAN 3D — Modelos de Blender para los juegos

Guía maestra de arte 3D de los juegos de Storm Studios. Escrita el 2026-09-13.
Cada juego conserva el detalle de sus modelos en su `art/blender/README.md`; este
documento reúne el método común, el inventario y los pendientes.

> **Regla:** nada se publica (`npm run deploy`, copia a `public/apps`, commit/push) sin
> OK explícito de Luis. Los pendientes marcados **Propuesta** no están decididos.

---

## 1. Herramienta

- **bpy 4.5.3 LTS + Python 3.11**, instalación propia en `C:\Users\Luis\blender-bpy\`.
  No se abre ni se descarga el ejecutable de Blender. No usar la copia de Codex
  (`AppData\Local\codex-blender`).
- Lanzador (la ruta del script es relativa a la carpeta desde donde se ejecuta):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 ruta\al\modelar-x.py
```

- Reinstalar si se rompe: `uv pip install --python <python.exe> --target python-module bpy==4.5.3`
  (en ese Python `ensurepip` falla; usar uv).
- Render Cycles por CPU: el PNG de control se puede revisar con Read para corregir el
  modelo antes de integrarlo.

## 2. Método común

Cada modelo es **un script reproducible** `art/blender/modelar-<pieza>.py` que genera
todo lo demás. Nunca se edita a mano el `.blend` ni el JSON.

| Salida | Para qué |
|---|---|
| `<pieza>.blend` | escena editable (modificadores vivos, materiales, cámara, luces) |
| `<pieza>.glb` | modelo portable / visor glTF |
| `<pieza>-*.png` | render Cycles de control (en cabinas: desde el ojo del jugador) |
| `src/3d/**/assets/<pieza>.json` | *(opcional)* geometría evaluada para Three.js |

### Dos formas de integrarlo en Three.js

1. **JSON de geometría evaluada** (Expreso Tonal, Batisfera). El script exporta posiciones,
   normales, colores de vértice, índices y pivotes; Three.js arma `BufferGeometry`.
   Mallas fusionadas por material y partes vivas (ruedas, palancas, colas) exportadas
   aparte con su pivote. Se carga con `fetch` una sola vez antes de jugar. Da más control
   sobre draw calls e instancias. Plantilla: `grados-mayores-juego/art/blender/kit.py`.
2. **GLB directo con `GLTFLoader`** (Aerostato). Más simple; la jerarquía de nodos con
   nombre permite animar partes (`Aleta_Cola`, `Faro_Linterna_Giratoria`).

**Desde el 2026-09-24, para modelos nuevos: `kit.export_glb` + `apps-src/shared-3d`.** Mismo
contenido que el JSON de `kit.export_parts` (partes, pivotes, `segment`, `meta`), en GLB comprimido
(la mitad de peso con brotli) y cargado con un solo `loadModel` en lugar de un cargador por modelo.
Probado contra los 33 modelos publicados: misma imagen píxel a píxel. Cómo usarlo, paso a paso:
**`MANUAL-RENOVACION-3D.md`**. Los modelos ya publicados siguen con su JSON y no se migran salvo que
haya que tocarlos.

### Convenciones

- Autorar en el espacio de Three.js (Y arriba) y convertir a Blender (Z arriba) al crear
  cada malla (`kit.py` lo resuelve).
- Color horneado en vertex colors + pocas clases de material (pintura · metal · emisivo).
- Cada modelo trae **inspector de desarrollo** (`dev/<pieza>.html`, fuera del build) y un
  atajo en el juego (tecla o botón `?debug=1` / `?dev=1`) para verlo sin jugar la partida.
- Cabinas: comprobar en el script que ninguna pieza tape la vista del jugador
  (`below_sightline()` del Expreso) y dejar libre el 65–70 % central.
- Liberar geometrías y materiales en `dispose()` al retirar la pieza.
- Documentar en el README del juego: entregables, triángulos, draw calls, peso del JSON
  (y con gzip), cómo verlo y los problemas encontrados.

### Presupuestos orientativos

| Tipo | Referencia actual |
|---|---|
| Criatura protagonista | Medusa Luna: 23 104 tri, 17 draw calls |
| Instanciado (cardumen) | Pez Prisma: 5 691 tri/pez; 46 peces = 7 draw calls |
| Cabina en primera persona | < 60 000 tri y < 20 draw calls añadidas (brief Batisfera) |
| Hito lejano | Faro 1 893 tri · Ballena 1 173 tri |
| JSON grande | Terminal 5,5 MB (708 kB gzip); no pasar de ahí sin medir la carga |

Las mediciones de FPS se hacen **en la PC de Luis**, que es la plataforma objetivo.

### Problemas conocidos

- Un booleano EXACT sobre una esfera aplanada dejó una malla con 0 caras.
- `recalc_face_normals` con caras degeneradas voltea normales.
- La iluminación de Cycles no coincide con la de tiempo real: aprobar el estilo en el juego,
  no solo en el render.

---

## 3. Inventario por juego

### Expreso Tonal — `grados-mayores-juego` (grados mayores, puerto 5175)

| Pieza | Script | Estado |
|---|---|---|
| Cabina de vapor (POV maquinista) | `modelar-cabina.py` | ✅ integrada |
| Tren de carga que se cruza | `modelar-tren-carga.py` | ✅ integrada |
| Estación Terminal | `modelar-terminal.py` | ✅ integrada |
| Landmarks de biomas (torre de agua, molino, viaducto, túnel, cascada, carreta, faro, estanque) | `modelar-landmarks.py` | ✅ integrada |

Las agujas de los manómetros ya están vivas desde F5 (`cab.ts`, un `InstancedMesh`): velocidad real, presión atada al estado de la pregunta y una aguja que solo tiembla.

### Batisfera — `acordes-juego` (acordes, puerto 5173/5183)

| Pieza | Estado |
|---|---|
| Medusa Luna | ✅ Blender (JSON) |
| Cardumen Prisma | ✅ Blender (JSON, instanciado) |
| Calamar Vela | ✅ Blender (JSON por partes) · modelado por Astra, integrado por Claude |
| Rape Abisal | ✅ Blender (JSON por partes) · modelado por Astra, integrado por Claude |
| Pulpo Dumbo | ✅ Blender (JSON por partes) · modelado por Astra, integrado por Claude |
| Sifonóforo | ✅ Blender (4 piezas encadenadas con instancias) · modelado por Astra, integrado por Claude |
| Leviatán | ✅ Blender (19 piezas encadenadas: head, body 1–8, tail y 9 placas) · modelado por Astra en 3 rondas, integrado por Claude |
| Cabina sci-fi | ✅ Blender (JSON por módulos anclados a pantalla, 8 draw calls) · publicada (`45e5e95`) |
| Marco envolvente (tres ventanales) | ✅ Blender (14 módulos, `screenSpace`) · modelado por Astra (v3 + ronda extra de detalle v4), integrado por Claude junto con el cristal curvo `dome-glass.ts` · publicado (2026-09-16) |
| Entorno (fosa, decorado por zona) | ⏳ plan en `apps-src/acordes-juego/PLAN-ENTORNO-BLENDER.md` (7 piezas); pieza 1, barco hundido, ✅ publicada (2026-09-16; Astra v1–v3, Claude v4); pieza 2, arcos de roca, ✅ publicada (2026-09-17; Astra v1–v3, Claude v4 e integración); pieza 3, jardín de corales, ✅ publicada (2026-09-17; Astra v1–v3, integración de Claude); piezas 6 y 7, salientes de roca y baliza, ✅ publicadas (2026-09-17; Claude con bpy); pieza 4, osamenta de ballena, ✅ publicada (2026-09-17; Astra v1–v3, integración de Claude); pieza 5 (chimeneas) ✅ integrada (2026-09-26, Astra en modo automático, ejecutada e integrada por Claude): **entorno 7/7, Batisfera completo** (falta publicar) |

### Aerostato — `acordes-cantar-juego` (acordes cantados, puerto 5174)

| Pieza | Estado |
|---|---|
| Nube cúmulo (se atraviesa) | ✅ Blender (GLB) · tecla `C` |
| Aguja alpina y faro | ✅ Blender (GLB) · tecla `F` |
| Gran Ballena Celeste (capa 5) | ✅ Blender (GLB, 15 674 tri) · rehecha por Astra en 2 rondas e integrada por Claude; crestas de cristal v4 por Claude (2026-09-15) · tecla `B`/`5` |
| Aeronaves por capa: avioneta, jet, avión estratosférico, satélite (`flybys.ts`) | ✅ Blender (un JSON por aeronave) · modeladas por Astra; estratosférico corregido e integración por Claude |
| Canasta/globo del jugador (`basket.ts`) | ✅ Blender (4 módulos anclados a pantalla: borde, postes y quemador con faldón) · Claude |

El `PLAN-AERONAVES-POR-CAPA.md` cita la regla original de "cero assets externos"; ya se
relajó para los modelos de Blender.

### Sin Blender todavía

- **El Cometa** — `grados-menores-juego` (publicado): ✅ carlinga de Blender (2026-09-15, Astra + grietas de Claude). Siguen procedurales el cometa visto desde fuera, los anillos y el perihelio.
  Brief listo para Astra: `art/blender/carlinga/BRIEF.md` (2026-09-15) — carlinga + proa de hielo.
- **Resonancia** — `oido-absoluto-guitarra-juego`: ✅ robot luthier en Blender, articulado
  (codos y rodillas), con mochila de guitarra y pisadas sincronizadas (2026-09-14, Claude). El
  prototipo procedural suelto se borró; el entorno del laberinto sigue procedural.
- **Walking AP Multi** — `oido-absoluto-multi-juego`: rediseño completo del nivel 2 «El Océano»
  (2026-09-15/16, modelos + entorno + iluminación) ✅ **completo**: pez (Sol), almeja, ballena,
  tortuga, Atlántida, cangrejo y portal atlante (Astra) y kit de arrecife (Claude). Publicado.
  Detalle en `PLAN-OCEANO-BLENDER.md`.
  Nivel 5 «Las Nubes» (auditoría en `apps-src/oido-absoluto-multi-juego/AUDITORIA-NUBES-BLENDER.md`):
  ✅ nubes instanciadas, globo aerostático, portal arcoíris, islas, cometas y pájaros (Claude, publicados
  2026-09-16; vista inicial de 367 a 173 draw calls). ✅ Unicornio-pegaso (Claude, con el brief escrito para Astra). Nivel completo.
  Nivel 1 «La Pradera»: ✅ **completo y publicado** (2026-09-26), piloto del flujo nuevo y del reparto
  automático de tres agentes: Glub (Claude), castillo (Astra), rocas, setos, muralla, portón, cubo de nota,
  árboles y flores (Gemini). Vista inicial de ~630 a 33 draw calls. Detalle y pendientes en
  `apps-src/oido-absoluto-multi-juego/PLAN-PRADERA-BLENDER.md` §7.
  Nivel 3 «El Cosmos»: ✅ **completo y publicado** (2026-09-26): cohete (Claude), portal (Astra),
  asteroides, planetas y cristal de nota (Gemini). Detalle en `PLAN-COSMOS-BLENDER.md`.
  Nivel 4 «El Pantano»: sigue procedural.
- **Cosmic Ear** — `cosmic-ear` (desglose auditivo): ✅ **rediseño completo publicado** (2026-09-26):
  Three 0.160 y módulos, nave y estación (Claude), planetas-instrumento (Astra), lunas y asteroides
  (Gemini). Detalle en `apps-src/cosmic-ear/PLAN-COSMIC-EAR.md`.

**Alcance (decidido por Luis el 2026-09-26): solo se renuevan los juegos 3D.** Los 2D se quedan como
están aunque sean código heredado: las prácticas «jugar» (portadas de Android), `intervalos-cantados-juego`,
`intervalos-reconocimiento-juego`, Synth-Kong, los arcade de App Memoria (`*-gemini.html`,
`space-invaders.html`), `intervalos.html` y la batería.

---

## 4. Hacia dónde vamos

Orden por impacto visual y porque cada paso reutiliza lo anterior. **Confirmado por Luis
el 2026-09-13.**

1. ✅ **Cabina sci-fi de Batisfera** (commit `7a1df76`, sin deploy). Pendiente: que Luis la vea
   en el juego. La revisión de Astra la encuentra por debajo del
   concepto (materiales uniformes, consolas vacías en el render). Si Luis coincide, se hace una
   pasada de pulido en `modelar-cabina.py` **conservando** módulos, anclas, rieles estirables y
   pantallas exportadas.
2. **Criaturas restantes de Batisfera** con el flujo de la sección 6. **Primero solo el
   Calamar Vela** (`art/blender/calamar-vela/BRIEF.md`) como prueba del flujo; si calidad y
   rendimiento pasan (medir en escritorio con 6 criaturas), siguen Rape → Dumbo → Sifonóforo →
   Leviatán. Encaja con el hito H4 de `PLAN-HITOS-BATISFERA-2.md`.
3. ✅ **Aeronaves del Aerostato** en un solo script con las 4 piezas y la hélice como parte viva
   (2026-09-14). Pendiente: verlas en vuelo real.
4. ✅ **Globo/canasta del Aerostato** (2026-09-14, composición enmarcada elegida por Luis).
5. ✅ **Robot de Resonancia** (2026-09-14): Luis eligió Blender articulado e integrar el sonido de
   pasos.
6. ✅ **Rehacer la Ballena Celeste** (2026-09-15): Astra entregó en 2 rondas, Claude integró
   (ruta del GLB, ejes de aleteo/cola y pulso de placas exactos al contrato de `ENTREGA.md`),
   commit/push hecho.
7. ✅ **El Cometa: carlinga y proa de hielo** (2026-09-15). Astra hizo v1, dos rondas y una extra
   autorizada por Luis. Claude rehízo las grietas de la proa e integró en `cab.ts` (instrumentos
   vivos, emisión por vértice y farol de cabina). Publicado.

**Qué significa "renovar"** quedó definido con El Océano (2026-09-15): modelos, entorno e
iluminación juntos, por nivel. `intervalos-cantados-juego` es 2D: su renovación es de diseño
(tesitura por nivel), no de modelos.

**Orden desde el 2026-09-26 (decidido por Luis):**

8. ✅ **Walking AP Multi, nivel 1 «La Pradera»** (completo 2026-09-26, sin publicar): piloto de `MANUAL-RENOVACION-3D.md` y del reparto
   Claude/Astra/Gemini. Glub se queda en esencia con un modelo mejorado. Plan:
   `apps-src/oido-absoluto-multi-juego/PLAN-PRADERA-BLENDER.md`.
9. ✅ **Cosmic Ear: rediseño completo** (publicado 2026-09-26).
10. **Walking AP Multi, nivel 3 «El Cosmos»** (elegido por Claude con la delegación de Luis, 2026-09-26):
    así Walking AP Multi queda a un nivel de estar renovado entero. Plan:
    `apps-src/oido-absoluto-multi-juego/PLAN-COSMOS-BLENDER.md`.
11. Walking AP Multi, nivel 4 «El Pantano» (estrena el esqueleto con el cocodrilo).
12. Por decidir al llegar: cometa exterior de El Cometa y laberinto de Resonancia. (Las chimeneas de
    Batisfera ya están hechas.)

Transversal: medir rendimiento **en escritorio** antes de publicar cualquier modelo nuevo. Los juegos
son para laptop/escritorio; las versiones de teléfono serán apps nativas iOS/Android hechas aparte
(aclarado por Luis el 2026-09-15), así que no se recorta presupuesto por móvil.

## 5. Cómo ejecutar una pieza (checklist por sesión)

1. Leer este plan, el README de `art/blender/` del juego y los archivos que toque la pieza.
2. Escribir `modelar-<pieza>.py` a partir del script hermano más parecido.
3. Correrlo con `bpy-run.ps1`, revisar el render y corregir defectos.
4. Integrar en Three.js + inspector `dev/` + atajo de desarrollo.
5. `npm run build` y el QA del juego; probar escritorio y ventana angosta.
6. Actualizar el README del juego, la bitácora (5–10 líneas) y el inventario de este plan.
7. Detenerse. Publicar solo con OK de Luis.

## 6. Flujo con tres agentes: Claude dirige, Astra y Gemini modelan

Desde el 2026-09-26 (`plantillas-blender/REPARTO-AGENTES.md`): **Claude** dirige, escribe los briefs y
los prompts, modela lo que tiene que ser hermoso e integra; **Astra** modela en paralelo lo complejo;
**Gemini** modela lo simple con receta detallada. Luis pega los prompts y aprueba capturas.

| Paso | Quién | Entrega |
|---|---|---|
| 1. Brief | **Claude** | Astra: `art/blender/<modelo>/BRIEF.md` corto y creativo (idea, contrato mínimo, paleta). Gemini: `BRIEF-GEMINI.md` con medidas, receta paso a paso, colores y render. Ninguno abre el código del juego. |
| 2. Modelado | **Astra**, **Gemini** o **Claude** | en esa carpeta: `modelar-<modelo>.py`, `.blend`, `.glb`, `<modelo>.json` y `<modelo>-juego.glb` (`kit.export_glb`), renders y `ENTREGA.md` |
| 3. Aprobación | **Luis** | aprueba las **capturas del inspector con la luz del nivel** (`npm run capture` en `apps-src/shared-3d`, las genera Claude) o pide cambios (máx. 2 rondas por agente y pieza) |
| 4. Integración | **Claude** | carga con `shared-3d` (`loadModel`/`buildModel`), animación, destello, atajo de desarrollo, build, QA en escritorio, commit |

- Reglas para no pisarse (resumen de `REPARTO-AGENTES.md`): una carpeta y un dueño por encargo; solo
  Claude usa git, npm e inspector; un encargo abierto por agente; Claude no cambia de rama en el
  checkout principal mientras haya encargos abiertos; el tablero de cada plan de nivel lo edita Claude.
- Astra: `plantillas-blender/INSTRUCCIONES-ASTRA.md` y `PROMPTS-ASTRA.md`. Gemini:
  `INSTRUCCIONES-GEMINI.md` (plantilla de script probada con bpy 4.5.3), `PROMPTS-GEMINI.md` y
  `BRIEF-GEMINI.md`.
- Astra y Gemini trabajan en el **checkout principal**, nunca en un worktree aislado.
- El script debe correr con `bpy-run.ps1` desde la instalación de Luis: si a un agente se le acaban
  los tokens o las rondas, Claude continúa el mismo `modelar-<modelo>.py`.
- `kit.py` se queda en `grados-mayores-juego/art/blender/`: unos 30 scripts lo importan de esa ruta.
- `kit.export_glb(ruta, meta=…, ao=…, json_path=…)` pasa por `export_parts` y el convertidor de
  `shared-3d`; con `ao` hornea oclusión ambiental en copias temporales (la escena no se toca).
- `kit.export_parts(ruta, meta)` exporta cada
  objeto con `part` por separado: pivote, geometría relativa, índices, color de vértice y
  material. Mismo formato que la Medusa Luna, más `segment`, `metalness` y `roughness`.
- Modelos atados a la pantalla (cabinas) no se separan limpio: su brief debe fijar los módulos
  y anclas desde el principio.
- Los modelos nuevos van en subcarpeta `art/blender/<modelo>/`; los existentes no se mueven
  (los juegos los cargan desde sus rutas actuales).
