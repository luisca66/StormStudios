# AP Guitar Webapp

Webapp Vite + TypeScript de la app Android `appapguitar`, preparada para publicarse despues en:

```text
public/apps/ap-guitar/
```

## Comandos

```bash
npm install
npm run dev
npm run check
npm run sync:assets
npm run deploy
```

La URL local usa el mismo `base` de produccion:

```text
http://127.0.0.1:5175/apps/ap-guitar/
```

`npm run deploy` compila y copia `dist/` al website de Storm Studios. Si el website cambia de ruta, define `STORM_WEBSITE_ROOT` antes de correrlo.

Los audios se sirven desde Cloudflare R2:

```text
https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev
```

Si despues conectamos un dominio custom al bucket, cambia `VITE_AP_GUITAR_AUDIO_BASE_URL` en `.env`.

`npm run sync:assets` queda como respaldo para volver a copiar los MP3 desde Android si necesitamos trabajar offline.
