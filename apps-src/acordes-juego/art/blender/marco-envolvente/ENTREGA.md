# ENTREGA — Marco envolvente · Batisfera

## Estado
- Versión: v4, ronda extra de detalle autorizada por Luis. Cinco renders revisados por Astra.
- Fecha: 2026-09-16.
- Lista para revisión de Luis e integración de v4; la composición v3 ya fue aprobada e integrada.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-marco.py | Fuente reproducible; conserva el código original de las consolas |
| cabina-envolvente.blend | Modelo editable, módulos y escena de revisión |
| cabina-envolvente.glb | Composición 16:9 con pigmento conectado al material |
| cabina-envolvente.json | Contrato modular, esquinas HUD y metadatos |
| render-16x9.png | 1600 × 900 |
| render-21x9.png | 2100 × 900 |
| render-4x3.png | 1200 × 900 |
| render-estrecho.png | 900 × 1200 |
| render-pilar.png | 1200 × 900, detalle |

Regenerar desde esta carpeta:
powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/Luis/blender-bpy/bpy-run.ps1 modelar-marco.py

## Datos técnicos
- Triángulos: **41,634**, incluidas las consolas y el marco estrecho alternativo.
- Módulos: **14**. Objetos de malla: **379**.
- JSON: 1598.1 KiB.
- Dimensiones de la composición 16:9 en Three: X 2.930, Y 1.515, Z 0.602 m; no es un casco completo.
- Origen de cámara: (0,0,0); Y arriba, frente −Z.
- Cada objeto lleva part igual a su módulo. Sin segment ni partes móviles.
- Animación de todas las partes: ninguna; amplitud 0 rad, velocidad 0 rad/s.
- Pivotes locales: (0,0,0); posición de cada módulo según las fórmulas siguientes.
- meta: triangles, parts, sharedExportTriangles, screenSpaceFormula y consoleComparison; sin anclajes mecánicos adicionales.

## Módulos
| part / módulo | anchor | span | depth | narrow | wide | screenSpace |
|---|---|---|---|---|---|---|
| consoleL | [-1, -1] | — | 0.86 | False | True | False |
| consoleR | [1, -1] | — | 0.86 | False | True | False |
| consoleC | [0, -1] | — | 0.9 | True | True | False |
| railTopC | [0, 0] | — | 1 | False | True | True |
| sillC | [0, 0] | — | 1 | False | True | True |
| pillarL | [0, 0] | — | 1 | False | True | True |
| railTopL | [0, 0] | — | 1 | False | True | True |
| edgeL | [0, 0] | — | 1 | False | True | True |
| sillL | [0, 0] | — | 1 | False | True | True |
| pillarR | [0, 0] | — | 1 | False | True | True |
| railTopR | [0, 0] | — | 1 | False | True | True |
| edgeR | [0, 0] | — | 1 | False | True | True |
| sillR | [0, 0] | — | 1 | False | True | True |
| frameNarrow | [0, 0] | — | 1 | True | False | True |

### Fórmula aprobada, sin cambios en v4
Para screenSpace=true: posición=(0,0,-1); escala=(H*aspecto,1,1).
Reemplaza el escalado k únicamente en el marco. Los vértices ya contienen la profundidad:
p=(u*d, v*H*d, 1-d), con d=0.90-0.10*clamp((abs(u)-0.67)/0.33,0,1)+0.22*clamp(-v/0.40,0,1).
Así el frontal queda a 0.9 m y el extremo lateral a 0.8 m, con techo y alféizar oblicuos. Abajo se aleja 0.22 m para quedar detrás de las consolas.
screenSpace es el contrato ya integrado en v3. V4 no requiere nuevas fórmulas, módulos ni campos.
Sin span: los tramos ya tienen extremos proyectivos compatibles y se solapan en las uniones.
Las consolas conservan la fórmula original y k=clamp(H*aspecto/1.03,0.45,1).
Visibilidad: aspecto<1.1 usa narrow; en los demás usa wide (por defecto true).
El GLB presenta la vista ancha; frameNarrow está en el blend y JSON.

## Conservación exacta de consolas
Comparación automática contra apps-src/acordes-juego/src/3d/assets/cabina-scifi.json:
anchor, depth, stretchX, narrow, screens y **meshes completos iguales**, incluidas posiciones,
normales, índices y pigmento. Diferencia máxima de cada número: **0**.
consoleL/R: anchor=(±1,-1), depth=0.86; consoleC: anchor=(0,-1), depth=0.9.
Esquinas locales en Three, idénticas:
- **consoleL**: {"sonar": [[0.035, 0.03889, 0.00608], [0.285, 0.03889, 0.00608], [0.285, 0.27145, -0.07099], [0.035, 0.27145, -0.07099]]}
- **consoleR**: {"stats": [[-0.03, 0.03414, 0.00765], [-0.305, 0.03414, 0.00765], [-0.305, 0.27619, -0.07257], [-0.03, 0.27619, -0.07257]]}
- **consoleC**: {"answers": [[-0.26, 0.00408, 0.00913], [0.26, 0.00408, 0.00913], [0.24, 0.14104, -0.05203], [-0.24, 0.14104, -0.05203]]}

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| petrol | #142B35 | 0.6 / 0.46 | 0.0 | 1 |
| graphite | #242C32 | 0.45 / 0.58 | 0.0 | 1 |
| steel | #65747A | 0.85 / 0.32 | 0.0 | 1 |
| rubber | #101619 | 0.0 / 0.82 | 0.0 | 1 |
| screen | #03080B | 0.0 / 0.7 | 0.0 | 1 |
| cyan | #63DCE5 | 0.0 / 0.4 | 2.4 | 1 |
| amber | #E9B66B | 0.0 / 0.4 | 1.8 | 1 |
| glassEdge | #9FE3EA | 0.0 / 0.05 | 0.0 | 0.12 |
Solo glassEdge usa transparencia; uv.y=0 en marco, uv.y=1 hacia vidrio. En GLB el mismo degradado está codificado en alfa por vértice.
El JSON conserva el pigmento escalar original por vértice; GLB usa Pigment con el color base incorporado y conectado directamente al material.
No se hornean textos ni cifras.

## Cambios v4 y diferencias con el encargo de detalle
- Techo segmentado con paneles biselados, juntas, costillas escalonadas, rejillas y tres focos por lado (uno frontal y dos laterales).
- Pilares con espina de 8 cm de profundidad, dos cajas por lado, mazos con abrazaderas, remaches y cinco segmentos cian.
- Faldón oscuro inclinado tras las consolas, con paneles y ranuras, cierra bajo los alféizares hasta fuera de pantalla.
- frameNarrow incorpora cuatro paneles de techo, dos focos y cierre inferior.
- Sin cambios de fórmulas, anclas, módulos, materiales, límites de apertura ni esquinas HUD.
- Los detalles se confinan a las superficies metálicas existentes. El cierre inferior ocupa solo el hueco autorizado.
- Contrato completo de los 14 módulos comparado contra v3 mediante aserción reproducible: diferencia 0.
- Las consolas y las esquinas se comparan con el original en cada ejecución: diferencia 0.
- El detalle añade profundidad en los vértices del modelo, sin cambiar la fórmula de colocación del juego.

## Decisiones de composición heredadas de v3 (aprobadas)
- Pilares de aproximadamente 2 % del ancho cada uno, frente al 4–5 % sugerido:
  es necesario reducirlos para compatibilizar 65 % central y aproximadamente 15 % lateral.
  El área geométrica de cristal lateral entre u=0.69 y u=0.99 ocupa 15 % por lado;
  biseles, perspectiva de espesor y reflejos pueden reducir ligeramente el área visible.
- La vista central libre entre los pilares es aproximadamente 65 % del ancho, en los tres aspectos.
- Los pilares se inclinan en profundidad, no diagonalmente a través de la vista frontal.
- El marco usa screenSpace, fórmula documentada arriba, para conservar cierres y reparto de ventanales.
  Sus perfiles escalan horizontalmente con el aspecto; no es escalado isotrópico k.
- Se llama kit.export_parts y se adapta después al contrato modular del brief usando harvest original;
  el JSON final tiene modules, no el formato plano de kit, para preservar HUD y materiales.
- El render de detalle desplaza la cámara para acercarse al pilar. Las cuatro vistas de juego usan origen y FOV vertical 60°.

## Revisión propia y sugerencias para integrar
- Cycles CPU, 32 muestras, denoise; fondo azul #2F7FB5 degradado a #10354F abajo.
- Tres aperturas reales, sin caras de vidrio que bloqueen el mundo; glassEdge en sus cuatro contornos.
- Techo fino, cables sujetos, biseles de tres segmentos y tornillería contenida.
- Laterales descienden hacia las consolas; sin barras que atraviesen el centro.
- El JSON valida el límite de 45 000 triángulos, el contrato v3 de los 14 módulos y la igualdad completa de consolas al regenerarse.
- Revisados los cinco renders: cierre inferior continuo en 16:9, 21:9 y 4:3; detalles fuera del cristal; focos, juntas y cables legibles en el acercamiento.
- GLB comprobado: ocho materiales, pigmento COLOR_0 en todas las primitivas y solo glassEdge en modo BLEND.
- Mantener luces cian y ámbar emisivas en zonas oscuras; glassEdge sin escritura de profundidad y DoubleSide.
- No animar el marco. Todo HUD permanece HTML.
