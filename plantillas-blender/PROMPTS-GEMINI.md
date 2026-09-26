# Prompts para Gemini (pegar tal cual)

Claude te da cada prompt ya rellenado. Si lo rellenas tú, cambia solo lo que está entre `<…>`.

## A. Encargo nuevo

```text
Hola Gemini. Vas a modelar en Blender (bpy) una pieza simple para un juego de Storm Studios. Claude dirige el proyecto; tú solo modelas y entregas.

Proyecto: C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios
Tu carpeta (la ÚNICA donde puedes escribir): apps-src\<juego>\art\blender\<modelo>\

Lee, en este orden y nada más:
1. plantillas-blender\INSTRUCCIONES-GEMINI.md — reglas, plantilla del script, exportación y revisión.
2. apps-src\<juego>\art\blender\<modelo>\BRIEF-GEMINI.md — el encargo con medidas, receta y colores.
3. plantillas-blender\ENTREGA.md — plantilla de tu ENTREGA.md.

Reglas clave (están completas en INSTRUCCIONES-GEMINI.md §1):
- Otros dos agentes trabajan al mismo tiempo en este proyecto. No escribas fuera de tu carpeta, no edites el brief y no uses git.
- El único comando que ejecutas es: powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 modelar-<modelo>.py (desde tu carpeta).
- Sigue la receta del brief paso a paso; si algo no se puede, anótalo en ENTREGA.md en lugar de inventar.

Al terminar, revisa con la lista de INSTRUCCIONES-GEMINI.md §6, detente y resume en 5 líneas: partes, triángulos, KB, diferencias con el brief y dudas.
```

## B. Ronda de corrección

```text
Hola Gemini. Ronda de corrección <1/2> de <modelo> (apps-src\<juego>\art\blender\<modelo>\).

Conserva todo lo demás igual: nombres de archivo, partes, pivotes, medidas y presupuesto. Cambia solo esto en modelar-<modelo>.py:
1. <cambio concreto, con el valor nuevo: «rock_b: escala Z de 0.35 a 0.5»>
2. <…>

Vuelve a ejecutar el script, revisa el render con INSTRUCCIONES-GEMINI.md §6, actualiza ENTREGA.md (versión y cambios) y detente con el resumen de 5 líneas. Mismas reglas de siempre: solo tu carpeta, sin git.
```
