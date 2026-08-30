# Resonancia — prototipo de Oído Absoluto Guitarra

Prototipo aislado del modo juego para la app de oído absoluto con guitarra clásica.
No está conectado al catálogo, a rutas de Next.js ni a `public/apps`.

```powershell
npm install
npm run dev
npm run build
```

URL local: `http://127.0.0.1:5178/`

Las muestras se reproducen desde el mismo bucket R2 que usa `apps-src/ap-guitar`.

El progreso se guarda en el navegador: respuestas correctas y totales por
altura y cuerda, sesiones, mejor racha y niveles completados. La pantalla
**Bitácora del luthier** resume estos datos sin requerir una cuenta.

## Verificación local

Durante desarrollo, `http://127.0.0.1:5178/?qa=1` reduce temporalmente la meta
a tres aciertos y muestra controles de prueba para recorrer error, repetición,
apertura de la roseta y victoria. Ese panel no se incluye en builds de producción.
También usa una clave de almacenamiento separada, por lo que las pruebas no
alteran la bitácora normal.
