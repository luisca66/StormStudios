# BRIEF — Rape Abisal · Batisfera

> Escrito por Claude (integrador) el 2026-09-13. Astra modela a partir de este archivo; puede
> consultar lo que necesite, pero aquí están los datos del juego.
> Carpeta de trabajo: `apps-src/acordes-juego/art/blender/rape-abisal/` (checkout principal).
> Modelo hermano más reciente, con el mismo flujo y exportación: `../calamar-vela/`
> (`modelar-calamar.py`, `ENTREGA.md`, renders). Otros: `../medusa-luna-preview.png`, `../pez-prisma-preview.png`.

## 1. Qué es y dónde se ve

- Papel: cuarta criatura de Batisfera (juego de reconocer acordes bajo el mar). El jugador la
  toca, suena un acorde y **el señuelo parpadea una vez por cada nota**; luego responde.
- **El señuelo es la seña de la especie:** en la oscuridad es lo primero (y a veces lo único)
  que se ve. El cuerpo apenas se distingue hasta que el foco del submarino lo ilumina.
- Dónde aparece: **zona 3 (1000–4000 m, medianoche)** y **zona 4 (4000–6000 m, abisal)**.
- Cuántos a la vez: hasta 6 criaturas de varias especies; normalmente 1–2 rapes.
- Distancia a la cámara: aparece a 25–70 u; el jugador la activa a **≤ 30 u**.
- A 30 u ocupa ≈ 9 % de la altura de la pantalla → silueta compacta y señuelo muy legible.
- El juego la escala entre ×0.85 y ×1.35 según el registro del acorde.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Boca hacia −Z**; cola hacia +Z (en Blender: boca hacia +Y, cola hacia −Y) |
| Origen del modelo | centro del cuerpo (sin contar cola ni caña) |
| Tamaño | cuerpo ≈ 2.2 u de largo × 1.5 u de alto × 1.7 u de ancho · con cola ≤ 3.0 u de largo · caña y señuelo hasta ≈ 1.3 u sobre el origen y ≈ 1.1 u por delante de él |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 10 000 triángulos** y **≤ 10 mallas exportadas** por rape |
| Transparencias | evitarlas (dientes opacos); el halo del señuelo lo añade el juego |
| Fondo del juego | casi negro azulado: `#0b2438` (arriba de zona 3) → `#050d18` → `#01050a` (zona 4). Luz ambiental casi nula; el submarino ilumina con un foco blanco frío `#d6ecff` desde la cámara |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part`. El **origen del objeto es su pivote**.

| `part` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|
| `body` | 1 | origen del modelo | balanceo lento del conjunto (incluye ojos, dientes superiores, espinas) |
| `jaw` | 1 | bisagra de la mandíbula (a cada lado de la boca, sobre el eje X) | se abre y cierra despacio, hasta ≈ 0.25 rad (incluye dientes inferiores) |
| `rod` | 1 | base de la caña (illicium) sobre la cabeza | vaivén lateral ±0.18 rad y leve cabeceo |
| `lure` | 1 | centro del señuelo (esca) | **el juego lo cuelga de la punta de la caña** y lo hace parpadear; se tiñe con la familia |
| `fin` | 2 (pectorales izq./der.) | unión al cuerpo | aleteo suave, lados opuestos |
| `tail` | 1 | pedúnculo caudal | ondulación lateral alrededor de Y |

- `lure`: emisión con color **casi blanco** (`#f7f3e8`) e intensidad 2–3; el juego lo tiñe con el
  color de la familia: sextas/sus ámbar `#ffd27f` (zona 3), novenas magenta `#ff7fd0` (zona 4).
- `body` y `jaw` sin emisión: se ven por el foco del submarino. Si Astra quiere un brillo
  propio discreto (p. ej. puntos en la aleta dorsal), que vaya **dentro de `lure`** para que se
  tiña y parpadee con él, o se omite.
- La caña y el señuelo deben quedar **alineados**: la punta de `rod` coincide con el centro de `lure`.

## 4. Dirección artística

- **Estilo:** coherente con la Medusa Luna, el Pez Prisma y el Calamar Vela: realista
  estilizado, formas limpias. Inquietante y curioso, **no de terror**: el juego lo usan estudiantes.
- **Silueta:** cuerpo globoso y compacto, cabeza enorme respecto al cuerpo, boca amplia
  con mandíbula inferior prominente, aleta caudal corta, caña que nace sobre la cabeza y se
  curva hacia delante con el señuelo colgando frente a la boca.
- **Dientes:** finos, curvos y visibles, en número moderado; que se lean como dientes a 10 u
  sin convertirse en un erizo.
- **Paleta sugerida:** piel marrón-negruzca a gris pardo (`#2a2320` – `#4a3b33`), vientre algo
  más claro, textura de piel rugosa sugerida con pigmento por vértice; interior de la boca oscuro
  rojizo; dientes marfil; ojos pequeños y oscuros con un reflejo discreto; caña del tono de la piel
  aclarándose hacia la punta.
- **Materiales:** piel mate (rugosidad alta), dientes satinados, sin metal.
- **Detalle:** papilas o filamentos cortos en el borde de la mandíbula y línea lateral sugerida;
  nada que no se lea a ≈ 10 u.
- **Libertad de Astra:** proporciones finas, forma exacta del señuelo (bulbo, filamentos), número
  y curva de dientes, patrón de pigmento y pose de reposo, dentro de lo anterior.
- Referencias: rapes abisales (Melanocetus, Himantolophus); solo como guía de forma.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#050d18`, luz ambiental casi nula + foco blanco frío
desde la cámara (como el submarino); el señuelo emitiendo. Nombres fijos, en esta carpeta:

1. `render-juego.png` — cámara a **25 u**, vista 3/4 frontal ligeramente desde arriba, FOV 60, 1600×900.
2. `render-perfil.png` — perfil lateral completo con fondo algo más claro (`#0b2438`), 1200×900.
3. `render-detalle.png` — cara, dientes, mandíbula y señuelo, 1200×900.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica (boca hacia −Z en Three).
- [ ] ≤ 10 000 triángulos y ≤ 10 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `body`, `jaw`, `rod`, `lure`, 2 `fin` y `tail` con los pivotes indicados.
- [ ] La punta de `rod` coincide con el centro de `lure` (anotar ambos puntos en `ENTREGA.md`).
- [ ] En `render-juego.png` el señuelo destaca claramente y la silueta del rape se intuye.
- [ ] Boca y dientes legibles en `render-detalle.png`, sin exceso de detalle.
- [ ] Sin caras invertidas visibles ni huecos entre cuerpo, mandíbula, aletas y cola.
- [ ] El `.glb` muestra el pigmento (colores de vértice conectados al material). El juego usa el JSON, pero así el `.glb` se ve bien en cualquier visor.
- [ ] `rape-abisal.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-rape.py`.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-rape.py`. La integración en el juego (Three.js, animación, parpadeo, halo) la hace el
integrador después de que Luis apruebe los renders.
