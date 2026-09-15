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

**Para modelos nuevos se recomienda el JSON** en cualquier pieza que se instancie o que
tenga que bajar draw calls, y el GLB para visitantes únicos y ligeros.

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

Las mediciones de FPS hechas hasta ahora son **solo en la PC de Luis**; falta medir en
teléfono real con varias piezas a la vez.

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

Queda como pendiente heredado de la bitácora (F5): animar las agujas de los manómetros.

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
| Cabina sci-fi | ✅ Blender (JSON por módulos anclados a pantalla, 8 draw calls) · publicada (`45e5e95`); falta prueba en teléfono real |
| Entorno (fosa, arrecifes) | ⏳ primitivas; el brief lo deja para otra fase |

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
- **Walking AP Multi** — `oido-absoluto-multi-juego`: rediseño completo empezando por el nivel 2 «El Océano»
  (2026-09-15, modelos + entorno + iluminación). Plan: `PLAN-OCEANO-BLENDER.md`. Brief listo para Astra:
  `art/blender/pez/BRIEF.md` (pez protagonista).
- `intervalos-cantados-juego`.

---

## 4. Hacia dónde vamos

Orden por impacto visual y porque cada paso reutiliza lo anterior. **Confirmado por Luis
el 2026-09-13.**

1. ✅ **Cabina sci-fi de Batisfera** (commit `7a1df76`, sin deploy). Pendiente: que Luis la vea
   en el juego y en un teléfono real. La revisión de Astra la encuentra por debajo del
   concepto (materiales uniformes, consolas vacías en el render). Si Luis coincide, se hace una
   pasada de pulido en `modelar-cabina.py` **conservando** módulos, anclas, rieles estirables y
   pantallas exportadas.
2. **Criaturas restantes de Batisfera** con el flujo de la sección 6. **Primero solo el
   Calamar Vela** (`art/blender/calamar-vela/BRIEF.md`) como prueba del flujo; si calidad y
   rendimiento pasan (medir en teléfono con 6 criaturas), siguen Rape → Dumbo → Sifonóforo →
   Leviatán. Encaja con el hito H4 de `PLAN-HITOS-BATISFERA-2.md`.
3. ✅ **Aeronaves del Aerostato** en un solo script con las 4 piezas y la hélice como parte viva
   (2026-09-14). Pendiente: verlas en vuelo real y en teléfono.
4. ✅ **Globo/canasta del Aerostato** (2026-09-14, composición enmarcada elegida por Luis).
5. ✅ **Robot de Resonancia** (2026-09-14): Luis eligió Blender articulado e integrar el sonido de
   pasos.
6. ✅ **Rehacer la Ballena Celeste** (2026-09-15): Astra entregó en 2 rondas, Claude integró
   (ruta del GLB, ejes de aleteo/cola y pulso de placas exactos al contrato de `ENTREGA.md`),
   commit/push hecho.
7. ✅ **El Cometa: carlinga y proa de hielo** (2026-09-15). Astra hizo v1, dos rondas y una extra
   autorizada por Luis. Claude rehízo las grietas de la proa e integró en `cab.ts` (instrumentos
   vivos, emisión por vértice y farol de cabina). Publicado.

**Por definir con Luis:** qué significa "renovar" en los juegos sin Blender todavía
(`oido-absoluto-multi-juego`, `intervalos-cantados-juego`): solo modelos, o también
entornos, iluminación y experiencia visual. Hasta entonces no tienen ruta.

Transversal: medir rendimiento en teléfono real antes de publicar cualquier modelo nuevo.

## 5. Cómo ejecutar una pieza (checklist por sesión)

1. Leer este plan, el README de `art/blender/` del juego y los archivos que toque la pieza.
2. Escribir `modelar-<pieza>.py` a partir del script hermano más parecido.
3. Correrlo con `bpy-run.ps1`, revisar el render y corregir defectos.
4. Integrar en Three.js + inspector `dev/` + atajo de desarrollo.
5. `npm run build` y el QA del juego; probar escritorio y ventana angosta.
6. Actualizar el README del juego, la bitácora (5–10 líneas) y el inventario de este plan.
7. Detenerse. Publicar solo con OK de Luis.

## 6. Flujo con Astra (Codex): modelado separado de la integración

Astra gasta tokens solo en modelar. Claude o Gemini preparan el encargo, integran y prueban.

| Paso | Quién | Entrega |
|---|---|---|
| 1. Brief con ficha técnica | integrador (Claude/Gemini) | `art/blender/<modelo>/BRIEF.md` desde `plantillas-blender/BRIEF.md`: escala, ejes, cámara, presupuesto, partes con `part`/`segment` y pivotes, renders pedidos. Astra no abre el código. |
| 2. Modelado | **Astra** | en esa carpeta: `modelar-<modelo>.py`, `.blend`, `.glb`, `<modelo>.json` (`kit.export_parts`), renders y `ENTREGA.md` |
| 3. Aprobación | **Luis** | aprueba los renders o pide cambios (máx. 2 rondas de Astra) |
| 4. Integración | integrador | mueve el JSON a `src/`, carga, animación, destello, inspector, build, QA, escritorio/móvil, commit |

- Instrucción permanente para Astra: `plantillas-blender/INSTRUCCIONES-ASTRA.md` (incluye su revisión propia antes de entregar). Prompts listos para pegar (modelo nuevo y ronda de corrección): `plantillas-blender/PROMPTS-ASTRA.md`.
- Astra trabaja en el **checkout principal**, nunca en un worktree aislado; no toca nada fuera
  de la carpeta del modelo, ni hace commit.
- El script debe correr con `bpy-run.ps1` desde la instalación de Luis: si a Astra se le acaban
  los tokens, Claude continúa el mismo `modelar-<modelo>.py`.
- `kit.export_parts(ruta, meta)` (en `grados-mayores-juego/art/blender/kit.py`) exporta cada
  objeto con `part` por separado: pivote, geometría relativa, índices, color de vértice y
  material. Mismo formato que la Medusa Luna, más `segment`, `metalness` y `roughness`.
- Modelos atados a la pantalla (cabinas) no se separan limpio: su brief debe fijar los módulos
  y anclas desde el principio.
- Los modelos nuevos van en subcarpeta `art/blender/<modelo>/`; los existentes no se mueven
  (los juegos los cargan desde sus rutas actuales).
