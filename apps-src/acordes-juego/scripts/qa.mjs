import fs from "node:fs";
import path from "node:path";
import ts from "typescript";

const cache = new Map();

function load(id, from = "src/main.ts") {
  let filename = id.startsWith("@/")
    ? path.join("src", id.slice(2))
    : id.startsWith(".")
      ? path.join(path.dirname(from), id)
      : id;
  filename = filename.replaceAll("\\", "/");
  if (!filename.endsWith(".ts")) filename += ".ts";
  if (cache.has(filename)) return cache.get(filename).exports;

  const module = { exports: {} };
  cache.set(filename, module);
  const output = ts.transpileModule(fs.readFileSync(filename, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const localRequire = (request) => load(request, filename);
  new Function("require", "module", "exports", output)(localRequire, module, module.exports);
  return module.exports;
}

const config = load("src/config.ts");
const chords = load("src/music/chords.ts");
const theory = load("src/music/theory.ts");
const questions = load("src/game/questions.ts");
const state = load("src/game/state.ts");
const listening = load("src/game/listening.ts");
const failures = [];
const check = (condition, message) => { if (!condition) failures.push(message); };

const introducedIds = config.ZONES.flatMap((zone) => zone.introGroups.flat());
check(chords.CHORD_TYPES.length === 33, "Deben existir 33 acordes");
check(new Set(introducedIds).size === 33, "Las zonas deben cubrir 33 acordes únicos");
check(introducedIds.every((id) => chords.CHORD_BY_ID[id]), "Hay un acorde de zona desconocido");

for (const chord of chords.CHORD_TYPES) {
  check(theory.hasSamplesFor("C4", chord), `C4 queda fuera de samples para ${chord.id}`);
}

const machine = new questions.QuestionMachine();
for (let zone = 1; zone <= 5; zone++) {
  for (let i = 0; i < 30; i++) {
    const question = machine.next(zone, 0, config.MODES.EXPEDITION.quota);
    check(question && theory.hasSamplesFor(question.rootNote, question.chord), `Pregunta inválida en zona ${zone}`);
    if (question) {
      const options = machine.optionsFor(question, zone, 0, config.MODES.EXPEDITION.quota);
      check(options.some((option) => option.id === question.chord.id), `Falta respuesta en zona ${zone}`);
    }
  }
}

const quota1 = config.MODES.EXPEDITION.quota; // 20 desde H1 (racha, PLAN-HITOS-2)
const expedition = new state.DiveState("EXPEDITION", 1);
for (let i = 0; i < 8; i++) expedition.answer("MAJOR", "MAJOR", false);
check(expedition.score === 152, `Ocho capturas (racha, sin abrir) deben sumar 152, sumaron ${expedition.score}`);
check(!expedition.isZoneOpen(1), "Ocho capturas NO deben abrir la zona (cuota es 20 desde H1)");

const fullStreak = new state.DiveState("EXPEDITION", 1);
for (let i = 0; i < quota1; i++) fullStreak.answer("MAJOR", "MAJOR", false);
check(fullStreak.score === 670, `${quota1} capturas seguidas deben sumar 670, sumaron ${fullStreak.score}`);
check(fullStreak.isZoneOpen(1), `${quota1} capturas seguidas deben abrir la zona 1`);
check(fullStreak.allowedBottomY() === config.ZONES[1].yBottom + 2, "La termoclina no abrió el paso a zona 2");

const brokenStreak = new state.DiveState("EXPEDITION", 1);
for (let i = 0; i < quota1; i++) brokenStreak.answer("MAJOR", "MAJOR", false);
brokenStreak.answer("MAJOR", "MINOR", false); // error DESPUÉS de abierta
check(brokenStreak.isZoneOpen(1), "Un error tras abrir la zona no debe volver a cerrarla (H1)");

const normalCapture = new state.DiveState("EXPEDITION", 5).answer("MAJOR_13", "MAJOR_13", false);
const leviathanCapture = new state.DiveState("EXPEDITION", 5).answer("MAJOR_13", "MAJOR_13", true);
check(leviathanCapture.points === normalCapture.points * 2, "El Leviatán debe valer el doble");

const halfQuota = config.MODES.EXPEDITION.quota / 2; // repaso arranca pasada la mitad
const reviewMachine = new questions.QuestionMachine();
const hadalQuestions = [
  reviewMachine.next(5, halfQuota, config.MODES.EXPEDITION.quota),
  reviewMachine.next(5, halfQuota, config.MODES.EXPEDITION.quota),
  reviewMachine.next(5, halfQuota, config.MODES.EXPEDITION.quota),
];
check(hadalQuestions[2]?.isReview === true, "La tercera pregunta hadal debe ser repaso");
if (hadalQuestions[2]) {
  const reviewOptions = reviewMachine.optionsFor(hadalQuestions[2], 5, halfQuota, config.MODES.EXPEDITION.quota);
  check(reviewOptions.every((option) => option.family === hadalQuestions[2].chord.family), "El repaso debe mostrar una sola familia");
}

const timeAttack = new state.DiveState("TIME_ATTACK", 1);
timeAttack.tickO2(2);
timeAttack.answer("MAJOR", "MAJOR", false);
check(timeAttack.o2 === 96, `Una captura debe sumar exactamente 8 s; O2=${timeAttack.o2}`);

const survival = new state.DiveState("SURVIVAL", 1);
for (let i = 0; i < 3; i++) survival.answer("MAJOR", "MINOR", false);
check(survival.hull === 0, "Tres fallos deben agotar el casco");

const leashDist = config.INTERACTION.listenLeashDistance;
check(!listening.shouldCancelListening(29.99, leashDist), "La escucha se canceló antes del límite");
check(listening.shouldCancelListening(30, leashDist), "La escucha no se canceló a los 30 s");
check(listening.shouldCancelListening(0, leashDist + 0.01), "La escucha no se canceló fuera de rango");
check(listening.distanceToInteractionRange(30) === 0, "Una criatura a 30 m debe estar en rango");
check(listening.distanceToInteractionRange(30.1) === 1, "La aproximación debe redondear hacia arriba");
check(listening.distanceToInteractionRange(47.2) === 18, "La distancia restante es incorrecta");

// H5: las 20 apariciones de Expedición deben recorrer verticalmente cada zona;
// no pueden repoblarse todas alrededor de la profundidad inicial.
for (let zone = 1; zone <= 5; zone++) {
  const ys = Array.from(
    { length: config.INTERACTION.spawnDepthSteps },
    (_, i) => config.creatureSpawnY(zone, i),
  );
  check(ys.every((y, i) => i === 0 || y < ys[i - 1]), `Apariciones sin descenso en zona ${zone}`);
  check(
    ys[0] - ys.at(-1) > config.WORLD.zoneHeight * 0.8,
    `Apariciones no cubren la zona ${zone}`,
  );
  check(
    Math.abs(ys[5] - ys[0]) > config.INTERACTION.spawnVerticalLead,
    `Se pueden generar seis criaturas sin mover la nave en zona ${zone}`,
  );
  check(
    config.creatureSpawnY(zone, config.INTERACTION.spawnDepthSteps) > ys.at(-1),
    `Los intentos extra no regresan hacia arriba en zona ${zone}`,
  );
}

if (failures.length) {
  console.error(`QA falló (${failures.length}):\n- ${failures.join("\n- ")}`);
  process.exitCode = 1;
} else {
  console.log("QA lógica OK: acordes, zonas, 150 preguntas, modos, repaso, Leviatán, escucha y progresión vertical.");
}
