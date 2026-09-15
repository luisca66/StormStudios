# Arte 3D del Entorno — Aerostato (Storm Studios)

Modelos 3D y piezas de entorno monumental creados con el módulo oficial `bpy` de **Blender 4.5.3 LTS** y **Python 3.11**.

---

## 1. Nubes Cúmulo 3D (Hero Cloud Formation)

- `nube-cumulo.blend`: Escena editable de Blender con formación procedural, jerarquía de objetos, modificadores, materiales con dispersión y configuración de iluminación y cámara.
- `nube-cumulo.glb`: Modelo 3D optimizado para WebGL / Three.js con normales ponderadas suaves y colores de vértice integrados.
- `nube-cumulo-preview.png`: Render de control en **Cycles** (1200 × 900 px, iluminación de amanecer dorado con luz rasante y denoise).
- `modelar-nube.py`: Script fuente 100% reproducible.

### Dirección Visual
Inspirado en la estética pictórica de **Studio Ghibli (Kazuo Oga / Hayao Miyazaki)** fusionada con el romanticismo de época (Julio Verne):
- **Base condensada:** Aplanamiento horizontal inferior para evocar la base física de flotación de las nubes cúmulo.
- **Cúpulas algodonosas:** Lóbulos sinusoidales multifrecuencia superpuestos con fusión voxel y relajación de normales.
- **Gradiente lumínico vertical:** Sombra ambiental lavanda/azul cielo en la base, transicionando a crema marfil y blanco dorado en las crestas superiores.
- **Penetración de cámara:** Fade de proximidad vía `onBeforeCompile` en Three.js con `smoothstep(1.2, 8.5, -mvPosition.z)` para vuelo suave a través de la nube sin recortes geométricos triangulares.

### Visor Local y Tecla en Juego
- Visor dedicado: `http://127.0.0.1:5174/dev/nubes.html`
- En el juego (`http://127.0.0.1:5174/`): Presiona **`C`** durante el vuelo para teletransportarte frente a la nube y atravesarla.

---

## 2. Aguja Alpina y Faro Atmosférico Victoriano

- `faro-atmosferico.blend`: Escena completa con pico montañoso fracturado de granito oscuro, aristas con nieve alpina, torre octogonal de mampostería, balcón de hierro forjado, cúpula de bronce victoriana, linterna Fresnel y haz de luz cónico volumétrico giratorio.
- `faro-atmosferico.glb`: Modelo 3D optimizado (1,893 triángulos) listo para Three.js con nodo independiente `Faro_Linterna_Giratoria`.
- `faro-atmosferico-preview.png`: Render de control en **Cycles** con iluminación crepuscular y haz luminoso barriendo el horizonte.
- `modelar-faro.py`: Script generador en Python / `bpy`.

### Dirección Visual
- **Aguja Alpina:** Arista rocosa escarpada con base amplia y crestas cubiertas de nieve perpetua, emergiendo del mar de nubes.
- **Torre Victoriana:** Arquitectura monumental en piedra gris pizarra, molduras y ménsulas de cantería, balconada metálica perimetral y cúpula de latón remachado.
- **Haz de Luz:** Cono volumétrico con blending aditivo (`THREE.AdditiveBlending`) que barre suavemente 360° guiando a los navegantes aéreos en el valle.

### Visor Local y Tecla en Juego
- Visor interactivo: `http://127.0.0.1:5174/dev/faro.html` (permite rotar el haz, cambiar presets de hora/luz y enfocar torre o pico).
- En el juego (`http://127.0.0.1:5174/`): Presiona **`F`** durante el vuelo para teletransportarte frente al faro y ver el haz barriendo el cielo entre las capas 1 y 2.

---

## 3. Gran Ballena Celeste (El Leviatán del Éter)

- `ballena-celeste.blend`: Escena completa en Blender 4.5.3 LTS con fuselaje orgánico rorcual de 26m, surcos gulares nacarados, ojos con engarces victorianos, cresta de 7 placas cristalinas bioluminiscentes con pulsación, alas de manta marina independientes para aleteo (`Aleta_Pectoral_Izq`, `Aleta_Pectoral_Der`), aleta caudal bifurcada (`Aleta_Cola`), arnés victoriano de latón remachado y anillo de amarre superior en `(0, 4.2, 0)`.
- `ballena-celeste.glb`: Modelo 3D optimizado (1,173 triángulos, solo 87 kB) con jerarquía desacoplada para nado orgánico en Three.js.
- `ballena-celeste-preview.png`: Render de control en **Cycles** con iluminación nocturna estratosférica y emisión bioluminiscente.
- `modelar-ballena.py`: Script generador en Python / `bpy`.

### Dirección Visual
- **Criatura Mítica del Éter:** Hito cumbre de la Capa 5 (+675m). Sustituye los 5 elipsoides y planos rígidos previos por una criatura viva, majestuosa y de ensueño.
- **Biología Luminiscente:** Placas dorsales en prisma hexagonal con gradiente turquesa, esmeralda y oro celeste, que pulsan suavemente en la oscuridad estratosférica.
- **Arnés Victoriano del Acorde 13:** Guarniciones de latón bruñido con faroles de navegación laterales y un anillo de amarre central sobre el lomo, del cual penden las linternas del acorde decimotercero que el aerostato aborda para duplicar su puntuación ($\times 2$).

### Visor Local y Tecla en Juego
- Visor interactivo: `http://127.0.0.1:5174/dev/ballena.html` (permite simular el nado con aleteo de mantas y ondulación de cola, ajustar la intensidad bioluminiscente, cambiar de preset ambiental y enfocar partes clave).
- En el juego (`http://127.0.0.1:5174/`): Presiona **`B`** durante el vuelo para teletransportarte a la altitud de la ballena (+675m) y verla surcar la estratósfera con su balanceo y linternas suspendidas.

---

## Reproducción de Scripts Blender (PowerShell)

```powershell
# Generar Nubes Cúmulo
powershell -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-cantar-juego\art\blender\modelar-nube.py

# Generar Faro Atmosférico
powershell -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-cantar-juego\art\blender\modelar-faro.py

# Generar Gran Ballena Celeste
powershell -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-cantar-juego\art\blender\modelar-ballena.py
```

---

## 4. Aeronaves por capa (avioneta, jet, estratosférico y satélite)

Modeladas por Astra (Codex) e integradas por Claude; el estratosférico lo corrigió Claude (v4).
Encargo, entrega y fuente en `aeronaves/`.

- `modelar-aeronaves.py` genera `aeronaves.blend`, un `.glb` y un `.json` por aeronave, los renders y
  `ENTREGA.md`. Triángulos: avioneta 1 788, jet 2 254, estratosférico 1 700, satélite 1 316.
  Morro hacia +Z. `meta.contrailOrigins` marca dónde nace cada estela (jet y estratosférico).
- Partes: avioneta `body` + `prop` (gira sobre su +Z local); satélite `body` (destello), `panel` 0–1
  (giro sobre el brazo) y `beacon` (parpadeo); jet y estratosférico, solo `body`.
- Los JSON se copian a `src/3d/assets/aeronaves/`: al regenerar, volver a copiarlos.
- Visor: `http://127.0.0.1:5174/dev/aeronaves.html` (selector de aeronave, vista a 60 u y a 15 u).
- En el juego: teclas `2`–`5` llevan a cada capa; su aeronave cruza tras 5–12 s.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-cantar-juego\art\blender\aeronaves\modelar-aeronaves.py
```

---

## 5. Canastilla en primera persona

Modelada por Claude con bpy. Fuente y renders en `canasta/`.

- `modelar-canasta.py` genera `canasta.json` (kit.export_parts, 22 404 tri, 9 partes),
  `canasta.glb`, `canasta.blend` y dos renders POV: `render-pov-panoramica.png` y `render-pov-telefono.png`.
- Módulos del `meta` (origen de cada parte = punto de anclaje, a la profundidad `depth`):
  `rim` (0,−1) · `postL` (−1,0) y `postR` (1,0) con `keepHeight` · `burner` (0,1). `flameOrigins`
  marca las dos boquillas. `layout.H = tan 30°`, `refHalfWidth` = 16:9, `minScale` 0.55.
- `src/3d/basket.ts` coloca cada módulo en `(ax·halfW·d, ay·H·d, −d)` con escala
  `k = clamp(halfW / refHalfWidth, 0.55, 1)`. Los postes solo escalan en X/Z y se arriman al borde
  en pantallas estrechas. Los renders del script usan la misma regla.
- El JSON se copia a `src/3d/assets/canasta/`: al regenerar, volver a copiarlo.

```powershell
powershell -NoProfile -ExecutionPolicy Bypass -File C:\Users\Luis\blender-bpy\bpy-run.ps1 apps-src\acordes-cantar-juego\art\blender\canasta\modelar-canasta.py
```
