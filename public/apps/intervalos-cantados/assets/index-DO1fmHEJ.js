(function(){const e=document.createElement("link").relList;if(e&&e.supports&&e.supports("modulepreload"))return;for(const a of document.querySelectorAll('link[rel="modulepreload"]'))n(a);new MutationObserver(a=>{for(const i of a)if(i.type==="childList")for(const o of i.addedNodes)o.tagName==="LINK"&&o.rel==="modulepreload"&&n(o)}).observe(document,{childList:!0,subtree:!0});function s(a){const i={};return a.integrity&&(i.integrity=a.integrity),a.referrerPolicy&&(i.referrerPolicy=a.referrerPolicy),a.crossOrigin==="use-credentials"?i.credentials="include":a.crossOrigin==="anonymous"?i.credentials="omit":i.credentials="same-origin",i}function n(a){if(a.ep)return;a.ep=!0;const i=s(a);fetch(a.href,i)}})();const P="https://samples.stormstudios.com.mx",I=.78,Y=3e3,z=.25,A="storm.intervalos.cantados.stats.v1",V=["Piano","Corno","Coro","Fagot","Cello"],B=["Piano","Corno","Coro","Fagot","Cello","random"];function J(t,e){return`${P}/${t}/${encodeURIComponent(e.replace(/b/g,"♭"))}.mp3`}function W(t){return`${P}/${t?"acierto":"error"}.mp3`}const v=[{id:"FIFTH",es:"Quinta Justa",en:"Perfect Fifth",abbr:"P5",degree:5,semitones:7},{id:"FOURTH",es:"Cuarta Justa",en:"Perfect Fourth",abbr:"P4",degree:4,semitones:5},{id:"THIRD_MAJOR",es:"Tercera Mayor",en:"Major Third",abbr:"M3",degree:3,semitones:4},{id:"THIRD_MINOR",es:"Tercera Menor",en:"Minor Third",abbr:"m3",degree:3,semitones:3},{id:"SECOND_MAJOR",es:"Segunda Mayor",en:"Major Second",abbr:"M2",degree:2,semitones:2},{id:"SECOND_MINOR",es:"Segunda Menor",en:"Minor Second",abbr:"m2",degree:2,semitones:1},{id:"SIXTH_MAJOR",es:"Sexta Mayor",en:"Major Sixth",abbr:"M6",degree:6,semitones:9},{id:"SIXTH_MINOR",es:"Sexta Menor",en:"Minor Sixth",abbr:"m6",degree:6,semitones:8},{id:"SEVENTH_MAJOR",es:"Septima Mayor",en:"Major Seventh",abbr:"M7",degree:7,semitones:11},{id:"SEVENTH_MINOR",es:"Septima Menor",en:"Minor Seventh",abbr:"m7",degree:7,semitones:10},{id:"FOURTH_AUGMENTED",es:"Cuarta Aumentada",en:"Augmented Fourth",abbr:"A4",degree:4,semitones:6}],N=Object.fromEntries(v.map(t=>[t.id,t])),L=["C","D","E","F","G","A","B"],U={C:0,D:2,E:4,F:5,G:7,A:9,B:11},X=["C","C#","D","D#","E","F","F#","G","G#","A","A#","B"],Z=["C","Db","D","Eb","E","F","Gb","G","Ab","A","Bb","B"],F=["G2","Ab2","G#2","A2","A#2","Bb2","B2","Cb3","B#2","C3","C#3","Db3","D3","D#3","Eb3","E3","Fb3","F3","E#3","F#3","Gb3"],ee=F.map(t=>oe(t,1));function M(t){const e=t[0]?.toUpperCase()??"C";let s="",n="";for(const i of t.slice(1))i>="0"&&i<="9"?n+=i:s+=i;let a=0;for(const i of s)(i==="#"||i==="♯")&&(a+=1),(i==="b"||i==="♭")&&(a-=1);return{letter:e,accidentalText:s,accidental:a,octave:Number(n||4)}}function H(t){const e=M(t);return(e.octave+1)*12+U[e.letter]+e.accidental}function te(t,e=!1){const s=Math.floor(t/12)-1;return`${(e?Z:X)[y(t,12)]}${s}`}function se(t){return t.replace(/\d/g,"").replace(/b/g,"♭")}function x(t){return t.replace(/\d/g,"").replace(/♯/g,"#").replace(/♭/g,"b").toUpperCase()}function ne(t,e,s){const n=M(t),a=L.indexOf(n.letter),i=s==="asc"?1:-1,o=H(t)+i*e.semitones,r=n.octave*7+a+i*(e.degree-1),c=L[y(r,7)],l=Math.floor(r/7),m=o-ce(c,l);return`${c}${le(m)}${l}`}function b(t){return t==="asc"?F:ee}function w(t,e,s){return{interval:t,direction:e,startNote:s,expected:ne(s,t,e),statKey:`${t.id}:${e}`}}function ae(t){return t<=0?0:69+12*Math.log2(t/440)}function ie(t,e,s){if(t.length===0)return{pitchCorrect:!1,noteClassCorrect:!1,detectedName:null};const n=new Map;for(const u of t){const p=ae(u);if(p<=0)continue;const C=Math.round(p),E=n.get(C)??[];E.push(p),n.set(C,E)}let a=null,i=[];for(const[u,p]of n)p.length>i.length&&(a=u,i=p);if(a===null)return{pitchCorrect:!1,noteClassCorrect:!1,detectedName:null};const o=i.reduce((u,p)=>u+p,0)/i.length,r=Math.round(o),c=Math.abs(o-r),l=H(e),m=y(r,12)===y(l,12),h=e.includes("b")||e.includes("♭");return{pitchCorrect:m&&c<s,noteClassCorrect:m,detectedName:te(r,h),deviation:c}}function re(t,e=Math.random){const s=[...t];for(let n=s.length-1;n>0;n-=1){const a=Math.floor(e()*(n+1));[s[n],s[a]]=[s[a],s[n]]}return s}function f(t,e=Math.random){return t[Math.floor(e()*t.length)]}function oe(t,e){const s=M(t);return`${s.letter}${s.accidentalText}${s.octave+e}`}function ce(t,e){return(e+1)*12+U[t]}function le(t){return t===0?"":t>0?"#".repeat(t):"b".repeat(Math.abs(t))}function y(t,e){return(t%e+e)%e}class de{ctx=null;active=[];audioCache=new Map;context(){if(!this.ctx){const e=window.AudioContext??window.webkitAudioContext;if(!e)throw new Error("audio-context-unavailable");this.ctx=new e}return this.ctx}async unlock(){const e=this.context();e.state==="suspended"&&await e.resume()}stopAll(){for(const e of this.active)try{e.pause(),e.currentTime=0}catch{}this.active=[]}async playNote(e,s,n=I){const a=this.resolveTimbre(s);await this.playUrl(J(a,e),n,!0)}async playFeedback(e,s=I){await this.playUrl(W(e),s*.82,!1)}resolveTimbre(e){return e==="random"?f([...V]):e}async playUrl(e,s,n){n&&this.stopAll();let a=this.audioCache.get(e);a||(a=new Audio(e),a.preload="auto",this.audioCache.set(e,a));const i=a.cloneNode(!0);i.volume=Math.max(0,Math.min(1,s)),i.currentTime=0,i.addEventListener("ended",()=>{this.active=this.active.filter(o=>o!==i)},{once:!0}),this.active.push(i);try{await i.play()}catch(o){this.active=this.active.filter(r=>r!==i),console.warn("[audio] playback blocked or failed",e,o)}}}class ue extends Error{constructor(){super("microphone-denied"),this.name="MicDeniedError"}}class _ extends Error{constructor(){super("microphone-unsupported"),this.name="MicUnsupportedError"}}class he{constructor(e){this.ctx=e}stream=null;source=null;worklet=null;sink=null;collecting=!1;collected=[];generation=0;initializing=null;finishListening=null;ensureReady(){if(this.worklet)return Promise.resolve();if(this.initializing)return this.initializing;const e=this.initialize(this.generation).finally(()=>{this.initializing===e&&(this.initializing=null)});return this.initializing=e,e}async initialize(e){if(!window.isSecureContext||!navigator.mediaDevices?.getUserMedia)throw new _;let s;try{s=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:!1,noiseSuppression:!1,autoGainControl:!1}})}catch{throw new ue}if(e!==this.generation)throw s.getTracks().forEach(n=>n.stop()),new DOMException("Microphone initialization cancelled","AbortError");this.stream=s;try{if(await this.ctx.audioWorklet.addModule("/apps/intervalos-cantados/pitch-processor.js"),e!==this.generation)throw new DOMException("Microphone initialization cancelled","AbortError");this.source=this.ctx.createMediaStreamSource(s),this.worklet=new AudioWorkletNode(this.ctx,"pitch-processor"),this.worklet.port.onmessage=n=>{this.collecting&&n.data>0&&this.collected.push(n.data)},this.sink=this.ctx.createGain(),this.sink.gain.value=0,this.source.connect(this.worklet),this.worklet.connect(this.sink).connect(this.ctx.destination)}catch(n){throw e===this.generation&&this.dispose(),n}}async listen(e){const s=this.generation;try{if(await this.ensureReady(),this.ctx.state==="suspended"&&await this.ctx.resume(),s!==this.generation)throw new DOMException("Microphone capture cancelled","AbortError");if(this.collected=[],this.collecting=!0,await new Promise(n=>{const a=setTimeout(()=>{this.finishListening=null,n()},e);this.finishListening=()=>{clearTimeout(a),n()}}),s!==this.generation)throw new DOMException("Microphone capture cancelled","AbortError");return[...this.collected]}finally{s===this.generation&&this.dispose()}}dispose(){this.generation+=1,this.initializing=null,this.collecting=!1,this.finishListening?.(),this.finishListening=null,this.collected=[],this.worklet&&(this.worklet.port.onmessage=null);for(const e of[this.source,this.worklet,this.sink])try{e?.disconnect()}catch{}this.stream?.getTracks().forEach(e=>e.stop()),this.stream=null,this.source=null,this.worklet=null,this.sink=null}}function pe(){return new URLSearchParams(window.location.search).get("lang")==="en"?"en":"es"}function me(t){const e=new URL(window.location.href);e.searchParams.set("lang",t),window.location.href=e.toString()}const S={es:{appName:"Intervalos Cantados",appSub:"Entrenamiento vocal de intervalos",appLine:"Escucha la nota inicial, nombra la llegada y cántala con precisión.",chooseMode:"Elige modo",classic:"Entrenamiento clásico",classicShort:"Clásico",classicSub:"Ritmo libre para estudiar con calma y revisar cada respuesta.",time:"Modo contrarreloj",timeShort:"Contrarreloj",timeSub:"Series rápidas para empujar reflejos auditivos bajo presión.",survival:"Modo vidas",survivalShort:"Vidas",survivalSub:"Tres errores y termina: sesiones cortas de concentración total.",stats:"Estadísticas",statsSub:"Precisión local por intervalo y dirección.",setup:"Configuración",back:"Volver",mode:"Modo",practice:"Qué practicar",nomenclature:"Solo nomenclatura",hybrid:"Afinación + nomenclatura",instrument:"Instrumento",randomInstrument:"Aleatorio",interval:"Intervalo",allIntervals:"Aleatorio - todos los intervalos",start:"Comenzar",new:"Nueva",hearNote:"Oír nota",pressNew:"Presiona Nueva para comenzar.",writeFirst:"Escribe la nota primero.",makeQuestionFirst:"Primero genera una pregunta.",micBlocked:"No pude abrir el micrófono. Revisa el permiso del navegador.",micUnsupported:"El micrófono requiere localhost o HTTPS.",singing:"Cantando...",ok:"OK",record:"Grabar",delete:"Borrar",menu:"Menú",playAgain:"Jugar de nuevo",timesUp:"Tiempo agotado",livesDone:"Vidas agotadas",finalScore:"Puntaje final",points:"puntos",score:"Pts",timeLeft:"T",noStats:"Sin datos todavía. Completa sesiones para ver tu progreso.",clearStats:"Borrar datos",confirmClear:"¿Seguro? Esto no se puede deshacer.",cancel:"Cancelar",clear:"Borrar",overall:"Precisión",correctOf:"aciertos de",asc:"ascendente",desc:"descendente",ascShort:"Asc",descShort:"Desc",nothing:"Nada",perfectName:t=>`¡Perfecto! Es ${t}.`,wrongName:t=>`Incorrecto. Era ${t}.`,perfectHybrid:"¡Perfecto! Teoría y afinación correctas.",tunedButNoName:(t,e)=>`Incorrecto. Era ${t}, cantaste ${e}.`,nameButLoose:"Nombre correcto, nota cantada un poco desafinada.",nameButOther:t=>`Nombre correcto, pero cantaste otra nota (${t}).`,nameButNoPitch:"Nombre correcto, pero no pude detectar una nota clara."},en:{appName:"Sung Intervals",appSub:"Vocal interval training",appLine:"Hear the starting note, name the target, and sing it accurately.",chooseMode:"Choose mode",classic:"Classic training",classicShort:"Classic",classicSub:"Free pace for careful study and review after each answer.",time:"Time attack",timeShort:"Time attack",timeSub:"Fast rounds to push your ear reflexes under pressure.",survival:"Lives mode",survivalShort:"Lives",survivalSub:"Three mistakes and the round ends: short, focused sessions.",stats:"Statistics",statsSub:"Local accuracy by interval and direction.",setup:"Setup",back:"Back",mode:"Mode",practice:"What to practice",nomenclature:"Nomenclature only",hybrid:"Pitch + nomenclature",instrument:"Instrument",randomInstrument:"Random",interval:"Interval",allIntervals:"Random - all intervals",start:"Start",new:"New",hearNote:"Hear note",pressNew:"Press New to begin",writeFirst:"Write the note first.",makeQuestionFirst:"Generate a question first.",micBlocked:"I could not open the microphone. Check the browser permission.",micUnsupported:"The microphone needs localhost or HTTPS.",singing:"Singing...",ok:"OK",record:"Record",delete:"Delete",menu:"Menu",playAgain:"Play again",timesUp:"Time is up",livesDone:"Out of lives",finalScore:"Final score",points:"points",score:"Pts",timeLeft:"T",noStats:"No data yet. Complete sessions to see your progress.",clearStats:"Clear data",confirmClear:"Are you sure? This cannot be undone.",cancel:"Cancel",clear:"Clear",overall:"Accuracy",correctOf:"correct of",asc:"ascending",desc:"descending",ascShort:"Asc",descShort:"Desc",nothing:"Nothing",perfectName:t=>`Perfect! It is ${t}.`,wrongName:t=>`Incorrect. It was ${t}.`,perfectHybrid:"Perfect! Theory and pitch are both correct.",tunedButNoName:(t,e)=>`Incorrect. It was ${t}; you sang ${e}.`,nameButLoose:"Name correct, but the sung note was slightly out of tune.",nameButOther:t=>`Name correct, but you sang another note (${t}).`,nameButNoPitch:"Name correct, but I could not detect a clear note."}};function d(t){return S[t]}class fe{getStats(){try{return JSON.parse(localStorage.getItem(A)||"{}")}catch{return{}}}record(e,s){const n=this.getStats(),a=n[e]??{correct:0,total:0};n[e]={correct:a.correct+(s?1:0),total:a.total+1},this.save(n)}clear(){this.save({})}save(e){try{localStorage.setItem(A,JSON.stringify(e))}catch{}}}class ge{constructor(e,s,n){this.lang=e,this.audio=s,this.mic=n,this.t=d(e),this.state={lang:e,screen:"menu",selectedMode:"classic",selectedDuration:60,trainingType:"HYBRID",selectedInstrument:"Piano",selectedIntervalId:null,session:null,current:null,answer:"",result:"",resultKind:"",flash:"none",processing:!1,recording:!1,confirmClear:!1,stats:this.statsRepository.getStats()}}intervals=v;instruments=B;t;statsRepository=new fe;listeners=new Set;questionPools={};askedSet=new Set;timerId=null;autoNextTimer=null;recordingGeneration=0;state;getState(){return this.state}subscribe(e){return this.listeners.add(e),e(this.state),()=>this.listeners.delete(e)}modeLabel(e){return e==="classic"?this.t.classicShort:e==="time"?this.t.timeShort:this.t.survivalShort}intervalLabel(e){return e[this.lang]}instrumentLabel(e){return e==="random"?this.t.randomInstrument:this.lang==="en"?{Piano:"Piano",Corno:"Horn",Coro:"Choir",Fagot:"Bassoon",Cello:"Cello"}[e]:e}setDuration(e){this.patch({selectedDuration:e})}openMode(e){this.cancelRecording(),this.clearTimers(),this.audio.stopAll(),this.patch({screen:"setup",selectedMode:e,session:null,current:null,processing:!1,recording:!1})}openMenu(){this.cancelRecording(),this.clearTimers(),this.audio.stopAll(),this.patch({screen:"menu",session:null,current:null,confirmClear:!1,processing:!1,recording:!1})}openSetup(){this.cancelRecording(),this.clearTimers(),this.audio.stopAll(),this.patch({screen:"setup",session:null,current:null,processing:!1,recording:!1})}openStats(){this.cancelRecording(),this.clearTimers(),this.audio.stopAll(),this.patch({screen:"stats",session:null,current:null,stats:this.statsRepository.getStats(),processing:!1,recording:!1})}setTrainingType(e){this.patch({trainingType:e})}setInstrument(e){this.patch({selectedInstrument:e})}startTraining(e){this.cancelRecording(),this.clearTimers(),this.resetQuestionMemory(),this.patch({screen:"training",selectedIntervalId:e===""?null:e,session:this.createSession(this.state.selectedMode),current:null,answer:"",result:"",resultKind:"",flash:"none",processing:!1,recording:!1}),this.audio.unlock().catch(()=>{}),this.newQuestion()}newQuestion(){const e=this.state.session;if(!e||e.ended||this.state.processing||this.state.recording)return;this.clearAutoNext();const s=this.generateQuestion(),n=e.mode==="classic"?{...e,classicQuestions:e.classicQuestions+1}:e;this.patch({session:n,current:s,answer:"",result:"",resultKind:"",flash:"none"}),this.startTimerIfNeeded(),this.state.trainingType==="HYBRID"&&this.audio.playNote(s.startNote,this.state.selectedInstrument).catch(()=>{})}repeatStartNote(){!this.state.current||this.state.trainingType!=="HYBRID"||this.state.processing||this.state.recording||this.audio.playNote(this.state.current.startNote,this.state.selectedInstrument).catch(()=>{})}inputNoteKey(e){if(!(this.state.processing||this.state.recording||this.state.session?.ended)){if(/^[A-G]$/.test(e)){const s=this.state.answer.replace(/[A-G]/gi,"");this.patch({answer:`${e}${s}`.slice(0,3),result:"",resultKind:""});return}if(this.state.answer.match(/[A-G]/i)){const s=this.state.answer.match(/[A-G]/i)?.[0].toUpperCase()??"";this.patch({answer:`${s}${e}`,result:"",resultKind:""})}}}deleteNoteKey(){this.state.processing||this.state.recording||this.state.session?.ended||this.patch({answer:this.state.answer.slice(0,-1)})}async submitAnswer(){if(this.state.processing||this.state.recording||this.state.session?.ended)return;if(!this.state.current){this.patch({result:this.t.makeQuestionFirst,resultKind:"warn"});return}if(!this.state.answer){this.patch({result:this.t.writeFirst,resultKind:"warn"});return}const e=this.recordingGeneration;if(this.patch({processing:!0}),this.startTimerIfNeeded(),this.state.trainingType==="NOMENCLATURE_ONLY"){this.evaluateAnswer(null);return}try{if(await this.audio.unlock(),e!==this.recordingGeneration)return;this.patch({recording:!0,result:this.t.singing,resultKind:""});const s=await this.mic.listen(Y);if(e!==this.recordingGeneration||!this.state.session||this.state.session.ended)return;this.patch({recording:!1}),this.evaluateAnswer(s)}catch(s){if(e!==this.recordingGeneration)return;this.mic.dispose(),this.patch({processing:!1,recording:!1,result:s instanceof _?this.t.micUnsupported:this.t.micBlocked,resultKind:"bad"})}}askClearStats(){this.patch({confirmClear:!0})}cancelClearStats(){this.patch({confirmClear:!1})}clearStats(){this.statsRepository.clear(),this.patch({stats:{},confirmClear:!1})}dispose(){this.cancelRecording(),this.clearTimers(),this.audio.stopAll()}suspend(){this.cancelRecording(),this.audio.stopAll(),this.patch({processing:!1,recording:!1,result:"",resultKind:"",flash:"none"})}cancelRecording(){this.recordingGeneration+=1,this.mic.dispose()}evaluateAnswer(e){const s=this.state.current;if(!s||!this.state.session||this.state.session.ended)return;const n=x(s.expected)===x(this.state.answer),a=this.t.nothing;let i=!1,o=!1,r=a;if(this.state.trainingType!=="NOMENCLATURE_ONLY"){const u=ie(e??[],s.expected,z);i=u.pitchCorrect,o=u.noteClassCorrect,r=u.detectedName??a}const c=this.state.trainingType==="NOMENCLATURE_ONLY"?n:n&&i,l=this.resultMessage(c,n,o,r,s.expected),m=c?"ok":n&&this.state.trainingType==="HYBRID"?"warn":"bad";this.statsRepository.record(s.statKey,c);const h=this.applyScore(c);this.patch({session:h,stats:this.statsRepository.getStats(),result:l,resultKind:m,flash:c?"correct":"wrong",processing:!1,recording:!1}),this.audio.playFeedback(c).catch(()=>{}),!(!h||h.ended)&&(h.mode==="survival"&&h.lives<=0?this.autoNextTimer=window.setTimeout(()=>this.endSession("lives"),1400):h.mode!=="classic"&&(this.autoNextTimer=window.setTimeout(()=>{this.autoNextTimer=null,this.newQuestion()},1800)))}resultMessage(e,s,n,a,i){return this.state.trainingType==="NOMENCLATURE_ONLY"?e?this.t.perfectName(i):this.t.wrongName(i):e?this.t.perfectHybrid:s&&n?this.t.nameButLoose:s&&a===this.t.nothing?this.t.nameButNoPitch:s?this.t.nameButOther(a):this.t.tunedButNoName(i,a)}applyScore(e){const s=this.state.session;return s?e&&s.mode==="time"?{...s,timeScore:s.timeScore+1}:e&&s.mode==="survival"?{...s,survivalScore:s.survivalScore+1}:!e&&s.mode==="classic"?{...s,classicErrors:s.classicErrors+1}:!e&&s.mode==="survival"?{...s,lives:s.lives-1}:s:null}createSession(e){return{mode:e,remainingTime:this.state.selectedDuration,lives:3,timeScore:0,survivalScore:0,classicQuestions:0,classicErrors:0,ended:!1,endReason:null}}generateQuestion(){if(this.state.selectedIntervalId){const n=N[this.state.selectedIntervalId],a=Math.random()<.5?"asc":"desc",i=this.nextStartFromPool(n.id,a);return w(n,a,i)}let e=null;for(let n=0;n<1e3&&!e;n+=1){const a=f(v),i=Math.random()<.5?"asc":"desc",o=f(b(i)),r=`${a.id}:${i}:${o}`;this.askedSet.has(r)||(this.askedSet.add(r),e=w(a,i,o))}if(e)return e;this.askedSet.clear();const s=f(v);return w(s,"asc",f(b("asc")))}nextStartFromPool(e,s){const n=`${e}:${s}`;return(!this.questionPools[n]||this.questionPools[n]?.length===0)&&(this.questionPools[n]=re(b(s))),this.questionPools[n]?.pop()??f(b(s))}startTimerIfNeeded(){const e=this.state.session;!e||e.mode!=="time"||this.timerId!==null||e.ended||(this.timerId=window.setInterval(()=>{const s=this.state.session;if(!s||s.ended)return;const n=s.remainingTime-1;n<=0?(this.patch({session:{...s,remainingTime:0}}),this.endSession("timeout")):this.patch({session:{...s,remainingTime:n}})},1e3))}endSession(e){const s=this.state.session;s&&(this.cancelRecording(),this.clearTimers(),this.audio.stopAll(),this.patch({session:{...s,ended:!0,endReason:e},processing:!1,recording:!1,result:"",flash:"none"}))}resetQuestionMemory(){this.questionPools={},this.askedSet=new Set}clearTimers(){this.timerId!==null&&(window.clearInterval(this.timerId),this.timerId=null),this.clearAutoNext()}clearAutoNext(){this.autoNextTimer!==null&&(window.clearTimeout(this.autoNextTimer),this.autoNextTimer=null)}patch(e){this.state={...this.state,...e};for(const s of this.listeners)s(this.state)}}const be=["C","D","E","F","G","A","B"],ve=["♭","♭♭","#","##"];function ye(t,e){const s=d(e.lang);e.subscribe(n=>{t.innerHTML=we(n,e)}),t.addEventListener("click",n=>{const a=n.target.closest("[data-action]");!a||D(a)||R(a,e)}),t.addEventListener("keydown",n=>{if(n.key!=="Enter"&&n.key!==" ")return;const a=n.target.closest('[role="button"][data-action]');!a||D(a)||(n.preventDefault(),R(a,e))}),window.addEventListener("beforeunload",()=>e.dispose()),window.addEventListener("pagehide",()=>e.suspend()),document.addEventListener("visibilitychange",()=>{document.hidden&&e.suspend()}),window.isSecureContext||console.info(s.micUnsupported)}function R(t,e){switch(t.dataset.action){case"language":me(t.dataset.lang??"es");break;case"duration":e.setDuration(Number(t.dataset.duration));break;case"mode":e.openMode(t.dataset.mode??"classic");break;case"stats":e.openStats();break;case"menu":e.openMenu();break;case"setup":e.openSetup();break;case"training-type":e.setTrainingType(t.dataset.trainingType??"HYBRID");break;case"instrument":e.setInstrument(t.dataset.instrument??"Piano");break;case"start-interval":e.startTraining(t.dataset.interval??"");break;case"new-question":e.newQuestion();break;case"repeat-start":e.repeatStartNote();break;case"note-key":e.inputNoteKey(t.dataset.key??"");break;case"delete-key":e.deleteNoteKey();break;case"submit-answer":e.submitAnswer();break;case"replay":e.startTraining(e.getState().selectedIntervalId??"");break;case"ask-clear":e.askClearStats();break;case"cancel-clear":e.cancelClearStats();break;case"clear-stats":e.clearStats();break}}function we(t,e){return t.screen==="setup"?$e(t,e):t.screen==="training"?Se(t,e):t.screen==="stats"?Ne(t,e):G(t)}function G(t){const e=d(t.lang);return`
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
        ${k(t.lang)}
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
  `;function s(a,i,o,r=""){return`
      <div class="mode-card" role="button" tabindex="0" data-action="mode" data-mode="${a}" style="--mode-color:${K(a)}">
        <span class="accent-bar" aria-hidden="true"></span>
        <span class="mode-icon" aria-hidden="true">${Re(a)}</span>
        <span class="mode-body">
          <span class="mode-title">${i}</span>
          <span class="mode-subtitle">${o}</span>
          ${r?`<span class="mode-extra">${r}</span>`:""}
        </span>
        <span class="mode-arrow" aria-hidden="true">›</span>
      </div>
    `}function n(a){return`
      <span class="duration-row">
        ${[60,90,120].map(i=>`
          <button class="pill ${a.selectedDuration===i?"on":""}" type="button"
            data-action="duration" data-duration="${i}">${i}s</button>
        `).join("")}
      </span>
    `}}function $e(t,e){const s=d(t.lang);return`
    <main class="screen">
      <header class="header-row">
        <button class="back-button" type="button" data-action="menu">‹ ${s.back}</button>
        <div>
          <div class="eyebrow">${s.mode}</div>
          <h1 class="screen-title">${e.modeLabel(t.selectedMode)}</h1>
        </div>
        ${k(t.lang)}
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
            ${e.intervals.map(n=>Ee(e,n)).join("")}
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
        <div class="hud">${Me(t)}</div>
      </header>

      ${t.trainingType==="HYBRID"&&!window.isSecureContext?`
        <div class="training-panel feedback warn">${s.micUnsupported}</div>
      `:""}

      <section class="training-main">
        <div class="training-panel question-card">
          ${ke(t,e)}
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

      ${Ce(t)}
    </main>
  `}function Te(t,e,s){const n=d(t.lang),a=t.session;if(!a)return"";const i=a.mode==="time"?a.timeScore:a.survivalScore;return`
    <main class="screen" style="--active-color:${s}">
      <section class="game-over">
        <div class="eyebrow">${e.modeLabel(a.mode)}</div>
        <h1 class="screen-title">${a.endReason==="timeout"?n.timesUp:n.livesDone}</h1>
        <div class="game-over-score">${i}</div>
        <p class="small-muted">${n.finalScore} · ${n.points}</p>
        <div class="button-row" style="justify-content:center;margin-top:8px">
          <button class="secondary-button" type="button" data-action="setup">${n.setup}</button>
          <button class="primary-button" style="width:auto;min-width:170px" type="button" data-action="replay">${n.playAgain}</button>
        </div>
      </section>
    </main>
  `}function Ne(t,e){const s=d(t.lang),n=Object.entries(t.stats).filter(([,r])=>r.total>0).sort(([,r],[,c])=>r.correct/r.total-c.correct/c.total),a=n.reduce((r,[,c])=>r+c.total,0),i=n.reduce((r,[,c])=>r+c.correct,0),o=a>0?Math.round(i/a*100):null;return`
    <main class="screen">
      <header class="header-row">
        <button class="back-button" type="button" data-action="menu">‹ ${s.back}</button>
        <h1 class="screen-title">${s.stats}</h1>
        ${k(t.lang)}
      </header>

      <section class="stats-list">
        ${o===null?`<div class="empty-state">${s.noStats}</div>`:`
          <div class="stats-card">
            <div class="stat-top">
              <div>
                <span class="section-label">${s.overall}</span>
                <strong class="screen-title">${o}%</strong>
              </div>
              <span class="stat-count">${i} / ${a}</span>
            </div>
            <div class="track"><div class="fill" style="--pct:${o}%;--bar-color:${$(o)}"></div></div>
          </div>
          ${n.map(([r,c])=>{const l=Math.round(c.correct/c.total*100);return`
              <div class="stats-card">
                <div class="stat-top">
                  <div>
                    <div class="stat-name">${Ie(r,t,e)}</div>
                    <div class="stat-count">${c.correct} ${s.correctOf} ${c.total}</div>
                  </div>
                  <div class="stat-pct" style="color:${$(l)}">${l}%</div>
                </div>
                <div class="track"><div class="fill" style="--pct:${l}%;--bar-color:${$(l)}"></div></div>
              </div>
            `}).join("")}
          ${t.confirmClear?Ae(t.lang):`<button class="danger-button" type="button" data-action="ask-clear">${s.clearStats}</button>`}
        `}
      </section>
    </main>
  `}function Me(t){const e=d(t.lang),s=t.session;return s?s.mode==="classic"?`
      ${g("P",s.classicQuestions,"var(--aqua)")}
      ${g("E",s.classicErrors,"var(--rose)")}
    `:s.mode==="time"?`
      ${g(e.timeLeft,`${s.remainingTime}s`,s.remainingTime<10?"var(--rose)":"var(--gold)")}
      ${g(e.score,s.timeScore,"var(--gold)")}
    `:`
    <span class="hud-chip" style="--hud-color:var(--rose)">
      <span class="hud-label">VID</span>
      <span class="hearts">${[0,1,2].map(n=>`<span class="${n>=s.lives?"lost":""}">♥</span>`).join("")}</span>
    </span>
    ${g(e.score,s.survivalScore,"var(--rose)")}
  `:""}function ke(t,e){const s=d(t.lang);if(!t.current)return`<div class="small-muted">${s.pressNew}</div>`;const n=t.current;return`
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
  `}function Ce(t){const e=d(t.lang),s=T(t)||!!t.session?.ended,n=t.recording?"...":t.trainingType==="HYBRID"?e.record:e.ok;return`
    <section class="keyboard-panel">
      <div class="key-row naturals">
        ${be.map(a=>`<button class="key white" type="button" data-action="note-key" data-key="${a}" ${s?"disabled":""}>${a}</button>`).join("")}
      </div>
      <div class="key-row actions">
        ${ve.map(a=>`<button class="key black" type="button" data-action="note-key" data-key="${a}" ${s?"disabled":""}>${a}</button>`).join("")}
        <button class="action-key" style="--action-color:var(--rose)" type="button" data-action="delete-key" ${s?"disabled":""} aria-label="${e.delete}">⌫</button>
        <button class="action-key submit ${t.recording?"recording":""}" type="button" data-action="submit-answer"
          ${s||!t.answer?"disabled":""}>${n}</button>
      </div>
    </section>
  `}function O(t,e,s){return`
    <button class="chip ${t.trainingType===e?"on":""}" type="button"
      data-action="training-type" data-training-type="${e}">${s}</button>
  `}function Ee(t,e){return`
    <button class="interval-row" type="button" data-action="start-interval" data-interval="${e.id}">
      <span>${t.intervalLabel(e)}</span>
      <span class="abbr">${e.abbr}</span>
    </button>
  `}function Ie(t,e,s){const[n,a]=t.split(":"),i=N[n];return i?`${s.intervalLabel(i)} ${a==="asc"?S[e.lang].ascShort:S[e.lang].descShort}`:t}function k(t){return`
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
  `}function g(t,e,s){return`
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
  `}function Re(t){return t==="classic"?"CL":t==="time"?"60":"03"}function K(t){return t==="classic"?"var(--aqua)":t==="time"?"var(--gold)":"var(--rose)"}function $(t){return t>=80?"var(--mint)":t>=50?"var(--gold)":"var(--rose)"}function D(t){return t instanceof HTMLButtonElement&&t.disabled}function T(t){return t.processing||t.recording}const j=pe();document.documentElement.lang=j;const Q=document.getElementById("app");if(!Q)throw new Error("No se encontro el contenedor #app");const q=new de,Oe=new he(q.context()),De=new ge(j,q,Oe);ye(Q,De);
