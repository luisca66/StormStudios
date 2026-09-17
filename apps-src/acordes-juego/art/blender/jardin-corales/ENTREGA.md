# ENTREGA — Jardín de corales bioluminiscentes · Batisfera

## Estado
Versión v3, segunda y última ronda de corrección. 2026-09-17. Lista para revisión de Luis.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-corales.py | Fuente bpy reproducible; regenera modelos, renders y esta entrega |
| jardin-corales.blend | Cuatro piezas editables separadas en X; escenografía en Solo revisión |
| jardin-corales.glb | Cuatro mallas en origen, pigmento conectado y rampa de emisión embebida |
| jardin-corales.json | kit.export_parts con vertexEmission añadido sin modificar kit |
| render-piezas.png / render-oscuro.png | Fila a 18 u, FOV vertical 60°, con relleno / solo emisión |
| render-manchon.png | 20 instancias, curva R96, cámara a 45 u, volumen .018 |
| render-cerca.png | Dos paneles fan y tube, cada cámara a 6 u, FOV 60° |
| render-perfil.png | Perfil ortográfico, curva R96 y regla graduada cada 1 u |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-corales.py
```

## Datos técnicos y partes
4 mallas, **8394 triángulos**. JSON: 445.4 KiB.
Dimensiones en X × Y × Z (ancho × alto × profundidad), unidades de juego.
| part / objeto | Triángulos | Dimensiones (u) | Pivote Three | Animación geométrica |
|---|---|---|---|---|
| fan | 2344 | 4.127 × 6.809 × 7.017 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| tube | 2400 | 2.647 × 6.535 × 5.724 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| whip | 1992 | 2.616 × 8.289 × 5.12 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
| crust | 1658 | 3.664 × 1.275 × 2.128 | (0, 0, 0) | Fija; 0 rad; 0 rad/s |
Sin segment. Frente −Z; Y arriba. Bases de ancho <2.7 u, penetración máxima +1.5 u.
Orígenes locales en la cara de pared (0,0,0). Separación del blend solo para presentación.

## Materiales
Un material por pieza, alfa 1, metal 0, rugosidad .92.
Pigmento lineal por vértice: hueso #6b6a63, ciruela #4a3b46, gris #3d4a52; roca #0d151d–#293946.
Emisión ámbar #ffd27f, intensidad 2.8, máscara no uniforme; roca y cuerpos basales con cero exacto.
GLB usa UV que muestrean una rampa de emisión embebida y COLOR_0 para pigmento; no requiere texturas externas.
JSON: vertexEmission es RGB lineal por vértice, alineado con position, incluyendo duplicados de normales.
Multiplicar por emission=2.8; no aplicar emisión uniforme a todo el cuerpo. emissionColor blanco.
El atributo FLOAT emission en Blender guarda la máscara escalar original.

## Meta
Claves raíz pieces={"fan": {"height": 6.809, "footprint": 2.7, "glowCenter": [1.1948, 4.1869, -3.7471], "dimensions": [4.127, 6.809, 7.017]}, "tube": {"height": 6.535, "footprint": 2.7, "glowCenter": [1.2356, 5.7675, -3.2103], "dimensions": [2.647, 6.535, 5.724]}, "whip": {"height": 8.289, "footprint": 2.7, "glowCenter": [0.2324, 1.7561, -0.1664], "dimensions": [2.616, 8.289, 5.12]}, "crust": {"height": 1.275, "footprint": 2.7, "glowCenter": [0.0, 0.8793, -0.347], "dimensions": [3.664, 1.275, 2.128]}}, wallRadius=96, forward="-Z".
glowCenter está en Three local y sitúa un destello; height mide toda la pieza, footprint limita la base.

## Diferencias con el brief
- kit no exporta emisión por vértice de fábrica: se añade vertexEmission tras kit.export_parts.
- GLB representa la emisión por vértice mediante una rampa de textura interpolada, porque glTF estándar no tiene atributo de emisión por vértice.
- Cercanía en dos paneles para mostrar ambas piezas a 6 u. Perfil ortográfico, cuatro secciones de pared R96 trasladadas horizontalmente para separar siluetas.
- La niebla de revisión es volumen Cycles .018, aproximación visual a la niebla exponencial del juego.

## Sugerencias para integrar
Instanciar cada part con su pivote cero. Una malla y un material por pieza.
Pulso sugerido de emisión: multiplicador 1 + 0.16 sin(2π·0.07·t + fase), ±16 %, .07 ciclos/s;
fase distinta por instancia. Geometría estática. Mantener ceros de vertexEmission.
No exportar cámara, pared, escala ni copias de revisión. Sin transparencias.

## Revisión propia y límites de aceptación
Revisados visualmente los cinco renders finales después de dos rondas de corrección.
- Medidas, cuatro pivotes cero y presupuestos: conformes; bases con penetración +1.5 u y huella conservadora 2.7 u.
- Siluetas en oscuridad: abanico reticulado, bocas, cadena de nudos y costra ondulada distinguibles.
- Manchón: 20 instancias con variación de tamaño e inclinación; el patrón del abanico sigue reconocible al repetirse.
- Volumen y detalle: tubos abiertos y labios suavizados; persisten facetas visibles en labios y cambios de dirección de algunas nervaduras en la vista cercana. Este criterio no queda plenamente satisfecho; se alcanzó el máximo de dos rondas.
- Pigmento variable y zonas sin emisión: presentes. El cuerpo frío resulta muy oscuro con el relleno exigido.
- Exportación: GLB con cuatro primitivas, COLOR_0 y textura emisiva embebida; JSON con ceros exactos en vertexEmission y meta completo.
- Reproducibilidad: ejecutado con bpy-run.ps1 de Luis, sin modificar kit ni archivos de integración.
- Las vistas cercanas son recortes de detalle a 6 u, no retratos completos. El perfil usa secciones de pared trasladadas y una emisión tenue de guía en la roca para localizar su superficie; no forma parte del activo exportado.
- El abanico es una red abierta de siete nervaduras principales y enlaces curvos, de lectura más esquemática que un encaje denso naturalista. Se entrega para revisión artística, sin afirmar aprobación de todos los criterios visuales.