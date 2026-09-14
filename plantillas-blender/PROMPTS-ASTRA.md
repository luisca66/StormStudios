# Prompts para Astra (pegar tal cual en Codex)

Cambia solo lo que está entre `<…>`. Las reglas de trabajo viven en `INSTRUCCIONES-ASTRA.md`,
así que no hace falta repetirlas en el chat.

## A. Modelo nuevo

```text
Hola Astra. Vas a modelar en Blender <nombre del modelo> para <juego>. Trabajas solo como modeladora 3D; otro modelo hará la integración al juego.

Proyecto (checkout principal, no uses un worktree aislado):
C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios

Lee primero:
1. plantillas-blender\INSTRUCCIONES-ASTRA.md: tus reglas, la revisión propia antes de entregar y lo que debe traer la entrega.
2. apps-src\<juego>\art\blender\<carpeta-modelo>\BRIEF.md: el encargo.
3. plantillas-blender\ENTREGA.md: la plantilla de entrega.

Si necesitas más contexto, búscalo tú misma en el proyecto, empezando por la entrega integrada más reciente: apps-src\<juego>\art\blender\<carpeta-referencia>\. Consulta solo lo que te haga falta.

Todo va en apps-src\<juego>\art\blender\<carpeta-modelo>\: modelar-<modelo>.py, <modelo>.blend, <modelo>.glb, <modelo>.json (kit.export_parts), los renders que pide el brief y ENTREGA.md.

No modifiques nada fuera de esa carpeta ni ejecutes build, QA, deploy, commit o push. Al terminar, detente y resume: triángulos, partes, dimensiones y diferencias con el brief.
```

## B. Ronda de corrección

```text
Hola Astra. Ronda de corrección <1/2> de <nombre del modelo> (apps-src\<juego>\art\blender\<carpeta-modelo>\).

Mantén todo lo que ya cumple el brief: ejes, origen, partes, pivotes, presupuesto y nombres de archivo. Corrige solo esto:
- <cambio 1, concreto y visible en un render>
- <cambio 2>
- <cambio 3>

Sigue plantillas-blender\INSTRUCCIONES-ASTRA.md, en especial la revisión propia antes de entregar. Regenera todo con modelar-<modelo>.py y actualiza ENTREGA.md (versión, diferencias y valores de animación si cambiaron). Al terminar, detente y resume qué cambió, triángulos y partes.
```
