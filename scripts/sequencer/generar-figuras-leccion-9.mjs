// Based on lessons/leccion-8/graficos/generar-figuras-leccion-8.mjs.
// OUT_DIR selects the destination; SVGs keep a transparent background.
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname, basename } from 'node:path';
import { fileURLToPath } from 'node:url';
const here = dirname(fileURLToPath(import.meta.url));
const out = resolve(process.env.OUT_DIR ?? (basename(here) === 'graficos' ? here : resolve(here, '../../public/images/curso/leccion-9')));
await mkdir(out, { recursive: true });
const C = { text: '#f0eeff', label: '#c4b5fd', muted: '#c6c3d5', amber: '#fcd34d', line: '#6d5fa8' };
const SERIF = 'Georgia, &quot;Times New Roman&quot;, serif';
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
const T = (es, en, lang) => lang === 'es' ? es : en;
const text = (x, y, value, size = 32, color = C.text, anchor = 'middle') => `<text x="${x}" y="${y}" fill="${color}" font-family="${SERIF}" font-size="${size}" text-anchor="${anchor}">${esc(value)}</text>`;
const LETTER = { I: 0.40, V: 0.72 };
function chord(cx, y, roman, inv = 'f', size = 42, color = C.text, wrap = false) {
  const w = [...roman].reduce((sum, ch) => sum + LETTER[ch] * size, 0);
  const par = size * 0.36, digit = size * 0.5 * 0.62;
  const parentheses = inv === 'both' || wrap;
  const width = w + (inv === 'f' ? 0 : size * 0.06 + digit) + (parentheses ? 2 * par : 0);
  let x = cx - width / 2, s = '';
  if (wrap) { s += text(x, y, '(', size, color, 'start'); x += par; }
  s += text(x, y, roman, size, color, 'start'); x += w + size * 0.06;
  if (inv !== 'f') {
    if (inv === 'both') { s += text(x, y, '(', size, color, 'start'); x += par; }
    s += text(x, y - size * 0.36, '6', size * 0.5, color, 'start');
    s += text(x, y + size * 0.1, inv === '64' ? '4' : '3', size * 0.5, color, 'start');
    x += digit;
    if (parentheses) s += text(x + size * 0.04, y, ')', size, color, 'start');
  }
  return s;
}
const svg = (height, title, body) => `<svg width="1600" height="${height}" viewBox="0 0 1600 ${height}" xmlns="http://www.w3.org/2000/svg" role="img"><title>${esc(title)}</title>${body}</svg>\n`;
function regiones(lang) {
  let s = '';
  const names = lang === 'es' ? ['Subdominante (SD)', 'Dominante (D)', 'Tónica (T)'] : ['Subdominant (SD)', 'Dominant (D)', 'Tonic (T)'];
  names.forEach((name, i) => {
    const x = 280 + i * 520;
    s += `<rect x="${x - 220}" y="80" width="440" height="160" rx="18" fill="none" stroke="${C.line}" stroke-width="3"/>`;
    s += text(x, 175, name, 36, C.label);
    s += text(x, 315, ['IV, II', 'V', 'I'][i], 44);
    if (i < 2) s += text(x + 260, 178, '→', 52, C.amber);
  });
  s += text(800, 420, T('cada vez más importantes', 'more and more important', lang), 34, C.muted);
  return svg(480, T('Regiones tonales', 'Tonal regions', lang), s);
}
function tipos(lang) {
  let s = '';
  const cols = [590, 900, 1180, 1430];
  ['SD', '→', 'D', 'T'].forEach((v, i) => { s += text(cols[i], 60, v, 38, C.label); });
  const rows = [
    [T('auténtica', 'authentic', lang), 120, 210, [], false, 'V', 'I'],
    ['plagal', 210, 300, [['IV', 'f']], false, null, 'I'],
    [T('completa', 'complete', lang), 300, 470, [['IV', 'both'], ['II', 'both'], ['VI', 'f']], false, 'V', 'I'],
    [T('ampliada', 'extended', lang), 470, 610, [['IV', 'both'], ['II', 'both']], true, 'V', 'I'],
  ];
  for (const [name, top, bottom, sd, extended, d, t] of rows) {
    const y = (top + bottom) / 2 + 14;
    s += `<line x1="40" x2="1560" y1="${top}" y2="${top}" stroke="${C.line}"/>`;
    s += text(70, y, name, 38, C.label, 'start');
    if (!sd.length) s += text(cols[0], y, '—', 34, C.muted);
    sd.forEach(([r, inv], i) => { s += chord(cols[0], y + (i - (sd.length - 1) / 2) * 49, r, inv); });
    s += extended ? chord(cols[1], y, 'I', '64', 44, C.amber, true) : text(cols[1], y, '—', 34, C.muted);
    s += d ? chord(cols[2], y, d) : text(cols[2], y, '—', 34, C.muted);
    s += chord(cols[3], y, t);
  }
  s += `<line x1="40" x2="1560" y1="610" y2="610" stroke="${C.line}"/>`;
  [400, 750, 1050, 1320].forEach(x => { s += `<line x1="${x}" x2="${x}" y1="18" y2="610" stroke="${C.line}"/>`; });
  s += text(800, 659, T('(6/3): fundamental o seis tres · los dos últimos acordes, en estado fundamental', '(6/3): root position or six three · the last two chords in root position', lang), 28, C.muted);
  s += text(800, 700, T('I 6/4 en pulso fuerte', 'I 6/4 on a strong beat', lang), 28, C.muted);
  return svg(730, T('Tipos de cadencia', 'Types of cadence', lang), s);
}
for (const lang of ['es', 'en']) for (const [name, fn] of [['regiones', regiones], ['tipos-cadencia', tipos]]) {
  await writeFile(resolve(out, `${name}-${lang}.svg`), fn(lang));
}
console.log('Figuras escritas en', out);
