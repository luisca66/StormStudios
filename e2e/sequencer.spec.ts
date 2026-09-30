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
  await page.getByRole("button", { name: "Entrada por texto", exact: true }).click();
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
  await page.mouse.down();await page.mouse.move(noteBounds.x+noteBounds.width/2,noteBounds.y+noteBounds.height/2-10/620*bounds.width);await page.mouse.up();
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
  await page.getByRole("button",{name:"Vista por páginas",exact:true}).click();await expect(score.locator('[data-measure]')).toHaveCount(2);
  await page.getByRole("button",{name:"Página siguiente",exact:true}).click();await expect(score.locator('[data-measure="1"]')).toHaveCount(0);await expect(score.locator('[data-measure="3"]')).toBeVisible();
  await page.getByRole("button",{name:"Página anterior",exact:true}).click();await expect(bar).toBeVisible();
  await page.getByRole("button",{name:"Vista continua",exact:true}).click();await expect(score.locator('[data-measure]')).toHaveCount(4);
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
  await page.getByRole("button",{name:"Añadir compás",exact:true}).click();
  await page.getByRole("button",{name:"Vista por páginas",exact:true}).click();
  await page.getByLabel("Tempo",{exact:true}).fill("240");
  await page.getByLabel("Compás",{exact:true}).fill("4");await page.getByLabel("Pulso",{exact:true}).fill("4");
  await page.getByRole("button",{name:"Reproducir",exact:true}).click();
  await expect(page.getByTestId("score-view").locator('[data-measure="5"]')).toBeVisible();
  await page.getByRole("button",{name:"Detener",exact:true}).click();
  await expect(page.getByTestId("score-view").locator('[data-measure="5"]')).toBeVisible();
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
