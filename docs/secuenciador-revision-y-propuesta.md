# Secuenciador: reparación y propuesta de renovación

Fecha: 30 de septiembre de 2026.

## Objetivo principal

Un editor musical profesional para escribir ejercicios de armonía y producir videos educativos, operable por una persona y por agentes con computer use. La primera medida de éxito será que un agente pueda escribir, verificar, corregir, guardar y preparar una escena sin arrastrar notas a coordenadas.

Este documento registra la auditoría inicial y su propuesta. La entrega local posterior ya implementa gran parte de esa propuesta: ver [estado del Studio](secuenciador-studio-local.md) para distinguir lo disponible de lo pendiente.

## Auditoría del editor actual

Entradas auditadas: public/tools/secuenciador.html y public/tools/sequencer.html, embebidas en /es/sequencer y /en/sequencer. Estas rutas conservan la v3 usada en cuatro videos; la nueva v4.0 se prepara por separado en /es/sequencer/v4 y /en/sequencer/v4. Los dos HTML anteriores duplican un motor JavaScript de unas 2.500 líneas. El HTML carga VexFlow 4.2.2 autoalojado; v4 usa el VexFlow 5 instalado. No conviene intercambiarlos sin comprobar compatibilidad.

### Audio y datos: reparaciones realizadas

| Hallazgo | Evidencia | Reparación |
|---|---|---|
| Se omitió la reparación de caché/CORS de septiembre | fetch de MP3 sin opciones; ver docs/cloudflare-audio.md | Revalidación con cache: no-cache |
| Descargas innecesarias y simultáneas | 5 instrumentos × 12 notas × 6 octavas al abrir | Carga bajo demanda; hasta 6 descargas concurrentes para la partitura |
| Rutas inexistentes | Auditoría GET con Range: 300 respuestas 206 y 60 respuestas 404 | Banco real C2–B6; muestras afinadas para notas fuera del banco |
| Peticiones duplicadas para la misma nota | Caché solo de buffers ya decodificados | Compartir la promesa en curso y reutilizar el buffer |
| Fallos silenciosos | Reproducción con oscilador sin explicación | Aviso bilingüe, diagnóstico en consola, reintento tras 10 segundos |
| Descarga lenta sin límite | fetch sin cancelación por tiempo | Timeout de 10 segundos |
| Play arranca después de Stop si había carga | Espera asíncrona sin comprobar cancelación | Cancelación lógica del arranque y de la cola pendiente |
| Preescucha suena después de soltar el mouse | Descarga pendiente sin comprobar fin de interacción | Invalidación de preescuchas antiguas |
| Cambiar de vista elimina notas | sanitizeNotesToPianoRollRange borra entradas fuera de D2–C6 | Rango dinámico que conserva las notas |

Los 60 archivos ausentes son toda la octava 1 de los cinco instrumentos. No se han subido ni modificado objetos en R2. Las notas exteriores usan una muestra del extremo del banco cambiando su velocidad: mantienen la altura correcta, aunque el timbre y la duración natural cambian. Para la renovación conviene ampliar el banco con muestras propias si esa región se usa con frecuencia.

Auditoría reproducible: sequencer-samples-audit.json contiene URL, estado HTTP, tipo y CORS para las 360 rutas. Se verificó con Origin https://www.stormstudios.com.mx. Los 300 éxitos devolvieron audio/mpeg y el origen CORS esperado. La revisión inicial también comprobó descargas parciales de los cinco instrumentos.

### Limitaciones que justifican la renovación

- Escritura basada en coordenadas de SVG; las notas no son controles accesibles con nombres musicales.
- No hay entrada secuencial por letras y duraciones, ni editor textual de ejercicios.
- La información seleccionada no se expone como un inspector de compás, voz, nota, octava y duración.
- El modelo y la reproducción procesan keys[0]: los acordes dentro de una misma voz requieren ampliar el modelo, no solo un botón.
- La rejilla de 4 ticks por negra no permite representar tresillos y otras divisiones con precisión.
- Guardado JSON manual; no hay recuperación automática. El formato no tiene versión ni validación robusta al importar.
- El proyecto guardado omite tempo y volumen. Debe convertirse en un documento completo y reproducible.
- El MIDI conserva grafía SP: y armaduras, que utiliza el Maestro Virtual. Hay que preservar esa compatibilidad. El exportador actual no escribe cambios de compás.
- Las vistas siguen un lienzo horizontal largo; falta presentación por sistemas y páginas para videos.
- No hay un flujo de escenas con títulos, anotaciones, foco visual y tiempos.
- La interfaz mezcla español e inglés, muestra v3.0 y una insignia v2.0, y usa botones de iconos con nombres accesibles incompletos.

## Prioridades de construcción

### 1. Escritura precisa y accesible

Entregar primero un recorrido completo: crear proyecto → escribir un ejemplo de 4 compases → corregir una nota → reproducir → guardar → volver a abrir sin pérdidas.

- Cursor visible que anuncie voz, compás y posición rítmica.
- Entrada A–G y alternativa Do–Si; octava explícita, duraciones, silencios, puntillos y ligaduras.
- Flechas para navegar, Enter para insertar, Escape para salir; atajos documentados y sin interferir con campos de texto.
- Inspector editable: altura, grafía, octava, duración, voz, compás y posición.
- Selección múltiple, copiar/pegar, duplicar compás, transponer conservando grafía, deshacer/rehacer.
- Acordes y voces independientes; separación explícita entre ligadura de prolongación y de expresión.
- Modelo rítmico con fracciones exactas: tresillos, anacrusas y cambios de compás.
- Autoguardado local, documento con versión e importación validada antes de modificar el proyecto.

### 2. Automatización por agentes, desde la primera entrega

No es un complemento para el final: cada función anterior debe ser accesible desde su implementación.

- Botones y campos HTML reales con etiquetas, roles y foco predecibles.
- Nombres estables y únicos: Reproducir, Detener, Insertar nota, Compás, Posición, Voz, Duración.
- Lista o tabla accesible sincronizada con el pentagrama: por ejemplo, “Compás 2, soprano, pulso 3, Fa sostenido 4, negra”.
- Selección que se pueda comprobar visualmente y mediante estado accesible; no depender solo del color.
- Estados explícitos: cargando sonidos, listo, reproduciendo, detenido, cambios guardados y errores.
- Entrada por texto con vista previa, validación y botón Aplicar. Gramática documentada y determinista; no interpretar libremente una petición ambigua.
- Importación/exportación JSON del documento completo para preparar lotes de ejemplos.
- Como segunda vía, comandos estructurados para herramientas o WebMCP, sujetos a disponibilidad del cliente. La interfaz visible seguirá siendo suficiente para computer use.

Ejemplo ilustrativo de entrada propuesta (la gramática aún no está implementada):

    voz soprano
    compas 1
    C4 negra; D4 negra; E4 negra; F4 negra
    compas 2
    G4 blanca; E4 blanca

El agente debe ver una previsualización de dos compases completos y un resultado “6 notas, 0 errores”. Si hay un error, se informa línea y causa sin alterar el documento.

### 3. Producción de videos educativos

- Modo Presentación: partitura protagonista, sin barras de edición ni desplazamientos inesperados.
- Escenas nombradas: ejemplo, explicación, corrección y solución.
- Formatos 16:9 y 9:16, márgenes seguros, tamaños de texto reproducibles.
- Foco en una voz, compás o nota; resaltados y etiquetas que también usen texto y formas.
- Secuencia temporal de anotaciones; cuenta de entrada y controles de inicio/fin por compás.
- Cámara visual fija o seguimiento configurable; evitar que el scroll cambie el encuadre durante la toma.
- Exportación SVG/PNG de escenas y WAV de audio como primera entrega audiovisual.
- Exportación de video como etapa posterior: validar codecs, sincronización, resolución y duración antes de prometer compatibilidad universal.
- Plantillas reutilizables para escalas, intervalos, acordes, cadencias y SATB.

### 4. Profundidad musical y trabajo profesional

- Mezclador por voz: instrumento, volumen, mute y solo; metrónomo, loop y rango de reproducción.
- Importación/exportación MusicXML, además de MIDI y JSON.
- Articulaciones, dinámicas, cifrado romano, bajo cifrado, texto y disposición por sistemas.
- Vista de piano para acordes y edición rítmica; pentagrama para grafía y lectura.
- Evaluaciones del Maestro Virtual que apunten a notas y compases, conservando la grafía enarmónica.
- Soporte MIDI de teclado tras validar compatibilidad y permisos en los navegadores objetivo.

## Diseño propuesto

La interfaz actual dedica gran parte de la primera pantalla a tres tarjetas altas con pocos campos. La escritura y Play/Stop quedan separados por scroll. El tamaño de etiquetas de 8–10 px dificulta lectura y reconocimiento.

Propuesta: una barra superior compacta para proyecto, guardado y transporte; herramientas de escritura junto a la partitura; inspector lateral plegable; lista de eventos y entrada textual opcionales.

    Proyecto / Guardado       Tempo / Play / Stop       Presentar / Exportar
    ----------------------------------------------------------------------
    Duración · Silencio · Alteración · Ligadura · Voz
    ----------------------------------------------------------------------
    Partitura o Piano Roll (área principal)             Inspector de nota
                                                       Compás / Posición
                                                       Altura / Duración
    ----------------------------------------------------------------------
    Texto musical / Lista accesible / Escenas (panel plegable)

Mantener la identidad oscura de Storm con una partitura clara, bordes discretos, menos degradados y sombras, un color principal de acción y colores consistentes para voces. Texto general de 14–16 px, botones con texto o nombre accesible, foco claramente visible y controles grandes para interacción precisa. En Presentación, la partitura ocupa el encuadre y las anotaciones se integran con la identidad del curso.

## Herramientas: decisión recomendada

Las bibliotecas de notación resuelven grabado o representación; la experiencia de escritura, el modelo de proyecto y la automatización deben diseñarse explícitamente.

| Opción | Aporta | Encaje |
|---|---|---|
| VexFlow | Grabado musical programable | Primera opción para el editor propio; ya está en el proyecto |
| abcjs | Texto ABC a partitura SVG | Prototipo rápido de entrada textual; validar los ejercicios de armonía antes de adoptarlo |
| OpenSheetMusicDisplay | Carga y representación de MusicXML | Útil para documentos e intercambio; no sustituye por sí solo la capa de edición |
| Verovio | Grabado con entrada de formatos musicales y salida SVG/MIDI | Candidato para partituras complejas y presentación; requiere prueba técnica |

Fuentes oficiales consultadas:

- https://vexflow.com/
- https://docs.abcjs.net/visual/overview
- https://github.com/opensheetmusicdisplay/opensheetmusicdisplay/wiki/Getting-Started
- https://book.verovio.org/verovio-reference-book.pdf

Recomendación: motor musical tipado y compartido, editor en React, renderizador intercambiable y audio separado. Un documento alimenta escritura, pentagrama, piano roll, reproducción, exportaciones y escenas. Unificar español/inglés en el mismo código. Probar VexFlow y Verovio con los mismos ejemplos antes de elegir definitivamente el grabado.

Prueba técnica de elección: SATB, acordes, dobles alteraciones, ligaduras entre compases, tresillos, cambios de clave/armadura/compás, anotaciones y encuadre 1080p. Evaluar legibilidad, tamaño del paquete, tiempo de carga y facilidad de seleccionar notas por ID.

## Criterios para aprobar la primera versión

1. Un agente escribe un ejercicio de cuatro compases con notas, silencios y alteraciones usando controles semánticos y teclado.
2. Puede corregir la nota de una voz en un compás específico y verificar el resultado sin coordenadas.
3. Puede pegar un bloque textual, revisar errores y aplicar la operación como una sola acción de deshacer.
4. Guardar y abrir conserva tempo, notas, grafías, voces, compases, cifrados y escenas.
5. Alternar vistas no modifica ni pierde contenido.
6. Los MIDI de ejercicios siguen siendo aceptados por el Maestro Virtual, incluidos SP: y canales SATB.
7. Stop durante la carga nunca inicia reproducción posteriormente; los sonidos faltantes se explican.
8. Puede preparar una escena 16:9, resaltar un compás, reproducirlo y producir la misma presentación al repetir la toma.

## Validación de la reparación

18 pruebas de regresión ejecutan el JavaScript real de las dos páginas: caché, revalidación, peticiones simultáneas, timeout, recuperación de errores, Stop durante carga, preescucha cancelada, límite de concurrencia, enarmonías, afinación exterior al banco y conservación al ampliar Piano Roll.

Build de producción y TypeScript completados. La interacción local permitió insertar una nota y operar Play/Stop; la petición de audio desde localhost falló con Failed to fetch y se mostró el aviso esperado. Esto no confirma escucha real en producción. Falta probar la reparación desplegada en una vista previa con origen permitido por R2, incluyendo una caché previa contaminada, reproducción SATB y una exportación que se cargue en el Maestro Virtual.

Los cambios están en el workspace y no se han publicado. Después de esta auditoría se implementó el Studio local descrito en [la entrega](secuenciador-studio-local.md): 322 pruebas unitarias pasan (3 todo previos), lint/TypeScript/build completos y 11 pruebas del navegador pasan, incluida decodificación/WAV con muestras R2 reales de los cinco instrumentos. La producción automatizada de video sigue siendo la siguiente prioridad.
