# ENTREGA — Pulpo Dumbo · Batisfera

## Estado
- Versión / ronda: v1, entrega inicial
- Fecha: 2026-09-13
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-dumbo.py` | Fuente bpy reproducible que regenera todos los entregables |
| `pulpo-dumbo.blend` | Escena editable, cámara de juego y foco frío |
| `pulpo-dumbo.glb` | 12 mallas con pigmento por vértice y propiedades |
| `pulpo-dumbo.json` | Exportación compartida kit.export_parts, coordenadas Three |
| `render-juego.png`, `render-cerca.png`, `render-perfil.png`, `render-detalle.png` | Cycles 40 muestras, denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-dumbo.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Tamaño total largo × alto × ancho | 2.148 × 2.738 × 2.507 u |
| Manto-cabeza sin ojos | ≈1.72 ancho × 1.50 alto u |
| Origen | Centro del manto-cabeza (0,0,0) |
| Frente | −Z Three, +Y Blender; brazos −Y Three, −Z Blender |
| Triángulos | 11820 |
| Mallas | 12: body, 2 ear, web, 8 arm |
| JSON | 523.8 KiB |
| Meta | forward=-Z; webPivot=(0,-0.42,0); armOrder describe segment 0 frente −Z, luego hacia +X alrededor de Y |
| Cámara juego | 25.000 u del origen, FOV vertical 60°, near 0.1, 1600×900; altura proyectada 9.96% |
| Cámara cerca | 10.000 u del origen, misma vista 3/4 frontal, FOV vertical 60°, 1600×900; altura proyectada 25.75% |
| Comprobación de uniones | 1536 muestras de la malla real dentro del brazo con giros extremos y pulso web |
| Solape web/brazos | Margen conservador mínimo 0.0121 u con giro ±0.1 rad sobre cualquier eje, descontando grosor/ondulación de membrana y pulso XZ de ±1% |

## Partes
| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Manto cabeza y ojos | body | — | 0.000, 0.000, -0.000 | Piel satinada melocoton | Y / escala XYZ | ±0.10 rad / ±2% | 0.08 / 0.25 ciclos/s | Giro en padre común; respiración local |
| Oreja izquierda | ear | — | -0.640, 0.370, 0.040 | Piel satinada melocoton | Z | ±0.32 rad | 0.38 ciclos/s | Signos opuestos; pivote en inserción |
| Oreja derecha | ear | — | 0.640, 0.370, 0.040 | Piel satinada melocoton | Z | ±0.32 rad | 0.38 ciclos/s | Signos opuestos; pivote en inserción |
| Brazo 00 | arm | 0 | 0.000, -0.420, -0.320 | Brazos coral / emision neutra 0.20 | X y Z | ±0.10 rad total | 0.30 ciclos/s | Rotación radial: X=1.000·θ, Z=0.000·θ; fase 0.000 rad |
| Brazo 01 | arm | 1 | 0.226, -0.420, -0.226 | Brazos coral / emision neutra 0.20 | X y Z | ±0.10 rad total | 0.30 ciclos/s | Rotación radial: X=0.707·θ, Z=0.707·θ; fase 0.785 rad |
| Brazo 02 | arm | 2 | 0.320, -0.420, -0.000 | Brazos coral / emision neutra 0.20 | X y Z | ±0.10 rad total | 0.30 ciclos/s | Rotación radial: X=0.000·θ, Z=1.000·θ; fase 1.571 rad |
| Brazo 03 | arm | 3 | 0.226, -0.420, 0.226 | Brazos coral / emision neutra 0.20 | X y Z | ±0.10 rad total | 0.30 ciclos/s | Rotación radial: X=-0.707·θ, Z=0.707·θ; fase 2.356 rad |
| Brazo 04 | arm | 4 | 0.000, -0.420, 0.320 | Brazos coral / emision neutra 0.20 | X y Z | ±0.10 rad total | 0.30 ciclos/s | Rotación radial: X=-1.000·θ, Z=0.000·θ; fase 3.142 rad |
| Brazo 05 | arm | 5 | -0.226, -0.420, 0.226 | Brazos coral / emision neutra 0.20 | X y Z | ±0.10 rad total | 0.30 ciclos/s | Rotación radial: X=-0.707·θ, Z=-0.707·θ; fase 3.927 rad |
| Brazo 06 | arm | 6 | -0.320, -0.420, 0.000 | Brazos coral / emision neutra 0.20 | X y Z | ±0.10 rad total | 0.30 ciclos/s | Rotación radial: X=-0.000·θ, Z=-1.000·θ; fase 4.712 rad |
| Brazo 07 | arm | 7 | -0.226, -0.420, -0.226 | Brazos coral / emision neutra 0.20 | X y Z | ±0.10 rad total | 0.30 ciclos/s | Rotación radial: X=0.707·θ, Z=-0.707·θ; fase 5.498 rad |
| Membrana paraguas | web | — | 0.000, -0.420, -0.000 | Piel satinada melocoton | Escala XZ | ±1% | 0.30 ciclos/s | Sin traslación; pulso suave coordinado |

## Materiales
| Material | Color | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel satinada | Blanco × Pigment; melocotón #e8b4a6 y coral #c9837a, bordes #f9d4be, motas oscuras | 0 / 0.46 | 0 | 1 | body, ear, web; vertexColors, sin texturas |
| Brazos | Pigment coral, interior rosado y ventosas crema | 0 / 0.46 | Neutra #fff4f0, 0.20 | 1 | Cada segment destella por separado; teñir emisión con familia |

## Diferencias con el brief
Ninguna desviación intencional de presupuesto, partes, ejes o cámaras. Se eligen ventosas discretas en lugar de cirros. Ojos y piel comparten rugosidad 0.46 para conservar un material por parte también en JSON. La emisión neutra afecta todo el brazo, incluidas sus ventosas.

## Revisión propia
Se revisaron visualmente los cuatro renders: orejas reconocibles en juego, curvas suaves a 10 u, pigmento variable, ojos oscuros sin rasgos humanos y cara inferior con ventosas. Se corrigieron las inserciones de brazos, orientación de ventosas y puntas antes de entregar. El script verifica presupuesto, dimensiones, segmentos, distancia de cámara y altura proyectada. La unión radial de la membrana entra en el volumen de cada brazo; el margen geométrico se calcula para todo el tramo unido con ±0.1 rad de giro.

## Sugerencias para integrar
Padre común en origen para el giro del conjunto. Orejas sobre Z con signos opuestos. Los brazos tienen pivotes independientes, segment 0 frente −Z y segment 2 hacia +X; el orden continúa hasta 7. Usar θ=0.10·sin(2π·0.30·t+fase) con la combinación X/Z de la tabla. Emisión idle 0.20; pulso sugerido hasta 2.4 durante 0.18 s por nota, color magenta #ff7fd0 o verde #7fffc8. La membrana pulsa solo ±1% en XZ para conservar el solape. Sin animaciones horneadas; modelo preparado para animación del integrador.
