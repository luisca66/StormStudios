# ENTREGA · Etimológica Web (`apps-src/etimologica/`)

## Qué se hizo

1. **Extracción completa de datos (`src/data/words.json` y `src/data/categories.json`)**:
   - Se escribió el script reproducible `scripts/extract-words.mjs` que lee `referencia/kotlin/com/example/etimologica/data/WordData.kt` y `referencia/kotlin/com/example/etimologica/data/model/Category.kt`, desescapa literales de Kotlin (`\n`, etc.) y genera `src/data/words.json` (las **200 palabras**, IDs `1..200`, 40 por categoría, con los 13 campos íntegros incluyendo caracteres griegos, árabes, sánscritos, japoneses y macrones latinos/náhuatl) y `src/data/categories.json` (las **5 categorías** en orden `0..4`).
   - Además, se generaron directamente `src/data/words.json` y `src/data/categories.json` con el mismo formato (`JSON.stringify(..., null, 2) + "\n"`) para que coincidan byte a byte al ejecutar `node scripts/extract-words.mjs`.
2. **Seis pantallas y lógica del juego en TypeScript (`src/gameLogic.ts`, `src/storage.ts`, `src/main.ts`)**:
   - **Home**: medallón de Aristóteles (`referencia/res/mipmap-xxxhdpi/ic_launcher_round.webp`), título, subtítulo, marcador de puntos totales y botones hacia *Jugar*, *Colección* y *Estadísticas*.
   - **Categorías**: las 5 categorías (*Latín vulgar*, *Arabismos*, *Nahuatlismos*, *Helenismos*, *Neologismos*) con icono, descripción, barra de progreso (`GreenForest`) y desbloqueo progresivo al lograr `>= 7` aciertos en la categoría anterior.
   - **Juego**: racha activa (`StreakBadge` con escala `1.15x` y color dorado en racha `>= 3`), puntos de sesión (`+10` base, `+15` en racha `>= 3`), palabra en mayúsculas, pistas etimológicas (`rootsDisplay` respetando saltos de línea), 4 opciones barajadas, confeti dorado en `<canvas>` (`src/confetti.ts`) al acertar, y botones para abrir la ficha etimológica o pasar a la siguiente palabra.
   - **Ficha etimológica (`Card`)**: tarjeta completa con definición, raíces, etimología, origen histórico, dato curioso y categoría; al volver desde la ficha durante una partida se conserva intacto el estado de la sesión.
   - **Colección**: chips de filtro (*Todas* muestra todas las palabras desbloqueadas; cada chip de categoría muestra las 40 palabras de esa categoría con las bloqueadas como `???` / `🔒` y las desbloqueadas con borde verde o vino según acierto/fallo).
   - **Estadísticas**: puntos totales, palabras acertadas (`correct/attempted`), porcentaje de precisión, racha máxima y categoría más jugada.
3. **Identidad visual, accesibilidad y teclado (`src/style.css`, `src/i18n.ts`)**:
   - Paleta original (`Cream #FAF8F5`, `InkDark #2D2A26`, `GoldAntique #B8860B`, `BlueInk #2C3E6B`, `GreenForest #2E7D4F`, `RedWine #8B2252`, `CardWhite #FFFEFC`, `CreamDark #F0EDE8`, `InkMedium #5C564E`) y tipografía de Google Fonts (`Merriweather` + `Lato`).
   - Interfaz bilingüe español/inglés mediante `?lang=es|en` (contenido de palabras en español).
   - Soporte de teclado en escritorio: `1`–`4` para elegir opción, `Enter` para avanzar a la siguiente palabra, `F` para abrir la ficha etimológica tras responder, `Escape` para volver atrás.
   - Respeta `prefers-reduced-motion` y encapsula todo acceso a `localStorage` en bloques `try/catch` con respaldo en memoria.
4. **Pruebas unitarias con Vitest (`src/gameLogic.test.ts`)**:
   - Verifica conteo e integridad de las 200 palabras y 5 categorías, preservación de saltos de línea y caracteres especiales, barajado de opciones, cálculo de puntos/rachas, desbloqueo a los 7 aciertos y estadísticas.

## Cómo probarlo (para Claude)

En este entorno no se pueden ejecutar comandos de terminal (`node`, `npm`), por lo que falta ejecutar:

```bash
cd apps-src/etimologica
node scripts/extract-words.mjs   # Verificar que words.json y categories.json no cambian
npm install
npm test                         # Ejecutar pruebas con Vitest
npm run build                    # tsc --noEmit && vite build
npm run deploy                   # Copia dist/ a public/apps/etimologica/
```

Para servidor de desarrollo en el puerto **5193**:
```bash
npm run dev
```

## Decisiones respecto al original Android

- **Persistencia**: Se sustituyó Room (`SQLite`) por `localStorage` (`storm_etimologica_user_progress_v1` y `storm_etimologica_words_state_v1`) con fallback en memoria dentro de `try/catch`.
- **Repaso al completar categoría**: Si el jugador termina todas las palabras de una categoría, en la pantalla de *Categoría completada* se ofrece además un botón para repasar las palabras falladas (o volver a jugar la categoría si acertó todas), evitando que alguien quede bloqueado si obtuvo menos de 7 aciertos en una categoría.
- **Raíces en la ficha etimológica**: Además de mostrarse como pista durante la pregunta, se incluyó el bloque *Raíces* (`rootsDisplay`) dentro de la ficha etimológica para que también pueda consultarse desde la Colección.
