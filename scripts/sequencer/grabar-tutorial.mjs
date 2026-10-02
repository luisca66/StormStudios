#!/usr/bin/env node
import { chromium } from '@playwright/test';
import { readFile, writeFile, mkdir, access, stat, unlink } from 'node:fs/promises';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { concatFile, srtTime } from './video-utils.mjs';
import {measureTutorialOnset,measureTutorialMarker} from './tutorial-sync.mjs';
import {PCM_WORKLET_SOURCE,installAudioCapture,writeCapturedPCM,inspectAudio,findPCMOnset,REQUIRED_AUDIO_CLIPS} from './tutorial-audio.mjs';

const sleep = ms => new Promise(r => setTimeout(r, Math.max(0, ms)));
const exists=async f=>{try{await access(f);return true;}catch{return false;}};
async function run(cmd, args) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, args, { windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    p.stdout.on('data', d => stdout += d); p.stderr.on('data', d => stderr += d);
    p.on('error', reject); p.on('close', c => c ? reject(new Error(`${cmd}: ${stderr.slice(-5000)}`)) : resolve({ stdout, stderr }));
  });
}
const ff = args => run('ffmpeg', ['-hide_banner', '-loglevel', 'warning', '-y', ...args]);
const probe = async f => JSON.parse((await run('ffprobe', ['-v', 'error', '-show_format', '-show_streams', '-of', 'json', f])).stdout);

// Recording-only decorations. No application components or musical state are changed.
function decorations() {
  if (!document.body || document.getElementById('tutorial-cursor')) return;
  const style = document.createElement('style');
  style.textContent = `nextjs-portal{display:none!important} #tutorial-cursor{position:fixed;left:0;top:0;width:27px;height:34px;z-index:2147483647;pointer-events:none;filter:drop-shadow(0 1px 2px #0009)} .tutorial-badge{position:fixed;bottom:28px;left:50%;transform:translateX(-50%);background:#172038ed;color:white;padding:12px 24px;border:1px solid #a78bfa;border-radius:12px;font:600 24px system-ui;z-index:2147483646;pointer-events:none} .tutorial-highlight{position:fixed;border:3px solid #8b5cf6;border-radius:14px;box-shadow:0 0 24px #8b5cf6aa,0 0 0 9999px #00000059;z-index:2147483644;pointer-events:none;transition:opacity .3s} .tutorial-ring{position:fixed;width:38px;height:38px;margin:-19px;border:3px solid #8b5cf6;border-radius:50%;z-index:2147483646;pointer-events:none;animation:tutorial-ring .45s forwards}@keyframes tutorial-ring{to{transform:scale(1.7);opacity:0}}`;
  document.head.append(style);
  style.textContent+=' .tutorial-badge{animation:tutorial-key .16s} @keyframes tutorial-key{0%,50%{background:#8b5cf6}100%{background:#172038ed}}';
  const cursor = document.createElement('div'); cursor.id = 'tutorial-cursor';
  cursor.innerHTML = '<svg viewBox="0 0 27 34"><path d="M2 1 L2 27 L9 21 L15 32 L20 29 L14 18 L24 18 Z" fill="white" stroke="#172038" stroke-width="2"/></svg>';
  document.body.append(cursor);
  window.tutorial = {
    badge(text, ms = 1200) { document.querySelectorAll('.tutorial-badge').forEach(e=>e.remove());const d = document.createElement('div'); d.className = 'tutorial-badge'; d.textContent = text; document.body.append(d); setTimeout(() => d.remove(), ms); },
    ring(x,y,right) { const d = document.createElement('div'); d.className = 'tutorial-ring'; Object.assign(d.style,{left:x+'px',top:y+'px',borderColor:right?'#f59e0b':'#8b5cf6'}); document.body.append(d); setTimeout(()=>d.remove(),500); },
    highlight(box,ms) { const d=document.createElement('div'); d.className='tutorial-highlight';Object.assign(d.style,{left:box.x-7+'px',top:box.y-7+'px',width:box.width+14+'px',height:box.height+14+'px'});document.body.append(d);setTimeout(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),300);},ms); },
    armed:false, onset:null,events:[],nextBadge:null,lastGesture:null,
    cue(gesture,at){clearTimeout(gesture.timer);gesture.timer=setTimeout(()=>{gesture.visualTime=performance.timeOrigin+performance.now();if(gesture.kind==='key')window.tutorial.badge(gesture.badge);else{window.tutorial.ring(gesture.x,gesture.y,gesture.right);if(gesture.ctrl)window.tutorial.badge('Ctrl + clic');}},Math.max(0,at-performance.timeOrigin-performance.now()));},
  };
  // Musical gestures are cued from the output sample clock; silent controls use a 100 ms fallback.
  document.addEventListener('pointerdown',e=>{const gesture={kind:'pointer',time:performance.timeOrigin+performance.now(),x:e.clientX,y:e.clientY,right:e.button===2,ctrl:e.ctrlKey};window.tutorial.lastGesture=gesture;window.tutorial.events.push(gesture);window.tutorial.cue(gesture,gesture.time+100);},true);
  document.addEventListener('pointermove',e=>{if(e.buttons){const gesture={kind:'drag',time:performance.timeOrigin+performance.now(),x:e.clientX,y:e.clientY};window.tutorial.lastGesture=gesture;window.tutorial.events.push(gesture);}},true);
  document.addEventListener('keydown',e=>{if(window.tutorial.nextBadge&&!['Control','Shift','Alt','Meta'].includes(e.key)){const gesture={kind:'key',key:e.key,badge:window.tutorial.nextBadge,time:performance.timeOrigin+performance.now()};window.tutorial.nextBadge=null;window.tutorial.lastGesture=gesture;window.tutorial.events.push(gesture);window.tutorial.cue(gesture,gesture.time+100);}},true);
  // Observe the real audio engine's scheduled onset, including its preload and 80 ms lead.
  for (const type of [AudioBufferSourceNode, OscillatorNode]) {
    const original=type.prototype.start;
    type.prototype.start=function(when=0,...args) {
      if(this.context instanceof AudioContext){const time=performance.timeOrigin+performance.now()+Math.max(0,when-this.context.currentTime)*1000;
        const outputTime=window.tutorialAudio.timeFor(this.context,when),gesture=window.tutorial.lastGesture;
        window.tutorial.events.push({kind:'sound',time,outputTime,playback:window.tutorial.armed,gestureTime:gesture?.time});
        if(!window.tutorial.armed&&gesture&&Number.isFinite(outputTime)&&!gesture.musical){gesture.musical=true;window.tutorial.cue(gesture,outputTime-1000/60);}
        if(window.tutorial.armed && window.tutorial.onset===null)window.tutorial.onset=time;}
      return original.call(this,when,...args);
    };
  }
}

async function calibrateCapture(timeline,work,{previewsOnly=false}={}){
  for(const s of timeline.clips){const errors=[],seen=new Set();s.previewVisualSync=[];
    for(const preview of s.previewSync??[]){if(seen.has(preview.gestureTime))continue;seen.add(preview.gestureTime);
      const gesture=s.browserEvents.find(e=>e.time===preview.gestureTime&&e.kind!=='sound');
      const marker=await measureTutorialMarker(path.join(work,`segment-${s.clip}.mp4`),gesture,s.captureEpoch);
      if(marker.visualTime===null)throw new Error(`Clip ${s.clip}: no se ve la marca de la vista previa`);
      const errorMs=marker.visualTime-preview.audioTime;errors.push(errorMs);s.previewVisualSync.push({...preview,marker,rawErrorMs:errorMs});
    }
    if(!previewsOnly)for(const m of timeline.music.filter(m=>m.clip===s.clip)){
      m.engineStart??=m.start;m.engineEnd??=m.end;
      m.rawStart=s.start+await findPCMOnset(s.sequencerAudio,m.engineStart-s.start);
      m.calibration=await measureTutorialOnset(path.join(work,`segment-${s.clip}.mp4`),m.rawStart-s.start);
      const error=m.calibration.estimatedVisualOnsetErrorMs;
      if(error===null||Math.abs(error)>150)throw new Error(`Clip ${s.clip}: no se pudo medir la sincronía PCM/imagen`);
      errors.push(error);
    }
    if(errors.length&&Math.max(...errors)-Math.min(...errors)>80)throw new Error(`Clip ${s.clip}: las marcas no admiten una alineación común de ±40 ms`);
    s.audioDelayMs=errors.some(e=>Math.abs(e)>35)?(Math.min(...errors)+Math.max(...errors))/2:0;
    if(Math.abs(s.audioDelayMs)>150)throw new Error(`Clip ${s.clip}: retraso de captura excesivo`);
    for(const p of s.previewVisualSync){p.errorMs=p.rawErrorMs-s.audioDelayMs;p.within40ms=Math.abs(p.errorMs)<=40;}
    if(errors.length)console.log(`Sincronía ${s.clip}: ajuste de la pista real ${s.audioDelayMs.toFixed(1)} ms`);
  }
  // Preserve one continuous audio clock across the closing playback; never insert silence at 51/52.
  for(const s of timeline.clips.filter(s=>s.clip>50))s.audioDelayMs=timeline.clips.find(s=>s.clip===50).audioDelayMs;
  if(!previewsOnly)for(const m of timeline.music){const delay=timeline.clips[m.clip-1].audioDelayMs/1000;m.start=m.rawStart+delay;m.end=m.engineEnd+delay;m.captureAudioDelayMs=delay*1000;}
}

async function main() {
  const args=process.argv.slice(2), input=args.shift(), opt={};
  if(!input || input==='--help') { console.log('npm run tutorial -- <plan.json> --clips <dir> --out <dir> [--base http://localhost:3100] [--rehearse] [--assemble]');return; }
  while(args.length) { const k=args.shift(); if(['--rehearse','--rehearse-video','--assemble','--repair-intro'].includes(k))opt[k]=true;else if(['--clips','--out','--base','--instrument'].includes(k))opt[k]=args.shift();else throw new Error(`Opción inválida ${k}`); }
  if(opt['--rehearse-video'])opt['--rehearse']=true;
  if(opt['--repair-intro'])throw new Error('La captura PCM requiere una sesión completa; --repair-intro ya no está disponible.');
  if(opt['--instrument']&&opt['--instrument']!=='Synth')throw new Error('--instrument solo admite Synth para pruebas locales');
  if(!opt['--clips']||!opt['--out'])throw new Error('Faltan --clips y --out');
  const plan=JSON.parse(await readFile(input,'utf8')), clips=path.resolve(opt['--clips']), out=path.resolve(opt['--out']), work=path.join(out,'work');
  const ui={...(plan.locale==='en'?{transport:'Transport',keyboard:'Keyboard note entry',start:'Go to start',play:'Play',stop:'Stop'}:{transport:'Transporte',keyboard:'Escritura con teclado',start:'Ir al inicio',play:'Reproducir',stop:'Detener'}),...plan.ui};
  await mkdir(work,{recursive:true});
  const texts=(await readFile(path.join(clips,'guion-clips.txt'),'utf8')).trim().split(/\r?\n/);
  const table=new Map([...(await readFile(path.join(clips,'Duraciones_Video_Secuenciador.txt'),'utf8')).matchAll(/^\s*\d+\s+(\d+)_Chapter_1\.mp3\s+([\d.]+)/gm)].map(m=>[+m[1],+m[2]]));
  if(texts.length!==plan.clips.length||table.size!==plan.clips.length)throw new Error('Texto, plan y duraciones no coinciden');
  const timeline={duration:0,voiceSeconds:0,clips:[],music:[],capture:'CDP JPEG quality 100, compositor timestamps → CFR 30; static frames held only between compositor updates',substitutions:plan.substitutions};
  for(const entry of plan.clips) {
    const file=path.join(work,`voice-${entry.clip}.wav`);
    if(!opt['--assemble']&&(!await exists(file)||(await stat(file)).mtimeMs<(await stat(path.join(clips,`${entry.clip}_Chapter_1.mp3`))).mtimeMs))await ff(['-i',path.join(clips,`${entry.clip}_Chapter_1.mp3`),'-ar','48000','-ac','2','-c:a','pcm_s16le',file]);
    entry.voice=Number((await probe(file)).format.duration);
    if(Math.abs(entry.voice-table.get(entry.clip))>.002)throw new Error(`Duración clip ${entry.clip}`);
    timeline.voiceSeconds+=entry.voice;
    if(!opt['--assemble']&&(!await exists(path.join(work,`normalized-${entry.clip}.wav`))||(await stat(path.join(work,`normalized-${entry.clip}.wav`))).mtimeMs<(await stat(file)).mtimeMs))await ff(['-i',file,'-af',`loudnorm=I=-16:TP=-1.5:LRA=11,aresample=48000,apad,atrim=end_sample=${Math.round(entry.voice*48000)}`,'-ac','2','-c:a','pcm_s16le',path.join(work,`normalized-${entry.clip}.wav`)]);
  }
  let server, browser, workletFile;
  try {
    if(!opt['--assemble']) {
      const previous=opt['--repair-intro']?JSON.parse(await readFile(path.join(work,'recording.json'),'utf8')):null;
      const workletName=`tutorial-pcm-${process.pid}.js`;workletFile=path.resolve('public/vendor',workletName);
      if(await exists(workletFile))throw new Error('Ya existe el archivo temporal del worklet');
      await writeFile(workletFile,PCM_WORKLET_SOURCE);
      const base=opt['--base']??'http://localhost:3100';
      try { await fetch(base); } catch {
        server=spawn(process.execPath,['node_modules/next/dist/bin/next','dev','--port','3100'],{windowsHide:true,stdio:'ignore'});
        for(let i=0;i<90;i++){await sleep(1000);try{await fetch(base);break;}catch{if(i===89)throw new Error('Servidor no disponible');}}
      }
      browser=await chromium.launch({headless:true,args:['--autoplay-policy=no-user-gesture-required']});
      const context=await browser.newContext({viewport:{width:1920,height:1080},deviceScaleFactor:1,acceptDownloads:true});
      const page=await context.newPage();page.setDefaultTimeout(12000);page.on('dialog',d=>d.accept());
      page.on('console',m=>{if(m.type()==='error')console.error('Chromium:',m.text().slice(0,500));});
      page.on('requestfailed',r=>console.error('Petición fallida:',r.url(),r.failure()?.errorText));
      const audioChunks=[];
      await page.exposeBinding('tutorialPCM',(_source,data)=>{audioChunks.push({time:data.time,pcm:Buffer.from(data.pcm,'base64')});});
      await page.addInitScript(installAudioCapture,{url:'/vendor/'+workletName});
      await page.addInitScript(decorations);
      await page.goto(base+plan.startUrl);await page.evaluate(decorations);await page.waitForTimeout(1500);
      const cdp=await context.newCDPSession(page);
      let cursor={x:950,y:160},record=null,frame=0,writes=[];
      cdp.on('Page.screencastFrame', event=>{
        void cdp.send('Page.screencastFrameAck',{sessionId:event.sessionId});
        if(!record)return;
        const f=path.join(record.dir,`${String(frame++).padStart(6,'0')}.jpg`);
        record.frames.push({file:f,time:event.metadata.timestamp*1000});
        writes.push(writeFile(f,Buffer.from(event.data,'base64')));
      });
      const loc=t=>t.css?page.locator(t.css).first():t.role?page.getByRole(t.role,{name:t.name,exact:true}).first():page.getByLabel(t.label,{exact:true}).first();
      async function point(t) {
        if(t.roll){const p=await point({css:`[data-pitch="${t.roll.pitch}"]`,fx:0});return{x:p.x+((t.roll.measure-1)*4+t.roll.beat-1)*48+1,y:p.y};}
        if(t.staff) {
          const el=page.locator(`[data-measure="${t.staff.measure}"] svg`);await el.scrollIntoViewIfNeeded();
          return el.evaluate((svg,t)=>{
            const b=svg.getBoundingClientRect(),scale=b.width/svg.viewBox.baseVal.width;
            const head=svg.querySelector(`[data-note-pitch="${t.pitch}"] text`);
            if(head){const m=head.getScreenCTM();return{x:m.a*Number(head.getAttribute('x'))+m.e+6*scale,y:m.d*Number(head.getAttribute('y'))+m.f};}
            const anchor=svg.querySelector('[data-event-start] .vf-notehead text');
            const am=anchor?.getScreenCTM();const x=am?am.a*Number(anchor.getAttribute('x'))+am.e+6*scale:b.x+(.2*b.width);
            const step=Number(t.pitch.match(/\d+$/)[0])*7+'CDEFGAB'.indexOf(t.pitch[0]);
            return{x,y:b.y+(54+(38-step)*5)*scale};
          },t.staff);
        }
        const l=loc(t);await l.evaluate((e,transport)=>{
          if(e.closest(`[role="group"][aria-label="${transport}"]`)){const b=e.getBoundingClientRect();if(b.top>=0&&b.bottom<=innerHeight)return;}
          const roll=e.closest('[data-testid="piano-roll"]');
          if(roll&&e!==roll){const b=e.getBoundingClientRect(),r=roll.getBoundingClientRect();roll.scrollTop+=b.top-r.top-Math.min(200,roll.clientHeight/2);}
          const b=e.getBoundingClientRect();
          if(b.top<270||b.bottom>innerHeight-30||b.left<0||b.right>innerWidth)e.scrollIntoView({block:'center',inline:'center'});
        },ui.transport);const b=await l.boundingBox();if(!b)throw new Error(`Sin geometría ${JSON.stringify(t)}`);
        return{x:b.x+(t.fx??.5)*b.width,y:b.y+(t.fy??.5)*b.height};
      }
      async function move(p,duration=420) {
        const from={...cursor},steps=opt['--rehearse']?1:24;
        const positions=Array.from({length:steps+1},(_,i)=>{const u=i/steps,s=u*u*(3-2*u);return{x:from.x+(p.x-from.x)*s,y:from.y+(p.y-from.y)*s,offset:u};});
        await page.evaluate(({positions,duration})=>{
          const el=document.getElementById('tutorial-cursor');el.getAnimations().forEach(a=>a.cancel());
          el.animate(positions.map(p=>({transform:`translate(${p.x}px,${p.y}px)`,offset:p.offset})),{duration,fill:'forwards'});
        },{positions,duration:opt['--rehearse']?1:duration});
        const began=Date.now();
        for(let i=1;i<=steps;i++){if(!opt['--rehearse'])await sleep(began+duration*i/steps-Date.now());cursor=positions[i];await page.mouse.move(cursor.x,cursor.y);}
        await page.evaluate(p=>{const el=document.getElementById('tutorial-cursor');el.style.transform=`translate(${p.x}px,${p.y}px)`;el.getAnimations().forEach(a=>a.cancel());},p);
      }
      async function click(t,right=false,ctrl=false) {
        const p=await point(t);await move(p);if(ctrl)await page.keyboard.down('Control');
        if(t.role||t.label)await loc(t).click({button:right?'right':'left'});else await page.mouse.click(p.x,p.y,{button:right?'right':'left'});
        if(ctrl)await page.keyboard.up('Control');
      }
      async function key(k,badge) {
        await page.getByRole('region',{name:ui.keyboard,exact:true}).focus();
        await page.evaluate(s=>{window.tutorial.nextBadge=s;},badge??({'Space':'Espacio','PageUp':'Re Pág','PageDown':'Av Pág','ArrowLeft':'←','ArrowRight':'→','ArrowUp':'↑','ArrowDown':'↓'}[k]??k.replace('Control','Ctrl').replaceAll('+',' + ')));
        await page.keyboard.press(k);
      }
      let activeMusic, continuityEpoch;
      for(const entry of plan.clips) {
        const n=entry.clip,prefix=n===1?1.5:.4;
        if(n===30)await page.evaluate(()=>{const workspace=document.querySelector('[data-testid="score-view"]').closest('[class*="workspace"]');workspace.dataset.tutorialStyle=workspace.getAttribute('style')??'';Object.assign(workspace.style,{position:'sticky',top:'260px',maxHeight:'750px',overflow:'auto'});});
        if(entry.prepare)for(const a of entry.prepare)await action(a);
        const dir=path.join(work,`capture-${n}`);await mkdir(dir,{recursive:true});
        const start=continuityEpoch??Date.now();continuityEpoch=undefined;
        if(n!==51&&n!==52){frame=0;writes=[];record={dir,frames:[]};}
        if((!opt['--rehearse']||opt['--rehearse-video'])&&n!==51&&n!==52) {
          await page.screenshot({path:path.join(dir,'initial.jpg'),type:'jpeg',quality:100});record.frames.push({file:path.join(dir,'initial.jpg'),time:start});
          await cdp.send('Page.startScreencast',{format:'jpeg',quality:100,maxWidth:1920,maxHeight:1080,everyNthFrame:1});
        }
        const seg={clip:n,start:timeline.duration,voiceStart:timeline.duration+prefix,voiceEnd:timeline.duration+prefix+entry.voice,actions:[],music:[],captureEpoch:start,source:path.join(clips,`${n}_Chapter_1.mp3`)};
        async function action(a) {
          if(a.op==='click'||a.op==='ctrlClick'||a.op==='rightClick')await click(a.target,a.op==='rightClick',a.op==='ctrlClick');
          else if(a.op==='audition'){const p=await point(a.target);await move(p);await page.mouse.down();await sleep(350);await page.mouse.up();}
          else if(a.op==='setField'){await loc(a.target).fill(a.text);await loc(a.target).blur();}
          else if(a.op==='warmAudio'){
            const original=await page.evaluate(()=>window.stormSequencer.getScore()),warm=structuredClone(original);
            warm.voices[0].events=[['B3','C4','C#4','D4','Eb4','E4','F4'],['F#4','G4','G#4','A4','Bb4','B4','C5']].map((pitches,i)=>({id:`tutorial-warm-${i}`,start:i*960,duration:'q',dotted:false,triplet:false,tie:false,pitches}));
            await page.evaluate(s=>window.stormSequencer.loadScore(s),warm);await page.waitForTimeout(100);
            await page.evaluate(()=>{window.tutorial.armed=true;window.tutorial.onset=null;});
            await page.getByRole('button',{name:ui.play,exact:true}).click();
            await page.waitForFunction(()=>window.tutorial.onset!==null,{},{timeout:90000});
            await page.getByRole('button',{name:ui.stop,exact:true}).click();
            await page.evaluate(s=>{window.tutorial.armed=false;window.stormSequencer.loadScore(s);},original);
            await page.evaluate(()=>window.tutorialAudio.flush());await page.waitForTimeout(100);
          }
          else if(a.op==='move')await move(await point(a.target));
          else if(a.op==='key')await key(a.key,a.badge);
          else if(a.op==='badge')await page.evaluate(s=>window.tutorial.badge(s),a.text);
          else if(a.op==='highlight'){const l=loc(a.target);let box=await l.boundingBox();if(a.align==='bottom'){await l.evaluate(e=>scrollBy(0,e.getBoundingClientRect().bottom-innerHeight+30));box=await l.boundingBox();}else if(box.y>1050||box.y<80){await l.evaluate(e=>e.scrollIntoView({block:'center'}));box=await l.boundingBox();}box.height=Math.min(box.height,1040-box.y);await page.evaluate(({box,ms})=>window.tutorial.highlight(box,ms),{box,ms:a.ms??2400});}
          else if(a.op==='type'){await click(a.target);await loc(a.target).fill(a.text);await page.keyboard.press('Enter');}
          else if(a.op==='select'){await click(a.target);await loc(a.target).selectOption(a.value);}
          else if(a.op==='drag'){
            const p=await point(a.target),q=a.to?await point(a.to):{x:p.x+(a.dx??0),y:p.y+(a.dy??0)};
            await move(p);await page.mouse.down();if(opt['--rehearse'])await sleep(200);await move(q,550);if(opt['--rehearse'])await sleep(200);await page.mouse.up();
          }
          else if(a.op==='scroll'){
            const y=a.target?await loc(a.target).evaluate((e,block)=>{const b=e.getBoundingClientRect();return scrollY+b.top-(block==='end'?innerHeight-b.height:block==='start'?0:(innerHeight-b.height)/2);},a.block??'center'):a.y;
            await page.evaluate(({y,ms})=>new Promise(r=>{const from=scrollY,start=performance.now(),to=Math.max(0,y==='bottom'?document.documentElement.scrollHeight-innerHeight:Number(y));function step(t){const u=Math.min(1,(t-start)/ms);scrollTo(0,from+(to-from)*(u*u*(3-2*u)));if(u<1)requestAnimationFrame(step);else r();}requestAnimationFrame(step);}),{y,ms:opt['--rehearse']?1:a.ms??2000});
          }
          else if(a.op==='goto'){await click(a.target);await page.waitForFunction(()=>!!window.stormSequencer);await page.evaluate(decorations);await page.evaluate(instrument=>{const s=window.stormSequencer.getScore();s.tempo=72;s.voices[0].instrument=instrument??'Piano';window.stormSequencer.loadScore(s);},opt['--instrument']??null);await page.waitForTimeout(300);}
          else if(a.op==='loadProject'){const project=JSON.parse(await readFile(path.resolve(path.dirname(input),a.file),'utf8'));if(opt['--instrument'])for(const v of project.voices)v.instrument=opt['--instrument'];await page.evaluate(s=>window.stormSequencer.loadScore(s),project);await page.waitForTimeout(250);if(a.fade)await page.evaluate(()=>{const d=document.createElement('div');Object.assign(d.style,{position:'fixed',inset:'0',background:'black',zIndex:2147483645,transition:'opacity .3s'});document.body.append(d);requestAnimationFrame(()=>{d.style.opacity='0';setTimeout(()=>d.remove(),350);});});}
          else if(a.op==='download'){const pending=page.waitForEvent('download');await click(a.target);const d=await pending;await d.saveAs(path.join(work,d.suggestedFilename()));await page.evaluate(s=>window.tutorial.badge(s+' descargado',1800),d.suggestedFilename());}
          else if(a.op==='open'){const pending=page.waitForEvent('filechooser');await click(a.target);const chooser=await pending;await chooser.setFiles(path.join(work,'storm-project.json'));await page.evaluate(()=>window.tutorial.badge('storm-project.json',1800));}
          else if(a.op==='play'){
            await click({role:'button',name:ui.start});
            await page.evaluate(()=>{window.tutorial.armed=true;window.tutorial.onset=null;});
            if(a.key)await key('Space');else await click({role:'button',name:ui.play});
            await page.waitForFunction(()=>window.tutorial.onset!==null,{},{timeout:90000});
            const onset=await page.evaluate(()=>{window.tutorial.armed=false;return window.tutorial.onset;});
            activeMusic={start:timeline.duration+(onset-start)/1000,sourceStart:0,clip:n};timeline.music.push(activeMusic);seg.music.push(activeMusic);
            if(a.highlight)await action({op:'highlight',target:a.highlight,ms:Math.max(1000,(a.listen??3)*1000-300)});
            if(a.listen)await sleep((opt['--rehearse']?Math.min(a.listen,.5):a.listen)*1000);
            if(a.stop){if(a.stop==='Space')await key('Space');else await click({role:'button',name:ui.stop});activeMusic.end=timeline.duration+(Date.now()-start)/1000;activeMusic=null;}
          }
          else if(a.op==='stop'){await click({role:'button',name:ui.stop});if(activeMusic){activeMusic.end=timeline.duration+(Date.now()-start)/1000;activeMusic=null;}}
          else if(a.op==='wait')await sleep(opt['--rehearse']?10:a.ms);
          else throw new Error(`Acción desconocida: ${a.op}`);
          await page.waitForTimeout(100);
        }
        for(const a of entry.actions) {
          const at=prefix+(a.afterVoice?entry.voice+(a.delay??0):a.at??0);
          if(!opt['--rehearse'])await sleep(start+at*1000-Date.now());
          await action(a);
          const state=await page.evaluate(()=>window.stormSequencer?.getScore()??null);
          if(n<=4&&a.op!=='goto'){seg.courseFraming=await page.evaluate(()=>{const card=document.querySelector('div.ss-glass:has(a[href="/es/sequencer/v4"])').getBoundingClientRect();return{cardTop:card.top,cardBottom:card.bottom,centerError:(card.top+card.bottom-innerHeight)/2,footerTop:document.querySelector('footer').getBoundingClientRect().top,viewportHeight:innerHeight};});if(seg.courseFraming.footerTop<seg.courseFraming.viewportHeight)throw new Error(`Clip ${n}: el pie de página entró en el encuadre`);}
          if(n===4&&a.op==='highlight'){if(Math.abs(seg.courseFraming.centerError)>2)throw new Error('El recuadro del clip 4 no está centrado');await page.screenshot({path:path.join(work,'clip-4-recuadro.png')});}
          if(n===30&&a.op==='highlight'){await page.screenshot({path:path.join(work,'clip-30-tarjeta.png')});seg.cardFraming=await page.evaluate(()=>{const score=document.querySelector('[data-testid="score-view"]').getBoundingClientRect(),card=[...document.querySelectorAll('section')].find(s=>s.querySelector('h3')?.textContent==='Cambio de armadura, compás o clave').getBoundingClientRect();return{score:{top:score.top,bottom:score.bottom},card:{top:card.top,bottom:card.bottom},fromMeasure:[...document.querySelectorAll('label')].find(l=>l.textContent.startsWith('Desde el compás')).querySelector('input').value};});}
          seg.actions.push({...a,completed:(Date.now()-start)/1000,state});
          const alerts=(await page.getByTestId('sequencer-studio').getByRole('alert').allTextContents()).filter(s=>s.trim());
          if(alerts.length)throw new Error(`Clip ${n}, ${a.op}: ${alerts.join(' ')}`);
        }
        if(opt['--rehearse']&&!opt['--rehearse-video']) {await sleep(250);await page.screenshot({path:path.join(work,`rehearsal-${n}.png`)});seg.end=timeline.duration+(Date.now()-start)/1000;}
        else {
          const baseLength=prefix+entry.voice+.6,elapsed=(Date.now()-start)/1000;
          const musicAllowance=entry.extraMusic??0;
          if(elapsed>baseLength+musicAllowance+2)throw new Error(`Clip ${n}: acciones exceden el máximo (${elapsed.toFixed(2)} s)`);
          const length=opt['--rehearse-video']?Math.ceil((elapsed+.3)*30)/30:Math.ceil(Math.max(baseLength+musicAllowance,elapsed+.25)*30)/30+(n===52?1:0);
          await sleep(start+length*1000-Date.now());const captured=record;
          if(n===50||n===51)continuityEpoch=start+length*1000;
          else {await cdp.send('Page.stopScreencast');record=null;await Promise.all(writes);}
          seg.end=seg.start+length;seg.extension=Math.max(0,length-baseLength-musicAllowance);seg.captureFrames=captured.frames.length;
          const frames=captured.frames.filter(f=>f.time>=start&&f.time<start+length*1000).sort((a,b)=>a.time-b.time);
          frames.unshift({file:n===51||n===52?captured.frames.filter(f=>f.time<=start).at(-1).file:path.join(dir,'initial.jpg'),time:start});
          const list=path.join(dir,'frames.txt');await writeFile(list,'ffconcat version 1.0\n'+frames.map((f,i)=>`${concatFile(f.file)}\noption framerate 1000\nduration ${Math.max(.000001,((frames[i+1]?.time??start+length*1000)-f.time)/1000)}`).join('\n')+'\n'+concatFile(frames.at(-1).file)+'\noption framerate 1000\n');
          seg.frameList=list;
        }
        seg.state=await page.evaluate(()=>window.stormSequencer?.getScore()??null);
        seg.browserEvents=await page.evaluate(({start,end})=>window.tutorial?.events.filter(e=>e.time>=start&&e.time<end).map(e=>{const copy={...e};delete copy.timer;return copy;})??[],{start,end:start+(seg.end-seg.start)*1000});
        seg.previewSync=seg.browserEvents.filter(e=>e.kind==='sound'&&!e.playback&&Number.isFinite(e.outputTime)).map(sound=>{const gesture=seg.browserEvents.find(e=>e.kind!=='sound'&&e.time===sound.gestureTime);const visualTime=gesture?.visualTime;const error=Number.isFinite(visualTime)?sound.outputTime-visualTime:null;return{gesture:gesture?.kind,gestureTime:gesture?.time,visualTime,audioTime:sound.outputTime,errorMs:error,within40ms:error!==null&&Math.abs(error)<=40};});
        if(n===30)await page.evaluate(()=>{const workspace=document.querySelector('[data-testid="score-view"]').closest('[class*="workspace"]');workspace.setAttribute('style',workspace.dataset.tutorialStyle);delete workspace.dataset.tutorialStyle;});
        await page.evaluate(()=>window.tutorialAudio.flush());
        seg.sequencerAudio=path.join(work,`sequencer-${n}.wav`);
        const raw=path.join(work,`sequencer-${n}.f32`);
        await writeCapturedPCM(raw,audioChunks,start,start+(seg.end-seg.start)*1000);
        await ff(['-f','f32le','-ar','48000','-ac','2','-i',raw,'-c:a','pcm_s16le',seg.sequencerAudio]);
        seg.audioCheck=await inspectAudio(seg.sequencerAudio,run);
        audioChunks.splice(0,audioChunks.findLastIndex(c=>c.time<start+(seg.end-seg.start)*1000-100)+1);
        timeline.clips.push(seg);timeline.duration=seg.end;
        await writeFile(path.join(work,opt['--rehearse']?'rehearsal.json':'recording.json'),JSON.stringify(timeline,null,2));
        console.log(`Clip ${n}/52: ${timeline.duration.toFixed(3)} s; ${seg.state?.voices[0].events.length??0} eventos`);
        if(opt['--repair-intro']&&n===4)break;
      }
      if(previous){if(previous.clips.length!==52||Math.abs(previous.clips[4].start-timeline.duration)>1e-6)throw new Error('La reparación alteraría los tiempos posteriores');timeline.clips.push(...previous.clips.slice(4));timeline.music=previous.music;timeline.duration=previous.duration;await writeFile(path.join(work,'recording.json'),JSON.stringify(timeline,null,2));opt['--assemble']=true;}
      await browser.close();browser=null;
      if(opt['--rehearse']){const failed=timeline.clips.filter(s=>REQUIRED_AUDIO_CLIPS.includes(s.clip)&&!s.audioCheck.aboveMinus45);if(failed.length)throw new Error(`Falta audio > −45 dB: clips ${failed.map(s=>s.clip)}`);if(timeline.clips.some(s=>s.previewSync.some(p=>!p.within40ms)))throw new Error('Vista previa fuera de ±40 ms: consultar rehearsal.json');
        if(opt['--rehearse-video']){for(const s of timeline.clips)await ff(['-f','concat','-safe','0','-i',s.frameList,'-t',String(s.end-s.start),'-vf','fps=30,scale=in_range=pc:out_range=tv,format=yuv420p','-c:v','libx264','-preset','veryfast','-crf','18','-an',path.join(work,`segment-${s.clip}.mp4`)]);await calibrateCapture(timeline,work,{previewsOnly:true});await writeFile(path.join(work,'rehearsal.json'),JSON.stringify(timeline,null,2));}
        return;}
    }
    const saved=JSON.parse(await readFile(path.join(work,'recording.json'),'utf8'));
    if(saved.clips.length!==plan.clips.length)throw new Error('Grabación incompleta');
    if(saved.clips.some(s=>s.previewSync?.some(p=>!p.within40ms)))throw new Error('Vista previa fuera de ±40 ms: consultar recording.json');
    for(const s of saved.clips){s.musicExtension=plan.clips[s.clip-1].extraMusic??0;s.fadeSeconds=s.clip===52?1:0;s.extension=Math.max(0,s.end-s.start-(s.clip===1?1.5:.4)-(s.voiceEnd-s.voiceStart)-.6-s.musicExtension-s.fadeSeconds);}
    for(const s of saved.clips){const length=s.end-s.start,file=path.join(work,`segment-${s.clip}.mp4`);
      const cached=opt['--assemble']&&await exists(file)?await probe(file):null;
      const reusable=cached&&(await stat(file)).mtimeMs>=(await stat(s.frameList)).mtimeMs&&Math.abs(Number(cached.format.duration)-length)<.05&&cached.streams[0].pix_fmt==='yuv420p';
      if(!reusable)await ff(['-f','concat','-safe','0','-i',s.frameList,'-t',String(length),'-vf',`fps=30,scale=in_range=pc:out_range=tv,format=yuv420p,setparams=range=limited${s.clip===52?`,fade=t=out:st=${length-1}:d=1`:''}`,'-c:v','libx264','-preset','veryfast','-crf','18','-color_range','tv','-an',file]);console.log(`${reusable?'Reutilizado':'Codificado'} ${s.clip}/52`);}
    for(const m of saved.music)if(!m.end)m.end=saved.duration;
    await calibrateCapture(saved,work);
    for(const s of saved.clips)s.music=saved.music.filter(m=>m.start<s.end&&m.end>s.start);
    const videoList=path.join(work,'videos.txt');await writeFile(videoList,saved.clips.map(s=>concatFile(path.join(work,`segment-${s.clip}.mp4`))).join('\n'));
    const audioList=path.join(work,'audio.txt');
    for(const s of saved.clips)await ff(['-i',path.join(work,`normalized-${s.clip}.wav`),'-af',`adelay=${Math.round((s.voiceStart-s.start)*48000)}S:all=1,apad,atrim=end_sample=${Math.round((s.end-s.start)*48000)}`,'-ar','48000','-ac','2','-c:a','pcm_s16le',path.join(work,`audio-${s.clip}.wav`)]);
    await writeFile(audioList,saved.clips.map(s=>concatFile(path.join(work,`audio-${s.clip}.wav`))).join('\n'));
    const voicesRaw=path.join(work,'voices.wav'),voices=path.join(work,'voices-calibrated.wav');await ff(['-f','concat','-safe','0','-i',audioList,'-c:a','copy',voicesRaw]);
    const voiceAnalysis=await run('ffmpeg',['-hide_banner','-i',voicesRaw,'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-']);
    const voiceLevel=JSON.parse(voiceAnalysis.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);saved.voiceNormalization=voiceLevel;
    await ff(['-i',voicesRaw,'-af',`loudnorm=I=-16:TP=-1.5:LRA=11:measured_I=${voiceLevel.input_i}:measured_TP=${voiceLevel.input_tp}:measured_LRA=${voiceLevel.input_lra}:measured_thresh=${voiceLevel.input_thresh}:offset=${voiceLevel.target_offset}:linear=true,aresample=48000,apad,atrim=end_sample=${Math.round(saved.duration*48000)}`,'-ar','48000','-ac','2','-c:a','pcm_s16le',voices]);
    saved.voiceAudio=voices;
    const sequenceList=path.join(work,'sequencer.txt');
    const groups=[...saved.clips.filter(s=>s.clip<50).map(s=>[s]),saved.clips.filter(s=>s.clip>=50)],groupFiles=[];
    for(const members of groups){const first=members[0],last=members.at(-1),list=path.join(work,`sequence-group-${first.clip}.txt`),file=path.join(work,`sequencer-normalized-${first.clip}.wav`);
      await writeFile(list,members.map(s=>concatFile(s.sequencerAudio)).join('\n'));
      const delay=first.audioDelayMs??0,shift=delay>=0?`adelay=${Math.round(delay*48)}S:all=1`:`atrim=start=${-delay/1000},asetpts=PTS-STARTPTS`;
      const analysis=await run('ffmpeg',['-hide_banner','-f','concat','-safe','0','-i',list,'-af','loudnorm=I=-19:TP=-4.5:LRA=11:print_format=json','-f','null','-']);
      const level=JSON.parse(analysis.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);
      const norm=Number.isFinite(Number(level.input_i))?`loudnorm=I=-19:TP=-4.5:LRA=11:measured_I=${level.input_i}:measured_TP=${level.input_tp}:measured_LRA=${level.input_lra}:measured_thresh=${level.input_thresh}:offset=${level.target_offset}:linear=true`:'anull';
      await ff(['-f','concat','-safe','0','-i',list,'-af',`${norm},aresample=48000,${shift},apad,atrim=end_sample=${Math.round((last.end-first.start)*48000)}`,'-ar','48000','-ac','2','-c:a','pcm_s16le',file]);
      for(const s of members)s.sequencerNormalization=level;
      for(const s of members)s.sequencerMixAudio=file;groupFiles.push(file);}
    await writeFile(sequenceList,groupFiles.map(concatFile).join('\n'));
    const sequence=path.join(work,'sequencer.wav');
    await ff(['-f','concat','-safe','0','-i',sequenceList,'-c:a','copy',sequence]);
    // A bounded envelope: 3.5 dB under narration, 40 ms attack and 150 ms release.
    const duck=saved.clips.map(s=>`max(0,min(1,min((t-${Math.max(0,s.voiceStart-.04)})/.04,(${s.voiceEnd+.15}-t)/.15)))`).join('+');
    const premix=path.join(work,'premix.wav');
    const ducked=path.join(work,'sequencer-ducked.wav');
    await ff(['-i',sequence,'-af',`volume='pow(10,-3.5*min(1,${duck})/20)':eval=frame`,'-c:a','pcm_s16le',ducked]);
    await ff(['-i',voices,'-i',ducked,'-filter_complex','[0:a][1:a]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.8414:level=false:latency=true[out]','-map','[out]','-c:a','pcm_s16le',premix]);
    saved.sequencerDuckedAudio=ducked;
    saved.sequencerAudio=sequence;saved.audioCapture='AudioWorklet stereo PCM 48000 Hz; output sample clock mapped to performance/CDP epoch';
    saved.audioMix={voiceLUFS:-16,sequencerLUFS:-19,duckDb:3.5,attackMs:40,releaseMs:150};
    const analysis=await run('ffmpeg',['-hide_banner','-i',premix,'-af','loudnorm=I=-16:TP=-1.5:LRA=11:print_format=json','-f','null','-']);
    const measured=JSON.parse(analysis.stderr.match(/\{\s*"input_i"[\s\S]*?\}/)[0]);saved.normalization=measured;
    const mp4=path.join(out,'tutorial-secuenciador-v2.mp4');saved.artifacts={mp4:'tutorial-secuenciador-v2.mp4',srt:'tutorial-secuenciador-v2.srt'};
    await ff(['-f','concat','-safe','0','-i',videoList,'-i',premix,'-map','0:v','-map','1:a','-t',String(saved.duration),'-c:v','copy','-af','anull','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',mp4]);
    const info=await probe(mp4),v=info.streams.find(s=>s.codec_type==='video'),a=info.streams.find(s=>s.codec_type==='audio');
    if(v.width!==1920||v.height!==1080||v.r_frame_rate!=='30/1'||v.codec_name!=='h264'||v.pix_fmt!=='yuv420p'||a.codec_name!=='aac'||a.sample_rate!=='48000'||Math.abs(Number(info.format.duration)-saved.duration)>.1)throw new Error('Formato/duración incorrectos');
    saved.mp4Duration=Number(info.format.duration);
    await writeFile(path.join(out,'tutorial-secuenciador-v2.srt'),saved.clips.map((s,i)=>`${i+1}\n${srtTime(s.voiceStart)} --> ${srtTime(s.voiceEnd)}\n${texts[i]}\n`).join('\n'));
    await writeFile(path.join(out,'timeline.json'),JSON.stringify(saved,null,2)+'\n');
    const contacts=path.join(work,'contacts');await mkdir(contacts,{recursive:true});
    const font=process.platform==='win32'?`fontfile='${path.join(process.env.WINDIR??'C:/Windows','Fonts','arial.ttf').replaceAll('\\','/').replace(':','\\:')}':`:'';
    for(const s of saved.clips)await ff(['-ss',String((s.voiceStart+s.voiceEnd)/2),'-i',mp4,'-frames:v','1','-vf',`scale=480:270,drawtext=${font}text='${String(s.clip).padStart(2,'0')}':x=10:y=10:fontsize=28:fontcolor=white:box=1:boxcolor=black@0.8`,path.join(contacts,`${String(s.clip).padStart(2,'0')}.png`)]);
    await ff(['-framerate','1','-i',path.join(contacts,'%02d.png'),'-vf','tile=4x13:padding=6:margin=6','-frames:v','1',path.join(out,'hoja-contactos.png')]);
    await writeFile(path.join(out,'timeline.json'),JSON.stringify(saved,null,2)+'\n');console.log(`MP4 verificado: ${saved.duration.toFixed(3)} s`);
  } finally {if(browser)await browser.close();if(server)server.kill();if(workletFile)await unlink(workletFile);}
}
main().catch(e=>{console.error(e.stack);process.exitCode=1;});
