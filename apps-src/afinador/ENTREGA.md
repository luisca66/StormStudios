# Afinador cromático web

Implementado en Vite + TypeScript sin framework ni librerías de detección de tono. Solo se escribió dentro de `apps-src/afinador/`. No se ejecutó `deploy` ni se modificó el sitio o `public/`.

## Probar

Desde esta carpeta, con Node 24:

```powershell
npm ci
npm test
npm run build
npm run dev
```

Abrir `http://127.0.0.1:5194/?lang=es` o `?lang=en`. Activar el micrófono, tocar una nota sola, comprobar Hz, cents y estados bajo/afinado/alto; probar silencio, ruido, permiso denegado, detener y reactivar. Comprobar ♯/♭ tras recargar. HTTPS o localhost son necesarios para captura. Al cambiar de pestaña se apaga el micrófono; al volver se reactiva mediante el botón.

`npm run deploy` compila y copia a `public/apps/afinador/` con el mismo script del proyecto de referencia. Está preparado para que el integrador lo ejecute. El iframe debe permitir micrófono (`allow="microphone"`); una Permissions-Policy del sitio no debe bloquearlo.

## Implementación y decisiones

- `src/dsp/`: puerto del YIN/FFT, análisis de señal, mapeo, suavizado, modelos, configuración y modos de instrumentos Kotlin. Sin DOM. Los instrumentos se conservan para paridad del motor; la interfaz solo ofrece afinación cromática y A4 fijo en 440 Hz.
- Se conservan los valores predeterminados del core Kotlin (incluido E1 para sus pruebas de bajo). La configuración de la app limita las notas a C2–C7, con margen de frecuencia para medir notas desafinadas en los extremos.
- Corrección deliberada: `hasPitch` rechaza cualquier resultado con `reason`, especialmente `LowConfidence`; Kotlin aceptaba estos resultados si contenían frecuencia y nota.
- AudioWorklet solo junta ventanas mono de 8192 muestras, con salto de 2048. Worker dedicado ejecuta DSP y suavizado. Se respeta la tasa real del AudioContext. Hay como máximo una ventana en vuelo; se descartan ventanas antes de acumular latencia. Audio local y efímero: sin grabación, persistencia ni envío a la red. Se desactivan cancelación de eco, supresión de ruido y ganancia automática.
- El filtro mantiene hasta seis ventanas dudosas (unos 280 ms a 44.1 kHz), marcadas «Verificando señal» y sin indicador de afinado; después muestra «No se detecta nota». Las ventanas fiables renuevan la lectura continuamente.
- Medidor SVG con la geometría y colores del diseño, Barlow Condensed, Space Grotesk y JetBrains Mono. Fondo #050912, bajo ámbar, afinado verde, alto cian; nota gigante y barras de señal/confianza. En horizontal: lectura y medidor lado a lado. Se omiten marco de teléfono y controles de demo de la referencia. Contraste de textos secundarios aumentado para accesibilidad.
- Aguja con requestAnimationFrame: interpolación del 15% a 60 fps, corregida por tiempo transcurrido. `prefers-reduced-motion` elimina la interpolación y las animaciones decorativas. Botones nativos, foco visible, mensajes de estado accesibles. ♯/♭ en localStorage con try/catch. Ambos idiomas en `src/i18n.ts`.
- La referencia de PermissionScreen usa recursos `R.string.mic_permission_*`, pero no incluye sus archivos strings.xml. Se reproduce su estructura (explicación, rechazo y reintento) con redacción equivalente bilingüe y sin botones ficticios para abrir ajustes del navegador.
- `--configLoader native` y pruebas con threads evitan errores `spawn EPERM` de este entorno. `resolve.preserveSymlinks` evita la consulta de unidades de red que hace Vite en Windows restringido. Dependencias exactas y package-lock incluido.

## Validación

- `npm test`: **24 pruebas**, portando las cuatro suites Kotlin. Todas las notas cromáticas C2–C7 dentro de ±1 cent con senoides limpias. También 44.1/48/96 kHz, distintas fases y desafinaciones; armónicos con fundamental débil, equivalencia FFT/suma directa, silencio, ruido blanco y filtrado con semillas reproducibles, retención, ataque/release, cambios de nota y nota sostenida.
- `npm run build`: TypeScript y compilación de producción correctos; worklet y Worker separados en dist.
- Revisado en Chrome con `scripts/browser-fixture.html?lang=es|en` servido por Vite: fuente sintética local → MediaStream → AudioWorklet real → Worker → UI. A4/440 Hz, C♯4/−18 ct, cambio a D♭4, rechazo de ruido, ausencia de nota, permiso denegado y reintento, apagar, idioma y persistencia. Revisados el diseño vertical y el horizontal. La fixture **no forma parte del build** y no usa micrófono físico.
- `scripts/browser-check.mjs` deja una comprobación adicional automatizada con Playwright del repositorio anfitrión y WAV sintético. Su ejecución aquí quedó bloqueada al lanzar Chromium (`spawn EPERM`); se recurrió a Chrome conectado y la fixture para la revisión anterior.

Pendiente de validación manual: instrumento y micrófono físicos (especialmente C2 y C7, notas débiles y ruido real), Safari/iPhone y Android, rendimiento sostenido a 60 fps en teléfono, y permiso de micrófono dentro del GameShell definitivo. No se afirma precisión de ±1 cent con instrumentos reales ni se ha integrado o publicado la app.
