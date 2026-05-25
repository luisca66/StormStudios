import { initializeApp, getApps } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-auth.js";
import { doc, getDoc, getFirestore, setDoc } from "https://www.gstatic.com/firebasejs/11.6.1/firebase-firestore.js";
import {
  AUDIO_ASSETS,
  AUDIO_BASE_URL,
  COLLECTION_BY_LANG,
  FIREBASE_CONFIG,
  GAME_DATA_EN,
  GAME_DATA_ES,
  PRACTICE_DATA_EN,
  PRACTICE_DATA_ES,
} from "./memoria-data.js";

const lang = new URLSearchParams(window.location.search).get("lang") === "en" ? "en" : "es";
const isEN = lang === "en";
window.MEMORIA_LANG = lang;

const tabCleanupHandlers = new Map();

const clone = (value) => JSON.parse(JSON.stringify(value));
const byId = (id) => document.getElementById(id);
const assetUrl = (path) => `${AUDIO_BASE_URL}/${path}`;

function setText(id, text) {
  const element = byId(id);
  if (element) element.textContent = text;
}

function setRandomMusic(audio) {
  const tracks = AUDIO_ASSETS.tracks;
  const track = tracks[Math.floor(Math.random() * tracks.length)];
  audio.src = assetUrl(`${AUDIO_ASSETS.musicPath}/${track}.mp3`);
  audio.load();
}

function setEffect(audio, effectKey) {
  audio.src = assetUrl(AUDIO_ASSETS.effects[effectKey]);
  audio.load();
}

function playSound(audio) {
  audio.currentTime = 0;
  audio.play().catch(() => {});
}

function stopAudio(audio) {
  audio.pause();
  audio.currentTime = 0;
}

function shuffle(items) {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
}

function formatTime(totalSeconds) {
  const minutes = String(Math.floor(totalSeconds / 60)).padStart(2, "0");
  const seconds = String(totalSeconds % 60).padStart(2, "0");
  return `${minutes}:${seconds}`;
}

function renderMnemonicList(list, data) {
  list.innerHTML = "";
  Object.keys(data)
    .sort((a, b) => Number.parseInt(a, 10) - Number.parseInt(b, 10) || a.localeCompare(b))
    .forEach((key) => {
      const item = document.createElement("li");
      item.dataset.key = key;

      const number = document.createElement("span");
      number.textContent = key;

      const word = document.createElement("span");
      word.className = "word-value";
      word.textContent = data[key];

      item.append(number, word);
      list.appendChild(item);
    });
}

let firebaseSessionPromise = null;

async function getFirebaseSession() {
  if (!firebaseSessionPromise) {
    firebaseSessionPromise = (async () => {
      const fbApp = getApps().find((app) => app.name === "memoria-app") ?? initializeApp(FIREBASE_CONFIG, "memoria-app");
      const db = getFirestore(fbApp);
      const auth = getAuth(fbApp);
      const currentUser = await new Promise((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe();
          resolve(user);
        }, reject);
      });
      const user = currentUser || (await signInAnonymously(auth)).user;
      return { db, userId: user.uid };
    })();
  }

  return firebaseSessionPromise;
}

async function loadUserWords(collection, defaults) {
  const words = clone(defaults);

  try {
    const session = await getFirebaseSession();
    const snapshot = await getDoc(doc(session.db, collection, session.userId));

    if (snapshot.exists()) {
      const savedWords = snapshot.data();
      Object.keys(words).forEach((range) => {
        if (savedWords[range]) words[range] = { ...words[range], ...savedWords[range] };
      });
    } else {
      await setDoc(doc(session.db, collection, session.userId), defaults);
    }

    return { session, words };
  } catch (error) {
    console.warn("Memory app Firebase error:", error);
    return { session: null, words };
  }
}

async function saveRangeWords(session, collection, range, words) {
  if (!session) throw new Error("Not authenticated");
  await setDoc(doc(session.db, collection, session.userId), { [range]: words }, { merge: true });
}

function initLabels() {
  setText("tab-game", isEN ? "🃏 Memory Game" : "🃏 Juego de Memoria");
  setText("tab-practice", isEN ? "📝 Practice Mode" : "📝 Modo de Práctica");

  setText("mem-selection-title", isEN ? "Which numbers do you want to practice?" : "¿Qué números quieres trabajar?");
  setText("mem-game-title", isEN ? "Mnemonic Memory App" : "App Memoria (nemotecnia)");
  setText("mem-modal-title", isEN ? "Mnemonic Code" : "Código Nemotécnico");
  setText("reset-button", isEN ? "Reset Game" : "Reiniciar Juego");
  setText("show-code-button", isEN ? "View/Edit Code" : "Ver Código");
  setText("back-button", isEN ? "Change Range" : "Cambiar Rango");
  setText("mute-button", isEN ? "Mute Music" : "Silenciar Música");

  const codeButton = byId("btn-code");
  if (isEN && codeButton) {
    codeButton.dataset.range = "Code";
    codeButton.textContent = "Code (Letters)";
  }

  if (isEN) {
    byId("mem-modal-edit-btns").style.display = "flex";
    document.querySelectorAll("#selection-screen .selection-button").forEach((button) => {
      if (button.id !== "btn-code") button.textContent = `${button.dataset.range} (Words)`;
    });
  }

  setText("prac-title", isEN ? "Practice Mode" : "Modo de Práctica");
  setText("prac-correct-label", isEN ? "Correct" : "Correctas");
  setText("prac-streak-label", isEN ? "Streak" : "Racha");
  setText("prac-time-label", isEN ? "1. Select response time:" : "1. Selecciona el tiempo para responder:");
  setText("prac-range-label", isEN ? "2. Select ranges to practice:" : "2. Selecciona los rangos que quieres practicar:");
  setText("select-all-btn", isEN ? "Select All" : "Seleccionar Todo");
  setText("deselect-all-btn", isEN ? "Deselect All" : "Deseleccionar Todo");
  setText("edit-words-btn", isEN ? "Edit Words" : "Editar Palabras");
  setText("check-answer-btn", isEN ? "Check" : "Verificar");
  setText("start-practice-btn", isEN ? "Start" : "Comenzar");
  setText("mute-practice-btn", isEN ? "Mute Music" : "Silenciar Música");
  setText("feedback-text", isEN ? 'Set up your practice and press "Start" to begin.' : 'Configura tu práctica y presiona "Comenzar" para empezar.');
  setText("question-type", isEN ? "Question" : "Pregunta");
  setText("edit-mode-btn", isEN ? "Edit" : "Editar");
  setText("save-words-btn", isEN ? "Save" : "Guardar");
  setText("cancel-edit-btn", isEN ? "Cancel" : "Cancelar");

  byId("answer-input").placeholder = isEN ? "Type your answer here" : "Escribe tu respuesta aquí";

  const timeSelect = byId("time-select");
  timeSelect.options[0].textContent = isEN ? "No Limit" : "Sin Límite";
  for (let i = 1; i < timeSelect.options.length; i += 1) {
    timeSelect.options[i].textContent = `${timeSelect.options[i].value}${isEN ? " Seconds" : " Segundos"}`;
  }
}

function registerTabCleanup(tabName, handler) {
  tabCleanupHandlers.set(tabName, handler);
}

function cleanupInactiveTabs(activeTabName) {
  tabCleanupHandlers.forEach((handler, tabName) => {
    if (tabName !== activeTabName) handler();
  });
}

function initTabs() {
  document.querySelectorAll(".tab-btn").forEach((button) => {
    button.addEventListener("click", () => {
      cleanupInactiveTabs(button.dataset.tab);
      document.querySelectorAll(".tab-btn").forEach((item) => item.classList.remove("active"));
      document.querySelectorAll(".tab-panel").forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      byId(`panel-${button.dataset.tab}`).classList.add("active");
    });
  });
}

async function initMemoryGame() {
  const defaults = isEN ? GAME_DATA_EN : GAME_DATA_ES;
  const collection = COLLECTION_BY_LANG.en;
  const loaded = isEN ? await loadUserWords(collection, defaults) : { session: null, words: clone(defaults) };
  const userMnemonicSets = loaded.words;
  let firebaseSession = loaded.session;

  const app = byId("nemotecnia-memory-game-app");
  const selectionScreen = app.querySelector("#selection-screen");
  const gameContainer = app.querySelector("#game-container");
  const gameBoard = app.querySelector("#game-board");
  const movesSpan = app.querySelector("#moves-count");
  const messageBox = app.querySelector("#message-box");
  const timerSpan = app.querySelector("#timer");
  const modalOverlay = app.querySelector("#code-modal-overlay");
  const modalContent = app.querySelector(".modal-content");
  const mnemonicList = app.querySelector("#mnemonic-code-list");
  const bgMusic = app.querySelector("#background-music");
  const flipSound = app.querySelector("#flip-sound");
  const memEditButton = app.querySelector("#mem-edit-btn");
  const memSaveButton = app.querySelector("#mem-save-btn");
  const memCancelButton = app.querySelector("#mem-cancel-btn");

  setRandomMusic(bgMusic);
  setEffect(flipSound, "flip");

  let currentRange = "";
  let cardsData = [];
  let firstCard = null;
  let secondCard = null;
  let lockBoard = false;
  let matchedPairs = 0;
  let moves = 0;
  let timerInterval = null;
  let startTime = null;
  let elapsedTime = 0;
  let isMuted = false;
  let musicStarted = false;

  const codeRangeKey = isEN ? "Code" : "Código";
  const T = {
    findPairs: isEN ? "Find the pairs." : "Encuentra los pares.",
    correct: isEN ? "Correct!" : "¡Correcto!",
    congrats: isEN ? "Congratulations!" : "¡Felicidades!",
    completedIn: isEN ? "Completed in" : "Completaste en",
    moves: isEN ? "moves and" : "movimientos y",
    muteMusic: isEN ? "Mute Music" : "Silenciar Música",
    unmuteMusic: isEN ? "Unmute Music" : "Activar Música",
  };

  function setMessage(text, type) {
    messageBox.textContent = text;
    messageBox.className = "";
    if (type !== "info") messageBox.classList.add(type);
    messageBox.dataset.messageType = type;
  }

  function toggleMute() {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;
    app.querySelector("#mute-button").textContent = isMuted ? T.unmuteMusic : T.muteMusic;
    app.querySelector("#mute-button").classList.toggle("muted", isMuted);
    if (!isMuted && musicStarted && bgMusic.paused) playSound(bgMusic);
  }

  function pauseMusic() {
    if (!bgMusic.paused) stopAudio(bgMusic);
    musicStarted = false;
  }

  function startTimer() {
    if (timerInterval) clearInterval(timerInterval);
    startTime = startTime ? Date.now() - elapsedTime * 1000 : Date.now();
    timerInterval = setInterval(() => {
      elapsedTime = Math.floor((Date.now() - startTime) / 1000);
      timerSpan.textContent = formatTime(elapsedTime);
    }, 1000);
  }

  function stopTimer() {
    clearInterval(timerInterval);
    timerInterval = null;
  }

  function resetBoardState(clearMessage) {
    [firstCard, secondCard] = [null, null];
    lockBoard = false;
    if (clearMessage) {
      setTimeout(() => {
        if (messageBox.dataset.messageType === "error") setMessage(T.findPairs, "info");
      }, 1500);
    }
  }

  function checkForMatch() {
    const isMatch = firstCard.dataset.id === secondCard.dataset.id;
    const firstText = firstCard.dataset.text;
    const secondText = secondCard.dataset.text;
    const numberText = /^\d+$/.test(firstText) || (currentRange === codeRangeKey && firstText.length <= 2) ? firstText : secondText;
    const wordText = numberText === firstText ? secondText : firstText;

    if (isMatch) {
      setMessage(`${T.correct} ${numberText} = ${wordText}`, "success");
      firstCard.removeEventListener("click", handleCardClick);
      secondCard.removeEventListener("click", handleCardClick);
      matchedPairs += 1;

      if (matchedPairs === cardsData.length / 2) {
        stopTimer();
        setTimeout(() => setMessage(`${T.congrats} ${T.completedIn} ${moves} ${T.moves} ${formatTime(elapsedTime)}.`, "final"), 500);
      }

      resetBoardState(false);
      return;
    }

    setMessage(isEN ? "Try again." : "Intenta de nuevo.", "error");
    setTimeout(() => {
      firstCard.classList.remove("is-flipped");
      secondCard.classList.remove("is-flipped");
      resetBoardState(true);
    }, 1200);
  }

  function handleCardClick() {
    const card = this;
    if (lockBoard || card.classList.contains("is-flipped") || card === firstCard) return;
    if (!timerInterval) startTimer();
    if (!musicStarted && !isMuted) {
      playSound(bgMusic);
      musicStarted = true;
    }

    playSound(flipSound);
    card.classList.add("is-flipped");

    if (!firstCard) {
      firstCard = card;
      return;
    }

    secondCard = card;
    lockBoard = true;
    moves += 1;
    movesSpan.textContent = moves;
    checkForMatch();
  }

  function createCard(item) {
    const card = document.createElement("div");
    card.classList.add("card");
    card.dataset.id = item.id;
    card.dataset.text = item.text;

    const front = document.createElement("div");
    front.className = "card-face card-front";
    front.textContent = "?";

    const back = document.createElement("div");
    back.className = "card-face card-back";
    back.style.fontSize = item.text.length > 10 ? "0.85rem" : item.text.length > 6 ? "1rem" : "1.2rem";
    back.textContent = item.text;

    card.append(front, back);
    card.addEventListener("click", handleCardClick);
    return card;
  }

  function createBoard() {
    gameBoard.innerHTML = "";
    matchedPairs = 0;
    moves = 0;
    movesSpan.textContent = 0;
    setMessage(T.findPairs, "info");
    firstCard = null;
    secondCard = null;
    lockBoard = false;
    stopTimer();
    elapsedTime = 0;
    startTime = null;
    timerSpan.textContent = formatTime(0);
    pauseMusic();
    setRandomMusic(bgMusic);

    cardsData = [];
    const dataSet = userMnemonicSets[currentRange];
    Object.keys(dataSet).forEach((key) => {
      cardsData.push({ id: key, text: key });
      cardsData.push({ id: key, text: dataSet[key] });
    });
    shuffle(cardsData);
    cardsData.forEach((item) => gameBoard.appendChild(createCard(item)));
  }

  function startGame(range) {
    currentRange = range;
    selectionScreen.style.display = "none";
    gameContainer.classList.add("visible");
    musicStarted = false;
    bgMusic.muted = isMuted;
    createBoard();
  }

  function populateModal() {
    renderMnemonicList(mnemonicList, userMnemonicSets[currentRange] || {});
  }

  function toggleModalEdit(isEditing) {
    modalContent.classList.toggle("is-editing", isEditing);
    memEditButton.style.display = isEditing ? "none" : "inline-block";
    memSaveButton.style.display = isEditing ? "inline-block" : "none";
    memCancelButton.style.display = isEditing ? "inline-block" : "none";
    mnemonicList.querySelectorAll(".word-value").forEach((item) => item.setAttribute("contenteditable", String(isEditing)));
  }

  async function saveModalWords() {
    const originalText = memSaveButton.textContent;
    memSaveButton.disabled = true;
    memSaveButton.textContent = "...";

    try {
      if (!firebaseSession) firebaseSession = await getFirebaseSession();
      const newSet = { ...userMnemonicSets[currentRange] };
      let hasChanges = false;

      mnemonicList.querySelectorAll("li").forEach((item) => {
        const key = item.dataset.key;
        const value = item.querySelector(".word-value").textContent.trim();
        if (value && newSet[key] !== value) {
          newSet[key] = value;
          hasChanges = true;
        }
      });

      if (!hasChanges) {
        toggleModalEdit(false);
        return;
      }

      await saveRangeWords(firebaseSession, collection, currentRange, newSet);
      userMnemonicSets[currentRange] = newSet;
      toggleModalEdit(false);
      setTimeout(() => modalOverlay.classList.remove("is-visible"), 600);
    } catch (error) {
      console.error(error);
    } finally {
      memSaveButton.disabled = false;
      memSaveButton.textContent = originalText;
    }
  }

  selectionScreen.querySelectorAll(".selection-button").forEach((button) => {
    button.addEventListener("click", () => startGame(button.dataset.range));
  });
  app.querySelector("#reset-button").addEventListener("click", createBoard);
  app.querySelector("#show-code-button").addEventListener("click", () => {
    populateModal();
    toggleModalEdit(false);
    modalOverlay.classList.add("is-visible");
  });
  app.querySelector("#modal-close-btn").addEventListener("click", () => modalOverlay.classList.remove("is-visible"));
  modalOverlay.addEventListener("click", (event) => {
    if (event.target === modalOverlay) modalOverlay.classList.remove("is-visible");
  });
  app.querySelector("#back-button").addEventListener("click", () => {
    stopTimer();
    pauseMusic();
    gameContainer.classList.remove("visible");
    selectionScreen.style.display = "block";
    gameBoard.innerHTML = "";
    currentRange = "";
    movesSpan.textContent = "0";
    timerSpan.textContent = "00:00";
    startTime = null;
    elapsedTime = 0;
  });
  app.querySelector("#mute-button").addEventListener("click", toggleMute);

  if (isEN) {
    memEditButton.addEventListener("click", () => toggleModalEdit(true));
    memSaveButton.addEventListener("click", saveModalWords);
    memCancelButton.addEventListener("click", () => {
      populateModal();
      toggleModalEdit(false);
    });
  }

  registerTabCleanup("game", pauseMusic);
  selectionScreen.style.display = "block";
  gameContainer.classList.remove("visible");
}

async function initPracticeMode() {
  const defaults = isEN ? PRACTICE_DATA_EN : PRACTICE_DATA_ES;
  const collection = COLLECTION_BY_LANG[lang];
  const loaded = await loadUserWords(collection, defaults);
  let firebaseSession = loaded.session;
  const userMnemonicSets = loaded.words;

  const rangeBoxes = byId("range-checkboxes");
  const timeSelect = byId("time-select");
  const questionTypeText = byId("question-type");
  const questionText = byId("question-text");
  const answerInput = byId("answer-input");
  const checkButton = byId("check-answer-btn");
  const startButton = byId("start-practice-btn");
  const muteButton = byId("mute-practice-btn");
  const resetButton = byId("reset-practice-btn");
  const feedbackContainer = byId("feedback-container");
  const feedbackText = byId("feedback-text");
  const timerBarContainer = byId("timer-bar-container");
  const timerBar = byId("timer-bar");
  const scoreCorrect = byId("score-correct");
  const scoreStreak = byId("score-streak");
  const editWordsButton = byId("edit-words-btn");
  const selectAllButton = byId("select-all-btn");
  const deselectAllButton = byId("deselect-all-btn");
  const editModalOverlay = byId("edit-modal-overlay");
  const editModalTitle = byId("edit-modal-title");
  const editMnemonicList = byId("edit-mnemonic-list");
  const modalButtonContainer = editModalOverlay.querySelector(".modal-button-container");
  const bgMusic = byId("background-music-practice");
  const correctSound = byId("correct-sound");
  const errorSound = byId("error-sound");
  const nextSound = byId("next-sound");

  setRandomMusic(bgMusic);
  setEffect(correctSound, "correct");
  setEffect(errorSound, "error");
  setEffect(nextSound, "next");

  let currentQuestion = null;
  let isMuted = false;
  let musicStarted = false;
  let audioUnlocked = false;
  let countdownInterval = null;
  let correctAnswers = 0;
  let totalQuestions = 0;
  let consecutiveStreak = 0;
  let practiceInProgress = false;

  const T = {
    wordToNumber: isEN ? "What number is this word?" : "¿Qué número es esta palabra?",
    numberToWord: isEN ? "What word is this number?" : "¿Qué palabra es este número?",
    noRange: isEN ? "Please select at least one range." : "Por favor, selecciona al menos un rango.",
    correct: isEN ? "Correct!" : "¡Correcto!",
    incorrect: isEN ? "Incorrect. The answer for" : "Incorrecto. La respuesta para",
    is: isEN ? "is" : "es",
    timeout: isEN ? "Time's up! The answer for" : "¡Se acabó el tiempo! La respuesta para",
    was: isEN ? "was" : "era",
    initMsg: isEN ? 'Set up your practice and press "Start" to begin.' : 'Configura tu práctica y presiona "Comenzar" para empezar.',
    updated: isEN ? "Words updated!" : "¡Palabras actualizadas!",
    question: isEN ? "Question" : "Pregunta",
    editTitle: isEN ? "Edit Words for Range:" : "Editar Palabras del Rango:",
    selectOne: isEN ? "Select only ONE range to edit." : "Selecciona solo UN rango a la vez para editar.",
    selectFirst: isEN ? "Select a range to edit it." : "Selecciona un rango para poder editarlo.",
    muteMusic: isEN ? "Mute Music" : "Silenciar Música",
    unmuteMusic: isEN ? "Unmute Music" : "Activar Música",
  };

  function populateCheckboxes() {
    rangeBoxes.innerHTML = "";
    Object.keys(userMnemonicSets).forEach((range) => {
      const item = document.createElement("div");
      item.className = "checkbox-label";

      const checkbox = document.createElement("input");
      checkbox.type = "checkbox";
      checkbox.id = `prac-range-${range}`;
      checkbox.value = range;

      const label = document.createElement("label");
      label.setAttribute("for", checkbox.id);
      label.textContent = range;

      item.append(checkbox, label);
      rangeBoxes.appendChild(item);
    });
  }

  function unlockAudio() {
    if (audioUnlocked) return;
    [correctSound, errorSound, nextSound].forEach((sound) => {
      sound.play().then(() => sound.pause()).catch(() => {});
    });
    bgMusic.play().catch(() => {});
    audioUnlocked = true;
  }

  function playPracticeSound(audio) {
    if (isMuted && audio === bgMusic) return;
    playSound(audio);
  }

  function toggleMute() {
    isMuted = !isMuted;
    bgMusic.muted = isMuted;
    muteButton.textContent = isMuted ? T.unmuteMusic : T.muteMusic;
    muteButton.classList.toggle("muted", isMuted);
    if (!isMuted && musicStarted && bgMusic.paused) playPracticeSound(bgMusic);
  }

  function pauseMusic() {
    if (musicStarted || !bgMusic.paused) {
      stopAudio(bgMusic);
      setRandomMusic(bgMusic);
    }
    musicStarted = false;
  }

  function updateScore() {
    scoreCorrect.textContent = `${correctAnswers} / ${totalQuestions}`;
    scoreStreak.textContent = consecutiveStreak;
  }

  function setFeedback(message, type) {
    feedbackText.textContent = message;
    feedbackContainer.className = `feedback-container ${type}`;
  }

  function startCountdown(duration) {
    clearInterval(countdownInterval);
    timerBarContainer.style.display = "block";
    let timeLeft = duration;
    countdownInterval = setInterval(() => {
      timeLeft -= 0.1;
      timerBar.style.width = `${(timeLeft / duration) * 100}%`;
      if (timeLeft <= 0) {
        clearInterval(countdownInterval);
        handleTimeout();
      }
    }, 100);
  }

  function handleTimeout() {
    if (!practiceInProgress) return;
    totalQuestions += 1;
    consecutiveStreak = 0;
    updateScore();
    setFeedback(`${T.timeout} "${currentQuestion.question}" ${T.was} "${currentQuestion.answer}".`, "incorrect");
    playPracticeSound(errorSound);
    currentQuestion = null;
    setTimeout(() => generateQuestion(), 1500);
  }

  function generateQuestion(isInitial = false) {
    unlockAudio();
    if (isInitial) {
      playPracticeSound(nextSound);
      practiceInProgress = true;
      startButton.disabled = true;
    }
    if (!musicStarted) {
      playPracticeSound(bgMusic);
      musicStarted = true;
    }

    const selected = Array.from(rangeBoxes.querySelectorAll("input:checked")).map((checkbox) => checkbox.value);
    if (!selected.length) {
      setFeedback(T.noRange, "info");
      resetPractice();
      return;
    }

    const pool = selected.flatMap((range) => Object.entries(userMnemonicSets[range]).map(([number, word]) => ({ number, word })));
    const pair = pool[Math.floor(Math.random() * pool.length)];
    currentQuestion = Math.random() > 0.5
      ? { type: "word-to-number", question: pair.word, answer: pair.number }
      : { type: "number-to-word", question: pair.number, answer: pair.word };

    questionTypeText.textContent = currentQuestion.type === "word-to-number" ? T.wordToNumber : T.numberToWord;
    questionText.textContent = currentQuestion.question;
    answerInput.value = "";
    answerInput.disabled = false;
    checkButton.disabled = false;
    answerInput.focus();
    setFeedback(isEN ? "Type your answer and press 'Check'." : "Escribe tu respuesta.", "info");

    const timeLimit = Number.parseInt(timeSelect.value, 10);
    if (timeLimit > 0) {
      startCountdown(timeLimit);
    } else {
      timerBarContainer.style.display = "none";
    }
  }

  function checkAnswer() {
    if (!currentQuestion || !practiceInProgress) return;
    clearInterval(countdownInterval);
    answerInput.disabled = true;
    checkButton.disabled = true;
    totalQuestions += 1;

    const userAnswer = answerInput.value.trim();
    if (userAnswer.toLowerCase() === String(currentQuestion.answer).toLowerCase()) {
      correctAnswers += 1;
      consecutiveStreak += 1;
      setFeedback(T.correct, "correct");
      playPracticeSound(correctSound);
    } else {
      consecutiveStreak = 0;
      setFeedback(`${T.incorrect} "${currentQuestion.question}" ${T.is} "${currentQuestion.answer}".`, "incorrect");
      playPracticeSound(errorSound);
    }

    updateScore();
    currentQuestion = null;
    setTimeout(() => generateQuestion(), 1500);
  }

  function resetPractice() {
    pauseMusic();

    clearInterval(countdownInterval);
    practiceInProgress = false;
    correctAnswers = 0;
    totalQuestions = 0;
    consecutiveStreak = 0;
    updateScore();
    rangeBoxes.querySelectorAll("input:checked").forEach((checkbox) => {
      checkbox.checked = false;
    });
    timeSelect.value = "0";
    questionTypeText.textContent = T.question;
    questionText.textContent = "...";
    answerInput.value = "";
    answerInput.disabled = false;
    checkButton.disabled = false;
    startButton.disabled = false;
    timerBarContainer.style.display = "none";
    setFeedback(T.initMsg, "info");
  }

  function populateEditModal(range) {
    editModalOverlay.dataset.range = range;
    editModalTitle.textContent = `${T.editTitle} ${range}`;
    renderMnemonicList(editMnemonicList, userMnemonicSets[range]);
  }

  function toggleEditMode(isEditing) {
    const modalContent = editModalOverlay.querySelector(".modal-content");
    const editButton = modalButtonContainer.querySelector("#edit-mode-btn");
    const saveButton = modalButtonContainer.querySelector("#save-words-btn");
    const cancelButton = modalButtonContainer.querySelector("#cancel-edit-btn");

    modalContent.classList.toggle("is-editing", isEditing);
    editButton.style.display = isEditing ? "none" : "inline-block";
    saveButton.style.display = isEditing ? "inline-block" : "none";
    cancelButton.style.display = isEditing ? "inline-block" : "none";
    editMnemonicList.querySelectorAll(".word-value").forEach((item) => item.setAttribute("contenteditable", String(isEditing)));
  }

  async function saveWordsFromModal(range) {
    const saveButton = modalButtonContainer.querySelector("#save-words-btn");
    const originalText = saveButton.textContent;
    saveButton.disabled = true;
    saveButton.textContent = isEN ? "Saving..." : "Guardando...";

    try {
      if (!firebaseSession) firebaseSession = await getFirebaseSession();
      const newSet = { ...userMnemonicSets[range] };
      let hasChanges = false;

      editMnemonicList.querySelectorAll("li").forEach((item) => {
        const key = item.dataset.key;
        const value = item.querySelector(".word-value").textContent.trim();
        if (value && newSet[key] !== value) {
          newSet[key] = value;
          hasChanges = true;
        }
      });

      if (!hasChanges) {
        toggleEditMode(false);
        return;
      }

      await saveRangeWords(firebaseSession, collection, range, newSet);
      userMnemonicSets[range] = newSet;
      setFeedback(T.updated, "correct");
      toggleEditMode(false);
      setTimeout(() => editModalOverlay.classList.remove("is-visible"), 800);
    } catch (error) {
      console.error(error);
      setFeedback(isEN ? "Error saving." : "Error al guardar.", "incorrect");
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = originalText;
    }
  }

  populateCheckboxes();

  startButton.addEventListener("click", () => {
    if (!practiceInProgress) generateQuestion(true);
  });
  checkButton.addEventListener("click", checkAnswer);
  muteButton.addEventListener("click", toggleMute);
  resetButton.addEventListener("click", resetPractice);
  answerInput.addEventListener("keyup", (event) => {
    if (event.key === "Enter") checkAnswer();
  });
  selectAllButton.addEventListener("click", () => {
    rangeBoxes.querySelectorAll("input").forEach((checkbox) => {
      checkbox.checked = true;
    });
  });
  deselectAllButton.addEventListener("click", () => {
    rangeBoxes.querySelectorAll("input").forEach((checkbox) => {
      checkbox.checked = false;
    });
  });
  editWordsButton.addEventListener("click", () => {
    const selected = Array.from(rangeBoxes.querySelectorAll("input:checked")).map((checkbox) => checkbox.value);
    if (!selected.length) {
      setFeedback(T.selectFirst, "incorrect");
      return;
    }
    if (selected.length > 1) {
      setFeedback(T.selectOne, "incorrect");
      return;
    }

    populateEditModal(selected[0]);
    toggleEditMode(false);
    editModalOverlay.classList.add("is-visible");
  });
  editModalOverlay.addEventListener("click", (event) => {
    const range = editModalOverlay.dataset.range;
    if (event.target.id === "modal-close-btn-practice" || event.target === editModalOverlay) editModalOverlay.classList.remove("is-visible");
    else if (event.target.id === "edit-mode-btn") toggleEditMode(true);
    else if (event.target.id === "cancel-edit-btn") {
      populateEditModal(range);
      toggleEditMode(false);
    } else if (event.target.id === "save-words-btn" && range) {
      saveWordsFromModal(range);
    }
  });

  registerTabCleanup("practice", pauseMusic);
}

initLabels();
initTabs();
await Promise.all([initMemoryGame(), initPracticeMode()]);
