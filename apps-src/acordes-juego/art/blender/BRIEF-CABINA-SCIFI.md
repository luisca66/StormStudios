# Cabina Batisfera — brief de implementación para Terra

> **Estado (2026-09-13):** concepto v1 aprobado por Luis e implementado en local — ver la sección «Cabina sci-fi» de README.md.

Luis aprobó implementar una cabina submarina con aire sci-fi usando la imagen adjunta como referencia. Implementar ahora, únicamente en local. No publicar, push, deploy ni copiar builds a public/apps. Esta tarea original lleva diseño; Terra realiza modelado, integración y pruebas.

## Dirección visual

Inspeccionar `cabina-scifi-referencia.png` antes de modelar. Tomar sus marcos estructurales oscuros, consolas inclinadas, superficies segmentadas y luces cian contenidas. Adaptar a exploración submarina desde el asiento del piloto: no poner asientos delante de la cámara ni reproducir el espacio exterior de la referencia.

- Silueta: ventanal central panorámico de esquinas achaflanadas, con ventanas laterales sugeridas y dos pilares laterales. Sustituir el aro y las diagonales que actualmente cruzan la pantalla.
- Composición: mantener libre aproximadamente el 65–70% central de la vista; techo delgado en el 10% superior, consolas en las esquinas inferiores, instrumental en los márgenes. Ninguna barra debe cruzar el objetivo del jugador.
- Materiales: metal azul petróleo #142B35, grafito #242C32, acero satinado #65747A, goma #101619. Emisivos cian #63DCE5, con pocos indicadores ámbar #E9B66B. Evitar saturar el interior de luces y mantener las criaturas como foco.
- Modelado: paneles con biseles, uniones, tornillería discreta, soportes, pequeñas rejillas y cables sujetos a los pilares. Detalle cerca del instrumental y silueta limpia alrededor del cristal.
- Iluminación: tiras cian empotradas en los laterales; iluminación cálida muy tenue sobre mandos. Cristal prácticamente transparente con reflejo sutil solo en los bordes. No teñir el agua ni ocultar la medusa y los peces.
- Instrumental: integrar visualmente el sonar a la izquierda y profundidad/puntos/capturas a la derecha. Conservar datos y botones HTML reales y accesibles, con la tipografía existente; no hornear texto diminuto en el modelo ni añadir botones ficticios. Mantener abortar, respuestas y controles táctiles visibles.
- Movimiento: cabina anclada a la cámara, estable. Sin balanceo adicional, parpadeo decorativo ni cambios de controles.

## Alcance técnico

Reutilizar el flujo real de bpy documentado en README.md y PRISMA.md de esta carpeta. Fuente principal con los modelos SIN COMMIT: `C:\Users\Luis\Documents\Claude Cowork\nuevo_website\storm-studios\StormStudios`. Si tu worktree no tiene los cambios, lee la fuente absoluta e incorpora solo lo necesario; no elimines ni sobrescribas otros cambios de Luis.

Python 3.11 y módulo Blender 4.5.3 LTS: instalación propia en `C:\Users\Luis\blender-bpy\`; ejecutar desde `apps-src/acordes-juego` con `powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 art\blender\modelar-cabina.py`. No descargar Blender. Crear `modelar-cabina.py`, exportar `.blend`, `.glb`, render Cycles y geometría evaluada para Three.js, siguiendo los scripts existentes. Las piezas visibles de la cabina se modelan en Blender, no con primitivas de Three.js.

Revisar primero `src/3d/cockpit.ts`, `src/3d/renderer.ts`, `src/ui/hud.ts`, `src/style.css`, `src/bootstrap.ts` y los cargadores Blender existentes. La cabina actual combina cristal 3D con `.bubble-vignette` y overlays; evitar que el marco viejo se dibuje encima del nuevo. No rediseñar agua, criaturas, reglas pedagógicas ni audio en esta entrega.

Objetivos orientativos: menos de 60 mil triángulos y 20 llamadas de dibujo añadidas, materiales agrupados y modelo descargado una sola vez. Ajustar encuadre según aspecto: evitar que un marco fijo corte la vista en teléfono o deje huecos en panorámico. Liberar los recursos correspondientes. El servidor fuente usa 127.0.0.1:5183; probar tu worktree en otro puerto libre, sin detenerlo.

## Entrega y aceptación

1. Revisar el render y corregir defectos evidentes antes de integrar.
2. Probar desde la posición real del piloto con medusa y cardumen visibles, sin barras superpuestas ni recorte de la cabina por la cámara.
3. Comprobar sonar, profundidad, selección de criatura, respuestas, pausa y controles táctiles; verificar un formato de escritorio y uno estrecho con dimensiones reales.
4. Ejecutar build y QA propios de Batisfera, sin auditorías generales repetidas. Reportar errores o limitaciones concretas y rendimiento observado con su contexto.
5. Entregar `.blend`, `.glb`, render, captura dentro del juego y enlace localhost. Resumen corto de archivos cambiados y validación. No publicar.

Ante una decisión menor, seguir este brief y continuar. Si surge una incompatibilidad que obligue a cambiar la dirección artística o el comportamiento, explicarla a Luis. No cambiar de modelo ni delegar automáticamente.

## Propuesta visual v1
Ver cabina-scifi-concepto-v1.png: propuesta visual generada bajo dirección de Astra, pendiente de revisión de Luis. Es concept art, no un render del modelo implementado. Esta composición concreta guía el marco octagonal panorámico, las consolas bajas inclinadas y las luces cian/ámbar. Priorizar apertura central y proporciones sobre detalles decorativos. El agua, arrecifes y animales de la ilustración son contexto: conservar los modelos existentes; el entorno se trabaja en otra fase. Los números y respuestas de la imagen son ilustrativos: implementar datos y opciones dinámicos del juego, incluida la racha y otros estados existentes. No fijar siempre dos respuestas. No usar la imagen como sustituto plano del modelado Blender.
