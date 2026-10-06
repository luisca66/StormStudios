// node lessons/leccion-7/graficos/generar-figuras-leccion-7.mjs   (OUT_DIR=public/images/curso/leccion-7 en el sitio)
// Figuras de la Lección 7 (ES/EN) con el estilo de las lecciones 5 y 6: glifos de
// VexFlow 4.2.2, pentagramas de 10 px, etiquetas Georgia y la misma paleta oscura.
// Usa Playwright y VexFlow del repo del sitio (SITE_REPO). Cada nota dibujada se
// comprueba contra la geometría diatónica del pentagrama y cada intervalo anotado
// se recalcula a partir de las notas.
import { createRequire } from 'node:module';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const site = process.env.SITE_REPO ?? 'C:/Users/Luis/Documents/Claude Cowork/nuevo_website/storm-studios/StormStudios';
const { chromium } = createRequire(resolve(site, 'package.json'))('@playwright/test');
const out = resolve(process.env.OUT_DIR ?? here);
const preview = resolve(process.env.PREVIEW_DIR ?? resolve(here, '../../../.local-work/leccion-7/figuras'));
await mkdir(preview, { recursive: true });

const T = (es, en) => ({ es, en });
const OK = 'ok', NO = 'no';
// Cada grupo: columnas de notas; en cada columna, notas del pentagrama de sol (t) y de fa (b).
// `iv` = intervalo que se rotula y se verifica: [columna, columna, pentagrama] (melódico) o
// [[col, 't'|'b', índice], [col, 't'|'b', índice]] por columna (armónico).
const FIGURES = {
  'intervalos-melodicos': {
    title: T('Intervalos melódicos permitidos ↑↓', 'Allowed melodic intervals ↑↓'),
    staves: ['t'], col: 56, width: 1200,
    rows: [[
      { header: T('Grado conjunto', 'Step'), label: T('2ª menor', 'minor 2nd'), cols: [{ t: ['E4'] }, { t: ['F4'] }, { t: ['E4'] }], check: ['m2', 'm2'] },
      { header: T('Grado conjunto', 'Step'), label: T('2ª mayor', 'major 2nd'), cols: [{ t: ['G4'] }, { t: ['A4'] }, { t: ['G4'] }], check: ['M2', 'M2'] },
      { header: T('Camino corto', 'Short path'), label: T('3ª menor', 'minor 3rd'), cols: [{ t: ['D4'] }, { t: ['F4'] }, { t: ['D4'] }], check: ['m3', 'm3'] },
      { header: T('Camino corto', 'Short path'), label: T('3ª mayor', 'major 3rd'), cols: [{ t: ['F4'] }, { t: ['A4'] }, { t: ['F4'] }], check: ['M3', 'M3'] },
      { header: T('Salto corto', 'Short leap'), label: T('4ª justa', 'perfect 4th'), cols: [{ t: ['A4'] }, { t: ['D5'] }, { t: ['A4'] }], check: ['P4', 'P4'] },
    ], [
      { header: T('Saltos largos', 'Long leaps'), label: T('5ª justa', 'perfect 5th'), cols: [{ t: ['G4'] }, { t: ['D5'] }, { t: ['G4'] }], check: ['P5', 'P5'] },
      { header: T('Saltos largos', 'Long leaps'), label: T('6ª menor', 'minor 6th'), cols: [{ t: ['E4'] }, { t: ['C5'] }, { t: ['E4'] }], check: ['m6', 'm6'] },
      { header: T('Saltos largos', 'Long leaps'), label: T('6ª mayor', 'major 6th'), cols: [{ t: ['F4'] }, { t: ['D5'] }, { t: ['F4'] }], check: ['M6', 'M6'] },
      { header: T('Saltos largos', 'Long leaps'), label: T('8ª justa', 'perfect octave'), cols: [{ t: ['D4'] }, { t: ['D5'] }, { t: ['D4'] }], check: ['P8', 'P8'] },
    ]],
    footer: T('Ascendentes o descendentes · sin aumentados, sin 7as y nada mayor que la octava', 'Ascending or descending · no augmented intervals, no 7ths and nothing larger than an octave'),
  },
  'disminuidos': {
    title: T('Intervalos disminuidos · Do mayor', 'Diminished intervals · C major'),
    staves: ['t'],
    rows: [[
      { mark: OK, label: T('5ª dis. ↑, luego baja', 'dim. 5th ↑, then down'), cols: [{ t: ['B4'] }, { t: ['F5'] }, { t: ['E5'] }], check: ['d5', 'm2'] },
      { mark: OK, label: T('5ª dis. ↓, luego sube', 'dim. 5th ↓, then up'), cols: [{ t: ['F5'] }, { t: ['B4'] }, { t: ['C5'] }], check: ['d5', 'm2'] },
    ], [
      { mark: NO, label: T('5ª dis. sin compensar', 'dim. 5th not compensated'), cols: [{ t: ['B4'] }, { t: ['F5'] }, { t: ['G5'] }], check: ['d5', 'M2'] },
      { mark: NO, label: T('4ª aumentada', 'augmented 4th'), cols: [{ t: ['F4'] }, { t: ['B4'] }], check: ['A4'] },
    ]],
    footer: T('La 4ª y la 7ª disminuidas aparecen en el modo menor', 'Diminished 4ths and 7ths appear in the minor mode'),
  },
  'saltos-sucesivos': {
    title: T('Saltos sucesivos', 'Successive leaps'),
    staves: ['t'],
    rows: [[
      { mark: OK, label: T('4ª y 5ª ↑', '4th and 5th ↑'), cols: [{ t: ['D4'] }, { t: ['G4'] }, { t: ['D5'] }], check: ['P4', 'P5'] },
      { mark: OK, label: T('5ª y 4ª ↓', '5th and 4th ↓'), cols: [{ t: ['G5'] }, { t: ['C5'] }, { t: ['G4'] }], check: ['P5', 'P4'] },
      { mark: OK, label: T('cambio de dirección', 'change of direction'), cols: [{ t: ['E4'] }, { t: ['C5'] }, { t: ['F4'] }], check: ['m6', 'P5'] },
    ], [
      { mark: NO, label: T('4ª y 4ª', '4th and 4th'), cols: [{ t: ['E4'] }, { t: ['A4'] }, { t: ['D5'] }], check: ['P4', 'P4'] },
      { mark: NO, label: T('5ª y 6ª', '5th and 6th'), cols: [{ t: ['F4'] }, { t: ['C5'] }, { t: ['A5'] }], check: ['P5', 'M6'] },
      { mark: NO, label: T('8ª con la sensible', 'octave on the leading tone'), cols: [{ t: ['B3'] }, { t: ['B4'] }], check: ['P8'] },
    ]],
  },
  'paralelas': {
    col: 86, gap: 36,
    title: T('5as y 8as paralelas y contrarias', 'Parallel and contrary 5ths and octaves'),
    staves: ['t', 'b'],
    rows: [[
      { mark: NO, label: T('8as paralelas', 'parallel octaves'), cols: [{ t: ['C5'], b: ['C3'] }, { t: ['D5'], b: ['D3'] }], harm: ['P8', 'P8'] },
      { mark: NO, label: T('8as contrarias', 'contrary octaves'), cols: [{ t: ['G4'], b: ['G3'] }, { t: ['C5'], b: ['C3'] }], harm: ['P8', 'P8'] },
      { mark: NO, label: T('5as paralelas', 'parallel 5ths'), cols: [{ t: ['G4'], b: ['C3'] }, { t: ['A4'], b: ['D3'] }], harm: ['P5', 'P5'] },
      { mark: NO, label: T('5as contrarias', 'contrary 5ths'), cols: [{ t: ['G4'], b: ['C3'] }, { t: ['C5'], b: ['F2'] }], harm: ['P5', 'P5'] },
    ]],
    footer: T('Soprano y bajo · el unísono cuenta como 8ª', 'Soprano and bass · the unison counts as an octave'),
  },
  'quintas-permitidas': {
    col: 100, gap: 44,
    title: T('5as permitidas', 'Allowed 5ths'),
    staves: ['t', 'b'],
    rows: [[
      { mark: OK, label: T('5ª justa → 5ª dis.', 'perfect → dim. 5th'), cols: [{ t: ['G4'], b: ['C3'] }, { t: ['F4'], b: ['B2'] }], harm: ['P5', 'd5'] },
      { mark: OK, label: T('5ª dis. → 5ª justa', 'dim. → perfect 5th'), cols: [{ t: ['F4'], b: ['B2'] }, { t: ['G4'], b: ['C3'] }], harm: ['d5', 'P5'] },
      { mark: OK, label: T('contrarias: tenor y bajo', 'contrary: tenor and bass'), cols: [{ b: ['C3', 'G3'] }, { b: ['F2', 'C4'] }], harm: ['P5', 'P5'] },
    ]],
    footer: T('Las 5as contrarias solo se prohíben entre soprano y bajo', 'Contrary 5ths are forbidden only between soprano and bass'),
  },
  'saltos-simultaneos': {
    col: 100, gap: 44,
    title: T('Saltos simultáneos', 'Simultaneous leaps'),
    staves: ['t', 'b'],
    rows: [[
      { mark: OK, label: T('dos 4as justas', 'two perfect 4ths'), cols: [{ t: ['E4'], b: ['C3'] }, { t: ['A4'], b: ['F3'] }], check: ['P4'], checkB: ['P4'] },
      { mark: NO, label: T('dos 5as', 'two 5ths'), cols: [{ t: ['E4'], b: ['C3'] }, { t: ['B4'], b: ['G3'] }], check: ['P5'], checkB: ['P5'] },
      { mark: OK, label: T('en dirección contraria', 'in contrary motion'), cols: [{ t: ['E4'], b: ['C3'] }, { t: ['B4'], b: ['G2'] }], check: ['P5'], checkB: ['P4'] },
    ]],
  },
};

// ── Intervalos (verificación independiente del motor) ────────────────────────
const STEP = p => Number(p.slice(-1)) * 7 + 'CDEFGAB'.indexOf(p[0]);
const MIDI = p => { const acc = p.slice(1, -1); return (Number(p.slice(-1)) + 1) * 12 + [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(p[0])] + (acc === '#' ? 1 : acc === 'b' ? -1 : 0); };
function ivName(a, b) {
  const n = Math.abs(STEP(b) - STEP(a)) + 1, semis = Math.abs(MIDI(b) - MIDI(a));
  const simple = ((n - 1) % 7) + 1, base = [0, 0, 2, 4, 5, 7, 9, 11][simple], diff = semis - 12 * Math.floor((n - 1) / 7) - base;
  const q = [1, 4, 5].includes(simple) ? { '-1': 'd', 0: 'P', 1: 'A' }[diff] : { '-2': 'd', '-1': 'm', 0: 'M', 1: 'A' }[diff];
  return q + (n === 8 ? 8 : n > 8 && simple === 1 ? 8 : simple);
}
for (const [id, fig] of Object.entries(FIGURES)) for (const g of fig.rows.flat()) {
  const line = s => g.cols.map(c => c[s]?.[0]).filter(Boolean);
  if (g.check) { const l = g.cols.map(c => (c.t ?? c.b)[0]); g.check.forEach((want, i) => { if (ivName(l[i], l[i + 1]) !== want) throw Error(`${id}/${g.label.es}: ${l[i]}→${l[i + 1]} = ${ivName(l[i], l[i + 1])}, esperado ${want}`); }); }
  if (g.checkB) { const l = line('b'); g.checkB.forEach((want, i) => { if (ivName(l[i], l[i + 1]) !== want) throw Error(`${id}/${g.label.es} (bajo): ${ivName(l[i], l[i + 1])} ≠ ${want}`); }); }
  if (g.harm) g.cols.forEach((c, i) => {
    const notes = [...(c.b ?? []), ...(c.t ?? [])].sort((x, y) => MIDI(x) - MIDI(y));
    const got = ivName(notes[0], notes[notes.length - 1]);
    if (got !== g.harm[i]) throw Error(`${id}/${g.label.es} col ${i + 1}: ${notes.join('/')} = ${got}, esperado ${g.harm[i]}`);
  });
}

const browser = await chromium.launch(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {});
try {
  const page = await browser.newPage({ viewport: { width: 1000, height: 900 }, deviceScaleFactor: 2 });
  await page.setContent('<div id="figure"></div>');
  await page.addScriptTag({ path: resolve(site, 'public/vendor/vexflow-4.2.2.min.js') });
  for (const locale of ['es', 'en']) for (const [id, fig] of Object.entries(FIGURES)) {
    const result = await page.evaluate(({ id, fig, locale }) => {
      const V = window.Vex.Flow;
      const ink = '#f0eeff', violet = '#c4b5fd', muted = '#c6c3d5', okc = '#86efac', noc = '#fca5a5';
      const W = fig.width ?? 960, COL = fig.col ?? 66, GAP = fig.gap ?? 34, X0 = 128, STAFF_X = 60, RIGHT = W - 20;
      const staffH = fig.staves.length === 2 ? 210 : 110; // altura de un sistema
      const rowH = staffH + 110;
      const H = 70 + fig.rows.length * rowH + (fig.footer ? 30 : 0);
      const host = document.getElementById('figure');
      host.innerHTML = '';
      const renderer = new V.Renderer(host, V.Renderer.Backends.SVG);
      renderer.resize(W, H);
      const ctx = renderer.getContext();
      ctx.setFillStyle(ink).setStrokeStyle(ink);
      const svg = host.querySelector('svg');
      svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
      svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      svg.setAttribute('role', 'img');
      const node = (tag, attrs, text) => {
        const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
        for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
        if (text !== undefined) n.textContent = text;
        svg.appendChild(n);
        return n;
      };
      const L = t => t[locale];
      node('title', {}, L(fig.title));
      const label = (x, y, text, color = muted, size = 15, anchor = 'middle') => node('text', { x, y, fill: color, stroke: 'none', 'font-family': 'Georgia, "Times New Roman", serif', 'font-size': size, 'text-anchor': anchor }, text);
      const titleNode = label(W / 2, 30, L(fig.title), ink, 24);
      const degree = p => Number(p.slice(-1)) * 7 + 'CDEFGAB'.indexOf(p[0]);
      const SOLFA = ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si'];
      const noteName = p => (locale === 'es' ? SOLFA['CDEFGAB'.indexOf(p[0])] : p[0]) + (p.slice(1, -1) === '#' ? '♯' : p.slice(1, -1) === 'b' ? '♭' : '') + p.slice(-1);
      const audit = [];
      fig.rows.forEach((groups, r) => {
        const width = groups.reduce((s, g) => s + g.cols.length * COL, 0) + GAP * (groups.length - 1);
        const left = X0 + Math.max(0, (RIGHT - X0 - width) / 2);
        if (left + width > RIGHT + 0.5) throw Error(`${id}: la fila ${r + 1} no cabe (${width}px)`);
        const top = 70 + r * rowH + 70; // primera línea del primer pentagrama
        // Encabezados (categoría), rótulos y marcas.
        let x = left;
        const spans = [];
        groups.forEach((g, gi) => {
          const w = g.cols.length * COL, cx = x + w / 2;
          if (g.header && (!spans.length || spans[spans.length - 1].header !== L(g.header))) spans.push({ header: L(g.header), x0: x, x1: x + w });
          else if (g.header) spans[spans.length - 1].x1 = x + w;
          const markText = g.mark === 'ok' ? '✓ ' : g.mark === 'no' ? '✗ ' : '';
          const t = label(cx, top - 22, '', violet, 17);
          if (markText) { const m = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); m.setAttribute('fill', g.mark === 'ok' ? okc : noc); m.textContent = markText; t.appendChild(m); }
          const s = document.createElementNS('http://www.w3.org/2000/svg', 'tspan'); s.textContent = L(g.label); t.appendChild(s);
          g._x = x; x += w + GAP;
        });
        spans.forEach(s => {
          label((s.x0 + s.x1) / 2, top - 46, s.header, ink, 18);
          node('line', { x1: s.x0 + 6, x2: s.x1 - 6, y1: top - 40, y2: top - 40, stroke: violet, 'stroke-width': 1, opacity: 0.6 });
        });
        // Pentagramas.
        fig.staves.forEach((clef, si) => {
          const y = top + si * 100;
          const sx = Math.max(STAFF_X, left - 72), stave = new V.Stave(sx, y - 40, left + width + 14 - sx).addClef(clef === 't' ? 'treble' : 'bass').setStyle({ fillStyle: ink, strokeStyle: ink });
          stave.setContext(ctx).draw();
          // Doble barra entre grupos.
          groups.forEach((g, gi) => { if (gi) { const bx = g._x - GAP / 2; node('line', { x1: bx, x2: bx, y1: y, y2: y + 40, stroke: muted, 'stroke-width': 1 }); node('line', { x1: bx + 4, x2: bx + 4, y1: y, y2: y + 40, stroke: muted, 'stroke-width': 1 }); } });
          groups.forEach(g => g.cols.forEach((c, ci) => {
            const pitches = c[clef];
            if (!pitches) return;
            const cx = g._x + ci * COL + COL / 2;
            const keys = pitches.map(p => `${p[0].toLowerCase()}${p.slice(1, -1)}/${p.slice(-1)}`);
            const note = new V.StaveNote({ clef: clef === 't' ? 'treble' : 'bass', keys, duration: 'w' });
            pitches.forEach((p, i) => { const acc = p.slice(1, -1); if (acc) note.addModifier(new V.Accidental(acc), i); });
            note.setStyle({ fillStyle: ink, strokeStyle: ink }).setStave(stave);
            note.setLedgerLineStyle({ strokeStyle: ink });
            const voice = new V.Voice({ num_beats: 4, beat_value: 4 }).addTickables([note]);
            new V.Formatter().joinVoices([voice]).formatToStave([voice], stave);
            const tick = new V.TickContext().addTickable(note).preFormat().setX(0);
            note.setTickContext(tick);
            tick.setX(cx - note.getGlyphWidth() / 2 - note.getAbsoluteX());
            note.setContext(ctx).draw();
            const bottom = clef === 't' ? 'E4' : 'G2';
            const ys = [...note.getYs()].sort((a, b) => b - a);
            const expected = pitches.map(p => y + 40 - (degree(p) - degree(bottom)) * 5).sort((a, b) => b - a);
            ys.forEach((v, i) => { if (Math.abs(v - expected[i]) > 0.01) throw Error(`${id} ${pitches}: y=${v}, esperado ${expected[i]}`); });
            const centerX = note.getAbsoluteX() + note.getGlyphWidth() / 2;
            if (Math.abs(centerX - cx) > 0.01) throw Error(`${id} ${pitches}: alineación horizontal`);
            audit.push({ row: r + 1, group: L(g.label), column: ci + 1, staff: clef, pitches, ys });
            label(cx, (si === fig.staves.length - 1 ? y + 88 : y + 72), pitches.map(noteName).join(' · '), muted, 16);
          }));
        });
      });
      const footerNode = fig.footer ? label(W / 2, H - 16, L(fig.footer), muted, 17) : null;
      // Center title and footer over the music, then crop the viewBox to the content.
      titleNode.remove(); footerNode?.remove();
      const music = svg.getBBox(), mid = music.x + music.width / 2;
      titleNode.setAttribute('x', mid); svg.appendChild(titleNode);
      if (footerNode) { footerNode.setAttribute('x', mid); svg.appendChild(footerNode); }
      const bb = svg.getBBox(), pad = 16;
      const vb = [bb.x - pad, bb.y - pad, bb.width + 2 * pad, bb.height + 2 * pad].map(v => Math.round(v * 10) / 10);
      svg.setAttribute('viewBox', vb.join(' '));
      svg.setAttribute('width', vb[2]);
      svg.setAttribute('height', vb[3]);
      return { svg: svg.outerHTML, audit, W: vb[2], H: vb[3] };
    }, { id, fig, locale });
    await writeFile(resolve(out, `${id}-${locale}.svg`), result.svg + '\n');
    await writeFile(resolve(preview, `${id}-${locale}-notes.json`), JSON.stringify(result.audit, null, 2));
    await page.evaluate(async svg => {
      const img = document.createElement('img');
      img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
      document.getElementById('figure').replaceChildren(img);
      await img.decode();
    }, result.svg);
    await page.addStyleTag({ content: `body { margin: 0; background: #0c0a18; } #figure { width: ${result.W}px; height: ${result.H}px; }` });
    await page.locator('#figure').screenshot({ path: resolve(preview, `${id}-${locale}.png`) });
    console.log(`${id}-${locale}: ${result.audit.length} columnas verificadas; PNG listo`);
  }
} finally {
  await browser.close();
}
