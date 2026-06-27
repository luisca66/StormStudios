(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const r of a)if(r.type==="childList")for(const o of r.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function s(a){const r={};return a.integrity&&(r.integrity=a.integrity),a.referrerPolicy&&(r.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?r.credentials="include":a.crossOrigin==="anonymous"?r.credentials="omit":r.credentials="same-origin",r}function n(a){if(a.ep)return;a.ep=!0;const r=s(a);fetch(a.href,r)}})();const P="https://pub-16e19eafae5742d9b4b9472f6e0faed8.r2.dev",E=.78,Y=3e3,V=.25,A="storm.intervalos.cantados.stats.v1",J=["Piano","Corno","Coro","Fagot","Cello"],B=["Piano","Corno","Coro","Fagot","Cello","random"];function W(t,e){return`${P}/${t}/${encodeURIComponent(e.replace(/b/g,"♭"))}.mp3`}function z(t){return`${P}/${t?"acierto":"error"}.mp3`}const g=[{id:"FIFTH",es:"Quinta Justa",en:"Perfect Fifth",abbr:"P5",degree:5,semitones:7},{id:"FOURTH",es:"Cuarta Justa",en:"Perfect Fourth",abbr:"P4",degree:4,semitones:5},{id:"THIRD_MAJOR",es:"Tercera Mayor",en:"Major Third",abbr:"M3",degree:3,semitones:4},{id:"THIRD_MINOR",es:"Tercera Menor",en:"Minor Third",abbr:"m3",degree:3,semitones:3},{id:"SECOND_MAJOR",es:"Segunda Mayor",en:"Major Second",abbr:"M2",degree:2,semitones:2},{id:"SECOND_MINOR",es:"Segunda Menor",en:"Minor Second",abbr:"m2",degree:2,semitones:1},{id:"SIXTH_MAJOR",es:"Sexta Mayor",en:"Major Sixth",abbr:"M6",degree:6,semitones:9},{id:"SIXTH_MINOR",es:"Sexta Menor",en:"Minor Sixth",abbr:"m6",degree:6,semitones:8},{id:"SEVENTH_MAJOR",es:"Septima Mayor",en:"Major Seventh",abbr:"M7",degree:7,semitones:11},{id:"SEVENTH_MINOR",es:"Septima Menor",en:"Minor Seventh",abbr:"m7",degree:7,semitones:10},{id:"FOURTH_AUGMENTED",es:"Cuarta Aumentada",en:"Augmented Fourth",abbr:"A4",degree:4,semitones:6}],N=Object.fromEntries(g.map(t=>[t.id,t])),L=["C","D","E","F","G","A","B"],U={C:0,D:2,E:4,F:5,G:7,A:9,B:11},X=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],Z=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"],F=["G2","Ab2","G#2","A2","A#2","Bb2","B2","Cb3","B#2","C3","C#3","Db3","D3","D#3","Eb3","E3","Fb3","F3","E#3","F#3","Gb3"],ee=F.map(t=>oe(t,1));function k(t){const e=t[0]?.toUpperCase()??"C";let s="",n="";for(const r of t.slice(1))r>="0"&&r<="9"?n+=r:s+=r;let a=0;for(const r of s)(r==="#"||r==="♯")&&(a+=1),(r==="b"||r==="♭")&&(a-=1);return{letter:e,accidentalText:s,accidental:a,octave:Number(n||4)}}function H(t){const e=k(t);return(e.octave+1)*12+U[e.letter]+e.accidental}function te(t,e=!1){const s=Math.floor(t/12)-1;return`${(e?Z:X)[y(t,12)]}${s}`}function se(t){return t.replace(/\d/g,"").replace(/b/g,"♭")}function x(t){return t.replace(/\d/g,"").replace(/♯/g,"#").replace(/♭/g,"b").toUpperCase()}function ne(t,e,s){const n=k(t),a=L.indexOf(n.letter),r=s==="asc"?1:-1,o=H(t)+r*e.semitones,i=n.octave*7+a+r*(e.degree-1),c=L[y(i,7)],l=Math.floor(i/7),m=o-ce(c,l);return`${c}${le(m)}${l}`}function v(t){return t==="asc"?F:ee}function $(t,e,s){return{interval:t,direction:e,startNote:s,expected:ne(s,t,e),statKey:`${t.id}:${e}`}}function ae(t){return t<=0?0:69+12*Math.log2(t/440)}function re(t,e,s){if(t.length===0)return{pitchCorrect:!1,noteClassCorrect:!1,detectedName:null};const n=new Map;for(const u of t){const p=ae(u);if(p<=0)continue;const M=Math.round(p),I=n.get(M)??[];I.push(p),n.set(M,I)}let a=null,r=[];for(const[u,p]of n)p.length>r.length&&(a=u,r=p);if(a===null)return{pitchCorrect:!1,noteClassCorrect:!1,detectedName:null};const o=r.reduce((u,p)=>u+p,0)/r.length,i=Math.round(o),c=Math.abs(o-i),l=H(e),m=y(i,12)===y(l,12),h=e.includes("b")||e.includes("♭");return{pitchCorrect:m&&c<s,noteClassCorrect:m,detectedName:te(i,h),deviation:c}}function ie(t,e=Math.random){const s=[...t];for(let n=s.length-1;n>0;n-=1){const a=Math.floor(e()*(n+1));[s[n],s[a]]=[s[a],s[n]]}return s}function f(t,e=Math.random){return t[Math.floor(e()*t.length)]}function oe(t,e){const s=k(t);return`${s.letter}${s.accidentalText}${s.octave+e}`}function ce(t,e){return(e+1)*12+U[t]}function le(t){return t===0?"":t>0?"#".repeat(t):"b".repeat(Math.abs(t))}function y(t,e){return(t%e+e)%e}class de{ctx=null;active=[];audioCache=new Map;context(){if(!this.ctx){const e=window.AudioContext??window.webkitAudioContext;if(!e)throw new Error("audio-context-unavailable");this.ctx=new e}return this.ctx}async unlock(){const e=this.context();e.state==="suspended"&&await e.resume()}stopAll(){for(const e of this.active)try{e.pause(),e.currentTime=0}catch{}this.active=[]}async playNote(e,s,n=E){const a=this.resolveTimbre(s);await this.playUrl(W(a,e),n,!0)}async playFeedback(e,s=E){await this.playUrl(z(e),s*.82,!1)}resolveTimbre(e){return e==="random"?f([...J]):e}async playUrl(e,s,n){n&&this.stopAll();let a=this.audioCache.get(e);a||(a=new Audio(e),a.preload="auto",this.audioCache.set(e,a));const r=a.cloneNode(!0);r.volume=Math.max(0,Math.min(1,s)),r.currentTime=0,r.addEventListener("ended",()=>{this.active=this.active.filter(o=>o!==r)},{once:!0}),this.active.push(r);try{await r.play()}catch(o){this.active=this.active.filter(i=>i!==r),console.warn("[audio] playback blocked or failed",e,o)}}}class ue extends Error{constructor(){super("microphone-denied"),this.name="MicDeniedError"}}class _ extends Error{constructor(){super("microphone-unsupported"),this.name="MicUnsupportedError"}}class he{constructor(e){this.ctx=e}stream=null;source=null;worklet=null;sink=null;collecting=!1;collected=[];async ensureReady(){if(!this.worklet){if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new _;try{this.stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1}})}catch{throw new ue}await this.ctx.audioWorklet.addModule("/apps/intervalos-cantados/pitch-processor.js"),this.source=this.ctx.createMediaStreamSource(this.stream),this.worklet=new AudioWorkletNode(this.ctx,"pitch-processor"),this.worklet.port.onmessage=e=>{this.collecting&&e.data>0&&this.collected.push(e.data)},this.sink=this.ctx.createGain(),this.sink.gain.value=0,this.source.connect(this.worklet),this.worklet.connect(this.sink).connect(this.ctx.destination)}}async listen(e){return await this.ensureReady(),this.ctx.state==="suspended"&&await this.ctx.resume(),this.collected=[],this.collecting=!0,await new Promise(s=>setTimeout(s,e)),this.collecting=!1,[...this.collected]}dispose(){this.collecting=!1;try{this.source?.disconnect(),this.worklet?.disconnect(),this.sink?.disconnect()}catch{}this.stream?.getTracks().forEach(e=>e.stop()),this.stream=null,this.source=null,this.worklet=null,this.sink=null}}function pe(){return new URLSearchParams(window.location.search).get("lang")==="en"?"en":"es"}function me(t){const e=new URL(window.location.href);e.searchParams.set("lang",t),window.location.href=e.toString()}const S={es:{appName:"Intervalos Cantados",appSub:"Entrenamiento vocal de intervalos",appLine:"Escucha la nota inicial, nombra la llegada y cántala con precisión.",chooseMode:"Elige modo",classic:"Entrenamiento clásico",classicShort:"Clásico",classicSub:"Ritmo libre para estudiar con calma y revisar cada respuesta.",time:"Modo contrarreloj",timeShort:"Contrarreloj",timeSub:"Series rápidas para empujar reflejos auditivos bajo presión.",survival:"Modo vidas",survivalShort:"Vidas",survivalSub:"Tres errores y termina: sesiones cortas de concentración total.",stats:"Estadísticas",statsSub:"Precisión local por intervalo y dirección.",setup:"Configuración",back:"Volver",mode:"Modo",practice:"Qué practicar",nomenclature:"Solo nomenclatura",hybrid:"Afinación + nomenclatura",instrument:"Instrumento",randomInstrument:"Aleatorio",interval:"Intervalo",allIntervals:"Aleatorio - todos los intervalos",start:"Comenzar",new:"Nueva",hearNote:"Oír nota",pressNew:"Presiona Nueva para comenzar.",writeFirst:"Escribe la nota primero.",makeQuestionFirst:"Primero genera una pregunta.",micBlocked:"No pude abrir el micrófono. Revisa el permiso del navegador.",micUnsupported:"El micrófono requiere localhost o HTTPS.",singing:"Cantando...",ok:"OK",record:"Grabar",delete:"Borrar",menu:"Menú",playAgain:"Jugar de nuevo",timesUp:"Tiempo agotado",livesDone:"Vidas agotadas",finalScore:"Puntaje final",points:"puntos",score:"Pts",timeLeft:"T",noStats:"Sin datos todavía. Completa sesiones para ver tu progreso.",clearStats:"Borrar datos",confirmClear:"¿Seguro? Esto no se puede deshacer.",cancel:"Cancelar",clear:"Borrar",overall:"Precisión",correctOf:"aciertos de",asc:"ascendente",desc:"descendente",ascShort:"Asc",descShort:"Desc",nothing:"Nada",perfectName:t=>`¡Perfecto! Es ${t}.`,wrongName:t=>`Incorrecto. Era ${t}.`,perfectHybrid:"¡Perfecto! Teoría y afinación correctas.",tunedButNoName:(t,e)=>`Incorrecto. Era ${t}, cantaste ${e}.`,nameButLoose:"Nombre correcto, nota cantada un poco desafinada.",nameButOther:t=>`Nombre correcto, pero cantaste otra nota (${t}).`,nameButNoPitch:"Nombre correcto, pero no pude detectar una nota clara."},en:{appName:"Sung Intervals",appSub:"Vocal interval training",appLine:"Hear the starting note, name the target, and sing it accurately.",chooseMode:"Choose mode",classic:"Classic training",classicShort:"Classic",classicSub:"Free pace for careful study and review after each answer.",time:"Time attack",timeShort:"Time attack",timeSub:"Fast rounds to push your ear reflexes under pressure.",survival:"Lives mode",survivalShort:"Lives",survivalSub:"Three mistakes and the round ends: short, focused sessions.",stats:"Statistics",statsSub:"Local accuracy by interval and direction.",setup:"Setup",back:"Back",mode:"Mode",practice:"What to practice",nomenclature:"Nomenclature only",hybrid:"Pitch + nomenclature",instrument:"Instrument",randomInstrument:"Random",interval:"Interval",allIntervals:"Random - all intervals",start:"Start",new:"New",hearNote:"Hear note",pressNew:"Press New to begin",writeFirst:"Write the note first.",makeQuestionFirst:"Generate a question first.",micBlocked:"I could not open the microphone. Check the browser permission.",micUnsupported:"The microphone needs localhost or HTTPS.",singing:"Singing...",ok:"OK",record:"Record",delete:"Delete",menu:"Menu",playAgain:"Play again",timesUp:"Time is up",livesDone:"Out of lives",finalScore:"Final score",points:"points",score:"Pts",timeLeft:"T",noStats:"No data yet. Complete sessions to see your progress.",clearStats:"Clear data",confirmClear:"Are you sure? This cannot be undone.",cancel:"Cancel",clear:"Clear",overall:"Accuracy",correctOf:"correct of",asc:"ascending",desc:"descending",ascShort:"Asc",descShort:"Desc",nothing:"Nothing",perfectName:t=>`Perfect! It is ${t}.`,wrongName:t=>`Incorrect. It was ${t}.`,perfectHybrid:"Perfect! Theory and pitch are both correct.",tunedButNoName:(t,e)=>`Incorrect. It was ${t}; you sang ${e}.`,nameButLoose:"Name correct, but the sung note was slightly out of tune.",nameButOther:t=>`Name correct, but you sang another note (${t}).`,nameButNoPitch:"Name correct, but I could not detect a clear note."}};function d(t){return S[t]}class fe{getStats(){try{return JSON.parse(localStorage.getItem(A)||"{}")}catch{return{}}}record(e,s){const n=this.getStats(),a=n[e]??{correct:0,total:0};n[e]={correct:a.correct+(s?1:0),total:a.total+1},this.save(n)}clear(){this.save({})}save(e){try{localStorage.setItem(A,JSON.stringify(e))}catch{}}}class be{constructor(e,s,n){this.lang=e,this.audio=s,this.mic=n,this.t=d(e),this.state={lang:e,screen:"menu",selectedMode:"classic",selectedDuration:60,trainingType:"HYBRID",selectedInstrument:"Piano",selectedIntervalId:null,session:null,current:null,answer:"",result:"",resultKind:"",flash:"none",processing:!1,recording:!1,confirmClear:!1,stats:this.statsRepository.getStats()}}intervals=g;instruments=B;t;statsRepository=new fe;listeners=new Set;questionPools={};askedSet=new Set;timerId=null;autoNextTimer=null;state;getState(){return this.state}subscribe(e){return this.listeners.add(e),e(this.state),()=>this.listeners.delete(e)}modeLabel(e){return e==="classic"?this.t.classicShort:e==="time"?this.t.timeShort:this.t.survivalShort}intervalLabel(e){return e[this.lang]}instrumentLabel(e){return e==="random"?this.t.randomInstrument:this.lang==="en"?{Piano:"Piano",Corno:"Horn",Coro:"Choir",Fagot:"Bassoon",Cello:"Cello"}[e]:e}setDuration(e){this.patch({selectedDuration:e})}openMode(e){this.clearTimers(),this.audio.stopAll(),this.patch({screen:"setup",selectedMode:e,session:null,current:null})}openMenu(){this.clearTimers(),this.audio.stopAll(),this.patch({screen:"menu",session:null,current:null,confirmClear:!1})}openSetup(){this.clearTimers(),this.audio.stopAll(),this.patch({screen:"setup",session:null,current:null})}openStats(){this.clearTimers(),this.audio.stopAll(),this.patch({screen:"stats",session:null,current:null,stats:this.statsRepository.getStats()})}setTrainingType(e){this.patch({trainingType:e})}setInstrument(e){this.patch({selectedInstrument:e})}startTraining(e){this.clearTimers(),this.resetQuestionMemory(),this.patch({screen:"training",selectedIntervalId:e===""?null:e,session:this.createSession(this.state.selectedMode),current:null,answer:"",result:"",resultKind:"",flash:"none",processing:!1,recording:!1}),this.audio.unlock().catch(()=>{}),this.newQuestion()}newQuestion(){const e=this.state.session;if(!e||e.ended||this.state.processing||this.state.recording)return;this.clearAutoNext();const s=this.generateQuestion(),n=e.mode==="classic"?{...e,classicQuestions:e.classicQuestions+1}:e;this.patch({session:n,current:s,answer:"",result:"",resultKind:"",flash:"none"}),this.startTimerIfNeeded(),this.state.trainingType==="HYBRID"&&this.audio.playNote(s.startNote,this.state.selectedInstrument).catch(()=>{})}repeatStartNote(){!this.state.current||this.state.trainingType!=="HYBRID"||this.state.processing||this.state.recording||this.audio.playNote(this.state.current.startNote,this.state.selectedInstrument).catch(()=>{})}inputNoteKey(e){if(!(this.state.processing||this.state.recording||this.state.session?.ended)){if(/^[A-G]$/.test(e)){const s=this.state.answer.replace(/[A-G]/gi,"");this.patch({answer:`${e}${s}`.slice(0,3),result:"",resultKind:""});return}if(this.state.answer.match(/[A-G]/i)){const s=this.state.answer.match(/[A-G]/i)?.[0].toUpperCase()??"";this.patch({answer:`${s}${e}`,result:"",resultKind:""})}}}deleteNoteKey(){this.state.processing||this.state.recording||this.state.session?.ended||this.patch({answer:this.state.answer.slice(0,-1)})}async submitAnswer(){if(!(this.state.processing||this.state.recording||this.state.session?.ended)){if(!this.state.current){this.patch({result:this.t.makeQuestionFirst,resultKind:"warn"});return}if(!this.state.answer){this.patch({result:this.t.writeFirst,resultKind:"warn"});return}if(this.patch({processing:!0}),this.state.trainingType==="NOMENCLATURE_ONLY"){this.evaluateAnswer(null);return}try{await this.audio.unlock(),this.patch({recording:!0,result:this.t.singing,resultKind:""});const e=await this.mic.listen(Y);if(!this.state.session||this.state.session.ended)return;this.patch({recording:!1}),this.evaluateAnswer(e)}catch(e){this.patch({processing:!1,recording:!1,result:e instanceof _?this.t.micUnsupported:this.t.micBlocked,resultKind:"bad"})}}}askClearStats(){this.patch({confirmClear:!0})}cancelClearStats(){this.patch({confirmClear:!1})}clearStats(){this.statsRepository.clear(),this.patch({stats:{},confirmClear:!1})}dispose(){this.clearTimers(),this.mic.dispose(),this.audio.stopAll()}evaluateAnswer(e){const s=this.state.current;if(!s||!this.state.session||this.state.session.ended)return;const n=x(s.expected)===x(this.state.answer),a=this.t.nothing;let r=!1,o=!1,i=a;if(this.state.trainingType!=="NOMENCLATURE_ONLY"){const u=re(e??[],s.expected,V);r=u.pitchCorrect,o=u.noteClassCorrect,i=u.detectedName??a}const c=this.state.trainingType==="NOMENCLATURE_ONLY"?n:n&&r,l=this.resultMessage(c,n,o,i,s.expected),m=c?"ok":n&&this.state.trainingType==="HYBRID"?"warn":"bad";this.statsRepository.record(s.statKey,c);const h=this.applyScore(c);this.patch({session:h,stats:this.statsRepository.getStats(),result:l,resultKind:m,flash:c?"correct":"wrong",processing:!1,recording:!1}),this.audio.playFeedback(c).catch(()=>{}),!(!h||h.ended)&&(h.mode==="survival"&&h.lives<=0?this.autoNextTimer=window.setTimeout(()=>this.endSession("lives"),1400):h.mode!=="classic"&&(this.autoNextTimer=window.setTimeout(()=>{this.autoNextTimer=null,this.newQuestion()},1800)))}resultMessage(e,s,n,a,r){return this.state.trainingType==="NOMENCLATURE_ONLY"?e?this.t.perfectName(r):this.t.wrongName(r):e?this.t.perfectHybrid:s&&n?this.t.nameButLoose:s&&a===this.t.nothing?this.t.nameButNoPitch:s?this.t.nameButOther(a):this.t.tunedButNoName(r,a)}applyScore(e){const s=this.state.session;return s?e&&s.mode==="time"?{...s,timeScore:s.timeScore+1}:e&&s.mode==="survival"?{...s,survivalScore:s.survivalScore+1}:!e&&s.mode==="classic"?{...s,classicErrors:s.classicErrors+1}:!e&&s.mode==="survival"?{...s,lives:s.lives-1}:s:null}createSession(e){return{mode:e,remainingTime:this.state.selectedDuration,lives:3,timeScore:0,survivalScore:0,classicQuestions:0,classicErrors:0,ended:!1,endReason:null}}generateQuestion(){if(this.state.selectedIntervalId){const n=N[this.state.selectedIntervalId],a=Math.random()<.5?"asc":"desc",r=this.nextStartFromPool(n.id,a);return $(n,a,r)}let e=null;for(let n=0;n<1e3&&!e;n+=1){const a=f(g),r=Math.random()<.5?"asc":"desc",o=f(v(r)),i=`${a.id}:${r}:${o}`;this.askedSet.has(i)||(this.askedSet.add(i),e=$(a,r,o))}if(e)return e;this.askedSet.clear();const s=f(g);return $(s,"asc",f(v("asc")))}nextStartFromPool(e,s){const n=`${e}:${s}`;return(!this.questionPools[n]||this.questionPools[n]?.length===0)&&(this.questionPools[n]=ie(v(s))),this.questionPools[n]?.pop()??f(v(s))}startTimerIfNeeded(){const e=this.state.session;!e||e.mode!=="time"||this.timerId!==null||e.ended||(this.timerId=window.setInterval(()=>{const s=this.state.session;if(!s||s.ended)return;const n=s.remainingTime-1;n<=0?(this.patch({session:{...s,remainingTime:0}}),this.endSession("timeout")):this.patch({session:{...s,remainingTime:n}})},1e3))}endSession(e){const s=this.state.session;s&&(this.clearTimers(),this.audio.stopAll(),this.patch({session:{...s,ended:!0,endReason:e},processing:!1,recording:!1,result:"",flash:"none"}))}resetQuestionMemory(){this.questionPools={},this.askedSet=new Set}clearTimers(){this.timerId!==null&&(window.clearInterval(this.timerId),this.timerId=null),this.clearAutoNext()}clearAutoNext(){this.autoNextTimer!==null&&(window.clearTimeout(this.autoNextTimer),this.autoNextTimer=null)}patch(e){this.state={...this.state,...e};for(const s of this.listeners)s(this.state)}}const ve=["C","D","E","F","G","A","B"],ge=["♭","♭♭","#","##"];function ye(t,e){const s=d(e.lang);e.subscribe(n=>{t.innerHTML=$e(n,e)}),t.addEventListener("click",n=>{const a=n.target.closest("[data-action]");!a||D(a)||R(a,e)}),t.addEventListener("keydown",n=>{if(n.key!=="Enter"&&n.key!==" ")return;const a=n.target.closest('[role="button"][data-action]');!a||D(a)||(n.preventDefault(),R(a,e))}),window.addEventListener("beforeunload",()=>e.dispose()),window.isSecureContext||console.info(s.micUnsupported)}function R(t,e){switch(t.dataset.action){case"language":me(t.dataset.lang??"es");break;case"duration":e.setDuration(Number(t.dataset.duration));break;case"mode":e.openMode(t.dataset.mode??"classic");break;case"stats":e.openStats();break;case"menu":e.openMenu();break;case"setup":e.openSetup();break;case"training-type":e.setTrainingType(t.dataset.trainingType??"HYBRID");break;case"instrument":e.setInstrument(t.dataset.instrument??"Piano");break;case"start-interval":e.startTraining(t.dataset.interval??"");break;case"new-question":e.newQuestion();break;case"repeat-start":e.repeatStartNote();break;case"note-key":e.inputNoteKey(t.dataset.key??"");break;case"delete-key":e.deleteNoteKey();break;case"submit-answer":e.submitAnswer();break;case"replay":e.startTraining(e.getState().selectedIntervalId??"");break;case"ask-clear":e.askClearStats();break;case"cancel-clear":e.cancelClearStats();break;case"clear-stats":e.clearStats();break}}function $e(t,e){return t.screen==="setup"?we(t,e):t.screen==="training"?Se(t,e):t.screen==="stats"?Ne(t,e):G(t)}function G(t){const e=d(t.lang);return`
    <main class="screen">
      <header class="topline">
        <div class="brand">
          ${xe()}
          <div>
            <div class="eyebrow">${e.appSub}</div>
            <h1 class="title">${e.appName}</h1>
            <p class="subtitle">${e.appLine}</p>
          </div>
        </div>
        ${C(t.lang)}
      </header>

      <section class="mode-list" aria-label="${e.chooseMode}">
        <h2 class="screen-title">${e.chooseMode}</h2>
        ${s("classic",e.classic,e.classicSub)}
        ${s("time",e.time,e.timeSub,n(t))}
        ${s("survival",e.survival,e.survivalSub)}
        <div class="mode-card stats-button" role="button" tabindex="0" data-action="stats" style="--mode-color:var(--mint)">
          <span class="accent-bar" aria-hidden="true"></span>
          <span class="mode-icon" aria-hidden="true">ST</span>
          <span class="mode-body">
            <span class="mode-title">${e.stats}</span>
            <span class="mode-subtitle">${e.statsSub}</span>
          </span>
          <span class="mode-arrow" aria-hidden="true">›</span>
        </div>
      </section>
    </main>
  `;function s(a,r,o,i=""){return`
      <div class="mode-card" role="button" tabindex="0" data-action="mode" data-mode="${a}" style="--mode-color:${K(a)}">
        <span class="accent-bar" aria-hidden="true"></span>
        <span class="mode-icon" aria-hidden="true">${Re(a)}</span>
        <span class="mode-body">
          <span class="mode-title">${r}</span>
          <span class="mode-subtitle">${o}</span>
          ${i?`<span class="mode-extra">${i}</span>`:""}
        </span>
        <span class="mode-arrow" aria-hidden="true">›</span>
      </div>
    `}function n(a){return`
      <span class="duration-row">
        ${[60,90,120].map(r=>`
          <button class="pill ${a.selectedDuration===r?"on":""}" type="button"
            data-action="duration" data-duration="${r}">${r}s</button>
        `).join("")}
      </span>
    `}}function we(t,e){const s=d(t.lang);return`
    <main class="screen">
      <header class="header-row">
        <button class="back-button" type="button" data-action="menu">‹ ${s.back}</button>
        <div>
          <div class="eyebrow">${s.mode}</div>
          <h1 class="screen-title">${e.modeLabel(t.selectedMode)}</h1>
        </div>
        ${C(t.lang)}
      </header>

      <section class="setup-list">
        <div class="setup-section">
          <span class="section-label">${s.practice}</span>
          <div class="segmented">
            ${O(t,"HYBRID",s.hybrid)}
            ${O(t,"NOMENCLATURE_ONLY",s.nomenclature)}
          </div>
        </div>

        <div class="setup-section">
          <span class="section-label">${s.instrument}</span>
          <div class="chip-row">
            ${B.map(n=>`
              <button class="chip ${t.selectedInstrument===n?"on":""}" type="button"
                data-action="instrument" data-instrument="${n}">${e.instrumentLabel(n)}</button>
            `).join("")}
          </div>
        </div>

        <div class="setup-section">
          <span class="section-label">${s.interval}</span>
          <div class="interval-list">
            ${e.intervals.map(n=>Ie(e,n)).join("")}
            <button class="interval-row" type="button" data-action="start-interval" data-interval="">
              <span>${s.allIntervals}</span>
              <span class="abbr">ALL</span>
            </button>
          </div>
        </div>
      </section>
    </main>
  `}function Se(t,e){const s=d(t.lang),n=t.session;if(!n)return G(t);const a=K(n.mode);return n.ended?Te(t,e,a):`
    <main class="screen" style="--active-color:${a}">
      <header class="toolbar">
        <button class="back-button" type="button" data-action="setup">‹ ${s.back}</button>
        <div>
          <div class="eyebrow">${e.modeLabel(n.mode)}</div>
          <h1 class="screen-title">${t.selectedIntervalId?e.intervalLabel(N[t.selectedIntervalId]):s.allIntervals}</h1>
        </div>
        <div class="hud">${ke(t)}</div>
      </header>

      ${t.trainingType==="HYBRID"&&!window.isSecureContext?`
        <div class="training-panel feedback warn">${s.micUnsupported}</div>
      `:""}

      <section class="training-main">
        <div class="training-panel question-card">
          ${Ce(t,e)}
        </div>

        <div class="training-panel answer-display">
          <span class="answer-note ${t.answer?"":"empty"}">${t.answer.replace(/b/g,"♭")||"—"}</span>
        </div>

        <div class="feedback ${t.resultKind}">
          ${t.recording?Le(s.singing):t.result.replace(/b/g,"♭")||"&nbsp;"}
        </div>

        <div class="button-row">
          <button class="secondary-button" type="button" data-action="new-question" ${T(t)?"disabled":""}>${s.new}</button>
          <button class="secondary-button" type="button" data-action="repeat-start"
            ${t.trainingType!=="HYBRID"||!t.current||T(t)?"disabled":""}>
            ${s.hearNote}
          </button>
        </div>
      </section>

      ${Me(t)}
    </main>
  `}function Te(t,e,s){const n=d(t.lang),a=t.session;if(!a)return"";const r=a.mode==="time"?a.timeScore:a.survivalScore;return`
    <main class="screen" style="--active-color:${s}">
      <section class="game-over">
        <div class="eyebrow">${e.modeLabel(a.mode)}</div>
        <h1 class="screen-title">${a.endReason==="timeout"?n.timesUp:n.livesDone}</h1>
        <div class="game-over-score">${r}</div>
        <p class="small-muted">${n.finalScore} · ${n.points}</p>
        <div class="button-row" style="justify-content:center;margin-top:8px">
          <button class="secondary-button" type="button" data-action="setup">${n.setup}</button>
          <button class="primary-button" style="width:auto;min-width:170px" type="button" data-action="replay">${n.playAgain}</button>
        </div>
      </section>
    </main>
  `}function Ne(t,e){const s=d(t.lang),n=Object.entries(t.stats).filter(([,i])=>i.total>0).sort(([,i],[,c])=>i.correct/i.total-c.correct/c.total),a=n.reduce((i,[,c])=>i+c.total,0),r=n.reduce((i,[,c])=>i+c.correct,0),o=a>0?Math.round(r/a*100):null;return`
    <main class="screen">
      <header class="header-row">
        <button class="back-button" type="button" data-action="menu">‹ ${s.back}</button>
        <h1 class="screen-title">${s.stats}</h1>
        ${C(t.lang)}
      </header>

      <section class="stats-list">
        ${o===null?`<div class="empty-state">${s.noStats}</div>`:`
          <div class="stats-card">
            <div class="stat-top">
              <div>
                <span class="section-label">${s.overall}</span>
                <strong class="screen-title">${o}%</strong>
              </div>
              <span class="stat-count">${r} / ${a}</span>
            </div>
            <div class="track"><div class="fill" style="--pct:${o}%;--bar-color:${w(o)}"></div></div>
          </div>
          ${n.map(([i,c])=>{const l=Math.round(c.correct/c.total*100);return`
              <div class="stats-card">
                <div class="stat-top">
                  <div>
                    <div class="stat-name">${Ee(i,t,e)}</div>
                    <div class="stat-count">${c.correct} ${s.correctOf} ${c.total}</div>
                  </div>
                  <div class="stat-pct" style="color:${w(l)}">${l}%</div>
                </div>
                <div class="track"><div class="fill" style="--pct:${l}%;--bar-color:${w(l)}"></div></div>
              </div>
            `}).join("")}
          ${t.confirmClear?Ae(t.lang):`<button class="danger-button" type="button" data-action="ask-clear">${s.clearStats}</button>`}
        `}
      </section>
    </main>
  `}function ke(t){const e=d(t.lang),s=t.session;return s?s.mode==="classic"?`
      ${b("P",s.classicQuestions,"var(--aqua)")}
      ${b("E",s.classicErrors,"var(--rose)")}
    `:s.mode==="time"?`
      ${b(e.timeLeft,`${s.remainingTime}s`,s.remainingTime<10?"var(--rose)":"var(--gold)")}
      ${b(e.score,s.timeScore,"var(--gold)")}
    `:`
    <span class="hud-chip" style="--hud-color:var(--rose)">
      <span class="hud-label">VID</span>
      <span class="hearts">${[0,1,2].map(n=>`<span class="${n>=s.lives?"lost":""}">♥</span>`).join("")}</span>
    </span>
    ${b(e.score,s.survivalScore,"var(--rose)")}
  `:""}function Ce(t,e){const s=d(t.lang);if(!t.current)return`<div class="small-muted">${s.pressNew}</div>`;const n=t.current;return`
    <div class="question-label">
      ${e.intervalLabel(n.interval)} · ${n.direction==="asc"?s.asc:s.desc}
    </div>
    <div class="note-row">
      <span class="note-box">${se(n.startNote)}</span>
      <span class="direction">
        <span class="arrow">${n.direction==="asc"?"→":"←"}</span>
        <span class="abbr">${n.interval.abbr}</span>
      </span>
      <span class="note-box empty ${t.flash==="correct"?"correct":""} ${t.flash==="wrong"?"wrong":""}">?</span>
    </div>
  `}function Me(t){const e=d(t.lang),s=T(t)||!!t.session?.ended,n=t.recording?"...":t.trainingType==="HYBRID"?e.record:e.ok;return`
    <section class="keyboard-panel">
      <div class="key-row naturals">
        ${ve.map(a=>`<button class="key white" type="button" data-action="note-key" data-key="${a}" ${s?"disabled":""}>${a}</button>`).join("")}
      </div>
      <div class="key-row actions">
        ${ge.map(a=>`<button class="key black" type="button" data-action="note-key" data-key="${a}" ${s?"disabled":""}>${a}</button>`).join("")}
        <button class="action-key" style="--action-color:var(--rose)" type="button" data-action="delete-key" ${s?"disabled":""} aria-label="${e.delete}">⌫</button>
        <button class="action-key submit ${t.recording?"recording":""}" type="button" data-action="submit-answer"
          ${s||!t.answer?"disabled":""}>${n}</button>
      </div>
    </section>
  `}function O(t,e,s){return`
    <button class="chip ${t.trainingType===e?"on":""}" type="button"
      data-action="training-type" data-training-type="${e}">${s}</button>
  `}function Ie(t,e){return`
    <button class="interval-row" type="button" data-action="start-interval" data-interval="${e.id}">
      <span>${t.intervalLabel(e)}</span>
      <span class="abbr">${e.abbr}</span>
    </button>
  `}function Ee(t,e,s){const[n,a]=t.split(":"),r=N[n];return r?`${s.intervalLabel(r)} ${a==="asc"?S[e.lang].ascShort:S[e.lang].descShort}`:t}function C(t){return`
    <div class="language-switch" aria-label="Language">
      <button class="lang-button ${t==="es"?"on":""}" type="button" data-action="language" data-lang="es">ES</button>
      <button class="lang-button ${t==="en"?"on":""}" type="button" data-action="language" data-lang="en">EN</button>
    </div>
  `}function Ae(t){const e=d(t);return`
    <div class="confirm-panel">
      <p class="small-muted">${e.confirmClear}</p>
      <div class="confirm-row" style="margin-top:10px">
        <button class="secondary-button" type="button" data-action="cancel-clear">${e.cancel}</button>
        <button class="danger-button" type="button" data-action="clear-stats">${e.clear}</button>
      </div>
    </div>
  `}function Le(t){return`
    <span class="recording-bars" aria-label="${t}">
      <span></span><span></span><span></span><span></span>
    </span>
    <span>${t}</span>
  `}function b(t,e,s){return`
    <span class="hud-chip" style="--hud-color:${s}">
      <span class="hud-label">${t}</span>
      <span class="hud-value">${e}</span>
    </span>
  `}function xe(){return`
    <span class="mark" aria-hidden="true">
      <svg viewBox="0 0 80 80" role="img">
        <circle cx="40" cy="40" r="33" fill="none" stroke="rgba(103,214,255,0.28)" stroke-width="2" />
        <path d="M18 46 C25 20 32 60 40 34 C48 8 55 58 63 30" fill="none" stroke="#67d6ff" stroke-width="5" stroke-linecap="round" />
        <circle cx="24" cy="44" r="4" fill="#7af0c9" />
        <circle cx="55" cy="38" r="4" fill="#f2b661" />
      </svg>
    </span>
  `}function Re(t){return t==="classic"?"CL":t==="time"?"60":"03"}function K(t){return t==="classic"?"var(--aqua)":t==="time"?"var(--gold)":"var(--rose)"}function w(t){return t>=80?"var(--mint)":t>=50?"var(--gold)":"var(--rose)"}function D(t){return t instanceof HTMLButtonElement&&t.disabled}function T(t){return t.processing||t.recording}const j=pe();document.documentElement.lang=j;const Q=document.getElementById("app");if(!Q)throw new Error("No se encontro el contenedor #app");const q=new de,Oe=new he(q.context()),De=new be(j,q,Oe);ye(Q,De);
