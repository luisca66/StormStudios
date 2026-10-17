# ENTREGA — Dentro del corno · Resonancia

## Estado

- Versión / ronda: **v1, preparación de ronda 1**.
- Fecha: 2026-10-17.
- **Lista para: ejecución de Claude**.
- Script completo. No se ha cargado Blender, ejecutado bpy ni generado renders en el sandbox. Revisión visual de Astra pendiente tras la ejecución en la PC de Luis. Esta entrega no implica aprobación visual.

## Archivos

Entregados: `modelar-mundo-corno.py` y este `ENTREGA.md`.

El script genera `mundo-corno.blend`, `mundo-corno.glb` portable con pigmento conectado al material, `mundo-corno-juego.glb` con AO, `mundo-corno.json`, `render-juego.png` y `render-cerca.png` (ambos 1600 × 900). Añade a esta entrega el resultado de ejecución sin adelantar la revisión visual.

Desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-mundo-corno.py
```

No instalar dependencias desde este script. Si falta Node o falla el convertidor compartido, conserva el JSON disponible y registra el fallo; no presenta el GLB de juego como completado. Otros fallos interrumpen la ejecución.

## Diseño y datos técnicos

Un salón de cuento construido con tres grandes vueltas de tubo, dos serpentines laterales, tres válvulas **rotatorias con ejes Z** y palancas de níquel, tres bombas de afinación en U, boquilla lejana y una campana de doble pared con borde enrollado y pequeños grabados. Veinte luceros de taller en los bordes aportan calidez sin necesitar transparencias. Madera oscura y latón claro separan el suelo de los muros.

| Dato | Valor |
|---|---|
| Ejes / unidades | Three, Y arriba; 1 u = 1 m |
| Mundo | Pivote (0,0,0); envolvente conservadora X −50…45, Y −12…50, Z −111…85 |
| Piso | 88 × 192 m; X −44…44, Z −108…84; cara superior Y = 0 |
| Zona de juego libre | X −17.5…17.5, Z −50…52.6; tubos sobre la zona a altura suficiente, mecanismos a los lados |
| Mallas de contrato | 11; cuatro `world` por material, dos muros, poste, marco, dos aros, núcleo |
| Triángulos totales por construcción | **47 956**; pendientes de comprobar en Blender |
| AO de juego | distance = 1.5, strength = 0.7 |
| Peso de archivos | Pendiente de ejecución |
| Modificadores / texturas | Ninguno; pigmento por vértice determinista |

El script calcula los triángulos desde las caras y comprueba presupuestos, coordenadas finitas, altura y grosor de los muros antes de importar bpy. La opción `--audit` permite ese recuento sin importar Blender; no se ha ejecutado aquí. No se confunden las copias de presentación con las mallas exportadas: la exportación ocurre primero.

## Partes y pivotes

Recuentos analíticos del script; la ejecución imprime y registra los recuentos calculados.

| Objeto / `part` | `segment` | Triángulos | Pivote Three | Medidas / animación sugerida |
|---|---|---:|---|---|
| Salón de latón / `world` | 0 | 34 064 | (0,0,0) | Estático |
| Níquel / `world` | 1 | 4 368 | (0,0,0) | Estático |
| Tarima / `world` | 2 | 264 | (0,0,0) | Estático |
| Luceros / `world` | 3 | 480 | (0,0,0) | Estático; emisión 1.8 |
| `wall_x` | — | **476** | (0,0,0) | 5.0 × 1.2 × 0.34 m; estático |
| `wall_z` | — | **476** | (0,0,0) | 0.34 × 1.2 × 5.7 m; estático |
| `post` | — | **564** | (0,0,0) | 0.5 × 1.33 × 0.5 m; estático |
| `portal_frame` | — | **3 400** | (0,2.3,0) | Frente +Z; boca de radio 2.2; estático |
| `portal_ring` | 0 | **1 532** | (0,2.3,0) | Rotación local Z, vuelta continua, +0.14 rad/s; abierto +0.36 rad/s |
| `portal_ring` | 1 | **1 532** | (0,2.3,0) | Rotación local Z, vuelta continua, −0.10 rad/s; abierto −0.28 rad/s |
| `portal_core` | — | **800** | (0,2.3,0) | Escala uniforme 1 ± 0.04 a 0.65 Hz; emisión 1.8 → 3.0 al abrir |

`world` total: **39 176 / 60 000**. Portal completo: **7 264 / 15 000**. Cada módulo repetible está por debajo de 1 500. Un solo material por módulo, con remaches y frisos hechos de geometría y color de vértice; sin coste de múltiples materiales por instancia.

## Materiales

Los colores son pigmentos lineales, no hex sRGB; el material base es blanco y el visor conecta `Pigment` al Base Color. El JSON exporta los mismos colores. No requieren texturas externas ni DoubleSide.

| Material | Pigmento lineal principal | Metal / rugosidad | Emisión / alfa |
|---|---|---|---|
| brass | oro (0.78,0.43,0.12), claros (0.95,0.68,0.27), grabados (0.32,0.15,0.045) | 0.72 / 0.29 | 0 / 1 |
| nickel | (0.64,0.72,0.70) | 0.80 / 0.24 | 0 / 1 |
| wood | (0.29,0.12,0.055), veta y variación entre tablas | 0 / 0.74 | 0 / 1 |
| glow | (1.0,0.66,0.23) | 0.12 / 0.30 | 1.8, ámbar / 1 |

## Puntos de meta e integración

- `forward = +Z`, `worldOrigin = (0,0,0)`, `floorY = 0`, `mazeBounds` según contrato.
- `portalPlacement = (0,2.3,−61)` es la posición final sugerida del centro del portal; `portalPivot = (0,2.3,0)` es su pivote exportado. Para una integración que preserve pivotes, trasladar Z = −61 sin volver a sumar Y = 2.3. Si se reconstruye cada geometría en un grupo local, ubicar el grupo en `portalPlacement`.
- `portalHoleRadius = 2.2`, `portalRingSpeeds = [0.14,−0.10]`, `trianglesByPart` con recuentos del generador.
- Núcleo opaco y biconvexo: ocultarlo cerrado. Al abrir, mostrarlo y crecer desde escala 0.01 hasta 1 en 0.7 s; después aplicar el pulso indicado. Evita problemas de orden de transparencias.
- Los aros tienen siete pequeñas marcas cada uno para que la rotación sea visible. No se añade una animación incrustada que compita con la del juego.
- El `.blend` conserva el decorado de presentación: prototipos de muro ocultos, copias sin `part` y portal trasladado al fondo. **Regenerar las exportaciones ejecutando el script**, que restaura primero el estado contractual; no exportar directamente esa escena de presentación con `kit.export_parts`.
- `world.ts` y `maze.ts` se consultaron solo como referencia. La integración y el ajuste de luces del nivel quedan fuera de esta entrega. La luz actual del mundo guitarra es una referencia distinta a la cálida de estos renders.

## Diferencias con el brief y decisiones

1. **Entrega escalonada por instrucción expresa:** en v1 se entregan fuente y documentación; `.blend`, GLB, JSON y renders los genera Claude en la PC de Luis. No se intentó cargar bpy ni Blender en el sandbox.
2. Muros con largo, alto, grosor y pivote exactos del contrato. Poste de 1.33 m, dentro del ~1.35 solicitado.
3. Piso de madera de la caja, opción admitida por el brief. Núcleo del portal ámbar opaco, sin transparencia; el brillo procede de emisión.
4. No se duplica el robot ya existente ni se crea uno sustituto. Los renders previstos presentan el escenario, los módulos y el portal.
5. Campana al fondo en Z = −80 y portal sugerido en Z = −61, manteniendo el laberinto contractual. Aros de radio 2.30 y 2.50 alrededor del hueco, sin reducir su apertura.

## Revisión pendiente

Claude debe ejecutar una vez y devolver ambos renders a Astra. Revisar silueta de corno, legibilidad del piso, curvas cercanas, contraste de muros, brillos del níquel y visibilidad de la campana; corregir solo lo que indiquen las imágenes. Máximo dos rondas de corrección. No hay imágenes revisadas ni resultados de ejecución afirmados en esta v1.

<!-- EJECUCION -->
## Resultado de ejecución

Triángulos verificados: `{"world": 39176, "wall_x": 476, "wall_z": 476, "post": 564, "portal_frame": 3400, "portal_ring": 3064, "portal_core": 800}`.

GLB de juego con AO correcto

Renders generados; revisión visual de Astra pendiente.
