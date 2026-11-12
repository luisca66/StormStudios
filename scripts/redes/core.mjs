import { readFile, writeFile, rename, open, unlink, stat, realpath, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const REDES = path.join(ROOT, 'apps-src/plan-lanzamiento/redes');
export const ZONE = 'America/Mexico_City';
export function check(ok, message) { if (!ok) throw new Error(message); }
export async function json(file) {
  const raw = await readFile(file, 'utf8');
  try { return JSON.parse(raw.replace(/^\uFEFF/, '')); }
  catch { throw new Error('JSON inválido; revise el archivo sin copiar credenciales a registros.'); }
}
export async function atomic(file, value) {
  const temp = `${file}.tmp`;
  await writeFile(temp, typeof value === 'string' ? value : `${JSON.stringify(value, null, 2)}\n`, { mode: 0o600 });
  await rename(temp, file);
}
export async function locked(file, action) {
  const lock = `${file}.lock`;
  let handle;
  try { handle = await open(lock, 'wx'); }
  catch { throw new Error('Archivo bloqueado: otra ejecución o cierre inesperado; consulte el documento.'); }
  try { return await action(); } finally { await handle.close(); await unlink(lock); }
}
export function localTime(value) {
  check(typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:00-06:00$/.test(value), 'publishAt: use AAAA-MM-DDTHH:mm:00-06:00 (CDMX).');
  const d = new Date(value);
  check(Number.isFinite(+d), 'Fecha inválida.');
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-CA', { timeZone: ZONE, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d).map(p => [p.type, p.value]));
  check(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:00-06:00` === value, 'Fecha inexistente o desfase incorrecto para CDMX.');
  return d;
}
// Monday of an ISO week. Proposed times, not claims about audience engagement.
export function calendar(batch) {
  check(/^\d{4}-S\d{2}$/.test(batch), 'Lote: use AAAA-SNN.');
  const [year, week] = batch.split('-S').map(Number);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const monday = new Date(+jan4 + (1 - (jan4.getUTCDay() || 7) + (week - 1) * 7) * 86400000);
  const thursday = new Date(+monday + 3 * 86400000);
  check(week >= 1 && week <= 53 && thursday.getUTCFullYear() === year, 'Semana ISO inválida.');
  const at = (day, hour) => `${new Date(+monday + day * 86400000).toISOString().slice(0, 10)}T${hour}:00-06:00`;
  return { firstEs: at(3, '19:00'), firstEn: at(3, '19:30'), secondEs: at(6, '12:00'), secondEn: at(6, '12:30'), link: at(1, '19:00') };
}
export function validate(m, { now = new Date(), scheduling = false } = {}) {
  check(m?.version === 1 && m.timeZone === ZONE, 'Manifiesto versión 1 y zona America/Mexico_City requeridos.');
  calendar(m.batch);
  check(Array.isArray(m.pieces) && m.pieces.length > 0, 'Faltan piezas.');
  const ids = new Set();
  for (const p of m.pieces) {
    check(/^[a-z0-9-]+$/.test(p.key || '') && !ids.has(p.key), 'Clave inválida o repetida.'); ids.add(p.key);
    check(['youtube', 'facebook'].includes(p.platform), 'Plataforma inválida.');
    check(['es', 'en'].includes(p.language) && (p.platform !== 'facebook' || p.language === 'es'), 'Idioma inválido; Facebook solo ES.');
    check((p.platform === 'youtube' ? ['short'] : ['reel', 'video', 'link']).includes(p.kind), 'Tipo inválido.');
    check(typeof p.title === 'string' && p.title.trim().length > 0 && p.title.length <= (p.platform === 'youtube' ? 70 : 255), 'Título inválido.');
    check(typeof p.description === 'string' && p.description.trim().length > 0 && Buffer.byteLength(p.description, 'utf8') <= 5000, 'Descripción inválida (máximo 5000 bytes UTF-8).');
    check(Array.isArray(p.tags) && p.tags.every(t => typeof t === 'string' && t.length > 0) && p.tags.join(',').length <= 450, 'Etiquetas inválidas.');
    if (p.kind === 'link') check(/^https:\/\//.test(p.link || '') && !new URL(p.link).username && !new URL(p.link).password, 'Enlace HTTPS requerido.');
    else {
      check(typeof p.file === 'string' && /\.mp4$/i.test(p.file), 'Archivo MP4 requerido.');
      check(p.width === 1080 && p.height === 1920 && p.durationSeconds >= 3 && p.durationSeconds <= 60, 'Video: 1080×1920 y 3–60 segundos.');
    }
    if (p.platform === 'youtube') check(typeof p.madeForKids === 'boolean' && typeof p.containsSyntheticMedia === 'boolean', 'Declare audiencia infantil y contenido sintético.');
    const date = localTime(p.publishAt);
    if (p.remote) {
      check(['uploading', 'uncertain', 'scheduled'].includes(p.remote.state), 'Estado remoto inválido.');
      if (p.remote.id) check(/^[\w-]+$/.test(p.remote.id), 'ID remoto inválido.');
      if (p.remote.state === 'scheduled') check(!!p.remote.id, 'Programado sin ID.');
    }
    if (scheduling && !p.remote) {
      check(+date >= +now + 15 * 60000, 'Programación: deje al menos 15 minutos; nunca publica inmediatamente.');
      if (p.platform === 'facebook') check(+date <= +now + 28 * 86400000, 'Facebook: programe dentro de 28 días.');
    }
  }
  return m;
}
export async function preflight(m, manifest) {
  validate(m, { scheduling: true });
  for (const p of m.pieces.filter(p => !p.remote && p.kind !== 'link')) {
    const s = await stat(path.resolve(path.dirname(manifest), p.file));
    check(s.isFile() && s.size > 0, 'Falta un MP4 o está vacío.');
  }
  check(!m.pieces.some(p => p.remote && p.remote.state !== 'scheduled'), 'Hay una subida incierta. Reconcilie antes de reintentar.');
}
export async function publish(m, { confirmed = false, adapter, save = async () => {}, now = new Date() } = {}) {
  validate(m, { now, scheduling: true });
  check(!m.pieces.some(p => p.remote && p.remote.state !== 'scheduled'), 'Subida incierta: revise la plataforma y reconcilie.');
  const plan = m.pieces.map(p => ({ key: p.key, action: p.remote?.id ? 'omitido' : 'programar', platform: p.platform, publishAt: p.publishAt }));
  if (!confirmed) return plan;
  for (const p of m.pieces) {
    if (p.remote?.id) continue;
    p.remote = { state: 'uploading', attemptedAt: new Date().toISOString() };
    await save(m); // Journal BEFORE any remote mutation; failure stops the batch.
    try {
      const checkpoint = async id => { check(/^[\w-]+$/.test(id || ''), 'API sin ID válido.'); p.remote.id = id; await save(m); };
      const id = await adapter.upload(p, checkpoint);
      check(/^[\w-]+$/.test(id || ''), 'API sin ID válido.');
      p.remote = { ...p.remote, id, state: 'scheduled' }; await save(m);
    } catch {
      p.remote.state = 'uncertain'; await save(m);
      throw new Error(`Subida incierta en ${p.key}; se detuvo el lote. Consulte reconciliación.`);
    }
  }
  return plan;
}
export function args(argv, allowed) {
  const options = {}; const positional = [];
  for (const arg of argv) {
    if (arg.startsWith('--')) { check(allowed.includes(arg), 'Opción desconocida.'); options[arg] = true; }
    else positional.push(arg);
  }
  check(positional.length === 1 && !(options['--confirmar'] && options['--dry-run']), 'Indique un manifiesto y solo un modo.');
  return { file: path.resolve(positional[0]), ...options };
}
export async function external(file, create = false) {
  check(file && path.isAbsolute(file), 'Credenciales: indique una ruta absoluta fuera del repositorio.');
  const resolved = create ? path.join(await realpath(path.dirname(file)), path.basename(file)) : await realpath(file);
  const root = await realpath(ROOT);
  const rel = path.relative(root, resolved);
  check(rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel), 'Las credenciales deben estar fuera del repositorio (incluidos enlaces).');
  return resolved;
}
export async function credentials(env = process.env) {
  const stored = env.REDES_CREDENTIALS_FILE ? await json(await external(env.REDES_CREDENTIALS_FILE)) : {};
  const names = ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN', 'YT_CHANNEL_ID', 'FB_PAGE_ID', 'FB_PAGE_ACCESS_TOKEN', 'FB_GRAPH_VERSION'];
  return Object.fromEntries(names.map(n => [n, env[n] || stored[n]]));
}
export async function writeReport(m, rows, { date, directory = path.join(REDES, 'reportes'), log = path.join(REDES, 'BITACORA.md') }) {
  await mkdir(directory, { recursive: true });
  const name = `${date}-${m.batch}.md`;
  const safe = v => String(v ?? 'N/D').replace(/[|\r\n]/g, ' ');
  const body = `# Redes · ${m.batch} · ${date}\n\nInstantánea acumulada desde la publicación; no son incrementos semanales. N/D no significa cero.\n\n| Pieza | Estado | Vistas | Retención | Clics | Nota |\n|---|---|---:|---|---:|---|\n${rows.map(r => `| ${[r.key, r.state, r.views, r.retention, r.clicks, r.note].map(safe).join(' | ')} |`).join('\n')}\n\nClics de YouTube al sitio: N/D; usar analítica UTM. No comparar directamente vistas de redes distintas.\n`;
  await atomic(path.join(directory, name), body);
  await locked(log, async () => {
    const old = await readFile(log, 'utf8');
    const marker = `<!-- reporte:${date}:${m.batch} -->`;
    const entry = `${marker}\n- ${date}: [Reporte ${m.batch}](reportes/${name}); ${rows.map(r => `${safe(r.key)}: ${safe(r.state)}`).join('; ')}.\n`;
    const start = old.indexOf(marker);
    await atomic(log, start < 0 ? `${old.trimEnd()}\n\n${entry}` : old.slice(0, start) + entry + old.slice(old.indexOf('\n', old.indexOf('\n', start) + 1) + 1));
  });
  return path.join(directory, name);
}
