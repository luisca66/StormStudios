# Proyecto económico — Storm Studios Learning

Análisis de factibilidad e insights económicos. Claude Fable 5, 2026-07-05.
Complementa la auditoría técnica (AUDITORIA-FABLE5-2026-07-03.md) y los backlogs
de mejoras guardados en la memoria del proyecto y en
`apps-src/intervalos-cantados-juego/NOTAS-DISENO.md`.

---

## Factibilidad: tres escenarios

### A. Producto digital independiente (vender el curso frío al mundo hispano)
**Factible pero cuesta arriba.** El problema de todo EdTech de consumo no es el
producto, es la adquisición de tráfico. Conversiones típicas de 1-3%, el mercado
hispano paga menos que el anglo, y se compite contra alternativas gratuitas
(teoria.com, apps móviles de quiz). Ganarse la vida solo de ventas frías requiere
años de SEO y contenido constante. **No apostar el ingreso principal aquí.**

### B. Amplificador de la práctica docente ⭐ (la apuesta recomendada)
**Muy factible.** El sitio diferencia a Luis de cualquier otro maestro de música
(nadie más tiene un arcade propio de entrenamiento auditivo), justifica cobrar más
por sus clases, retiene alumnos entre sesiones (practican en SU plataforma) y el
SEO en español trae prospectos calificados sin pagar anuncios. Costo marginal casi
cero (Vercel + R2 cuestan centavos). El curso digital es el segundo ingreso — lo
compra quien ya confía — no la apuesta principal.

### C. B2B: licencias a academias de música (techo alto, a futuro)
Plataforma con panel de maestro licenciada por asiento/año a escuelas. Pocas
ventas, tickets grandes. Se construye DESPUÉS de probar el modelo en la práctica
propia (ver insight 5).

## La ventaja competitiva real

**Juegos donde el alumno canta y el juego lo escucha** (detección de pitch), en
español, respaldados por un curso serio y un maestro real. Un competidor con
dinero replica apps de quiz; no replica fácilmente esa combinación.

---

## Insights accionables

### 1. El dinero inmediato: subir el precio de lo que ya se vende
Modalidad "clase + plataforma" (acceso al curso y seguimiento de práctica en las
apps) justifica +20-30% sobre la tarifa actual de clases, con costo marginal cero.
Con 10 alumnos, ese diferencial probablemente supera lo que el curso digital
vendería frío en su primer año. **Es el flujo de caja mientras lo demás madura.**

### 2. Vender generaciones, no curso autodidacta
El self-paced en el mercado hispano se malbarata ($500-1,500 MXN, compite con
YouTube gratis). Una **generación con cupo limitado** — sesiones en vivo mensuales
+ tarea en la plataforma + retroalimentación del maestro — se vende a 3-5x, usa la
fortaleza real (enseñar) y crea urgencia con fechas de cierre. El self-paced se
lanza después como versión económica para quien no alcanzó lugar.

### 3. Matemática del embudo (para calibrar expectativas)
Regla realista: de cada 100 visitas orgánicas, ~5 dejan correo; de cada 100
correos, ~2-3 compran en 90 días.
- 3,000 visitas/mes → ~150 correos/mes → ~3-4 ventas/mes.
- Llegar a 3,000 visitas/mes con lecciones SEO consistentes toma 9-18 meses.
- Conclusión: lo digital es interés compuesto, no quincena. El insight 1 sostiene
  la casa mientras tanto.

### 4. Validar antes de construir más
Abrir **lista de espera con precio de fundador** (50% a los primeros 20) antes de
invertir otro mes o peso. Si se llena → negocio validado + capital de trabajo. Si
no llega a 10 → el mercado ahorró un año; se ajusta oferta o precio, no el código.

### 5. El B2B se siembra con UN caso
Una academia piloto, gratis 3 meses, a cambio de testimonio y datos ("los alumnos
que usaron la plataforma mejoraron X"). Con ese caso se venden licencias anuales
por asiento. Sin el caso, es solo una promesa.

### 6. El único costo que puede morder
Todo el stack es casi gratis **hasta que haya tráfico**: egress de samples en R2 y
límites de Vercel. El diagnóstico de caché ya está hecho (memoria del proyecto:
samples-cdn-pendiente) — activarlo el día que arranque la campaña.

---

## Síntesis

1. Cobrar más por las clases **ya** (insight 1).
2. Validar con lista de espera y precio de fundador (insight 4).
3. Dejar que SEO + generaciones construyan el ingreso digital con paciencia
   (insights 2-3).
4. B2B cuando exista el caso de éxito (insight 5).

**El proyecto no necesita más código para empezar a dar dinero — necesita una
oferta y una fecha.** El sitio es el foso defensivo del negocio de enseñanza; el
curso digital y el B2B crecen de ahí.

---

## Secuencia sugerida pre-lanzamiento (de los backlogs previos)

1. Captura de correo en el sitio (antes de cualquier publicidad).
2. Página "Sobre el maestro" + testimonios + botón de WhatsApp.
3. 3-5 lecciones públicas indexables como imanes SEO.
4. Lista de espera con precio de fundador → primera generación.
5. Al lanzar campaña: activar caché de samples y eventos de embudo en Analytics.

---

## Anexo A — Los 10 artículos SEO a escribir primero

Elegidos por intención de búsqueda real en español, cada uno remata en una app:

1. "¿Qué es una quinta justa? Apréndela de oído en 5 minutos" → juego de intervalos
2. "Cómo saber si cantas afinado (prueba gratis con tu micrófono)" → afinador v2,
   única herramienta así en español
3. "Intervalos musicales: la tabla completa con ejemplos de canciones" — la clásica
   "Star Wars = 5ª justa"; de lo más buscado en teoría musical
4. "Oído absoluto vs. oído relativo: cuál puedes entrenar de verdad" — controversia
   = clicks, respuesta honesta y con app
5. "Cómo leer ritmos: ejercicios interactivos del nivel 1 al avanzado" → lectura rítmica
6. "Los acordes que debes reconocer de oído antes de improvisar"
7. "¿Por qué desafinas al cantar? Las 3 causas y cómo corregirlas" — dolor real,
   búsqueda emocional, solución única
8. "Solfeo en 2026: cómo entrenar el oído sin solfear horas"
9. "Guía de enarmonías: por qué Fa♯ y Sol♭ no siempre son lo mismo" — nadie lo
   explica bien en español; music-theory-core ya lo modela
10. "Examen de admisión a la facultad de música: qué te van a preguntar de oído" —
    intención desesperada y dispuesta a pagar (ver Anexo B)

**Fórmula de cada artículo:** responder la búsqueda en los primeros 2 párrafos
(Google lo premia) → ejemplo con audio → "practícalo ahora" con la app precargada →
captura de correo al final ("la serie completa, gratis por correo").

---

## Anexo B — Producto validador: "Generación Pre-Examen" (8 semanas)

El producto que más rápido valida precio, embudo, formato y plataforma en un solo
tiro, con el comprador más motivado del mercado.

**El comprador:** aspirante a facultad de música o conservatorio en México. Tiene
fecha de examen, pánico real al dictado, y familia dispuesta a pagar por no perder
un año. No compra "aprende música" — compra "no repruebes".

**Temario (todo ya construido, solo re-empaquetar):**
- Semanas 1-3: intervalos de oído (juego + app de reconocimiento) — corazón de
  todo examen de admisión
- Semanas 4-5: dictado rítmico (lectura rítmica interactiva)
- Semanas 6-7: acordes y grados (apps de acordes/grados)
- Semana 8: simulacro — arma secreta: **el afinador v2 evalúa canto a primera
  vista**, la parte que ningún curso en línea puede revisar

**Formato:** 1 sesión en vivo semanal (grupal, 60-90 min) + tarea diaria medible
en la plataforma + grupo de WhatsApp. Tiempo del maestro: ~2 h/semana.

**Precio ancla:** propedéuticos presenciales en México cobran $3,000-8,000 MXN.
Con plataforma única y grupo chico: **$2,500-3,500 MXN por 8 semanas**.
10 alumnos = $25,000-35,000 MXN por generación con ~16 h de tiempo total.

**Calendario (manda):** exámenes de admisión concentrados feb-jun. Generación 1 se
lanza **nov-dic** ("prepárate con tiempo"), generación 2 de emergencia en **enero**
("faltan 8 semanas"). Fecha límite real para lista de espera + página de venta:
**octubre**.

**Canal de marketing (quirúrgico, no masivo):**
- Grupos de Facebook de aspirantes (enormes y activos)
- Artículo SEO #10 del Anexo A
- Maestros particulares de solfeo que preparan aspirantes: 15% de comisión por
  referido — convierte a la "competencia" en fuerza de ventas

**Joya de largo plazo:** testimonios tipo "entré a la facultad gracias a esto" —
la prueba social más potente para un sitio de educación musical; vende después el
curso general, las clases y el B2B.
