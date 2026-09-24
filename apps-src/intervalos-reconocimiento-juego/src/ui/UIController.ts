import { AudioEngine } from '../audio/AudioEngine';
import { GameState } from '../game/GameState';
import { IntervalLogic, type GeneratedInterval } from '../game/IntervalLogic';
import { UISounds } from '../audio/UISounds';
import { Effects } from './Effects';
import { ShootingStars } from './ShootingStars';
import { applyStaticTranslations, getLanguage, intervalLabel, t, type Lang } from '../i18n';

export const INTERVAL_GROUPS = [
  { id: '2as', name: { es: '2as', en: '2nds' }, intervals: ['2m', '2M'], active: true },
  { id: '3as', name: { es: '3as', en: '3rds' }, intervals: ['3m', '3M'], active: true },
  { id: '458', name: { es: '4as 5as 8as', en: '4ths 5ths 8ves' }, intervals: ['4J', '5J', '8J'], active: false },
  { id: '45dis5', name: { es: '4J 5dis 5J', en: 'P4 d5 P5' }, intervals: ['4J', '5dis', '5J'], active: true },
  { id: '6as', name: { es: '6as', en: '6ths' }, intervals: ['6m', '6M'], active: true },
  { id: '7as', name: { es: '7as', en: '7ths' }, intervals: ['7m', '7M'], active: true },
  { id: '9as', name: { es: '9as', en: '9ths' }, intervals: ['9m', '9M'], active: false },
];

export const ALL_TIMBRES = ['Piano', 'Coro', 'Corno', 'Cello', 'Fagot'];

export class UIController {
  private audioEngine: AudioEngine;
  private gameState: GameState | null = null;
  private currentInterval: GeneratedInterval | null = null;
  
  private activeIntervalIds: string[] = [];
  private selectedTimbreConfig: string = 'Piano';
  private selectedPlayModeConfig: string = 'harmonic';
  
  private selectedButtonIndex: number = 0;
  private isProcessingAnswer: boolean = false;

  private effects: Effects | null = null;
  private shootingStars: ShootingStars | null = null;
  private currentEnemy: HTMLElement | null = null;
  private readonly lang: Lang;

  constructor() {
    this.lang = getLanguage();
    this.audioEngine = new AudioEngine();
  }

  public init() {
    applyStaticTranslations(this.lang);
    this.renderIntervalOptions();
    this.bindEvents();
  }

  private renderIntervalOptions() {
    const container = document.getElementById('interval-options');
    if (!container) return;
    container.innerHTML = '';

    INTERVAL_GROUPS.forEach(group => {
      const label = document.createElement('label');
      label.className = 'retro-radio';
      
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox';
      checkbox.value = group.id;
      checkbox.checked = group.active;
      
      const span = document.createElement('span');
      span.textContent = group.name[this.lang];

      label.appendChild(checkbox);
      label.appendChild(span);
      container.appendChild(label);
    });
  }

  private bindEvents() {
    const startBtn = document.getElementById('start-button');
    if (startBtn) {
      startBtn.addEventListener('click', async () => {
        const checkboxes = document.querySelectorAll('#interval-options input[type="checkbox"]:checked') as NodeListOf<HTMLInputElement>;
        const selectedGroupIds = Array.from(checkboxes).map(cb => cb.value);
        
        if (selectedGroupIds.length === 0) {
          alert(t(this.lang, 'alert.selectInterval'));
          return;
        }

        // Flatten interval IDs
        this.activeIntervalIds = [];
        selectedGroupIds.forEach(gid => {
          const group = INTERVAL_GROUPS.find(g => g.id === gid);
          if (group) {
            this.activeIntervalIds.push(...group.intervals);
          }
        });

        // Get config
        const timbreRadio = document.querySelector('input[name="timbre"]:checked') as HTMLInputElement;
        this.selectedTimbreConfig = timbreRadio?.value || 'Piano';

        const playModeRadio = document.querySelector('input[name="playMode"]:checked') as HTMLInputElement;
        this.selectedPlayModeConfig = playModeRadio?.value || 'harmonic';

        startBtn.textContent = t(this.lang, 'action.loading');
        startBtn.setAttribute('disabled', 'true');
        
        await this.audioEngine.initialize();
        // Hay que esperar a que UISounds.init() termine: startGame() arranca el
        // propulsor con startThruster(), que sale en silencio si thrusterGain
        // aún no existe. (Init crea Tone.start + los nodos de audio.)
        try {
          await UISounds.init();
        } catch (error) {
          console.warn('[UISounds] No se pudieron inicializar los efectos de UI:', error);
        }

        this.startGame();
      });
    }

    const replayBtn = document.getElementById('replay-btn');
    if (replayBtn) {
      replayBtn.addEventListener('click', () => this.replayAudio());
    }

    const returnMenuBtn = document.getElementById('return-menu-btn');
    if (returnMenuBtn) {
      returnMenuBtn.addEventListener('click', () => this.returnToMenu());
    }

    const volumeSlider = document.getElementById('game-volume') as HTMLInputElement;
    if (volumeSlider) {
      volumeSlider.addEventListener('input', (e) => {
        const val = parseFloat((e.target as HTMLInputElement).value);
        this.audioEngine.setVolume(val);
      });
    }

    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
  }

  private handleKeyDown(e: KeyboardEvent) {
    if (!this.gameState || this.isProcessingAnswer) return;

    if (e.code === 'Space') {
      e.preventDefault();
      this.replayAudio();
      return;
    }

    const buttons = document.querySelectorAll('.answer-btn');
    if (buttons.length === 0) return;

    if (e.code === 'ArrowRight') {
      e.preventDefault();
      this.selectedButtonIndex = (this.selectedButtonIndex + 1) % buttons.length;
      this.updateButtonSelection();
    } else if (e.code === 'ArrowLeft') {
      e.preventDefault();
      this.selectedButtonIndex = (this.selectedButtonIndex - 1 + buttons.length) % buttons.length;
      this.updateButtonSelection();
    } else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      e.preventDefault();
      const firstOffsetTop = (buttons[0] as HTMLElement).offsetTop;
      let cols = 1;
      for (let i = 1; i < buttons.length; i++) {
        if ((buttons[i] as HTMLElement).offsetTop === firstOffsetTop) {
          cols++;
        } else {
          break;
        }
      }
      
      if (e.code === 'ArrowDown') {
        let newIndex = this.selectedButtonIndex + cols;
        if (newIndex >= buttons.length) {
          // Si nos pasamos de la longitud, regresamos a la fila superior en la misma columna
          newIndex = this.selectedButtonIndex % cols;
        }
        this.selectedButtonIndex = newIndex;
      } else if (e.code === 'ArrowUp') {
        let newIndex = this.selectedButtonIndex - cols;
        if (newIndex < 0) {
          // Si nos pasamos hacia arriba, bajamos hasta la última fila de la misma columna
          newIndex = this.selectedButtonIndex;
          while (newIndex + cols < buttons.length) {
            newIndex += cols;
          }
        }
        this.selectedButtonIndex = newIndex;
      }
      this.updateButtonSelection();
    } else if (e.code === 'Enter') {
      e.preventDefault();
      const selectedBtn = buttons[this.selectedButtonIndex] as HTMLButtonElement;
      if (selectedBtn) {
        selectedBtn.click();
      }
    }
  }

  private startGame() {
    this.gameState = new GameState();
    
    const configScreen = document.getElementById('config-screen');
    const gameScreen = document.getElementById('game-screen');
    
    if (configScreen && gameScreen) {
      configScreen.classList.remove('active');
      configScreen.classList.add('hidden');
      
      gameScreen.classList.remove('hidden');
      gameScreen.classList.add('active');
    }

    this.renderSpace();
    this.renderAnswerButtons();
    this.updateHUD();

    // Inicializar el motor de efectos sobre la zona de juego.
    this.clearEnemy();
    this.effects?.destroy();
    const gameArea = document.querySelector('.game-area') as HTMLElement | null;
    const appEl = document.getElementById('app') as HTMLElement | null;
    if (gameArea) {
      this.effects = new Effects(gameArea, appEl ?? gameArea);
    }

    // Estrellas fugaces aleatorias dentro de la escena espacial.
    this.shootingStars?.stop();
    const scene = document.getElementById('space-scene');
    if (scene) {
      this.shootingStars = new ShootingStars(scene);
      this.shootingStars.start();
    }

    UISounds.startThruster();

    this.nextRound();
  }

  private returnToMenu() {
    this.gameState = null;
    this.currentInterval = null;
    this.clearEnemy();
    UISounds.stopThruster();
    this.shootingStars?.stop();
    this.shootingStars = null;
    this.effects?.destroy();
    this.effects = null;

    const configScreen = document.getElementById('config-screen');
    const gameScreen = document.getElementById('game-screen');
    
    if (configScreen && gameScreen) {
      gameScreen.classList.remove('active');
      gameScreen.classList.add('hidden');
      
      configScreen.classList.remove('hidden');
      configScreen.classList.add('active');
    }
    
    const startBtn = document.getElementById('start-button');
    if (startBtn) {
      startBtn.textContent = t(this.lang, 'action.start');
      startBtn.removeAttribute('disabled');
    }
  }

  /** Coloca la nave y el planeta en su posición inicial (sector 0) sin animar. */
  private renderSpace() {
    const player = document.getElementById('player-sprite');
    const planet = document.getElementById('planet');
    [player, planet].forEach(el => { if (el) el.style.transition = 'none'; });
    this.applyProgress(0);
    // Forzar reflow y restaurar las transiciones para que el viaje sí se anime.
    void document.getElementById('space-scene')?.offsetWidth;
    [player, planet].forEach(el => { if (el) el.style.transition = ''; });
  }

  /** Traduce el progreso (0..1) a la cercanía de la nave y el tamaño del planeta. */
  private applyProgress(p: number) {
    const player = document.getElementById('player-sprite');
    const planet = document.getElementById('planet');
    if (player) {
      const bottom = 6 + p * 42; // 6% (lejos) -> 48% (junto al planeta)
      player.style.bottom = `${bottom.toFixed(1)}%`;
    }
    if (planet) {
      const scale = 0.35 + p * 1.2; // crece al acercarte
      planet.style.transform = `translateX(-50%) scale(${scale.toFixed(3)})`;
    }
  }

  private renderAnswerButtons() {
    const container = document.getElementById('answer-buttons');
    if (!container) return;
    container.innerHTML = '';

    // Sort to keep consistent layout
    const orderedIntervals = ['2m', '2M', '3m', '3M', '4J', '5dis', '5J', '6m', '6M', '7m', '7M', '8J', '9m', '9M'];
    const activeOrdered = orderedIntervals.filter(i => this.activeIntervalIds.includes(i));

    activeOrdered.forEach((id) => {
      const btn = document.createElement('button');
      btn.className = 'answer-btn';
      btn.textContent = intervalLabel(this.lang, id);
      btn.dataset.intervalId = id;
      
      btn.addEventListener('click', () => this.handleAnswer(id, btn));
      container.appendChild(btn);
    });

    this.selectedButtonIndex = 0;
    this.updateButtonSelection();
  }

  private updateButtonSelection() {
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach((btn, index) => {
      if (index === this.selectedButtonIndex) {
        btn.classList.add('selected');
      } else {
        btn.classList.remove('selected');
      }
    });
  }

  private nextRound() {
    if (!this.gameState) return; // Aborted
    this.isProcessingAnswer = false;
    
    const buttons = document.querySelectorAll('.answer-btn');
    buttons.forEach(btn => {
      btn.classList.remove('correct', 'wrong');
    });

    if (this.gameState?.hasWon()) {
      const perfect = this.gameState.getIsPerfect();
      const errs = this.gameState.getTotalErrors();
      UISounds.play('win');
      UISounds.stopThruster();
      this.victoryBlast();
      setTimeout(() => {
        const perfectText = perfect ? `${t(this.lang, 'common.yes')} 🏆` : t(this.lang, 'common.no');
        alert(`${t(this.lang, 'alert.victory.title')} 🪐\n${t(this.lang, 'alert.victory.errors')}: ${errs}\n${t(this.lang, 'alert.victory.perfect')}: ${perfectText}`);
        location.reload();
      }, 1700);
      return;
    }

    this.currentInterval = IntervalLogic.generate(this.activeIntervalIds);
    this.replayAudio();
    this.spawnEnemy();
  }

  /** Aterrizaje triunfal: fuegos artificiales alrededor del planeta. */
  private victoryBlast() {
    if (!this.effects) return;
    const fx = this.effects;
    const planet = document.getElementById('planet');
    const center = planet ? fx.centerOf(planet) : { x: fx.width / 2, y: fx.height * 0.3 };
    for (let i = 0; i < 16; i++) {
      setTimeout(() => {
        const x = center.x + (Math.random() * 2 - 1) * fx.width * 0.4;
        const y = center.y + (Math.random() * 2 - 1) * fx.height * 0.35;
        fx.explosion(x, y, { power: 1 + Math.random() });
        UISounds.playExplosion(1.3);
        fx.shake(8, 0.3);
      }, i * 110);
    }
    fx.flash('#ffd35c', 0.7, 0.45);
  }

  private replayAudio() {
    if (!this.currentInterval) return;

    // Atenuar el propulsor mientras suena el intervalo para no taparlo.
    UISounds.duckThruster();

    let activeTimbre = this.selectedTimbreConfig;
    if (activeTimbre === 'Random') {
      activeTimbre = ALL_TIMBRES[Math.floor(Math.random() * ALL_TIMBRES.length)];
    }

    this.audioEngine.playInterval(
      activeTimbre,
      this.currentInterval.rootNote,
      this.currentInterval.intervalNote,
      this.selectedPlayModeConfig
    );
  }

  private handleAnswer(selectedId: string, buttonElement: HTMLButtonElement) {
    if (!this.gameState || !this.currentInterval || this.isProcessingAnswer) return;

    this.isProcessingAnswer = true;
    const isCorrect = selectedId === this.currentInterval.intervalId;
    const player = document.getElementById('player-sprite');

    if (isCorrect) {
      buttonElement.classList.add('correct');
      UISounds.play('correct');

      // Lanzar misil al enemigo; al impactar, el héroe sube un piso.
      this.fireAtEnemy(() => {
        this.gameState?.submitAnswer(true);
        this.updateHUD();
        if (player) {
          player.classList.remove('hero-idle', 'hero-fall');
          player.classList.add('hero-jump');
          setTimeout(() => {
            player.classList.remove('hero-jump');
            player.classList.add('hero-idle');
          }, 500);
        }
      });
    } else {
      buttonElement.classList.add('wrong');
      const correctBtn = document.querySelector(`.answer-btn[data-interval-id="${this.currentInterval.intervalId}"]`);
      if (correctBtn) correctBtn.classList.add('correct');
      UISounds.play('wrong');

      // El enemigo se lanza en picada y golpea al héroe; se baja un piso.
      this.enemyAttack(() => {
        this.gameState?.submitAnswer(false);
        this.updateHUD();
        if (player) {
          player.classList.remove('hero-idle', 'hero-jump');
          player.classList.add('hero-fall');
          setTimeout(() => {
            player.classList.remove('hero-fall');
            player.classList.add('hero-idle');
          }, 500);
        }
      });
    }

    setTimeout(() => {
      if (this.gameState) {
        this.nextRound();
      }
    }, 1700);
  }

  /** Crea una nave enemiga en la parte alta de la zona de juego. */
  private spawnEnemy() {
    this.clearEnemy();
    const gameArea = document.querySelector('.game-area') as HTMLElement | null;
    if (!gameArea) return;

    const w = gameArea.clientWidth;
    const margin = 38;
    const x = Math.max(margin, Math.min(w - margin, w / 2 + (Math.random() * 2 - 1) * w * 0.34));
    const top = 16 + Math.random() * 46;

    const enemy = document.createElement('div');
    enemy.className = 'enemy-ship enemy-enter';
    enemy.style.left = `${x}px`;
    enemy.style.top = `${top}px`;
    enemy.innerHTML = `
      <svg class="enemy-core" viewBox="0 0 64 64" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg">
        <ellipse cx="32" cy="40" rx="26" ry="10" fill="#1b1033" stroke="#ff4fbf" stroke-width="2.5"/>
        <path d="M16 36 Q32 8 48 36 Z" fill="#2dd4bf" stroke="#00e5ff" stroke-width="2"/>
        <circle cx="32" cy="25" r="6" fill="#ffd35c"/>
        <circle cx="14" cy="42" r="3" fill="#00e5ff"/>
        <circle cx="32" cy="46" r="3" fill="#ff4fbf"/>
        <circle cx="50" cy="42" r="3" fill="#00e5ff"/>
      </svg>`;
    gameArea.appendChild(enemy);
    this.currentEnemy = enemy;
  }

  private clearEnemy() {
    if (this.currentEnemy) {
      this.currentEnemy.remove();
      this.currentEnemy = null;
    }
  }

  /** Dispara un misil del héroe al enemigo y lo destruye al impactar. */
  private fireAtEnemy(onHit: () => void) {
    const fx = this.effects;
    const player = document.getElementById('player-sprite');
    if (!fx || !player) { onHit(); return; }

    const from = fx.centerOf(player);
    const enemy = this.currentEnemy;
    const to = enemy ? fx.centerOf(enemy) : { x: from.x, y: 40 };

    UISounds.playLaunch();
    fx.fireMissile(from.x, from.y - 10, to.x, to.y, () => {
      fx.explosion(to.x, to.y, { power: 1.25 });
      UISounds.playExplosion();
      fx.shake(11, 0.4);
      fx.flash('#00e5ff', 0.25, 0.22);
      if (enemy) {
        enemy.classList.remove('enemy-enter');
        enemy.classList.add('enemy-destroyed');
        const dead = enemy;
        setTimeout(() => dead.remove(), 280);
        if (this.currentEnemy === enemy) this.currentEnemy = null;
      }
      onHit();
    });
  }

  /** El enemigo se lanza en picada hacia el héroe y detona al llegar. */
  private enemyAttack(onHit: () => void) {
    const fx = this.effects;
    const player = document.getElementById('player-sprite');
    if (!fx || !player) { onHit(); return; }

    const heroPos = fx.centerOf(player);
    const enemy = this.currentEnemy;

    const detonate = () => {
      fx.explosion(heroPos.x, heroPos.y, {
        power: 1.1,
        colors: ['#ffffff', '#ff2b5e', '#ff7b3a', '#ffd35c'],
        ring: '#ff2b5e',
      });
      UISounds.playExplosion(1.3);
      fx.flash('#ff2b5e', 0.45, 0.5);
      fx.shake(15, 0.5);
      onHit();
    };

    if (enemy) {
      const from = fx.centerOf(enemy);
      enemy.classList.remove('enemy-enter');
      enemy.classList.add('enemy-dive');
      // Forzar reflow para que la transición arranque desde la posición actual.
      void enemy.offsetWidth;
      const dx = Math.round(heroPos.x - from.x);
      const dy = Math.round(heroPos.y - from.y);
      enemy.style.transform = `translate(calc(-50% + ${dx}px), ${dy}px) scale(0.55)`;
      enemy.style.opacity = '0.35';
      const diving = enemy;
      if (this.currentEnemy === enemy) this.currentEnemy = null;
      setTimeout(() => {
        diving.remove();
        detonate();
      }, 400);
    } else {
      detonate();
    }
  }

  private updateHUD() {
    if (!this.gameState) return;
    const floor = this.gameState.getCurrentFloor();
    const floorDisplay = document.getElementById('floor-display');
    const errorDisplay = document.getElementById('error-display');
    
    if (floorDisplay) floorDisplay.textContent = floor.toString();
    if (errorDisplay) errorDisplay.textContent = this.gameState.getTotalErrors().toString();

    this.applyProgress(floor / 20);
  }
}
