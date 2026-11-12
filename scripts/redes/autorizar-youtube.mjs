import http from 'node:http';
import { randomBytes, createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
import { credentials, external, check } from './core.mjs';
import { data, SCOPES } from './apis.mjs';

let server;
try {
  const output = process.argv[2];
  check(process.argv.length === 3, 'Uso: node scripts/redes/autorizar-youtube.mjs RUTA_EXTERNA_NUEVA.json');
  const target = await external(output, true);
  const c = await credentials();
  check(c.YT_CLIENT_ID && c.YT_CLIENT_SECRET, 'Faltan YT_CLIENT_ID y YT_CLIENT_SECRET.');
  const state = randomBytes(32).toString('base64url');
  const verifier = randomBytes(48).toString('base64url');
  server = http.createServer();
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const redirect = `http://127.0.0.1:${server.address().port}/oauth2callback`;
  const callback = new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('Tiempo agotado.')), 180000);
    server.on('request', (req, res) => {
      const url = new URL(req.url, redirect);
      if (url.pathname !== '/oauth2callback' || url.searchParams.get('state') !== state) { res.writeHead(400).end('Solicitud no válida.'); return; }
      clearTimeout(timer);
      res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' }).end('Ya puedes cerrar esta ventana. Revisa la terminal.');
      if (url.searchParams.get('code')) resolve(url.searchParams.get('code')); else reject(new Error('Autorización denegada.'));
    });
  });
  const url = new URL('https://accounts.google.com/o/oauth2/v2/auth');
  url.search = new URLSearchParams({ client_id: c.YT_CLIENT_ID, redirect_uri: redirect, response_type: 'code', scope: SCOPES, access_type: 'offline', prompt: 'consent', state, code_challenge: createHash('sha256').update(verifier).digest('base64url'), code_challenge_method: 'S256' }).toString();
  console.log('Abre esta URL en tu navegador (no compartas la URL):\n' + url);
  const code = await callback;
  const tokens = await data('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: c.YT_CLIENT_ID, client_secret: c.YT_CLIENT_SECRET, code, code_verifier: verifier, redirect_uri: redirect, grant_type: 'authorization_code' }) });
  check(tokens.refresh_token, 'No se recibió refresh token.');
  await writeFile(target, JSON.stringify({ ...c, YT_REFRESH_TOKEN: tokens.refresh_token }, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  console.log('Refresh token guardado fuera del repositorio. Configura REDES_CREDENTIALS_FILE con la ruta de salida.');
} catch { console.error('OAuth no completado. Revise configuración, ruta externa nueva y consentimiento; ningún token se imprime.'); process.exitCode = 1; }
finally { server?.close(); }
