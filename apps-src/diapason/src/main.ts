import {playNote,unlockAudio,buildInlays,centerCurrentFret} from './engine.js';
import {draw,position,hitPosition} from './geometry';
import {translatePage,english} from './i18n';
translatePage();
const select=document.querySelector<HTMLSelectElement>('#view')!;
const pov=document.querySelector<HTMLElement>('#pov')!;
const stage=document.querySelector<HTMLElement>('.pov-stage')!;
const scroller=document.querySelector<HTMLElement>('.pov-scroll')!;
const canvas=document.querySelector<HTMLCanvasElement>('#guitar')!;
const flat=document.querySelector<HTMLElement>('#fretboard-scroll')!;
const hint=document.querySelector<HTMLElement>('#fretboard-hint')!;
const positions=document.querySelector<HTMLElement>('#positions')!;
let preview:[number,number]|null=null,previous='';
const stored=(key:string)=>{try{return localStorage.getItem(key)}catch{return null}};
const save=(key:string,value:string)=>{try{localStorage.setItem(key,value)}catch{}};
select.value=stored('storm-diapason-view')==='flat'?'flat':'pov';
function current():[number,number]|null {
 const el=document.querySelector('.pdot.on');if(!el)return null;
 const [,s,f]=el.id.split('-');return [+s,+f];
}
function paint(){draw(canvas,current(),preview)}
function sync(){
 const playing=(document.querySelector<HTMLElement>('#setup-card')!).hidden;
 const show=playing&&select.value==='pov';
 pov.hidden=!show;flat.classList.toggle('view-hidden',select.value==='pov');hint.classList.toggle('view-hidden',select.value==='pov');
 if(playing&&!show){buildInlays();centerCurrentFret('auto');}
 if(show){
  const active=current(),key=active?.join('-')||'';
  if(key!==previous){preview=null;previous=key;positions.querySelectorAll('button').forEach(b=>b.setAttribute('aria-current',String(b.dataset.position===key)));if(active){const p=position(...active);scroller.scrollTo({left:Math.max(0,p.x*stage.clientWidth/1100-scroller.clientWidth/2),behavior:'instant'});}}
  paint();
 }
}
for(let s=0;s<6;s++)for(let f=0;f<=12;f++){
 const b=document.createElement('button'),p=position(s,f);b.className='position';b.dataset.position=`${s}-${f}`;
 b.style.left=`${p.x/11}%`;b.style.top=`${p.y/4.6}%`;
 b.setAttribute('aria-label',english?`String ${s+1}, fret ${f}. Play note`:`Cuerda ${s+1}, traste ${f}. Escuchar nota`);
 b.tabIndex=s===0&&f===0?0:-1;
 b.onclick=()=>audition(s,f);
 b.onkeydown=e=>{let ns=s,nf=f;if(e.key==='ArrowLeft')nf--;else if(e.key==='ArrowRight')nf++;else if(e.key==='ArrowUp')ns++;else if(e.key==='ArrowDown')ns--;else return;e.preventDefault();ns=Math.max(0,Math.min(5,ns));nf=Math.max(0,Math.min(12,nf));b.tabIndex=-1;const target=positions.querySelector<HTMLButtonElement>(`[data-position="${ns}-${nf}"]`)!;target.tabIndex=0;target.focus();};
 positions.append(b);
}
function audition(s:number,f:number){unlockAudio();playNote(s,f);preview=[s,f];paint();}
canvas.addEventListener('click',e=>{const r=canvas.getBoundingClientRect();const hit=hitPosition({x:(e.clientX-r.left)*1100/r.width,y:(e.clientY-r.top)*460/r.height});if(hit)audition(...hit);});
select.addEventListener('change',()=>{save('storm-diapason-view',select.value);previous='';sync();});
// Observe only the engine’s state nodes, never our own rendered tree.
new MutationObserver(sync).observe(document.querySelector('#neck')!,{subtree:true,attributes:true,attributeFilter:['class']});
new MutationObserver(sync).observe(document.querySelector('#setup-card')!,{attributes:true,attributeFilter:['hidden']});
new ResizeObserver(()=>{if(!pov.hidden)paint()}).observe(stage);
const instructions=document.createElement('p');instructions.className='keyboard-pov';instructions.textContent=english?'Keyboard: focus the fretboard, use arrow keys, then Enter to listen.':'Teclado: enfoca el mástil, usa las flechas y pulsa Enter para escuchar.';pov.append(instructions);
// Restore settings through the same controls used by the player.
for(const [key,selector] of [['notation','.mbtn'],['game-mode','.setup-option']] as const){const value=stored('storm-diapason-'+key);document.querySelectorAll<HTMLButtonElement>(selector).forEach(b=>{if((b.dataset.mode||b.dataset.gameMode)===value)b.click();b.addEventListener('click',()=>save('storm-diapason-'+key,b.dataset.mode||b.dataset.gameMode||''));});}
const time=document.querySelector<HTMLSelectElement>('#time-limit')!;
const seconds=Number(stored('storm-diapason-time'));if(seconds>=5&&seconds<=20){time.value=String(seconds);time.dispatchEvent(new Event('change'));}
time.addEventListener('change',()=>save('storm-diapason-time',time.value));
try{const progress=JSON.parse(stored('storm-diapason-progress')||'null');if(progress&&Number.isInteger(progress.total)&&progress.total>0){const p=document.createElement('p');p.className='last-session';p.textContent=english?`Last saved session: ${progress.hits}/${progress.total} correct.`:`Última sesión guardada: ${progress.hits}/${progress.total} correctas.`;document.querySelector('#setup-card')!.append(p);}}catch{}
sync();
