# PLAN — Aeronaves ambientales por capa (2–5) · Aerostato

> Pedido de Luis (2026-07-19): en las capas 2, 3, 4 y 5, que de vez en cuando pase
> una aeronave acorde a la altura — y en la 5, un satélite. Ambiente puro: pasan
> random, lejos, no interactúan. Ejecutable aquí o por Codex sin más contexto que
> este documento y el código citado.

## 0. Contexto del código (leer antes de tocar nada)

- App: `apps-src/acordes-cantar-juego/` (Vite + Three.js, TypeScript estricto).
- Mundo: cilindro `WORLD.radius = 90`, Y = 0…750 en 5 capas de 150 u
  (`LAYERS` en `src/config.ts`; metros narrativos por capa).
- **Precedentes a imitar** (misma técnica, mismos presupuestos):
  - Ballena Celeste: `src/3d/scenery.ts` ~línea 328 — visitante único que cruza
    lento en órbita, grupo de primitivas low-poly, `activateWhale/update/dispose`.
  - `BirdFlock`: `scenery.ts` ~línea 459 — InstancedMesh + materiales
    MeshStandardMaterial, RNG sembrado del constructor.
- Presupuesto de render (PLAN maestro §5.2): SIN sombras, low-poly de primitivas
  (cero assets externos), pocos draw calls (comentario cabecera de scenery.ts).
  `game.drawCalls` y `game.fps` existen para QA.
- Niebla/cielo por altitud: `src/3d/environment.ts` (`applyAltitude`); todo lo
  lejano se funde con el fog — las aeronaves deben aparecer/morir DENTRO de él.
- Deploy local: `npm run deploy` dentro de la app copia el build a
  `public/apps/acordes-cantar-juego/` (el sitio lo sirve por iframe).
- Bitácora: añadir entrada en `BITACORA-DESARROLLO.md` al terminar cada fase.

## 1. Qué aeronave por capa

| Capa | Nombre | Banda Y (u) | Metros narrativos | Aeronave | Detalle visual clave |
|---|---|---|---|---|---|
| 2 | Mar de Nubes | 150–300 | 500–3 000 | **Avioneta de hélice** (tipo Cessna) | hélice girando (rotación por frame), ala alta, colores crema/rojo |
| 3 | Cielo Abierto | 300–450 | 3 000–8 000 | **Jet comercial** | fuselaje blanco, 2 motores bajo el ala, **estela doble** (contrail) |
| 4 | Cielo de Auroras | 450–600 | 8 000–20 000 | **Avión estratosférico** (silueta tipo U-2/Concorde: alas largas, esbelto) | estela FINA y larga, metal oscuro, pasa más lento (lejanía) |
| 5 | Borde del Espacio | 600–750 | 20 000–41 000 | **Satélite** | cuerpo dorado (foil), 2 paneles solares azulados, SIN estela, destello especular periódico + luz parpadeante |

Notas de diseño:
- Escala pequeña y paso LEJANO: son siluetas, no protagonistas (que nunca tapen
  una cuerda de linternas ni confundan; NO aparecen en el radar, NO colisionan,
  NO se pueden clickear — no entran a `clickTargets`).
- Capa 1 (El Valle) NO lleva aeronave: ya tiene pájaros (`BirdFlock`).
- El satélite cruza casi horizontal y muy lento (sensación orbital); la avioneta
  es la más "viva" (leve balanceo de alas).

## 2. Arquitectura

**Archivo nuevo: `src/3d/flybys.ts`** — no engordar scenery.ts.

```
class Flyby            // una aeronave viva: group, velocidad, vida
class FlybyManager {
  constructor(scene)
  update(dt, playerPos, elapsed)   // spawn por timer + mover + despawn
  reset()                          // al terminar partida (endGame)
}
```

- **Una sola aeronave activa a la vez** en todo el mundo (presupuesto y sobriedad).
- **Spawn**: timer aleatorio `FLYBY.intervalMin…intervalMax` s (tunables nuevos en
  `config.ts`, ver §3). Al vencer: elegir la aeronave de la capa donde está el
  jugador (`layerAtY(playerPos.y)`); capa 1 → no spawn, re-armar timer.
  `Math.random()` está bien (es ambiente; el seed del mundo NO debe consumirse
  aquí para no alterar la reproducibilidad de nubes/terreno).
- **Trayectoria**: línea recta que cruza el cilindro como cuerda:
  - punto de entrada: ángulo random en el borde (`r = WORLD.radius + margen ~20`),
  - rumbo: hacia un punto random del lado opuesto (offset lateral ≤ 40 u para
    variedad), Y constante dentro de la banda de la capa ± lejos del jugador
    (|ΔY| ≥ ~15 u para que pase "por allá arriba/abajo", nunca encima).
  - velocidad por aeronave (tunable): avioneta ~9 u/s, jet ~14, estratosférico ~10,
    satélite ~5.
- **Despawn**: al salir del cilindro + margen, `dispose()` de geometrías/materiales
  (patrón ballena) y re-armar timer.
- **Orientación**: `group.lookAt(destino)`; banqueo sutil fijo opcional.
- **Integración**: instanciar en `renderer.ts` (como `scenery`), `update()` en el
  frame loop, `reset()` desde `endGame()` en main.ts. El manager corre SIEMPRE
  (también en menú/vuelo libre: el fondo vivo vende el juego).

### Estelas (jet y estratosférico)
Barata, 1 draw call por estela: `THREE.Mesh` cinta (PlaneGeometry alargada tras
la aeronave, material `MeshBasicMaterial` blanco `transparent`, opacidad que se
desvanece hacia la cola vía vertex colors o 2º plano cruzado). NADA de sistemas de
partículas por frame. La estela viaja rígida con el grupo (suficiente a distancia).

### Modelos (primitivas, cero assets)
- Avioneta: caja fuselaje + cilindro morro + cajas ala/cola + 2 palas (caja plana)
  en un `Object3D` "prop" que rota `~25 rad/s`.
- Jet: cilindro fuselaje + conos morro/cola + cajas alas en flecha + 2 cilindros
  motores.
- Estratosférico: cilindro esbelto + alas MUY largas y delgadas (cajas), cola en T.
- Satélite: caja central + 2 cajas panel (material `emissive` azul tenue) +
  antena (cilindro fino). Destello: cada ~4 s, pulso de `emissiveIntensity` del
  cuerpo (lerp arriba/abajo) + `PointLight` NO (presupuesto): usar solo emissive.

Presupuesto: ≤ 8 meshes por aeronave (idealmente fusionar con
`BufferGeometryUtils.mergeGeometries` por material → 2–3 draw calls).

## 3. Tunables nuevos en `config.ts`

```ts
// Aeronaves ambientales por capa (PLAN-AERONAVES-POR-CAPA) [tunable].
export const FLYBY = {
  intervalMin: 35,   // s entre pasadas (min)
  intervalMax: 90,   // s entre pasadas (max)
  firstDelay: 15,    // s tras entrar a una capa antes del primer paso posible
  yClearance: 15,    // |ΔY| mínimo respecto al jugador
  edgeMargin: 20,    // u fuera del radio para nacer/morir
  speeds: { plane: 9, jet: 14, strato: 10, satellite: 5 }, // u/s
} as const;
```

## 4. Sonido (fase opcional, al final)

- Avioneta/jet/estratosférico: rumble corto sintetizado en `synth-sfx.ts`
  (ruido lowpass + gain proporcional a 1/distancia², cap bajito ~0.08) — patrón
  `setWind/setBurner` existente. Doppler NO (sobra a esta distancia).
- Satélite: silencio (estamos "en el borde del espacio") o ping muy tenue 1×.
- Si aprieta el presupuesto de tiempo: **saltarse esta fase entera** — lo visual
  es el pedido.

## 5. Fases de ejecución

- **F1 — Manager + avioneta (capa 2)**: flybys.ts, tunables, integración
  renderer/endGame, modelo avioneta, spawn/despawn/QA. *(la base de todo)*
- **F2 — Jet (capa 3) + estela**: modelo + cinta de estela reutilizable.
- **F3 — Estratosférico (capa 4)**: modelo (reusa estela fina).
- **F4 — Satélite (capa 5)**: modelo + destello emissive.
- **F5 — QA**: `?fakemic=1` + vuelo libre por las 4 capas; verificar
  `game.drawCalls` (Δ ≤ ~5 con aeronave en pantalla), fps estable, dispose sin
  fugas (spawn repetido), que nunca pase cerca del jugador ni tape cuerdas.
- **F6 (opcional) — Sonido** (§4).

Cada fase termina con `npm run build` limpio; al cierre `npm run deploy` +
entrada en BITACORA. Sin commit hasta que Luis lo pida.

## 6. Criterios de aceptación

1. En cada capa 2–5, esperando ~1–2 min, cruza su aeronave correspondiente;
   en la 1 no pasa nada nuevo.
2. Nunca hay dos a la vez; nacen y mueren fundidas en la niebla (sin pops).
3. Radar, clicks, cuota y gameplay: intactos.
4. fps y draw calls dentro del presupuesto actual (medir antes/después).
