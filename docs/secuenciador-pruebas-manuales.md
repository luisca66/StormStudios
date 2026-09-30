# Guía de Pruebas Manuales y Lista de Aceptación: Secuenciador Musical

Esta guía define el protocolo de pruebas manuales y checklist de criterios de aceptación para evaluar las funcionalidades del secuenciador musical en entornos locales y de escritorio/móvil. Está redactada como una lista de verificación por ejecutar.

V4.0: `/es/sequencer/v4` y `/en/sequencer/v4`. V3 conserva `/es/sequencer` y `/en/sequencer` para los cuatro videos existentes.

- [ ] Escribir notas con clic en pentagrama; arrastrar su altura; añadir acorde con Ctrl/Cmd+clic; borrar con clic derecho y con Borrar; deshacer cada operación.
- [ ] Escribir en Piano Roll, mover en altura y tiempo y cambiar duración desde el extremo derecho.
- [ ] Elegir SATB y comprobar las cuatro voces juntas, con pulsos alineados.
- [ ] Vista continua: una línea horizontal con seguimiento de reproducción.
- [ ] Vista por páginas: una sola página visible; anterior/siguiente; avance automático al reproducir; Detener conserva la página alcanzada.
- [ ] Abrir v3 desde su URL original y usar el enlace a v4 sin modificar los proyectos antiguos.

---

## 1. Controles Principales del Flujo de Trabajo (Computer-Use Workflow)

- [ ] **Transport Bar (Barra de Transporte):**
  - [ ] Verificar botón **Play / Reproducir**: inicia la reproducción fluida desde el cursor/cabezal actual.
  - Pausa con reanudación: pendiente de una siguiente entrega; esta versión ofrece Reproducir y Detener.
  - [ ] Verificar botón **Stop / Detener**: detiene el audio y retira el indicador de reproducción; el cursor de escritura conserva su posición.
  - [ ] Verificar control de **Tempo (BPM)**: permite cambiar el tempo; la edición detiene la toma y se aplica al volver a reproducir.
  - [ ] Verificar control de **Master Volume**: atenúa o incrementa la ganancia global sin saturación ni clicks digitales.

- [ ] **Editor de Partitura / Texto:**
  - [ ] Localizar el área de texto o panel de entrada textual.
  - [ ] Pegar un ejemplo musical desde `SEQUENCER_EXAMPLES`.
  - [ ] Presionar botón **Validar / Aplicar (Parse / Apply)**:
    - [ ] La partitura visual y los eventos de voz se actualizan correctamente.
    - [ ] Los errores de sintaxis, traslapes y notas que no caben se reportan por línea. Los compases incompletos se completan visualmente con silencios y sí se admiten.

---

## 2. Inspector de Eventos (Event Inspector)

- [ ] **Navegación por Voz y Compás:**
  - [ ] Filtrar o seleccionar una voz específica (`melody`, `soprano`, `alto`, `tenor`, `bass`).
  - [ ] Seleccionar compás específico (Compás 1, Compás 2, etc.).
- [ ] **Edición de Propiedades de Nota / Silencio:**
  - [ ] Seleccionar un evento en el inspector o en la cuadrícula.
  - [ ] Modificar tono/alturas (ej. cambiar `C4` a `D4` o añadir acordes `[C4 E4 G4]`).
  - [ ] Modificar duración (redonda, blanca, negra, corchea, semicorchea, fusa).
  - [ ] Alternar modificadores: **Puntillo (dotted)** y **Tresillo (triplet)**.
  - [ ] Alternar ligadura (**tie**).
  - [ ] Convertir evento en silencio (`pitches: []`) y confirmar que se represente como silencio.

---

## 3. Deshacer / Rehacer y Persistencia (Undo / Redo / Storage)

- [ ] **Historial de Edición:**
  - [ ] Realizar una modificación de nota y presionar **Undo / Deshacer** (`Ctrl+Z` / Botón Undo): el cambio se revierte.
  - [ ] Presionar **Redo / Rehacer** (`Ctrl+Y` o `Ctrl+Shift+Z` / Botón Redo): el cambio vuelve a aplicarse.
- [ ] **Guardado y Recarga:**
  - [ ] Guardar proyecto en almacenamiento local (**Save**).
  - [ ] Recargar la página en el navegador (`F5` / `Ctrl+R`).
  - [ ] Verificar que el proyecto actual y las configuraciones no se pierdan.

---

## 4. Importación y Exportación (JSON, MIDI y Presentación)

- [ ] **Importación / Exportación JSON:**
  - [ ] Exportar partitura como archivo `.json`: verificar estructura conforme al modelo `Score`.
  - [ ] Importar un archivo `.json` previamente exportado: los compases, voces y eventos se cargan fielmente.
- [ ] **Exportación MIDI:**
  - [ ] Descargar archivo `.mid`: validar que contenga las pistas por voz y las notas/tiempos correctos en un reproductor o DAW externo.
- [ ] **Modos de Presentación de Escena:**
  - [ ] Alternar relación de aspecto a **16:9** (pantalla horizontal / desktop).
  - [ ] Alternar relación de aspecto a **9:16** (formato vertical / mobile / reels).
  - [ ] Probar modo de enfoque/resaltado por voz (`highlightVoice`: voz activa o `all`).
- [ ] **Exportación Gráfica y de Audio (si está implementada):**
  - [ ] Exportar captura como **SVG**: comprobar legibilidad de vectores de partitura.
  - [ ] Exportar imagen como **PNG**: comprobar renderizado nítido de la escena.
  - [ ] Exportar render de audio a **WAV**: verificar que el archivo generado contenga la pista completa sin truncamiento.

---

## 5. Pruebas Críticas de Resiliencia y Casos Extremos

- [ ] **Protección de Proyectos Antiguos (Old Projects Not Lost):**
  - [ ] Abrir proyectos creados en versiones o sesiones previas.
  - [ ] Comprobar que no se sobreescriban automáticamente ni se pierdan datos por cambios de esquema.
- [ ] **Detención Durante la Carga (Stop During Loading):**
  - [ ] Iniciar la carga o reproducción mientras los sintetizadores/muestras de sonido aún se están inicializando.
  - [ ] Presionar inmediatamente **Stop**: el sistema no debe congelarse, producir bucles infinitos de audio ni lanzar excepciones no controladas.
- [ ] **Aviso de Samples Faltantes (Missing Sample Warning):**
  - [ ] Desconectar la red o configurar un instrumento con un sample inaccesible.
  - [ ] Verificar que la UI muestre una advertencia clara no intrusiva (fallback a sintetizador por defecto o aviso visual de recurso faltante).
- [ ] **Accesibilidad por Teclado:**
  - [ ] Navegar por todos los controles principales usando únicamente `Tab`, `Shift+Tab`, `Enter` y barra espaciadora (`Space` para Play/Stop).
  - [ ] El foco visual (`focus-visible`) debe ser claramente distinguible en todos los elementos interactivos.
- [ ] **Dimensiones Táctiles (Touch Target Sizes):**
  - [ ] Evaluar en modo emulador táctil que botones, selectores y controles tengan al menos un tamaño objetivo mínimo recomendado (44x44 px o 48x48 px).
- [ ] **Pantallas Estrechas y Adaptabilidad Móvil (Narrow Screens):**
  - [ ] Redimensionar la ventana a anchos reducidos (320px - 375px).
  - [ ] Verificar que no existan desbordamientos horizontales inesperados (`overflow-x`) en la barra de herramientas principal y que los menús se colapsen adecuadamente.
- [ ] **Compatibilidad MIDI Maestro Virtual:**
  - [ ] Exportar MIDI y abrir el archivo en el Maestro Virtual del sitio.
  - [ ] Comprobar alturas, grafías SP:, compás y voces SATB. Entrada MIDI de hardware y Clock/Sync están pendientes.
