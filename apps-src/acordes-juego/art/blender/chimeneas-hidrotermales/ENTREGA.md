# ENTREGA — Chimeneas hidrotermales · Batisfera

## Estado

- Versión: **v1-ronda1**, primera corrección tras revisión propia de los cinco renders de v1. 2026-09-26.
- **Lista para: revisión**.
- Claude ejecutó v1 en la PC de Luis y confirmó EXPORT: cuatro partes, 10 100 triángulos y meta.plumes/meta.pieces correctos. Astra revisó los cinco renders adjuntos. No se ha importado bpy ni ejecutado Blender en el sandbox. Esta corrección de iluminación todavía debe ejecutarla Claude; no hay aprobación visual del resultado corregido.

## Archivos

Actualizado `modelar-chimeneas.py`, fuente reproducible con semilla fija y rutas relativas a su ubicación. Al ejecutarlo regenera `chimeneas.json`, `chimeneas.glb`, `chimeneas.blend` y los cinco renders: `render-kit.png`, `render-oscuro.png`, `render-chimenea.png`, `render-fondo.png`, `render-perfil.png`. Los resultados existentes pertenecen a v1 hasta la nueva ejecución. El script conserva esta nota v1-ronda1.

Desde la raíz del checkout:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-juego\art\blender\chimeneas-hidrotermales\modelar-chimeneas.py
```

## Datos técnicos y partes

Dimensiones X × Y × Z, en unidades Three. Y incluye 1.5 u enterradas: el pivote sigue en el suelo, Y=0. Las dimensiones se normalizan explícitamente en el script.

| part | Triángulos confirmados en v1 | Dimensiones (u) | Alto sobre el suelo | Huella X |
|---|---:|---|---:|---:|
| spire | 2312 | 16 × 47.5 × 12 | 46 | 16 |
| stack | 2532 | 10 × 19.5 × 8 | 18 | 10 |
| cluster | 3372 | 12 × 10 × 10 | 8.5 | 12 |
| flange | 1884 | 8.8 × 5.8 × 7.6 | 4.3 | 8.8 |
| **Total** | **10100** | Cuatro mallas | | |

Sin segment; pivotes JSON y GLB (0,0,0), Y arriba, frente −Z. Geometría estática: amplitud 0 rad, velocidad 0 rad/s. Una malla y un material por pieza, sin modificadores ni AO horneado. Peso de archivos no medido. Las piezas se separan únicamente en la escena de revisión. Esta ronda no modifica geometría, dimensiones, pigmento ni emisión exportada.

## Dirección artística

Pináculo estratificado con espolón roto a media altura y cinco contrafuertes enterrados. Chimenea alta con boca irregular plegada hacia una garganta profunda y siete costras salientes. Grupo con cuatro bocas de alturas distintas sobre una misma base. Chimenea muerta con tres repisas asimétricas. Las cavidades tienen fondo oscuro, sin discos luminosos tapando sus bocas.

Roca #0d151d–#293946; mineral #161013–#2c2022; costras #6b5a3a. Metal 0, rugosidad .96, alfa 1. Calor #ff7a2f dentro del labio y #8f2412 hacia fuera; distribución angular irregular y algunas grietas cortas. Bacterias #7fffc8 con intensidad muy inferior al calor. Ceros exactos en cuerpos fríos y bases. No hay lava, ojos ni humo blanco.

## Exportación y meta

- `kit.export_parts` genera el JSON; después se añade `vertexEmission` RGB lineal por vértice, alineado con `position`, incluidos los duplicados por normales. Es el contrato de la pieza hermana jardín de corales. `emission=3.2`, `emissionColor=[1,1,1]`.
- `Pigment` se reactiva **por nombre** justo antes de exportar. El script exige `vertexColor` completo en las cuatro mallas y comprueba ceros de emisión, pivotes, dimensiones, recuentos exactos y límites del brief.
- GLB: pigmento conectado a Base Color y emisión mediante un atlas RGB embebido por triángulo. No requiere texturas externas. Blender guarda también el atributo POINT `Heat` para edición.
- Claves raíz `pieces`: height (altura total), footprint (ancho X conservador de la base), dimensions y aboveGround. `forward="-Z"`.
- Clave raíz `plumes`: una boca para stack y cuatro para cluster. Las coordenadas locales Three se calculan con la misma transformación que las mallas, en el centro abierto de cada boca, y se imprimen al exportar. Spire y flange no producen penacho.

## Renders preparados

Cycles CPU por defecto, 40 muestras y denoise, 1600×900. Fondo #000203 sin iluminación ambiental; faro frío desde la cámara, nunca cenital. Kit a 70 u y FOV vertical 60°; oscuro con exactamente la misma cámara y faro apagado. Cercanía a 12 u del objetivo en la parte alta de stack, tres cuartos desde abajo: es un detalle, no un encuadre de la torre entera. Fondo con 14 instancias, terreno ondulado, cámara a 90 u y esfera de diámetro 4 u. Perfil lateral ortográfico con marcas y números cada 5 u, sin niebla.

Corrección ronda 1: el agua separa absorción (.008, color neutro .15) y dispersión (.00001, tinte frío, anisotropía .35). Se elimina el volumen Principled .028 que convertía el faro en una pantalla azul. El faro continúa físicamente en la cámara, con #cfe8ff, cono de 100° y borde suave; su potencia se calibra con distancia² y compensación aproximada del trayecto por agua. Fórmula de revisión: 65 × distancia² × exp(.012 × distancia) W; aproximadamente 10 810 W a 12 u, 737 766 W a 70 u y 1 550 374 W a 90 u. El perfil usa 100 × 75² = 562 500 W y ambos volúmenes a cero. Son potencias de una escena métrica de revisión sobre pigmentos casi negros, no valores para el faro del juego. Exposición y emisión permanecen iguales; oscuro mantiene potencia cero. La ejecución imprime REVIEW LIGHT para poder auditar los valores.

## Diferencias y decisiones respecto al brief

- Esta ronda entrega cambios en fuente y nota por la restricción explícita del sandbox. La v1 fue ejecutada por Claude; falta regenerar y revisar la iluminación corregida.
- Se usa RGB por vértice, como jardín de corales, en lugar de un escalar: permite naranja y verde en el mismo contrato. No se crean piezas emisivas independientes.
- JSON mediante `kit.export_parts`, sin `-juego.glb`, conforme al encargo específico que prevalece sobre la plantilla genérica.
- El agua Cycles usa absorción .008 y dispersión .00001 para revisión legible; no pretende equivalencia numérica con la niebla exponencial .028–.032 del juego. Se aumenta la potencia métrica del faro respecto a v1 para revelar roca oscura a estas distancias; falta confirmar visualmente el equilibrio. El atlas de emisión aproxima la interpolación RGB con teselas de 8×8 píxeles; el JSON conserva los valores originales.
- No se incluyen penachos de partículas en los renders: el kit entrega sus anclajes al sistema del juego. Se juzgará el calor por las bocas; el aspecto del penacho queda para integración.
- No se añade la alfombra blanquecina opcional. La vida tenue se reserva a vetas y bordes inferiores de las repisas.

## Revisión propia de v1 y pendientes

- Kit y fondo: el velo azul domina y aplana las siluetas. La esfera de escala no se distingue; no se puede aprobar la sensación de tamaño.
- Chimenea: únicamente se distinguen fragmentos de brasa. La roca, costras y boca abierta no son evaluables.
- Perfil: incluso sin niebla la roca casi desaparece. Esto confirma que reducir la niebla por sí solo no basta: también se corrige el faro.
- Oscuro: emisión localizada y fondo negro, sin piezas enteras encendidas; el calor se ve como arcos pequeños. Su lectura como fuego submarino sigue pendiente, no se aumenta arbitrariamente la emisión para compensar el problema de iluminación.
- Se conserva la geometría: estos renders no aportan evidencia suficiente para retocar formas. Bases, porosidad, uniones de costras, espolón roto y boca profunda se juzgarán con los renders corregidos.

Claude debe regenerar los cinco renders. Pendientes: visibilidad sin lavado azul, escala de la esfera, detalle mineral cercano y equilibrio de las brasas. Esta es la primera de un máximo de dos rondas de corrección. No se ejecutó bpy en el sandbox.
