const app = window.__acordesApp;

if (!app) {
  throw new Error("No se pudo conectar la respuesta escrita con Cantar Acordes");
}

const LETTERS = ["C", "D", "E", "F", "G", "A", "B"];
const NATURAL_PITCH_CLASSES = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const PREFERRED_ROOTS = [
  { letter: "C", accidental: 0 },
  { letter: "C", accidental: 1 },
  { letter: "D", accidental: 0 },
  { letter: "E", accidental: -1 },
  { letter: "E", accidental: 0 },
  { letter: "F", accidental: 0 },
  { letter: "F", accidental: 1 },
  { letter: "G", accidental: 0 },
  { letter: "A", accidental: -1 },
  { letter: "A", accidental: 0 },
  { letter: "B", accidental: -1 },
  { letter: "B", accidental: 0 },
];
const ACCIDENTAL_SYMBOLS = { "-2": "𝄫", "-1": "♭", 0: "", 1: "♯", 2: "𝄪" };
const PICKER_ACCIDENTALS = [
  { value: -2, label: "𝄫" },
  { value: -1, label: "♭" },
  { value: 0, label: "♮" },
  { value: 1, label: "♯" },
  { value: 2, label: "𝄪" },
];
const FEEDBACK_MS = 1200;

const TEXT = {
  es: {
    prompt: "Escribe la nota que vas a cantar",
    confirm: "Confirmar y cantar",
    cancel: "Cancelar",
    naming: "Escribiendo…",
    nameOnly: "Nombre — No · Afinación — Sí",
    pitchOnly: "Nombre — Sí · Afinación — No",
    both: "Nombre — No · Afinación — No",
    retry: "Vuelve a intentarlo",
  },
  en: {
    prompt: "Write the note you are about to sing",
    confirm: "Confirm & sing",
    cancel: "Cancel",
    naming: "Writing…",
    nameOnly: "Name — No · Pitch — Yes",
    pitchOnly: "Name — Yes · Pitch — No",
    both: "Name — No · Pitch — No",
    retry: "Try again",
  },
};

function modulo(value, divisor) {
  return ((value % divisor) + divisor) % divisor;
}

function language() {
  return app.settings.lang === "en" ? "en" : "es";
}

function degreeNumber(degree) {
  return Number(degree.replace(/[♭♯]/g, ""));
}

function formatDegreeLabel(degree) {
  const number = degreeNumber(degree);
  if (number === 1) return "F";
  return `${number}a`;
}

function spellChord(exercise) {
  const root = PREFERRED_ROOTS[modulo(exercise.rootMidi, 12)];
  const rootLetterIndex = LETTERS.indexOf(root.letter);

  return exercise.quality.intervals.map((interval, index) => {
    const letterOffset = degreeNumber(exercise.quality.degrees[index]) - 1;
    const letter = LETTERS[modulo(rootLetterIndex + letterOffset, 7)];
    const targetPitchClass = modulo(exercise.rootMidi + interval, 12);
    let accidental = modulo(
      targetPitchClass - NATURAL_PITCH_CLASSES[letter],
      12,
    );
    if (accidental > 6) accidental -= 12;
    return { letter, accidental };
  });
}

function spellingSymbol(spelling) {
  return `${spelling.letter}${ACCIDENTAL_SYMBOLS[spelling.accidental] ?? ""}`;
}

function spelledNoteName(spelling, midi) {
  const octave = Math.floor((midi - spelling.accidental) / 12) - 1;
  return `${spellingSymbol(spelling)}${octave}`;
}

function sameSpelling(answer, expected) {
  return (
    answer.letter === expected.letter &&
    answer.accidental === expected.accidental
  );
}

function pickerMarkup() {
  const text = TEXT[language()];
  const letterButtons = LETTERS.map(
    (letter) =>
      `<button type="button" class="ac-chip${app.chosenLetter === letter ? " on" : ""}" data-spelling-letter="${letter}">${letter}</button>`,
  ).join("");
  const accidentalButtons = PICKER_ACCIDENTALS.map(
    ({ value, label }) =>
      `<button type="button" class="ac-chip${app.chosenAccidental === value ? " on" : ""}" data-spelling-accidental="${value}">${label}</button>`,
  ).join("");
  const choice = app.chosenLetter
    ? spellingSymbol({
        letter: app.chosenLetter,
        accidental: app.chosenAccidental,
      })
    : "—";

  return `
    <div class="ac-spelling-prompt">
      <span class="ac-spelling-label">${text.prompt}</span>
      <div class="ac-spelling-row">${letterButtons}</div>
      <div class="ac-spelling-row">${accidentalButtons}</div>
      <div class="ac-spelling-actions">
        <span class="ac-spelling-choice">${choice}</span>
        <button type="button" id="confirm-spelling" class="ac-cta ac-spelling-confirm" ${app.chosenLetter ? "" : "disabled"}>${text.confirm}</button>
        <button type="button" id="cancel-spelling" class="ac-q-action">${text.cancel}</button>
      </div>
    </div>`;
}

const originalNewExercise = app.newExercise.bind(app);
const originalFeedbackZone = app.feedbackZone.bind(app);
const originalRenderExercise = app.renderExercise.bind(app);
const originalAttemptNote = app.attemptNote.bind(app);
const originalStopListening = app.stopListening.bind(app);

function resetSpellingState() {
  app.namingIndex = null;
  app.chosenLetter = null;
  app.chosenAccidental = 0;
  app.failedName = false;
  app.failedPitch = false;
}

app.newExercise = function newExerciseWithSpelling() {
  resetSpellingState();
  originalNewExercise();
};

app.feedbackZone = function feedbackZoneWithSpelling() {
  if (app.phase === "naming") return pickerMarkup();

  if (app.phase === "fail" && (app.failedName || app.failedPitch)) {
    const text = TEXT[language()];
    const detail =
      app.failedName && app.failedPitch
        ? text.both
        : app.failedName
          ? text.nameOnly
          : text.pitchOnly;
    return `
      <div class="ac-verdict fail"><span class="led"></span><span>${language() === "es" ? "Dictamen — No" : "Verdict — No"}</span></div>
      <span class="ac-verdict-sub">${detail}</span>
      <span class="ac-verdict-sub">${text.retry}</span>`;
  }

  return originalFeedbackZone();
};

app.renderExercise = function renderExerciseWithSpelling() {
  originalRenderExercise();

  const spellings = spellChord(app.exercise);
  app.root.querySelectorAll(".ac-note-degree").forEach((degree, index) => {
    degree.textContent = formatDegreeLabel(
      app.exercise.quality.degrees[index],
    );
  });
  const referenceSpelling = spellings[app.exercise.referenceIndex];
  const referenceName = app.root.querySelector(".ac-reftext b");
  if (referenceName) {
    referenceName.textContent = spelledNoteName(
      referenceSpelling,
      app.exercise.notes[app.exercise.referenceIndex],
    );
  }

  app.root.querySelectorAll("button[data-note]").forEach((button) => {
    const index = Number(button.dataset.note);
    const state = app.noteStates[index];
    const stateLabel = button.querySelector(".ac-note-state");

    button.classList.toggle(
      "naming",
      app.phase === "naming" && app.namingIndex === index,
    );

    if (state === "done" && stateLabel) {
      stateLabel.textContent = `${spellingSymbol(spellings[index])} ✓`;
    } else if (
      app.phase === "naming" &&
      app.namingIndex === index &&
      stateLabel
    ) {
      stateLabel.textContent = TEXT[language()].naming;
    }
  });

  app.root
    .querySelectorAll("button[data-spelling-letter]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        app.chosenLetter = button.dataset.spellingLetter;
        app.renderExercise();
      });
    });

  app.root
    .querySelectorAll("button[data-spelling-accidental]")
    .forEach((button) => {
      button.addEventListener("click", () => {
        app.chosenAccidental = Number(button.dataset.spellingAccidental);
        app.renderExercise();
      });
    });

  app.root
    .querySelector("#confirm-spelling")
    ?.addEventListener("click", () => void app.confirmSpelling());
  app.root
    .querySelector("#cancel-spelling")
    ?.addEventListener("click", () => {
      app.namingIndex = null;
      app.phase = "idle";
      app.renderExercise();
    });
};

app.attemptNote = function openSpellingAnswer(index) {
  if (
    app.referencePlaying ||
    app.phase !== "idle" ||
    app.listeningIndex !== null ||
    app.noteStates[index] !== "pending"
  ) {
    return;
  }

  app.namingIndex = index;
  app.chosenLetter = null;
  app.chosenAccidental = 0;
  app.failedName = false;
  app.failedPitch = false;
  app.phase = "naming";
  app.renderExercise();
};

app.confirmSpelling = async function confirmSpelling() {
  if (
    app.phase !== "naming" ||
    app.namingIndex === null ||
    !app.chosenLetter
  ) {
    return;
  }

  const index = app.namingIndex;
  const expected = spellChord(app.exercise)[index];
  const answer = {
    letter: app.chosenLetter,
    accidental: app.chosenAccidental,
  };
  const nameOk = sameSpelling(answer, expected);
  const originalPlaySuccess = app.player.playSuccess;

  if (!nameOk) {
    app.player.playSuccess = app.player.playError.bind(app.player);
  }

  app.namingIndex = null;
  app.phase = "idle";

  try {
    await originalAttemptNote(index);
  } finally {
    app.player.playSuccess = originalPlaySuccess;
  }

  const pitchOk = app.phase === "pass" || app.phase === "complete";
  app.failedName = !nameOk;
  app.failedPitch = !pitchOk;

  if (nameOk && pitchOk) return;

  if (app.feedbackTimer !== null) {
    clearTimeout(app.feedbackTimer);
  }

  app.noteStates[index] = "pending";
  app.phase = "fail";
  app.failIndex = index;
  app.renderExercise();
  app.feedbackTimer = window.setTimeout(() => {
    app.phase = "idle";
    app.failIndex = null;
    app.failedName = false;
    app.failedPitch = false;
    app.renderExercise();
  }, FEEDBACK_MS);
};

app.stopListening = function stopListeningWithSpelling() {
  originalStopListening();
  resetSpellingState();
};
