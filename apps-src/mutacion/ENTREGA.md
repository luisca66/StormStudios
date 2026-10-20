# ENTREGA · Mutación Web (`apps-src/mutacion/`)

## Qué se hizo

1. **Modelo y lógica en TypeScript puro (`src/game/`) sin dependencias de DOM**:
   - [`src/game/models.ts`](./src/game/models.ts): fases (`MEMORIZING`, `HIDDEN`, `FINDING`, `RESULT`), figuras (`CIRCLE`, `SQUARE`, `TRIANGLE`, `DIAMOND`, `STAR`, `HEXAGON`), tipos de mutación (`COLOR`, `SHAPE`, `SWAP`, `ROTATION`, `SUBTLE_COLOR`), paleta de colores (`GAME_COLORS`, `SUBTLE_COLOR_VARIANTS`, `BEGINNER_COLORS`, `HIGH_CONTRAST_COLORS`), los 8 mundos (`WORLDS`, del 2×2 al 6×6 «Modo maestro») y la función `getLevelConfig(level)` con la configuración exacta de los 48 niveles de `GameModels.kt`.
   - [`src/game/engine.ts`](./src/game/engine.ts): port fiel de `GameViewModel.kt` (`generateGrid`, `applyMutations`, `isDistinguishableFromNeighbors`, `evaluateRoundState` y la clase `GameController`), con las mismas reglas de tiempos, toques (`mutatedIndices.size + 1`), selección/deselección, descuento de vidas por error, cálculo de puntos (`aciertos * 100 * nivel` + bono perfecto `50 * nivel`), desbloqueo progresivo y transiciones (`1000 ms` en `HIDDEN`, `2500 ms` en `RESULT`).
   - [`src/game/storage.ts`](./src/game/storage.ts): persistencia de `highScore` y `unlockedLevel` en `localStorage` envuelta en bloques `try/catch` con respaldo en memoria (`LocalStorageScoreRepository` e `InMemoryScoreRepository`), equivalente a `ScoreRepository.kt`.
2. **Interfaz web y las cuatro pantallas (`src/main.ts`, `src/shapeDrawer.ts`, `src/styles.css`, `src/i18n.ts`)**:
   - Pantallas **Home**, **LevelSelect**, **Game** y **GameOver** con la paleta exacta de `Color.kt` (`#121212`, `#1E1E1E`, `#2A2A2A`, `#00E676`, `#FF1744`, `#FFEA00`, `#448AFF`, `#FF9100`).
   - Geometría exacta de `ShapeDrawer.kt` renderizada en SVG vectorial nítido a cualquier resolución (`renderGameShapeSvg`) y logotipo animado en Canvas 2D (`drawAnimatedLogoOnCanvas`).
   - Cuadrícula adaptable con `ResizeObserver` y variables CSS (`--cell-size`) para que ningún nivel (incluido 6×6 en vertical o apaisado) se desborde del iframe.
   - Controles para ratón, pantalla táctil y teclado: flechas para moverse por la cuadrícula, `Enter`/`Espacio` para seleccionar o deseleccionar celda, `P` para pausar/reanudar y `Escape` para volver/cerrar diálogos.
   - Internacionalización completa ES/EN mediante `?lang=es|en` (por defecto `es`).
3. **Pruebas unitarias con Vitest (`src/game/game.test.ts`)**:
   - Verificación exhaustiva de los 48 niveles y 8 mundos, cambio real de celda y distinción respecto a vecinos ortogonales en los 5 tipos de mutación, conteo de toques y vidas, puntuación con bono perfecto y desbloqueo de niveles.

## Cómo probarlo

> **Nota de entorno**: En este entorno de agente no se permite ejecutar comandos de terminal (`npm install`, `npm run test`, `npm run build`), por lo que corresponde a Claude instalar dependencias, correr Vitest, compilar y verificar en el navegador.

```bash
cd apps-src/mutacion
npm install
npm run test
npm run build
npm run dev
```

- Desarrollo local: `http://127.0.0.1:5195/?lang=es` y `http://127.0.0.1:5195/?lang=en`
- Despliegue a `public/apps/mutacion/`: `npm run deploy`

## Decisiones que difieren del original Android

- **Pausa explícita y por teclado (`P`)**: En Android la pausa ocurría únicamente por eventos de ciclo de vida (`ON_PAUSE`/`ON_RESUME`). En web se mantuvo la pausa automática por `visibilitychange` y además se añadió el atajo `P` y un botón de pausa en la barra superior con diálogo modal (ocultando la cuadrícula mientras está en pausa para evitar trampas durante la fase de memorización).
- **Garantía en niveles exclusivos de rotación**: En `generateGrid`, si un nivel solo permite `ROTATION` y el azar genera una cuadrícula sin ninguna figura rotable (`TRIANGLE`, `DIAMOND`, `STAR`), se asegura que al menos `mutationCount` celdas tengan figuras rotables para evitar rondas sin mutación.

## Qué falta

- Ejecutar `npm install`, `npm run test`, `npm run build` y `npm run deploy` desde el entorno con acceso a terminal para dejar compilado `public/apps/mutacion/`.
