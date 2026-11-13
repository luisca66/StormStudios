# Oido Absoluto Multi Webapp

Versión 2D del método AP Super, con 147 niveles por secuencia, seis timbres y estadísticas compartidas con Walking AP. Vite + TypeScript.

Preparada para publicarse en:

```text
public/apps/ap-multi/
```

## Comandos

```bash
npm install
npm run dev
npm run check
```

La URL local usa el mismo `base` de produccion:

```text
http://127.0.0.1:5176/apps/ap-multi/
```

`npm run deploy` compila y copia `dist/` al website de Storm Studios. No lo ejecutes hasta aprobar la migracion.

Los samples usan el mismo bucket R2 que las demas apps multi-timbricas:

```text
https://samples.stormstudios.com.mx
```

Las rutas quedan como:

```text
https://samples.stormstudios.com.mx/Cello/F%232.mp3
```

`npm run sync:assets` solo copia las imagenes de marca necesarias para trabajar localmente. No copia samples al `dist`.

## Método y persistencia

Menú → etapa → nivel → calentamiento → entrenamiento. Todos los niveles están disponibles; 20 aciertos consecutivos completan un nivel. El anillo de 60 segundos recuerda olvidar la nota escuchando música; nunca bloquea la siguiente pregunta. La música la pone el alumno.

`?lang=en` activa inglés. Las secuencias, notación, bucle, volumen, últimos niveles, progreso e intentos usan las mismas claves `walking-ap:*` del 3D. El campo `scenario` registra la etapa (1–5), porque ap-core no admite 0. Las estadísticas antiguas `ap_multi_note_accuracy_stats` se ignoran. Borrar estadísticas afecta solo la secuencia actual y conserva el progreso.

El dominio se importa de `../ap-core` sin modificarlo. No se incluyen contrarreloj ni modo Avanzado. `npm run check` ejecuta pruebas del estado, progresión, persistencia y audio, verifica TypeScript y genera `dist/`.
