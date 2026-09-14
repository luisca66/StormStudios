# BRIEF — Sifonóforo · Batisfera

> Escrito por Claude (integrador) el 2026-09-13. Astra modela a partir de este archivo; puede
> consultar lo que necesite, pero aquí están los datos del juego.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/sifonoforo/` (checkout principal).
> Referencia de método más reciente: `../pulpo-dumbo/` (script con comprobación de encuadre y
> uniones, `ENTREGA.md` con valores de animación).

## 1. Qué es y dónde se ve

- Papel: sexta criatura de Batisfera (juego de reconocer acordes bajo el mar). El jugador la
  toca, suena un acorde y **la cadena se enciende por tramos: un tramo de faroles por nota**.
- Es una colonia larga y ondulante: una **cadena vertical de faroles** que serpentea en la oscuridad.
- Dónde aparece: **zonas 3, 4 y 5** (1000–11 000 m). Acordes de 3 a 7 notas.
- Cuántos a la vez: hasta 6 criaturas de varias especies; normalmente 1–2 sifonóforos.
- Distancia a la cámara: aparece a 25–70 u; el jugador la activa a **≤ 30 u**.
- A 30 u la cadena completa (≈ 6.8 u) ocupa ≈ 20 % de la altura de la pantalla.
- El juego la escala entre ×0.85 y ×1.35 según el registro del acorde.

## 2. Cómo se arma en el juego (importante)

El juego **no recibe la colonia entera**: recibe piezas y las encadena en tiempo real a lo largo
de una curva que ondula, repitiendo el mismo nodo con instancias (pocas llamadas de dibujo):

```
head        ← flotador y campanas de natación
node ×14    ← el mismo cormidio repetido, cada uno colgando del anterior
tail        ← remate inferior
```

- Cada `node` se coloca con su pivote en un punto de la curva y se orienta para que su eje −Y
  apunte al pivote del siguiente. Por eso **el tallo de cada nodo va de su pivote hasta 0.42 u más
  abajo**, justo donde empieza el siguiente: la cadena se ve continua aunque ondule.
- Las uniones deben tolerar **±0.25 rad** de ángulo entre nodos consecutivos sin huecos visibles
  (el tallo puede rematar en un pequeño nudo o engrosamiento que tape la articulación).
- El juego variará cada instancia con un giro alrededor del tallo y ±10 % de escala.

## 3. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. La cadena **cuelga hacia −Y** (en Blender: hacia −Z). Sin frente: simetría radial aproximada |
| Separación entre nodos | **0.42 u** exactos (pivote de un nodo → pivote del siguiente) |
| Tamaños | `head` ≈ 0.9 u de alto × 0.7 u de ancho · `node` cabe en un radio de 0.35 u alrededor del tallo, tentáculos colgando ≤ 0.5 u · `tail` ≤ 0.9 u de alto |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | `head` ≤ 3 000 tri · `node` ≤ 500 tri · `lantern` ≤ 150 tri · `tail` ≤ 1 000 tri |
| Transparencias | solo en las campanas de natación de `head`, con alfa ≥ 0.55; lo demás opaco (las instancias transparentes no se ordenan bien) |
| Fondo del juego | de `#0b2438` (zona 3) a casi negro `#000203` (zona 5). Luz ambiental baja o nula; el submarino ilumina con un foco blanco frío `#d6ecff` desde la cámara |

## 4. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part`. El **origen del objeto es su pivote**.
**Exporta solo estas cuatro piezas**: las copias que armes para los renders no deben llevar `part`
(si duplicas un objeto, borra la propiedad en la copia).

| `part` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|
| `head` | 1 | punto de unión inferior, donde cuelga el primer nodo | leve balanceo; encabeza la curva |
| `node` | 1 | punto más alto del tallo del nodo | se repite 14 veces con instancias a lo largo de la curva |
| `lantern` | 1 | **el mismo pivote que `node`** | el farol luminoso del nodo; se instancia igual y **se enciende por tramos** con el color de la familia |
| `tail` | 1 | punto más alto de su tallo | remate de la cadena, sigue el último punto de la curva |

- `lantern`: emisión **casi blanca** (`#fff6ea`) e intensidad 1.5–2.5; el juego la tiñe con la
  familia: ámbar `#ffd27f` (zona 3), magenta `#ff7fd0` (zona 4), verde `#7fffc8` (zona 5).
- `head`, `node` y `tail` sin emisión; se ven por el foco del submarino y por la luz de los faroles.

## 5. Dirección artística

- **Estilo:** coherente con Medusa Luna, Calamar Vela, Rape Abisal y Pulpo Dumbo: realista estilizado.
  El sifonóforo es la criatura **elegante y misteriosa**: un collar vivo de luces.
- **`head`:** flotador pequeño en forma de gota en la cima y, debajo, un racimo de 6–10 campanas de
  natación translúcidas y facetadas, apiladas alrededor del tallo.
- **`node` (cormidio):** tramo de tallo fino; una bráctea protectora en forma de hoja o escudo
  gelatinoso; un gastrozoide (saco alimentario) y 2–4 tentáculos finos colgando con algo de curva.
- **`lantern`:** el órgano luminoso del cormidio, pequeño y bien definido (bulbo, cápsula o
  conjunto de puntos), situado de forma que se vea desde varios ángulos.
- **`tail`:** tallo que se afina con una franja final de tentáculos más largos.
- **Paleta sugerida:** tallo y brácteas pálidos, crema y rosa (`#f2d9c4`, `#e6c9c0`); gastrozoides
  naranja-rojizo (`#d9573b`); campanas de `head` blanco azulado (`#dfe9ec`); tentáculos rosados.
- **Materiales:** gelatinoso satinado (rugosidad baja-media), sin metal.
- **Detalle:** lo necesario para leerse a ≈ 10 u; el nodo se repite 14 veces, así que conviene
  sencillo y bien resuelto antes que recargado.
- **Libertad de Astra:** forma exacta de brácteas, campanas y faroles, número de tentáculos, curva
  de reposo y paleta dentro del rango.
- Referencias: sifonóforos fisonectes (Marrus, Apolemia, Praya); solo como guía de forma.

## 6. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#050d18`, luz ambiental baja + foco blanco frío desde la
cámara; faroles con su emisión. Para los renders arma la colonia completa: `head` + 14 copias de
`node` y `lantern` + `tail`, en una curva suave en forma de S (sin `part` en las copias).
Nombres fijos, en esta carpeta:

1. `render-juego.png` — cámara a **25 u** del centro de la cadena, vista frontal ligeramente desde
   arriba, FOV 60, 1600×900. La cadena ocupa ≈ 24 % de la altura del cuadro.
2. `render-cerca.png` — cámara a **10 u** de `head` y los primeros nodos, vista 3/4, FOV 60, 1600×900.
   `head` y los primeros 5 nodos (≈ 3 u) ocupan ≈ 26 % de la altura del cuadro. Aquí se juzga el estilo.
3. `render-perfil.png` — la colonia completa, fondo algo más claro (`#0b2438`), 1200×900.
4. `render-detalle.png` — un solo `node` con su `lantern`, 1200×900.

## 7. Criterios de aceptación

- [ ] Ejes, separación de 0.42 u y pivotes de la ficha técnica.
- [ ] Presupuesto por pieza respetado (anotar los triángulos de cada una en `ENTREGA.md`).
- [ ] El JSON contiene exactamente `head`, `node`, `lantern` y `tail` (lo imprime `kit.export_parts`).
- [ ] Sin huecos visibles entre nodos consecutivos con ±0.25 rad de ángulo (comprobarlo en el script, como hizo el Pulpo Dumbo con su membrana).
- [ ] En `render-juego.png` se lee una cadena de faroles; en `render-cerca.png`, campanas, brácteas y tentáculos sin caras planas visibles.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] `ENTREGA.md` trae los valores de animación sugeridos: velocidad y amplitud de la onda de la cadena, balanceo de `head` y movimiento de los tentáculos si aplica.
- [ ] `sifonoforo.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-sifonoforo.py`, en UTF-8.
- [ ] En la carpeta quedan solo los entregables.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 8. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-sifonoforo.py`. La integración (curva, instancias, encendido por tramos) la hace el
integrador después de que Luis apruebe los renders.
