# ENTREGA — Calamar Vela · Batisfera

## Estado
- Versión / ronda: v2, ronda de corrección 1
- Fecha: 2026-09-13
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-calamar.py` | Fuente reproducible; regenera todos los entregables |
| `calamar-vela.blend` | Escena editable con cámara de juego y foco |
| `calamar-vela.glb` | 11 mallas, pigmentos por vértice y propiedades part/segment |
| `calamar-vela.json` | Geometría mediante kit.export_parts |
| `render-juego.png`, `render-perfil.png`, `render-detalle.png` | Cycles, 40 muestras y denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-calamar.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Tamaño largo × alto × ancho | 4.550 × 0.927 × 1.722 u |
| Origen | Cuello, (0,0,0) |
| Frente | Punta −Z en Three; +Y en Blender |
| Triángulos | 11714 |
| Mallas exportadas | 11 |
| Peso JSON | 520.8 KiB |

## Partes
| Objeto | part | segment | Pivote Three | Material | Animación |
|---|---|---|---|---|---|
| Manto | mantle | — | 0.000, 0.000, -0.000 | Piel satinada · pigmento por vertice | Ver brief |
| Vela izquierda | fin | — | -0.270, 0.000, -0.850 | Piel satinada · pigmento por vertice | Ver brief |
| Vela derecha | fin | — | 0.270, 0.000, -0.850 | Piel satinada · pigmento por vertice | Ver brief |
| Cabeza ojos y sifon | head | — | 0.000, 0.000, -0.000 | Piel satinada · pigmento por vertice | Ver brief |
| Par de brazos 0 | arm | 0 | 0.000, 0.000, 0.480 | Brazos · emision neutra 0.20 | Destello nota 0 |
| Par de brazos 1 | arm | 1 | 0.000, 0.000, 0.480 | Brazos · emision neutra 0.20 | Destello nota 1 |
| Par de brazos 2 | arm | 2 | 0.000, 0.000, 0.480 | Brazos · emision neutra 0.20 | Destello nota 2 |
| Par de brazos 3 | arm | 3 | 0.000, 0.000, 0.480 | Brazos · emision neutra 0.20 | Destello nota 3 |
| Tentaculo -1 | tentacle | — | -0.160, -0.120, 0.460 | Piel satinada · pigmento por vertice | Ver brief |
| Tentaculo 1 | tentacle | — | 0.160, -0.120, 0.460 | Piel satinada · pigmento por vertice | Ver brief |
| Fotoforos ventrales y oculares | glow | — | 0.000, 0.000, -0.000 | Fotoforos · blanco familia | Ver brief |

## Materiales
| Material | Color hex | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel satinada | Blanco base × Pigment: #782333–#9c3446; aletas #8c2e43–#e99aab; ojos #071522 / #536776 | 0 / 0.30 | 0 | 1 | Usar vertexColor para conservar todos los detalles |
| Brazos | Blanco base × Pigment #a34355; ventosas #e7a5aa | 0 / 0.30 | #f4f1ff, 0.20 | 1 | Emisión neutra independiente de pigmento |
| Fotóforos | #f4f1ff | 0 / 0.30 | #f4f1ff, 2.0 | 1 | Teñir base y emisión por familia |

## Diferencias con el brief
Aletas opacas de espesor 0.006 u, con borde aclarado por pigmento en vez de transparencia opcional: mantiene el contorno y evita problemas de orden de dibujo. Sin otras diferencias técnicas previstas.

## Sugerencias para integrar
Aplicar vertexColors; cada objeto contiene un único material. Aleteo alrededor del eje Z local de Three, ±0.10 rad con lados opuestos. Mantle y glow comparten pivote: aplicarles el mismo pulso ±9 %. Brazos segment 0–3 agrupan pares contiguos de una corona completa; tentáculos con fase retrasada. Sin animaciones horneadas. Los fotóforos bajo los ojos pertenecen a glow según el encargo. No se realizó integración.
