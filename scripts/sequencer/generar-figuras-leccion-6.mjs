// Run from the repository root: node scripts/sequencer/generar-figuras-leccion-6.mjs
// SVG notation uses the same VexFlow glyphs, 10px staff spacing, 860px width,
// Georgia labels and palette as Lesson 5. No external fonts are required.
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, copyFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const source = JSON.parse(await readFile(new URL('./leccion-6-figures.json', import.meta.url), 'utf8'));
const output = resolve('public/images/curso/leccion-6');
const preview = resolve('.local-work/leccion-6/figures');
await mkdir(output, { recursive: true });
await mkdir(preview, { recursive: true });
const browser = await chromium.launch({ ...(process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE } : {}) });
try {
  const page = await browser.newPage({ viewport: { width: 900, height: 750 }, deviceScaleFactor: 2 });
  await page.setContent('<div id="figure"></div>');
  await page.addScriptTag({ path: resolve('public/vendor/vexflow-4.2.2.min.js') });
  for (const locale of ['es', 'en']) {
    for (const [id, project] of Object.entries(source.projects)) {
      const result = await page.evaluate(({ id, project, locale }) => {
        const V = window.Vex.Flow;
        const ink = '#f0eeff', violet = '#c4b5fd', muted = '#c6c3d5';
        const es = locale === 'es';
        const voices = ['soprano', 'alto', 'tenor', 'bass'];
        const voiceLabels = es ? ['Soprano', 'Contralto', 'Tenor', 'Bajo'] : ['Soprano', 'Alto', 'Tenor', 'Bass'];
        const titles = {
          tesituras: es ? 'Tesituras vocales' : 'Vocal ranges',
          separaciones: es ? 'Separaciones máximas' : 'Maximum voice separations',
          estados: es ? 'Estados de Do mayor' : 'States of C major',
          posicion: es ? 'Posición melódica · Do mayor' : 'Melodic position · C major',
          disposicion: es ? 'Disposición interna · Do mayor' : 'Internal disposition · C major',
        };
        const columns = {
          tesituras: es ? ['Nota más grave', 'Nota más aguda'] : ['Lowest note', 'Highest note'],
          separaciones: ['S–A · ' + (es ? '12ª' : '12th'), 'A–T · ' + (es ? '10ª' : '10th'), 'T–B · ' + (es ? '15ª' : '15th')],
          estados: es ? ['Fundamental', 'Primera inversión', 'Segunda inversión'] : ['Root position', 'First inversion', 'Second inversion'],
          posicion: es ? ['8ª · Do', '3ª · Mi', '5ª · Sol'] : ['8th · C', '3rd · E', '5th · G'],
          disposicion: es ? ['Cerrada', 'Abierta'] : ['Close', 'Open'],
        };
        const notes = Object.fromEntries(voices.map(v => [v, []]));
        let voice, measure;
        for (const line of project.text.split('\n')) {
          if (line.startsWith('voz ')) voice = line.slice(4);
          else if (line.startsWith('compas ')) measure = Number(line.slice(7)) - 1;
          else notes[voice][measure] = line.startsWith('silencio') ? null : line.split(' ')[0];
        }
        const degree = pitch => Number(pitch.slice(1)) * 7 + 'CDEFGAB'.indexOf(pitch[0]);
        const midi = pitch => (Number(pitch.slice(1)) + 1) * 12 + [0, 2, 4, 5, 7, 9, 11]['CDEFGAB'.indexOf(pitch[0])];
        const ranges = [[60, 79], [55, 74], [47, 67], [41, 59]];
        const count = project.setup.measures;
        // Range endpoints are independent demonstrations, not simultaneous chords.
        for (let r = 0; r < 4; r++) for (const pitch of notes[voices[r]]) {
          if (pitch && (midi(pitch) < ranges[r][0] || midi(pitch) > ranges[r][1])) throw Error(`${id}: out of range ${pitch}`);
        }
        if (id !== 'tesituras') for (let c = 0; c < count; c++) {
          for (let r = 0; r < 3; r++) {
            const hi = notes[voices[r]][c], lo = notes[voices[r + 1]][c];
            if (hi && lo && (midi(hi) < midi(lo) || degree(hi) - degree(lo) + 1 > [12, 10, 15][r])) throw Error(`${id}: spacing/crossing ${hi}/${lo}`);
          }
        }
        const host = document.getElementById('figure');
        host.innerHTML = '';
        const renderer = new V.Renderer(host, V.Renderer.Backends.SVG);
        renderer.resize(860, 700);
        const ctx = renderer.getContext();
        ctx.setFillStyle(ink).setStrokeStyle(ink);
        const svg = host.querySelector('svg');
        svg.setAttribute('viewBox', '0 0 860 700');
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.setAttribute('role', 'img');
        const node = (tag, attrs, text) => {
          const n = document.createElementNS('http://www.w3.org/2000/svg', tag);
          for (const [k, v] of Object.entries(attrs)) n.setAttribute(k, String(v));
          if (text !== undefined) n.textContent = text;
          svg.appendChild(n);
          return n;
        };
        node('title', {}, titles[id]);
        const label = (x, y, text, color = muted, size = 15, anchor = 'middle') => node('text', { x, y, fill: color, stroke: 'none', 'font-family': 'Georgia, "Times New Roman", serif', 'font-size': size, 'text-anchor': anchor }, text);
        label(430, 27, titles[id], ink, 20);
        const xs = count === 2 ? [350, 670] : [270, 490, 710];
        columns[id].forEach((s, c) => label(xs[c], 61, s, violet, id === 'estados' ? 15 : 17));
        const audit = [];
        for (let r = 0; r < 4; r++) {
          const clef = r < 2 ? 'treble' : 'bass';
          const top = 105 + r * 140;
          const stave = new V.Stave(145, top - 40, 685).addClef(clef).setStyle({ fillStyle: ink, strokeStyle: ink });
          stave.setContext(ctx).draw();
          label(125, top + 24, voiceLabels[r], violet, 16, 'end');
          for (let c = 0; c < count; c++) {
            const pitch = notes[voices[r]][c];
            if (!pitch) continue; // Only the illustrated adjacent pair is shown.
            const note = new V.StaveNote({ clef, keys: [`${pitch[0].toLowerCase()}/${pitch.slice(1)}`], duration: 'w' });
            note.setStyle({ fillStyle: ink, strokeStyle: ink }).setStave(stave);
            note.setLedgerLineStyle({ strokeStyle: ink });
            const voice = new V.Voice({ num_beats: 4, beat_value: 4 }).addTickables([note]);
            new V.Formatter().joinVoices([voice]).formatToStave([voice], stave);
            const tick = new V.TickContext().addTickable(note).preFormat().setX(0);
            note.setTickContext(tick);
            tick.setX(xs[c] - note.getGlyphWidth() / 2 - note.getAbsoluteX());
            note.setContext(ctx).draw();
            // Independently check every rendered note against diatonic staff geometry.
            const bottomPitch = clef === 'treble' ? 'E4' : 'G2';
            const expectedY = top + 40 - (degree(pitch) - degree(bottomPitch)) * 5;
            if (note.getYs()[0] !== expectedY) throw Error(`${pitch}: y=${note.getYs()[0]}, expected=${expectedY}`);
            const centerX = note.getAbsoluteX() + note.getGlyphWidth() / 2;
            if (Math.abs(centerX - xs[c]) > 0.01) throw Error(`${pitch}: horizontal alignment`);
            audit.push({ voice: voices[r], column: c + 1, pitch, x: centerX, y: note.getYs()[0], expectedY });
            const name = es ? ['Do', 'Re', 'Mi', 'Fa', 'Sol', 'La', 'Si']['CDEFGAB'.indexOf(pitch[0])] + pitch.slice(1) : pitch;
            label(xs[c], top + 90, name);
          }
        }
        if (id === 'estados') ['5/3', '6/3', '6/4'].forEach((s, c) => label(xs[c], 680, s, violet, 19));
        if (id === 'tesituras') label(430, 680, es ? 'Do4 = do central · límites independientes para cada voz' : 'C4 = middle C · independent limits for each voice');
        if (id === 'separaciones') label(430, 680, es ? 'Cada columna muestra una pareja de voces · sin cruces' : 'Each column shows one adjacent pair · no crossings');
        if (id === 'disposicion') {
          label(xs[0], 680, es ? 'Sol3 · Do4 · Mi4: no cabe otra nota' : 'G3 · C4 · E4: no other chord tone fits', muted, 14);
          label(xs[1], 680, es ? 'Entre Sol3 y Mi4 cabe Do4' : 'C4 fits between G3 and E4', muted, 14);
        }
        return { svg: svg.outerHTML, audit };
      }, { id, project, locale });
      const name = `${id === 'posicion' ? 'posicion-melodica' : id}-${locale}`;
      await writeFile(resolve(output, `${name}.svg`), result.svg + '\n');
      await writeFile(resolve(preview, `${name}-notes.json`), JSON.stringify(result.audit, null, 2));
      // Decode the exported document as an image, not just an inline SVG.
      // This also verifies its XML namespace and self-contained music glyphs.
      await page.evaluate(async svg => {
        const img = document.createElement('img');
        img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
        document.getElementById('figure').replaceChildren(img);
        await img.decode();
      }, result.svg);
      await page.addStyleTag({ content: 'body { margin: 0; background: #0c0a18; } #figure { width: 860px; height: 700px; }' });
      await page.locator('#figure').screenshot({ path: resolve(preview, `${name}.png`) });
      console.log(`${name}: ${result.audit.length} note positions checked; PNG rendered`);
    }
  }
} finally {
  await browser.close();
}
if (process.env.LESSON_6_SOURCE_DIR) {
  const target = resolve(process.env.LESSON_6_SOURCE_DIR);
  await mkdir(target, { recursive: true });
  for (const name of ['generar-figuras-leccion-6.mjs', 'leccion-6-figures.json']) await copyFile(new URL(`./${name}`, import.meta.url), resolve(target, name));
  for (const id of ['tesituras', 'separaciones', 'estados', 'posicion-melodica', 'disposicion']) for (const locale of ['es', 'en']) await copyFile(resolve(output, `${id}-${locale}.svg`), resolve(target, `${id}-${locale}.svg`));
}
