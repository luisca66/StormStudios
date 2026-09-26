# Manual de renovación 3D

Cómo renovar un nivel o un juego con modelos de Blender usando las herramientas nuevas
(`apps-src/shared-3d` y `kit.export_glb`). Escrito por Claude el 2026-09-24, después de probarlas.
Complementa a `PLAN-3D-BLENDER.md` (método, inventario y reglas de siempre) y a
`AUDITORIA-JUEGOS-2026-09-24.md` §7 (por qué se cambió el flujo).

> **Regla de siempre:** nada se publica (`npm run deploy`, `public/apps`, merge a `main`) sin OK de Luis.

**Qué está probado y qué no.** Lo marcado ✅ se probó con los 33 modelos publicados, en la nube y en
la PC de Luis. Lo marcado ⏳ está diseñado, pero se estrena en el piloto de La Pradera; al terminarlo
se actualiza este manual.

---

## 1. El flujo en una página

```
 Luis decide         Claude prepara          Astra / Claude / CC0 modelan        Luis aprueba         Claude integra
┌─────────────┐    ┌──────────────────┐     ┌───────────────────────────┐     ┌───────────────┐     ┌──────────────────┐
│ 1 Dirección │ →  │ 2 Bloqueo en el  │  →  │ 4 Modelado                │  →  │ 5 Capturas con│  →  │ 6 Integración    │
│   visual    │    │   juego          │     │   script + GLB + JSON     │     │   luz del nivel│    │ 7 Medir y publicar│
│             │    │ 3 Lista de piezas│     │   (kit.export_glb)        │     │   + presupuesto│    │   (con OK)        │
└─────────────┘    │   y briefs       │     └───────────────────────────┘     └───────────────┘     └──────────────────┘
                   └──────────────────┘
```

Lo que cambia respecto al flujo anterior:

| Antes | Ahora |
|---|---|
| Pieza por pieza, cada brief con su propia referencia | **Por nivel**: una dirección visual y un bloqueo para todas las piezas |
| Luis aprueba renders de Cycles (luz distinta a la del juego) | Luis aprueba **capturas del inspector con la luz del nivel** |
| Todo se modela a medida | Lo genérico (rocas, plantas) puede salir de **bibliotecas CC0**; Astra solo los protagonistas |
| JSON de geometría + un cargador escrito a mano por modelo | **GLB** (la mitad de peso) y **un solo cargador** (`loadModel`) |
| Color plano por vértice | **Oclusión ambiental horneada** opcional (`ao=`) |
| Personajes de partes rígidas animadas por código | Rígidas para robots y crustáceos; **esqueleto** para orgánicos ⏳ |

---

## 2. Herramientas

Todo se corre desde `apps-src\shared-3d` (la primera vez: `npm install`).

| Comando | Qué hace | Estado |
|---|---|---|
| `npm run dev` | **Inspector** en http://127.0.0.1:5190: cualquier modelo de cualquier juego, con la luz de cada nivel, lista de partes, alambre, pivotes, triángulos y peso. Se le puede **arrastrar** un `.glb` o `.json` | ✅ |
| `npm run capture -- --src=<ruta> --preset=<nivel>` | Capturas de aprobación + reporte de presupuestos en `.cache/capturas/reporte.md` | ✅ en la nube · ⏳ en Windows |
| `npm run convert-all` | GLB de todos los modelos publicados (para compararlos) | ✅ |
| `npm run compare` | Prueba visual JSON vs GLB, píxel a píxel | ✅ |
| `npm run check` | Tipos y pruebas (los corre la CI) | ✅ |
| `kit.export_glb(...)` en Blender | Exporta GLB (y JSON si se pide), con AO opcional | ✅ en la PC de Luis |

**Luces disponibles (`--preset`):** `neutro` (estudio, para revisar forma) y `multi-1-pradera`,
`multi-2-oceano`, `multi-3-cosmos`, `multi-4-pantano`, `multi-5-nubes`. Están copiadas de
`oido-absoluto-multi-juego/src/3d/environment.ts`; si el juego cambia su luz, hay que actualizar
`apps-src/shared-3d/inspector/presets.ts`. Para otro juego se agrega su preset igual.

**Capturas en Windows (primera vez):** Playwright necesita su Chromium:
`npx playwright install chromium` dentro de `apps-src\shared-3d`. ⏳ Sin probar aún en la PC de Luis.

---

## 3. Paso a paso por nivel

### Paso 1 · Dirección visual — Luis decide (Claude propone)

Antes de cualquier brief. Una sección como la §2 de `apps-src/oido-absoluto-multi-juego/PLAN-OCEANO-BLENDER.md`:

- Una frase de estilo («arrecife tropical soleado, caricatura amable»).
- Qué lo distingue de los otros niveles y juegos (p. ej. el Cosmos no debe parecerse a El Cometa).
- Paleta en hex (fondo, luz, 4–6 acentos).
- Imagen de concepto o referencias (solo forma; no se redistribuyen).
- Si la luz del nivel cambia, se decide aquí y se copia a `presets.ts` **antes** de modelar.

Sale en `apps-src/<juego>/PLAN-<NIVEL>-BLENDER.md`.

### Paso 2 · Bloqueo en el juego — Claude

Cajas y cilindros del tamaño final, en su lugar del nivel, para fijar escala, composición y lo que
ve la cámara. Se valida jugando: si algo tapa la vista o queda chico, se corrige aquí, que es gratis.
El bloqueo da las medidas y la distancia de cámara que van en cada brief.

### Paso 3 · Lista de piezas y reparto — Claude, OK de Luis

Una tabla en el plan del nivel (como la de `AUDITORIA-NUBES-BLENDER.md`):

| Pieza | Quién | Criterio |
|---|---|---|
| Lo que tiene que ser hermoso (protagonistas, primer plano) | **Claude con bpy** | Es donde más se nota la calidad |
| Lo complejo que conviene hacer en paralelo (arquitectura grande, criaturas) | **Astra** | Brief corto y creativo |
| Lo simple (kits de rocas, setos, muros, portones, objetivos geométricos) | **Gemini** | Brief con receta completa (`BRIEF-GEMINI.md`) |
| Mariposas, luciérnagas, partículas, ondas | **Código** | Son efectos, no modelos |

Reparto y reglas para que los tres agentes no se pisen: `plantillas-blender/REPARTO-AGENTES.md`
(2026-09-26). Los assets CC0 quedan como plan B si una pieza simple no sale bien.

A cada pieza se le asigna un tipo de `apps-src/shared-3d/presupuestos.json` (protagonista, objetivo,
hito, instanciado, cabina) y se agrega ahí con su id `<juego>/<modelo>`.

Luego un `BRIEF.md` por pieza desde `plantillas-blender/BRIEF.md`.

### Paso 4 · Modelado

Cada pieza en `apps-src/<juego>/art/blender/<modelo>/` con su `modelar-<modelo>.py`. Al final del
script, en lugar de (o además de) `export_parts`:

```python
parts, tris, size = kit.export_glb(
    ROOT / "<modelo>-juego.glb", meta=meta,
    ao={"distance": 0.6, "strength": 0.85},   # opcional: oclusión ambiental horneada
    json_path=ROOT / "<modelo>.json",          # mientras el juego cargue JSON
)
print("EXPORT", parts, "partes", tris, "triangulos", size // 1024, "KB")
```

- `distance` es el alcance de la sombra en metros (1 u = 1 m): 0.3–1 para piezas de pocos metros
  (el cangrejo se probó con 0.6), 2–5 para edificios como Atlántida. `strength` 0.6–0.9. Revisar
  en las capturas del paso 5; si no convence, se quita el `ao`.
- Solo las piezas con `part` hacen sombra: los pisos o fondos «solo render» no cuentan.
- `pack` por defecto es `meshopt-q` (ligero). Usar `meshopt` (exacto, más pesado) solo si una
  captura muestra un defecto de precisión.
- Requiere Node en el PATH y `npm install` en `apps-src\shared-3d`.

**CC0:** descargar el `.glb`/`.fbx` a `art/blender/<modelo>/fuente/`, importarlo en el script,
recolorearlo con color por vértice a la paleta del nivel y exportar con `kit.export_glb` como
cualquier otra pieza. Registrar autor, enlace y licencia en el README del juego (§6). ⏳ Se estrena
en La Pradera.

### Paso 5 · Aprobación con capturas — Luis

Claude (o quien integre) genera las capturas con la luz del nivel y a la distancia del juego:

```powershell
npm run capture -- --src=..\<juego>\art\blender\<modelo>\<modelo>-juego.glb --preset=multi-1-pradera --views=front,three-quarter,side
npm run capture -- --src=..\<juego>\art\blender\<modelo>\<modelo>-juego.glb --preset=multi-1-pradera --distance=40
```

Luis aprueba **esas capturas**, no los renders de Cycles (que Astra puede seguir haciendo como
referencia). El reporte marca si la pieza pasa del presupuesto; si pasa, se decide antes de integrar.
Máximo 2 rondas de Astra por pieza, como siempre.

### Paso 6 · Integración — Claude

1. **Una sola vez por juego** (la primera pieza que use la librería):
   - En `vite.config.ts`: `resolve: { dedupe: ["three"] }`. **Obligatorio**: sin esto el juego lleva
     dos copias de Three.js (en Walking AP Multi, de 601 KB a 1 169 KB).
2. Por pieza, un archivo corto en `src/3d/` en lugar de un cargador completo:

```ts
import * as THREE from "three";
import modelUrl from "../../art/blender/<modelo>/<modelo>-juego.glb?url";   // o una copia en src/3d/assets
import { buildModel, disposeObject, loadModel, type ModelData } from "../../../shared-3d/src";

let model: ModelData | undefined;
export const preloadThing = () => loadModel(modelUrl).then((m) => { model = m; });

export function buildThing() {
  if (!model) throw new Error("Precargar antes de armar.");
  const built = buildModel(model);            // una malla por parte, en su pivote
  const [tail] = built.byPart("tail");        // partes por nombre y segment
  const legs = built.byPart("leg");           // legs[segment]
  return { root: built.root, update(t: number) { if (tail) tail.rotation.y = Math.sin(t * 3) * 0.3; } };
}
// Al retirar: disposeObject(root)  (las geometrías viven en la caché y se comparten)
```

- `buildModel(model, { vertexEmission: { cacheKey, time, hz, amount } })` activa la emisión por vértice.
- `model.meta` trae lo que el script dejó (anclas, colisionadores).
- Los modelos ya publicados **no se migran**: siguen con su JSON y su cargador hasta que haya que tocarlos.

3. Atajo de desarrollo para ver la pieza sin jugar (`?dev=1` o tecla), como en los otros juegos.
4. `npm run build` del juego y QA en escritorio y ventana angosta.

### Paso 7 · Medir y publicar — Luis mide, Claude publica con OK

- FPS en la PC de Luis con el nivel completo (plataforma objetivo: laptop y escritorio).
- Draw calls y triángulos del nivel (panel de desarrollo del juego).
- Actualizar el README del juego, la bitácora y el inventario de `PLAN-3D-BLENDER.md`.
- `npm run deploy` y commit **solo con OK de Luis**.

---

## 4. Personajes con esqueleto ⏳

Para el cocodrilo (Glub no lo necesita: sus manos y pies flotan separados del cuerpo y bastan partes
rígidas; ver `PLAN-PRADERA-BLENDER.md` §2): malla con esqueleto (armature) y clips hechos en Blender (caminar, saltar,
festejar), reproducidos con `AnimationMixer` de Three.js. Hoy `shared-3d` y `kit.export_glb` manejan
**partes rígidas**; el esqueleto se agrega con el cocodrilo (El Pantano):

- Astra entrega el `.blend` con armature y acciones nombradas (`caminar`, `saltar`, `festejar`).
- Se exporta con el exportador glTF de Blender (con animaciones), no con `export_parts`.
- `shared-3d` gana un `loadCharacter` que devuelve la escena con esqueleto y un mixer.
- Este manual se actualiza con lo que se aprenda.

---

## 5. Solución de problemas

| Síntoma | Causa | Qué hacer |
|---|---|---|
| `export_glb necesita Node` | Node no está en el PATH de bpy | Instalar Node o definir la variable `NODE` con la ruta a `node.exe` |
| `json-to-glb falló (¿npm install…?)` | Falta `node_modules` en `shared-3d` | `npm install` en `apps-src\shared-3d` |
| El juego pesa el doble o avisa «Multiple instances of Three.js» | Falta `dedupe` | `resolve: { dedupe: ["three"] }` en `vite.config.ts` del juego |
| El GLB se ve más chico o encuadrado distinto que el JSON | Triángulos de área cero que gltfpack quita (agrandaban la caja) | Nada: no se ven. `npm run compare` ya encuadra todos los formatos con la caja del JSON |
| Un farol o brillo se ve más apagado | Color por vértice mayor que 1 recortado | Ya lo resuelve `colorScale`; si aparece, avisar a Claude |
| La emisión por vértice desaparece | Atributo propio descartado por gltfpack | Ya va en `COLOR_1`; si aparece, avisar a Claude |
| El piso o un objeto auxiliar oscurece el modelo en la AO | Objeto con `hide_render` apagado | Ya se ocultan solos; solo cuentan las piezas con `part` |
| `npm run capture` no abre Chromium en Windows | Falta el navegador de Playwright | `npx playwright install chromium` en `apps-src\shared-3d` |
| Un modelo pasa del presupuesto | Pieza más pesada que lo aprobado | Decidir con Luis: simplificar o subir el tipo en `presupuestos.json` |

---

## 6. Registro de assets CC0

Cada juego que use assets externos agrega en su README:

| Asset | Autor | Fuente (enlace) | Licencia | Dónde se usa | Cambios |
|---|---|---|---|---|---|

Solo CC0 (o licencias que permitan uso comercial sin atribución obligatoria). Fuentes sugeridas:
Kenney, Quaternius, Poly Haven. Ante la duda, no se usa.
