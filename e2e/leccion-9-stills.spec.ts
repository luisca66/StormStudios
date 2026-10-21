import { test, expect } from '@playwright/test';
import es from '../content/storyboards/es/10-leccion-9.json';
import en from '../content/storyboards/en/10-leccion-9.json';

for (const board of [es, en]) {
  test(`Lesson 9 ${board.locale}: text fits and figured bass is stacked on its chord`, async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto(`/${board.locale}/sequencer/v4/stage`);
    await page.waitForFunction(() => !!window.stormStage);
    const prepared = await page.evaluate(b => window.stormStage!.prepare(b), board);
    for (const still of prepared.storyboard.stills) {
      await page.evaluate(({ still, score, format }) => window.stormStage!.render(still, score, format), {
        still, score: still.project ? prepared.scores[still.project] : null, format: prepared.storyboard.format,
      });
      const audit = await page.getByTestId('still').evaluate(root => {
        const box = (e: Element) => { const r = e.getBoundingClientRect(); return { left:r.left, right:r.right, top:r.top, bottom:r.bottom }; };
        const paper = root.querySelector('[class*="paper"], [class*="image"]');
        return {
          text: [...root.querySelectorAll('h1, p, [data-highlight-label], [data-annotation]')].map(box),
          header: [...root.querySelectorAll('header h1, header p')].map(box),
          paper: paper ? box(paper) : null,
          figured: [...root.querySelectorAll<SVGTextElement>('[data-annotation="roman"]')].filter(e => e.querySelector('tspan')).map(e => ({
            digits: [...e.querySelectorAll('tspan')].map(s => ({ text:s.textContent, ...box(s) })),
            center: (box(e).left + box(e).right) / 2,
            notes: [...e.ownerSVGElement!.querySelectorAll('.vf-notehead')].map(n => (box(n).left + box(n).right) / 2),
          })),
        };
      });
      for (const b of audit.text) {
        expect(b.left, still.id).toBeGreaterThanOrEqual(79);
        expect(b.right, still.id).toBeLessThanOrEqual(1841);
        expect(b.top, still.id).toBeGreaterThan(90);
        expect(b.bottom, still.id).toBeLessThan(1000);
      }
      if (audit.paper) for (const h of audit.header) expect(h.bottom, still.id).toBeLessThanOrEqual(audit.paper.top);
      for (const f of audit.figured) {
        expect(f.digits.map(d => d.text)).toEqual(expect.arrayContaining(['6']));
        expect(f.digits).toHaveLength(2);
        // SVG font boxes include ascenders/descenders beyond the ink of a digit.
        expect(f.digits[0].top).toBeLessThan(f.digits[1].top - 15);
        expect(Math.abs(f.digits[0].left - f.digits[1].left)).toBeLessThan(1);
        expect(Math.min(...f.notes.map(x => Math.abs(x - f.center))), still.id).toBeLessThan(15);
      }
    }
  });
}
