import { expect, test } from "@playwright/test";
import { SEQUENCER_EXAMPLES } from "../lib/sequencer/examples";
import { readFile } from "node:fs/promises";
import { createScore } from "../lib/sequencer/model";

// Valid tiny PCM WAV: exercise Web Audio decoding without a network dependency.
function sampleWav() {
  const bytes = Buffer.alloc(44 + 4410 * 2);
  bytes.write("RIFF", 0); bytes.writeUInt32LE(bytes.length - 8, 4); bytes.write("WAVEfmt ", 8);
  bytes.writeUInt32LE(16, 16); bytes.writeUInt16LE(1, 20); bytes.writeUInt16LE(1, 22);
  bytes.writeUInt32LE(44100, 24); bytes.writeUInt32LE(88200, 28); bytes.writeUInt16LE(2, 32); bytes.writeUInt16LE(16, 34);
  bytes.write("data", 36); bytes.writeUInt32LE(bytes.length - 44, 40);
  for (let i = 0; i < 4410; i++) bytes.writeInt16LE(Math.round(Math.sin(i * 2 * Math.PI * 261.63 / 44100) * 1500), 44 + i * 2);
  return bytes;
}

test.beforeEach(async ({ page }) => {
  await page.route("**/api/audio/**", route => route.fulfill({ body: sampleWav(), contentType: "audio/wav" }));
  await page.route("**/_vercel/**", route => route.abort());
});

test("agent writes four measures, edits exactly, undoes, switches views and recovers a draft", async ({ page }) => {
  const errors: string[] = [];
  page.on("pageerror", e => errors.push(e.message));
  await page.goto("/es/sequencer/v4");
  // Wait for client hydration: filling the server-rendered textarea before React
  // attaches onChange can leave the default eight-note example in React state.
  await page.waitForFunction(() => Boolean(window.stormSequencer));
  await page.getByLabel("Texto musical").fill("voz melody\ncompas 1\nC4 negra; D4 negra; E4 negra; F4 negra\ncompas 2\nG4 blanca; A4 blanca\ncompas 3\n[C4 E4 G4] redonda\ncompas 4\nsilencio negra; C5 blanca puntillo");
  await page.getByRole("button", { name: "Validar texto", exact: true }).click();
  await expect(page.getByTestId("text-validation")).toContainText("0 errores");
  await page.getByRole("button", { name: "Aplicar texto", exact: true }).click();
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(9);
  await page.getByRole("button", { name: "Lista de notas", exact: true }).click();
  await page.getByRole("button", { name: "Editar Melodía, compás 1, pulso 2", exact: true }).click();
  await page.getByLabel("Notas / acorde").fill("Db4");
  await page.getByRole("button", { name: "Actualizar selección", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Db4");
  await page.getByRole("button", { name: "Deshacer", exact: true }).click();
  await expect(page.locator("tbody")).not.toContainText("Db4");
  await page.getByRole("button", { name: "Rehacer", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("Db4");
  await page.getByRole("button", { name: "Piano Roll", exact: true }).click();
  await page.getByRole("button", { name: "Pentagrama", exact: true }).click();
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(9);
  await expect(page.getByRole("status").first()).toContainText("Borrador guardado");
  await page.reload();
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(9);
  expect(errors).toEqual([]);
  await page.screenshot({ path: ".local-work/sequencer-desktop.png" });
});

for (const example of SEQUENCER_EXAMPLES) {
  test("example renders without errors: " + example.id, async ({ page }) => {
    await page.goto("/es/sequencer/v4");
    await page.getByLabel("Ejemplo", { exact: true }).selectOption(example.id);
    await page.getByRole("button", { name: "Validar texto", exact: true }).click();
    await expect(page.getByTestId("text-validation")).toContainText("0 errores");
    await page.getByRole("button", { name: "Aplicar texto", exact: true }).click();
    await expect(page.getByTestId("score-view").locator("svg")).toHaveCount(4);
    await expect(page.getByTestId("sequencer-studio").locator('[role="alert"]')).toHaveCount(0);
    await expect(page.getByTestId("score-view").locator("[data-note-id]").first()).toBeVisible();
  });
}

test("invalid text is transactional and keyboard entry requires no coordinates", async ({ page }) => {
  await page.goto("/es/sequencer/v4");
  await expect(page.getByTestId("sequencer-studio")).not.toHaveAttribute("inert", "");
  await page.getByLabel("Texto musical").fill("voz melody\ncompas 1\nH4 negra");
  await expect(page.getByLabel("Texto musical")).toHaveValue("voz melody\ncompas 1\nH4 negra");
  await page.getByRole("button", { name: "Validar texto", exact: true }).click();
  await expect(page.getByLabel("Texto musical")).toHaveValue("voz melody\ncompas 1\nH4 negra");
  await expect(page.getByRole("button", { name: "Aplicar texto", exact: true })).toBeDisabled();
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(0);
  await page.getByRole("button", { name: "Escribir con teclado", exact: true }).click();
  const keyboard = page.getByRole("region", { name: "Escritura con teclado", exact: true });
  await keyboard.press("c"); await keyboard.press("d"); await keyboard.press("e"); await keyboard.press("f");
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(4);
  await expect(page.getByLabel("Compás", { exact: true })).toHaveValue("2");
});

test("presentation, SVG PNG MIDI MusicXML and WAV exports work locally", async ({ page }) => {
  await page.goto("/es/sequencer/v4");
  await page.getByRole("button", { name: "Validar texto", exact: true }).click();
  await page.getByRole("button", { name: "Aplicar texto", exact: true }).click();
  await page.getByRole("button", { name: "Escenas", exact: true }).click();
  await page.getByLabel("Hasta compás").fill("2");
  await page.getByLabel("Título de escena").fill("Escala de Do");
  await page.getByLabel("Explicación").fill("Ocho notas, una octava.");
  await page.getByRole("button", { name: "Presentar escena", exact: true }).click();
  await expect(page.getByTestId("presentation-stage")).toContainText("Escala de Do");
  await expect(page.getByTestId("presentation-stage").locator("svg")).toHaveCount(2);
  for (const [name, extension] of [["SVG", ".svg"], ["PNG", ".png"], ["Exportar MIDI", ".mid"], ["Exportar MusicXML", ".musicxml"], ["WAV", ".wav"]]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const result = await download;
    expect(result.suggestedFilename()).toMatch(new RegExp(extension.replace(".", "\\.") + "$"));
    expect(await result.failure()).toBeNull();
    if(extension === ".png") await result.saveAs(".local-work/sequencer-export.png");
  }
  await page.getByRole("button", { name: "Reproducir", exact: true }).click();
  await expect(page.getByTestId("audio-state")).toHaveText("Reproduciendo");
  await page.getByRole("button", { name: "Detener", exact: true }).click();
  await expect(page.getByTestId("audio-state")).toHaveText("Detenido");
  await page.screenshot({ path: ".local-work/sequencer-presentation.png" });
});

test("MusicXML round trip preserves written chords and time changes keep later notes in their measures", async ({ page }) => {
  await page.goto("/es/sequencer/v4");
  await expect(page.getByTestId("sequencer-studio")).not.toHaveAttribute("inert", "");
  await page.getByLabel("Texto musical").fill("voz melody\ncompas 1\n[C4 Eb4 G4] blanca; silencio blanca\ncompas 2\nDb4 negra; E4 negra; F4 negra; silencio negra");
  await page.getByRole("button", { name: "Validar texto", exact: true }).click();
  await page.getByRole("button", { name: "Aplicar texto", exact: true }).click();
  const pending = page.waitForEvent("download");
  await page.getByRole("button", { name: "Cifrados y anotaciones", exact: true }).click();
  await page.getByLabel("Texto de anotación").fill("I < V7");
  await page.getByRole("button", { name: "Guardar anotación", exact: true }).click();
  await expect(page.getByTestId("score-view").locator("svg").first()).toContainText("I < V7");
  await page.getByRole("button", { name: "Exportar MusicXML", exact: true }).click();
  const download = await pending;
  await download.saveAs(".local-work/sequencer-roundtrip.musicxml");
  page.once("dialog", dialog => dialog.accept());
  await page.getByRole("button", { name: "Nuevo proyecto", exact: true }).click();
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(0);
  await page.locator('input[type="file"]').setInputFiles(".local-work/sequencer-roundtrip.musicxml");
  await expect(page.getByRole("status").first()).toContainText("Proyecto abierto.");
  // MusicXML explicitly represents the two empty measures as whole-measure rests.
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(8);
  await expect(page.getByTestId("score-view").locator("svg").first()).toContainText("I < V7");
  await page.getByRole("button", { name: "Lista de notas", exact: true }).click();
  await expect(page.locator("tbody")).toContainText("C4 Eb4 G4");
  await page.getByLabel("Compás", { exact: true }).fill("1");
  await page.getByLabel("Compás rítmico", { exact: true }).selectOption("6/8");
  await expect(page.getByRole("button", { name: "Editar Melodía, compás 2, pulso 1", exact: true })).toBeVisible();
  await expect(page.getByTestId("sequencer-studio").locator('[role="alert"]')).toHaveCount(0);
});

test("English and narrow screens keep accessible writing controls", async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/en/sequencer/v4");
  await expect(page.getByRole("button", { name: "Insert note", exact: true })).toBeVisible();
  await page.getByLabel("Notes / chord").fill("C4 E4 G4");
  await page.getByRole("button", { name: "Insert note", exact: true }).click();
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(1);
  await expect(page.getByTestId("sequencer-studio").locator('[role="alert"]')).toHaveCount(0);
  await page.screenshot({ path: ".local-work/sequencer-mobile.png", fullPage: true });
});

test("real R2 banks decode and render audible WAV for all five instruments", async ({page})=>{
  test.skip(process.env.STORM_REAL_SAMPLES!=="1","Optional manual probe with downloaded R2 fixtures.");
  await page.route("**/api/audio/**",async route=>{
    const instrument=new URL(route.request().url()).pathname.split("/")[3];
    await route.fulfill({body:await readFile(".local-work/real-samples/"+instrument+".mp3"),contentType:"audio/mpeg"});
  });
  await page.goto("/es/sequencer/v4");
  await page.getByRole("button",{name:"Insertar nota",exact:true}).click();
  for(const instrument of ["Piano","Cello","Corno","Coro","Fagot"]) {
    await page.getByLabel("Instrumento de Melodía").selectOption(instrument);
    const pending=page.waitForEvent("download");
    await page.getByRole("button",{name:"WAV",exact:true}).click();
    const download=await pending;
    expect(await download.failure()).toBeNull();
    const bytes=await readFile((await download.path())!);
    expect(bytes.toString("ascii",0,4)).toBe("RIFF");
    let peak=0;for(let i=44;i<Math.min(bytes.length,44100*4);i+=2)peak=Math.max(peak,Math.abs(bytes.readInt16LE(i)));
    expect(peak).toBeGreaterThan(100);
    await expect(page.getByTestId("sequencer-studio")).not.toContainText("Algunos sonidos no pudieron descargarse");
  }
});

test("mouse writes on the staff, drags pitch, erases with right-click and supports undo",async({page})=>{
  await page.goto("/es/sequencer/v4");
  const svg=page.getByTestId("score-view").locator("svg").first();
  await expect(svg).toHaveAttribute("data-mouse-staff","true");
  const bounds=(await svg.boundingBox())!;
  await svg.click({position:{x:220/620*bounds.width,y:94/215*bounds.height}});
  const first=svg.locator('[data-note-id]').first();
  await expect(first).toHaveAttribute("aria-label",/E4/);
  const noteBounds=(await first.boundingBox())!;
  await page.mouse.move(noteBounds.x+noteBounds.width/2,noteBounds.y+noteBounds.height/2);
  // Drag works in staff steps of at least 7 screen pixels; two steps up from E4 is G4, labelled while dragging.
  const step=Math.max(7,5*bounds.height/215),x=noteBounds.x+noteBounds.width/2,y=noteBounds.y+noteBounds.height/2;
  await page.mouse.down();await page.mouse.move(x,y-step,{steps:3});await page.mouse.move(x,y-2*step,{steps:3});
  await expect(svg.locator("text",{hasText:"G4"})).toBeVisible();
  await page.mouse.up();
  await expect(svg.locator('[data-note-id]').first()).toHaveAttribute("aria-label",/G4/);
  await svg.locator('[data-note-id]').first().click({button:"right"});
  await expect(svg.locator('[data-note-id]')).toHaveCount(0);
  await page.getByRole("button",{name:"Deshacer",exact:true}).click();
  await expect(svg.locator('[data-note-id]').first()).toHaveAttribute("aria-label",/G4/);
  await page.screenshot({path:".local-work/sequencer-v4-mouse.png"});
});

test("piano roll writes, moves, resizes and erases notes with the mouse",async({page})=>{
  await page.goto("/es/sequencer/v4");
  await page.getByRole("button",{name:"Piano Roll",exact:true}).click();
  const track=page.locator('[data-pitch="C4"]');
  await track.click({position:{x:6,y:13}});
  const note=page.locator('[data-roll-note]').first();await expect(note).toHaveText(/C4/);
  let box=(await note.boundingBox())!;
  await page.mouse.move(box.x+5,box.y+10);await page.mouse.down();await page.mouse.move(box.x+5,box.y+10-26);await page.mouse.up();
  await expect(note).toHaveText(/C#4/);
  box=(await note.boundingBox())!;
  await page.mouse.move(box.x+box.width-3,box.y+10);await page.mouse.down();await page.mouse.move(box.x+box.width+45,box.y+10);await page.mouse.up();
  await expect(note).toHaveCSS("width","94px");
  await note.click({button:"right"});await expect(page.locator('[data-roll-note]')).toHaveCount(0);
});

test("SATB is grouped and time-aligned; page mode shows one page while continuous mode shows the line",async({page})=>{
  await page.goto("/es/sequencer/v4");
  await page.getByLabel("Ejemplo",{exact:true}).selectOption("satb-cadencia-autentica");
  await page.getByRole("button",{name:"Validar texto",exact:true}).click();await page.getByRole("button",{name:"Aplicar texto",exact:true}).click();
  const score=page.getByTestId("score-view");await expect(score).toHaveAttribute("data-layout","line");
  const bar=score.locator('[data-measure="1"]');
  for(const voice of ["Soprano","Alto","Tenor","Bajo"])await expect(bar.locator('svg')).toContainText(voice);
  const aligned=await bar.locator('[data-note-id][data-event-start="0"]').evaluateAll(notes=>notes.map(n=>n.getBoundingClientRect().x));
  expect(Math.max(...aligned)-Math.min(...aligned)).toBeLessThan(3);
  // A page holds two SATB systems of three measures; clef and key open every system, the meter only the first.
  for(let i=0;i<3;i++)await page.getByRole("button",{name:"Añadir compás",exact:true}).click();
  await page.getByRole("button",{name:"Vista por páginas",exact:true}).click();await expect(score.locator('[data-measure]')).toHaveCount(6);
  await expect(score.locator('[data-measure="4"] .vf-clef')).toHaveCount(4);await expect(score.locator('[data-measure="4"] .vf-timesignature')).toHaveCount(0);
  await expect(score.locator('[data-measure="2"] .vf-clef')).toHaveCount(0);
  await page.getByRole("button",{name:"Página siguiente",exact:true}).click();await expect(score.locator('[data-measure="1"]')).toHaveCount(0);await expect(score.locator('[data-measure="7"]')).toBeVisible();
  await page.getByRole("button",{name:"Página anterior",exact:true}).click();await expect(bar).toBeVisible();
  await page.getByRole("button",{name:"Vista continua",exact:true}).click();await expect(score.locator('[data-measure]')).toHaveCount(7);
  await page.screenshot({path:".local-work/sequencer-v4-satb.png"});
});

test("v3 keeps the videos' URL and links to v4 without replacing the legacy editor",async({page})=>{
  await page.goto("/es/sequencer");
  await expect(page.locator('iframe[src="/tools/secuenciador.html"]')).toBeVisible();
  await expect(page.locator('a[href="/es/sequencer/v4"]')).toBeVisible();
  await expect(page.frameLocator('iframe').locator('#canvas-container')).toBeVisible();
});

test("page view turns automatically during playback and keeps the reached page on stop",async({page})=>{
  await page.goto("/es/sequencer/v4");
  // One voice: 15 measures per page (five systems of three).
  for(let i=0;i<12;i++)await page.getByRole("button",{name:"Añadir compás",exact:true}).click();
  await page.getByRole("button",{name:"Vista por páginas",exact:true}).click();
  await page.getByLabel("Tempo",{exact:true}).fill("240");
  await page.getByLabel("Compás",{exact:true}).fill("15");await page.getByLabel("Pulso",{exact:true}).fill("4");
  await page.getByRole("button",{name:"Reproducir",exact:true}).click();
  await expect(page.getByTestId("score-view").locator('[data-measure="16"]')).toBeVisible();
  await page.getByRole("button",{name:"Detener",exact:true}).click();
  await expect(page.getByTestId("score-view").locator('[data-measure="16"]')).toBeVisible();
  await expect(page.getByTestId("score-view").locator('[data-measure="1"]')).toHaveCount(0);
});

test("continuous staff repeats signatures only for actual changes and joins staff lines",async({page})=>{
  const project=createScore("satb");
  project.measures[0].key="D";project.measures[1].key="D";
  project.measures[2].time=[3,4];project.measures[3].time=[3,4];
  await page.goto("/es/sequencer/v4");
  await page.locator('input[type="file"]').setInputFiles({name:"signature-changes.json",mimeType:"application/json",buffer:Buffer.from(JSON.stringify(project))});
  const score=page.getByTestId("score-view"),first=score.locator('[data-measure="1"]'),second=score.locator('[data-measure="2"]'),third=score.locator('[data-measure="3"]'),fourth=score.locator('[data-measure="4"]');
  await expect(first.locator('.vf-clef')).toHaveCount(4);
  await expect(first.locator('.vf-keysignature')).toHaveCount(4);
  await expect(second.locator('.vf-clef,.vf-keysignature,.vf-timesignature')).toHaveCount(0);
  await expect(third.locator('.vf-keysignature')).toHaveCount(4);
  await expect(third.locator('.vf-keysignature text')).toHaveCount(8); // D→C prints two cancellation naturals per voice.
  await expect(third.locator('.vf-timesignature')).toHaveCount(4);
  await expect(fourth.locator('.vf-clef,.vf-keysignature,.vf-timesignature')).toHaveCount(0);
  await expect(second.locator('svg')).not.toContainText('Soprano');
  await page.screenshot({path:".local-work/sequencer-v4-continuous.png"});
});

test("staff and piano roll audition each moved pitch before releasing the mouse",async({page})=>{
  await page.addInitScript(()=>{
    const original=AudioContext.prototype.createBufferSource;
    const played:number[]=[];(window as unknown as {played:number[]}).played=played;
    AudioContext.prototype.createBufferSource=function(){const source=original.call(this),start=source.start.bind(source);source.start=(...args:Parameters<typeof source.start>)=>{played.push(source.playbackRate.value);start(...args);};return source;};
  });
  await page.goto("/es/sequencer/v4");
  await page.getByLabel("Texto musical").fill("voz melody\ncompas 1\nC4 negra");
  await page.getByRole("button",{name:"Validar texto",exact:true}).click();await page.getByRole("button",{name:"Aplicar texto",exact:true}).click();
  await page.getByTestId('score-view').locator('[data-note-id]').first().scrollIntoViewIfNeeded();
  let box=(await page.getByTestId('score-view').locator('[data-note-id]').first().boundingBox())!;
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2);await page.mouse.down();
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {played:number[]}).played.length)).toBeGreaterThan(0);
  const heard=await page.evaluate(()=>(window as unknown as {played:number[]}).played.length);
  await page.mouse.move(box.x+box.width/2,box.y+box.height/2-12);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {played:number[]}).played.length)).toBeGreaterThan(heard);
  await page.mouse.up();
  await page.getByRole('button',{name:'Piano Roll',exact:true}).click();
  await page.locator('[data-roll-note]').first().scrollIntoViewIfNeeded();
  box=(await page.locator('[data-roll-note]').first().boundingBox())!;
  await page.mouse.move(box.x+10,box.y+10);await page.mouse.down();
  const beforeMove=await page.evaluate(()=>(window as unknown as {played:number[]}).played.length);
  await page.mouse.move(box.x+10,box.y-42);
  await expect.poll(()=>page.evaluate(()=>(window as unknown as {played:number[]}).played.length)).toBeGreaterThan(beforeMove);
  await page.mouse.up();
});

test("Space plays and stops from anywhere except text fields, and the transport does not move",async({page})=>{
  await page.goto("/es/sequencer/v4");
  await page.waitForFunction(() => Boolean(window.stormSequencer));
  const state=page.getByTestId("audio-state"),play=page.getByRole("button",{name:"Reproducir",exact:true});
  const before=await play.boundingBox();
  const whole=page.getByRole("button",{name:"Elegir Entera",exact:true});
  await whole.focus();await page.keyboard.press("Space");
  await expect(state).not.toHaveText("Detenido");
  await expect(whole).toHaveAttribute("aria-pressed","false"); // Space did not click the focused button
  expect((await play.boundingBox())!.x).toBeCloseTo(before!.x,0);
  await page.keyboard.press("Space");await expect(state).toHaveText("Detenido");
  await page.getByLabel("Texto musical").focus();await page.keyboard.press("Space");
  await expect(state).toHaveText("Detenido");
});

test("tempo can be typed freely, applies on Enter or blur, clamps to range and Escape cancels",async({page})=>{
  await page.goto("/es/sequencer/v4");
  await page.waitForFunction(() => Boolean(window.stormSequencer));
  const tempo=page.getByLabel("Tempo",{exact:true});
  const current=()=>page.evaluate(()=>window.stormSequencer!.getScore().tempo);
  await tempo.fill("");await tempo.pressSequentially("72");await tempo.press("Enter");
  expect(await current()).toBe(72);
  await tempo.fill("500");await tempo.blur();expect(await current()).toBe(240);await expect(tempo).toHaveValue("240");
  await tempo.fill("9");await tempo.press("Escape");expect(await current()).toBe(240);await expect(tempo).toHaveValue("240");
});

test("go to start and go to end move the cursor (buttons and Home/End keys)",async({page})=>{
  await page.goto("/es/sequencer/v4");
  await page.waitForFunction(() => Boolean(window.stormSequencer));
  await page.evaluate(()=>window.stormSequencer!.loadText("voz melody\ncompas 1\nC4 negra; D4 negra; E4 negra; F4 negra\ncompas 2\nG4 blanca"));
  const measure=page.getByLabel("Compás",{exact:true}),beat=page.getByLabel("Pulso",{exact:true});
  await page.getByRole("button",{name:"Ir al final",exact:true}).click();
  await expect(measure).toHaveValue("2");await expect(beat).toHaveValue("3");
  await page.getByRole("button",{name:"Ir al inicio",exact:true}).click();
  await expect(measure).toHaveValue("1");await expect(beat).toHaveValue("1");
  await page.getByRole("region",{name:"Escritura con teclado",exact:true}).focus();
  await page.keyboard.press("End");await expect(measure).toHaveValue("2");
  await page.keyboard.press("Home");await expect(measure).toHaveValue("1");
});

test("select tool: rubber band picks several notes, Ctrl+D duplicates after them, Ctrl+C/Ctrl+V pastes at the cursor",async({page})=>{
  await page.goto("/es/sequencer/v4");
  await page.waitForFunction(() => Boolean(window.stormSequencer));
  await page.evaluate(()=>window.stormSequencer!.loadText("voz melody\ncompas 1\nC4 negra; D4 negra; E4 negra; F4 negra"));
  await page.getByRole("button",{name:"↖ Seleccionar",exact:true}).click();
  const score=page.getByTestId("score-view"),bar=score.locator('[data-measure="1"] svg').first();
  const box=(await bar.boundingBox())!;
  // Drag from empty space above the staff across the whole measure.
  await page.mouse.move(box.x+box.width*0.2,box.y+4);await page.mouse.down();
  await page.mouse.move(box.x+box.width*0.6,box.y+box.height*0.5,{steps:4});
  await expect(page.getByTestId("marquee")).toBeVisible();
  await page.mouse.move(box.x+box.width-2,box.y+box.height-4,{steps:4});await page.mouse.up();
  await expect(score.locator('[data-note-id][aria-pressed="true"]')).toHaveCount(4);
  await page.keyboard.press("Control+d");
  const described=()=>page.evaluate(()=>window.stormSequencer!.describe());
  await expect.poll(described).toContain("Compás 2 (4/4, C): 4 eventos");
  await expect(score.locator('[data-measure="2"] [data-note-id][aria-pressed="true"]')).toHaveCount(4);
  await page.keyboard.press("Control+c");
  await page.getByLabel("Compás",{exact:true}).fill("4");await page.getByLabel("Pulso",{exact:true}).fill("1");
  await page.getByRole("button",{name:"Pegar",exact:true}).click();
  await expect.poll(described).toContain("Compás 4 (4/4, C): 4 eventos");
  await page.getByRole("button",{name:"Deshacer",exact:true}).click();
  await expect.poll(described).not.toContain("Compás 4 (4/4, C): 4 eventos");
});

test("dragging a note reaches every staff step without skipping (up and down)",async({page})=>{
  await page.goto("/es/sequencer/v4");
  await page.waitForFunction(() => Boolean(window.stormSequencer));
  await page.evaluate(()=>window.stormSequencer!.loadText("voz melody\ncompas 1\nB4 redonda"));
  const svg=page.getByTestId("score-view").locator("svg").first();
  const bounds=(await svg.boundingBox())!,step=Math.max(7,5*bounds.height/215);
  const expected:Record<number,string>={1:"C5",2:"D5",3:"E5",4:"F5",5:"G5",[-1]:"A4",[-2]:"G4",[-3]:"F4",[-4]:"E4",[-5]:"D4"};
  for(const [k,pitch] of Object.entries(expected)){
    await svg.scrollIntoViewIfNeeded();
    const note=svg.locator('[data-note-id]').first(),head=(await note.locator(".vf-notehead").first().boundingBox())!;
    const x=head.x+head.width/2,y=head.y+head.height/2;
    await page.mouse.move(x,y);await page.mouse.down();
    for(let i=1;i<=Math.abs(Number(k));i++)await page.mouse.move(x,y-Math.sign(Number(k))*i*step,{steps:2});
    await page.mouse.up();
    await expect.poll(()=>page.evaluate(()=>window.stormSequencer!.getScore().voices[0].events[0].pitches[0])).toBe(pitch);
    await page.keyboard.press("Control+z");
    await expect.poll(()=>page.evaluate(()=>window.stormSequencer!.getScore().voices[0].events[0].pitches[0])).toBe("B4");
  }
});

test("dragging follows the key signature even after an accidental button was used",async({page})=>{
  await page.goto("/es/sequencer/v4");
  await page.waitForFunction(() => Boolean(window.stormSequencer));
  await page.evaluate(()=>window.stormSequencer!.loadText("voz melody\ncompas 1\nF4 redonda"));
  await page.getByLabel("Armadura",{exact:true}).selectOption("Db");
  await page.getByRole("button",{name:"Alteración natural",exact:true}).click(); // writing mode: naturals
  const svg=page.getByTestId("score-view").locator("svg").first();await svg.scrollIntoViewIfNeeded();
  const bounds=(await svg.boundingBox())!,step=Math.max(7,5*bounds.height/215);
  const head=(await svg.locator('[data-note-id]').first().locator(".vf-notehead").first().boundingBox())!;
  const x=head.x+head.width/2,y=head.y+head.height/2;
  await page.mouse.move(x,y);await page.mouse.down();
  for(let i=1;i<=3;i++)await page.mouse.move(x,y-i*step,{steps:2});
  await expect(svg.locator("text",{hasText:"B♭4"})).toBeVisible();
  await page.mouse.up();
  await expect.poll(()=>page.evaluate(()=>window.stormSequencer!.getScore().voices[0].events[0].pitches[0])).toBe("Bb4");
});

test("chord noteheads support partial click, keyboard edits and marquee selection from the staff margin",async({page})=>{
  const project=createScore();
  project.voices[0].events=[0,1920].map((start,i)=>({id:`chord-${i+1}`,start,duration:"h",dotted:false,triplet:false,pitches:["C4","E4","G4"],tie:false}));
  await page.goto("/es/sequencer/v4");
  await page.waitForFunction(()=>Boolean(window.stormSequencer));
  await page.evaluate(score=>window.stormSequencer!.loadScore(score),project);
  await page.getByRole("button",{name:"✎ Escribir",exact:true}).click();
  const score=page.getByTestId("score-view"),first=score.locator('[data-note-id="chord-1"]'),second=score.locator('[data-note-id="chord-2"]');
  const pitches=()=>page.evaluate(()=>window.stormSequencer!.getScore().voices[0].events.map(event=>({id:event.id,pitches:event.pitches})));
  const headCenter=async(id:string,pitch:string)=>{
    const head=score.locator(`[data-note-id="${id}"] [data-note-pitch="${pitch}"]`);
    await expect(head).toHaveAttribute("data-note-key",`${id}@${pitch}`);
    const box=(await head.boundingBox())!,text=(await head.locator("text").boundingBox())!;
    // SVG text extends beyond the visible head; use its vertical center for a real mouse hit.
    return {x:box.x+box.width/2,y:text.y+text.height/2};
  };
  await first.scrollIntoViewIfNeeded();
  let middle=await headCenter("chord-1","E4");
  await page.mouse.click(middle.x,middle.y);
  await expect(first).toHaveAttribute("aria-pressed","mixed");
  await expect(second).toHaveAttribute("aria-pressed","false");
  await page.keyboard.press("ArrowUp");
  await expect.poll(pitches).toEqual([{id:"chord-1",pitches:["C4","F4","G4"]},{id:"chord-2",pitches:["C4","E4","G4"]}]);
  await expect(first).toHaveAttribute("aria-pressed","mixed");
  const upper=await headCenter("chord-1","G4");
  await page.keyboard.down("Shift");
  try{await page.mouse.click(upper.x,upper.y);}finally{await page.keyboard.up("Shift");}
  await expect(first).toHaveAttribute("aria-pressed","mixed");
  await page.keyboard.press("Delete");
  await expect.poll(pitches).toEqual([{id:"chord-1",pitches:["C4"]},{id:"chord-2",pitches:["C4","E4","G4"]}]);

  await page.evaluate(score=>window.stormSequencer!.loadScore(score),project);
  await page.getByRole("button",{name:"↖ Seleccionar",exact:true}).click();
  await first.scrollIntoViewIfNeeded();
  const svg=(await score.locator('[data-measure="1"] svg').first().boundingBox())!;
  const top=await headCenter("chord-1","G4"),last=await headCenter("chord-2","G4");
  middle=await headCenter("chord-1","E4");
  const lower=await headCenter("chord-1","C4");
  // Start in the heading margin outside the SVG; stop between E4 and C4 to take the upper two heads of each chord.
  await page.mouse.move(top.x-10,svg.y-4);await page.mouse.down();
  await page.mouse.move(last.x+10,(middle.y+lower.y)/2,{steps:5});
  await expect(page.getByTestId("marquee")).toBeVisible();
  await page.mouse.up();
  await expect(page.getByTestId("marquee")).toHaveCount(0);
  await expect(first).toHaveAttribute("aria-pressed","mixed");
  await expect(second).toHaveAttribute("aria-pressed","mixed");
  await expect(score.locator('[data-note-id][aria-pressed="true"]')).toHaveCount(0);
  // Deleting the selection proves exactly which heads the box picked, including both untouched lower notes.
  await page.keyboard.press("Delete");
  await expect.poll(pitches).toEqual([{id:"chord-1",pitches:["C4"]},{id:"chord-2",pitches:["C4"]}]);
});
