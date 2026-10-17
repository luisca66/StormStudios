# ENTREGA — Dentro del coro · Resonancia

## Estado

- Versión / ronda: **v1, ronda 1 preparada; ejecución pendiente**.
- Fecha: 2026-10-17.
- **Lista para: ejecución de Claude**.
- No se ha cargado Blender ni importado bpy en este sandbox, conforme al encargo.
- La revisión propia de los dos renders queda pendiente hasta la reanudación de Astra. No se declara aprobación visual.

## Archivos

Entregados: `modelar-mundo-coro.py` y este `ENTREGA.md`.

El script generará `mundo-coro.blend`, `mundo-coro.glb`, `mundo-coro-juego.glb`, `mundo-coro.json`, `render-juego.png`, `render-cerca.png` y `datos-tecnicos.json`. Este último registra recuentos reales por malla y parte, tamaño del GLB y estado de la conversión. No son archivos existentes ni verificados todavía.

Desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-mundo-coro.py
```

No requiere instalar dependencias adicionales: utiliza el kit y la instalación compartida existentes. Si falla la conversión por Node o sus dependencias, conserva JSON con AO, continúa con el visor y los renders, y deja la causa en `datos-tecnicos.json`. No ejecuta npm.

## Dirección artística

Nave de caliza miel, bóveda semicircular con nueve nervaduras, dieciocho columnas de haces, cuarenta asientos tallados y diez atriles con partituras abiertas. El gran rosetón de doce pétalos mezcla ámbar, turquesa, lavanda, coral, azul y verde salvia. Ocho cintas doradas de sección fina flotan entre 6 y 14 m de altura. Piedra y madera tienen variación de pigmento por vértice.

El piso tiene juntas discretas y dos cenefas fuera del laberinto. Columnas y muebles quedan fuera de x ∈ [−17.5, 17.5]. Ningún atril, banco o columna bloquea una celda. Los muros instanciables son paneles de nogal con pequeños arcos ojivales tallados por ambas caras.

## Datos técnicos

**Recuentos previstos por construcción, sin ejecución de Blender.** Las cifras se calculan sobre polígonos explícitos sin modificadores; el script comprobará límites y registrará el recuento real. No incluyen instancias, robot ni luces de las fotografías.

| Parte | Triángulos previstos | Límite |
|---|---:|---:|
| `world`, suma de 5 segmentos | 27.688 | 60.000 |
| `wall_x` | 1.068 | 1.500 |
| `wall_z` | 1.068 | 1.500 |
| `post` | 36 | 1.500 |
| `portal_frame` | 688 | — |
| `portal_ring`, segmento 0 | 656 | — |
| `portal_ring`, segmento 1 | 752 | — |
| `portal_core` | 252 | — |
| Portal completo | 2.348 | 15.000 |
| **Total canónico, 12 mallas** | **32.208** | — |

Segmentos de `world`: piedra 10.160; madera 4.680; oro 5.520; vitral 848; partituras 6.480 triángulos previstos.

| Dato | Valor |
|---|---|
| Ejes / unidades | Three, Y arriba, metros; conversión mediante `kit.B` |
| Mundo, extensión prevista X × Y × Z | 66 × 39,24 × 168 m; x ±33, y −0,24…39, z −90…78 |
| Origen de cada segmento `world` | (0, 0, 0) |
| Piso | superficie y=0; cenefas periféricas y=0,001 |
| `wall_x` | 5 × 1,2 × 0,34 m; pivote (0,0,0) |
| `wall_z` | 0,34 × 1,2 × 5,7 m; pivote (0,0,0) |
| `post` | 0,5 × 1,35 × 0,5 m; pivote (0,0,0) |
| Portal | frente +Z; centro y=2,3; radio libre del marco 2,2 m |
| AO | distance=1,5; strength=0,7; horneado por familias antes de exportar |
| Peso de archivos | pendiente de ejecución |
| Renders | ambos 1600 × 900, Cycles 48 muestras con denoise |

## Partes y animación sugerida

| `part` | `segment` | Pivote Three | Acabado | Eje / amplitud | Velocidad |
|---|---|---|---|---|---|
| `world` | 0 | (0,0,0) | caliza | estática | 0 |
| `world` | 1 | (0,0,0) | nogal | estática | 0 |
| `world` | 2 | (0,0,0) | oro, cintas y tracería | estática | 0 |
| `world` | 3 | (0,0,0) | vitral luminoso | estática | 0 |
| `world` | 4 | (0,0,0) | papel y tinta por pigmento | estática | 0 |
| `wall_x`, `wall_z`, `post` | — | (0,0,0) | nogal con talla clara | estáticas | 0 |
| `portal_frame` | — | (0,2.3,0) | caliza | estática | 0 |
| `portal_ring` | 0 | (0,2.3,0) | pétalos de vitral | Z, giro continuo 2π | +0,06 rad/s |
| `portal_ring` | 1 | (0,2.3,0) | tracería dorada | Z, giro continuo 2π | −0,04 rad/s |
| `portal_core` | — | (0,2.3,0) | luz marfil | escala uniforme 1 ± 3,5 % | 0,35 ciclos/s |

Al abrir: escala del núcleo 0,01 → 1 en 0,7 s; emisión sugerida 1,1 → 2,2. Ocultarlo al cerrar. Con movimiento reducido: aros inmóviles y escala 1. Las velocidades son sugerencias; el controlador actual del juego aplica sus propias velocidades.

## Materiales

Todos conectan `Pigment` al color base en el GLB de visor. Un material por malla canónica, sin texturas. Material base blanco y pigmento en espacio lineal.

| Material | Paleta principal | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Caliza miel | `eadfc7`, `e7d5af`, `f1e2c2` | 0 / 0,84 | 0 | 1 |
| Nogal tallado | `70482f`, `976338`, `be8c50` | 0 / 0,64 | 0 | 1 |
| Voces de oro | `f2ce79`, `d5aa56` | 0,35 / 0,33 | 0,35, tono `ffd995` | 1 |
| Vitral | ámbar, turquesa, lavanda, coral, azul, salvia | 0,08 / 0,32 | 0,55, tono `fff0d2` | 1 |
| Papel y tinta | `fff0cc`, `544638` | 0 / 0,86 | 0 | 1 |
| Núcleo | `ffdda1` | 0,1 / 0,28 | 1,1, tono `ffe3a5` | 1 |

La emisión es uniforme dentro de cada material, tal como admite el kit; el color de emisión del vitral es marfil, mientras sus pétalos conservan pigmento multicolor. No se depende de transmisión ni de emisión para proyectar colores en el suelo.

## Puntos de meta e integración

- `portalCenter=(0,2.3,0)`: centro geométrico y pivote común de las cuatro mallas del portal.
- `portalRadius=2.2`: radio del hueco de piedra antes de la escala del juego.
- `portalPreviewPosition=(0,2.3,-70)`: centro en la fotografía, **no** desplazamiento incorporado al prototipo.
- `roseCenter=(0,20,-86.9)`: centro del gran vitral fijo de fondo.
- `floorY=0` y `mazeBounds`: referencia del contrato; `animation` documenta las sugerencias anteriores.

`environments.ts` ya coloca el mundo y muros en FLOOR_Y=0,6 y `world.ts` eleva el portal y lo escala ×2,2. Se conserva el contrato local y=0 del brief: no añadir otro desplazamiento de 2,3 al integrar el portal. El selector actual aún enumera guitarra, corno y piano; añadir coro corresponde al integrador. No se ha modificado código del juego.

## Diferencias con el brief y decisiones

- Entrega diferida solicitada: solo fuente y documento en v1; binarios y revisión visual pendientes de ejecución de Claude.
- Vitral y núcleo opacos y luminosos, en lugar de vidrio transmisivo: lectura estable y sin problemas de orden de transparencias. El núcleo desaparece cuando el juego cierra el portal.
- Bóveda semicircular de piedra y talla ojival en los paneles: elección de forma dentro de la libertad artística del brief. Laterales abiertos entre columnas para mantener luz y vistas amplias.
- Cintas estáticas dentro de `world`; su forma ondulada representa voces sin introducir partes móviles fuera del contrato.
- Piso plano con juntas y cenefas geométricas: la cenefa sobresale 1 mm fuera del recorrido para evitar z-fighting.
- AO horneada primero con `kit.bake_ao` por familias (mundo, cada prototipo y portal). Después `kit.export_glb` recibe las copias horneadas con `ao=None`, evitando una segunda AO y las sombras falsas de prototipos superpuestos. Parámetros idénticos a los pedidos.
- El robot existente se carga desde `robot.blend` como referencia de escala únicamente después de exportar. No se duplica como parte del escenario del juego ni se modifica su fuente.

## Revisión pendiente al reanudar

Revisar ambos renders: claridad del laberinto desde arriba, columnas y bóveda reconocibles, lectura cálida del rosetón, talla y partituras de cerca, grosor de cintas y escala del robot. Comprobar `datos-tecnicos.json`, estado de conversión y dimensiones que valida el script. Hasta entonces no se afirma que los renders o la ejecución hayan pasado revisión. Máximo dos rondas de corrección.
