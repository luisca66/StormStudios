# ENTREGA — Barco hundido sobre repisa · Batisfera

## Estado
- Versión: v4. v1–v3 de Astra; v4 de Claude (sin tokens de Astra), pedida por Luis tras revisar v3.
- Fecha: 2026-09-16. Integrada en el juego por Claude.

## Archivos
| Archivo | Contenido |
|---|---|
| modelar-barco.py | Generador bpy reproducible |
| barco-hundido.blend | Cinco partes editables y escenario de revisión separado |
| barco-hundido.glb | Cinco mallas con pigmento por vértice conectado |
| barco-hundido.json | kit.export_parts, cinco partes y meta |
| render-juego.png | 70 m, FOV vertical 60°, 1600 × 900, niebla |
| render-cerca.png | 25 m, tres cuartos superior, 1600 × 900, niebla |
| render-perfil.png | 45 m, frente completo, 1600 × 900, sin niebla |
| render-detalle.png | Boquete y farol, 12 m, 1200 × 900, niebla |

Regenerar desde esta carpeta:
powershell -NoProfile -ExecutionPolicy Bypass -File C:/Users/Luis/blender-bpy/bpy-run.ps1 modelar-barco.py

## Datos técnicos
- **34,244 triángulos**, **5 mallas**.
- Conjunto: ancho X 48.000 × alto Y 24.632 × fondo Z 18.165 m.
- Barco: eslora nominal 36 m, paralelo a X; proa +X. Escora 18° hacia +Z, arrufo global 3° hacia proa.
- Repisa: ancho 48.000, fondo 17.881 m; superficie de apoyo y=0.
- Extremos verticales: y=-11.975…12.658 m.
- Origen=(0,0,0), apoyo del casco; Y arriba, −Z hacia el jugador, +Z hacia la pared.
- Trasera de repisa: z=sqrt(96²−x²)−84+2. Penetra 2 m en la pared curva de radio 96.
- JSON: 2323.0 KiB.

## Partes
| part | Triángulos | Pivote Three |
|---|---|---|
| ledge | 1418 | 0.000, 0.000, -0.000 |
| hull | 20348 | 0.000, 0.000, -0.000 |
| debris | 6572 | 0.000, 0.000, -0.000 |
| growth | 5762 | 0.000, 0.000, -0.000 |
| lamp | 144 | 14.112, 6.878, 0.493 |
Todas sin segment. ledge, hull, debris y growth: estáticas, amplitud 0 rad, velocidad 0 rad/s.
lamp: transformación fija; sugerencia de emisión 1.2+0.15·sin(2π·0.06·t), intervalo 1.05–1.35.
No añadir balanceo al barco ni a las algas fusionadas.

## Materiales
Un material por parte, blanco multiplicado por pigmento en JSON; GLB usa el atributo Pigment.
| Parte | Paleta | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| ledge | #0d151d a #293946, bandas de estratos | 0 / .95 | 0 | 1 |
| hull | #5b3a2a, #7a4a30, #4f5f5a, #6e2e25 | .08 / .88 | 0 | 1 |
| debris | Madera #62533a y hierro #4b3b2c | 0 / .94 | 0 | 1 |
| growth | #c9b56a, oliva #626b3b, rosa blanco #d3bab0 | 0 / .90 | 0 | 1 |
| lamp | #9fe8ff | 0 / .78 | 1.2, #9fe8ff | 1 |
Sin transparencias. Las ventanas y ojos de buey son superficies oscuras opacas; el boquete sí atraviesa la chapa.

## Meta
- bubbleVents = [[6.9112653732299805, 4.427319526672363, 1.2736200094223022], [-3.6585805416107178, 12.20057201385498, 4.11474084854126], [-8.262669563293457, 3.6066746711730957, 0.9018304347991943]]. Escotilla, boca de chimenea y junta de cubierta.
- lampCenter = [14.111766815185547, 6.8782758712768555, 0.4927904009819031]. Pivote del farol para luz o emisión pulsante.
- forward=-Z, wallRadius=96, wallCenter=(0,0,-84), shipLength=36, heelDegrees=18, bowRiseDegrees=3.
kit.export_parts escribe estos metadatos en la raíz del JSON, no en un objeto meta anidado.

## Cambios v4 (Claude)
- Casco con proa afilada y pie de roda curvo, bovedilla de popa, codaste y timón (antes: costados y fondo rectos, se leía como barcaza).
- Casco hundido 1.15 m en un montículo de sedimento (parte ledge): ya no flota sobre la repisa.
- Crecimiento rehecho: racimos de esponjas de tubo, anémonas con corona de 11 tentáculos y algas (antes: formas de jarra con asas).
- Cajas de tamaños y tonos distintos, inclinadas y medio enterradas.
- Pintura vieja con chorreones verticales de óxido en lugar de manchas de camuflaje.

## Diferencias con el brief
- Presupuesto: hasta 40 000 triángulos en lugar de 35 000 (decisión del integrador para escritorio).
- El bote y la cadena pertenecen a debris; toda la arquitectura y la jaula del farol a hull.
- La roca usa un acento #293946 para que los estratos se lean bajo luz azul; base azul negruzca.
- Cámara de descubrimiento: 70 m del objetivo, por el lado del centro del pozo; el eje exacto del pozo está a z=−84.
- Niebla de revisión: dispersión volumétrica 0.004; el juego aplicará su niebla exponencial propia.

## Revisión propia
Cuatro vistas Cycles, 32 muestras y denoise. Pared curva R96 y volumen solo en la colección de revisión;
no se exportan. Se revisaron silueta de vapor, profundidad del boquete, pigmento en manchas grandes,
espesor de chapa y crecimiento concentrado en las superficies superiores.
El script comprueba presupuesto, cantidad de partes y límites de repisa y altura.
