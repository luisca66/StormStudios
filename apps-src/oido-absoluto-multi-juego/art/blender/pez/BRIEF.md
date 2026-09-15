# BRIEF — Pez protagonista · Walking AP Multi, Nivel 2 «El Océano»

> Escrito por Claude (integrador) el 2026-09-15. Astra modela a partir de este archivo sin abrir el código.
> Carpeta de trabajo: `apps-src/oido-absoluto-multi-juego/art/blender/pez/` (checkout principal).
> Plan del nivel: `apps-src/oido-absoluto-multi-juego/PLAN-OCEANO-BLENDER.md`.
> Referencia de método (script, `kit.export_parts`, ENTREGA): `apps-src/acordes-juego/art/blender/calamar-vela/`.

## 1. Qué es y dónde se ve

- Papel: **el personaje que controla el jugador** en el nivel 2 de un juego de oído absoluto para
  todas las edades. Nada libremente en 3D (cabeceo, guiñada, alabeo e impulso) por un arrecife
  tropical soleado buscando perlas que suenan una nota.
- Cuántos a la vez: 1. Está en pantalla **todo el tiempo**.
- Cámara: sigue al pez **desde atrás**, 5.5 u detrás y 1.8 u arriba (en los ejes del pez), mirando
  a su centro. El pez ocupa ≈ 25 % de la altura de pantalla, centrado.
- Por eso lo que más se ve es **la espalda, la aleta dorsal, la cola y las pectorales** en vista
  3/4 trasera superior. La cara solo se ve en el menú, en la cinemática y al girar mucho.

## 2. Ficha técnica (no negociable)

| Dato | Valor |
|---|---|
| Unidades | 1 u de Three.js = 1 m de Blender |
| Ejes en el juego | Y arriba. **Boca hacia +Z**, cola hacia −Z (en Blender: boca hacia −Y, cola hacia +Y) |
| Origen del modelo | centro del cuerpo (centro de la caja del cuerpo sin aletas) |
| Tamaño | cuerpo ≈ 2.0 u de largo × 1.6 u de alto × 1.2 u de ancho · largo total con cola ≈ 2.8 u (±10 %) · envergadura con pectorales ≤ 2.4 u |
| Cámara del juego | perspectiva, FOV vertical 60°, near 0.1 |
| Presupuesto | **≤ 14 000 triángulos** y **≤ 8 mallas exportadas** |
| Transparencias | solo en el borde de las aletas si hace falta; cuerpo opaco |
| Colisión | el juego usa una esfera de radio 0.9 u: nada debe sobresalir mucho del contorno salvo aletas |
| Fondo del juego | agua turquesa `#1f7a99` con niebla, luz de sol cálida `#fff3d6` casi vertical + ambiente azul |

## 3. Partes que el juego necesita por separado

Cada parte es un objeto MESH con propiedad personalizada `part` (y `segment` donde se indica).
El **origen del objeto es su pivote**.

| `part` | `segment` | Cuántas | Pivote | Qué hace el juego |
|---|---|---|---|---|
| `body` | — | 1 | origen del modelo | se estira en Z hasta +15 % con la velocidad (y se afina en X/Y); balanceo suave en reposo |
| `eyes` | — | 1 (ambos ojos fusionados) | origen del modelo | estáticos respecto al cuerpo; material brillante propio |
| `tail` | — | 1 (pedúnculo + aleta caudal) | unión cuerpo–pedúnculo, en el eje central (≈ z −0.9) | gira en **Y** ±0.15 rad a 6 rad/s al nadar |
| `fin` | `0` = lado −X, `1` = lado +X | 2 pectorales | base de cada aleta sobre el cuerpo | giran en **X** ±0.4 rad a 10 rad/s con impulso; ±0.1 rad lento en reposo |
| `dorsal` | — | 1 | base de la aleta sobre el lomo | ondulación leve en **Z** ±0.08 rad (la propone Astra en ENTREGA) |

Si Astra quiere boca con otro acabado (interior oscuro mate), puede ir dentro de `body` con color
de vértice; no hace falta parte aparte. Ninguna parte es emisiva.

Punto en `meta`: `mouth` = (x, y, z) en espacio Three, punta de la boca (el juego emitirá burbujas ahí).

## 4. Dirección artística

- **Estilo:** caricatura 3D amable y pulida (tipo película animada), no realista. Debe convivir
  con los otros protagonistas del juego (un muñeco «Glub», un cocodrilo y un unicornio de estilo
  simple). Simpático para niños, pero cuidado para adultos.
- **Identidad que se conserva:** pez **rojo** con **vientre amarillo** (el pez actual del juego).
  Se puede enriquecer: degradado rojo coral `#e8322e` → rojo profundo `#a3141c` en el lomo, vientre
  amarillo cálido `#ffd23d` con transición suave, aletas rojo-anaranjado `#ff5a2a` con bordes más
  claros y translúcidos `#ffb08a`, rayas o motas sutiles opcionales.
- **Silueta:** cuerpo redondeado y compacto (tipo pez tropical, no torpedo), frente algo bulboso,
  **aleta dorsal alta y reconocible**, cola en abanico o ahorquillada **grande** (se lee desde atrás),
  pectorales amplias como «remos». Desde atrás deben distinguirse cola, dorsal y ambas pectorales.
- **Cara:** ojos grandes y expresivos a los lados-frente (esclerótica, iris, pupila y brillo
  especular), labios suaves con leve sonrisa. Nada inquietante.
- **Materiales:** piel satinada húmeda (rugosidad 0.35–0.45); aletas con radios marcados en
  relieve o color; ojos muy brillantes (rugosidad ≈ 0.05).
- **Detalle:** escamas sugeridas por color o relieve muy suave, solo si se leen a 5 u; opérculo
  (agalla) marcado; transiciones cuerpo–aleta sin juntas de primitiva.
- **Libertad de Astra:** proporciones finas, forma exacta de aletas y cola, patrón de color, rayas
  y expresión, dentro de la identidad rojo/amarillo.

## 5. Renders de revisión

Cycles, 32–48 muestras, denoise, mundo `#1f7a99`, sol cálido casi vertical + ambiente azul suave.
Nombres fijos, en esta carpeta:

1. `render-juego.png` — **la vista del jugador**: cámara 5.5 u detrás (−Z) y 1.8 u arriba, mirando al
   origen, FOV 60, 1600×900. Pose de nado (cola y pectorales algo desplazadas).
2. `render-cerca.png` — 3/4 delantero a ≈ 4 u, FOV 60, 1600×900: cara, ojos y estilo.
3. `render-perfil.png` — perfil lateral completo, 1200×900.
4. `render-arriba.png` — vista superior, 1200×900: envergadura de pectorales y forma de la cola.

## 6. Criterios de aceptación

- [ ] Medidas, origen y ejes de la ficha técnica (boca a +Z en Three).
- [ ] ≤ 14 000 triángulos y ≤ 8 mallas (lo imprime `kit.export_parts`).
- [ ] Existen `body`, `eyes`, `tail`, `fin` segment 0 y 1, y `dorsal`, con los pivotes indicados.
- [ ] Al girar `tail` ±0.15 rad en Y y `fin` ±0.4 rad en X no aparecen huecos ni piezas que atraviesen el cuerpo (comprobarlo en el script con esas poses).
- [ ] En `render-juego.png` se reconocen cola, dorsal y ambas pectorales, y se lee «pez rojo simpático».
- [ ] En `render-cerca.png` no hay caras planas en curvas ni formas de primitiva suelta.
- [ ] `meta.mouth` presente.
- [ ] `pez.json`, `.blend`, `.glb`, renders y `ENTREGA.md` regenerados por `modelar-pez.py`.
- [ ] El script corre con `C:\Users\Luis\blender-bpy\bpy-run.ps1` sin rutas de Codex.

## 7. Rondas

Máximo 2 rondas de corrección de Astra. Si se agotan los tokens, Claude continúa desde
`modelar-pez.py`. La integración (reemplazar `buildFish` en `player.ts`, animación, burbujas) la hace
el integrador después de que Luis apruebe los renders.
