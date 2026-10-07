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
