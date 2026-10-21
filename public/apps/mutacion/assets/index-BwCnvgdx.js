(function(){let e=document.createElement(`link`).relList;if(e&&e.supports&&e.supports(`modulepreload`))return;for(let e of document.querySelectorAll(`link[rel="modulepreload"]`))n(e);new MutationObserver(e=>{for(let t of e)if(t.type===`childList`)for(let e of t.addedNodes)e.tagName===`LINK`&&e.rel===`modulepreload`&&n(e)}).observe(document,{childList:!0,subtree:!0});function t(e){let t={};return e.integrity&&(t.integrity=e.integrity),e.referrerPolicy&&(t.referrerPolicy=e.referrerPolicy),t.credentials=e.crossOrigin===`use-credentials`?`include`:e.crossOrigin===`anonymous`?`omit`:`same-origin`,t}function n(e){if(e.ep)return;e.ep=!0;let n=t(e);fetch(e.href,n)}})();var e=[`CIRCLE`,`SQUARE`,`TRIANGLE`,`DIAMOND`,`STAR`,`HEXAGON`],t=[`COLOR`,`SHAPE`,`SWAP`,`ROTATION`,`SUBTLE_COLOR`];function n(e,t){let n=[];for(let r=e;r<=t;r++)n.push(r);return n}var r=[{worldNumber:1,gridLabel:`2×2`,levelRange:[1,6],levels:n(1,6),subtitle:``},{worldNumber:2,gridLabel:`2×3`,levelRange:[7,12],levels:n(7,12),subtitle:``},{worldNumber:3,gridLabel:`3×3`,levelRange:[13,18],levels:n(13,18),subtitle:``},{worldNumber:4,gridLabel:`3×4`,levelRange:[19,24],levels:n(19,24),subtitle:``},{worldNumber:5,gridLabel:`4×4`,levelRange:[25,30],levels:n(25,30),subtitle:``},{worldNumber:6,gridLabel:`5×5`,levelRange:[31,36],levels:n(31,36),subtitle:``},{worldNumber:7,gridLabel:`6×6`,levelRange:[37,42],levels:n(37,42),subtitle:``},{worldNumber:8,gridLabel:`6×6`,levelRange:[43,48],levels:n(43,48),subtitle:`Modo maestro`}],i=[`#E53935`,`#1E88E5`,`#43A047`,`#FDD835`,`#FB8C00`,`#8E24AA`,`#D81B60`,`#00ACC1`],a={"#E53935":`#C62828`,"#1E88E5":`#1565C0`,"#43A047":`#2E7D32`,"#FDD835":`#F9A825`,"#FB8C00":`#EF6C00`,"#8E24AA":`#6A1B9A`,"#D81B60":`#AD1457`,"#00ACC1":`#00838F`},o=new Set([`TRIANGLE`,`DIAMOND`,`STAR`]),s=[`TRIANGLE`,`DIAMOND`,`STAR`],c=[`#E53935`,`#1E88E5`,`#43A047`];function l(n,r,a,o,s){let c=((n-1)%6+6)%6,l=s[c],u;switch(c){case 0:u=[`COLOR`];break;case 1:u=[`SHAPE`];break;case 2:u=[`SWAP`];break;case 3:u=[`ROTATION`];break;case 4:u=[`SUBTLE_COLOR`];break;default:u=[...t]}return{gridColumns:r,gridRows:a,mutationCount:o,memorizationTimeMs:l,availableMutations:u,availableShapes:[...e],availableColors:[...i],showHint:!1}}function u(e){return e===1?{gridColumns:2,gridRows:2,mutationCount:1,memorizationTimeMs:8e3,availableMutations:[`COLOR`],availableShapes:[`CIRCLE`],availableColors:[...c],showHint:!0}:e>=2&&e<=6?l(e,2,2,1,[8e3,8e3,7e3,7e3,6e3,6e3]):e>=7&&e<=12?l(e,2,3,1,[7e3,7e3,6e3,6e3,5e3,5e3]):e>=13&&e<=18?l(e,3,3,2,[7e3,7e3,6e3,6e3,5e3,5e3]):e>=19&&e<=24?l(e,3,4,2,[6e3,6e3,5e3,5e3,4e3,4e3]):e>=25&&e<=30?l(e,4,4,3,[6e3,6e3,5e3,5e3,4e3,4e3]):e>=31&&e<=36?l(e,5,5,3,[5e3,5e3,4e3,4e3,3e3,3e3]):e>=37&&e<=42?l(e,6,6,4,[5e3,5e3,4e3,4e3,3e3,3e3]):l(e,6,6,5,[4e3,4e3,3e3,3e3,2500,2500])}function d(e={}){return{level:1,lives:3,score:0,phase:`MEMORIZING`,gridColumns:3,gridRows:3,originalGrid:[],mutatedGrid:[],mutatedIndices:new Set,playerSelections:new Set,maxTouches:0,remainingTouches:0,memorizationTimeMs:5e3,timeRemainingMs:5e3,highScore:0,unlockedLevel:1,isPaused:!1,isGameOver:!1,showHint:!1,...e}}var f=`mutacion_prefs_high_score`,p=`mutacion_prefs_unlocked_level`,m=class{memoryHighScore=0;memoryUnlockedLevel=1;constructor(){this.memoryHighScore=this.readInt(f,0),this.memoryUnlockedLevel=Math.max(1,this.readInt(p,1))}readInt(e,t){try{if(typeof globalThis<`u`&&`localStorage`in globalThis&&globalThis.localStorage){let t=globalThis.localStorage.getItem(e);if(t!==null){let e=Number.parseInt(t,10);if(Number.isFinite(e))return e}}}catch{}return t}writeInt(e,t){try{typeof globalThis<`u`&&`localStorage`in globalThis&&globalThis.localStorage&&globalThis.localStorage.setItem(e,String(t))}catch{}}getHighScore(){let e=this.readInt(f,this.memoryHighScore);return this.memoryHighScore=Math.max(this.memoryHighScore,e),this.memoryHighScore}getUnlockedLevel(){let e=this.readInt(p,this.memoryUnlockedLevel);return this.memoryUnlockedLevel=Math.max(1,this.memoryUnlockedLevel,e),this.memoryUnlockedLevel}saveHighScore(e){return e>this.getHighScore()&&(this.memoryHighScore=e,this.writeInt(f,e)),this.memoryHighScore}unlockLevel(e){return e>this.getUnlockedLevel()&&(this.memoryUnlockedLevel=e,this.writeInt(p,e)),this.memoryUnlockedLevel}resetProgress(){this.memoryHighScore=0,this.memoryUnlockedLevel=1,this.writeInt(f,0),this.writeInt(p,1)}},ee=class{highScore=0;unlockedLevel=1;constructor(e=0,t=1){this.highScore=e,this.unlockedLevel=Math.max(1,t)}getHighScore(){return this.highScore}getUnlockedLevel(){return this.unlockedLevel}saveHighScore(e){return e>this.highScore&&(this.highScore=e),this.highScore}unlockLevel(e){return e>this.unlockedLevel&&(this.unlockedLevel=e),this.unlockedLevel}resetProgress(){this.highScore=0,this.unlockedLevel=1}},te=1e3,ne=2500,re=[90,180,270];function h(e,t=Math.random){if(e.length===0)throw Error(`Cannot pick random item from empty array`);return e[Math.min(e.length-1,Math.floor(t()*e.length))]}function g(e,t){return e.shape===t.shape&&e.color===t.color&&e.rotation===t.rotation}function _(e,t=Math.random){let n=e.gridColumns*e.gridRows,r=e.availableShapes,i=e.availableColors,a=[];for(let e=0;e<n;e++)a.push({shape:h(r,t),color:h(i,t),rotation:0});if(e.availableMutations.length>0&&e.availableMutations.every(e=>e===`ROTATION`)){let n=r.filter(e=>o.has(e)),i=n.length>0?n:s,c=a.filter(e=>o.has(e.shape)).length;for(let n=0;n<a.length&&c<e.mutationCount;n++)o.has(a[n].shape)||(a[n]={...a[n],shape:h(i,t)},c++)}return a}function v(e,t,n,r,i){let a=e[t];if(!a||g(a,i))return!1;let o=Math.floor(t/n),s=t%n,c=[];return o>0&&c.push(e[(o-1)*n+s]),o<r-1&&c.push(e[(o+1)*n+s]),s>0&&c.push(e[o*n+s-1]),s<n-1&&c.push(e[o*n+s+1]),c.every(e=>e.shape!==a.shape||e.color!==a.color||e.rotation!==a.rotation)}function y(e,t,n=Math.random){let r=e.map(e=>({...e})),i=new Set,s=e.map((e,t)=>t),{gridColumns:c,gridRows:l}=t,u=t.mutationCount,d=0,f=t.mutationCount*10,p=e=>{let t=s.indexOf(e);t!==-1&&s.splice(t,1)};for(;u>0&&d<f&&s.length>0;)switch(d++,h(t.availableMutations,n)){case`SWAP`:{if(s.length<2)continue;let e=h(s,n),t=h(s.filter(t=>t!==e),n);if(g(r[e],r[t]))continue;let a=r[e];r[e]=r[t],r[t]=a,i.add(e),i.add(t),p(e),p(t),u--;break}case`ROTATION`:{let t=s.filter(e=>o.has(r[e].shape));if(t.length===0)continue;let a=h(t,n),d=r[a].rotation,f=h(re.filter(e=>e!==d),n);if(r[a]={...r[a],rotation:f},!v(r,a,c,l,e[a])){r[a]={...e[a]};continue}i.add(a),p(a),u--;break}case`COLOR`:{let a=h(s,n),o=r[a].color,d=t.availableColors.filter(e=>e!==o);if(d.length===0)continue;let f=h(d,n);if(r[a]={...r[a],color:f},!v(r,a,c,l,e[a])){r[a]={...e[a]};continue}i.add(a),p(a),u--;break}case`SHAPE`:{let a=h(s,n),o=r[a].shape,d=t.availableShapes.filter(e=>e!==o);if(d.length===0)continue;let f=h(d,n);if(r[a]={...r[a],shape:f,rotation:0},!v(r,a,c,l,e[a])){r[a]={...e[a]};continue}i.add(a),p(a),u--;break}case`SUBTLE_COLOR`:{let t=h(s,n),o=r[t].color,d=a[o];if(!d||d===o)continue;if(r[t]={...r[t],color:d},!v(r,t,c,l,e[t])){r[t]={...e[t]};continue}i.add(t),p(t),u--;break}}return{mutatedGrid:r,mutatedIndices:i}}function ie(e){let t=new Set,n=new Set,r=new Set;for(let r of e.playerSelections)e.mutatedIndices.has(r)?t.add(r):n.add(r);for(let t of e.mutatedIndices)e.playerSelections.has(t)||r.add(t);let i=n.size,a=Math.max(0,e.lives-i),o=r.size===0&&n.size===0?50*e.level:0,s=t.size*100*e.level+o,c=e.score+s,l=r.size===0,u=c>e.highScore,d=u?c:e.highScore,f=l?e.level+1:null,p=f===null?e.unlockedLevel:Math.max(e.unlockedLevel,f);return{state:{...e,phase:`RESULT`,lives:a,score:c,highScore:d,unlockedLevel:p},correctSelections:t,wrongSelections:n,missedMutations:r,livesLost:i,scoreGained:s,allFound:l,nextLevelUnlocked:f,isNewHighScore:u}}var b=class{_state;repository;rng;autoTimers;listeners=new Set;memorizationTimerId=null;phaseTimeoutId=null;constructor(e={}){this.repository=e.repository??new ee,this.rng=e.rng??Math.random,this.autoTimers=e.autoTimers??!0,this._state=d({highScore:this.repository.getHighScore(),unlockedLevel:this.repository.getUnlockedLevel()})}get state(){return this._state}subscribe(e){return this.listeners.add(e),e(this._state),()=>{this.listeners.delete(e)}}updateState(e){this._state=e(this._state);for(let e of this.listeners)e(this._state)}clearTimers(){this.memorizationTimerId!==null&&(clearInterval(this.memorizationTimerId),this.memorizationTimerId=null),this.phaseTimeoutId!==null&&(clearTimeout(this.phaseTimeoutId),this.phaseTimeoutId=null)}startLevel(e){this.clearTimers(),this.updateState(t=>d({level:e,highScore:t.highScore,unlockedLevel:t.unlockedLevel})),this.startRound()}startRound(){this.clearTimers();let e=this._state.level,t=u(e),n=_(t,this.rng),{mutatedGrid:r,mutatedIndices:i}=y(n,t,this.rng),a=0;for(;i.size===0&&a<8;)a++,n=_(t,this.rng),{mutatedGrid:r,mutatedIndices:i}=y(n,t,this.rng);let o=i.size+1;this.updateState(e=>({...e,phase:`MEMORIZING`,gridColumns:t.gridColumns,gridRows:t.gridRows,originalGrid:n,mutatedGrid:r,mutatedIndices:i,playerSelections:new Set,maxTouches:o,remainingTouches:o,memorizationTimeMs:t.memorizationTimeMs,timeRemainingMs:t.memorizationTimeMs,isPaused:!1,isGameOver:!1,showHint:t.showHint})),this.autoTimers&&this.startMemorizationTimer()}startMemorizationTimer(){this.clearTimers(),this.memorizationTimerId=setInterval(()=>{this._state.phase===`MEMORIZING`?this._state.isPaused||this.tickMemorization(50):this.clearTimers()},50)}tickMemorization(e){if(this._state.phase!==`MEMORIZING`||this._state.isPaused)return;let t=Math.max(0,this._state.timeRemainingMs-e);this.updateState(e=>({...e,timeRemainingMs:t})),t<=0&&this.transitionToHidden()}transitionToHidden(){this.clearTimers(),this.updateState(e=>({...e,phase:`HIDDEN`,timeRemainingMs:0})),this.autoTimers&&(this.phaseTimeoutId=setTimeout(()=>{this.transitionToFinding()},te))}transitionToFinding(){this._state.phase===`HIDDEN`&&this.updateState(e=>({...e,phase:`FINDING`}))}onCellTapped(e){let t=this._state;if(t.phase!==`FINDING`||t.isPaused||e<0||e>=t.mutatedGrid.length)return;if(t.playerSelections.has(e)){let n=new Set(t.playerSelections);n.delete(e),this.updateState(e=>({...e,playerSelections:n,remainingTouches:e.remainingTouches+1}));return}if(t.remainingTouches<=0)return;let n=new Set(t.playerSelections);n.add(e);let r=t.remainingTouches-1;this.updateState(e=>({...e,playerSelections:n,remainingTouches:r})),r<=0&&this.evaluateRound()}onDonePressed(){this._state.phase===`FINDING`&&!this._state.isPaused&&this.evaluateRound()}evaluateRound(){this.clearTimers();let e=ie(this._state);return e.isNewHighScore&&this.repository.saveHighScore(e.state.score),e.nextLevelUnlocked!==null&&this.repository.unlockLevel(e.nextLevelUnlocked),this.updateState(()=>e.state),this.autoTimers&&(this.phaseTimeoutId=setTimeout(()=>{this.finishResultPhase(e.allFound)},ne)),e}finishResultPhase(e){if(this._state.phase!==`RESULT`)return;let t=this._state,n=e??Array.from(t.mutatedIndices).every(e=>t.playerSelections.has(e));if(t.lives<=0){this.updateState(e=>({...e,isGameOver:!0}));return}let r=n?t.level+1:t.level;this.updateState(e=>({...e,level:r})),this.startRound()}stopGame(){this.clearTimers()}resetProgress(){this.repository.resetProgress(),this.updateState(e=>({...e,highScore:0,unlockedLevel:1}))}pause(){this._state.isPaused||this.updateState(e=>({...e,isPaused:!0}))}resume(){this._state.isPaused&&this.updateState(e=>({...e,isPaused:!1}))}togglePause(){this._state.isPaused?this.resume():this.pause()}};function x(e=typeof window<`u`?window.location.search:``){try{if(new URLSearchParams(e).get(`lang`)?.toLowerCase()===`en`)return`en`}catch{}return`es`}var ae={appTitle:`MUTACION`,homeSubtitle:`Entrena tu memoria visual`,playButton:`JUGAR`,howToPlayButton:`Cómo jugar`,bestScore:e=>`Mejor puntuación: ${e}`,resetProgressButton:`Reiniciar progreso`,resetDialogTitle:`Reiniciar progreso`,resetDialogBody:`¿Reiniciar todo el progreso? Se bloquearán todos los niveles excepto el primero.`,resetConfirm:`Reiniciar`,resetCancel:`Cancelar`,instructionsTitle:`Cómo jugar`,instructionsSteps:[`1. MEMORIZA la cuadrícula de formas y colores`,`2. La cuadrícula se ocultará brevemente y reaparecerá con cambios sutiles (mutaciones)`,`3. TOCA las celdas que creas que cambiaron`,`4. Presiona "Listo" cuando hayas encontrado todos los cambios`],instructionsMutationsTitle:`Tipos de mutaciones:`,instructionsMutations:[`Cambio de color`,`Cambio de forma`,`Intercambio de posición`,`Rotación de forma`,`Cambios sutiles de tono`],instructionsFooter:`Tienes 3 vidas. Cada error te cuesta una vida. Encuentra todas las mutaciones para avanzar de nivel.`,instructionsDismiss:`Entendido`,levelsTitle:`NIVELES`,worldLabel:e=>`Mundo ${e}`,worldSubtitleMaster:`Modo maestro`,backAria:`Volver`,pauseAria:`Pausar (P)`,levelHeader:`NIVEL`,scoreHeader:`PUNTOS`,phaseMemorize:`MEMORIZA`,phaseHidden:`...`,phaseFind:`ENCUENTRA LOS CAMBIOS`,phaseResult:`RESULTADOS`,level1Hint:`Toca la celda que cambió`,remainingTouches:e=>`Toques restantes: ${e}`,doneButton:`LISTO`,keyboardHint:`Flechas: mover · Enter/Espacio: elegir · P: pausa`,exitDialogTitle:`¿Salir del nivel?`,exitDialogBody:`Perderás el progreso de esta ronda`,exitConfirm:`Salir`,exitCancel:`Continuar`,pauseDialogTitle:`Juego en pausa`,pauseDialogBody:`El temporizador está detenido.`,pauseResume:`Continuar`,pauseExit:`Salir del nivel`,gameOverTitle:`GAME OVER`,levelReached:`Nivel alcanzado`,scoreLabel:`Puntuación`,bestLabel:e=>`Mejor: ${e}`,newRecord:`¡NUEVO RÉCORD!`,retryButton:`REINTENTAR`,levelsButton:`NIVELES`,cellAria:(e,t,n)=>`Fila ${e}, columna ${t}${n?`, seleccionada`:``}`},oe={appTitle:`MUTATION`,homeSubtitle:`Train your visual memory`,playButton:`PLAY`,howToPlayButton:`How to play`,bestScore:e=>`Best score: ${e}`,resetProgressButton:`Reset progress`,resetDialogTitle:`Reset progress`,resetDialogBody:`Reset all progress? All levels except the first one will be locked.`,resetConfirm:`Reset`,resetCancel:`Cancel`,instructionsTitle:`How to play`,instructionsSteps:[`1. MEMORIZE the grid of shapes and colors`,`2. The grid will hide briefly and reappear with subtle changes (mutations)`,`3. TAP the cells you think changed`,`4. Press "Done" when you have found all the changes`],instructionsMutationsTitle:`Mutation types:`,instructionsMutations:[`Color change`,`Shape change`,`Position swap`,`Shape rotation`,`Subtle shade changes`],instructionsFooter:`You have 3 lives. Each mistake costs a life. Find all mutations to advance to the next level.`,instructionsDismiss:`Got it`,levelsTitle:`LEVELS`,worldLabel:e=>`World ${e}`,worldSubtitleMaster:`Master mode`,backAria:`Back`,pauseAria:`Pause (P)`,levelHeader:`LEVEL`,scoreHeader:`SCORE`,phaseMemorize:`MEMORIZE`,phaseHidden:`...`,phaseFind:`FIND THE CHANGES`,phaseResult:`RESULTS`,level1Hint:`Tap the cell that changed`,remainingTouches:e=>`Remaining taps: ${e}`,doneButton:`DONE`,keyboardHint:`Arrows: move · Enter/Space: select · P: pause`,exitDialogTitle:`Exit level?`,exitDialogBody:`You will lose your progress in this round`,exitConfirm:`Exit`,exitCancel:`Continue`,pauseDialogTitle:`Game paused`,pauseDialogBody:`The timer is paused.`,pauseResume:`Resume`,pauseExit:`Exit level`,gameOverTitle:`GAME OVER`,levelReached:`Level reached`,scoreLabel:`Score`,bestLabel:e=>`Best: ${e}`,newRecord:`NEW RECORD!`,retryButton:`RETRY`,levelsButton:`LEVELS`,cellAria:(e,t,n)=>`Row ${e}, column ${t}${n?`, selected`:``}`};function se(e){return e===`en`?oe:ae}var ce=`https://samples.stormstudios.com.mx/music/mutacion`,le=`1`,S=Array.from({length:20},(e,t)=>`${ce}/mutacion-${String(t+1).padStart(2,`0`)}.mp3?v=${le}`),C=`mutacion.music.volume`,w=`mutacion.music.muted`,T=x()===`en`?{mute:`Mute music`,unmute:`Unmute music`,volume:`Music volume`,music:`Music`}:{mute:`Silenciar música`,unmute:`Activar música`,volume:`Volumen de la música`,music:`Música`};function E(e){try{return localStorage.getItem(e)}catch{return null}}function D(e,t){try{localStorage.setItem(e,t)}catch{}}function O(e){let t=[...S];for(let e=t.length-1;e>0;e--){let n=Math.floor(Math.random()*(e+1));[t[e],t[n]]=[t[n],t[e]]}return e&&t[0]===e&&([t[0],t[t.length-1]]=[t[t.length-1],t[0]]),t}var ue=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16 8.5a4.5 4.5 0 0 1 0 7M18.5 6a8 8 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`,de=`<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9v6h4l5 4V5L8 9H4z" fill="currentColor"/><path d="M16.5 9.5l5 5M21.5 9.5l-5 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;function fe(){let e=new Audio;e.preload=`auto`;let t=Number(E(C)??`0.5`);(!Number.isFinite(t)||t<0||t>1)&&(t=.5);let n=E(w)===`1`,r=[],i=null,a=!1,o=!1,s=0,c=document.createElement(`div`);c.className=`music-dock`,c.innerHTML=`
    <span class="music-label">${T.music}</span>
    <button type="button" class="music-mute"></button>
    <input type="range" class="music-volume" min="0" max="1" step="0.01" aria-label="${T.volume}">`,document.body.appendChild(c);let l=c.querySelector(`.music-mute`),u=c.querySelector(`.music-volume`);function d(){e.volume=t,e.muted=n||t===0,u.value=String(t),u.style.setProperty(`--fill`,`${Math.round(t*100)}%`);let r=n||t===0;l.innerHTML=r?de:ue,l.setAttribute(`aria-label`,r?T.unmute:T.mute),l.setAttribute(`aria-pressed`,String(r)),c.classList.toggle(`is-muted`,r)}function f(){r.length===0&&(r=O(i)),i=r.shift(),e.src=i,o&&a&&!document.hidden&&e.play().catch(()=>{})}e.addEventListener(`ended`,()=>{s=0,f()}),e.addEventListener(`playing`,()=>{s=0}),e.addEventListener(`error`,()=>{++s<S.length&&f()});function p(){o&&a&&!document.hidden?i?e.paused&&e.play().catch(()=>{}):f():e.pause()}let m=()=>{a||(a=!0,p())};return window.addEventListener(`pointerdown`,m),window.addEventListener(`keydown`,m),l.addEventListener(`click`,()=>{!n&&t===0?t=.5:n=!n,D(w,n?`1`:`0`),D(C,String(t)),d()}),u.addEventListener(`input`,()=>{t=Number(u.value),t>0&&n&&(n=!1,D(w,`0`)),D(C,String(t)),d()}),document.addEventListener(`visibilitychange`,p),d(),{setPlaying(e){e!==o&&(o=e,p())}}}function k(e,t,n,r,i){let a=[],o=Math.PI/i,s=-Math.PI/2;for(let c=0;c<i*2;c++){let i=c%2==0?n:r,l=s+c*o;a.push({x:e+i*Math.cos(l),y:t+i*Math.sin(l)})}return a}function pe(e,t,n,r){let i=[],a=2*Math.PI/r,o=-Math.PI/2;for(let s=0;s<r;s++){let r=o+s*a;i.push({x:e+n*Math.cos(r),y:t+n*Math.sin(r)})}return i}function A(e){return e.map(e=>`${e.x.toFixed(2)},${e.y.toFixed(2)}`).join(` `)}function me(e,t,n=0){let r=32.5,i=``;switch(e){case`CIRCLE`:i=`<circle cx="50" cy="50" r="${r}" fill="${t}" />`;break;case`SQUARE`:{let e=23.35.toFixed(2),n=23.35.toFixed(2),r=53.3.toFixed(2);i=`<rect x="${e}" y="${n}" width="${r}" height="${r}" fill="${t}" />`;break}case`TRIANGLE`:i=`<polygon points="${A([{x:50,y:17.5},{x:78.145,y:66.25},{x:50-r*.866,y:66.25}])}" fill="${t}" />`;break;case`DIAMOND`:i=`<polygon points="${A([{x:50,y:17.5},{x:71.125,y:50},{x:50,y:82.5},{x:50-r*.65,y:50}])}" fill="${t}" />`;break;case`STAR`:i=`<polygon points="${A(k(50,50,r,r*.4,5))}" fill="${t}" />`;break;case`HEXAGON`:i=`<polygon points="${A(pe(50,50,r,6))}" fill="${t}" />`}return`<svg class="cell-shape-svg" viewBox="0 0 100 100" aria-hidden="true" focusable="false"><g${n===0?``:` transform="rotate(${n} 50 50)"`}>${i}</g></svg>`}function he(e,t,n,r){e.clearRect(0,0,t,n);let i=t/2,a=n/2,o=Math.min(t,n)/2*.8;e.save(),e.beginPath();for(let t=0;t<6;t++){let n=(r+t*60)*Math.PI/180,s=i+o*Math.cos(n),c=a+o*Math.sin(n);t===0?e.moveTo(s,c):e.lineTo(s,c)}e.closePath(),e.fillStyle=`rgba(0, 230, 118, 0.3)`,e.fill(),e.restore();let s=o*.5;e.save(),e.beginPath();for(let t=0;t<10;t++){let n=t%2==0?s:s*.4,o=(-r*1.5+t*36)*Math.PI/180,c=i+n*Math.cos(o),l=a+n*Math.sin(o);t===0?e.moveTo(c,l):e.lineTo(c,l)}e.closePath(),e.fillStyle=`rgba(255, 234, 0, 0.6)`,e.fill(),e.restore()}var ge=fe(),j=x();document.documentElement.lang=j;var M=se(j),N=new b({repository:new m}),P=document.getElementById(`app`),F=`HOME`,I=!1,L=!1,R=!1,z=0,B=!1,V=null,H=null,U=null,W=null,G=-1,K=-1,q=null;function _e(){V!==null&&(cancelAnimationFrame(V),V=null)}function J(){H!==null&&(H.disconnect(),H=null)}function Y(e){F=e,I=!1,L=!1,R=!1,$(N.state)}function ve(e,t){if(e.phase===`RESULT`){let n=e.playerSelections.has(t),r=e.mutatedIndices.has(t);return n&&r?`CORRECT`:n&&!r?`WRONG`:!n&&r?`MISSED`:`NONE`}return e.phase===`FINDING`&&e.playerSelections.has(t)?`SELECTED`:`NONE`}function ye(e,t,n){if(n!==`CORRECT`&&n!==`WRONG`&&n!==`MISSED`)return 0;let r=new Set([...e.playerSelections,...e.mutatedIndices]),i=Array.from(r).sort((e,t)=>e-t).indexOf(t);return i>=0?i*150:0}function X(e,t,n){let r=e.getBoundingClientRect();if(r.width<=0||r.height<=0)return;let i=t>=5||n>=5?5:6,a=Math.max(80,r.width-24-(t-1)*i),o=Math.max(80,r.height-24-(n-1)*i),s=Math.max(32,Math.min(Math.floor(a/t),Math.floor(o/n),116)),c=e.querySelector(`.game-grid`);c&&(c.style.setProperty(`--cols`,String(t)),c.style.setProperty(`--rows`,String(n)),c.style.setProperty(`--grid-gap`,`${i}px`),c.style.setProperty(`--cell-size`,`${s}px`))}function be(e){P.innerHTML=`
    <main class="screen home-screen">
      <canvas id="home-logo-canvas" class="logo-canvas" width="240" height="240" aria-hidden="true"></canvas>
      <h1 class="home-title">${M.appTitle}</h1>
      <p class="home-subtitle">${M.homeSubtitle}</p>

      <button type="button" id="btn-play" class="btn-primary">${M.playButton}</button>
      <button type="button" id="btn-how" class="btn-outlined">${M.howToPlayButton}</button>

      ${e.highScore>0?`<p class="home-best-score">${M.bestScore(e.highScore)}</p>`:``}

      <button type="button" id="btn-reset" class="btn-reset">${M.resetProgressButton}</button>
    </main>
    ${Z()}
  `;let t=document.getElementById(`home-logo-canvas`);if(t){let e=t.getContext(`2d`);if(e){let n=window.matchMedia(`(prefers-reduced-motion: reduce)`).matches,r=performance.now(),i=a=>{let o=a-r,s=n?15:o%8e3/8e3*360;he(e,t.width,t.height,s),!n&&F===`HOME`&&(V=requestAnimationFrame(i))};i(r)}}document.getElementById(`btn-play`)?.addEventListener(`click`,()=>{Y(`LEVEL_SELECT`)}),document.getElementById(`btn-how`)?.addEventListener(`click`,()=>{I=!0,$(N.state)}),document.getElementById(`btn-reset`)?.addEventListener(`click`,()=>{L=!0,$(N.state)}),document.getElementById(`btn-dismiss-instructions`)?.addEventListener(`click`,()=>{I=!1,$(N.state)}),document.getElementById(`btn-cancel-reset`)?.addEventListener(`click`,()=>{L=!1,$(N.state)}),document.getElementById(`btn-confirm-reset`)?.addEventListener(`click`,()=>{N.resetProgress(),L=!1,$(N.state)}),document.querySelector(`.modal-backdrop`)?.addEventListener(`click`,e=>{e.target===e.currentTarget&&(I=!1,L=!1,$(N.state))})}function Z(){return I?`
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-how-title">
        <div class="modal-card">
          <h2 id="modal-how-title" class="modal-title">${M.instructionsTitle}</h2>
          <div class="modal-body">
            ${M.instructionsSteps.map(e=>`<p>${e}</p>`).join(``)}
            <p><strong>${M.instructionsMutationsTitle}</strong></p>
            <ul class="modal-list">
              ${M.instructionsMutations.map(e=>`<li>${e}</li>`).join(``)}
            </ul>
            <p>${M.instructionsFooter}</p>
          </div>
          <div class="modal-actions">
            <button type="button" id="btn-dismiss-instructions" class="btn-text">${M.instructionsDismiss}</button>
          </div>
        </div>
      </div>
    `:L?`
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-reset-title">
        <div class="modal-card">
          <h2 id="modal-reset-title" class="modal-title">${M.resetDialogTitle}</h2>
          <div class="modal-body">
            <p>${M.resetDialogBody}</p>
          </div>
          <div class="modal-actions">
            <button type="button" id="btn-cancel-reset" class="btn-text neutral">${M.resetCancel}</button>
            <button type="button" id="btn-confirm-reset" class="btn-text danger">${M.resetConfirm}</button>
          </div>
        </div>
      </div>
    `:``}function xe(e){let t=r.map((t,n)=>{let i=t.subtitle.length>0?M.worldSubtitleMaster:``,a=t.levels.map(t=>{let n=t<e.unlockedLevel,r=!(t<=e.unlockedLevel);return`
          <button
            type="button"
            class="${[`level-btn`,n?`is-completed`:``,r?`is-locked`:``].filter(Boolean).join(` `)}"
            data-level="${t}"
            ${r?`disabled`:``}
            aria-label="${M.levelHeader} ${t}"
          >
            ${r?`<span class="level-lock" aria-hidden="true">&#128274;</span><span class="level-num">${t}</span>`:`${n?`<span class="level-star" aria-hidden="true">&#9733;</span>`:``}<span class="level-num">${t}</span>`}
          </button>
        `}).join(``);return`
      <section class="world-section">
        <div class="world-header">
          <span class="world-title">${M.worldLabel(t.worldNumber)}</span>
          <span class="world-grid-label">${t.gridLabel}</span>
          ${i?`<span class="world-subtitle">${i}</span>`:``}
        </div>
        <div class="world-levels-row">
          ${a}
        </div>
        ${n<r.length-1?`<div class="world-divider"></div>`:``}
      </section>
    `}).join(``);P.innerHTML=`
    <main class="screen">
      <header class="level-select-header">
        <button type="button" id="btn-levels-back" class="icon-btn" aria-label="${M.backAria}">&larr;</button>
        <h1 class="screen-title">${M.levelsTitle}</h1>
      </header>
      ${e.highScore>0?`<p class="levels-best-score">${M.bestScore(e.highScore)}</p>`:`<div style="height: 8px"></div>`}
      <div class="worlds-list">
        ${t}
      </div>
    </main>
  `,document.getElementById(`btn-levels-back`)?.addEventListener(`click`,()=>{Y(`HOME`)}),P.querySelectorAll(`.level-btn:not(:disabled)`).forEach(e=>{e.addEventListener(`click`,()=>{let t=Number.parseInt(e.dataset.level??`1`,10);z=0,F=`GAME`,N.startLevel(t)})})}function Se(e){switch(e){case`MEMORIZING`:return M.phaseMemorize;case`HIDDEN`:return M.phaseHidden;case`FINDING`:return M.phaseFind;case`RESULT`:return M.phaseResult}}function Ce(e){switch(e){case`MEMORIZING`:return`phase-memorizing`;case`HIDDEN`:return`phase-hidden`;case`FINDING`:return`phase-finding`;case`RESULT`:return`phase-result`}}function we(e){let t=e.phase===`MEMORIZING`||e.phase===`HIDDEN`?e.originalGrid:e.mutatedGrid,n=Ce(e.phase),r=e.memorizationTimeMs>0?Math.max(0,Math.min(1,e.timeRemainingMs/e.memorizationTimeMs)):0,i=[0,1,2].map(t=>{let n=t<e.lives,r=e.phase===`RESULT`&&K>e.lives&&t>=e.lives&&t<K;return`<span class="${[`heart-icon`,n?`is-active`:`is-inactive`,r?`just-lost`:``].filter(Boolean).join(` `)}" aria-hidden="true">&#10084;</span>`}).join(``),a=e.phase===`HIDDEN`||e.isPaused,o=t.map((t,n)=>{let r=ve(e,n),i=ye(e,n,r),o=Math.floor(n/e.gridColumns)+1,s=n%e.gridColumns+1,c=e.playerSelections.has(n),l=[`game-cell`,r===`SELECTED`?`is-selected`:``,r===`CORRECT`?`result-correct`:``,r===`WRONG`?`result-wrong`:``,r===`MISSED`?`result-missed`:``].filter(Boolean).join(` `),u=i>0?` style="--reveal-delay: ${i}ms"`:``;return`
        <button
          type="button"
          class="${l}"
          data-cell-index="${n}"
          aria-disabled="${e.phase!==`FINDING`||e.isPaused?`true`:`false`}"
          aria-label="${M.cellAria(o,s,c)}"
          aria-pressed="${c?`true`:`false`}"${u}
        >
          ${a?``:me(t.shape,t.color,t.rotation)}
        </button>
      `}).join(``);P.innerHTML=`
    <main class="screen game-screen">
      <header class="game-topbar">
        <div class="topbar-left">
          <button type="button" id="btn-game-back" class="icon-btn" aria-label="${M.backAria}">&larr;</button>
          <div class="stat-block">
            <span class="stat-label">${M.levelHeader}</span>
            <span class="stat-value-level">${e.level}</span>
          </div>
        </div>

        <div class="topbar-center">
          <div class="hearts-row" aria-label="Lives: ${e.lives}">
            ${i}
          </div>
        </div>

        <div class="topbar-right">
          <button type="button" id="btn-game-pause" class="pause-btn" aria-label="${M.pauseAria}" title="${M.pauseAria}">&#10074;&#10074;</button>
          <div class="stat-block align-end">
            <span class="stat-label">${M.scoreHeader}</span>
            <span class="stat-value-score">${e.score}</span>
          </div>
        </div>
      </header>

      <div class="timer-slot">
        ${e.phase===`MEMORIZING`?`<div class="timer-track"><div id="timer-fill" class="timer-fill" style="transform: scaleX(${r.toFixed(4)})"></div></div>`:``}
      </div>

      <div class="phase-label ${n}">${Se(e.phase)}</div>

      <div id="grid-stage" class="grid-stage ${n}">
        <div
          class="game-grid ${a?`is-hidden`:``}"
          style="--cols: ${e.gridColumns}; --rows: ${e.gridRows};"
        >
          ${o}
        </div>
        ${e.phase===`HIDDEN`?`<div class="hidden-dots" aria-hidden="true">...</div>`:``}
      </div>

      <footer class="game-bottom">
        ${e.phase===`FINDING`?`
              ${e.showHint?`<p class="hint-text">${M.level1Hint}</p>`:``}
              <p class="touches-text">${M.remainingTouches(e.remainingTouches)}</p>
              <button
                type="button"
                id="btn-done"
                class="btn-primary btn-done"
                ${e.playerSelections.size===0?`disabled`:``}
              >${M.doneButton}</button>
              <p class="keyboard-hint">${M.keyboardHint}</p>
            `:``}
      </footer>
    </main>
    ${Te(e)}
  `;let s=document.getElementById(`grid-stage`);if(s&&(X(s,e.gridColumns,e.gridRows),J(),typeof ResizeObserver<`u`&&(H=new ResizeObserver(()=>{X(s,e.gridColumns,e.gridRows)}),H.observe(s))),document.getElementById(`btn-game-back`)?.addEventListener(`click`,()=>{Q(e)}),document.getElementById(`btn-game-pause`)?.addEventListener(`click`,()=>{N.togglePause()}),document.getElementById(`btn-done`)?.addEventListener(`click`,()=>{N.onDonePressed()}),P.querySelectorAll(`.game-cell`).forEach(e=>{e.addEventListener(`click`,()=>{let t=Number.parseInt(e.dataset.cellIndex??`0`,10);z=t,N.onCellTapped(t)})}),B&&!e.isPaused&&!R&&e.phase===`FINDING`){let e=Math.max(0,Math.min(t.length-1,z));P.querySelector(`.game-cell[data-cell-index="${e}"]`)?.focus()}document.getElementById(`btn-resume-game`)?.addEventListener(`click`,()=>{N.resume()}),document.getElementById(`btn-exit-from-pause`)?.addEventListener(`click`,()=>{N.stopGame(),Y(`LEVEL_SELECT`)}),document.getElementById(`btn-cancel-exit`)?.addEventListener(`click`,()=>{R=!1,N.resume(),$(N.state)}),document.getElementById(`btn-confirm-exit`)?.addEventListener(`click`,()=>{R=!1,N.stopGame(),Y(`LEVEL_SELECT`)})}function Q(e){e.phase===`RESULT`?(N.stopGame(),Y(`LEVEL_SELECT`)):(N.pause(),R=!0,$(N.state))}function Te(e){return R?`
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-exit-title">
        <div class="modal-card">
          <h2 id="modal-exit-title" class="modal-title">${M.exitDialogTitle}</h2>
          <div class="modal-body">
            <p>${M.exitDialogBody}</p>
          </div>
          <div class="modal-actions">
            <button type="button" id="btn-cancel-exit" class="btn-text neutral">${M.exitCancel}</button>
            <button type="button" id="btn-confirm-exit" class="btn-text danger">${M.exitConfirm}</button>
          </div>
        </div>
      </div>
    `:e.isPaused?`
      <div class="modal-backdrop" role="dialog" aria-modal="true" aria-labelledby="modal-pause-title">
        <div class="modal-card">
          <h2 id="modal-pause-title" class="modal-title">${M.pauseDialogTitle}</h2>
          <div class="modal-body">
            <p>${M.pauseDialogBody}</p>
          </div>
          <div class="modal-actions">
            <button type="button" id="btn-exit-from-pause" class="btn-text danger">${M.pauseExit}</button>
            <button type="button" id="btn-resume-game" class="btn-text">${M.pauseResume}</button>
          </div>
        </div>
      </div>
    `:``}function Ee(e){let t=e.score>=e.highScore&&e.score>0;P.innerHTML=`
    <main class="screen gameover-screen">
      <h1 class="gameover-title">${M.gameOverTitle}</h1>

      <p class="gameover-label">${M.levelReached}</p>
      <p class="gameover-level-val">${e.level}</p>

      <p class="gameover-label">${M.scoreLabel}</p>
      <p class="gameover-score-val">${e.score}</p>

      <p class="gameover-best">${M.bestLabel(e.highScore)}</p>
      ${t?`<p class="gameover-new-record">${M.newRecord}</p>`:``}

      <div class="gameover-actions">
        <button type="button" id="btn-retry" class="btn-primary">${M.retryButton}</button>
        <button type="button" id="btn-levels" class="btn-surface">${M.levelsButton}</button>
      </div>
    </main>
  `,document.getElementById(`btn-retry`)?.addEventListener(`click`,()=>{z=0,F=`GAME`,N.startLevel(e.level)}),document.getElementById(`btn-levels`)?.addEventListener(`click`,()=>{Y(`LEVEL_SELECT`)})}function $(e){switch(e.isGameOver&&F===`GAME`&&(F=`GAME_OVER`),F!==`HOME`&&_e(),F!==`GAME`&&J(),F){case`HOME`:be(e);break;case`LEVEL_SELECT`:xe(e);break;case`GAME`:we(e);break;case`GAME_OVER`:Ee(e)}U=F,W=e.phase,G=e.level,K=e.lives,q=e.originalGrid,ge.setPlaying(F===`GAME`&&!e.isPaused&&!e.isGameOver)}N.subscribe(e=>{if(e.isGameOver&&F===`GAME`)$(e);else{if(F===`GAME`&&U===`GAME`&&e.phase===`MEMORIZING`&&W===`MEMORIZING`&&e.level===G&&e.originalGrid===q&&!e.isPaused&&!R){let t=document.getElementById(`timer-fill`);if(t&&e.memorizationTimeMs>0){let n=Math.max(0,Math.min(1,e.timeRemainingMs/e.memorizationTimeMs));t.style.transform=`scaleX(${n.toFixed(4)})`;return}}$(e)}}),window.addEventListener(`pointerdown`,()=>{B=!1}),window.addEventListener(`keydown`,e=>{let t=N.state;if(e.key===`Escape`){if(I||L){I=!1,L=!1,$(t);return}if(F===`GAME`){R?(R=!1,N.resume(),$(N.state)):t.isPaused?N.resume():Q(t);return}if(F===`LEVEL_SELECT`){Y(`HOME`);return}}if(F!==`GAME`)return;if(e.key===`p`||e.key===`P`){e.preventDefault(),R?(R=!1,N.resume(),$(N.state)):N.togglePause();return}if(t.isPaused||R)return;let n=t.gridColumns,r=t.gridRows;if(!(n*r<=0)){if(e.key===`ArrowRight`||e.key===`ArrowLeft`||e.key===`ArrowDown`||e.key===`ArrowUp`){e.preventDefault(),B=!0;let t=Math.floor(z/n),i=z%n;e.key===`ArrowRight`&&(i=(i+1)%n),e.key===`ArrowLeft`&&(i=(i-1+n)%n),e.key===`ArrowDown`&&(t=(t+1)%r),e.key===`ArrowUp`&&(t=(t-1+r)%r),z=t*n+i,P.querySelector(`.game-cell[data-cell-index="${z}"]`)?.focus()}else if((e.key===`Enter`||e.key===` `)&&t.phase===`FINDING`){B=!0;let t=document.activeElement;(!t||t===document.body||t===P)&&(e.preventDefault(),N.onCellTapped(z))}}}),document.addEventListener(`visibilitychange`,()=>{document.hidden&&F===`GAME`&&N.pause()});