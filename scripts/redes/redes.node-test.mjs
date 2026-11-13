import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { calendar, validate, localTime, publish, locked, json, atomic, writeReport, external, ROOT, preflight } from './core.mjs';
import { APIs, request } from './apis.mjs';

const now = new Date('2026-11-09T12:00:00Z');
const piece = (extra = {}) => ({ key: 'quinta-yt-es', platform: 'youtube', kind: 'short', language: 'es', file: './clip.mp4', title: 'Quinta justa', description: 'Practica en el sitio', tags: ['oído'], publishAt: calendar('2026-S46').firstEs, width: 1080, height: 1920, durationSeconds: 22, madeForKids: false, containsSyntheticMedia: false, ...extra });
const manifest = (pieces = [piece()]) => ({ version: 1, batch: '2026-S46', timeZone: 'America/Mexico_City', pieces });
const reply = (v, headers = {}) => new Response(JSON.stringify(v), { status: 200, headers });
const temporary = async action => {
  const dir = await mkdtemp(path.join(tmpdir(), 'storm-redes-'));
  try { await action(dir); } finally { await rm(dir, { recursive: true, force: true }); }
};

test('calendario ISO: jueves/domingo, EN 30 min después, CDMX sin DST', () => {
  assert.deepEqual(calendar('2026-S46'), { firstEs: '2026-11-12T19:00:00-06:00', firstEn: '2026-11-12T19:30:00-06:00', secondEs: '2026-11-15T12:00:00-06:00', secondEn: '2026-11-15T12:30:00-06:00', link: '2026-11-10T19:00:00-06:00' });
  assert.equal(calendar('2026-S53').secondEs, '2027-01-03T12:00:00-06:00');
  assert.throws(() => calendar('2025-S53'));
  assert.throws(() => calendar('2026-S00'));
  assert.equal(localTime('2026-07-01T19:00:00-06:00').toISOString(), '2026-07-02T01:00:00.000Z');
});
test('rechaza fechas inexistentes, formato sin zona y cambio de horario antiguo', () => {
  for (const s of ['2026-02-30T12:00:00-06:00', '2026-11-13T12:00:00', '2026-07-01T12:00:00-05:00']) assert.throws(() => localTime(s));
});
test('validación: IDs únicos, idiomas, tipos, archivo, etiquetas, declaraciones', () => {
  validate(manifest());
  assert.throws(() => validate(manifest([piece(), piece()])));
  for (const extra of [{ platform: 'instagram' }, { language: 'en', platform: 'facebook', kind: 'reel' }, { kind: 'link' }, { file: null }, { tags: [5] }, { title: 'a'.repeat(71) }, { madeForKids: undefined }, { containsSyntheticMedia: undefined }, { width: 1920 }]) assert.throws(() => validate(manifest([piece(extra)])));
});
test('programación nunca inmediata y ventana conservadora Facebook', async () => {
  await assert.rejects(publish(manifest(), { now: new Date('2026-12-01') }));
  await assert.rejects(publish(manifest([piece({ platform: 'facebook', kind: 'reel' })]), { now: new Date('2026-10-01') }));
});
test('dry-run no llama adaptador ni guarda y conserva el objeto', async () => {
  const m = manifest(); const original = structuredClone(m);
  const fail = () => assert.fail('Efecto lateral en simulación');
  const r = await publish(m, { now, adapter: { upload: fail }, save: fail });
  assert.equal(r[0].action, 'programar'); assert.deepEqual(m, original);
});
test('journal previo, checkpoint ID y segunda ejecución sin nuevas subidas', async () => {
  const m = manifest(); const states = []; let uploads = 0;
  const adapter = { upload: async (p, checkpoint) => { uploads++; assert.equal(states[0].state, 'uploading'); await checkpoint('yt_123'); return 'yt_123'; } };
  const save = async () => states.push(structuredClone(m.pieces[0].remote));
  await publish(m, { now, confirmed: true, adapter, save });
  await publish(m, { now, confirmed: true, adapter, save });
  assert.equal(uploads, 1); assert.equal(states[1].id, 'yt_123'); assert.equal(states.at(-1).state, 'scheduled');
});
test('respuesta perdida bloquea reintento y detiene piezas restantes', async () => {
  const m = manifest([piece(), piece({ key: 'segunda' })]); let calls = 0;
  const adapter = { upload: async () => { calls++; throw new Error('token-no-debe-salir'); } };
  await assert.rejects(publish(m, { now, confirmed: true, adapter }), /Subida incierta/);
  assert.equal(m.pieces[0].remote.state, 'uncertain'); assert.equal(m.pieces[1].remote, undefined);
  await assert.rejects(publish(m, { now, confirmed: true, adapter }), /incierta/); assert.equal(calls, 1);
});
test('no llama API si falla la persistencia previa', async () => {
  await assert.rejects(publish(manifest(), { now, confirmed: true, save: async () => { throw new Error('disco'); }, adapter: { upload: () => assert.fail() } }), /disco/);
});
test('checkpoint conserva ID de Reel aunque finish falle', async () => {
  const m = manifest();
  await assert.rejects(publish(m, { now, confirmed: true, adapter: { upload: async (_, checkpoint) => { await checkpoint('123'); throw Error(); } } }));
  assert.deepEqual({ id: m.pieces[0].remote.id, state: m.pieces[0].remote.state }, { id: '123', state: 'uncertain' });
});
test('bloqueo excluye ejecuciones concurrentes y escritura JSON atómica', () => temporary(async dir => {
  const file = path.join(dir, 'm.json'); await atomic(file, manifest());
  await locked(file, async () => { await assert.rejects(locked(file, () => assert.fail()), /bloqueado/); });
  await locked(file, async () => {}); assert.equal((await json(file)).version, 1);
}));
test('credenciales rechazan repositorio y errores JSON no filtran contenido', () => temporary(async dir => {
  await assert.rejects(external(path.join(ROOT, 'package.json')), /fuera/);
  await assert.rejects(external('relative.json'), /absoluta/);
  const f = path.join(dir, 'secret.json'); await writeFile(f, '{very-secret');
  await assert.rejects(json(f), e => !e.message.includes('very-secret'));
}));
test('YouTube resumable: privado con publishAt, transferencia y checkpoint', () => temporary(async dir => {
  await writeFile(path.join(dir, 'clip.mp4'), 'mock video'); const calls = [];
  const api = new APIs({}, path.join(dir, 'm.json'), async (url, init) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) return reply({}, { location: 'https://www.googleapis.com/upload/session' });
    for await (const chunk of init.body) assert.ok(chunk);
    return reply({ id: 'youtube123' });
  });
  api.token = 'fake'; api.expires = Infinity;
  let id; await api.upload(piece(), async v => { id = v; });
  assert.equal(id, 'youtube123'); const body = JSON.parse(calls[0].init.body);
  assert.equal(body.status.privacyStatus, 'private'); assert.equal(body.status.publishAt, '2026-11-13T01:00:00.000Z'); assert.equal(calls[1].init.method, 'PUT');
}));
test('Facebook Reel: start, transferencia local y finish SCHEDULED', () => temporary(async dir => {
  await writeFile(path.join(dir, 'clip.mp4'), 'mock'); const calls = [];
  const api = new APIs({ FB_PAGE_ID: '123', FB_GRAPH_VERSION: 'v25.0', FB_PAGE_ACCESS_TOKEN: 'fake' }, path.join(dir, 'm.json'), async (url, init) => {
    calls.push({ url: String(url), init });
    if (calls.length === 1) return reply({ video_id: '456', upload_url: 'https://rupload.facebook.com/video-upload/456' });
    if (init.body?.[Symbol.asyncIterator]) for await (const chunk of init.body) assert.ok(chunk);
    return reply({ success: true });
  });
  let id; await api.upload(piece({ platform: 'facebook', kind: 'reel' }), async v => { id = v; });
  assert.equal(id, '456'); assert.equal(calls[2].init.body.get('video_state'), 'SCHEDULED'); assert.equal(calls[2].init.body.get('scheduled_publish_time'), String(+new Date(piece().publishAt) / 1000));
}));
test('Facebook texto y video usan published=false y fecha explícita', () => temporary(async dir => {
  await writeFile(path.join(dir, 'clip.mp4'), 'mock'); const calls = [];
  const api = new APIs({ FB_PAGE_ID: '123', FB_GRAPH_VERSION: 'v25.0', FB_PAGE_ACCESS_TOKEN: 'fake' }, path.join(dir, 'm.json'), async (url, init) => {
    calls.push({ url: String(url), init });
    if (init.body?.[Symbol.asyncIterator]) { let body = ''; for await (const chunk of init.body) body += chunk; assert.match(body, /name="published"\r\n\r\nfalse/); }
    return reply({ id: '456' });
  });
  await api.upload(piece({ platform: 'facebook', kind: 'link', link: 'https://example.com' }), async () => {});
  assert.equal(calls[0].init.body.get('published'), 'false');
  await api.upload(piece({ platform: 'facebook', kind: 'video' }), async () => {});
  assert.match(calls[1].url, /graph-video.facebook.com/);
}));
test('errores HTTP y transporte no imprimen secretos de la respuesta', async () => {
  await assert.rejects(request('https://example.com', {}, async () => new Response('very-secret', { status: 401 })), e => e.message === 'API: HTTP 401.');
  await assert.rejects(request('https://example.com', {}, async () => { throw Error('very-secret'); }), e => !e.message.includes('very-secret'));
});
test('preflight detecta MP4 ausente antes de cualquier subida', () => temporary(async dir => {
  const m = manifest([piece({ publishAt: '2099-11-13T19:00:00-06:00' })]);
  await assert.rejects(preflight(m, path.join(dir, 'm.json')), /ENOENT/);
}));
test('reportes verifican privacidad y preservan N/D, no falso cero', async () => {
  const api = new APIs({}, '/tmp/m.json', async () => reply({ items: [{ status: { privacyStatus: 'private' }, statistics: { viewCount: '0' } }] })); api.token = 'fake'; api.expires = Infinity;
  const r = await api.metrics(piece({ remote: { id: '123', state: 'scheduled' }, publishAt: '2025-11-01T12:00:00-06:00' }), '2026-11-12');
  assert.equal(r.state, 'no público'); assert.equal(r.views, null);
});
test('Facebook reporte usa video_insights y convierte ms a segundos', async () => {
  const calls = [];
  const api = new APIs({ FB_GRAPH_VERSION: 'v25.0', FB_PAGE_ACCESS_TOKEN: 'fake' }, '/tmp/m.json', async url => {
    calls.push(String(url)); const u = new URL(url);
    if (!u.pathname.endsWith('video_insights')) return reply({ published: true });
    return reply({ data: [{ values: [{ value: u.searchParams.get('metric') === 'blue_reels_play_count' ? 10 : 11000 }] }] });
  });
  const r = await api.metrics(piece({ platform: 'facebook', kind: 'reel', remote: { id: '123', state: 'scheduled' }, publishAt: '2025-11-01T12:00:00-06:00' }), '2026-11-12');
  assert.equal(r.views, 10); assert.equal(r.retention, '11.0 s / 50.0 % (aprox.)'); assert.equal(r.clicks, null);
  assert.ok(calls.slice(1).every(u => u.includes('/video_insights?')));
});
test('preparación rechaza página equivocada antes de subir', async () => {
  const api = new APIs({ FB_GRAPH_VERSION: 'v25.0', FB_PAGE_ID: '123', FB_PAGE_ACCESS_TOKEN: 'fake' }, '/tmp/m.json', async () => reply({ id: 'otra' }));
  await assert.rejects(api.prepare(new Set(['facebook'])), /página esperada/);
});
test('reporte y bitácora son repetibles, sin duplicar entrada', () => temporary(async dir => {
  const log = path.join(dir, 'BITACORA.md'); await writeFile(log, '# Bitácora\n');
  const rows = [{ key: 'quinta', state: 'publicado', views: 0, retention: null, clicks: null }];
  const options = { date: '2026-11-12', directory: path.join(dir, 'reportes'), log };
  await writeReport(manifest(), rows, options); rows[0].views = 4;
  const f = await writeReport(manifest(), rows, options);
  assert.equal((await readFile(log, 'utf8')).split('<!-- reporte:').length, 2);
  assert.match(await readFile(f, 'utf8'), /4 \| N\/D \| N\/D/);
}));
