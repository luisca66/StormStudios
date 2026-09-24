# Revisión de las fuentes de las lecciones

18 de septiembre de 2026. Fuente de producción: `H:\Website Clases`. Revisión documental; no aprobación para publicar.

## Conclusión

El guion nuevo de lección 4 se redactó sin consultar un antecedente directo que ya existía. Debe adaptarse la lección histórica de acordes del modo mayor a Storm Sequencer, conservando su tarea completa y su continuidad con acordes menores y preparación del cuarteto vocal. El recorte a Do, Sol y Fa del borrador anterior no corresponde a la tarea original.

## Secuencia reconstruida

| Orden actual o propuesto | Contenido | Fuente principal en H:\Website Clases |
|---|---|---|
| Propedéutico | Notas, rítmica, intervalos y secuenciador | Guiones de `Propedéutico`; documentación del secuenciador |
| 1 actual | Escalas mayores | `01 Lección 1/Guion_Leccion_1_Claude.docx` y `Guión Lección 1.odt` |
| 2 actual | Modos | `02 Lección 2/Transcripción Lección 2.odt` |
| 3 actual | Escalas menores | `03 Lección 3/Transcripción Lección 3.odt` |
| 4 a adaptar | Acordes de quinta del modo mayor | `03 Lección 3/Transcripción Lección 4.odt` y `Cubase/Lección 3 Acordes del modo mayor.pdf` |
| 5 propuesta | Acordes de las escalas menores | `04 Lección 4/Transcripción lección 4.odt` y `Cubase/Partitura tarea Lección 4.pdf` |
| 6 propuesta | Acordes aislados en cuarteto vocal | `05 Lección 5/Cubase/03_Master_voz_spa.docx` |

La numeración 5–6 es una reconciliación propuesta, no una decisión ya aprobada. Las carpetas mezclan generaciones: la transcripción de menores dentro de `03 Lección 3` es de junio de 2026, mientras la transcripción de acordes mayores del mismo directorio es de mayo de 2025 y todavía se presenta verbalmente como lección tres. No renombrar originales por deducción.

## Qué debe recuperar la lección 4

- Construcción de tríadas superponiendo terceras sobre cada grado, respetando las notas y la armadura de la escala.
- Explicación de fundamental, tercera y quinta; clasificación de las cuatro especies. Aclarar que en mayor natural aparecen mayor, menor y disminuido; el aumentado se desarrollará con las escalas menores.
- Cifrado de grados con números romanos y clasificación M, m, dis: I mayor, II menor, III menor, IV mayor, V mayor, VI menor, VII disminuido.
- Ocho acordes por escala: I–II–III–IV–V–VI–VII–I, incluyendo el cierre en la octava. Valores de cuarto, dos compases de 4/4 por escala.
- Quince escalas: Do, Sol, Re, La, Mi, Si, Fa♯, Do♯; después Fa, Si♭, Mi♭, La♭, Re♭, Sol♭, Do♭. No repetir Do entre ambos recorridos.
- Total histórico: 120 acordes. Lo corroboran la partitura completa de una página y la lista de referencia del verificador `03 Lección 3/verificador_leccion3.py`.
- Ortografía y registros: el verificador histórico compara alturas MIDI exactas. La adaptación debe fijar el registro esperado y conservar la grafía mediante los metadatos de Storm Sequencer; no trasladar sin revisión el supuesto de 480 ticks a archivos con otra resolución.
- Demostración narrada mientras Luis escribe y reproduce en Storm Sequencer; sustituir las operaciones de Cubase por las funciones reales del secuenciador actual.
- Cierre que prepara los acordes de las escalas menores. No anticipar una tarea de corales ni prometer un validador que todavía no está integrado.

## Trabajo posterior que ya existe

**Acordes menores:** tríadas de menor armónica ascendente y menor melódica ascendente/descendente, en 15 escalas. El verificador histórico contiene 345 acordes (23 por escala) y un patrón de 22 cuartos más una mitad final por escala. La partitura incluye los cifrados melódicos y de subtónica. Hay MIDI de referencia y con errores.

**Cuarteto vocal:** 12 acordes aislados en enteras: tres mayores, tres menores, tres aumentados y tres disminuidos; un estado fundamental y dos inversiones por tipo. Se trabajan tesituras, separaciones, duplicaciones y supresiones. La transcripción dice explícitamente que los acordes de esta tarea no están enlazados y que los enlaces se verán después. Hay verificador, MIDI de referencia, MIDI con errores, proyectos de producción y videos ES/EN inventariados.

## Diferencias que resolver antes de publicar

1. El sitio actual configura la lección 4 como coral de 4–8 acordes con primera inversión y cadencia; la fuente de producción pide tríadas sobre escalas. La lección 5 oculta del sitio trata segunda inversión cadencial, no acordes menores. Ambas requieren reconciliación con Luis antes de implementarlas.
2. En el material SATB histórico, la voz transcrita permite separaciones de 12ª, 10ª y 15ª; `05 Lección 5/verificador_leccion5.py` fija 8ª, 8ª y 12ª. No decidir automáticamente cuál es la regla docente vigente.
3. Las transcripciones contienen erratas o posibles errores de reconocimiento. Por ejemplo, el texto SATB explica 6/3 y 6/4 como intervalos contra la fundamental: esa formulación necesita revisión porque el cifrado se refiere al bajo. No copiar transcripciones como si fueran texto aprobado.
4. Los guiones de introducción y lección 1 conservan menciones a manuales en Amazon y descargas Android gratuitas. Sustituir esas menciones en futuras versiones por la decisión vigente de manuales web gratuitos y apps móviles a 5 USD. No se ha comprobado aquí qué frases aparecen en los videos publicados.
5. Tener verificadores antiguos no demuestra que funcionen en el website actual. No se ejecutó el código heredado ni se migraron sus reglas en esta revisión.

## Alcance de esta revisión

Inventariadas las carpetas de introducción, lecciones 1–5, propedéutico y Videos Clases. Extraído texto de 25 documentos ODT/DOCX, con lectura de los guiones y transcripciones principales en español, comparación de las fuentes de acordes y lectura de las reglas relevantes de los verificadores. Inspeccionadas visualmente la partitura completa de acordes mayores y la primera página de acordes menores. MIDI, videos, audio y proyectos Cubase/Vegas inventariados; no reproducidos ni auditados íntegramente. No se revisaron como contenido pedagógico los archivos administrativos, credenciales ni respaldos generales.

## Siguiente paso recomendado

Reescribir el guion de la lección 4 desde su transcripción histórica, con la tarea completa y el formato de narración de Luis, y presentarlo en el chat para revisión remota. Después de su aprobación, alinear página, ejercicio y Maestro Virtual. Conservar los originales en H: como fuentes, sin moverlos ni sobrescribirlos.

## Corrección tras revisar las láminas del método

Luis señaló el ejemplo sobre C. Inspección visual de `H:\Website Clases\Curso Medrano.pdf`, páginas 7 y 10: las escalas básicas y sus tríadas se comparan sobre Do, incluyendo mayor natural, mayor armónica (VI descendido), menor natural, menor armónica y menor melódica ascendente/descendente. La mayor armónica había quedado omitida en la reconstrucción anterior. La lámina musical no quedó preservada en la extracción de texto del KB.

Distinguir dos niveles: el método presenta la construcción y comparación sobre Do; las tareas históricas extienden el trabajo por quintas. No deducir que las tareas antiguas sustituyen la explicación del método, ni dar por aprobada la distribución de estos contenidos entre lecciones 4–6. El próximo guion debe recuperar primero esta demostración sobre Do según la indicación de Luis.