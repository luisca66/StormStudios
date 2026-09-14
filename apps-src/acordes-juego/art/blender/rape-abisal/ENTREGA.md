# ENTREGA — Rape Abisal · Batisfera

## Estado
- Versión / ronda: v3, ronda de corrección 1 solicitada por Luis (archivo previo rotulado v2)
- Fecha: 2026-09-13
- Lista para: revisión de Luis

## Archivos
| Archivo | Contenido |
|---|---|
| `modelar-rape.py` | Fuente reproducible, regenera todos los entregables |
| `rape-abisal.blend` | Escena editable, cámara de juego, foco y materiales |
| `rape-abisal.glb` | Modelo portable con pigmento por vértice y propiedades part |
| `rape-abisal.json` | Geometría generada con kit.export_parts |
| `render-juego.png`, `render-perfil.png`, `render-detalle.png`, `render-cerca.png` | Cycles, 40 muestras, denoise |

Regenerar desde esta carpeta:
```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-rape.py
```

## Datos técnicos
| Dato | Valor |
|---|---|
| Tamaño total largo × alto × ancho | 2.914 × 2.069 × 2.313 u |
| Cuerpo sin caña, cola ni pectorales | ≈2.1 × 1.38 × 1.7 u (corona aplanada) |
| Origen | Centro del cuerpo (0,0,0) |
| Frente | −Z Three; +Y Blender |
| Triángulos totales | 9992 |
| Mallas exportadas | 7 |
| Peso JSON | 447.2 KiB |
| Punta rod (Three) | (0.000, 1.055, -1.100) |
| Centro / pivote lure (Three) | (0.000, 1.055, -1.100), coincidente con punta rod |

## Partes
| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad | Notas |
|---|---|---|---|---|---|---|---|---|
| Cuerpo ojos dientes superiores | body | — | 0.000, 0.000, -0.000 | Piel mate / dientes satinados por atributo | Z | ±0.045 rad | 0.16 ciclos/s | Balanceo desde padre común |
| Mandibula inferior dientes y papilas | jaw | — | 0.000, -0.035, -0.720 | Piel mate / dientes satinados por atributo | X | −0.25 a 0 rad | 0.22 ciclos/s | Bisagra; apertura hacia abajo |
| Cana illicium | rod | — | 0.000, 0.640, -0.350 | Piel mate / dientes satinados por atributo | Z / X | ±0.18 / ±0.045 rad | 0.28 / 0.21 ciclos/s | Lure sigue rodTip transformado |
| Senuelo esca | lure | — | 0.000, 1.055, -1.100 | Esca blanco calido / emision 2.7 | Escala XYZ / emisión | ±5% / 0–2.7 | 0.8 ciclos/s / pulso de 0.18 s por nota | Escala desde centro; pulsos según acorde |
| Pectoral -1 | fin | — | -0.720, -0.240, 0.050 | Piel mate / dientes satinados por atributo | Z | ±0.16 rad | 0.55 ciclos/s | Signos opuestos izquierda/derecha |
| Pectoral 1 | fin | — | 0.720, -0.240, 0.050 | Piel mate / dientes satinados por atributo | Z | ±0.16 rad | 0.55 ciclos/s | Signos opuestos izquierda/derecha |
| Cola caudal corta | tail | — | 0.000, -0.040, 0.940 | Piel mate / dientes satinados por atributo | Y | ±0.20 rad | 0.42 ciclos/s | Ondulación lateral |

## Materiales
| Material | Color hex | Metal / rugosidad | Emisión | Alfa | Integración |
|---|---|---|---|---|---|
| Piel, cavidad, dientes | Blanco base × Pigment: piel #342b27–#625044; cavidad #211518; dientes #d9cfad / #e3d7b6 | 0 / 0.76; atributo Satin baja dientes a 0.34 y ojos a 0.24 en Blender | 0 | 1 | Activar vertexColors; no texturas externas |
| Esca | Blanco base × Pigment #f7f3e8 | 0 / 0.76 | #f7f3e8, 2.7 | 1 | Teñir base y emisión con la familia; halo externo |

## Cambios de esta corrección
Cabeza ancha con corona aplanada, hombro marcado y cuerpo afinado. Pliegues en la superficie y 22 papilas dispersas. Labios de sección variable integrados hacia la piel, inferior más grueso. Pectorales de 25 × 9 muestras y caudal de 31 × 9, cerradas, curvas, con borde ondulado y radios elevados pigmentados. Manchas pardas, vientre más claro y contorno oral oscuro. Se conserva origen, ejes, siete partes, pivotes, dientes y rodTip. Render cercano nuevo a 10 u del objetivo, 3/4 frontal, FOV vertical 60°, 1600 × 900.

## Diferencias con el brief
Corona aplanada: altura de piel ≈1.38 u, dentro del tamaño aproximado; cabeza conserva 1.7 u de ancho. El JSON compartido exporta una rugosidad uniforme por parte (0.76); el acabado satinado de dientes/ojos se define por atributo en Blender, que kit.export_parts no transporta. El pigmento sí se conserva en JSON y GLB. No hay transparencias ni otras partes emisivas.

## Revisión propia
Se revisaron los cuatro renders: silueta y señuelo legibles a distancia; boca y dientes visibles; labios curvos de grosor variable; aletas cerradas con radios y borde ondulado; pliegues y pigmento de piel. Cresta y línea lateral adaptadas a la nueva superficie. Exportación comprueba siete mallas, presupuesto y largo máximo. Ejes y pivotes conservados, rodTip coincide con lure.

## Sugerencias para integrar
Mandíbula: bisagra sobre X en (0,-0.035,-0.72), abrir hacia abajo hasta 0.25 rad de magnitud (rotación X negativa en Three). Rod: vaivén ±0.18 rad desde su base, mantener lure unido a la punta transformada, sin aplicarle dos veces la traslación. Lure parpadea por nota y usa su centro como origen. Tail oscila sobre Y. Pectorales aletean con lados opuestos. Mantener balanceo general desde un padre común. La boca tiene cavidad real, 9 dientes superiores y 8 inferiores. Sin animación horneada ni integración.
