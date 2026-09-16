# BRIEF — Portal atlante · Walking AP Multi, Nivel 2 «El Océano»

> Escrito por Claude (integrador) el 2026-09-16. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/oido-absoluto-multi-juego/art/blender/portal/` (checkout principal).
> Plan del nivel: `../../../PLAN-OCEANO-BLENDER.md` (fila 4 de la tabla §3). Piezas hermanas ya
> integradas: `../atlantida/` (misma civilización, mismo léxico de piedra y oro), `../pez/`,
> `../almeja/`, `../ballena/`, `../arrecife/`, `../cangrejo/`, `../tortuga/`.
> **Plataforma: laptop y escritorio.** No hay que recortar presupuesto pensando en teléfonos.
> Es la **última pieza pendiente** del nivel: con esta se cierra el rediseño completo.

## 1. Qué es y dónde se ve

- Papel: **la compuerta de salida del nivel**, sellada en el fondo de arena. El jugador (un pez) la
  encuentra en la esquina opuesta a Atlántida, se activa al pasar cerca y se abre en el sitio como un
  mecanismo antiguo despertando — no es una puerta que se cruza de lado, es un **iris horizontal**
  incrustado en el suelo marino que se abre hacia abajo para revelar el paso.
- Hoy existe como placeholder (`src/3d/gate.ts`, nivel 2): un simple disco metálico que se desliza a
  un lado. Este encargo lo sustituye por un mecanismo atlante de verdad: aro labrado + hojas de iris
  + resplandor. El **problema a resolver** es exactamente ese: hoy se lee como una tapa de alcantarilla
  de laboratorio, no como una reliquia.
- Dónde: posado en la arena en `(110, −50, 110)` (misma altura de suelo que Atlántida, en la esquina
  opuesta del mapa). Cuántos: 1.
- Distancias: el jugador lo dispara al entrar en un radio de **5 u**; la cámara del juego se acerca a
  **≈ 15 u** para la cinemática de apertura (dura ≈ 0.7 s). De lejos (30–60 u) debe leerse como un
  círculo dorado en la arena; de cerca (5–10 u, nadando justo encima) es donde se juzga el detalle.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. El modelo es **plano y visto desde arriba** (el jugador nada por
  encima): no tiene un "frente" — es radialmente simétrico. Fija la hoja `segment 0` en **+Z Three**
  para que el integrador sepa el orden de las demás. |
| Origen del modelo | centro del disco, **apoyado en y = 0** (el juego lo coloca en `(110, −50, 110)`,
  sobre la arena, igual que Atlántida se apoya en `(0, −50, 0)`) |
| Tamaño | diámetro total ≤ **11 u** (aro incluido) · altura/grosor del mecanismo ≤ **2.5 u** desde la
  base hasta la cara superior del aro |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | ≤ **9 000 triángulos** y ≤ **10 mallas exportadas** |
| Transparencias | ninguna; el resplandor se resuelve con emisión, no con alpha |
| Fondo del juego | arrecife soleado: agua turquesa `#2c86a3` con niebla, sol cálido `#fff3d6` casi
  vertical, arena `#d9c28f` con cáusticas — el mismo mundo de `../atlantida/BRIEF.md` |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` donde se indica). El
**origen del objeto es su pivote**.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `frame` | — | 1 | centro del modelo | el aro/pedestal labrado, fijo, apoyado en la arena — nunca se mueve |
| `iris_leaf` | `0`–`5` | 6 | en el **borde exterior** de cada hoja, donde se une al aro (el punto de
  bisagra, no el centro del disco) | hoy sellan el centro en abanico; el juego las gira sobre su
  bisagra para que se **plieguen hacia abajo y afuera**, bajo el aro, revelando el hueco central en
  ≈ 0.7 s. Reparte las 6 a partes iguales (60° cada una) alrededor del centro, en orden desde `+Z`
  Three en sentido horario visto desde arriba |
| `glow` | — | 1 (fusionada si son varias piezas) | centro del modelo, a la altura del fondo del
  hueco | disco o vórtice que hoy está casi apagado (el iris lo tapa) y el juego le sube la emisión
  a la vez que las hojas se abren, hasta que quede completamente a la vista |

- `glow` es la **única parte emisiva**. Emisión base 0.15–0.3 (casi apagada, entrevista por las
  rendijas antes de abrir), color turquesa claro `#7fe9ff` — igual que el cristal de Atlántida. El
  juego solo modula su intensidad, no la tiñe.
- `frame` e `iris_leaf` conservan su pigmento (piedra + oro) y **no** llevan emisión.
- Puntos en `meta` si te sirven: `hingeAxis` (vector Three del eje de bisagra de una hoja, el mismo
  para las seis por simetría rotacional) y `openAngle` (cuántos radianes gira cada hoja al abrirse del
  todo, ya lo tienes al modelarlas, pero anótalo para que el integrador no lo adivine).

## 4. Dirección artística

- **Estilo:** la misma familia de Atlántida — caricatura 3D amable y pulida, arquitectura serena, no
  ruinas tétricas. Es un mecanismo antiguo dormido, no una alcantarilla.
- **Idea:** un aro de piedra clara con incrustaciones de oro atlante, como el borde de un pomo o el
  marco de un espejo ceremonial, puesto en la arena. Dentro, seis hojas triangulares (como pétalos o
  como las láminas de un diafragma de cámara) que hoy están cerradas formando una flor sellada de
  piedra y oro sobre el hueco.
- **Lo que debe leerse a 30–60 u:** el círculo dorado completo y el patrón radial de las seis hojas
  (una flor de piedra en la arena).
- **Lo que debe aguantar a 5–10 u:** el tallado del aro (relieve, no liso), la línea de unión entre
  hojas, alguna incrustación o grieta con crecimiento de coral o percebes en el borde exterior (lleva
  siglos hundido, como Atlántida).
- **Paleta:** piedra clara arenisca `#dcd3bc` a `#b4a98f` (la misma de Atlántida); oro atlante
  `#d9a441` en el aro y las vetas de las hojas; resplandor turquesa `#7fe9ff`.
- **Materiales:** piedra mate con relieve (rugosidad 0.7–0.85); oro satinado (rugosidad 0.3,
  metalness 0.5–0.7); el resplandor sin textura, solo emisión.
- **Simetría:** el patrón de seis hojas es simétrico, pero el desgaste no: una hoja con más coral,
  una grieta que cruza el aro — el mismo criterio de "siglos de encanto" que en Atlántida.
- **Libertad de Astra:** forma exacta del tallado, proporción del aro frente a las hojas, textura del
  desgaste, dentro de estos límites.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#2c86a3`, sol cálido casi vertical y ambiente azul claro
(mismo set que Atlántida).

1. `render-juego.png` — cámara a **35 u**, mirando hacia abajo en un ángulo de ≈ 45° (como el jugador
   nadando hacia él desde media altura), FOV 60, 1600×900, **iris cerrado**. ¿Se lee el círculo
   dorado y el patrón de las seis hojas?
2. `render-cerca.png` — cámara a **15 u** (la distancia de la cinemática), mismo ángulo, FOV 60,
   1600×900, **iris cerrado**: aquí se juzga el estilo del tallado.
3. `render-abierto.png` — igual que `render-cerca.png` pero con las hojas **abiertas del todo**
   (pliega la escena o duplica los objetos con la rotación aplicada solo para este render) y `glow`
   a su emisión máxima: se juzga que el mecanismo tenga sentido abierto.
4. `render-planta.png` — vista cenital pura (cámara mirando derecho hacia abajo), 1200×900: para
   comprobar la simetría radial y el reparto de las seis hojas.

## 6. Criterios de aceptación

- [ ] Medidas, origen (centro en y = 0) y hoja `segment 0` en +Z de la ficha técnica.
- [ ] ≤ 9 000 triángulos y ≤ 10 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `frame`, `iris_leaf` con `segment` 0–5 (bisagra en el borde exterior de cada una, no en
      el centro del disco) y `glow`.
- [ ] Las seis hojas, giradas sobre su bisagra, se pliegan bajo el aro sin atravesarse entre sí ni con
      el aro (compruébalo en el script con la rotación de apertura completa).
- [ ] `render-juego.png` y `render-planta.png` muestran el patrón radial simétrico con el iris
      cerrado; `render-abierto.png` muestra el hueco despejado con `glow` a la vista.
- [ ] Solo `glow` es emisiva; `frame` e `iris_leaf` no llevan emisión.
- [ ] En `render-cerca.png` no hay caras planas en curvas ni formas de primitiva suelta (nada de
      cilindros/toros reconocibles como tales, como el placeholder actual).
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material).
- [ ] `ENTREGA.md` trae, para `iris_leaf`, el eje de bisagra en espacio Three y el ángulo de apertura
      completo sugerido (en `meta.hingeAxis`/`meta.openAngle` y también explicado en la tabla de
      partes, no "ver brief").
- [ ] `portal.json`, `.blend`, `.glb`, los 4 renders y `ENTREGA.md` regenerados por
      `modelar-portal.py`, en UTF-8.
- [ ] En la carpeta quedan solo los entregables.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-portal.py`. La integración (reemplazar el hatch de `gate.ts`, la animación de apertura sobre
la bisagra real, el latido de `glow` y la cinemática a 15 u) la hace el integrador tras la aprobación
de Luis.
