# Oido Absoluto Multi Webapp

Webapp Vite + TypeScript de la app Android `appapmulti`, preparada para publicarse despues en:

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
