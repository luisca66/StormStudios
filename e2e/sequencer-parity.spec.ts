import {expect,test} from "@playwright/test";
import {createScore} from "../lib/sequencer/model";

test.beforeEach(async({page})=>{
  const score=createScore();score.voices[0].instrument="Synth";
  score.voices[0].events=[{id:"parity-note",start:0,duration:"q",dotted:false,triplet:false,tie:false,pitches:["C4"]}];
  await page.addInitScript(value=>localStorage.setItem("storm-sequencer-studio-v1",JSON.stringify(value)),score);
  await page.route("**/_vercel/**",route=>route.abort());
  await page.goto("/es/sequencer/v4");
  await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(1);
});

test("v3 accidentals edit the selected note immediately and repeat into double accidentals",async({page})=>{
  await page.getByRole("button",{name:"Lista de notas",exact:true}).click();
  await page.getByRole("button",{name:"Editar Melodía, compás 1, pulso 1",exact:true}).click();
  await page.getByRole("button",{name:"Alteración #",exact:true}).click();
  await expect(page.getByLabel("Notas / acorde")).toHaveValue("C#4");
  await page.getByRole("button",{name:"Alteración #",exact:true}).click();
  await expect(page.getByLabel("Notas / acorde")).toHaveValue("C##4");
  await page.getByRole("button",{name:"Alteración natural",exact:true}).click();
  await expect(page.getByLabel("Notas / acorde")).toHaveValue("C4");
  await page.getByRole("button",{name:"Alteración b",exact:true}).click();
  await page.getByRole("button",{name:"Alteración b",exact:true}).click();
  await expect(page.getByLabel("Notas / acorde")).toHaveValue("Cbb4");
});

test("v3 semitone keys, tie, ornament, deletion and undo keep their original behavior",async({page})=>{
  await page.getByRole("button",{name:"Lista de notas",exact:true}).click();
  const edit=page.getByRole("button",{name:"Editar Melodía, compás 1, pulso 1",exact:true});await edit.click();
  await edit.press("ArrowUp");await expect(page.getByLabel("Notas / acorde")).toHaveValue("C#4");
  await edit.press("ArrowDown");await expect(page.getByLabel("Notas / acorde")).toHaveValue("C4");
  await edit.press("t");await expect(page.getByRole("button",{name:"Ligar selección",exact:true})).toHaveAttribute("aria-pressed","true");
  await page.getByRole("button",{name:"Ornamento de selección",exact:true}).click();
  await expect(page.getByRole("button",{name:"Ornamento de selección",exact:true})).toHaveAttribute("aria-pressed","true");
  await edit.press("Backspace");await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(0);
  await page.getByRole("button",{name:"Deshacer",exact:true}).click();await expect(page.getByTestId("score-view").locator("[data-note-id]")).toHaveCount(1);
});

test("key and meter edits inherit into following measures; clefs persist until the next change",async({page})=>{
  await page.getByLabel("Compás",{exact:true}).fill("2");
  await page.getByLabel("Armadura",{exact:true}).selectOption("G");
  await page.getByLabel("Compás rítmico",{exact:true}).selectOption("3/4");
  await page.getByLabel("Clave de esta voz",{exact:true}).selectOption("bass");
  await page.getByLabel("Compás",{exact:true}).fill("4");
  await expect(page.getByLabel("Armadura",{exact:true})).toHaveValue("G");
  await expect(page.getByLabel("Compás rítmico",{exact:true})).toHaveValue("3/4");
  await expect(page.getByLabel("Clave de esta voz",{exact:true})).toHaveValue("bass");
  await page.getByLabel("Compás",{exact:true}).fill("1");
  await expect(page.getByLabel("Armadura",{exact:true})).toHaveValue("C");
  await expect(page.getByLabel("Compás rítmico",{exact:true})).toHaveValue("4/4");
  await expect(page.getByLabel("Clave de esta voz",{exact:true})).toHaveValue("treble");
});

test("inline harmony symbols update the large monitor and can be hidden without losing data",async({page})=>{
  const cipher=page.getByLabel("Cifrado compás 1, pulso 1",{exact:true});
  await cipher.fill("I");await cipher.press("Enter");
  await expect(page.getByLabel("Cifrado vigente",{exact:true})).toHaveText("I");
  await page.getByLabel("Cifrado compás 1, pulso 2",{exact:true}).fill("V7");
  await page.getByLabel("Cifrado compás 1, pulso 2",{exact:true}).press("Enter");
  await page.getByLabel("Pulso",{exact:true}).fill("2");
  await expect(page.getByLabel("Cifrado vigente",{exact:true})).toHaveText("V7");
  await page.getByRole("button",{name:"Ocultar cifrados",exact:true}).click();
  await expect(page.getByLabel("Cifrado compás 1, pulso 1",{exact:true})).toHaveCount(0);
  await page.getByRole("button",{name:"Mostrar cifrados",exact:true}).click();
  await expect(page.getByLabel("Cifrado compás 1, pulso 1",{exact:true})).toHaveValue("I");
  await expect(page.getByLabel("Cifrado compás 1, pulso 2",{exact:true})).toHaveValue("V7");
});

test("explicit unchanged signatures still stop inheritance from an earlier measure",async({page})=>{
  await page.getByLabel("Compás",{exact:true}).fill("3");
  // Selecting the current value intentionally establishes a change marker.
  await page.getByLabel("Armadura",{exact:true}).selectOption("C");
  await page.getByLabel("Compás rítmico",{exact:true}).selectOption("4/4");
  await page.getByLabel("Compás",{exact:true}).fill("1");
  await page.getByLabel("Armadura",{exact:true}).selectOption("G");
  await page.getByLabel("Compás rítmico",{exact:true}).selectOption("3/4");
  await page.getByLabel("Compás",{exact:true}).fill("2");
  await expect(page.getByLabel("Armadura",{exact:true})).toHaveValue("G");
  await expect(page.getByLabel("Compás rítmico",{exact:true})).toHaveValue("3/4");
  await page.getByLabel("Compás",{exact:true}).fill("3");
  await expect(page.getByLabel("Armadura",{exact:true})).toHaveValue("C");
  await expect(page.getByLabel("Compás rítmico",{exact:true})).toHaveValue("4/4");
});

test("writing across a bar splits and ties automatically without losing duration",async({page})=>{
  await page.getByLabel("Pulso",{exact:true}).fill("4");
  await page.getByLabel("Duración",{exact:true}).selectOption("w");
  await page.getByLabel("Notas / acorde",{exact:true}).fill("D4");
  await page.getByRole("button",{name:"Insertar nota",exact:true}).click();
  await expect(page.getByTestId("sequencer-studio").locator('[role="alert"]')).toHaveCount(0);
  const score=page.getByTestId("score-view");
  await expect(score.locator('[data-note-id]')).toHaveCount(3);
  await expect(score.locator('[data-measure="1"] .vf-stavetie')).toHaveCount(1);
  await expect(score.locator('[data-measure="2"] .vf-stavetie')).toHaveCount(1);
  await expect.poll(()=>page.evaluate(()=>{
    const score=JSON.parse(localStorage.getItem("storm-sequencer-studio-v1")!);
    return score.voices[0].events.filter((e:{pitches:string[]})=>e.pitches.includes("D4")).map((e:{duration:string;dotted:boolean;tie:boolean})=>[e.duration,e.dotted,e.tie]);
  })).toEqual([["q",false,true],["h",true,false]]);
});

test("piano roll retains the low register, playback cursor and measure references",async({page})=>{
  await page.getByRole("button",{name:"Piano Roll",exact:true}).click();
  await expect(page.getByTestId("piano-roll").locator('[data-pitch="D2"]')).toBeAttached();
  await expect(page.getByTestId("piano-roll")).toContainText("Compás 4 · 4/4");
  await expect(page.getByTestId("roll-cursor")).toHaveCSS("left","70px");
  await page.getByLabel("Pulso",{exact:true}).fill("2");
  await expect(page.getByTestId("roll-cursor")).toHaveCSS("left","118px");
  await page.getByRole("button",{name:"Reproducir",exact:true}).click();
  await expect(page.getByTestId("roll-cursor")).toHaveCSS("background-color","rgb(225, 29, 72)");
  await page.getByRole("button",{name:"Detener",exact:true}).click();
});
