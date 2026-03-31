# Plan de Expansión: Módulo Propedéutico

## Situación Actual

El propedéutico es **una sola lección** (`01-propedeutico`) que asume conocimiento previo de música. Para un alumno que no sabe nada, necesitamos expandirlo en un módulo completo con lecciones progresivas.

**Estructura actual del curso:**
- `00-introduccion` → Bienvenida (ya publicada, video en edición)
- `01-propedeutico` → Una sola lección de repaso (a reemplazar)
- `02-leccion-1` a `06-leccion-5` → Tríadas SATB (ya publicadas)

---

## Nueva Estructura del Propedéutico (4 lecciones)

| # | Slug | Título | Duración est. | Herramienta principal |
|---|------|--------|---------------|----------------------|
| P01 | `P01-escritura-notas` | Escritura de las Notas Musicales | 30 min | Secuenciador |
| P02 | `P02-escritura-ritmica` | Escritura de la Rítmica Musical | 35 min | Secuenciador |
| P03 | `P03-intervalos` | Intervalos | 35 min | Piano de Intervalos |
| P04 | `P04-uso-secuenciador` | Uso del Secuenciador | 30 min | Secuenciador |

Después del propedéutico, **Escalas Mayores es la Lección 1** del curso de armonía.

---

## Detalle de Cada Lección

### P01: Escritura de las Notas Musicales
**Objetivo:** Que el alumno aprenda a escribir y leer notas musicales en el pentagrama.

**Contenido:**
- Las 7 notas naturales: Do Re Mi Fa Sol La Si
- Sostenidos y bemoles: las 12 notas cromáticas
- El teclado del piano como mapa visual
- La octava: por qué las notas se repiten
- Nomenclatura científica (Do4 = C4, La4 = 440Hz)
- El pentagrama: 5 líneas y 4 espacios
- Líneas adicionales
- Clave de Sol: ubicación del Sol4 en la segunda línea
- Notas en clave de Sol (líneas y espacios)
- Clave de Fa: ubicación del Fa3 en la cuarta línea
- Notas en clave de Fa (líneas y espacios)
- La gran pauta (piano staff): clave de Sol + clave de Fa
- El Do central (Do4) como puente entre ambas claves

**Video a grabar:** Demostración en el secuenciador mostrando el teclado, las notas, cómo se corresponden con el pentagrama. Escribir notas y ver dónde aparecen.

**Ejercicio sugerido:** Localizar y escribir notas específicas en el secuenciador.

**Prerequisito:** `00-introduccion`

---

### P02: Escritura de la Rítmica Musical
**Objetivo:** Que el alumno entienda las figuras rítmicas, sus duraciones y cómo se organizan en compases.

**Contenido:**
- ¿Qué determina cuánto dura una nota?
- Figuras: redonda, blanca, negra, corchea, semicorchea
- Relación proporcional entre figuras (redonda = 2 blancas = 4 negras...)
- Silencios correspondientes
- El compás: agrupación del tiempo
- Compases simples: 4/4, 3/4, 2/4
- La barra de compás y la doble barra
- Ligaduras y puntillo

**Video a grabar:** En el secuenciador, escribir una melodía sencilla mostrando cómo cambiar las duraciones de las notas. Demostrar cómo suena la diferencia entre figuras.

**Ejercicio sugerido:** Escribir un patrón rítmico dado en el secuenciador.

**Prerequisito:** `P01-escritura-notas`

---

### P03: Intervalos
**Objetivo:** Que el alumno identifique y construya los intervalos básicos.

**Contenido:**
- ¿Qué es un intervalo? Distancia entre dos notas
- Intervalos melódicos vs. armónicos
- Clasificación por grados: segunda, tercera, cuarta, quinta, sexta, séptima, octava
- Calidad: mayor, menor, justo, aumentado, disminuido
- Tabla de intervalos con semitonos
- Intervalos consonantes vs. disonantes (introducción)
- Inversión de intervalos

**Video a grabar:** En el Piano de Intervalos, demostrar cada intervalo, escucharlo melódica y armónicamente. Mostrar cómo "suenan" las consonancias vs. disonancias.

**Ejercicio sugerido:** Usar el Piano de Intervalos para identificar intervalos por oído y por nombre.

**Prerequisito:** `P02-escritura-ritmica`

---

### P04: Uso del Secuenciador
**Objetivo:** Que el alumno domine el secuenciador Storm Studios antes de empezar los ejercicios del curso.

**Contenido:**
- Interfaz del secuenciador: barras de herramientas, teclado, partitura
- Cómo ingresar notas (clic, teclado, etc.)
- Cambiar duraciones, octavas y alteraciones
- Reproducción y tempo
- Las 4 voces SATB: cómo escribir en cada una
- Exportar MIDI para entregar ejercicios al Maestro Virtual
- Trucos y atajos útiles

**Video a grabar:** Tutorial completo del secuenciador paso a paso. (Ya existe video: "Cómo usar el Secuenciador Storm Studios" — YouTube ID: 2YBUqVs08VY / EN: AuSL-6cBoI4, verificar si necesita actualización)

**Ejercicio sugerido:** Escribir una melodía sencilla completa y exportarla como MIDI.

**Prerequisito:** `P03-intervalos`

---

## Estructura Completa del Curso (actualizada)

```
00-introduccion           → Bienvenida (publicada)
── Módulo Propedéutico ──
P01-escritura-notas       → Escritura de las Notas Musicales
P02-escritura-ritmica     → Escritura de la Rítmica Musical
P03-intervalos            → Intervalos
P04-uso-secuenciador      → Uso del Secuenciador
── Curso de Armonía ──
02-leccion-1              → Lección 1: Escalas Mayores (con Maestro Virtual)
03-leccion-2              → Lección 2: Escalas Menores (con Maestro Virtual)
04-leccion-3              → Lección 3: Tríadas SATB
05-leccion-4              → Lección 4: ...
06-leccion-5              → Lección 5: ...
... hasta 60 lecciones
```

La lección `01-propedeutico` original se elimina (su contenido se distribuye en P01-P04).

---

## Plan de Implementación Priorizado

### Fase 1: Estructura y configuración (hacer primero)
1. Crear los 4 archivos de configuración en `data/course/lessons/`
2. Actualizar `course-config.ts` para incluir las 4 lecciones del propedéutico
3. Eliminar referencia a `01-propedeutico`

### Fase 2: Contenido de las lecciones (en orden)
4. Escribir el MDX de P01 (Escritura de Notas) — es/en
5. Escribir el MDX de P02 (Escritura Rítmica) — es/en
6. Escribir el MDX de P03 (Intervalos) — es/en
7. Escribir el MDX de P04 (Uso del Secuenciador) — es/en

### Fase 3: Videos (puedes ir grabando en paralelo)
8. Grabar video P01 → P04 en el orden de las lecciones
9. Agregar los IDs de YouTube/embedUrl a cada configuración de lección

---

## Notas para los Videos

Cada video debería:
- Durar entre 5-15 minutos
- Usar la herramienta que el alumno tiene acceso en esa misma lección
- Mostrar paso a paso lo que el alumno va a hacer después como ejercicio
- Estar disponible en español (prioridad) y eventualmente en inglés
