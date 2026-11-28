import { expect, test, type Page } from "@playwright/test";
import type { SequencerAgentApi } from "../lib/sequencer/agent-api";

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

test("SATB stems follow the middle staff line in both editor layouts", async ({ page }) => {
  await open(page);
  await page.evaluate(() => {
    const agent = (window as unknown as { stormSequencer: SequencerAgentApi }).stormSequencer;
    const score = agent.getScore();
    score.mode = "satb";
    for (const voice of score.voices) {
      const pitches = voice.clef === "bass" ? ["B2", "D3", "F3"] : ["G4", "B4", "D5"];
      voice.events = voice.id === "melody" ? [] : pitches.map((pitch, i) => ({
        id: `stem-${voice.id}-${i}`, start: i * 960, pitches: [pitch],
        duration: "q", dotted: false, triplet: false, tie: false,
      }));
    }
    agent.loadScore(score);
  });
  for (const layout of ["Continua", "Páginas"]) {
    await page.getByRole("button", { name: layout, exact: true }).click();
    for (const voice of ["soprano", "alto", "tenor", "bass"]) {
      for (let i = 0; i < 3; i++) {
        const stem = page.locator(`[data-note-id="stem-${voice}-${i}"] .vf-stem path`);
        await expect(stem).toHaveCount(1);
        // VexFlow's path runs from the notehead to the stem tip.
        const coordinates = (await stem.getAttribute("d"))!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
        expect(Math.sign(coordinates[3] - coordinates[1])).toBe(i === 0 ? -1 : 1);
      }
    }
  }
});

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

test("measures are added at the end, inserted, copied and removed around the cursor", async ({ page }) => {
  await open(page);
  await page.getByRole("tab", { name: "Entrada por texto", exact: true }).click();
  await page.getByTestId("text-input").fill("voz melody\ncompas 1\nC4 redonda\ncompas 2\nD4 redonda");
  await page.getByTestId("text-apply").click();
  expect(await melody(page)).toEqual(["C4", "D4"]);
  // "+ Compás" always appends: nothing moves, wherever the cursor is.
  await page.getByRole("button", { name: "+ Compás", exact: true }).click();
  let score = await api(page);
  expect(score.measures).toHaveLength(5);
  expect(score.voices.find(v => v.id === "melody")!.events.map(e => e.start)).toEqual([0, 3840]);
  // "Insertar aquí" puts the empty measure at the cursor: measure 2 (D4) and what follows shift right.
  await page.getByRole("button", { name: "Ir al compás 2", exact: true }).click();
  await page.getByRole("button", { name: "Insertar aquí", exact: true }).click();
  score = await api(page);
  expect(score.measures).toHaveLength(6);
  expect(score.voices.find(v => v.id === "melody")!.events.map(e => e.start)).toEqual([0, 7680]);
  await page.getByRole("button", { name: "Ir al compás 1", exact: true }).click();
  await page.getByLabel("Copiar al compás").fill("2");
  await page.getByRole("button", { name: "Copiar", exact: true }).click();
  expect(await melody(page)).toEqual(["C4", "C4", "D4"]);
  page.once("dialog", dialog => void dialog.accept());
  await page.getByRole("button", { name: "− Compás", exact: true }).click();
  score = await api(page);
  expect(score.measures).toHaveLength(5);
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
  // The stage draws systems like the page view (clef only at each line start), not one card per measure.
  await expect(page.getByTestId("presentation-stage").getByTestId("score-view")).toHaveAttribute("data-layout", "page");
  await expect(page.getByTestId("presentation-stage").locator("h3")).toHaveCount(0);
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

test("right-click opens the tool menu at the pointer", async ({ page }) => {
  await open(page);
  await page.getByRole("tab", { name: "Entrada por texto", exact: true }).click();
  await page.getByTestId("text-input").fill("voz melody\ncompas 1\nC4 negra; E4 negra");
  await page.getByTestId("text-apply").click();
  const staff = page.getByTestId("score-view");
  await staff.click({ button: "right", position: { x: 400, y: 60 } });
  const menu = page.getByTestId("tool-menu");
  await expect(menu).toBeVisible();
  // Right-click no longer deletes: both notes are still there.
  expect(await melody(page)).toEqual(["C4", "E4"]);
  await menu.getByRole("menuitemradio", { name: /Seleccionar/ }).click();
  await expect(menu).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Seleccionar", exact: true })).toHaveAttribute("aria-pressed", "true");
  // Keys inside the menu: E writes, Esc closes.
  await staff.click({ button: "right", position: { x: 400, y: 60 } });
  await page.keyboard.press("e");
  await expect(page.getByRole("button", { name: "Escribir", exact: true })).toHaveAttribute("aria-pressed", "true");
  await staff.click({ button: "right", position: { x: 400, y: 60 } });
  await page.keyboard.press("Escape");
  await expect(menu).toHaveCount(0);
  // On a note the menu also offers to delete it.
  await page.locator("[data-note-id]").first().click({ button: "right" });
  await menu.getByRole("menuitem", { name: /Borrar esta nota/ }).click();
  expect(await melody(page)).toEqual(["E4"]);
});

test("dragging one selected note moves the whole selection", async ({ page }) => {
  await open(page);
  await page.getByRole("tab", { name: "Entrada por texto", exact: true }).click();
  await page.getByTestId("text-input").fill("voz melody\ncompas 1\nC4 negra; E4 negra; G4 negra; C5 negra");
  await page.getByTestId("text-apply").click();
  // Key editor: select three notes, drag one up a whole tone and a quarter to the right.
  await page.getByRole("button", { name: "Teclas", exact: true }).click();
  await page.locator('[data-pitch="F#4"]').evaluate(row => row.scrollIntoView({ block: "center" }));
  await page.getByRole("button", { name: "Seleccionar", exact: true }).click();
  await page.keyboard.press("Control+a");
  const target = page.locator('[data-pitch="E4"] [data-roll-note]').first();
  await page.locator('[data-pitch="C5"] [data-roll-note]').first().click({ modifiers: ["Shift"] }); // C5 fuera
  await expect(page.locator("[data-roll-note][aria-pressed=true]")).toHaveCount(3);
  const box = (await target.boundingBox())!;
  await page.mouse.move(box.x + 20, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 20 + 48, box.y + box.height / 2 - 52, { steps: 8 }); // 48 px = negra, 26 px = semitono
  await page.mouse.up();
  const events = (await api(page)).voices.find(v => v.id === "melody")!.events.map(e => `${e.start}:${e.pitches.join("+")}`);
  // C4 E4 G4 suben un tono y se corren una negra; G4→A4 cae sobre C5 (que no estaba seleccionada) y la reemplaza.
  expect(events).toEqual(["960:D4", "1920:F#4", "2880:A4"]);
  await expect(page.locator("[data-roll-note][aria-pressed=true]")).toHaveCount(3);
  // Score: drag one selected note down; the others follow by the same staff steps (key of C: naturals).
  await page.getByRole("button", { name: "Partitura", exact: true }).click();
  await expect(page.locator("[data-note-id] .vf-notehead").first()).toBeVisible();
  const heads = await page.locator("[data-note-id] .vf-notehead").evaluateAll(els => els.map(el => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; }));
  await page.mouse.move(heads[1].x, heads[1].y);
  await page.mouse.down();
  await page.mouse.move(heads[1].x, heads[1].y + 24, { steps: 8 });
  await page.mouse.up();
  const after = (await api(page)).voices.find(v => v.id === "melody")!.events.filter(e => e.pitches.length).map(e => e.pitches[0]);
  const steps = (pitch: string) => { const m = /^([A-G])\D*(\d)$/.exec(pitch)!; return Number(m[2]) * 7 + "CDEFGAB".indexOf(m[1]); };
  const moved = after.map((pitch, i) => steps(pitch) - steps(["D4", "F#4", "A4"][i]));
  expect(moved[0]).toBeLessThan(0);
  expect(new Set(moved).size).toBe(1);
  expect(after.some(pitch => pitch.includes("#"))).toBe(false); // Do mayor: el Fa# baja a una nota natural
});

test("notes move in time on the staff and every edit follows the snap", async ({ page }) => {
  await open(page);
  await page.getByRole("tab", { name: "Entrada por texto", exact: true }).click();
  await page.getByTestId("text-input").fill("voz melody\ncompas 1\nC4 negra; E4 negra");
  await page.getByTestId("text-apply").click();
  await page.getByTestId("snap").selectOption("960");
  await expect(page.locator("[data-note-id] .vf-notehead").first()).toBeVisible();
  const head = await page.locator("[data-note-id] .vf-notehead").first().evaluate(el => { const b = el.getBoundingClientRect(); return { x: b.x + b.width / 2, y: b.y + b.height / 2 }; });
  const second = await page.locator("section[data-measure='2'] svg").first().boundingBox();
  // Write tool: drag C4 to the right, into the middle of measure 2; the pitch stays.
  await page.mouse.move(head.x, head.y);
  await page.mouse.down();
  await page.mouse.move(second!.x + second!.width * 0.55, head.y, { steps: 12 });
  await expect(page.getByTestId("drop-line")).toBeAttached(); // a vertical line has no width, so it never counts as "visible"
  await page.mouse.up();
  await expect(page.getByTestId("drop-line")).toHaveCount(0);
  const events = (await api(page)).voices.find(v => v.id === "melody")!.events.filter(e => e.pitches.length);
  const moved = events.find(e => e.pitches[0] === "C4")!;
  expect(moved.start).toBeGreaterThanOrEqual(3840);
  expect(moved.start).toBeLessThan(7680);
  expect(moved.start % 960).toBe(0);
  expect(events.find(e => e.pitches[0] === "E4")!.start).toBe(960);
  // Key editor: with a half-note snap, 70 px (≈1.5 quarters) lands on beat 3, not on a 32nd.
  await page.getByRole("button", { name: "Teclas", exact: true }).click();
  await page.getByTestId("snap").selectOption("1920");
  await page.locator('[data-pitch="E4"]').evaluate(row => row.scrollIntoView({ block: "center" }));
  const note = (await page.locator('[data-pitch="E4"] [data-roll-note]').first().boundingBox())!;
  await page.mouse.move(note.x + 10, note.y + note.height / 2);
  await page.mouse.down();
  await page.mouse.move(note.x + 10 + 70, note.y + note.height / 2, { steps: 8 });
  await page.mouse.up();
  expect((await api(page)).voices.find(v => v.id === "melody")!.events.find(e => e.pitches[0] === "E4")!.start).toBe(1920);
});

test("a tied note is one note: one bar in the key editor, selected, moved and erased whole", async ({ page }) => {
  await open(page);
  // E4 on beat 1, then C5: a half on beat 3 tied over the barline to a quarter.
  await page.evaluate(() => {
    const agent = (window as unknown as { stormSequencer: SequencerAgentApi }).stormSequencer;
    const score = agent.getScore();
    const note = (id: string, start: number, pitch: string, duration: "h" | "q", tie: boolean) => ({ id, start, duration, dotted: false, triplet: false, tie, pitches: [pitch] });
    score.voices.find(v => v.id === "melody")!.events = [note("x", 0, "E4", "q", false), note("a", 1920, "C5", "h", true), note("b", 3840, "C5", "q", false)];
    agent.loadScore(score);
  });
  const melodyEvents = async () => (await page.evaluate(() => (window as unknown as { stormSequencer: SequencerAgentApi }).stormSequencer.getScore()))
    .voices.find(v => v.id === "melody")!.events.map(e => ({ id: e.id, at: `${e.start}:${e.pitches.join("+")}` }));
  await page.getByRole("button", { name: "Teclas", exact: true }).click();
  await page.locator('[data-pitch="C5"]').evaluate(row => row.scrollIntoView({ block: "center" }));
  // Drawn as one bar: only the first piece is labelled; only the last one has the resize grip.
  await expect(page.locator('[data-roll-note="a"]')).toHaveAttribute("data-tie", "start");
  await expect(page.locator('[data-roll-note="b"]')).toHaveAttribute("data-tie", "end");
  await expect(page.locator('[data-roll-note="b"]')).toHaveText(/^\W*$/);
  // A click on the second piece selects the whole note.
  await page.locator('[data-roll-note="b"]').click({ position: { x: 4, y: 10 } });
  await expect(page.locator('[data-roll-note="a"]')).toHaveAttribute("aria-pressed", "true");
  await expect(page.locator('[data-roll-note="b"]')).toHaveAttribute("aria-pressed", "true");
  // Dragging one piece up a whole tone moves the whole tied note.
  const box = (await page.locator('[data-roll-note="b"]').boundingBox())!;
  await page.mouse.move(box.x + 4, box.y + box.height / 2);
  await page.mouse.down();
  await page.mouse.move(box.x + 4, box.y + box.height / 2 - 52, { steps: 8 });
  await page.mouse.up();
  expect((await melodyEvents()).map(e => e.at)).toEqual(["0:E4", "1920:D5", "3840:D5"]);
  // Score + eraser: clicking the tied-to (second) piece erases the whole note.
  await page.getByRole("button", { name: "Partitura", exact: true }).click();
  await page.getByRole("button", { name: "Borrar", exact: true }).click();
  const second = (await melodyEvents()).find(e => e.at === "3840:D5")!.id;
  await expect(page.locator(`[data-note-id="${second}"] .vf-notehead`)).toBeVisible();
  await page.locator(`[data-note-id="${second}"] .vf-notehead`).click();
  expect((await melodyEvents()).map(e => e.at)).toEqual(["0:E4"]);
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

for (const transpose of [-24, -12, 0, 12, 24]) test(`microphone octave shift ${transpose} writes the held note once`, async ({ page }) => {
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
  await page.getByRole("combobox", { name: "Escribir a", exact: true }).selectOption(String(transpose));
  await page.getByTestId("mic-toggle").click();
  await expect(page.getByTestId("mic-toggle")).toHaveAttribute("data-mic", "listening");
  await expect.poll(() => melody(page), { timeout: 8000 }).toEqual([`A${4 + transpose / 12}`]);
  await expect(page.getByTestId("mic-pitch")).toHaveText(`Escucho La4 → escribo La${4 + transpose / 12}`);
  // Changing the shift while a note is held must not rewrite it or insert it again.
  await page.getByRole("combobox", { name: "Escribir a", exact: true }).selectOption(String(transpose === 0 ? 12 : 0));
  // The note keeps sounding: it must not be written again.
  await page.waitForTimeout(700);
  expect(await melody(page)).toEqual([`A${4 + transpose / 12}`]);
  await page.getByTestId("mic-toggle").click();
  await expect(page.getByTestId("mic-toggle")).toHaveAttribute("data-mic", "off");
});
