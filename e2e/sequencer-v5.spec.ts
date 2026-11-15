import { expect, test, type Page } from "@playwright/test";

// Valid tiny PCM WAV: exercise Web Audio decoding without a network dependency.
function sampleWav() {
  const bytes = Buffer.alloc(44 + 4410 * 2);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(44100, 24); bytes.writeUInt32LE(88200, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  return bytes;
}

type Api = { getScore(): { mode: string; measures: unknown[]; voices: { id: string; events: { pitches: string[]; start: number; ornament?: boolean }[] }[]; annotations?: { kind: string; text: string; measure: number; beat: number }[]; scenes: unknown[] }; describe(): string };
const api = (page: Page) => page.evaluate(() => (window as unknown as { stormSequencer: Api }).stormSequencer.getScore());
const melody = async (page: Page) => (await api(page)).voices.find(v => v.id === "melody")!.events.map(e => e.pitches.join("+") || "r");

async function open(page: Page) {
  await page.route("**/api/audio/**", route => route.fulfill({ body: sampleWav(), contentType: "audio/wav" }));
  await page.route("**/_vercel/**", route => route.abort());
  await page.goto("/es/sequencer/v5");
  await page.waitForFunction(() => Boolean((window as unknown as { stormSequencer?: unknown }).stormSequencer));
  await expect(page.getByTestId("studio-v5")).not.toHaveAttribute("inert", "");
}

test("the studio fits one screen and never ships author mode", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", error => errors.push(error.message));
  await open(page);
  // One screen: the document does not scroll.
  expect(await page.evaluate(() => document.documentElement.scrollHeight <= window.innerHeight + 1)).toBe(true);
  for (const name of ["Pista de acordes", "Marcadores", "Lista de notas", "Entrada por texto"]) await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
  // Luis's rule: voicing and harmonizing never reach the student.
  await expect(page.getByRole("tab", { name: "Modo autor" })).toHaveCount(0);
  await expect(page.getByTestId("author-panel")).toHaveCount(0);
  expect(errors).toEqual([]);
});

test("keyboard entry follows the key signature, edits and undoes", async ({ page }) => {
  await open(page);
  await page.getByRole("combobox", { name: /^Armadura/ }).selectOption("D");
  await page.locator("body").click({ position: { x: 5, y: 5 } });
  await page.keyboard.press("d"); await page.keyboard.press("f"); await page.keyboard.press("2"); await page.keyboard.press("a");
  expect(await melody(page)).toEqual(["D4", "F#4", "A4"]);
  await expect(page.getByTestId("lcd-position")).toHaveText("2.1");
  // Select the last note from the accessible list and move it.
  await page.getByRole("tab", { name: "Lista de notas", exact: true }).click();
  await page.getByTestId("event-list").getByRole("button", { name: "A4", exact: true }).click();
  await page.keyboard.press("ArrowUp");
  expect(await melody(page)).toEqual(["D4", "F#4", "A#4"]);
  await page.keyboard.press("Control+z");
  expect(await melody(page)).toEqual(["D4", "F#4", "A4"]);
  // Undo clears the selection, like v4: pick the note again before deleting it.
  await page.getByTestId("event-list").getByRole("button", { name: "A4", exact: true }).click();
  await page.keyboard.press("Delete");
  expect(await melody(page)).toEqual(["D4", "F#4"]);
});

test("the chord track stores plain chord symbols and writes no notes", async ({ page }) => {
  await open(page);
  await page.getByTestId("progression-input").fill("I IV V zz");
  await page.getByRole("button", { name: /Escribir desde el compás 1/ }).click();
  const score = await api(page);
  expect(score.annotations!.filter(a => a.kind === "roman").map(a => [a.measure, a.beat, a.text])).toEqual([[1, 1, "I"], [2, 1, "IV"], [3, 1, "V"], [4, 1, "zz"]]);
  expect(score.voices.flatMap(v => v.events)).toHaveLength(0);
  await expect(page.getByTestId("chord-lane").locator("li")).toHaveCount(4);
  // An unknown symbol is kept as free text, with no error and no correction.
  await expect(page.getByTestId("chord-lane")).toContainText("texto libre");
  await expect(page.getByTestId("status-error")).toHaveCount(0);
  await expect(page.getByTestId("lcd-chord")).toHaveText("I");
});

test("measures can be inserted, copied and removed around the cursor", async ({ page }) => {
  await open(page);
  await page.getByRole("tab", { name: "Entrada por texto", exact: true }).click();
  await page.getByTestId("text-input").fill("voz melody\ncompas 1\nC4 redonda\ncompas 2\nD4 redonda");
  await page.getByTestId("text-apply").click();
  expect(await melody(page)).toEqual(["C4", "D4"]);
  await page.getByRole("button", { name: "+ Compás", exact: true }).click();
  let score = await api(page);
  expect(score.measures).toHaveLength(5);
  expect(score.voices.find(v => v.id === "melody")!.events.map(e => e.start)).toEqual([0, 7680]);
  await page.getByLabel("Copiar al compás").fill("2");
  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  expect(await melody(page)).toEqual(["C4", "C4", "D4"]);
  page.once("dialog", dialog => void dialog.accept());
  await page.getByRole("button", { name: "− Compás", exact: true }).click();
  score = await api(page);
  expect(score.measures).toHaveLength(4);
  expect(await melody(page)).toEqual(["C4", "D4"]);
});

test("page view, markers and presentation", async ({ page }) => {
  await open(page);
  await page.getByRole("button", { name: "Páginas", exact: true }).click();
  await expect(page.getByTestId("score-view")).toHaveAttribute("data-layout", "page");
  await page.getByRole("button", { name: "Continua", exact: true }).click();
  await expect(page.getByTestId("score-view")).toHaveAttribute("data-layout", "line");
  await page.getByRole("tab", { name: "Marcadores", exact: true }).click();
  await page.getByRole("button", { name: "Nueva escena aquí", exact: true }).click();
  expect((await api(page)).scenes).toHaveLength(2);
  await page.getByLabel("Título", { exact: true }).fill("Cadencia");
  await page.getByTestId("present-scene").click();
  await expect(page.getByTestId("presentation-stage")).toContainText("Cadencia");
  await page.keyboard.press("Escape");
  await expect(page.getByTestId("presentation")).toHaveCount(0);
});

test("the key editor selects notes with a rubber band, like the staff", async ({ page }) => {
  await open(page);
  await page.getByRole("tab", { name: "Entrada por texto", exact: true }).click();
  await page.getByTestId("text-input").fill("voz melody\ncompas 1\nC4 negra; E4 negra; G4 negra; C5 negra\ncompas 2\nD4 redonda");
  await page.getByTestId("text-apply").click();
  await page.getByRole("button", { name: "Teclas", exact: true }).click();
  await page.getByRole("button", { name: "Seleccionar", exact: true }).click();
  // Bring the octave being edited into view before using screen coordinates.
  await page.locator('[data-pitch="F#4"]').evaluate(row => row.scrollIntoView({ block: "center" }));
  const box = async (pitch: string) => (await page.locator(`[data-pitch="${pitch}"] [data-roll-note]`).first().boundingBox())!;
  const low = await box("C4"), high = await box("G4");
  // From the empty row above G4 down past C4: takes C4, E4 and G4 but not C5 or D4.
  await page.mouse.move(low.x + 3, high.y - 30);
  await page.mouse.down();
  await page.mouse.move(high.x + high.width - 4, low.y + low.height + 4, { steps: 6 });
  await page.mouse.up();
  await expect(page.locator("[data-roll-note][aria-pressed=true]")).toHaveCount(3);
  // Shift adds: a second band over D4 keeps the first three.
  const next = await box("D4");
  await page.keyboard.down("Shift");
  await page.mouse.move(next.x + 20, next.y - 30);
  await page.mouse.down();
  await page.mouse.move(next.x + 60, next.y + next.height + 4, { steps: 6 });
  await page.mouse.up();
  await page.keyboard.up("Shift");
  await expect(page.locator("[data-roll-note][aria-pressed=true]")).toHaveCount(4);
  // The selection behaves like any other: one arrow moves all four.
  await page.keyboard.press("ArrowUp");
  expect(await melody(page)).toEqual(["C#4", "F4", "G#4", "C5", "D#4"]);
});

test("a MIDI keyboard writes notes and chords spelled by the key", async ({ page }) => {
  // Fake Web MIDI: one input whose handler the test can call.
  await page.addInitScript(() => {
    const input = { name: "Teclado de prueba", state: "connected", onmidimessage: null as null | ((event: { data: Uint8Array }) => void) };
    (window as unknown as { __midi: typeof input }).__midi = input;
    Object.defineProperty(navigator, "requestMIDIAccess", { configurable: true, value: async () => ({ inputs: new Map([["1", input]]), onstatechange: null }) });
  });
  await open(page);
  await page.getByRole("combobox", { name: /^Armadura/ }).selectOption("F");
  await page.getByTestId("midi-toggle").click();
  await expect(page.getByTestId("midi-toggle")).toHaveAttribute("data-midi", "ready");
  const send = (notes: number[]) => page.evaluate(list => { const input = (window as unknown as { __midi: { onmidimessage: (event: { data: Uint8Array }) => void } }).__midi; for (const note of list) input.onmidimessage({ data: new Uint8Array([0x90, note, 90]) }); }, notes);
  await send([70]); // Sib en Fa mayor
  await expect.poll(() => melody(page)).toEqual(["Bb4"]);
  await send([60, 64, 67]);
  await expect.poll(() => melody(page)).toEqual(["Bb4", "C4+E4+G4"]);
});

test("singing or playing into the microphone writes the held note once", async ({ page }) => {
  // Fake microphone: a real 440 Hz tone with harmonics, routed through Web Audio.
  await page.addInitScript(() => {
    navigator.mediaDevices.getUserMedia = async () => {
      const context = new AudioContext(), output = context.createMediaStreamDestination();
      for (const [multiple, level] of [[1, 0.3], [2, 0.18], [3, 0.1]]) {
        const oscillator = context.createOscillator(), gain = context.createGain();
        oscillator.frequency.value = 440 * multiple; gain.gain.value = level;
        oscillator.connect(gain).connect(output); oscillator.start();
      }
      return output.stream;
    };
  });
  await open(page);
  await page.getByTestId("mic-toggle").click();
  await expect(page.getByTestId("mic-toggle")).toHaveAttribute("data-mic", "listening");
  await expect.poll(() => melody(page), { timeout: 8000 }).toEqual(["A4"]);
  // The note keeps sounding: it must not be written again.
  await page.waitForTimeout(700);
  expect(await melody(page)).toEqual(["A4"]);
  await page.getByTestId("mic-toggle").click();
  await expect(page.getByTestId("mic-toggle")).toHaveAttribute("data-mic", "off");
});
