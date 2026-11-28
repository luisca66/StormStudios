import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';

export const normalizeWord=value=>String(value).normalize('NFD').replace(/\p{M}/gu,'').toLowerCase().replace(/[^\p{L}\p{N}]/gu,'');

// Negative offset is cursor pre-roll; it never makes the click precede the spoken word.
// A positive offset delays the gesture (useful for a sequence within one spoken instruction).
export function resolveAtWord(anchor,words,label='acción') {
  if(!anchor||!normalizeWord(anchor.word))throw new Error(label+': atWord.word vacío');
  const matches=words.filter(w=>normalizeWord(w.text??w.word)===normalizeWord(anchor.word));
  if(!matches.length)throw new Error(label+': no existe la palabra «'+anchor.word+'»');
  if(matches.length>1&&anchor.occurrence===undefined)throw new Error(label+': palabra ambigua «'+anchor.word+'»; indica occurrence (1–'+matches.length+')');
  const occurrence=anchor.occurrence??1,word=matches[occurrence-1],offset=anchor.offset??0;
  if(!Number.isInteger(occurrence)||!word)throw new Error(label+': occurrence inválida para «'+anchor.word+'»');
  if(!Number.isFinite(offset)||!Number.isFinite(word.start)||!Number.isFinite(word.end)||word.end<word.start)throw new Error(label+': tiempos inválidos');
  return {word:word.text??word.word,occurrence,wordStart:word.start,wordEnd:word.end,offset,
    target:word.start+Math.max(0,offset),approach:word.start+Math.min(0,offset)};
}
export async function loadWordTimes(folder,clip) {
  const file=path.join(folder,clip+'_Chapter_1.words.json'),raw=JSON.parse(await readFile(file,'utf8'));
  const words=Array.isArray(raw)?raw:raw.words;
  if(!Array.isArray(words)||!words.length)throw new Error('Alineamiento vacío: '+file);
  return words;
}
export async function wordSyncReport(timeline,out) {
  const rows=[];
  for(const segment of timeline.clips){
    const words=await loadWordTimes(path.dirname(segment.source),segment.clip);
    for(const [index,action] of segment.actions.entries()){
      if(!action.atWord)continue;
      const anchor=resolveAtWord(action.atWord,words,'Clip '+segment.clip+', acción '+(index+1));
      const eventKind=['play','stop'].includes(action.op)?(action.key?'keydown':'pointerdown'):action.eventKind;
      const measured=segment.actionEvents?.find(e=>e.id===action.actionId&&e.kind===eventKind);
      const measuredSeconds=measured?(measured.time-segment.captureEpoch)/1000-(segment.voiceStart-segment.start):null;
      const errorMs=measuredSeconds===null?null:(measuredSeconds-anchor.target)*1000;
      const target=action.target,description=action.op+' · '+(target?.name??target?.label??target?.nameRegex??target?.css??(target?.note?'nota '+(target.note.index+1)+' ('+target.note.view+')':target?.staff?'pentagrama '+target.staff.measure:target?.roll?'Teclas '+target.roll.pitch+' compás '+target.roll.measure:action.key??action.notes?.join('+')??action.text??''));
      rows.push({clip:segment.clip,action:index+1,op:action.op,description,word:anchor.word,occurrence:anchor.occurrence,
        targetSeconds:anchor.target,measuredSeconds,errorMs,event:eventKind,pass:errorMs!==null&&Math.abs(errorMs)<=150});
    }
  }
  const csvCell=value=>'"'+String(value).replaceAll('"','""')+'"';
  const csv=['clip,accion,palabra,ocurrencia,objetivo_s,medido_s,error_ms,pasa',...rows.map(r=>[
    r.clip,csvCell(r.action+' · '+r.description),csvCell(r.word),r.occurrence,r.targetSeconds.toFixed(3),
    r.measuredSeconds?.toFixed(3)??'',r.errorMs?.toFixed(1)??'',r.pass].join(','))].join('\n')+'\n';
  const md=['| Clip | Acción | Palabra | Objetivo (s) | Medido (s) | Error (ms) |','|---:|---|---|---:|---:|---:|',
    ...rows.map(r=>'| '+r.clip+' | '+r.action+' · '+r.description.replaceAll('|','/')+' | '+r.word+' ('+r.occurrence+') | '+r.targetSeconds.toFixed(3)+' | '+(r.measuredSeconds?.toFixed(3)??'FALTA')+' | '+(r.errorMs?.toFixed(1)??'FALTA')+' |')].join('\n')+'\n';
  await writeFile(path.join(out,'sincronia-palabras.csv'),'\uFEFF'+csv);
  await writeFile(path.join(out,'sincronia-palabras.md'),md);
  await writeFile(path.join(out,'sincronia-palabras.json'),JSON.stringify(rows,null,2)+'\n');
  return rows;
}

export class LiveSilenceMeter {
  constructor(){this.contexts=new Map();}
  ingest(chunk){
    const samples=new Float32Array(chunk.pcm.buffer,chunk.pcm.byteOffset,chunk.pcm.length/4),state=this.contexts.get(chunk.contextId)??{end:-Infinity,lastLoud:-Infinity,rmsDb:-Infinity,peakDb:-Infinity};
    for(let first=0;first<samples.length;first+=960){
      const last=Math.min(samples.length,first+960);let sum=0,peak=0;
      for(let i=first;i<last;i++){sum+=samples[i]*samples[i];peak=Math.max(peak,Math.abs(samples[i]));}
      const end=chunk.time+last/2/48,rmsDb=10*Math.log10(sum/(last-first)||1e-30),peakDb=20*Math.log10(peak||1e-15);
      if(rmsDb>=-55||peakDb>=-50)state.lastLoud=Math.max(state.lastLoud,end);
      if(end>=state.end){state.end=end;state.rmsDb=rmsDb;state.peakDb=peakDb;}
    }
    this.contexts.set(chunk.contextId,state);
  }
  status(now,notBefore){
    if(!this.contexts.size)return {silent:true,noContext:true,quietMs:250,rmsDb:-300,peakDb:-300};
    const states=[...this.contexts.values()],end=Math.min(...states.map(s=>s.end));
    const lastLoud=Math.max(notBefore,...states.map(s=>s.lastLoud)),quietMs=end-lastLoud;
    return {silent:end>=now-80&&quietMs>=250,quietMs,rmsDb:Math.max(...states.map(s=>s.rmsDb)),peakDb:Math.max(...states.map(s=>s.peakDb)),lastPCMEnd:end};
  }
}

export function parseWav(buffer){
  let format=null,offset=null,length=null;
  for(let p=12;p+8<=buffer.length;){const size=buffer.readUInt32LE(p+4),id=buffer.toString('ascii',p,p+4);
    if(id==='fmt ')format={channels:buffer.readUInt16LE(p+10),sampleRate:buffer.readUInt32LE(p+12),bits:buffer.readUInt16LE(p+22)};
    if(id==='data'){offset=p+8;length=Math.min(size,buffer.length-offset);break;}p+=8+size+(size%2);}
  if(!format||offset===null||format.bits!==16)throw new Error('Se exige WAV PCM de 16 bits');
  return {...format,offset,length,frames:length/(format.channels*2)};
}
export function measureWav(buffer,startSeconds,endSeconds){
  const f=parseWav(buffer),first=Math.max(0,Math.round(startSeconds*f.sampleRate)),last=Math.min(f.frames,Math.round(endSeconds*f.sampleRate));
  let sum=0,peak=0,count=0;
  for(let frame=first;frame<last;frame++)for(let c=0;c<f.channels;c++){const value=buffer.readInt16LE(f.offset+(frame*f.channels+c)*2)/32768;sum+=value*value;peak=Math.max(peak,Math.abs(value));count++;}
  return {rmsDb:10*Math.log10(sum/Math.max(1,count)||1e-30),peakDb:20*Math.log10(peak||1e-15)};
}

// Recording retains the original samples; only the delivery copy gets stop/boundary fades.
export async function safeMusicCopy(source,target,segment){
  const buffer=Buffer.from(await readFile(source)),f=parseWav(buffer),fades=[];
  const fade=(from,to)=>{
    from=Math.max(0,from);to=Math.min(f.frames,to);if(to<=from)return;
    for(let i=from;i<to;i++){const gain=.5+.5*Math.cos(Math.PI*(i-from)/(to-from));for(let c=0;c<f.channels;c++){const at=f.offset+(i*f.channels+c)*2;buffer.writeInt16LE(Math.round(buffer.readInt16LE(at)*gain),at);}}
  };
  for(const stop of segment.stops??[]){
    const relative=(stop.time-segment.captureEpoch)/1000;
    const first=Math.max(0,Math.round((relative-.06)*f.sampleRate)),last=Math.min(f.frames,Math.round((relative+.25)*f.sampleRate));
    let end=-1;
    for(let i=first;i<last;i++)for(let c=0;c<f.channels;c++)if(Math.abs(buffer.readInt16LE(f.offset+(i*f.channels+c)*2))>1)end=i+1;
    if(end>=0){const from=Math.max(0,end-Math.round(.096*f.sampleRate));fade(from,end);fades.push({kind:'stop',start:from/f.sampleRate,end:end/f.sampleRate,duration:(end-from)/f.sampleRate});}
  }
  const silentFrames=Math.round(.08*f.sampleRate),fadeFrames=Math.round(.04*f.sampleRate),end=Math.max(0,f.frames-silentFrames),from=Math.max(0,end-fadeFrames);
  fade(from,end);buffer.fill(0,f.offset+end*f.channels*2,f.offset+f.length);
  fades.push({kind:'boundary',start:from/f.sampleRate,end:end/f.sampleRate,duration:(end-from)/f.sampleRate,silentEndMs:80});
  await writeFile(target,buffer);return fades;
}
export async function boundaryReport(timeline,out){
  const cache=new Map(),rows=[];
  const get=async file=>{if(!cache.has(file))cache.set(file,readFile(file));return cache.get(file);};
  for(const s of timeline.clips){
    const duration=s.end-s.start,raw=await get(s.sequencerAudio),safe=await get(s.safeMusicAudio??s.sequencerAudio);
    const captured=measureWav(raw,Math.max(0,duration-.08),duration),delivery=measureWav(safe,Math.max(0,duration-.08),duration);
    const mixed=timeline.sequencerDuckedAudio?measureWav(await get(timeline.sequencerDuckedAudio),Math.max(s.start,s.end-.08),s.end):null;
    rows.push({clip:s.clip,waitMs:s.audioTail?.waitMs,quietMs:s.audioTail?.quietMs,captured,delivery,mixed,
      pass:captured.peakDb<-50&&delivery.peakDb<-50&&(!mixed||mixed.peakDb<-50)&&!!s.audioTail?.silent});
  }
  await writeFile(path.join(out,'revision-colas.json'),JSON.stringify(rows,null,2)+'\n');
  await writeFile(path.join(out,'revision-colas.csv'),'clip,espera_ms,silencio_ms,captura_rms_db,captura_pico_db,entrega_pico_db,pasa\n'+rows.map(r=>[r.clip,r.waitMs??0,r.quietMs??0,r.captured.rmsDb.toFixed(2),r.captured.peakDb.toFixed(2),r.delivery.peakDb.toFixed(2),r.pass].join(',')).join('\n')+'\n');
  return rows;
}
