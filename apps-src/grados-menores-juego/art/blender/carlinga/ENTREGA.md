# ENTREGA — Carlinga del Cometa · El Cometa

## Estado
- Versión: v5. v4 de Astra (ronda extra 3 autorizada por Luis) + grietas de la proa rehechas por Claude. Fecha: 2026-09-15.
- Lista para revisión de Luis; integración a cargo del otro modelo.

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-carlinga.py` | Fuente bpy; regenera todos los entregables |
| `carlinga.blend` | Escena editable, cámara exacta de reposo y luces de revisión |
| `carlinga.glb` | Diez mallas, un material por malla, pigmento conectado |
| `carlinga.json` | Exportación mediante kit.export_parts; posiciones relativas al pivote |
| `render-juego.png`, `render-cerca.png`, `render-lateral.png`, `render-proa.png` | Cycles 40 muestras y denoise |
| `render-hud.png` | Vista de reposo con máscara negra al 78% sobre el 25% inferior; solo compositor Blender |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-carlinga.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Triángulos | 19854 |
| Partes / mallas / materiales por malla | 10 / 10 / 1 |
| Categorías part | 8; orrery_planet tiene 3 segmentos |
| Dimensiones ancho × alto × fondo | 5.244 × 3.777 × 10.099 u |
| Origen | Ojo del jugador (0,0,0) |
| Frente | −Z Three / +Y Blender |
| JSON | 1093.7 KiB |
| GLB | 552.6 KiB |
| Transparencias | Ninguna; hielo opaco |

## Partes y animación
| Objeto | part | segment | Pivote Three | Eje | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|
| Marco_Hielo | frame_ice | — | (0.0000, 0.0000, -0.0000) | — | 0 | 0 | Rígida |
| Marco_Laton | frame_brass | — | (0.0000, 0.0000, -0.0000) | — | 0 | 0 | Rígida |
| Proa_Hielo | comet_nose | — | (0.0000, 0.0000, -0.0000) | — | 0 | 0 | Rígida |
| Tablero | board | — | (0.0000, -0.8616, -1.2765) | — | 0 | 0 | Rígida |
| Instrumentos_Laton | board_brass | — | (0.0000, -0.8616, -1.2765) | — | 0 | 0 | Rígida |
| Planeta_0 | orrery_planet | 0 | (-0.9500, -0.7624, -1.2567) | +Y local / vector meta en JSON | 360° continuo | 0.642857 rad/s | Radio 0.17 u |
| Planeta_1 | orrery_planet | 1 | (-0.9500, -0.7624, -1.2567) | +Y local / vector meta en JSON | 360° continuo | 0.375000 rad/s | Radio 0.28 u |
| Planeta_2 | orrery_planet | 2 | (-0.9500, -0.7624, -1.2567) | +Y local / vector meta en JSON | 360° continuo | 0.264706 rad/s | Radio 0.39 u |
| Aguja_Manometro | gauge_needle | — | (0.9500, -0.7784, -1.2783) | +Y local / vector meta en JSON | −120° a +120° (±2.0944 rad) | respuesta 6 s⁻¹ | Interpolación exponencial; reposo a 0 |
| Palanca_Radiofaro | beacon_lever | — | (0.4800, -0.9288, -1.0713) | +X local | 0 a 0.42 rad | ataque 12 s⁻¹; retorno 8 s⁻¹ | Bisagra física; retorno amortiguado |

## Materiales
| Material / partes | Color principal | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Hielo / frame_ice | #20415a → #6fa8c4; vetas #bee9f5 | 0.02 / 0.38 | 0 | 1 |
| Latón / frame_brass, board_brass, planetas, aguja, palanca | #c9a227 con desgaste claro y pátina | 0.85 / 0.30 | #c9a227 × 0.10 | 1 |
| Proa / comet_nose | Hielo azul y fisuras #6fd3ff | 0.025 / 0.34 | #12303f → #6fd3ff × 1.8 | 1 |
| Tablero / board | Madera #3a2a1e → #5a4230; escarcha #bee9f5; cuadrante #101e2b | 0 / 0.88 | 0 | 1 |

## Metadatos y ejes de integración
`eye=(0,0,0)`, `forward=-Z`, `size` en orden ancho/alto/fondo.
`boardPivot=(0.0000, -0.8616, -1.2765)`, `orreryCenter=(-0.9500, -0.7624, -1.2567)`, `gaugeCenter=(0.9500, -0.7784, -1.2783)`, `beaconHinge=(0.4800, -0.9288, -1.0713)`.
`boardTiltRadians=+0.55`; `instrumentAxisY=(0.0000, 0.8525, 0.5227)`, `instrumentAxisX=(1,0,0)`.
`orbitRadii=[0.17,0.28,0.39]`; `orbitSpeeds=[0.642857,0.375,0.264706]` rad/s.

GLB conserva Rx(+0.55) en las partes del tablero: componer esa orientación base con el giro local Y. El JSON de kit aplica esa inclinación a vértices/normales (`jsonRotationBaked=true`): para planetas y aguja, rotar alrededor de `instrumentAxisY` en el espacio común. No volver a inclinar los vértices del JSON. La palanca usa X en ambos formatos. Todas las partes son independientes, sin jerarquía necesaria. Los planetas incluyen su desplazamiento orbital; no sumar el radio otra vez.

La proa conserva su pivote (0,0,0); solo su geometría sube `noseLift=0.75`. El GLB lleva una paleta emisiva empaquetada como textura de dos colores dentro de su único material. Como kit solo exporta emisión uniforme, el generador añade `emissionVertexColor` a `comet_nose` en el JSON: RGB lineal por vértice, misma longitud/orden que `position`, multiplicado por `emission=1.8`. El integrador debe usar ese canal para reproducir las grietas localizadas del GLB; ignorarlo deja solo la emisión oscura uniforme de respaldo. No requiere nuevas partes ni draw calls. `noseEmissionPalette` y `noseEmissionStrength` documentan sus colores e intensidad. `hudPreview` describe únicamente el render de comprobación.

## Comprobaciones del generador
- 10 objetos y 8 etiquetas part; segmentos 0–2 y centro compartido exacto.
- Órbitas muestreadas en 73 ángulos: error de plano < 0.000001 u.
- Un material por parte; COLOR_0 presente en las diez primitivas GLB; pigmento y alfa 1 presentes en JSON.
- Rayos desde el ojo: rectángulo central de 84% de ancho × 80% de alto (67.2% de pantalla), libre en 94.30% de 1333 muestras. Límites normalizados X=[−0.84,0.84], Y=[−0.60,1.0].
- Cámara de reposo en el origen, FOV vertical 60°; cercana con pitch −20° y lateral con yaw +60°; proa aislada solo durante su render.
- 544 rayos hacia los tres anillos y el cuadrante/bisel: ninguno interceptado por el latón del alféizar. Pivotes, centros y ejes de v3 conservados.
- Proa: 62.51% de su silueta proyectada completa visible desde reposo, por encima del alféizar/tablero (requisito ≥33.33%). Muestreo: 802/1283 rayos; 430 muestras visibles también por encima del HUD.

## Diferencias con el brief
Se conservan los pivotes, ejes y posiciones de instrumentos de v3: tablero en (0,−0.90,−1.30), inclinación +0.55 rad, cara superior como pivote. No se desplazan para esquivar el HUD. Las portillas en ±2.3 u, sus nuevas paredes y la proa con punta aproximadamente Z=−8.9 hacen que el conjunto exceda la caja aproximada del brief original; las dimensiones medidas están arriba. El dintel a Y=1.28 sigue fuera del campo vertical de reposo.
Cambios autorizados en ronda 3: filo trasladado al frente inferior del alféizar, bajo el plano del tablero; madera oscura envejecida con veta por vértice y escarcha en juntas/esquinas; paredes laterales continuas de hielo con portillas empotradas, sin tubos ni tira oscura en jambas; proa elevada 0.75 u y grietas emisivas a intensidad 1.8; render adicional de HUD. La proa continúa siendo opaca. La extensión emisiva del JSON se explica arriba.
El sextante y cuadrante comparten acabado mate de board; la empuñadura oscura de la palanca comparte latón de beacon_lever por el límite de un material por parte. Sin cristal de ventana ni partículas/HUD. BRIEF.md se conserva como documento fuente.

## Revisión propia
v5 (Claude): las vetas de la proa eran zigzags paralelos que parecían puntadas; ahora una fisura principal quebrada recorre el lomo y siete ramas bajan por los costados afinándose, con la misma paleta emisiva. Revisión v4: cinco renders inspeccionados, incluyendo HUD. Instrumentos completos sin cruce del filo, madera oscura con veta y escarcha, pared de hielo sin tuberías ni tira oscura de jamba, proa visible sobre el alféizar y sobre la máscara del HUD. La máscara comienza en la fila 675 de una imagen de 900 píxeles de alto. Las facetas de la proa son intencionales; remaches, esferas y perfiles metálicos usan normales suaves. El dintel permanece fuera de la vista de reposo.
