# Auditoría de modelos — Walking AP Multi, Nivel 5 «Las Nubes»

> Claude, 2026-09-16, a pedido de Luis. Qué modelos tiene el nivel, cómo se ven y cuáles puede
> rehacer Claude con bpy y cuáles conviene encargar a Astra. No se cambió código.

## Cómo está hoy

Todo el nivel es un port del Godot original hecho con primitivas de Three.js
(`src/3d/environment.ts buildClouds()`, `player.ts buildUnicorn()`, `renderer.ts` objetivo de
nota y `gate.ts` portal). Ninguna pieza viene de Blender.

**Medido en el juego** (dev, 800×450, vista inicial): **367 llamadas de dibujo**, 40 000
triángulos, 60 fps. El código crea unas **1 000 mallas sueltas**; al girar la cámara las
llamadas suben. Rinde, pero casi todo el coste son nubes hechas de esferas transparentes.

**A la vista:**
- Las nubes se leen como **discos grises y sucios**, no como cúmulos blancos y esponjosos.
- El unicornio se ve siempre de espaldas: la crin es un **montón de huevos pastel** que tapa el
  lomo, el cuerpo se ve gris y las alas son elipses planas.
- El objetivo de nota (globo aerostático) es un huevo sobre un cilindro.

## Inventario

| # | Pieza | Hoy | Mallas aprox. | ¿Quién? | Por qué |
|---|---|---|---|---|---|
| 1 | **Unicornio-pegaso** (jugador) | ~85 primitivas: esferas, cilindros, 26 lóbulos de crin y cola, alas de esferas aplanadas | 85 | **Astra** (o Claude si no hay tokens) | Personaje orgánico en primer plano todo el nivel; es la pieza de más impacto y la más difícil. Necesita patas, alas, crin y cola como partes animables |
| 2 | **Nubes** (110 cúmulos pequeños y grandes) | 3–8 esferas transparentes por nube | ~540 | **Claude** | Kit instanciado de 4–5 variantes: bajaría de cientos a ~5 llamadas. Ya existe el cúmulo de Blender del Aerostato (`acordes-cantar-juego`, tecla `C`) como punto de partida |
| 3 | **Globo aerostático** (objetivo de nota) | esfera + cilindro + 4 cuerdas | 6 | **Claude** | Pieza simple; la tela se tiñe por nota. Mismo lenguaje que la canasta del Aerostato |
| 4 | **Portal arcoíris** | 7 toros + orbes | ~15 | **Claude** | Geometría simple con partes que giran, como el portal atlante |
| 5 | **Islas flotantes** con flor mágica (5) | 3–5 esferas + esfera emisiva | ~25 | **Claude** | Roca con base de nube, hierba y flores de cristal; kit pequeño |
| 6 | **Cometas** (14) con hilo | 4 triángulos + marco + 6 moños + hilo | ~200 | **Claude** | Una cometa con cola por partes, instanciable |
| 7 | **Pájaros** (7) | esferas | ~90 | **Claude** | Pequeños y estilizados; alas como partes que aletean |
| 8 | Arcoíris lejanos (3) y destellos (40) | toros y esferas | ~60 | **Se quedan en código** | Son efectos, no modelos: mejor un arco con degradado en shader y partículas instanciadas |

## ¿Puede Claude hacerlos con Blender?

Sí. La instalación propia de bpy (`C:\Users\Luis\blender-bpy`) ya produjo el kit de arrecife del
Océano, el robot articulado de Resonancia, la canasta del Aerostato y la v4 del barco hundido.
Las piezas 2–7 son del tipo que Claude hace bien: formas estilizadas, kits instanciados y
partes rígidas animables.

El unicornio es otra liga: un cuadrúpedo con alas y crin que el jugador ve de cerca todo el
nivel. Claude puede hacerlo, pero requerirá más rondas de ajuste con Luis; Astra ha resuelto
mejor lo orgánico (tortuga, ballena, cangrejo).

## Avance (2026-09-16)

- ✅ Kit de nubes, globo aerostático, portal arcoíris e islas/cometas/pájaros: modelados por Claude
  y publicados (ver `art/blender/README.md`).
- ✅ Unicornio-pegaso: sin Astra disponible, lo modeló Claude siguiendo `art/blender/unicornio/BRIEF.md` y está publicado. El nivel 5 queda completo.

## Orden propuesto

1. **Kit de nubes** (Claude): arregla lo que más se ve mal y lo que más cuesta dibujar.
2. **Globo aerostático** (Claude): es el objetivo que el jugador busca.
3. **Unicornio-pegaso** (Astra, brief de Claude).
4. **Portal arcoíris** (Claude).
5. **Islas, cometas y pájaros** (Claude), juntos o en dos tandas.

Cada pieza sigue el método de `PLAN-3D-BLENDER.md`: Luis aprueba los renders antes de integrar y
se mide en escritorio.
