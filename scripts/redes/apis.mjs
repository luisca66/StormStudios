import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import path from 'node:path';
import { check } from './core.mjs';

// Never expose response bodies, URLs or headers in exceptions (may contain tokens).
export async function request(url, init = {}, fetcher = fetch) {
  let response;
  try { response = await fetcher(url, { ...init, redirect: 'error', signal: AbortSignal.timeout(300000) }); }
  catch { throw new Error('Fallo de transporte; resultado remoto desconocido.'); }
  check(response.ok, `API: HTTP ${response.status}.`);
  return response;
}
export async function data(url, init, fetcher) {
  const r = await request(url, init, fetcher);
  let value;
  try { value = await r.json(); } catch { throw new Error('Respuesta API no válida.'); }
  check(!value.error, 'La API rechazó la operación.');
  return value;
}
export const SCOPES = ['youtube.upload', 'youtube.readonly', 'yt-analytics.readonly'].map(s => `https://www.googleapis.com/auth/${s}`).join(' ');
export async function googleToken(c, fetcher) {
  for (const n of ['YT_CLIENT_ID', 'YT_CLIENT_SECRET', 'YT_REFRESH_TOKEN']) check(c[n], `Falta ${n}.`);
  const r = await data('https://oauth2.googleapis.com/token', { method: 'POST', body: new URLSearchParams({ client_id: c.YT_CLIENT_ID, client_secret: c.YT_CLIENT_SECRET, refresh_token: c.YT_REFRESH_TOKEN, grant_type: 'refresh_token' }) }, fetcher);
  check(typeof r.access_token === 'string', 'Google no devolvió access token.');
  return r.access_token;
}
export class APIs {
  constructor(c, manifest, fetcher = fetch) { this.c = c; this.base = path.dirname(manifest); this.fetcher = fetcher; }
  async yt() {
    if (!this.token || Date.now() > this.expires) { this.token = await googleToken(this.c, this.fetcher); this.expires = Date.now() + 3000000; }
    return { Authorization: `Bearer ${this.token}` };
  }
  async graph(edge, params = {}, method = 'GET') {
    const v = this.c.FB_GRAPH_VERSION;
    check(/^v\d+\.0$/.test(v || ''), 'Falta FB_GRAPH_VERSION (versión de la app de Meta).');
    check(this.c.FB_PAGE_ACCESS_TOKEN, 'Falta FB_PAGE_ACCESS_TOKEN.');
    const url = new URL(`https://graph.facebook.com/${v}/${edge}`);
    const init = { method, headers: { Authorization: `Bearer ${this.c.FB_PAGE_ACCESS_TOKEN}` } };
    if (method === 'GET') url.search = new URLSearchParams(params).toString();
    else init.body = new URLSearchParams(params);
    return data(url, init, this.fetcher);
  }
  async prepare(platforms) {
    if (platforms.has('youtube')) {
      check(this.c.YT_CHANNEL_ID, 'Falta YT_CHANNEL_ID.');
      const channel = await data('https://www.googleapis.com/youtube/v3/channels?part=id&mine=true', { headers: await this.yt() }, this.fetcher);
      check(channel.items?.some(x => x.id === this.c.YT_CHANNEL_ID), 'OAuth no corresponde al canal esperado.');
    }
    if (platforms.has('facebook')) {
      check(/^\d+$/.test(this.c.FB_PAGE_ID || ''), 'Falta FB_PAGE_ID válido.');
      const page = await this.graph('me', { fields: 'id' });
      check(page.id === this.c.FB_PAGE_ID, 'El token no corresponde a la página esperada.');
    }
  }
  async upload(p, checkpoint) {
    if (p.platform === 'youtube') return this.youtubeUpload(p, checkpoint);
    const page = this.c.FB_PAGE_ID;
    const when = String(Math.floor(+new Date(p.publishAt) / 1000));
    if (p.kind === 'link') {
      const r = await this.graph(`${page}/feed`, { message: p.description, link: p.link, published: 'false', scheduled_publish_time: when }, 'POST');
      await checkpoint(r.id); return r.id;
    }
    if (p.kind === 'video') {
      // Streaming multipart, without loading the MP4 into RAM.
      const boundary = `storm-${crypto.randomUUID()}`;
      const fields = { title: p.title, description: p.description, published: 'false', scheduled_publish_time: when };
      const file = path.resolve(this.base, p.file);
      const prefix = Object.entries(fields).map(([k, v]) => `--${boundary}\r\nContent-Disposition: form-data; name="${k}"\r\n\r\n${v}\r\n`).join('') + `--${boundary}\r\nContent-Disposition: form-data; name="source"; filename="video.mp4"\r\nContent-Type: video/mp4\r\n\r\n`;
      const suffix = `\r\n--${boundary}--\r\n`;
      async function* body() { yield Buffer.from(prefix); yield* createReadStream(file); yield Buffer.from(suffix); }
      const r = await data(`https://graph-video.facebook.com/${this.c.FB_GRAPH_VERSION}/${page}/videos`, { method: 'POST', headers: { Authorization: `Bearer ${this.c.FB_PAGE_ACCESS_TOKEN}`, 'Content-Type': `multipart/form-data; boundary=${boundary}`, 'Content-Length': String(Buffer.byteLength(prefix) + (await stat(file)).size + Buffer.byteLength(suffix)) }, body: body(), duplex: 'half' }, this.fetcher);
      await checkpoint(r.id); return r.id;
    }
    const start = await this.graph(`${page}/video_reels`, { upload_phase: 'start' }, 'POST');
    await checkpoint(start.video_id); // Preserve the ID before transfer/processing/finish.
    const upload = new URL(start.upload_url);
    check(upload.protocol === 'https:' && upload.hostname === 'rupload.facebook.com' && !upload.username && !upload.password, 'Host de subida inesperado.');
    const file = path.resolve(this.base, p.file); const size = (await stat(file)).size;
    const transferred = await data(upload, { method: 'POST', headers: { Authorization: `OAuth ${this.c.FB_PAGE_ACCESS_TOKEN}`, offset: '0', file_size: String(size), 'Content-Type': 'application/octet-stream', 'Content-Length': String(size) }, body: createReadStream(file), duplex: 'half' }, this.fetcher);
    check(transferred.success === true, 'Transferencia Reel no confirmada.');
    const finish = await this.graph(`${page}/video_reels`, { upload_phase: 'finish', video_id: start.video_id, video_state: 'SCHEDULED', scheduled_publish_time: when, title: p.title, description: p.description }, 'POST');
    check(finish.success === true, 'Programación Reel no confirmada.');
    return start.video_id;
  }
  async youtubeUpload(p, checkpoint) {
    const file = path.resolve(this.base, p.file); const size = (await stat(file)).size;
    const headers = await this.yt();
    const session = await request('https://www.googleapis.com/upload/youtube/v3/videos?uploadType=resumable&part=snippet,status', {
      method: 'POST', headers: { ...headers, 'Content-Type': 'application/json', 'X-Upload-Content-Type': 'video/mp4', 'X-Upload-Content-Length': String(size) },
      body: JSON.stringify({ snippet: { title: p.title, description: p.description, tags: p.tags, defaultLanguage: p.language, defaultAudioLanguage: p.language, categoryId: '27' }, status: { privacyStatus: 'private', publishAt: new Date(p.publishAt).toISOString(), selfDeclaredMadeForKids: p.madeForKids, containsSyntheticMedia: p.containsSyntheticMedia } }),
    }, this.fetcher);
    const location = new URL(session.headers.get('location'));
    check(location.protocol === 'https:' && location.hostname === 'www.googleapis.com' && !location.username && !location.password, 'Host de subida inesperado.');
    const result = await data(location, { method: 'PUT', headers: { ...headers, 'Content-Type': 'video/mp4', 'Content-Length': String(size) }, body: createReadStream(file), duplex: 'half' }, this.fetcher);
    await checkpoint(result.id); return result.id;
  }
  async metric(edge, name, video = false) {
    try { const r = await this.graph(`${edge}/${video ? 'video_insights' : 'insights'}`, { metric: name }); return r.data?.[0]?.values?.at(-1)?.value ?? null; }
    catch { return null; } // Permissions, retired metric, no data: N/D, never fabricated zero.
  }
  async metrics(p, endDate) {
    const row = { key: p.key, state: 'pendiente', views: null, retention: null, clicks: null, note: '' };
    if (!p.remote?.id || p.remote.state !== 'scheduled') return row;
    if (+new Date(p.publishAt) > Date.now()) return { ...row, state: 'programado' };
    const id = p.remote.id;
    if (p.platform === 'youtube') {
      const headers = await this.yt();
      const r = await data(`https://www.googleapis.com/youtube/v3/videos?part=status,statistics&id=${encodeURIComponent(id)}`, { headers }, this.fetcher);
      const video = r.items?.[0];
      if (!video || video.status?.privacyStatus !== 'public') return { ...row, state: 'no público', note: 'Revisar Studio: procesamiento, privacidad o restricción.' };
      row.state = 'publicado'; row.views = video.statistics?.viewCount ?? null;
      const url = new URL('https://youtubeanalytics.googleapis.com/v2/reports');
      // YouTube Analytics dates use Pacific time. Include the previous day to cover CDMX release.
      const startDate = new Date(+new Date(p.publishAt) - 86400000).toISOString().slice(0, 10);
      url.search = new URLSearchParams({ ids: 'channel==MINE', startDate, endDate, filters: `video==${id}`, metrics: 'averageViewDuration,averageViewPercentage' }).toString();
      try { const a = await data(url, { headers }, this.fetcher); const v = a.rows?.[0]; if (v) row.retention = `${v[0]} s / ${v[1]} %`; }
      catch { row.note = 'Analytics no disponible (permisos, umbral o demora).'; }
      return row;
    }
    const status = await this.graph(id, { fields: p.kind === 'link' ? 'is_published' : 'published' });
    if (!(status.is_published ?? status.published)) return { ...row, state: 'no publicado', note: 'Comprobar Business Suite.' };
    row.state = 'publicado';
    if (p.kind === 'link') {
      const clicks = await this.metric(id, 'post_clicks_by_type');
      row.clicks = clicks && typeof clicks === 'object' ? clicks['link clicks'] ?? null : null;
    } else {
      row.views = await this.metric(id, p.kind === 'reel' ? 'blue_reels_play_count' : 'total_video_views', true);
      const avg = await this.metric(id, p.kind === 'reel' ? 'blue_reels_avg_watch_time' : 'total_video_avg_time_watched', true);
      if (typeof avg === 'number') row.retention = `${(avg / 1000).toFixed(1)} s / ${(avg / 1000 / p.durationSeconds * 100).toFixed(1)} % (aprox.)`;
    }
    row.note = 'N/D: métrica no expuesta, retirada o sin permisos/datos. Reels sin clics externos medibles aquí.';
    return row;
  }
}
