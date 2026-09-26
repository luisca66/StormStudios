# Reparto de agentes: Claude dirige; Astra y Gemini modelan

Acordado con Luis el 2026-09-26. Objetivo: **gastar menos tokens de Claude y de Astra** pasando a
Gemini todo lo que sea simple y se pueda describir con precisión. Complementa a
`MANUAL-RENOVACION-3D.md` (el flujo técnico) y a `PLAN-3D-BLENDER.md` §6.

---

## 1. Quién hace qué

| Agente | Recibe | Tipo de encargo | Cómo se le escribe |
|---|---|---|---|
| **Claude** (director) | a Luis | Dirección visual, bloqueo, briefs, **modelos que tienen que ser hermosos** (protagonistas, piezas de primer plano), integración en el juego, capturas, QA, commit y deploy | — |
| **Astra** (Codex) | prompt de Claude, que Luis pega | **Modelos complejos en paralelo** a Claude: arquitectura grande, criaturas, piezas con mucho carácter | **Corto y creativo**: la idea, el ambiente, el contrato mínimo. Astra imagina muy bien; no se le da receta (`BRIEF.md` en modo Astra) |
| **Gemini** | prompt de Claude, que Luis pega | **Modelos simples**: kits de rocas, setos, muros, portones, objetivos geométricos, utilería | **Detallado**: medidas, receta de construcción paso a paso, colores en hex, código de exportación, lista de comprobación (`BRIEF-GEMINI.md`) |
| **Luis** | — | Aprueba la dirección visual y las capturas; pega los prompts; mide FPS | — |

Regla para decidir: *¿se puede describir la pieza con una receta de cajas, cilindros, esferas deformadas
y modificadores, sin que el resultado dependa del gusto?* → **Gemini**. *¿Tiene que enamorar?* →
**Claude**. *¿Es compleja y conviene hacerla al mismo tiempo que otra hermosa?* → **Astra**.
Efectos (mariposas, luciérnagas, partículas) → **código**, no modelo.

---

## 2. Reglas para que nadie pise a nadie

Los tres trabajan **en el mismo checkout** de la PC de Luis. Estas reglas lo hacen seguro.

### 2.1 Una carpeta por encargo, un dueño por carpeta

- Cada encargo vive en `apps-src/<juego>/art/blender/<modelo>/`. **Solo el dueño escribe ahí.**
- Claude crea la carpeta con su `BRIEF.md` (o `BRIEF-GEMINI.md`) **antes** de mandar el prompt y apunta
  el encargo en el **tablero** del plan del nivel (§3). Nadie más edita el brief.
- Astra y Gemini **no escriben fuera de su carpeta**. Ni `src/`, ni `public/`, ni `shared-3d/`, ni
  `kit.py`, ni otros modelos, ni `package.json`, ni los planes.
- `kit.py` es de solo lectura para todos menos Claude. Si a alguien le falta una función, la escribe
  dentro de su propio `modelar-<modelo>.py`.

### 2.2 Git y comandos: solo Claude

- **Solo Claude hace git** (add, commit, push, merge, branch, checkout). Astra y Gemini no ejecutan
  ningún comando de git, ni siquiera `stash`, `checkout` o `pull`.
- Mientras Astra o Gemini tengan un encargo abierto, **Claude no cambia de rama en el checkout
  principal**: si necesita otra rama, usa un `git worktree` aparte. Así los archivos no cambian bajo
  los pies de nadie.
- Claude agrega a los commits **rutas explícitas**, nunca `git add -A`, y no commitea carpetas de
  encargos abiertos.
- Astra y Gemini solo ejecutan el lanzador de Blender (`bpy-run.ps1`) sobre su script. No ejecutan
  `npm install`, `npm run build`, `dev`, `capture` ni `deploy`: las capturas y el inspector son de
  Claude (usan puertos y la carpeta `.cache` de `shared-3d`).

### 2.3 Entregar y avisar

- El encargo termina cuando la carpeta tiene todos los archivos del brief y `ENTREGA.md` dice
  `Lista para: revisión`. El agente se detiene y resume en su chat.
- Luis le avisa a Claude: «Gemini entregó rocas» / «Astra entregó castillo». Claude revisa, genera las
  capturas con la luz del nivel y se las pasa a Luis.
- Correcciones: Claude escribe el prompt de la ronda (máx. **2 rondas** por agente y pieza). Si se
  agotan, Claude termina la pieza desde el mismo `modelar-<modelo>.py`.

### 2.4 Uno a la vez por agente

- Astra: **un encargo abierto** a la vez. Gemini: **un encargo abierto** a la vez. Claude modela como
  máximo una pieza propia mientras los otros dos trabajan.
- Así hay como mucho **tres carpetas abiertas** y ninguna compartida.

---

## 3. El tablero

Cada plan de nivel (`apps-src/<juego>/PLAN-<NIVEL>-BLENDER.md`) tiene una tabla que **solo Claude
edita**:

| Pieza | Carpeta | Dueño | Estado | Ronda |
|---|---|---|---|---|
| Rocas | `rocas-pradera/` | Gemini | 🔨 en curso | v1 |

Estados: `⏳ en cola` → `🔨 en curso` → `📦 entregada` → `👀 capturas con Luis` → `✅ aprobada` →
`🎮 integrada` → `🚀 publicada`.

---

## 4. Ahorro de tokens

- A Astra **no se le explica el juego ni el código**: el brief trae la idea y el contrato mínimo, y
  ella busca referencias solo si las necesita.
- A Gemini se le da **todo resuelto** (medidas, colores, pasos, código de exportación) para que no
  explore el proyecto: lee su brief y un script de referencia, nada más.
- Claude no revisa los scripts de los otros línea por línea: revisa la **entrega** (`ENTREGA.md` +
  capturas con la luz del nivel + reporte de presupuesto).
- Las capturas sustituyen a las rondas «a ciegas»: Luis aprueba lo que se verá en el juego.

Archivos de cada agente:

| Agente | Instrucción permanente | Prompts para pegar | Plantilla de brief |
|---|---|---|---|
| Astra | `INSTRUCCIONES-ASTRA.md` | `PROMPTS-ASTRA.md` | `BRIEF.md` (modo Astra) |
| Gemini | `INSTRUCCIONES-GEMINI.md` | `PROMPTS-GEMINI.md` | `BRIEF-GEMINI.md` |
| Ambos | — | — | `ENTREGA.md` |
