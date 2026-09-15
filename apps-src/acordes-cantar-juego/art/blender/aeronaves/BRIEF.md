# BRIEF — Aeronaves por capa · Aerostato

> Escrito por Claude (integrador) el 2026-09-14. Astra modela a partir de este archivo; puede
> consultar lo que necesite, pero aquí están los datos del juego.
> Carpeta de trabajo: `apps-src/acordes-cantar-juego/art/blender/aeronaves/` (checkout principal).
> Referencia de método: `apps-src/acordes-juego/art/blender/leviatan/` (script, `kit.export_parts`,
> `ENTREGA.md`). Referencia de estilo del juego: `../modelar-ballena.py` y `../README.md`.

## 1. Qué es y dónde se ve

- Juego: Aerostato (cantar acordes subiendo en globo por 5 capas de cielo).
- Papel: **ambiente puro**. De vez en cuando cruza a lo lejos una aeronave acorde a la altura. No se
  toca, no sale en el radar, nunca pasa encima del jugador.
- **Un solo script, cuatro modelos**, uno por capa:

| Capa | Cielo | Aeronave | Velocidad en el juego |
|---|---|---|---|
| 2 · Mar de Nubes | día claro | **Avioneta** de hélice, ala alta (tipo Cessna) | 9 u/s, con balanceo leve |
| 3 · Cielo Abierto | azul intenso | **Jet comercial** bimotor | 14 u/s |
| 4 · Cielo de Auroras | azul profundo | **Avión estratosférico** esbelto de alas muy largas (tipo U-2) | 10 u/s |
| 5 · Borde del Espacio | casi negro, estrellas | **Satélite** | 5 u/s, casi inmóvil |

- Cuántas a la vez: **una** en todo el mundo.
- Distancia a la cámara: **15–150 u**; lo típico es **40–80 u**. A 60 u, la envergadura de la
  avioneta ocupa ≈ 6 % del ancho de la pantalla: **son siluetas**. Exagera un poco los rasgos que la
  identifican (ala alta, motores bajo el ala, alas larguísimas, paneles solares).
- El juego ya tiene estas aeronaves hechas con primitivas (`src/3d/flybys.ts`); estos modelos las
  sustituyen con las mismas proporciones generales.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Morro hacia +Z** (en Blender: morro hacia **−Y**). El juego orienta el modelo con `lookAt` hacia su destino. |
| Origen de cada modelo | centro de masa aproximado, en el eje del fuselaje (satélite: centro del cuerpo) |
| Tamaños (±15 %) | avioneta: largo 4.5 × envergadura 7 · jet: largo 9 × envergadura 8.5 · estratosférico: largo 7.5 × envergadura 13 · satélite: ancho con paneles 8.5 × alto 2.5 × fondo 1.6 |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1, far 1600 |
| Presupuesto | avioneta ≤ 2 500 tri · jet ≤ 3 000 · estratosférico ≤ 2 000 · satélite ≤ 2 500 |
| Mallas | las de la sección 3, nada más (≈ draw calls) |
| Materiales | **uno por parte** (`kit.export_parts` exporta solo el material principal): ventanillas, franjas, bordes y paneles se pintan con **color de vértice** |
| Transparencias | ninguna. Las estelas las dibuja el juego. |
| Sombras | el juego no usa sombras: la forma se lee por sombreado y color |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` si aplica). El
**origen del objeto es su pivote**. Cada aeronave se exporta a **su propio JSON** con
`kit.export_parts(ruta, objects=[…], meta=…)`.

| Archivo | `part` | `segment` | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `avioneta.json` | `body` | — | origen del modelo | fuselaje, alas, cola y tren; balanceo del conjunto |
| | `prop` | — | centro del buje, en el eje de giro | gira ≈ 26 rad/s alrededor de su **+Z local**. Dos palas y buje (spinner) |
| `jet.json` | `body` | — | origen del modelo | todo el avión |
| `estratosferico.json` | `body` | — | origen del modelo | todo el avión |
| `satelite.json` | `body` | — | origen del modelo | cuerpo con foil dorado, antena y plato; el juego pulsa su emisión para el destello |
| | `panel` | `0`, `1` | unión del brazo con el cuerpo | los paneles giran despacio sobre el eje del brazo (±0.3 rad) |
| | `beacon` | — | centro de la luz | luz roja que parpadea (el juego sube y baja su emisión) |

**Datos en `meta` de cada JSON** (el juego los lee):
- Jet y estratosférico: `contrailOrigins`: lista de puntos `[x, y, z]` en coordenadas Three donde
  nace cada estela (salida de cada motor en el jet; cola del estratosférico).
- Todos: `forward: "+Z"` y `size: [ancho X, alto Y, largo Z]`.

Emisión:
- Satélite `body`: emisión tenue ámbar (`#5a3300`, intensidad ≈ 0.12); el juego la pulsa hasta ≈ 2.
- Satélite `panel`: emisión azul tenue (`#0a2d66`, intensidad ≈ 0.5).
- Satélite `beacon`: rojo (`#ff1808`), intensidad ≈ 3; el juego la apaga y la enciende.
- Avioneta, jet y estratosférico: sin emisión.

## 4. Dirección artística

- **Estilo:** coherente con el Aerostato: ilustración pintada y luminosa (Studio Ghibli con un aire de
  época) que convive con la Ballena Celeste y el Faro. Formas limpias y amables, bordes suavizados
  con biseles pequeños, proporciones algo caricaturizadas para leerse de lejos. **No** realismo de
  simulador.
- **Sin logos, textos, matrículas ni libreas de aerolíneas reales.**
- **Avioneta:** ala alta con montantes, morro corto, tren fijo con carenados, cabina con ventanillas.
  Paleta crema `#f3ead7` con franjas y ala rojo ladrillo `#b5402e`; ventanillas azul oscuro; hélice
  gris oscuro `#2a2a2a` con puntas claras.
- **Jet:** fuselaje blanco `#f4f4f0` redondeado, ventanillas en hilera, alas en flecha con winglets,
  dos motores grandes colgados bajo el ala, cola alta. Franja y deriva azul `#3a5a8c`.
- **Estratosférico:** fuselaje muy esbelto, alas rectas larguísimas y delgadas, cola en T o deriva
  alta, cabina pequeña. Metal oscuro satinado `#30343a` con leve variación de tono; se lee casi
  como silueta negra contra el azul.
- **Satélite:** cuerpo tipo caja con foil dorado arrugado sugerido (`#c9a227`, metálico), dos paneles
  solares azules `#24558c` con rejilla de celdas pintada, plato de antena y antena fina, baliza roja
  arriba. Sin estela.
- **Materiales:** pintura satinada (rugosidad 0.5–0.7) en aviones; foil del satélite metálico
  (metalness ≈ 0.85, rugosidad ≈ 0.3); paneles semi-mate.
- **Detalle:** solo el que se lea a 15–40 u (ventanillas, franjas, carenados, celdas). Nada de
  remaches ni paneles de fuselaje finos.
- **Libertad de Astra:** forma exacta, proporciones finas, distribución de color y pequeños detalles
  dentro de la ficha técnica.
- Referencias: Cessna 172, A320/737, Lockheed U-2, satélites de comunicaciones; solo como guía de forma.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise. Sol direccional blanco cálido + cielo como fondo (degradado del
horizonte al cenit) de la capa correspondiente:

| Aeronave | Horizonte | Cenit |
|---|---|---|
| Avioneta | `#cfe6f8` | `#5f9fe0` |
| Jet | `#a8cdf0` | `#3f7dd6` |
| Estratosférico | `#7aa8d8` | `#244fae` |
| Satélite | `#131c3c` | `#04061c` (sol intenso) |

Nombres fijos, en esta carpeta (`<modelo>` = `avioneta`, `jet`, `estratosferico`, `satelite`):

1. `render-<modelo>-juego.png` — cámara a **60 u**, vista lateral 3/4 algo desde abajo (el jugador
   suele verlas por encima de su cabeza), FOV 60, 1600×900. ¿Se reconoce la aeronave?
2. `render-<modelo>-cerca.png` — cámara a **15 u**, 3/4 frontal, FOV 60, 1600×900. Aquí se juzga el estilo.
3. `render-conjunto.png` — las cuatro en fila a la misma escala, fondo neutro `#dfe8f0`, 2000×900.

## 6. Criterios de aceptación

- [ ] Morro hacia +Z (Three), origen, tamaños y presupuestos de la ficha técnica.
- [ ] `avioneta.json`, `jet.json`, `estratosferico.json` y `satelite.json` con sus partes, pivotes y `meta` (sección 3).
- [ ] La hélice gira limpia alrededor de su +Z local sin tambalearse (pivote en el eje del buje).
- [ ] En cada `render-*-juego.png` se reconoce la aeronave por su silueta.
- [ ] En `render-*-cerca.png` no hay caras planas en curvas ni formas de primitiva suelta.
- [ ] Sin logos, textos ni libreas reales.
- [ ] Los `.glb` muestran el pigmento (colores de vértice conectados al material).
- [ ] `ENTREGA.md` trae triángulos por modelo, dimensiones, pivotes, `contrailOrigins` y animación sugerida (hélice, paneles, baliza, balanceo).
- [ ] `modelar-aeronaves.py` regenera `aeronaves.blend`, los 4 `.glb`, los 4 `.json`, los 9 renders y `ENTREGA.md`, en UTF-8.
- [ ] En la carpeta quedan solo los entregables.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-aeronaves.py`. La integración (carga, hélice, estelas, destello y baliza del satélite) la
hace el integrador después de que Luis apruebe los renders.
