// Optional integration check using the host repository's Playwright installation.
// Run from apps-src/afinador: node scripts/browser-check.mjs (npm run dev running).
import { chromium } from 'playwright-core';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';
const output = path.resolve('.browser-check');
await mkdir(output, { recursive: true });
const rate = 48000, seconds = 16, wav = Buffer.alloc(44 + rate * seconds * 2);
wav.write('RIFF'); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8); wav.writeUInt32LE(16, 16);
wav.writeUInt16LE(1, 20); wav.writeUInt16LE(1, 22); wav.writeUInt32LE(rate, 24); wav.writeUInt32LE(rate * 2, 28); wav.writeUInt16LE(2, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36); wav.writeUInt32LE(wav.length - 44, 40);
for (let i = 0; i < rate * seconds; i++) {
  const time = i / rate;
  const hz = time < 5 ? 440 : time < 10 ? 277.1826309768721 * 2 ** (-18 / 1200) : 0;
  wav.writeInt16LE(hz ? Math.round(Math.sin(2 * Math.PI * hz * time) * 16000) : 0, 44 + i * 2);
}
const audio = path.join(output, 'synthetic.wav'); await writeFile(audio, wav);
const browser = await chromium.launch({ headless: true, args: ['--use-fake-device-for-media-stream', '--use-fake-ui-for-media-stream', `--use-file-for-fake-audio-capture=${audio}`] });
try {
  const context = await browser.newContext({ permissions: ['microphone'] });
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', e => errors.push(e.message));
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('http://127.0.0.1:5194/?lang=es');
  await page.screenshot({ path: path.join(output, 'permission-mobile.png') });
  await page.getByRole('button', { name: 'Activar micrófono', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('#letter')?.textContent === 'A');
  assert.equal(await page.locator('#octave').textContent(), '4');
  assert.ok(Math.abs(Number(await page.locator('#cents').textContent())) <= 1);
  await page.screenshot({ path: path.join(output, 'tuned-mobile.png') });
  await page.setViewportSize({ width: 1366, height: 768 });
  await page.screenshot({ path: path.join(output, 'tuned-desktop.png') });
  await page.waitForFunction(() => document.querySelector('#letter')?.textContent === 'C');
  await page.getByRole('button', { name: 'Bemoles', exact: true }).click();
  assert.equal(await page.locator('#letter').textContent(), 'D');
  assert.equal(await page.locator('#accidental').textContent(), '♭');
  assert.ok(Math.abs(Number(await page.locator('#cents').textContent()) + 18) < 1);
  await page.waitForFunction(() => document.querySelector('#status')?.textContent?.trim() === 'No se detecta nota', null, { timeout: 18000 });
  await page.getByRole('button', { name: 'Apagar micrófono', exact: true }).click();
  await page.reload();
  assert.equal(await page.getByRole('button', { name: 'Bemoles', exact: true }).getAttribute('aria-pressed'), 'true');
  await page.goto('http://127.0.0.1:5194/?lang=en');
  assert.equal(await page.title(), 'Chromatic tuner');
  await page.getByRole('button', { name: 'Enable microphone', exact: true }).click();
  await page.getByRole('button', { name: 'Turn off microphone', exact: true }).waitFor({ state: 'visible' });
  for (const viewport of [{ width: 320, height: 568 }, { width: 844, height: 390 }, { width: 1366, height: 768 }]) {
    await page.setViewportSize(viewport);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth && document.documentElement.scrollHeight <= innerHeight), true, `overflow ${JSON.stringify(viewport)}`);
  }
  await page.getByRole('button', { name: 'Turn off microphone', exact: true }).click();
  await page.evaluate(() => { navigator.mediaDevices.getUserMedia = async () => { throw new DOMException('Denied', 'NotAllowedError'); }; });
  await page.getByRole('button', { name: 'Enable microphone', exact: true }).click();
  await page.getByText('Microphone access was denied.', { exact: false }).waitFor();
  assert.deepEqual(errors, []);
  console.log('PASS: real AudioWorklet → Worker → UI; A4, detuned C#4/Db4, silence, stop, persistence, en/es, denied permission, responsive layout.');
} finally { await browser.close(); }
