# Cardumen Prisma — prueba local

Pez original modelado con bpy 4.5.3 LTS y Python 3.11.15. Referencia visual inspeccionada: [sardina plateada de La Paysanne des Mers](https://www.lapaysannedesmers.com/poissons-frais-1/poissons-frais/sardines-fraiches.html). La fotografía solo orientó silueta y paleta; no se distribuye como textura.

Entregables: `pez-prisma.blend`, `pez-prisma.glb`, `pez-prisma-preview.png` y fuente `modelar-prisma.py`. El GLB incluye una animación conjunta de las dos mallas de la cola. El JSON `../../src/3d/creatures/assets/pez-prisma.json` contiene posiciones, normales, colores de vértice, índices y pivotes evaluados en Blender, con eje vertical Y y frente +Z.

Desde la raíz del repositorio:

```powershell
python -B -c "import sys; sys.path.insert(0,r'C:\Users\Luis\AppData\Local\codex-blender\python-module'); import runpy; runpy.run_path(r'apps-src\acordes-juego\art\blender\modelar-prisma.py',run_name='__main__')"
```

Inspector: http://127.0.0.1:5183/dev/prisma.html . Permite cambiar entre un pez y 46, luces, destellos, captura y huida. El juego en http://127.0.0.1:5183/?debug=1 incluye un botón **Acercar Cardumen Prisma**, solo en desarrollo, para acercar un cardumen existente durante la inmersión.

Se preservan los colores naturales; los destellos aumentan el brillo por grupos de peces. Las siete mallas del modelo se dibujan con instancias para todo el cardumen. Cada cola tiene su propia fase. La huida compacta la formación y acelera las colas. La retirada libera también los recursos GPU de las instancias.

Validación: build y QA existentes correctos; geometría de 5,691 triángulos por pez, siete mallas, índices/normales válidos y GLB con animación. Inspector de 46 peces: 261,786 triángulos, siete llamadas de dibujo y aproximadamente 60 FPS observados en esta computadora. Esta medición no cubre teléfonos ni seis cardúmenes simultáneos. Se revisó el render de Cycles y se corrigieron ojos, membranas y detalles de escamas. Sin despliegue ni copia a public/apps.
