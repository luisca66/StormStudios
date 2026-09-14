# ENTREGA — <Nombre del modelo> · <Juego>

> La escribe **Astra** al terminar el modelado. Breve: el integrador la usa en lugar de leer el script.

## Estado

- Versión / ronda: <v1, ronda 1>
- Fecha: <AAAA-MM-DD>
- Lista para: <revisión de Luis / integración>

## Archivos

| Archivo | Contenido |
|---|---|
| `modelar-<modelo>.py` | fuente reproducible (regenera todo lo de abajo) |
| `<modelo>.blend` | escena editable |
| `<modelo>.glb` | modelo portable (con animación de muestra si aplica) |
| `<modelo>.json` | geometría para el juego (`kit.export_parts`) |
| `render-juego.png`, `render-perfil.png`, `render-detalle.png` | revisión |

Regenerar (desde la carpeta del modelo):

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-<modelo>.py
```

## Datos técnicos

| Dato | Valor |
|---|---|
| Tamaño real (largo × alto × ancho, u) | <…> |
| Origen | <…> |
| Frente | <−Z / +Z en espacio Three> |
| Triángulos totales | <…> |
| Mallas exportadas | <…> |
| Peso del JSON | <… kB> |

## Partes

| Objeto | `part` | `segment` | Pivote (Three) | Material | Notas de animación |
|---|---|---|---|---|---|
| <…> | <…> | <…> | <x, y, z> | <…> | <eje y amplitud sugeridos> |

## Materiales

| Material | Color (hex) | Metal / rugosidad | Emisión | Alfa | Qué debe tener en cuenta el juego |
|---|---|---|---|---|---|
| <…> | <…> | <…> | <…> | <…> | <p. ej. teñir con la familia; DoubleSide> |

## Diferencias con el brief

<Qué no se cumplió o se decidió distinto, y por qué. "Ninguna" si aplica.>

## Sugerencias para integrar

<Animaciones idle, velocidades, qué partes pulsar, riesgos de transparencia u orden de dibujo.>
