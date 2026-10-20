import "./style.css";
import aristotelesRoundUrl from "../referencia/res/mipmap-xxxhdpi/ic_launcher_round.webp";
import { detectLang, getTranslations, type Translations } from "./i18n";
import { GameEngine } from "./gameLogic";
import { triggerConfetti } from "./confetti";
import type { Category, Route, Word } from "./types";

const CATEGORY_ICONS: Record<string, string> = {
  latin_vulgar: "🏛",
  arabismos: "🕌",
  nahuatlismos: "🌽",
  helenismos: "🏺",
  neologismos: "💡",
};

const lang = detectLang();
const t: Translations = getTranslations(lang);
document.documentElement.lang = lang;

const engine = new GameEngine();
const routeStack: Route[] = [{ name: "home" }];
let collectionCategoryFilter: string | null = null;
let shouldTriggerConfetti = false;

const appRoot = document.getElementById("app")!;

function currentRoute(): Route {
  return routeStack[routeStack.length - 1];
}

function navigate(route: Route): void {
  routeStack.push(route);
  render();
}

function goBack(): void {
  if (routeStack.length > 1) {
    routeStack.pop();
    render();
  }
}

function localizedCategoryName(categoryId: string): string {
  return (
    t.categoryNames[categoryId] ??
    engine.getCategoryById(categoryId)?.displayName ??
    categoryId
  );
}

function localizedCategoryDesc(categoryId: string): string {
  return (
    t.categoryDescriptions[categoryId] ??
    engine.getCategoryById(categoryId)?.description ??
    ""
  );
}

function createBackTopBar(title: string, sansTitle = false, rightMeta?: string): HTMLElement {
  const header = document.createElement("header");
  header.className = "top-app-bar";

  const left = document.createElement("div");
  left.className = "top-bar-left";

  const backBtn = document.createElement("button");
  backBtn.type = "button";
  backBtn.className = "icon-btn";
  backBtn.setAttribute("aria-label", t.backLabel);
  backBtn.title = t.backLabel;
  backBtn.innerHTML = `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5"/><path d="M12 19l-7-7 7-7"/></svg>`;
  backBtn.addEventListener("click", goBack);

  const h1 = document.createElement("h1");
  h1.className = sansTitle ? "top-bar-title title-sans" : "top-bar-title";
  h1.textContent = title;

  left.append(backBtn, h1);
  header.appendChild(left);

  if (rightMeta) {
    const meta = document.createElement("span");
    meta.className = "top-bar-meta";
    meta.textContent = rightMeta;
    header.appendChild(meta);
  }

  return header;
}

function renderHomeScreen(shell: HTMLElement): void {
  const progress = engine.getUserProgress();

  const container = document.createElement("main");
  container.className = "home-container";

  const medallion = document.createElement("div");
  medallion.className = "aristoteles-medallion";
  const img = document.createElement("img");
  img.src = aristotelesRoundUrl;
  img.alt = "Aristóteles — Etimológica";
  medallion.appendChild(img);

  const title = document.createElement("h1");
  title.className = "display-large";
  title.textContent = t.appTitle;

  const subtitle = document.createElement("p");
  subtitle.className = "body-small-italic home-subtitle";
  subtitle.textContent = t.appSubtitle;

  const scorePill = document.createElement("div");
  scorePill.className = "home-score-pill";
  const scoreText = document.createElement("span");
  scoreText.className = "home-score-text";
  scoreText.textContent = t.pointsSuffix(progress.totalScore);
  scorePill.appendChild(scoreText);

  const actions = document.createElement("div");
  actions.className = "home-actions";

  const playBtn = document.createElement("button");
  playBtn.type = "button";
  playBtn.className = "btn btn-primary";
  playBtn.textContent = t.playBtn;
  playBtn.addEventListener("click", () => navigate({ name: "categories" }));

  const collectionBtn = document.createElement("button");
  collectionBtn.type = "button";
  collectionBtn.className = "btn btn-outlined";
  collectionBtn.textContent = t.collectionBtn;
  collectionBtn.addEventListener("click", () => navigate({ name: "collection" }));

  const statsBtn = document.createElement("button");
  statsBtn.type = "button";
  statsBtn.className = "btn btn-outlined";
  statsBtn.textContent = t.statsBtn;
  statsBtn.addEventListener("click", () => navigate({ name: "stats" }));

  actions.append(playBtn, collectionBtn, statsBtn);
  container.append(medallion, title, subtitle, scorePill, actions);
  shell.appendChild(container);
}

function renderCategoriesScreen(shell: HTMLElement): void {
  shell.appendChild(createBackTopBar(t.categoriesTitle));

  const main = document.createElement("main");
  main.className = "screen-content";

  const states = engine.getCategoryStates();
  for (const state of states) {
    const isLocked = !state.isUnlocked;
    const progressPct =
      state.totalCount === 0
        ? 0
        : Math.min(100, Math.round((state.correctCount / state.totalCount) * 100));
    const icon = CATEGORY_ICONS[state.category.id] ?? "📖";

    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = `category-tile${isLocked ? " locked" : ""}`;
    btn.disabled = isLocked;

    const iconBox = document.createElement("div");
    iconBox.className = "category-icon";
    iconBox.setAttribute("aria-hidden", "true");
    iconBox.textContent = isLocked ? "🔒" : icon;

    const info = document.createElement("div");
    info.className = "category-info";

    const nameEl = document.createElement("div");
    nameEl.className = "category-name";
    nameEl.textContent = localizedCategoryName(state.category.id);

    const descEl = document.createElement("div");
    descEl.className = "category-desc";
    descEl.textContent = localizedCategoryDesc(state.category.id);

    const progressRow = document.createElement("div");
    progressRow.className = "category-progress-row";

    const track = document.createElement("div");
    track.className = "progress-track";
    const fill = document.createElement("div");
    fill.className = "progress-fill";
    fill.style.width = `${progressPct}%`;
    track.appendChild(fill);

    const countEl = document.createElement("span");
    countEl.className = "category-count";
    countEl.textContent = `${state.correctCount}/${state.totalCount}`;

    progressRow.append(track, countEl);
    info.append(nameEl, descEl, progressRow);
    btn.append(iconBox, info);

    if (!isLocked) {
      btn.addEventListener("click", () => {
        engine.startCategory(state.category.id);
        navigate({ name: "game", categoryId: state.category.id });
      });
    }

    main.appendChild(btn);
  }

  const hint = document.createElement("p");
  hint.className = "category-hint";
  hint.textContent = t.unlockRequirementHint;
  main.appendChild(hint);

  shell.appendChild(main);
}

function renderGameScreen(shell: HTMLElement, categoryId: string): void {
  const state = engine.getGameState();
  const catName = localizedCategoryName(categoryId);
  const metaText = state.categoryComplete
    ? undefined
    : t.remainingLabel(state.wordsRemaining);

  shell.appendChild(createBackTopBar(catName, true, metaText));

  const main = document.createElement("main");
  main.className = "screen-content";

  if (state.categoryComplete) {
    const empty = document.createElement("div");
    empty.className = "empty-state";

    const medallion = document.createElement("div");
    medallion.className = "aristoteles-medallion";
    const img = document.createElement("img");
    img.src = aristotelesRoundUrl;
    img.alt = "Aristóteles";
    medallion.appendChild(img);

    const doneTitle = document.createElement("h2");
    doneTitle.className = "headline-large";
    doneTitle.textContent = t.categoryCompletedTitle;

    const doneScore = document.createElement("p");
    doneScore.className = "headline-medium";
    doneScore.style.color = "var(--gold-antique)";
    doneScore.textContent = t.sessionPoints(state.sessionScore);

    const actions = document.createElement("div");
    actions.className = "home-actions";
    actions.style.marginTop = "16px";

    const backBtn = document.createElement("button");
    backBtn.type = "button";
    backBtn.className = "btn btn-primary";
    backBtn.textContent = t.backToCategoriesBtn;
    backBtn.addEventListener("click", goBack);
    actions.appendChild(backBtn);

    const incorrectWords = engine.getIncorrectWords(categoryId);
    if (incorrectWords.length > 0) {
      const retryBtn = document.createElement("button");
      retryBtn.type = "button";
      retryBtn.className = "btn btn-gold";
      retryBtn.textContent = `${t.retryIncorrectBtn} (${incorrectWords.length})`;
      retryBtn.addEventListener("click", () => {
        engine.retryIncorrectInCategory(categoryId);
        render();
      });
      actions.appendChild(retryBtn);
    } else {
      const replayBtn = document.createElement("button");
      replayBtn.type = "button";
      replayBtn.className = "btn btn-outlined";
      replayBtn.textContent = t.replayCategoryBtn;
      replayBtn.addEventListener("click", () => {
        engine.replayFullCategory(categoryId);
        render();
      });
      actions.appendChild(replayBtn);
    }

    empty.append(medallion, doneTitle, doneScore, actions);
    main.appendChild(empty);
    shell.appendChild(main);
    return;
  }

  const word = state.currentWord;
  if (!word) {
    shell.appendChild(main);
    return;
  }

  // Score and Streak bar
  const scoreBar = document.createElement("div");
  scoreBar.className = "game-score-bar";

  const streakBadge = document.createElement("div");
  streakBadge.className = `streak-badge${state.sessionStreak >= 3 ? " hot" : ""}`;
  streakBadge.innerHTML = `<span aria-hidden="true">🔥</span><span>${state.sessionStreak}</span>`;

  const scoreEl = document.createElement("div");
  scoreEl.className = "session-score";
  scoreEl.textContent = t.scoreLabel(state.sessionScore);

  scoreBar.append(streakBadge, scoreEl);

  // Word showcase
  const wordBox = document.createElement("div");
  wordBox.className = "word-showcase";
  const wordHeading = document.createElement("h2");
  wordHeading.className = "display-large";
  wordHeading.textContent = word.word.toUpperCase();
  wordBox.appendChild(wordHeading);

  // Etymology hints
  const divTop = document.createElement("hr");
  divTop.className = "gold-divider";

  const hintsBox = document.createElement("div");
  hintsBox.className = "hints-box";
  const hintsLabel = document.createElement("div");
  hintsLabel.className = "hints-label";
  hintsLabel.textContent = t.etymologyHintsTitle;
  const hintsRoots = document.createElement("div");
  hintsRoots.className = "hints-roots";
  hintsRoots.textContent = word.rootsDisplay;
  hintsBox.append(hintsLabel, hintsRoots);

  const divBottom = document.createElement("hr");
  divBottom.className = "gold-divider";

  // Options list
  const optionsList = document.createElement("div");
  optionsList.className = "options-list";

  state.options.forEach((optionText, index) => {
    const isSelected = state.selectedOption === optionText;
    const isCorrectAnswer = optionText === word.definition;

    let stateClass = "";
    if (state.showingResult) {
      if (isCorrectAnswer) stateClass = " correct";
      else if (isSelected) stateClass = " wrong";
    }

    const optBtn = document.createElement("button");
    optBtn.type = "button";
    optBtn.className = `option-btn${stateClass}`;
    optBtn.disabled = state.showingResult;

    const keyBadge = document.createElement("span");
    keyBadge.className = "option-key";
    keyBadge.textContent = String(index + 1);

    const textSpan = document.createElement("span");
    textSpan.textContent = optionText;

    optBtn.append(keyBadge, textSpan);
    optBtn.addEventListener("click", () => {
      handleSelectOption(optionText);
    });
    optionsList.appendChild(optBtn);
  });

  main.append(scoreBar, wordBox, divTop, hintsBox, divBottom, optionsList);

  if (state.showingResult) {
    const resultPanel = document.createElement("div");
    resultPanel.className = "result-panel";

    const banner = document.createElement("div");
    banner.className = `result-banner ${state.isCorrect ? "correct" : "wrong"}`;
    banner.textContent = state.isCorrect
      ? t.correctPointsEarned(state.pointsEarned)
      : t.incorrectAnswer;

    const cardBtn = document.createElement("button");
    cardBtn.type = "button";
    cardBtn.className = "btn btn-gold";
    cardBtn.textContent = t.viewEtymologyCardBtn;
    cardBtn.addEventListener("click", () => {
      navigate({ name: "card", wordId: word.id });
    });

    const nextBtn = document.createElement("button");
    nextBtn.type = "button";
    nextBtn.className = "btn btn-primary";
    nextBtn.textContent = t.nextWordBtn;
    nextBtn.addEventListener("click", () => {
      engine.nextWord();
      render();
    });

    resultPanel.append(banner, cardBtn, nextBtn);
    main.appendChild(resultPanel);
  }

  const kbHint = document.createElement("div");
  kbHint.className = "keyboard-hint";
  kbHint.textContent = t.keyboardHintGame;
  main.appendChild(kbHint);

  shell.appendChild(main);

  if (shouldTriggerConfetti && state.showingResult && state.isCorrect) {
    shouldTriggerConfetti = false;
    triggerConfetti(shell);
  }
}

function handleSelectOption(optionText: string): void {
  const before = engine.getGameState();
  if (before.showingResult || !before.currentWord) return;
  const updated = engine.selectAnswer(optionText);
  if (updated.isCorrect) {
    shouldTriggerConfetti = true;
  }
  render();
}

function createEtymologyCardElement(word: Word): HTMLElement {
  const card = document.createElement("article");
  card.className = "etymology-card";

  const header = document.createElement("div");
  header.className = "etymology-card-header";

  const title = document.createElement("h2");
  title.className = "display-medium";
  title.textContent = word.word.toUpperCase();

  const seal = document.createElement("img");
  seal.className = "etymology-seal";
  seal.src = aristotelesRoundUrl;
  seal.alt = "";
  seal.setAttribute("aria-hidden", "true");

  header.append(title, seal);

  const div1 = document.createElement("hr");
  div1.className = "gold-divider";

  const defBlock = createSectionBlock(
    t.sectionDefinition,
    word.definition,
    "section-body-large"
  );
  const rootsBlock = createSectionBlock(
    t.sectionRoots,
    word.rootsDisplay,
    "section-body-italic"
  );
  const etymBlock = createSectionBlock(
    t.sectionEtymology,
    word.etymologyText,
    "section-body-italic"
  );
  const originBlock = createSectionBlock(
    t.sectionOrigin,
    word.originNote,
    "section-body-medium"
  );
  const funFactBlock = createSectionBlock(
    t.sectionFunFact,
    word.funFact,
    "section-body-funfact"
  );

  const div2 = document.createElement("hr");
  div2.className = "gold-divider";

  const catFooter = document.createElement("div");
  catFooter.className = "card-category-footer";
  catFooter.textContent = t.categoryPrefix(localizedCategoryName(word.category));

  card.append(
    header,
    div1,
    defBlock,
    rootsBlock,
    etymBlock,
    originBlock,
    funFactBlock,
    div2,
    catFooter
  );
  return card;
}

function createSectionBlock(
  label: string,
  body: string,
  bodyClass: string
): HTMLElement {
  const block = document.createElement("div");
  block.className = "section-block";

  const labelEl = document.createElement("div");
  labelEl.className = "section-label";
  labelEl.textContent = label;

  const bodyEl = document.createElement("div");
  bodyEl.className = bodyClass;
  bodyEl.textContent = body;

  block.append(labelEl, bodyEl);
  return block;
}

function renderCardScreen(shell: HTMLElement, wordId: number): void {
  shell.appendChild(createBackTopBar(t.etymologyCardTitle, true));

  const main = document.createElement("main");
  main.className = "screen-content";

  const word = engine.getWordById(wordId);
  if (word) {
    main.appendChild(createEtymologyCardElement(word));
  }

  shell.appendChild(main);
}

function renderCollectionScreen(shell: HTMLElement): void {
  const unlockedTotal = engine.getUnlockedWords().length;
  shell.appendChild(
    createBackTopBar(t.collectionTitle, false, `${unlockedTotal}/200`)
  );

  // Filter chips
  const chipsContainer = document.createElement("div");
  chipsContainer.className = "chips-container";

  const allChip = document.createElement("button");
  allChip.type = "button";
  allChip.className = `filter-chip${collectionCategoryFilter === null ? " selected" : ""}`;
  allChip.textContent = t.filterAll;
  allChip.addEventListener("click", () => {
    collectionCategoryFilter = null;
    render();
  });
  chipsContainer.appendChild(allChip);

  const categories: Category[] = engine.getOrderedCategories();
  for (const cat of categories) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = `filter-chip${collectionCategoryFilter === cat.id ? " selected" : ""}`;
    chip.textContent = localizedCategoryName(cat.id);
    chip.addEventListener("click", () => {
      collectionCategoryFilter =
        collectionCategoryFilter === cat.id ? null : cat.id;
      render();
    });
    chipsContainer.appendChild(chip);
  }
  shell.appendChild(chipsContainer);

  const words: Word[] =
    collectionCategoryFilter !== null
      ? engine.getWordsByCategory(collectionCategoryFilter)
      : engine.getUnlockedWords();

  if (words.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-state";
    const msg = document.createElement("p");
    msg.textContent =
      collectionCategoryFilter !== null
        ? t.emptyCollectionCategory
        : t.emptyCollectionAll;
    empty.appendChild(msg);
    shell.appendChild(empty);
    return;
  }

  const grid = document.createElement("main");
  grid.className = "collection-grid";

  for (const w of words) {
    const tile = document.createElement("button");
    tile.type = "button";
    const statusClass = !w.unlocked
      ? " locked"
      : w.answeredCorrectly === true
      ? " correct"
      : w.answeredCorrectly === false
      ? " wrong"
      : "";
    tile.className = `word-tile${statusClass}`;
    tile.disabled = !w.unlocked;

    const titleEl = document.createElement("div");
    titleEl.className = "word-tile-title";
    titleEl.textContent = w.unlocked ? w.word : "???";

    const subEl = document.createElement("div");
    subEl.className = "word-tile-sub";
    subEl.textContent = w.unlocked ? localizedCategoryName(w.category) : "🔒";

    tile.append(titleEl, subEl);
    if (w.unlocked) {
      tile.addEventListener("click", () => {
        navigate({ name: "card", wordId: w.id });
      });
    }
    grid.appendChild(tile);
  }

  shell.appendChild(grid);
}

function renderStatsScreen(shell: HTMLElement): void {
  shell.appendChild(createBackTopBar(t.statsTitle));

  const stats = engine.getStatsState();
  const main = document.createElement("main");
  main.className = "screen-content";

  const hero = document.createElement("div");
  hero.className = "stats-hero-card";
  const heroScore = document.createElement("div");
  heroScore.className = "stats-hero-score";
  heroScore.textContent = String(stats.totalScore);
  const heroLabel = document.createElement("div");
  heroLabel.className = "stats-hero-label";
  heroLabel.textContent = t.totalPointsLabel;
  hero.append(heroScore, heroLabel);

  const grid = document.createElement("div");
  grid.className = "stats-grid";

  const favCategoryDisplay = stats.mostPlayedCategory
    ? localizedCategoryName(stats.mostPlayedCategory)
    : "—";

  grid.append(
    createStatCard(`${stats.totalCorrect}/${stats.totalAttempted}`, t.wordsCorrectLabel),
    createStatCard(`${stats.accuracyPercent}%`, t.accuracyLabel),
    createStatCard(`${stats.maxStreak}`, t.maxStreakLabel),
    createStatCard(favCategoryDisplay, t.favoriteCategoryLabel)
  );

  main.append(hero, grid);
  shell.appendChild(main);
}

function createStatCard(value: string, label: string): HTMLElement {
  const card = document.createElement("div");
  card.className = "stat-card";

  const valEl = document.createElement("div");
  valEl.className = "stat-value";
  valEl.textContent = value;

  const lblEl = document.createElement("div");
  lblEl.className = "stat-label";
  lblEl.textContent = label;

  card.append(valEl, lblEl);
  return card;
}

function render(): void {
  appRoot.innerHTML = "";
  const shell = document.createElement("div");
  shell.className = "screen-shell";

  const route = currentRoute();
  switch (route.name) {
    case "home":
      renderHomeScreen(shell);
      break;
    case "categories":
      renderCategoriesScreen(shell);
      break;
    case "game":
      renderGameScreen(shell, route.categoryId);
      break;
    case "card":
      renderCardScreen(shell, route.wordId);
      break;
    case "collection":
      renderCollectionScreen(shell);
      break;
    case "stats":
      renderStatsScreen(shell);
      break;
  }

  appRoot.appendChild(shell);
}

// Global keyboard shortcuts for desktop play
window.addEventListener("keydown", (event) => {
  if (event.altKey || event.ctrlKey || event.metaKey) return;

  const route = currentRoute();

  if (event.key === "Escape") {
    if (routeStack.length > 1) {
      event.preventDefault();
      goBack();
    }
    return;
  }

  if (route.name === "game") {
    const state = engine.getGameState();

    if (!state.showingResult && !state.categoryComplete && state.currentWord) {
      if (event.key >= "1" && event.key <= "4") {
        const index = Number(event.key) - 1;
        const opt = state.options[index];
        if (opt !== undefined) {
          event.preventDefault();
          handleSelectOption(opt);
        }
      }
    } else if (state.showingResult && state.currentWord) {
      if (event.key === "Enter") {
        event.preventDefault();
        engine.nextWord();
        render();
      } else if (event.key === "f" || event.key === "F") {
        event.preventDefault();
        navigate({ name: "card", wordId: state.currentWord.id });
      }
    } else if (state.categoryComplete && event.key === "Enter") {
      event.preventDefault();
      goBack();
    }
  }
});

render();
