import {mkdir,readFile,writeFile} from 'node:fs/promises';
const dir='content/tutoriales';await mkdir(dir,{recursive:true});
const button=name=>({role:'button',name}),label=label=>({label}),css=css=>({css}),staff=(measure,pitch)=>({staff:{measure,pitch}});
const click=(name,at=0)=>({op:'click',target:button(name),at});
const key=(key,at=0)=>({op:'key',key,at});
const high=(target,at=0,ms=2400)=>({op:'highlight',target,at,ms});
const move=(target,at=0)=>({op:'move',target,at});
const type=(target,text,at=0)=>({op:'type',target,text,at});
const play=(at,listen,stop,extra={})=>({op:'play',at,listen,stop,...extra});
const clips=Array.from({length:52},(_,i)=>({clip:i+1,actions:[]}));
const set=(n,...actions)=>clips[n-1].actions=actions;
set(2,{op:'scroll',target:css('div.flex.flex-col.gap-3:has(> a[href^="/es/curso-armonia/"])'),block:'end',ms:6000,at:1});
set(3,{op:'scroll',target:css('div.ss-glass:has(a[href="/es/sequencer/v4"])'),block:'center',ms:5000,at:1});
set(4,high(css('div.ss-glass:has(a[href="/es/sequencer/v4"])'),0,6000),{op:'goto',target:{role:'link',name:'Abrir v4.0 →'},at:7});
clips[4].prepare=[{op:'warmAudio'}];
set(6,high({role:'group',name:'Transporte'},0,11000),...['Reproducir','Detener'].map((n,i)=>move(button(n),1+i*1.7)),move(label('Tempo'),5),move(css('[data-testid="lcd-position"]'),7),move(css('[role="group"][aria-label="Transporte"] label + div'),9),move(label('Cifrado vigente'),11));
set(7,high(css('label:has(input[aria-label="Título del proyecto"])'),0,3500),high(css('label:has(select[aria-label="Modo"])'),4,3500));
set(8,high({role:'group',name:'Archivo'},0,6000),...['Nuevo proyecto','Guardar JSON','Abrir proyecto','Exportar MIDI'].map((n,i)=>move(button(n),i*1.5)));
set(9,high(css('[data-testid="score-view"]'),0,3200),high({role:'group',name:'Herramientas de escritura'},4,4000));set(10,high(label('Inspector musical'),0,7000));
set(11,...['Entera','Mitad','Cuarto','Octavo','Dieciseisavo','Treintaidosavo'].map((n,i)=>move(button('Elegir '+n),i*1.25)),click('Elegir Entera',8));
set(12,click('✎ Escribir'),{op:'click',target:staff(1,'C4'),at:4});
set(13,{op:'click',target:staff(2,'D4'),at:0},{op:'drag',target:staff(2,'D4'),dy:-14,at:3});
set(14,{op:'click',target:staff(2,'F4')},click('Alteración #',2),click('Alteración natural',5),click('Alteración armadura',8));
set(15,{op:'audition',target:staff(2,'F4')},{op:'rightClick',target:staff(2,'F4'),at:1},click('⌫ Borrador',2),click('✎ Escribir',4));set(16,key('Control+z',1),{op:'audition',target:staff(2,'F4'),at:2},key('Control+y',4));
set(17,{op:'ctrlClick',target:staff(1,'E4'),at:4});
set(18,{op:'ctrlClick',target:staff(1,'G4'),at:1},play(0,3.5,'Detener',{afterVoice:true}));clips[17].extraMusic=5;
set(19,{op:'click',target:staff(1,'E4'),at:1},click('Alteración b',4),key('Control+z',8));
clips[19].prepare=[{op:'loadProject',file:'secuenciador-proyecto-1.json',fade:true}];
set(20,play(2,3,'Space'));set(21,play(0,6,'Space',{key:true}));clips[20].extraMusic=2;
set(22,type(label('Tempo'),'60',1),click('Metrónomo',4),click('Repetir reproducción',6),click('Metrónomo',8),click('Repetir reproducción',10));
set(23,click('Ir al final',1),click('Ir al inicio',3));
set(24,click('Escribir con teclado'),click('Ir al compás 5',3));
set(25,key('3',0),key('c',3),key('d',6),key('e',9));
set(26,{op:'audition',target:staff(5,'E4'),at:0},key('4',1),key('3',2),key('ArrowRight',3),key('r',4),key('PageUp',6),key('PageDown',8));
set(27,key('ArrowLeft',0),key('ArrowLeft',1),{op:'click',target:staff(5,'E4'),at:2},key('ArrowUp',4),key('ArrowUp',5),key('ArrowDown',7),key('ArrowDown',8));
set(28,{op:'click',target:css('summary:text-is("Atajos de teclado")'),at:0},{op:'wait',ms:1800},{op:'click',target:css('summary:text-is("Atajos de teclado")'),at:3},{op:'scroll',y:0,ms:1200,at:4});
set(29,click('Añadir compás',3));
set(30,click('Ir al compás 6'),{op:'setField',target:label('Desde el compás'),text:'6',at:.6},{...high(css('section:has(> header > h3:text-is("Cambio de armadura, compás o clave"))'),1,4500),align:'bottom'},{op:'select',target:label('Compás rítmico'),value:'3/4',at:5},key('Control+z',9),{op:'scroll',y:0,ms:600,at:10});
set(31,click('Vista por páginas',1),click('Vista continua',4));
const marquee={op:'drag',target:{css:'[data-measure="1"] svg',fx:.3,fy:.2},to:{css:'[data-measure="2"] svg',fx:.85,fy:.65}};
set(32,click('↖ Seleccionar'),{...marquee,at:2});
set(33,key('Control+c'),click('Ir al compás 6',1),key('Control+v',3),key('Control+z',5),{...marquee,at:6},key('Control+d',8),{op:'badge',text:'Ctrl + X',at:10});
set(34,key('Control+z',0),key('Control+z',2),click('Ir al inicio',4));
set(35,click('Añadir compás',0),click('Piano Roll',2));
set(36,move(css('[data-pitch="C4"]'),0),move(css('[data-testid="piano-roll"] > div > div:first-child'),4),move(css('[data-roll-note]'),8));
set(37,click('✎ Escribir'),click('Elegir Octavo',1),{op:'click',target:{roll:{pitch:'A4',measure:6,beat:1}},at:2});
set(38,{op:'drag',target:{css:'[data-pitch="A4"] [data-roll-note][aria-label$="compás 6"]',fx:.15},dx:48,dy:-52,at:3});
set(39,{op:'drag',target:{css:'[data-pitch="B4"] [data-roll-note][aria-label$="compás 6"]',fx:.98},dx:24,at:2});
set(40,{op:'rightClick',target:css('[data-pitch="B4"] [data-roll-note][aria-label$="compás 6"]')},key('Control+z',2),{op:'audition',target:css('[data-pitch="B4"] [data-roll-note][aria-label$="compás 6"]'),at:3});
set(41,click('Pentagrama'),high(css('[data-measure="6"] [data-note-pitch="B4"]'),2,4200));
set(42,...['I','IV','V','I'].map((text,i)=>type(label(`Cifrado compás ${i+1}, pulso 1`),text,i*2.5)));
set(43,move(label('Cifrado compás 4, pulso 1'),0));
set(44,click('Ocultar cifrados'),click('Mostrar cifrados',2),play(0,16,'Detener',{afterVoice:true,highlight:label('Cifrado vigente')}));clips[43].extraMusic=18;
set(45,high(css('span:text-is("Borrador guardado en este navegador")'),0,6000));
set(46,{op:'download',target:button('Guardar JSON'),at:4});
set(47,{op:'open',target:button('Abrir proyecto'),at:1});set(48,{op:'download',target:button('Exportar MIDI'),at:1});
set(49,click('Nuevo proyecto',1));clips[49].prepare=[key('Control+z')];set(50,play(2));set(51,{op:'wait',ms:500});set(52,{op:'stop',at:0});
const substitutions=[
 
 'Cambio de compás: el selector aplica inmediatamente; no existe botón Aplicar.',
 'Piano Roll: el compás 5 está completo; se añade un sexto vacío, se escribe A4 de octavo en su pulso 1, se mueve a B4 en el pulso 2 y se alarga a cuarto.',
 'Ctrl+X se presenta como insignia y no se ejecuta, según el encargo.',
 'El proyecto nuevo muestra un diálogo nativo, aceptado automáticamente; se restaura con Ctrl+Z.'
];
await writeFile(dir+'/secuenciador-es.json',JSON.stringify({version:1,locale:'es',startUrl:'/es/curso-armonia',substitutions,clips},null,2)+'\n');
const ids=['melody','soprano','alto','tenor','bass'],names=['Melodía','Soprano','Alto','Tenor','Bajo'];
const project={version:1,title:'Tutorial · Melodía y acordes',tempo:72,masterVolume:.8,mode:'single',annotations:[],measures:Array.from({length:5},(_,i)=>({id:'measure-'+(i+1),time:[4,4],key:'C'})),voices:ids.map((id,i)=>({id,name:names[i],clef:i>=3?'bass':'treble',instrument:'Piano',volume:.8,mute:false,solo:false,events:i?[]:[['C4','E4','G4'],['C4','F4','A4'],['B3','D4','G4'],['C4','E4','G4']].map((pitches,j)=>({id:'chord-'+(j+1),start:j*3840,duration:'w',dotted:false,triplet:false,tie:false,pitches}))})),scenes:[{id:'scene-1',title:'I – IV – V – I',caption:'',startMeasure:1,endMeasure:5,aspect:'16:9',highlightVoice:'all'}]};
await writeFile(dir+'/secuenciador-proyecto-1.json',JSON.stringify(project,null,2)+'\n');
const pkg=JSON.parse(await readFile('package.json','utf8'));pkg.scripts.tutorial='node scripts/sequencer/grabar-tutorial.mjs';await writeFile('package.json',JSON.stringify(pkg,null,2)+'\n');

// Read translations from the UI itself, including the fragments used in composed aria-labels.
const sources=await Promise.all(['components/sequencer/SequencerStudio.tsx','components/sequencer/PianoRoll.tsx','components/sequencer/ScoreView.tsx','app/[locale]/curso-armonia/page.tsx'].map(f=>readFile(f,'utf8')));
const translations=new Map();
for(const source of sources){
  for(const m of source.matchAll(/\bt\("((?:\\.|[^"\\])*)",\s*"((?:\\.|[^"\\])*)"\)/g))translations.set(JSON.parse('"'+m[1]+'"'),JSON.parse('"'+m[2]+'"'));
  for(const m of source.matchAll(/\bes\s*\?\s*"([^"\n]*)"\s*:\s*"([^"\n]*)"/g))translations.set(m[1],m[2]);
}
for(const m of sources[0].matchAll(/\["(?:w|h|q|8|16|32)","([^"]+)","([^"]+)"/g))translations.set(m[1],m[2]);
const tr=text=>{
  if(translations.has(text))return translations.get(text);
  if(text==='Piano Roll'&&sources[0].includes('>Piano Roll</button>'))return text;
  for(const prefix of ['Elegir ','Alteración ','Ir al compás ','Cifrado compás ','compás '])if(text.startsWith(prefix)){
    const rest=text.slice(prefix.length);
    return translations.get(prefix)+(prefix==='Cifrado compás '?rest.replace(', pulso ',translations.get(', pulso ')):tr(rest));
  }
  if(/^(?:\d+|#|b)$/.test(text))return text;
  throw new Error('Etiqueta sin traducción en el código: '+text);
};
const translateTarget=t=>{
  if(t.name)t.name=tr(t.name);
  if(t.label)t.label=tr(t.label);
  if(t.css)t.css=t.css.replaceAll('/es/curso-armonia/','/en/harmony-course/').replaceAll('/es/sequencer/v4','/en/sequencer/v4').replace(/(aria-label(?:\$)?=|:text-is\()"([^"]+)"/g,(_,prefix,text)=>prefix+'"'+tr(text)+'"');
};
const enClips=structuredClone(clips);
for(const entry of enClips)for(const a of [...entry.actions,...entry.prepare??[]]){
  for(const t of [a.target,a.to,a.highlight])if(t)translateTarget(t);
  if(a.stop==='Detener')a.stop=tr(a.stop);
  if(a.file==='secuenciador-proyecto-1.json')a.file='secuenciador-proyecto-1-en.json';
}
const durationTable=async locale=>new Map([...(await readFile(`.local-work/video-secuenciador-audio-${locale}/Duraciones_Video_Secuenciador.txt`,'utf8')).matchAll(/^\s*\d+\s+(\d+)_Chapter_1\.mp3\s+([\d.]+)/gm)].map(m=>[+m[1],+m[2]]));
const [esTimes,enTimes]=await Promise.all([durationTable('es'),durationTable('en')]);
if(esTimes.size!==52||enTimes.size!==52)throw new Error('Se requieren 52 duraciones por idioma');
const timing=[];
const sounds=a=>['audition','ctrlClick'].includes(a.op)||a.target?.staff||a.target?.roll||a.target?.css?.includes('data-roll-note')||a.op==='key'&&/^(?:[a-g]|ArrowUp|ArrowDown)$/.test(a.key)||a.target?.name?.startsWith('Accidental ');
for(const entry of enClips){
  const es=esTimes.get(entry.clip),en=enTimes.get(entry.clip),limit=en-.3;
  const scale=entry.actions.some(a=>!a.afterVoice&&((a.at??0)+(a.ms??0)/1000>=limit))?en/es:1;
  let previous=-Infinity,lastSound=-Infinity;
  for(const a of entry.actions){
    if(a.afterVoice)continue;
    if(a.at!==undefined){a.at=Number(Math.max(a.at*scale,previous,sounds(a)?lastSound+.5:-Infinity).toFixed(6));previous=a.at;if(sounds(a))lastSound=a.at;}
    if(a.ms!==undefined)a.ms=Math.round(a.ms*scale);
    if(a.at!==undefined&&a.at>=en)throw new Error(`Clip ${entry.clip}: acción fuera de la voz inglesa`);
  }
  timing.push({clip:entry.clip,es,en,scale});
}
const routing=await readFile('i18n/routing.ts','utf8');
if(!routing.includes('"/harmony-course"'))throw new Error('La ruta inglesa del curso cambió');
await writeFile(dir+'/secuenciador-en.json',JSON.stringify({version:1,locale:'en',startUrl:'/en/harmony-course',substitutions:[
  'Time signature changes apply immediately; there is no Apply button.',
  'Piano Roll: measure 5 is full. Add an empty sixth measure, write an A4 eighth note on beat 1, move it to B4 on beat 2 and extend it to a quarter note.',
  'Ctrl+X is shown as a badge without executing it, as requested.',
  'The new project native dialog is accepted automatically; Ctrl+Z restores the project.'
],clips:enClips},null,2)+'\n');
const enProject=structuredClone(project);enProject.title='Tutorial · Melody and chords';enProject.voices[0].name='Melody';enProject.voices[4].name='Bass';
await writeFile(dir+'/secuenciador-proyecto-1-en.json',JSON.stringify(enProject,null,2)+'\n');
await mkdir('.local-work/encargo-video-secuenciador',{recursive:true});
await writeFile('.local-work/encargo-video-secuenciador/timing-ronda4.json',JSON.stringify(timing,null,2)+'\n');
console.log('Clips ingleses reescalados: '+timing.filter(t=>t.scale!==1).map(t=>t.clip).join(', '));
