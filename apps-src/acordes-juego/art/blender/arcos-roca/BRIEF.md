# BRIEF — Arcos de roca de la zona crepuscular · Batisfera (`acordes-juego`)

> Escrito por Claude (integrador) el 2026-09-17. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/arcos-roca/` (checkout principal).
> Plan del entorno: `../../../PLAN-ENTORNO-BLENDER.md` (esta es la pieza 2 de 7).
> Pieza hermana ya integrada, **misma roca y mismas convenciones**: `../barco-hundido/`
> (su `modelar-barco.py` resuelve la repisa pegada a la pared curva; reutiliza esa idea).
> **Plataforma: laptop y escritorio.**

## 1. Qué es y dónde se ve

- Papel: **referencias de orientación de la zona 2** (Zona Crepuscular, 200–1000 m). La luz del sol
  se apaga en esta zona; los arcos son siluetas enormes que el jugador usa para saber dónde está.
- Batisfera es un juego de reconocer acordes: el jugador baja por un **pozo vertical** (radio 90 u)
  rodeado de pared de roca y captura criaturas. Los arcos son **decorado**: no se tocan ni suenan.
- Hoy son 4 toros deformados que **flotan a media agua**, sin tocar la pared ni nada. Eso se ve
  falso. Los nuevos arcos **nacen de la pared y vuelven a la pared**: puentes naturales de roca,
  como ventanas que la erosión abrió en la fosa. El jugador **puede pasar nadando por debajo**.
- Cuántos: **2 variantes** (A y B). El juego coloca **4 arcos** (cada variante dos veces, a distintas
  alturas y ángulos, una de ellas espejada en X).
- Distancias: se descubren a **60–90 u** (silueta oscura contra el agua), se ven bien a **25–50 u** y
  el jugador pasa **por dentro del ojo del arco a 2–10 u** (no hay colisión con decorado).

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **−Z apunta al centro del pozo**; +Z es la pared |
| Origen de cada variante | **punto de la cara de la pared, a media luz del arco, a la altura del pie más bajo** (y = 0) |
| Colocación | el juego pone el origen a **96 u** del eje del pozo, y entre −170 y −280, y solo lo gira alrededor del eje del pozo (y lo espeja en X en una copia) |
| Pared detrás | cilindro de radio **96** con centro en `(0, y, −96)` del espacio local: pasa por el origen y **se curva hacia el jugador** en los extremos. Los dos pies y el lomo del arco deben **nacer de esa curva**, metidos 2–4 u dentro de la pared, sin dejar costuras en el aire |
| Tamaño | luz (ancho del ojo) **24–36 u** a lo largo de X · altura total **22–34 u** · el arco se separa de la pared **hasta 26 u** hacia −Z (llega a r ≈ 70 del eje) y **no menos de 16 u** |
| Ojo del arco | hueco libre de **≥ 12 u de alto y ≥ 10 u de fondo** entre pared y arco, para que la Batisfera (≈ 4 u) pase holgada por dentro |
| Grosor | el lomo nunca menos de **3.5 u** de grueso; los pies más anchos que el lomo |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1; el mundo se ve a través de un cristal curvo |
| Presupuesto | **≤ 14 000 triángulos por variante** (≤ 28 000 las dos) y **≤ 3 mallas por variante** |
| Transparencias | ninguna |
| Fondo del juego | agua `#1b4f72` arriba de la zona a `#0b2438` abajo, niebla exponencial 0.012–0.016, luz ambiente azulada `#cfe8ff` de intensidad 0.55 → 0.30, sol cenital `#eaf6ff` 0.4 → 0 (en el fondo de la zona ya no hay sol). Nieve marina en suspensión |

**Diferencia entre variantes** (para que no se lean como copias):

- **A — «Puente»**: arco ancho y bajo, casi horizontal, luz 30–36 u, un pie más grueso que el otro.
- **B — «Ojo»**: arco alto y estrecho, luz 24–28 u, altura 28–34 u, con un **espolón roto** que cuelga
  del lomo y un derrumbe de bloques al pie.

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` y propiedad `variant` (`"A"` o `"B"`).
El **origen del objeto es su pivote**. Las dos variantes van en el **mismo** `.blend`, `.glb` y JSON,
separadas en X para los renders pero **cada una con su propio origen en (0, 0, 0)** en el JSON
(el pivote exportado es el origen de su variante).

| `part` | Cuántas por variante | Pivote | Qué hace el juego |
|---|---|---|---|
| `rock` | 1 | origen de la variante | arco, pies y bloques caídos; fijo |
| `growth` | 1 | origen de la variante | esponjas de copa, corales látigo y crinoideos sobre el lomo y en los pies, con pigmento propio; fijo |
| `glow` | 1 | origen de la variante | **manchas de bioluminiscencia** (colonias tipo liquen o puntos) repartidas bajo el lomo y dentro del ojo del arco. Única parte emisiva, color **`#b48cff`** (violeta de la zona 2), emisión 1.0–1.6. El juego la hace respirar despacio |

`meta` en el JSON (claves en la raíz, como en el barco):

- `variants`: `{ "A": { "span": luz, "height": altura, "reach": separación máxima de la pared, "passage": [x, y, z] }, "B": { … } }`
  donde `passage` es el **centro del ojo del arco** (espacio Three, relativo al origen de la variante).
  El juego lo usa para verificar que el jugador cabe y para poner un leve destello al cruzarlo.
- `wallRadius`: 96 · `wallCenter`: [0, 0, −96] · `forward`: "−Z".

## 4. Dirección artística

- Estilo: **realista estilizado**, igual que el barco y las criaturas: formas grandes y legibles.
  En esta zona la niebla y la poca luz se comen el detalle; **manda la silueta del arco**.
- Roca: **la misma familia que la repisa del barco**, azul negruzco `#0d151d` a `#1f2a33` con acento
  `#293946` para los estratos. **Estratos horizontales** que continúan de un pie al otro (el arco es lo
  que quedó de una capa más dura), aristas rotas, caras de fractura limpias, algo de sedimento claro
  `#3a4650` en las superficies que miran arriba.
- La parte interior del ojo es más lisa (la corriente la pulió); la exterior es más áspera.
- Crecimiento (`growth`): **escaso** comparado con el barco (hay menos luz): esponjas de copa gris
  pálido `#8e8a7c`, corales látigo rojo apagado `#6a2f2c`, crinoideos (lirios de mar) crema `#b9ad90`
  en el borde superior del lomo, donde pega la corriente. Nada de algas verdes.
- Bioluminiscencia (`glow`): **constelaciones de puntos y manchas pequeñas**, más densas bajo el
  lomo y en el ojo del arco, casi nada en la cara exterior. Debe verse de lejos como **un contorno
  tenue que dibuja la curva del arco** cuando la roca ya no se distingue en la oscuridad.
- Materiales: roca y crecimiento rugosos (roughness ≥ 0.85), metalness 0.
- Libertad de Astra: forma exacta de cada arco, cuánto se funde con la pared, composición del
  derrumbe y reparto del crecimiento, siempre dentro de medidas y presupuesto.
- **No**: formas simétricas perfectas, arcos que parezcan construidos (sin dovelas ni ruinas),
  cristales, ni colores fuera de la paleta. Tono sereno, de catedral natural.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise. **Fondo azul oscuro `#123a57` con niebla volumétrica ligera**, luz
cenital fría **débil** y la emisión de `glow` activa. Incluir un plano curvo de radio 96 detrás como
pared, solo para los renders. Nombres fijos:

1. `render-juego.png` — las dos variantes lado a lado, a 70 u desde el centro del pozo, FOV 60, 1600×900: ¿se leen como arcos en la penumbra?
2. `render-oscuro.png` — la misma cámara con la luz cenital **apagada** y fondo `#0b2438`: solo roca apenas visible y `glow`. ¿El brillo dibuja la curva?
3. `render-cerca.png` — variante B a 25 u, vista 3/4 desde abajo, FOV 60, 1600×900: aquí se juzga el estilo.
4. `render-paso.png` — desde dentro del ojo de la variante A, cámara a 3 u del `passage` mirando a lo largo de X, FOV 60, 1600×900: lo que ve el jugador al cruzar.
5. `render-perfil.png` — vista superior (planta) de las dos variantes sin niebla, con la curva de radio 96 dibujada, 1600×900: confirma separación de la pared y ojo libre.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica; pies y lomo nacen de la curva de radio 96 sin costuras.
- [ ] Ojo libre ≥ 12 u de alto y ≥ 10 u de fondo en las dos variantes (visible en `render-perfil.png`).
- [ ] ≤ 14 000 triángulos y ≤ 3 mallas por variante (lo imprime `kit.export_parts`).
- [ ] Existen `rock`, `growth` y `glow` por variante, con `variant`, y `meta.variants` con `span`, `height`, `reach` y `passage`.
- [ ] A y B se distinguen a 70 u sin explicación.
- [ ] En `render-oscuro.png` el `glow` dibuja la curva de cada arco.
- [ ] En `render-cerca.png` no hay toros, cilindros ni esferas que delaten primitivas.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] `glow` es la única parte emisiva.
- [ ] El script corre con `bpy-run.ps1` desde la instalación de Luis y regenera todo.

## 7. Entregables

En esta carpeta: `modelar-arcos.py`, `arcos-roca.blend`, `arcos-roca.glb`, `arcos-roca.json`
(`kit.export_parts` con `meta`), los 5 renders y `ENTREGA.md`.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-juego\art\blender\arcos-roca\modelar-arcos.py
```

## 8. Rondas

Máximo 2 rondas de corrección. Si se agotan los tokens, Claude continúa desde `modelar-arcos.py`.
