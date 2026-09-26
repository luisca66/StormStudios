# Prompts para Astra (pegar tal cual en Codex)

Claude te da cada prompt ya rellenado. Las reglas de trabajo viven en `INSTRUCCIONES-ASTRA.md`; el
prompt es corto a propósito: a Astra se le da la idea y el ambiente, no la receta
(`REPARTO-AGENTES.md`).

## A. Modelo nuevo

```text
Hola Astra. Te encargo <nombre del modelo> para <juego>, en Blender con bpy.

La idea: <dos o tres frases con la emoción y el papel de la pieza. Ej.: «el castillo de La Pradera es lo primero que ve un niño al entrar al juego: tiene que dar ganas de ir a explorarlo. Cuento ilustrado, piedra cálida, techos de colores, nada de fortaleza sombría.»>

Proyecto (checkout principal, sin worktree): C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios
Tu carpeta, la única donde escribes: apps-src\<juego>\art\blender\<carpeta-modelo>\

Lee plantillas-blender\INSTRUCCIONES-ASTRA.md y el BRIEF.md de tu carpeta. El brief solo fija lo que el juego necesita (tamaño, partes, presupuesto, paleta); lo demás lo decides tú. Si te sirve, mira cómo quedó <carpeta-referencia> en el mismo juego.

Hay otros dos agentes trabajando a la vez en el proyecto: no escribas fuera de tu carpeta, no toques el brief y no uses git ni npm. Al terminar, detente y resume: triángulos, partes, dimensiones y en qué te apartaste del brief.
```

## B. Ronda de corrección

```text
Hola Astra. Ronda <1/2> de <nombre del modelo> (apps-src\<juego>\art\blender\<carpeta-modelo>\).

Luis vio las capturas con la luz del juego. Lo que quiere:
- <cambio 1, en lenguaje de artista: «la torre del homenaje se pierde entre las otras; que domine»>
- <cambio 2>

Mantén nombres de archivo, partes, pivotes y presupuesto. Regenera todo con tu script, actualiza ENTREGA.md y detente con el resumen.
```
