# ENTREGA — Portal del pantano · Walking AP Multi

## Estado

- Versión / ronda: v1, preparación de ronda 1.
- Fecha: 2026-09-26.
- Lista para: ejecución de Claude
- No se cargó Blender ni bpy en el sandbox. Modelado, exportación y renders pendientes de ejecución; revisión visual de Astra pendiente de recibir ambos renders.

## Archivos

Entregado: `modelar-portal-pantano.py`, fuente reproducible, sin assets externos.

El script generará `portal-pantano.blend`, `portal-pantano.glb` (visor con Pigment conectado), `portal-pantano-juego.glb`, `portal-pantano.json`, `render-juego.png` y `render-cerca.png`. No se presentan como archivos ya generados.

Desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-portal-pantano.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Dimensiones diseñadas XYZ | Aproximadamente 10.5 × 9.1 × 2 m; el script imprimirá los límites reales |
| Hueco luminoso | Radio nominal 3.6 m; aro exterior 3.53 + 0.07 m |
| Suelo | Y = −3.5; aro exterior baja aproximadamente 0.1 m bajo suelo, coherente con radio/centro del brief |
| Origen y frente | Centro del hueco (0,0,0); +Z, Y arriba en Three |
| Triángulos | 19 468 por cálculo de la topología del script; pendiente de verificar por Blender; límite automático ≤ 20 000 antes de exportar |
| Mallas | 6 previstas: 2 frame, 3 ring, 1 core |
| Peso JSON / GLB | Pendiente de ejecución |
| AO de juego | distance 1.0, strength 0.7 |
| meta | forward +Z; portalCenter (0,0,0); groundY −3.5; arrivalAnchor (0,−3.5,1.5), referencia frontal al suelo; apertureRadius 3.6; dimensionsXYZ medidas |

## Partes

Todos los pivotes son (0,0,0) en Three. Se exporta la pose de reposo, sin animación horneada.

| Objeto | part | segment | Material | Eje Three | Amplitud | Velocidad sugerida |
|---|---|---|---|---|---|---|
| Marco de manglar | frame | — | Corteza/piedra/musgo, pigmento por vértice | Fijo | 0 | 0 |
| Semillas cálidas fijas | frame | — | Ámbar emisivo | Fijo | 0 | 0 |
| Aro 0 | ring | 0 | Turquesa | Z | Giro continuo 2π | +0.18 rad/s; abierto +0.85 |
| Aro 1 | ring | 1 | Lima | Z | Giro continuo 2π | −0.24 rad/s; abierto −1.10 |
| Aro 2 | ring | 2 | Turquesa | Z | Giro continuo 2π | +0.31 rad/s; abierto +1.35 |
| Corazón de corriente | core | — | Turquesa tenue | Escala XYZ | 1 ± 0.035 | 0.55 ciclos/s |

Transición de apertura sugerida: 1.2 s con suavizado; emisión del core de 0.65 a 2.2. La malla core tiene tres brazos curvos; su escala no tapa el aro interior. Recorrer todas las mallas `frame`, no asumir que `part` identifica un único objeto.

## Materiales

| Material | Paleta sRGB | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Marco | #4a3b28 → #6b5a3e; #6d7560; #3f7a3a → #6fae52 | 0 / 0.88 | 0 | 1 |
| Faroles semilla | #ffc070 | 0 / 0.50 | 1.8 cálida | 1 |
| Aros turquesa | #5ff0d0 | 0 / 0.34 | 2.0 | 1 |
| Aro lima | #b8ff7a | 0 / 0.40 | 1.6 | 1 |
| Remolino | #3f7a3a → #5ff0d0, centro lima | 0 / 0.48 | 0.65 turquesa | 1 |

Un material por malla, compatible con kit. Superficies cerradas y opacas; no necesita DoubleSide ni orden de transparencias. El halo en el juego depende de su posprocesado; la geometría emisiva funciona sin bloom.

## Diferencias con el brief

- Por instrucción explícita de esta fase, se entrega solamente fuente y este documento v1. Los binarios y la revisión propia esperan la ejecución de Claude.
- Remolino resuelto como tres corrientes volumétricas con espacio negativo, sin disco opaco: deja ver el destino y mantiene una entrada acogedora.
- Se eligen dos farolitos de semilla; se omiten los hongos opcionales y el acento magenta para concentrar la lectura en turquesa/lima y ámbar.
- `frame` usa dos mallas para conservar emisión propia de los faroles; las dos siguen siendo fijas. Total 6, dentro del máximo 12.
- El ancho previsto ronda 10.5 m por las raíces extendidas, algo por encima de los ~10 m orientativos. Altura prevista ~9.1 m.
- Si falta Node o falla el convertidor del kit, se deja JSON alternativo sin AO y se registra al pie. No se instala nada ni se declara disponible el GLB faltante.

## Revisión pendiente y sugerencias para integrar

La cámara de juego está a ~25 m, Y = −1.5 respecto del portal (2 m sobre suelo), ligeramente a un lado; ambas imágenes son 1600 × 900, mundo #2b4a44. AgX y las luces pueden alterar el color aparente del fondo.

Al reanudar, Astra debe revisar ambos renders: arco reconocible a distancia, curvas sin facetas visibles, raíces y musgo cohesionados, pigmento legible, paso central despejado y emisión sin blancos quemados. Quedan hasta dos rondas de corrección; no se afirma aprobación visual en esta v1.

No usar los aros ni el remolino como colisión sólida. Colocar el origen a 3.5 m del suelo del nivel; orientar +Z hacia el centro del nivel según el integrador.
