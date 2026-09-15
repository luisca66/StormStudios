# BRIEF — Gran Ballena Celeste · Aerostato

> Escrito por Claude (integrador) el 2026-09-15. Astra modela a partir de este archivo; puede
> consultar lo que necesite, pero aquí están los datos del juego.
> Carpeta de trabajo: `apps-src/acordes-cantar-juego/art/blender/ballena-celeste/` (checkout principal).
> Sustituye a la ballena anterior (`../modelar-ballena.py`, de Gemini): **no la tomes como referencia de
> forma**. Referencias de método: `apps-src/acordes-juego/art/blender/leviatan/` (criatura grande con
> revisión en varias rondas) y `../aeronaves/` (script del mismo juego).

## 1. Qué es y dónde se ve

- Juego: Aerostato (cantar acordes subiendo en globo por 5 capas de cielo). Estética de ilustración
  pintada y luminosa (Studio Ghibli con aire de Julio Verne), como la canastilla, el faro y las nubes.
- Papel: **criatura legendaria de la capa 5 (Borde del Espacio, 600–750 u)**. Nada en círculos a 50 u
  del centro del mundo, a y ≈ 675, lenta y serena. Aparece una vez por sesión; de un anillo de latón en
  su lomo cuelga la cuerda de linternas del acorde 13, que vale doble. Si el jugador se amarra, el globo
  la acompaña.
- Cuántas: una. Distancia típica a la cámara: **30–60 u** (el atajo de prueba deja al jugador a 35 u).
  A 35 u, su largo (≈ 26 u) ocupa ≈ 60 % del ancho: aquí se ve de cerca y es el hito final del juego.
- Fondo: cielo casi negro azulado (`#131c3c` en el horizonte → `#04061c` en el cenit) con estrellas;
  luz ambiental baja (0.4) y sol blanco intenso (1.6).

## 2. Qué salió mal en la versión anterior (evitarlo)

- Nadaba **de lado**: la cabeza apuntaba a +X y el juego la orienta con el frente en +Z.
- Placas del lomo como discos hexagonales planos flotando encima del cuerpo, sin nacer de él.
- Arnés incoherente: varilla clavada en el costado, farol flotando, correa pegada al vientre.
- Aletas pectorales como láminas planas; cola como palito con aleta mínima; aleta dorsal diminuta.
- 1 173 triángulos: todo facetado y con aspecto de primitivas.

## 3. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Hocico hacia +Z** (en Blender: hocico hacia **−Y**), cola hacia −Z |
| Origen del modelo | centro del cuerpo a la altura del eje, **justo debajo del anillo de amarre** |
| Anillo de amarre | centro exactamente en **(0, 4.2, 0)** (Three): ahí cuelga la cuerda de linternas |
| Tamaño | largo ≈ 26 u (±10 %), alto del cuerpo ≈ 7 u, envergadura de pectorales ≈ 16–18 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1, far 1600 |
| Presupuesto | ≤ 16 000 triángulos · ≤ 10 mallas · sin sombras (el juego no las usa) |
| Formato | **`.glb`** (el juego lo carga con GLTFLoader). Puede llevar varios materiales; conecta los colores de vértice al material |
| Transparencias | ninguna |

## 4. Nodos que el juego necesita (nombres exactos)

El juego busca estos objetos por nombre dentro del `.glb` y los anima. El **origen de cada objeto es su
pivote** y su rotación inicial debe ser identidad.

| Nombre del objeto | Pivote | Qué hace el juego |
|---|---|---|
| `Ballena_Cuerpo_Central` | origen del modelo | cuerpo, cabeza, placas, arnés y anillo (todo lo rígido) |
| `Aleta_Pectoral_Izq` | hombro izquierdo (lado −X), en la unión con el cuerpo | aleteo lento tipo manta: sube y baja |
| `Aleta_Pectoral_Der` | hombro derecho (lado +X) | aleteo en espejo |
| `Aleta_Cola` | pedúnculo caudal, donde nace la aleta | ondulación vertical de la aleta caudal |

- Las pectorales se extienden hacia ±X y la aleta caudal es horizontal (como un rorcual real).
- Si sumas piezas (placas emisivas, arnés), que vayan dentro de `Ballena_Cuerpo_Central` o como hijas
  suyas: no deben moverse por separado.

## 5. Dirección artística

- **Silueta:** rorcual celeste majestuoso (ballena azul / jorobada): cabeza ancha y aplanada con
  mandíbula marcada, surcos gulares nacarados en la garganta y el vientre, cuerpo largo que se afina en
  un pedúnculo musculoso, aleta caudal grande de dos lóbulos con borde festoneado, aleta dorsal pequeña
  pero visible en el último tercio. Serena y antigua, **no caricatura** (sin sonrisa).
- **Aletas pectorales:** largas y curvas como las de la jorobada, con borde de ataque grueso y
  tubérculos sugeridos, afinándose hacia la punta; espesor real (nada de láminas).
- **Placas bioluminiscentes:** 7 crestas cristalinas que **nacen del lomo** en hilera desde detrás de la
  cabeza hacia la cola, de mayor a menor; base hundida en la piel y brillo turquesa-esmeralda con
  núcleo claro (emisión `#5fe8d0`, intensidad 2–3). Deben leerse a 50 u en el cielo oscuro.
- **Arnés victoriano del acorde 13:** una sola **cincha ancha de cuero con herrajes de latón** que rodea el
  cuerpo detrás de las pectorales, bien pegada a la piel. Sobre el lomo, una montura de latón remachada
  que sostiene el **anillo de amarre** en (0, 4.2, 0). A cada lado de la cincha, un farol de navegación
  pequeño (verde a estribor +X, rojo a babor −X) sujeto a la cincha, no flotando.
- **Paleta:** lomo azul índigo profundo con motas claras (`#1f3563` → `#3a5a94`), vientre y surcos
  nacarados (`#d8e4ee`), transición suave con pigmento; cicatrices y percebes sutiles en la cabeza.
- **Materiales:** piel satinada (rugosidad 0.5), latón metálico (metal 0.85, rugosidad 0.3), cuero
  mate; placas y faroles emisivos.
- **Detalle:** el fino en cabeza, surcos, arnés y placas (se ven a 30 u); el resto se lee por forma.
- **Libertad de Astra:** forma exacta, pigmento, número de surcos, diseño de los herrajes y de las
  crestas, dentro de esta ficha.

## 6. Renders de revisión

Cycles, 40 muestras, denoise, fondo degradado `#131c3c` → `#04061c`, sol blanco intenso y luz ambiental
baja; placas y faroles con su emisión. Nombres fijos, en esta carpeta:

1. `render-juego.png` — cámara a **40 u** del centro, 3/4 lateral algo desde abajo, FOV 60, 1600×900.
   Ballena completa en cuadro.
2. `render-cerca.png` — cámara a **15 u** de la cabeza, 3/4 frontal, FOV 60, 1600×900. Aquí se juzga el estilo.
3. `render-perfil.png` — perfil completo con fondo algo más claro (`#2a3b66`), 1600×900.
4. `render-arnes.png` — cincha, montura y anillo de cerca, 1200×900.
5. `render-cenital.png` — vista desde arriba, para comprobar simetría, hocico hacia +Z y pectorales en ±X.

## 7. Criterios de aceptación

- [ ] Hocico hacia +Z (Three) / −Y (Blender); origen y anillo en (0, 4.2, 0) comprobados en el script.
- [ ] ≤ 16 000 triángulos y ≤ 10 mallas (el script los imprime).
- [ ] Existen `Ballena_Cuerpo_Central`, `Aleta_Pectoral_Izq` (−X), `Aleta_Pectoral_Der` (+X) y `Aleta_Cola`, con pivotes en sus uniones y rotación identidad.
- [ ] Las aletas giran sobre su pivote sin abrir huecos visibles con ±0.2 rad (comprobado en un render de prueba o en el script).
- [ ] Placas nacidas del lomo y arnés pegado al cuerpo: nada flota ni atraviesa la piel.
- [ ] En `render-cerca.png` no hay caras planas en curvas ni formas de primitiva suelta.
- [ ] El `.glb` muestra el pigmento y la emisión.
- [ ] `ENTREGA.md` trae pivotes, dimensiones, triángulos y animación sugerida (aleteo, cola, pulso de placas).
- [ ] `modelar-ballena-celeste.py` regenera `ballena-celeste.blend`, `ballena-celeste.glb`, los renders y `ENTREGA.md`, en UTF-8.
- [ ] En la carpeta quedan solo los entregables.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 8. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-ballena-celeste.py`. La integración (ruta nueva del `.glb`, ejes del aleteo para el hocico en +Z,
pulso de placas) la hace el integrador después de que Luis apruebe los renders.
