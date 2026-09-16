# ENTREGA — Atlántida hundida · Walking AP Multi

## Estado

- Versión / ronda: v1, una ronda de corrección visual.
- Fecha: 2026-09-16.
- Lista para: revisión de Luis; integración a cargo del integrador.

## Archivos

| Archivo | Contenido |
|---|---|
| modelar-atlantida.py | Generador reproducible de toda la entrega |
| atlantida.blend | Escena editable, cámara de llegada y luces |
| atlantida.glb | Once mallas, pigmento conectado a materiales |
| atlantida.json | kit.export_parts; ejes Three, pivotes y colisionadores |
| render-juego.png, render-cerca.png, render-detalle.png, render-planta.png | Cycles, 40 muestras, denoise |

Regenerar desde esta carpeta:

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-atlantida.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Fondo × alto × ancho | 94.000 × 41.000 × 94.000 u |
| Huella | Diámetro envolvente 94.664 u |
| Origen | Centro de plataforma, pie en Y=0 |
| Frente | −Z Three |
| Triángulos | 39532 |
| Mallas | 11 |
| JSON | 3176.0 KiB |
| archCenter | (0,15,−3.8), arranque superior del vano principal |
| crystalCenter | (0,13,−15), pivote del corazón |
| crystalClearanceRadius | 6.1 u; giro completo y cabeceo ±0.2 comprobados en el script, por encima del altar |

`kit.export_parts` coloca los campos de meta en la raíz del JSON: `colliders`, `archCenter`, `crystalCenter`, `forward`. No existe un contenedor JSON llamado meta.

## Partes

| Objeto | part | segment | Pivote Three | Material | Eje Three | Amplitud | Velocidad |
|---|---|---|---|---|---|---|---|
| base | base | — | (0.0, 0.0, -0.0) | Arenisca marina | — | fija | 0 |
| palace | palace | — | (0.0, 0.0, -0.0) | Arenisca marina | — | fija | 0 |
| tower_0 | tower | 0 | (-28.0, 3.0, -22.0) | Arenisca marina | — | fija | 0 |
| tower_1 | tower | 1 | (28.0, 3.0, -22.0) | Arenisca marina | — | fija | 0 |
| tower_2 | tower | 2 | (-28.0, 3.0, 22.0) | Arenisca marina | — | fija | 0 |
| tower_3 | tower | 3 | (28.0, 3.0, 22.0) | Arenisca marina | — | fija | 0 |
| colonnade | colonnade | — | (0.0, 0.0, -0.0) | Arenisca marina | — | fija | 0 |
| crystal | crystal | — | (0.0, 13.0, -15.0) | Corazón luminoso | Y giro / X cabeceo | continuo / ±0.2 rad | 0.5 rad/s / 0.3 rad/s |
| glow | glow | — | (0.0, 0.0, -0.0) | Vetas y ventanas | emisión | 1.3 ±0.3 | 0.5 rad/s |
| gold | gold | — | (0.0, 0.0, -0.0) | Oro atlante satinado | — | fija | 0 |
| glass | glass | — | (0.0, 0.0, -0.0) | Cristal turquesa | — | fija | 0 |

## Materiales

| Material | Color por vértice | Metal / rugosidad | Emisión | Alfa |
|---|---|---|---|---|
| Arenisca | #dcd3bc, #cfc5ac, #b4a98f, #9fb6bd | 0 / 0.78 | 0 | 1 |
| Oro | #d9a441 | 0.6 / 0.3 | 0 | 1 |
| Vidrio | #5fd8e8 | 0 / 0.1 | 0 | 0.78 |
| Corazón | #7fe9ff | 0 / 0.1 | 1.6, #7fe9ff | 0.90 |
| Ventanas y vetas | #7fe9ff | 0 / 0.25 | 1.3, #7fe9ff | 1 |

## Colisión

Ocho cilindros en espacio Three, relativos al origen:

| x | z | radio | base | altura |
|---|---|---|---|---|
| 0 | 0 | 47.4 | 0 | 3.6 |
| 0 | 10 | 19 | 3 | 38 |
| -28 | -22 | 6.2 | 3 | 34 |
| 28 | -22 | 6.2 | 3 | 34 |
| -28 | 22 | 6.2 | 3 | 38 |
| 28 | 22 | 6.2 | 3 | 38 |
| -20 | -16 | 12 | 3 | 11.6 |
| 20 | -16 | 12 | 3 | 11.6 |

Los dos cilindros de galerías son conservadores y cierran sus vanos; la ciudad se recorre por fuera. El palacio incluye el arco de entrada. La plataforma usa un cilindro de 3.6 u de altura.

## Diferencias con el brief

La cúpula y los remates están en la parte adicional `glass`; las cornisas doradas en `gold`. Esto conserva vidrio translúcido y oro satinado también en JSON, cuyo exportador admite un solo material por parte. Las nueve partes requeridas permanecen; total once. La vista cercana usa cámara (49,28,−58), a unos 36 u del muro de la torre frontal en planta, en lugar de ≈25 u para conservar más contexto del conjunto. No hay animación horneada: los pivotes están preparados para la animación del juego. El desgaste asimétrico se concentra en fragmentos de escalera, fisuras y coral bajo; no se inclinan las torres.

## Sugerencias para integrar

Girar crystal.rotation.y=t*0.5 y crystal.rotation.x=sin(t*0.3)*0.2. Modular glow.emissiveIntensity=1.3+sin(t*0.5)*0.3. Solo crystal y glow emiten. Mantener los colores de vértice y baseColor blanco; no teñir. Usar alpha del JSON en glass y crystal, con transparent=true y depthWrite=false si el orden de transparencia lo requiere. Oro y vidrio agrupan adornos de las cuatro torres: al retirar una torre, sus adornos permanecerían; conservar el conjunto completo o filtrar sus geometrías en la integración. El modelo no contiene suelo ajeno a la plataforma, agua, niebla ni luces exportadas en GLB. Los renders incluyen un bloom discreto de revisión.
