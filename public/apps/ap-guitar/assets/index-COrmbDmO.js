class A{audio=null;volume=.9;async play(t,e=!1,r){this.stop();const s=new Audio(k(t));s.loop=e,s.volume=this.volume,s.addEventListener("ended",()=>{s.loop||(this.audio=null),r?.()}),this.audio=s;try{return await s.play(),!0}catch{return this.audio=null,!1}}setLooping(t){this.audio&&(this.audio.loop=t)}setVolume(t){this.volume=Math.max(0,Math.min(1,t)),this.audio&&(this.audio.volume=this.volume)}getVolume(){return this.volume}isPlaying(){return this.audio?!this.audio.paused:!1}stop(){this.audio&&(this.audio.pause(),this.audio.currentTime=0,this.audio=null)}}const b="https://pub-905d3540e35b4c49bb36ccc2d2d99752.r2.dev";function k(a){return`${b.replace(/\/$/,"")}/${a.split("/").map(e=>encodeURIComponent(e)).join("/")}`}const P=["Cuerda E (grave)","Cuerda A","Cuerda D","Cuerda G","Cuerda B","Cuerda E (aguda)"],$=["A","A#","B","C","C#","D","D#","E","F","F#","G","G#"],v=new Map(["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"].map((a,t)=>[a,t])),d=[{stringName:"Cuerda E (grave)",noteName:"E2",filePath:"E String low/E2.mp3"},{stringName:"Cuerda E (grave)",noteName:"F2",filePath:"E String low/F2.mp3"},{stringName:"Cuerda E (grave)",noteName:"F#2",filePath:"E String low/F#2.mp3"},{stringName:"Cuerda E (grave)",noteName:"G2",filePath:"E String low/G2.mp3"},{stringName:"Cuerda E (grave)",noteName:"G#2",filePath:"E String low/G#2.mp3"},{stringName:"Cuerda E (grave)",noteName:"A2",filePath:"E String low/A2.mp3"},{stringName:"Cuerda E (grave)",noteName:"A#2",filePath:"E String low/A#2.mp3"},{stringName:"Cuerda E (grave)",noteName:"B2",filePath:"E String low/B2.mp3"},{stringName:"Cuerda E (grave)",noteName:"C3",filePath:"E String low/C3.mp3"},{stringName:"Cuerda E (grave)",noteName:"C#3",filePath:"E String low/C#3.mp3"},{stringName:"Cuerda E (grave)",noteName:"D3",filePath:"E String low/D3.mp3"},{stringName:"Cuerda E (grave)",noteName:"D#3",filePath:"E String low/D#3.mp3"},{stringName:"Cuerda E (grave)",noteName:"E3",filePath:"E String low/E3.mp3"},{stringName:"Cuerda A",noteName:"A2",filePath:"A String/A2.mp3"},{stringName:"Cuerda A",noteName:"A#2",filePath:"A String/A#2.mp3"},{stringName:"Cuerda A",noteName:"B2",filePath:"A String/B2.mp3"},{stringName:"Cuerda A",noteName:"C3",filePath:"A String/C3.mp3"},{stringName:"Cuerda A",noteName:"C#3",filePath:"A String/C#3.mp3"},{stringName:"Cuerda A",noteName:"D3",filePath:"A String/D3.mp3"},{stringName:"Cuerda A",noteName:"D#3",filePath:"A String/D#3.mp3"},{stringName:"Cuerda A",noteName:"E3",filePath:"A String/E3.mp3"},{stringName:"Cuerda A",noteName:"F3",filePath:"A String/F3.mp3"},{stringName:"Cuerda A",noteName:"F#3",filePath:"A String/F#3.mp3"},{stringName:"Cuerda A",noteName:"G3",filePath:"A String/G3.mp3"},{stringName:"Cuerda A",noteName:"G#3",filePath:"A String/G#3.mp3"},{stringName:"Cuerda A",noteName:"A3",filePath:"A String/A3.mp3"},{stringName:"Cuerda D",noteName:"D3",filePath:"D String/D3.mp3"},{stringName:"Cuerda D",noteName:"D#3",filePath:"D String/D#3.mp3"},{stringName:"Cuerda D",noteName:"E3",filePath:"D String/E3.mp3"},{stringName:"Cuerda D",noteName:"F3",filePath:"D String/F3.mp3"},{stringName:"Cuerda D",noteName:"F#3",filePath:"D String/F#3.mp3"},{stringName:"Cuerda D",noteName:"G3",filePath:"D String/G3.mp3"},{stringName:"Cuerda D",noteName:"G#3",filePath:"D String/G#3.mp3"},{stringName:"Cuerda D",noteName:"A3",filePath:"D String/A3.mp3"},{stringName:"Cuerda D",noteName:"A#3",filePath:"D String/A#3.mp3"},{stringName:"Cuerda D",noteName:"B3",filePath:"D String/B3.mp3"},{stringName:"Cuerda D",noteName:"C4",filePath:"D String/C4.mp3"},{stringName:"Cuerda D",noteName:"C#4",filePath:"D String/C#4.mp3"},{stringName:"Cuerda D",noteName:"D4",filePath:"D String/D4.mp3"},{stringName:"Cuerda G",noteName:"G3",filePath:"G String/G3.mp3"},{stringName:"Cuerda G",noteName:"G#3",filePath:"G String/G#3.mp3"},{stringName:"Cuerda G",noteName:"A3",filePath:"G String/A3.mp3"},{stringName:"Cuerda G",noteName:"A#3",filePath:"G String/A#3.mp3"},{stringName:"Cuerda G",noteName:"B3",filePath:"G String/B3.mp3"},{stringName:"Cuerda G",noteName:"C4",filePath:"G String/C4.mp3"},{stringName:"Cuerda G",noteName:"C#4",filePath:"G String/C#4.mp3"},{stringName:"Cuerda G",noteName:"D4",filePath:"G String/D4.mp3"},{stringName:"Cuerda G",noteName:"D#4",filePath:"G String/D#4.mp3"},{stringName:"Cuerda G",noteName:"E4",filePath:"G String/E4.mp3"},{stringName:"Cuerda G",noteName:"F4",filePath:"G String/F4.mp3"},{stringName:"Cuerda G",noteName:"F#4",filePath:"G String/F#4.mp3"},{stringName:"Cuerda G",noteName:"G4",filePath:"G String/G4.mp3"},{stringName:"Cuerda B",noteName:"B3",filePath:"B String/B3.mp3"},{stringName:"Cuerda B",noteName:"C4",filePath:"B String/C4.mp3"},{stringName:"Cuerda B",noteName:"C#4",filePath:"B String/C#4.mp3"},{stringName:"Cuerda B",noteName:"D4",filePath:"B String/D4.mp3"},{stringName:"Cuerda B",noteName:"D#4",filePath:"B String/D#4.mp3"},{stringName:"Cuerda B",noteName:"E4",filePath:"B String/E4.mp3"},{stringName:"Cuerda B",noteName:"F4",filePath:"B String/F4.mp3"},{stringName:"Cuerda B",noteName:"F#4",filePath:"B String/F#4.mp3"},{stringName:"Cuerda B",noteName:"G4",filePath:"B String/G4.mp3"},{stringName:"Cuerda B",noteName:"A4",filePath:"B String/A4.mp3"},{stringName:"Cuerda B",noteName:"A#4",filePath:"B String/A#4.mp3"},{stringName:"Cuerda B",noteName:"B4",filePath:"B String/B4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"E4",filePath:"E String high/E4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"F4",filePath:"E String high/F4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"F#4",filePath:"E String high/F#4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"G4",filePath:"E String high/G4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"G#4",filePath:"E String high/G#4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"A4",filePath:"E String high/A4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"A#4",filePath:"E String high/A#4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"B4",filePath:"E String high/B4.mp3"},{stringName:"Cuerda E (aguda)",noteName:"C5",filePath:"E String high/C5.mp3"},{stringName:"Cuerda E (aguda)",noteName:"C#5",filePath:"E String high/C#5.mp3"},{stringName:"Cuerda E (aguda)",noteName:"D5",filePath:"E String high/D5.mp3"},{stringName:"Cuerda E (aguda)",noteName:"D#5",filePath:"E String high/D#5.mp3"},{stringName:"Cuerda E (aguda)",noteName:"E5",filePath:"E String high/E5.mp3"}],y=Array.from(new Set(d.map(a=>a.noteName)));function u(a){return a.replace(/\d/g,"")}function N(a){const t=a.match(/\d+$/);return t?Number(t[0]):0}function S(a,t){const e=N(a)-N(t);return e!==0?e:(v.get(u(a))??99)-(v.get(u(t))??99)}function l(a){return a.filePath}const w=1,E=.45,G=2;class D{lastNote=null;streakLength=0;getNextRandomNote(t,e=Math.random){if(t.length===0)return null;if(t.length===1){const o=t[0];return this.updateSelectionState(o),o}const r=this.lastNote;if(!r){const o=t[Math.floor(e()*t.length)]??t[0];return this.updateSelectionState(o),o}const s=this.streakLength>=G?t.filter(o=>o.noteName!==r.noteName):t,n=this.pickWeightedNote(s.length?s:t,r,e);return this.updateSelectionState(n),n}reset(){this.lastNote=null,this.streakLength=0}pickWeightedNote(t,e,r){const s=t.map(c=>({note:c,weight:c.noteName===e.noteName?E:w})),n=s.reduce((c,m)=>c+m.weight,0);let o=r()*n;for(const c of s)if(o-=c.weight,o<=0)return c.note;return s[s.length-1].note}updateSelectionState(t){this.streakLength=t.noteName===this.lastNote?.noteName?this.streakLength+1:1,this.lastNote=t}}const g="ap_guitar_note_accuracy_stats";class B{loadStats(){try{const t=window.localStorage.getItem(g);if(!t)return new Map;const e=JSON.parse(t);return new Map(Object.entries(e).map(([r,s])=>[r,{correct:Number.isFinite(s.correct)?s.correct:0,total:Number.isFinite(s.total)?s.total:0}]))}catch{return new Map}}saveStats(t){const e=Object.fromEntries(t.entries());window.localStorage.setItem(g,JSON.stringify(e))}recordAnswer(t,e){const r=this.loadStats(),s=r.get(t)??{correct:0,total:0};return r.set(t,{correct:s.correct+(e?1:0),total:s.total+1}),this.saveStats(r),r}clearStats(){window.localStorage.removeItem(g)}}const T={es:{modeLabels:{classic:"Entrenamiento clásico",timeAttack:"Modo contrarreloj",survival:"Modo supervivencia"},modeBadges:{classic:"Precisión",timeAttack:"Velocidad",survival:"Presión"},stringLabels:{"Cuerda E (grave)":"Cuerda E (grave)","Cuerda A":"Cuerda A","Cuerda D":"Cuerda D","Cuerda G":"Cuerda G","Cuerda B":"Cuerda B","Cuerda E (aguda)":"Cuerda E (aguda)"},back:"Volver",stats:"Estadísticas",timeAttackDurationLabel:"Duración contrarreloj",noteSelection:"Selección de notas",all:"Todas",clear:"Limpiar",start:"Iniciar",remove:"Quitar",choose:"Elegir",newNote:"Nueva nota",volume:"Volumen",time:"Tiempo",score:"Puntuación",lives:"Vidas",streak:"Racha",accuracy:"Precisión",session:"Sesión",reset:"Reiniciar",noAnswersYet:"Sin respuestas todavía",timeUp:"Tiempo agotado",gameOver:"Juego terminado",playAgain:"Jugar otra vez",history:"Historial",clearStats:"Borrar estadísticas",emptyStats:"Todavía no hay respuestas guardadas.",ready:"Listo",pressNewNote:"Presiona Nueva nota.",whatNote:"¿Cuál es la nota?",cannotLoad:a=>`No se pudo cargar ${a}.`,correct:a=>`Correcto. Era ${a}.`,incorrect:a=>`Incorrecto. Era ${a}.`,sessionReset:"Sesión reiniciada.",gameOverScore:a=>`Juego terminado. Puntuación: ${a}.`,timeUpScore:a=>`Tiempo agotado. Puntuación final: ${a}.`,classicTitle:"Sesión clásica",livesTitle:a=>`${a} vidas`},en:{modeLabels:{classic:"Classic training",timeAttack:"Time attack",survival:"Survival mode"},modeBadges:{classic:"Accuracy",timeAttack:"Speed",survival:"Pressure"},stringLabels:{"Cuerda E (grave)":"Low E string","Cuerda A":"A string","Cuerda D":"D string","Cuerda G":"G string","Cuerda B":"B string","Cuerda E (aguda)":"High E string"},back:"Back",stats:"Stats",timeAttackDurationLabel:"Time attack duration",noteSelection:"Note selection",all:"All",clear:"Clear",start:"Start",remove:"Remove",choose:"Choose",newNote:"New note",volume:"Volume",time:"Time",score:"Score",lives:"Lives",streak:"Streak",accuracy:"Accuracy",session:"Session",reset:"Reset",noAnswersYet:"No answers yet",timeUp:"Time up",gameOver:"Game over",playAgain:"Play again",history:"History",clearStats:"Clear stats",emptyStats:"No saved answers yet.",ready:"Ready",pressNewNote:"Press New note.",whatNote:"Which note is it?",cannotLoad:a=>`Could not load ${a}.`,correct:a=>`Correct. It was ${a}.`,incorrect:a=>`Incorrect. It was ${a}.`,sessionReset:"Session reset.",gameOverScore:a=>`Game over. Score: ${a}.`,timeUpScore:a=>`Time up. Final score: ${a}.`,classicTitle:"Classic session",livesTitle:a=>`${a} ${a===1?"life":"lives"}`}},p=I(),i=T[p];document.documentElement.lang=p;const C=document.getElementById("app");if(!C)throw new Error("No se encontró el contenedor #app");class F{constructor(t){this.appRoot=t,this.persistentStats=this.statsRepository.loadStats(),this.render()}screen="menu";mode="classic";timeAttackDuration=60;selectedIds=new Set;activeNotes=[];currentNote=null;feedback={kind:"info",text:i.ready};loopEnabled=!0;soundPlaying=!1;consecutiveHits=0;totalQuestionsAsked=0;totalCorrectAnswers=0;sessionStats=new Map;remainingTime=0;timeAttackScore=0;timeAttackFinished=!1;timerId=null;remainingLives=3;survivalScore=0;survivalGameOver=!1;persistentStats=new Map;statsRepository=new B;selector=new D;audioPlayer=new A;render(){this.appRoot.innerHTML=`
      <main class="ag-shell" data-screen="${this.screen}">
        ${this.renderHeader()}
        ${this.renderScreen()}
      </main>
    `,this.bindEvents()}renderHeader(){return`
      <header class="ag-topbar">
        <div class="ag-brand">
          ${this.screen!=="menu"?`<button class="ag-icon-btn" data-action="back" aria-label="${i.back}">‹</button>`:""}
          <img class="ag-brand-logo" src="/apps/ap-guitar/brand/storm-studios-logo.png" alt="Storm Studios" />
          <div>
            <p class="ag-kicker">Storm Studios</p>
            <h1>AP Guitar</h1>
          </div>
        </div>
        <button class="ag-quiet-btn" data-action="stats">${i.stats}</button>
      </header>
    `}renderScreen(){switch(this.screen){case"menu":return this.renderMenu();case"selection":return this.renderSelection();case"training":return this.renderTraining();case"stats":return this.renderStats()}}renderMenu(){return`
      <section class="ag-menu">
        <div class="ag-menu-panel">
          <div class="ag-visual">
            <img src="/apps/ap-guitar/brand/app-ap-guitar.jpeg" alt="AP Guitar" />
            <div class="ag-fretboard" aria-hidden="true">
              ${Array.from({length:6},(t,e)=>`<span style="--string:${e+1}"></span>`).join("")}
            </div>
          </div>
          <div class="ag-mode-grid">
            ${["classic","timeAttack","survival"].map(t=>`
                  <button class="ag-mode-card" data-action="select-mode" data-mode="${t}">
                    <span>${i.modeBadges[t]}</span>
                    <strong>${i.modeLabels[t]}</strong>
                  </button>
                `).join("")}
          </div>
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
      </section>
    `}renderSelection(){const t=L(d),e=this.selectedIds.size;return`
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
        <div class="ag-strings">
          ${P.map(r=>{const s=t.get(r)??[],n=s.filter(o=>this.selectedIds.has(l(o))).length;return`
                <section class="ag-string-block">
                  <div class="ag-string-head">
                    <h3>${i.stringLabels[r]??r}</h3>
                    <button class="ag-mini-btn" data-action="toggle-string" data-string="${f(r)}">
                      ${n===s.length?i.remove:i.choose}
                    </button>
                  </div>
                  <div class="ag-note-grid">
                    ${s.map(o=>{const c=l(o),m=this.selectedIds.has(c);return`
                          <button
                            class="ag-note-toggle ${m?"is-selected":""}"
                            data-action="toggle-note"
                            data-note-id="${f(c)}"
                            aria-pressed="${m}"
                          >
                            ${o.noteName}
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
          <div class="ag-guitar" data-playing="${this.soundPlaying}">
            ${Array.from({length:6},(r,s)=>`<span class="ag-guitar-string" style="--string:${s+1}"></span>`).join("")}
            ${Array.from({length:5},(r,s)=>`<span class="ag-fret" style="--fret:${s+1}"></span>`).join("")}
          </div>
          <p class="ag-feedback" data-kind="${this.feedback.kind}">${this.feedback.text}</p>
          <div class="ag-training-actions">
            <button class="ag-primary-btn" data-action="new-note" ${this.activeNotes.length===0||t?"disabled":""}>
              ${i.newNote}
            </button>
            <button class="ag-secondary-btn ${this.loopEnabled?"is-active":""}" data-action="toggle-loop" aria-pressed="${this.loopEnabled}">
              Loop
            </button>
          </div>
          <label class="ag-volume">
            <span>${i.volume}</span>
            <input data-action="volume" type="range" min="0" max="100" value="${Math.round(this.audioPlayer.getVolume()*100)}" />
          </label>
        </div>
        <div class="ag-answer-panel">
          <div class="ag-answer-grid">
            ${$.map(r=>`
                  <button class="ag-answer-btn" data-action="answer" data-note="${r}" ${e?"":"disabled"}>
                    ${r}
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
        <div><span>${i.accuracy}</span><strong>${h(t)}</strong></div>
      </div>
    `}renderClassicStats(){const t=this.totalQuestionsAsked===0?0:this.totalCorrectAnswers/this.totalQuestionsAsked,e=Array.from(this.sessionStats.entries()).sort(([r],[s])=>S(r,s));return`
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
          ${e.length===0?`<span class="ag-empty-pill">${i.noAnswersYet}</span>`:e.map(([r,s])=>{const n=s.total===0?0:s.correct/s.total;return`<span>${r} ${h(n)}</span>`}).join("")}
        </div>
      </section>
    `}renderEndGameCard(){const t=this.mode==="timeAttack"?this.timeAttackScore:this.survivalScore;return`
      <section class="ag-end-card">
        <span>${this.mode==="timeAttack"?i.timeUp:i.gameOver}</span>
        <strong>${t}</strong>
        <button class="ag-primary-btn" data-action="play-again">${i.playAgain}</button>
      </section>
    `}renderStats(){const t=[...y].sort(S),e=Array.from(this.persistentStats.values()).reduce((s,n)=>({correct:s.correct+n.correct,total:s.total+n.total}),{correct:0,total:0}),r=e.total===0?0:e.correct/e.total;return`
      <section class="ag-stats">
        <div class="ag-section-head">
          <div>
            <p class="ag-kicker">${i.history}</p>
            <h2>${i.stats}</h2>
          </div>
          <span class="ag-count">${h(r)}</span>
        </div>
        <div class="ag-toolbar">
          <button class="ag-secondary-btn" data-action="clear-stats" ${this.persistentStats.size===0?"disabled":""}>
            ${i.clearStats}
          </button>
        </div>
        ${this.persistentStats.size===0?`<div class="ag-empty-state">${i.emptyStats}</div>`:`<div class="ag-stats-list">
                ${t.map(s=>{const n=this.persistentStats.get(s)??{correct:0,total:0},o=n.total===0?0:n.correct/n.total;return`
                      <article class="ag-stat-row">
                        <div>
                          <strong>${s}</strong>
                          <span>${n.correct} / ${n.total}</span>
                        </div>
                        <div class="ag-progress"><span style="width:${o*100}%"></span></div>
                        <em>${h(o)}</em>
                      </article>
                    `}).join("")}
              </div>`}
      </section>
    `}bindEvents(){this.appRoot.querySelectorAll("[data-action]").forEach(t=>{const e=t.dataset.action;t.addEventListener("click",()=>{t instanceof HTMLButtonElement&&t.disabled||this.handleAction(e,t)})}),this.appRoot.querySelector('input[data-action="volume"]')?.addEventListener("input",t=>{const e=t.currentTarget;this.audioPlayer.setVolume(Number(e.value)/100)})}handleAction(t,e){switch(t){case"back":this.goBack();break;case"stats":this.openStats();break;case"select-mode":this.openSelection(e.dataset.mode);break;case"set-duration":this.timeAttackDuration=Number(e.dataset.duration)||60,this.render();break;case"select-all":this.selectedIds=new Set(d.map(l)),this.render();break;case"clear-selection":this.selectedIds.clear(),this.render();break;case"toggle-string":this.toggleString(e.dataset.string??"");break;case"toggle-note":this.toggleNote(e.dataset.noteId??"");break;case"start-training":this.startTraining();break;case"new-note":this.playNewNoteRequested();break;case"toggle-loop":this.loopEnabled=!this.loopEnabled,this.audioPlayer.setLooping(this.loopEnabled),this.render();break;case"answer":this.answer(e.dataset.note??"");break;case"reset-session":this.resetClassicStats(),this.feedback={kind:"info",text:i.sessionReset},this.render();break;case"play-again":this.resetTrainingState(),this.render();break;case"clear-stats":this.statsRepository.clearStats(),this.persistentStats=new Map,this.render();break}}goBack(){this.screen==="training"?(this.stopTraining(),this.screen="menu"):this.screen==="selection"?this.screen="menu":this.screen==="stats"&&(this.screen="menu"),this.render()}openStats(){this.stopTraining(),this.persistentStats=this.statsRepository.loadStats(),this.screen="stats",this.render()}openSelection(t){this.stopTraining(),this.mode=t,this.screen="selection",this.selectedIds.clear(),this.render()}toggleString(t){const e=d.filter(s=>s.stringName===t),r=e.every(s=>this.selectedIds.has(l(s)));e.forEach(s=>{const n=l(s);r?this.selectedIds.delete(n):this.selectedIds.add(n)}),this.render()}toggleNote(t){this.selectedIds.has(t)?this.selectedIds.delete(t):this.selectedIds.add(t),this.render()}startTraining(){this.activeNotes=d.filter(t=>this.selectedIds.has(l(t))),this.activeNotes.length!==0&&(this.resetTrainingState(),this.screen="training",this.feedback={kind:"info",text:i.pressNewNote},this.render())}resetTrainingState(){this.stopTimer(),this.selector.reset(),this.currentNote=null,this.soundPlaying=!1,this.audioPlayer.stop(),this.feedback={kind:"info",text:i.pressNewNote},this.mode==="classic"&&this.resetClassicStats(),this.mode==="timeAttack"&&(this.remainingTime=this.timeAttackDuration,this.timeAttackScore=0,this.timeAttackFinished=!1),this.mode==="survival"&&(this.remainingLives=3,this.survivalScore=0,this.survivalGameOver=!1)}resetClassicStats(){this.consecutiveHits=0,this.totalQuestionsAsked=0,this.totalCorrectAnswers=0,this.sessionStats.clear()}stopTraining(){this.stopTimer(),this.audioPlayer.stop(),this.soundPlaying=!1,this.currentNote=null,this.selector.reset()}async playNewNoteRequested(){if(this.activeNotes.length===0||this.timeAttackFinished||this.survivalGameOver)return;this.audioPlayer.stop(),this.soundPlaying=!1;const t=this.selector.getNextRandomNote(this.activeNotes);if(this.currentNote=t,this.feedback={kind:"info",text:i.whatNote},this.mode==="timeAttack"&&this.timerId===null&&this.startTimer(),this.render(),!t)return;const e=await this.audioPlayer.play(t.filePath,this.loopEnabled,()=>{this.loopEnabled||(this.soundPlaying=!1,this.render())});this.soundPlaying=e&&this.audioPlayer.isPlaying(),e||(this.feedback={kind:"incorrect",text:i.cannotLoad(t.noteName)}),this.render()}async answer(t){const e=this.currentNote;if(!e||this.timeAttackFinished||this.survivalGameOver)return;this.audioPlayer.stop(),this.soundPlaying=!1;const r=u(e.noteName)===t;r?(this.audioPlayer.play("acierto.mp3"),this.feedback={kind:"correct",text:i.correct(e.noteName)},this.applyCorrectAnswer()):(this.audioPlayer.play("error.mp3"),this.feedback={kind:"incorrect",text:i.incorrect(e.noteName)},this.applyIncorrectAnswer()),this.updateSessionStats(e.noteName,r),this.persistentStats=this.statsRepository.recordAnswer(e.noteName,r),this.survivalGameOver||(this.currentNote=null),this.render(),(this.mode==="timeAttack"&&!this.timeAttackFinished||this.mode==="survival"&&!this.survivalGameOver)&&window.setTimeout(()=>{this.playNewNoteRequested()},400)}applyCorrectAnswer(){this.mode==="classic"&&(this.totalQuestionsAsked+=1,this.totalCorrectAnswers+=1,this.consecutiveHits+=1),this.mode==="timeAttack"&&(this.timeAttackScore+=1),this.mode==="survival"&&(this.survivalScore+=1)}applyIncorrectAnswer(){this.mode==="classic"&&(this.totalQuestionsAsked+=1,this.consecutiveHits=0),this.mode==="survival"&&(this.remainingLives-=1,this.remainingLives<=0&&(this.remainingLives=0,this.survivalGameOver=!0,this.currentNote=null,this.feedback={kind:"incorrect",text:i.gameOverScore(this.survivalScore)}))}updateSessionStats(t,e){const r=this.sessionStats.get(t)??{correct:0,total:0};this.sessionStats.set(t,{correct:r.correct+(e?1:0),total:r.total+1})}startTimer(){this.stopTimer(),this.remainingTime=this.timeAttackDuration,this.timeAttackFinished=!1,this.timerId=window.setInterval(()=>{this.remainingTime-=1,this.remainingTime<=0?this.finishTimeAttack():this.render()},1e3)}finishTimeAttack(){this.stopTimer(),this.remainingTime=0,this.timeAttackFinished=!0,this.currentNote=null,this.soundPlaying=!1,this.audioPlayer.stop(),this.feedback={kind:"info",text:i.timeUpScore(this.timeAttackScore)},this.render()}stopTimer(){this.timerId!==null&&(window.clearInterval(this.timerId),this.timerId=null)}trainingTitle(){return this.mode==="timeAttack"?`${this.remainingTime||this.timeAttackDuration}s`:this.mode==="survival"?i.livesTitle(this.remainingLives):i.classicTitle}}function L(a){const t=new Map;return a.forEach(e=>{const r=t.get(e.stringName)??[];r.push(e),t.set(e.stringName,r)}),t}function h(a){return new Intl.NumberFormat(p==="es"?"es-MX":"en-US",{style:"percent",maximumFractionDigits:1}).format(a)}function I(){return new URLSearchParams(window.location.search).get("lang")?.toLowerCase().startsWith("en")?"en":"es"}function f(a){return a.replace(/&/g,"&amp;").replace(/"/g,"&quot;").replace(/</g,"&lt;")}new F(C);
