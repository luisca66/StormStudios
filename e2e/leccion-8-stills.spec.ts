import { test, expect } from '@playwright/test';
import es from '../content/storyboards/es/09-leccion-8.json';
import en from '../content/storyboards/en/09-leccion-8.json';
for (const board of [es, en]) {
  test(`Lesson 8 ${board.locale}: voice labels clear the notes and stay inside the paper`, async ({ page }) => {
    await page.goto(`/${board.locale}/sequencer/v4/stage`);
    await page.waitForFunction(() => !!window.stormStage);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const prepared = await page.evaluate(b => window.stormStage!.prepare(b), board);
    for (const id of ['ej2-voces', 'ej7-voces', 'sensible', 'error-sensible-bien']) {
      const still = prepared.storyboard.stills.find(s => s.id === id)!;
      await page.evaluate(({ still, score }) => window.stormStage!.render(still, score), { still, score: prepared.scores[still.project!] });
      const result = await page.getByTestId('still').evaluate(root => {
        const bounds = (e: Element) => { const b=e.getBoundingClientRect(); return { left:b.left, right:b.right, top:b.top, bottom:b.bottom }; };
        return { paper:bounds(root), labels:[...root.querySelectorAll('[data-highlight-label]')].map(bounds), notes:[...root.querySelectorAll('.vf-notehead')].map(bounds) };
      });
      const overlaps = (a: typeof result.paper, b: typeof result.paper) => a.left<b.right && b.left<a.right && a.top<b.bottom && b.top<a.bottom;
      expect(result.labels.length).toBeGreaterThan(0);
      for (const [i,label] of result.labels.entries()) {
        expect(result.notes.some(n => overlaps(n,label))).toBe(false);
        expect(result.labels.slice(i+1).some(n => overlaps(n,label))).toBe(false);
        expect(label.right).toBeLessThan(result.paper.right-80);
        expect(label.bottom).toBeLessThan(result.paper.bottom-92);
      }
    }
  });
}
for (const board of [es, en]) {
  test(`Lesson 8 ${board.locale}: voice boxes contain ledger notes and stems, with aligned labels and focus`, async ({ page }) => {
    await page.goto(`/${board.locale}/sequencer/v4/stage`);
    await page.waitForFunction(() => !!window.stormStage);
    await page.setViewportSize({ width: 1920, height: 1080 });
    const prepared = await page.evaluate(b => window.stormStage!.prepare(b), board);
    for (const id of ['ej2-voces', 'ej6-voces', 'error-paralelas', 'nota-comun', 'ej1-voces', 'ej5-voces', 'ej7-voces']) {
      const original = prepared.storyboard.stills.find(s => s.id === id)!;
      for (const focused of [false, true]) {
        const still = { ...original, ...(focused ? { focusVoice: 'tenor' as const } : {}) };
        await page.evaluate(({ still, score }) => window.stormStage!.render(still, score), { still, score: prepared.scores[still.project!] });
        const checks = await page.getByTestId('still').evaluate(root => {
          const box = (e: Element) => { const r=e.getBoundingClientRect(); return { left:r.left,right:r.right,top:r.top,bottom:r.bottom }; };
          return [...root.querySelectorAll<SVGRectElement>('[data-highlight-voice]')].map(rect => {
            const voice=rect.dataset.highlightVoice!;
            const notes=[...root.querySelectorAll<SVGGElement>(`[data-event-voice="${voice}"]`)];
            const svg=rect.ownerSVGElement!;
            const matrix=svg.getScreenCTM()!;
            const point=(y: number) => new DOMPoint(0,y).matrixTransform(matrix).y;
            return { voice,rect:box(rect),fill:rect.getAttribute('fill'),stroke:rect.getAttribute('stroke'),
              ink:notes.map(n=>({top:point(Number(n.dataset.captureInkTop)),bottom:point(Number(n.dataset.captureInkBottom))})),
              stems:notes.flatMap(n=>[...n.querySelectorAll('.vf-stem')].map(box)),
              labels:[...root.querySelectorAll('[data-highlight-label]')].map(box),
              colors:notes.map(n=>n.getAttribute('fill')??n.querySelector('[fill]')?.getAttribute('fill')) };
          });
        });
        for (const c of checks) {
          expect(c.fill).toBe('none');
          expect(c.stroke).toBeTruthy();
          for (const ink of [...c.ink,...c.stems]) {
            expect(c.rect.top).toBeLessThan(ink.top);
            expect(c.rect.bottom).toBeGreaterThan(ink.bottom);
          }
          // Side labels follow the expanded box, rather than the unchanged staff center.
          const label=c.labels.find(l=>Math.abs((l.top+l.bottom)/2-(c.rect.top+c.rect.bottom)/2)<8);
          if (original.highlights?.some(h=>h.voice===c.voice && h.label)) expect(label).toBeTruthy();
        }
        if (focused) {
          const colors=await page.locator('[data-event-voice="alto"]').first().evaluate(n=>n.outerHTML);
          expect(colors).toContain('#aab2bd');
        }
      }
    }
  });
}
