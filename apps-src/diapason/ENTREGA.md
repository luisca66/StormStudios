# Entrega · Diapasón

App Vite + TypeScript, sin framework ni dependencias gráficas. Selector **Plana / Desde el guitarrista** persistente. La POV es el valor inicial. Español por defecto; inglés con `?lang=en`.

## Implementación

- Vista plana y motor pedagógico conservados de la referencia: afinación EADGBE, 78 posiciones (seis cuerdas, trastes 0–12), bolsa sin repeticiones, sostenidos/bemoles, Clásico y Time Attack de 5–20 segundos con tres strikes. Las muestras, nombres de archivo, caché y feedback siguen usando el R2 original.
- POV nueva en Canvas 2D: proyección de cámara, palisandro con veta longitudinal, canto de madera, trastes metálicos, cejuela, clavijero, fragmento de caja, inlays, graves entorchadas y agudas de nailon. Se dibuja al cambiar estado o tamaño, sin bucle de animación permanente; DPR limitado a 2.
- Dibujo, marcadores, botones accesibles y áreas de toque comparten coordenadas. Tocar una posición reproduce su muestra sin responder ni cambiar el ejercicio. Flechas recorren las posiciones; Enter reproduce. La marca dorada sigue siendo la pregunta; la blanca identifica la posición escuchada.
- Vista, notación, modo y duración guardados con try/catch. Se guarda el último marcador como resumen al recargar; no se reanuda una partida cronometrada interrumpida.
- Motor original en `src/engine.js` para reducir cambios de lógica; geometría, integración e idioma en TypeScript con comprobación estricta. Se corrigieron acciones de avance después del tercer strike, temporizadores de feedback al salir y conflicto entre Enter/Espacio y controles nativos.

## Geometría y fuentes

Escala de 650 mm; posición del traste n = `650 × (1 − 2^(−n/12))`. El traste 12 está a 325 mm. Cejuela de 52 mm y separación exterior de cuerdas de 43 mm:

- [Yamaha CG: especificaciones](https://europe.yamaha.com/en/musical-instruments/guitars-basses-amps/products/classical-nylon-guitars/cg-cgx/specs.html)
- [Córdoba C5: separación en la cejuela](https://cordobaguitars.com/iberia/c5)
- [StewMac: cálculo de escala](https://www.stewmac.com/video-and-ideas/online-resources/reference/how-do-i-calculate-a-fret-scale/)

Decisiones de modelado, no medidas universales: diapasón de 62 mm en el traste 12; separación entre cuerdas extrapolada a 57 mm en el puente; cámara a `(470, 230, 260)` mm mirando a `(160, 0, 0)`, desde el lado grave, unos 34° sobre el plano; giro del encuadre de +48° y orientación de cámara desde el canto grave. La perspectiva hace que los trastes se vean más separados cerca de la caja, aunque físicamente se acorten. Inlays de estudio conservados del original; no todas las guitarras clásicas los llevan. La escena es una ilustración procedural, no una fotografía ni réplica de un modelo concreto.

## Cómo probar

Desde esta carpeta, Node compatible con Vite 8 (22.12+):

```powershell
npm install
npm run dev
```

Abrir `http://127.0.0.1:5192/?lang=es` y después `?lang=en`.

1. Empezar Clásico. Identificar una nota, responder y avanzar. Cambiar de vista a mitad de pregunta: cuerda, traste y resultado deben conservarse.
2. En POV, tocar cuerdas graves/agudas y posiciones abiertas/12; escuchar la muestra y comprobar la marca blanca. Tab al mástil, flechas y Enter permiten explorar sin ratón.
3. Cambiar a bemoles. Recargar y comprobar vista/notación persistentes y resumen del marcador.
4. Time Attack a 5 segundos: dejar vencer tres preguntas; comprobar 3/3, fin de partida y reinicio.
5. En teléfono, desplazar horizontalmente el mástil. En vertical la escena conserva un ancho de estudio de 900 px, centra la pregunta automáticamente y admite zoom nativo del navegador; en horizontal se ajusta al ancho disponible. Revisar orientación vertical y horizontal.

```powershell
npm run build
node --experimental-strip-types scripts/check-geometry.mjs
```

Validado: TypeScript y build de producción con TypeScript 5.9.3 / Vite 8.3.0 disponibles en el workspace. Prueba geométrica: 78 centros, 156 puntos vecinos, límites del canvas, cuerda al aire, escala y separación aparente. Revisión en Chrome de ambas vistas, español/inglés, respuesta correcta y persistencia; Time Attack terminó en 3/3 con el botón de reintento, y reiniciar devolvió strikes y total a cero. Se inspeccionó visualmente la POV y se corrigió su encuadre. No se adjuntan capturas: los pasos anteriores reproducen las vistas.

Pendiente de integración: revisión táctil en un teléfono físico, comprobación auditiva en iOS y aprobación visual de Luis. No se ejecutó una instalación aislada de dependencias; se usaron las del workspace. No se midió rendimiento en otra laptop.

`npm run deploy` queda preparado con el copiador del proyecto de referencia, pero **no se ejecutó**, respetando la regla de no escribir en `public/` ni en el sitio Next.


## Ronda 2 · revisión POV

- Cámara y eje transversal corregidos: 6ª arriba y próxima al observador, 1ª abajo; canto e indicadores laterales en el lado grave. Coordenadas compartidas para dibujo, marcas, etiquetas y toques. Flecha arriba avanza hacia las graves; abajo hacia las agudas.
- Encuadre nuevo con margen desde la cejuela hasta el traste 12. Canvas proporcional al ancho disponible, sin mínimo de escritorio. Solo teléfono vertical de hasta 600 px conserva desplazamiento horizontal (escena de 900 px).
- Etiquetas fuera del clavijero, en columna 6→1 y conectadas a su cuerda. Texto de 14 px efectivos y separación mínima de 20 px entre líneas, incluso al reducir la escena.
- Graves de tres grosores diferenciados, núcleo metálico, reflejo y vueltas de entorchado. Nailon translúcido con grosor creciente 1ª→3ª y reflejos en sus bordes. Sombras proyectadas sobre el plano de madera para separar visualmente la cuerda del diapasón.

Validación de esta ronda: build y TypeScript correctos; prueba geométrica ampliada con orden vertical de todas las cuerdas en los 13 trastes, toques a cinco escalas, cejuela/traste 12 completos, separación de etiquetas y grosores. En Chrome, tamaños CSS medidos: 1024×768 (scrollWidth/clientWidth: 982/982), 1280×760 (1098/1098) y 844×390 horizontal (802/802), sin desbordamiento horizontal del mástil. Revisión visual de los dos tamaños de escritorio, toque de la 6ª en traste 12 y navegación con flecha abajo a la 5ª, conservando la pregunta. La emulación horizontal no sustituye la prueba táctil pendiente en teléfono físico.
