class T{audio=null;volume=.9;async play(t,e=!1,n){this.stop();const a=new Audio(C(t));a.loop=e,a.volume=this.volume,a.addEventListener("ended",()=>{a.loop||(this.audio=null),n?.()}),this.audio=a;try{return await a.play(),"playing"}catch{return this.audio=null,a.error?"failed":"blocked"}}setLooping(t){this.audio&&(this.audio.loop=t)}setVolume(t){this.volume=Math.max(0,Math.min(1,t)),this.audio&&(this.audio.volume=this.volume)}getVolume(){return this.volume}isPlaying(){return this.audio?!this.audio.paused:!1}stop(){this.audio&&(this.audio.pause(),this.audio.currentTime=0,this.audio=null)}}const P="https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev";function C(s){const t=s.split("/").map(n=>encodeURIComponent(n)).join("/");return`${P.replace(/\/$/,"")}/${t}`}const m="Aleatorio",N=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],L=N,f=new Map(N.map((s,t)=>[s,t])),l=[{displayName:"Cello",folderName:"Cello"},{displayName:"Piano",folderName:"Piano"},{displayName:"Corno",folderName:"Corno"},{displayName:"Coro",folderName:"Coro"},{displayName:"Fagot",folderName:"Fagot"}],$=l.flatMap(I),h=Array.from(new Set($.map(s=>s.noteName))).sort(k);function b(s){return s.replace(/\d/g,"")}function p(s){const t=s.match(/\d+$/);return t?Number(t[0]):0}function k(s,t){const e=p(s)-p(t);return e!==0?e:(f.get(b(s))??99)-(f.get(b(t))??99)}function I(s){const t=[];for(let e=2;e<=6;e+=1)N.forEach(n=>{const a=`${n}${e}`;t.push({instrument:s.displayName,noteName:a,filePath:`${s.folderName}/${a}.mp3`})});return t.push({instrument:s.displayName,noteName:"C7",filePath:`${s.folderName}/C7.mp3`}),t}const E=1,O=.45,R=2;class M{lastNote=null;streakLength=0;getNextRandomNote(t,e=Math.random){if(t.length===0)return null;if(t.length===1){const c=t[0];return this.updateSelectionState(c),c}const n=this.lastNote;if(!n){const c=t[Math.floor(e()*t.length)]??t[0];return this.updateSelectionState(c),c}const a=this.streakLength>=R?t.filter(c=>c.noteName!==n.noteName):t,o=this.pickWeightedNote(a.length?a:t,n,e);return this.updateSelectionState(o),o}reset(){this.lastNote=null,this.streakLength=0}pickWeightedNote(t,e,n){const a=t.map(r=>({note:r,weight:r.noteName===e.noteName?O:E})),o=a.reduce((r,d)=>r+d.weight,0);let c=n()*o;for(const r of a)if(c-=r.weight,c<=0)return r.note;return a[a.length-1].note}updateSelectionState(t){this.streakLength=t.noteName===this.lastNote?.noteName?this.streakLength+1:1,this.lastNote=t}}const g="ap_multi_note_accuracy_stats";class F{loadStats(){try{const t=window.localStorage.getItem(g);if(!t)return new Map;const e=JSON.parse(t);return new Map(Object.entries(e).map(([n,a])=>[n,{correct:Number.isFinite(a.correct)?a.correct:0,total:Number.isFinite(a.total)?a.total:0}]))}catch{return new Map}}saveStats(t){const e=Object.fromEntries(t.entries());window.localStorage.setItem(g,JSON.stringify(e))}recordAnswer(t,e){const n=this.loadStats(),a=n.get(t)??{correct:0,total:0};return n.set(t,{correct:a.correct+(e?1:0),total:a.total+1}),this.saveStats(n),n}clearStats(){window.localStorage.removeItem(g)}}const w={es:{appTitle:"Oído Absoluto Multi",subtitle:"Piano, cello, corno, coro y fagot",modeLabels:{classic:"Entrenamiento clásico",timeAttack:"Modo contrarreloj",survival:"Modo supervivencia"},modeBadges:{classic:"Precisión",timeAttack:"Velocidad",survival:"Presión"},modeDescriptions:{classic:"Sesiones sin límite, precisión visible por nota y repetición controlada.",timeAttack:"Responde tantas notas como puedas antes de que el reloj llegue a cero.",survival:"Tres vidas, avance automático y final inmediato cuando se agotan."},instrumentLabels:{Cello:"Cello",Piano:"Piano",Corno:"Corno",Coro:"Coro",Fagot:"Fagot",[m]:"Aleatorio"},back:"Volver",stats:"Estadísticas",timeAttackDurationLabel:"Duración contrarreloj",noteSelection:"Selección de notas",instrument:"Instrumento",selected:"Seleccionadas",all:"Todas",clear:"Limpiar",start:"Iniciar",remove:"Quitar",choose:"Elegir",newNote:"Nueva nota",volume:"Volumen",time:"Tiempo",score:"Puntuación",lives:"Vidas",streak:"Racha",accuracy:"Precisión",session:"Sesión",reset:"Reiniciar",noAnswersYet:"Sin respuestas todavía",timeUp:"Tiempo agotado",gameOver:"Juego terminado",playAgain:"Jugar otra vez",history:"Historial",clearStats:"Borrar estadísticas",emptyStats:"Todavía no hay respuestas guardadas.",ready:"Listo",pressNewNote:"Presiona Nueva nota.",whatNote:"¿Cuál es la nota?",loop:"Loop",classicTitle:"Sesión clásica",totalNotes:s=>`${s} ${s===1?"nota":"notas"}`,cannotLoad:s=>`No se pudo cargar ${s.noteName} en ${s.instrument}.`,correct:s=>`Correcto. Era ${s.noteName} (${s.instrument}).`,incorrect:s=>`Incorrecto. Era ${s.noteName} (${s.instrument}).`,sessionReset:"Sesión reiniciada.",gameOverScore:s=>`Juego terminado. Puntuación: ${s}.`,timeUpScore:s=>`Tiempo agotado. Puntuación final: ${s}.`,livesTitle:s=>`${s} vidas`},en:{appTitle:"Perfect Pitch Multi",subtitle:"Piano, cello, horn, choir, and bassoon",modeLabels:{classic:"Classic training",timeAttack:"Time attack",survival:"Survival mode"},modeBadges:{classic:"Accuracy",timeAttack:"Speed",survival:"Pressure"},modeDescriptions:{classic:"Untimed sessions with visible per-note accuracy and controlled repetition.",timeAttack:"Answer as many notes as possible before the clock reaches zero.",survival:"Three lives, automatic advance, and an immediate ending when they run out."},instrumentLabels:{Cello:"Cello",Piano:"Piano",Corno:"Horn",Coro:"Choir",Fagot:"Bassoon",[m]:"Random"},back:"Back",stats:"Stats",timeAttackDurationLabel:"Time attack duration",noteSelection:"Note selection",instrument:"Instrument",selected:"Selected",all:"All",clear:"Clear",start:"Start",remove:"Remove",choose:"Choose",newNote:"New note",volume:"Volume",time:"Time",score:"Score",lives:"Lives",streak:"Streak",accuracy:"Accuracy",session:"Session",reset:"Reset",noAnswersYet:"No answers yet",timeUp:"Time up",gameOver:"Game over",playAgain:"Play again",history:"History",clearStats:"Clear stats",emptyStats:"No saved answers yet.",ready:"Ready",pressNewNote:"Press New note.",whatNote:"Which note is it?",loop:"Loop",classicTitle:"Classic session",totalNotes:s=>`${s} ${s===1?"note":"notes"}`,cannotLoad:s=>`Could not load ${s.noteName} on ${v(s.instrument)}.`,correct:s=>`Correct. It was ${s.noteName} (${v(s.instrument)}).`,incorrect:s=>`Incorrect. It was ${s.noteName} (${v(s.instrument)}).`,sessionReset:"Session reset.",gameOverScore:s=>`Game over. Score: ${s}.`,timeUpScore:s=>`Time up. Final score: ${s}.`,livesTitle:s=>`${s} ${s===1?"life":"lives"}`}},y=D(),i=w[y];document.documentElement.lang=y;document.title=`${i.appTitle} | Storm Studios`;const A=document.getElementById("app");if(!A)throw new Error("No se encontró el contenedor #app");class B{constructor(t){this.appRoot=t,this.persistentStats=this.statsRepository.loadStats(),this.render()}screen="menu";mode="classic";timeAttackDuration=60;selectedInstrument=l[0].displayName;selectedNoteNames=new Set;activeNotes=[];currentNote=null;feedback={kind:"info",text:i.ready};loopEnabled=!0;soundPlaying=!1;consecutiveHits=0;totalQuestionsAsked=0;totalCorrectAnswers=0;sessionStats=new Map;remainingTime=0;timeAttackScore=0;timeAttackFinished=!1;timerId=null;remainingLives=3;survivalScore=0;survivalGameOver=!1;persistentStats=new Map;statsRepository=new F;selector=new M;audioPlayer=new T;render(){this.appRoot.innerHTML=`
      <main class="ag-shell" data-screen="${this.screen}">
        ${this.renderHeader()}
        ${this.renderScreen()}
      </main>
    `,this.bindEvents()}renderHeader(){return`
      <header class="ag-topbar">
        <div class="ag-brand">
          ${this.screen!=="menu"?`<button class="ag-icon-btn" data-action="back" aria-label="${i.back}">‹</button>`:""}
          <img class="ag-brand-logo" src="/apps/ap-multi/brand/storm-studios-logo.png" alt="Storm Studios" />
          <div>
            <p class="ag-kicker">Storm Studios</p>
            <h1>${i.appTitle}</h1>
          </div>
        </div>
        <button class="ag-quiet-btn" data-action="stats">${i.stats}</button>
      </header>
    `}renderScreen(){switch(this.screen){case"menu":return this.renderMenu();case"selection":return this.renderSelection();case"training":return this.renderTraining();case"stats":return this.renderStats()}}renderMenu(){return`
      <section class="ag-menu">
        <div class="ag-menu-panel">
          <div class="ag-visual">
            <img src="/apps/ap-multi/brand/app-ap-multi.png" alt="${i.appTitle}" />
            <div class="ag-orchestra" aria-hidden="true">
              ${l.map((t,e)=>`
                    <span style="--i:${e+1}">
                      ${i.instrumentLabels[t.displayName]??t.displayName}
                    </span>
                  `).join("")}
            </div>
          </div>
          <div class="ag-mode-grid">
            <section class="ag-intro-card">
              <p class="ag-kicker">Studio Edition</p>
              <h2>${i.appTitle}</h2>
              <p>${i.subtitle}</p>
            </section>
            ${["classic","timeAttack","survival"].map(t=>`
                  <button class="ag-mode-card" data-action="select-mode" data-mode="${t}">
                    <span>${i.modeBadges[t]}</span>
                    <strong>${i.modeLabels[t]}</strong>
                    <em>${i.modeDescriptions[t]}</em>
                  </button>
                `).join("")}
            <div class="ag-duration-row" aria-label="${i.timeAttackDurationLabel}">
              ${[60,90,120].map(t=>`
                    <button
                      class="ag-segment ${this.timeAttackDuration===t?"is-active":""}"
                      data-action="set-duration"
                      data-duration="${t}"
                      aria-pressed="${this.timeAttackDuration===t}"
                    >
                      ${t}s
                    </button>
                  `).join("")}
            </div>
          </div>
        </div>
      </section>
    `}renderSelection(){const t=x(h),e=this.selectedNoteNames.size,n=[...l.map(a=>a.displayName),m];return`
      <section class="ag-selection">
        <div class="ag-section-head">
          <div>
            <p class="ag-kicker">${i.modeLabels[this.mode]}</p>
            <h2>${i.noteSelection}</h2>
          </div>
          <span class="ag-count">${e}</span>
        </div>
        <div class="ag-toolbar">
          <button class="ag-secondary-btn" data-action="select-all">${i.all}</button>
          <button class="ag-secondary-btn" data-action="clear-selection">${i.clear}</button>
          <button class="ag-primary-btn" data-action="start-training" ${e===0?"disabled":""}>
            ${i.start}
          </button>
        </div>
        <section class="ag-instrument-panel">
          <div>
            <p class="ag-kicker">${i.instrument}</p>
            <strong>${i.instrumentLabels[this.selectedInstrument]??this.selectedInstrument}</strong>
          </div>
          <div class="ag-instrument-grid">
            ${n.map(a=>{const o=this.selectedInstrument===a;return`
                  <button
                    class="ag-instrument-chip ${o?"is-selected":""}"
                    data-action="set-instrument"
                    data-instrument="${S(a)}"
                    aria-pressed="${o}"
                  >
                    ${i.instrumentLabels[a]??a}
                  </button>
                `}).join("")}
          </div>
        </section>
        <div class="ag-strings">
          ${Array.from(t.entries()).map(([a,o])=>{const c=o.filter(r=>this.selectedNoteNames.has(r)).length;return`
                <section class="ag-string-block">
                  <div class="ag-string-head">
                    <h3>Octava ${a}</h3>
                    <button class="ag-mini-btn" data-action="toggle-octave" data-octave="${a}">
                      ${c===o.length?i.remove:i.choose}
                    </button>
                  </div>
                  <div class="ag-note-grid">
                    ${o.map(r=>{const d=this.selectedNoteNames.has(r);return`
                          <button
                            class="ag-note-toggle ${d?"is-selected":""}"
                            data-action="toggle-note"
                            data-note-name="${S(r)}"
                            aria-pressed="${d}"
                          >
                            ${r}
                          </button>
                        `}).join("")}
                  </div>
                </section>
              `}).join("")}
        </div>
      </section>
    `}renderTraining(){const t=this.mode==="timeAttack"&&this.timeAttackFinished||this.mode==="survival"&&this.survivalGameOver,e=this.currentNote!==null&&!t;return`
      <section class="ag-training">
        <div class="ag-stage">
          <div class="ag-stage-top">
            <div>
              <p class="ag-kicker">${i.modeLabels[this.mode]}</p>
              <h2>${this.trainingTitle()}</h2>
            </div>
            <span class="ag-count">${this.activeNotes.length}</span>
          </div>
          ${this.renderHud()}
          <div class="ag-resonator" data-playing="${this.soundPlaying}">
            ${l.map((n,a)=>`<span class="ag-wave" style="--i:${a+1}">${n.displayName}</span>`).join("")}
          </div>
          <p class="ag-feedback" data-kind="${this.feedback.kind}">${this.feedback.text}</p>
          <div class="ag-training-actions">
            <button class="ag-primary-btn" data-action="new-note" ${this.activeNotes.length===0||t?"disabled":""}>
              ${i.newNote}
            </button>
            <button class="ag-secondary-btn ${this.loopEnabled?"is-active":""}" data-action="toggle-loop" aria-pressed="${this.loopEnabled}">
              ${i.loop}
            </button>
          </div>
          <label class="ag-volume">
            <span>${i.volume}</span>
            <input data-action="volume" type="range" min="0" max="100" value="${Math.round(this.audioPlayer.getVolume()*100)}" />
          </label>
        </div>
        <div class="ag-answer-panel">
          <div class="ag-answer-grid">
            ${L.map(n=>`
                  <button class="ag-answer-btn" data-action="answer" data-note="${n}" ${e?"":"disabled"}>
                    ${n}
                  </button>
                `).join("")}
          </div>
          ${this.mode==="classic"?this.renderClassicStats():""}
          ${t?this.renderEndGameCard():""}
        </div>
      </section>
    `}renderHud(){if(this.mode==="timeAttack")return`
        <div class="ag-hud">
          <div><span>${i.time}</span><strong class="${this.remainingTime<=10&&this.remainingTime>0?"is-hot":""}">${this.remainingTime}s</strong></div>
          <div><span>${i.score}</span><strong>${this.timeAttackScore}</strong></div>
        </div>
      `;if(this.mode==="survival")return`
        <div class="ag-hud">
          <div><span>${i.lives}</span><strong>${"♥".repeat(this.remainingLives)}${"♡".repeat(3-this.remainingLives)}</strong></div>
          <div><span>${i.score}</span><strong>${this.survivalScore}</strong></div>
        </div>
      `;const t=this.totalQuestionsAsked===0?0:this.totalCorrectAnswers/this.totalQuestionsAsked;return`
      <div class="ag-hud">
        <div><span>${i.streak}</span><strong>${this.consecutiveHits}</strong></div>
        <div><span>${i.accuracy}</span><strong>${u(t)}</strong></div>
      </div>
    `}renderClassicStats(){const t=this.totalQuestionsAsked===0?0:this.totalCorrectAnswers/this.totalQuestionsAsked,e=Array.from(this.sessionStats.entries()).sort(([n],[a])=>k(n,a));return`
      <section class="ag-session-card">
        <div class="ag-session-head">
          <div>
            <span>${i.session}</span>
            <strong>${this.totalCorrectAnswers} / ${this.totalQuestionsAsked}</strong>
          </div>
          <button class="ag-mini-btn" data-action="reset-session">${i.reset}</button>
        </div>
        <div class="ag-progress"><span style="width:${t*100}%"></span></div>
        <div class="ag-stat-pills">
          ${e.length===0?`<span class="ag-empty-pill">${i.noAnswersYet}</span>`:e.map(([n,a])=>{const o=a.total===0?0:a.correct/a.total;return`<span>${n} ${u(o)}</span>`}).join("")}
        </div>
      </section>
    `}renderEndGameCard(){const t=this.mode==="timeAttack"?this.timeAttackScore:this.survivalScore;return`
      <section class="ag-end-card">
        <span>${this.mode==="timeAttack"?i.timeUp:i.gameOver}</span>
        <strong>${t}</strong>
        <button class="ag-primary-btn" data-action="play-again">${i.playAgain}</button>
      </section>
    `}renderStats(){const t=Array.from(this.persistentStats.values()).reduce((n,a)=>({correct:n.correct+a.correct,total:n.total+a.total}),{correct:0,total:0}),e=t.total===0?0:t.correct/t.total;return`
      <section class="ag-stats">
        <div class="ag-section-head">
          <div>
            <p class="ag-kicker">${i.history}</p>
            <h2>${i.stats}</h2>
          </div>
          <span class="ag-count">${u(e)}</span>
        </div>
        <div class="ag-toolbar">
          <button class="ag-secondary-btn" data-action="clear-stats" ${this.persistentStats.size===0?"disabled":""}>
            ${i.clearStats}
          </button>
        </div>
        ${this.persistentStats.size===0?`<div class="ag-empty-state">${i.emptyStats}</div>`:`<div class="ag-stats-list">
                ${h.map(n=>{const a=this.persistentStats.get(n)??{correct:0,total:0},o=a.total===0?0:a.correct/a.total;return`
                      <article class="ag-stat-row">
                        <div>
                          <strong>${n}</strong>
                          <span>${a.correct} / ${a.total}</span>
                        </div>
                        <div class="ag-progress"><span style="width:${o*100}%"></span></div>
                        <em>${u(o)}</em>
                      </article>
                    `}).join("")}
              </div>`}
      </section>
    `}bindEvents(){this.appRoot.querySelectorAll("[data-action]").forEach(t=>{const e=t.dataset.action;t.addEventListener("click",()=>{t instanceof HTMLButtonElement&&t.disabled||this.handleAction(e,t)})}),this.appRoot.querySelector('input[data-action="volume"]')?.addEventListener("input",t=>{const e=t.currentTarget;this.audioPlayer.setVolume(Number(e.value)/100)})}handleAction(t,e){switch(t){case"back":this.goBack();break;case"stats":this.openStats();break;case"select-mode":this.openSelection(e.dataset.mode);break;case"set-duration":this.timeAttackDuration=Number(e.dataset.duration)||60,this.render();break;case"set-instrument":this.selectedInstrument=e.dataset.instrument||l[0].displayName,this.render();break;case"select-all":this.selectedNoteNames=new Set(h),this.render();break;case"clear-selection":this.selectedNoteNames.clear(),this.render();break;case"toggle-octave":this.toggleOctave(Number(e.dataset.octave)||0);break;case"toggle-note":this.toggleNote(e.dataset.noteName??"");break;case"start-training":this.startTraining();break;case"new-note":this.playNewNoteRequested();break;case"toggle-loop":this.loopEnabled=!this.loopEnabled,this.audioPlayer.setLooping(this.loopEnabled),this.render();break;case"answer":this.answer(e.dataset.note??"");break;case"reset-session":this.resetClassicStats(),this.feedback={kind:"info",text:i.sessionReset},this.render();break;case"play-again":this.resetTrainingState(),this.render();break;case"clear-stats":this.statsRepository.clearStats(),this.persistentStats=new Map,this.render();break}}goBack(){this.screen==="training"?(this.stopTraining(),this.screen="menu"):this.screen==="selection"?this.screen="menu":this.screen==="stats"&&(this.screen="menu"),this.render()}openStats(){this.stopTraining(),this.persistentStats=this.statsRepository.loadStats(),this.screen="stats",this.render()}openSelection(t){this.stopTraining(),this.mode=t,this.screen="selection",this.selectedInstrument=l[0].displayName,this.selectedNoteNames.clear(),this.render()}toggleOctave(t){const e=h.filter(a=>p(a)===t),n=e.every(a=>this.selectedNoteNames.has(a));e.forEach(a=>{n?this.selectedNoteNames.delete(a):this.selectedNoteNames.add(a)}),this.render()}toggleNote(t){this.selectedNoteNames.has(t)?this.selectedNoteNames.delete(t):this.selectedNoteNames.add(t),this.render()}startTraining(){const t=this.selectedNoteNames;this.activeNotes=this.selectedInstrument===m?$.filter(e=>t.has(e.noteName)):$.filter(e=>e.instrument===this.selectedInstrument&&t.has(e.noteName)),this.activeNotes.length!==0&&(this.resetTrainingState(),this.screen="training",this.feedback={kind:"info",text:i.pressNewNote},this.render())}resetTrainingState(){this.stopTimer(),this.selector.reset(),this.currentNote=null,this.soundPlaying=!1,this.audioPlayer.stop(),this.feedback={kind:"info",text:i.pressNewNote},this.mode==="classic"&&this.resetClassicStats(),this.mode==="timeAttack"&&(this.remainingTime=this.timeAttackDuration,this.timeAttackScore=0,this.timeAttackFinished=!1),this.mode==="survival"&&(this.remainingLives=3,this.survivalScore=0,this.survivalGameOver=!1)}resetClassicStats(){this.consecutiveHits=0,this.totalQuestionsAsked=0,this.totalCorrectAnswers=0,this.sessionStats.clear()}stopTraining(){this.stopTimer(),this.audioPlayer.stop(),this.soundPlaying=!1,this.currentNote=null,this.selector.reset()}async playNewNoteRequested(){if(this.activeNotes.length===0||this.timeAttackFinished||this.survivalGameOver)return;this.audioPlayer.stop(),this.soundPlaying=!1;const t=this.selector.getNextRandomNote(this.activeNotes);if(this.currentNote=t,this.feedback={kind:"info",text:i.whatNote},this.mode==="timeAttack"&&this.timerId===null&&this.startTimer(),this.render(),!t)return;const e=await this.audioPlayer.play(t.filePath,this.loopEnabled,()=>{this.loopEnabled||(this.soundPlaying=!1,this.render())});this.soundPlaying=e==="playing"&&this.audioPlayer.isPlaying(),e==="failed"&&(this.feedback={kind:"incorrect",text:i.cannotLoad(t)}),this.render()}async answer(t){const e=this.currentNote;if(!e||this.timeAttackFinished||this.survivalGameOver)return;this.audioPlayer.stop(),this.soundPlaying=!1;const n=b(e.noteName)===t;n?(this.audioPlayer.play("acierto.mp3"),this.feedback={kind:"correct",text:i.correct(e)},this.applyCorrectAnswer()):(this.audioPlayer.play("error.mp3"),this.feedback={kind:"incorrect",text:i.incorrect(e)},this.applyIncorrectAnswer()),this.updateSessionStats(e.noteName,n),this.persistentStats=this.statsRepository.recordAnswer(e.noteName,n),this.survivalGameOver||(this.currentNote=null),this.render(),(this.mode==="timeAttack"&&!this.timeAttackFinished||this.mode==="survival"&&!this.survivalGameOver)&&window.setTimeout(()=>{this.playNewNoteRequested()},400)}applyCorrectAnswer(){this.mode==="classic"&&(this.totalQuestionsAsked+=1,this.totalCorrectAnswers+=1,this.consecutiveHits+=1),this.mode==="timeAttack"&&(this.timeAttackScore+=1),this.mode==="survival"&&(this.survivalScore+=1)}applyIncorrectAnswer(){this.mode==="classic"&&(this.totalQuestionsAsked+=1,this.consecutiveHits=0),this.mode==="survival"&&(this.remainingLives-=1,this.remainingLives<=0&&(this.remainingLives=0,this.survivalGameOver=!0,this.currentNote=null,this.feedback={kind:"incorrect",text:i.gameOverScore(this.survivalScore)}))}updateSessionStats(t,e){const n=this.sessionStats.get(t)??{correct:0,total:0};this.sessionStats.set(t,{correct:n.correct+(e?1:0),total:n.total+1})}startTimer(){this.stopTimer(),this.remainingTime=this.timeAttackDuration,this.timeAttackFinished=!1,this.timerId=window.setInterval(()=>{this.remainingTime-=1,this.remainingTime<=0?this.finishTimeAttack():this.render()},1e3)}finishTimeAttack(){this.stopTimer(),this.remainingTime=0,this.timeAttackFinished=!0,this.currentNote=null,this.soundPlaying=!1,this.audioPlayer.stop(),this.feedback={kind:"info",text:i.timeUpScore(this.timeAttackScore)},this.render()}stopTimer(){this.timerId!==null&&(window.clearInterval(this.timerId),this.timerId=null)}trainingTitle(){return this.mode==="timeAttack"?`${this.remainingTime||this.timeAttackDuration}s`:this.mode==="survival"?i.livesTitle(this.remainingLives):i.totalNotes(this.activeNotes.length)}}function x(s){const t=new Map;return s.forEach(e=>{const n=p(e),a=t.get(n)??[];a.push(e),t.set(n,a.sort(k))}),new Map([...t.entries()].sort(([e],[n])=>e-n))}function u(s){return new Intl.NumberFormat(y==="es"?"es-MX":"en-US",{style:"percent",maximumFractionDigits:1}).format(s)}function D(){return new URLSearchParams(window.location.search).get("lang")?.toLowerCase().startsWith("en")?"en":"es"}function S(s){return s.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}function v(s){return w.en.instrumentLabels[s]??s}new B(A);
