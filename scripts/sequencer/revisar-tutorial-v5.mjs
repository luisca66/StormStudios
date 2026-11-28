#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {measureTutorialOnset} from './tutorial-sync-v5.mjs';
import {spawn} from 'node:child_process';
import {wordSyncReport,boundaryReport} from './tutorial-quality-v5.mjs';
import {inspectAudio} from './tutorial-audio.mjs';

const out=path.resolve(process.argv[2]??'.local-work/tutorial-v5-final');
const rehearse=process.argv.includes('--rehearse');
const t=JSON.parse(await readFile(path.join(out,rehearse?'work/rehearsal.json':'timeline.json'),'utf8'));
const wordRows=await wordSyncReport(t,out),tailRows=await boundaryReport(t,out);
const failures=[];
if(!wordRows.length||t.wordAnchorsVersion!==1)failures.push('La grabación no contiene anclajes por palabra');
if(wordRows.some(r=>!r.pass))failures.push('Sincronía de palabras fuera de ±150 ms: '+wordRows.filter(r=>!r.pass).map(r=>r.clip+'.'+r.action+' '+r.word+' ('+(r.errorMs?.toFixed(1)??'sin evento')+' ms)').join(', '));
if(tailRows.some(r=>!r.pass))failures.push('Colas por encima de −50 dBFS o sin espera de silencio: clips '+tailRows.filter(r=>!r.pass).map(r=>r.clip));
await writeFile(path.join(out,'revision-palabras-colas.json'),JSON.stringify({wordRows,tailRows,failures},null,2)+'\n');
if(failures.length)throw new Error(failures.join('\n'));
console.log(wordRows.length+' acciones dentro de ±150 ms (máximo '+Math.max(...wordRows.map(r=>Math.abs(r.errorMs))).toFixed(1)+' ms); '+tailRows.length+' fronteras por debajo de −50 dBFS.');
async function audioRun(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{windowsHide:true});let stderr='';p.stderr.on('data',d=>stderr+=d);p.on('error',reject);p.on('close',code=>code?reject(new Error(stderr)):resolve({stderr}));});}
const checks=[];for(const clip of t.requiredAudio??[]){const s=t.clips.find(c=>c.clip===clip);if(!s?.sequencerAudio)throw new Error(`Clip ${clip}: falta la pista real del secuenciador`);const check={clip,...await inspectAudio(s.sequencerAudio,audioRun)};if(t.sequencerDuckedAudio)check.mixed=await inspectAudio(t.sequencerDuckedAudio,audioRun,{start:s.start,end:s.end});checks.push(check);}
await writeFile(path.join(out,rehearse?'revision-rehearsal.json':'revision-audio.json'),JSON.stringify(checks,null,2)+'\n');
if(checks.some(c=>!c.aboveMinus45||c.mixed&&!c.mixed.aboveMinus45))throw new Error(`Audio ≤ −45 dB: ${checks.filter(c=>!c.aboveMinus45||c.mixed&&!c.mixed.aboveMinus45).map(c=>c.clip)}`);
const previews=t.clips.flatMap(s=>(s.previewVisualSync??s.previewSync??[]).map(p=>({clip:s.clip,...p})));
if(previews.some(p=>!p.within40ms))throw new Error('Vista previa fuera de ±40 ms');
const playbackSync=rehearse&&t.clips.some(s=>s.frameList)?t.music.map(m=>{const raw=m.calibration?.estimatedVisualOnsetErrorMs,delay=t.clips.find(s=>s.clip===m.clip)?.audioDelayMs??0,errorMs=Number.isFinite(raw)?raw-delay:null;return {clip:m.clip,errorMs,within40ms:errorMs!==null&&Math.abs(errorMs)<=40};}):[];
if(playbackSync.some(s=>!s.within40ms))throw new Error('Cursor/reproducción fuera de ±40 ms: '+playbackSync.filter(s=>!s.within40ms).map(s=>s.clip));
if(t.clips.length!==39)throw new Error('Ensayo incompleto: se esperan 39 clips');
if(rehearse){await writeFile(path.join(out,'revision-rehearsal.json'),JSON.stringify({audioChecks:checks,previews,playbackSync,wordActions:wordRows.length,maxWordErrorMs:Math.max(...wordRows.map(r=>Math.abs(r.errorMs))),tailChecks:tailRows,sampleFailures:t.sampleFailures??[],pianoOk:!(t.sampleFailures?.length)},null,2)+'\n');console.log(`${checks.length} clips con audio > −45 dB; ${previews.length} marcas de vista previa dentro de ±40 ms.`);}else{
function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{windowsHide:true});const chunks=[];let err='';p.stdout.on('data',d=>chunks.push(d));p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c?reject(new Error(err)):resolve(Buffer.concat(chunks)));});}
const info=JSON.parse((await run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(out,t.artifacts?.mp4??'tutorial-secuenciador-v5.mp4')])).toString());
const srt=await readFile(path.join(out,t.artifacts?.srt??'tutorial-secuenciador-v5.srt'),'utf8');
if(t.clips.length!==39||t.clips.some((c,i)=>c.clip!==i+1||Math.abs(c.start-(t.clips[i-1]?.end??0))>1e-6)||srt.split(/\r?\n/).filter(l=>l.includes(' --> ')).length!==39)throw new Error('Clips/SRT discontinuos');
if(Math.abs(t.clips.reduce((s,c)=>s+c.voiceEnd-c.voiceStart,0)-t.voiceSeconds)>.001)throw new Error('Voz incompleta');
const video=info.streams.find(s=>s.codec_type==='video'),audio=info.streams.find(s=>s.codec_type==='audio');
if(video.width!==1920||video.height!==1080||video.r_frame_rate!=='30/1'||video.codec_name!=='h264'||video.pix_fmt!=='yuv420p'||audio.codec_name!=='aac'||audio.sample_rate!=='48000'||Math.abs(+info.format.duration-t.duration)>.1)throw new Error('Formato incorrecto');
// Estimate the visible playhead's onset from its horizontal motion in the final MP4.
// The engine holds it at the initial position during its 80 ms scheduling lead.
const sync=[];
for(const m of t.music){
  const result=await measureTutorialOnset(path.join(out,t.artifacts.mp4),m.start);
  const onsetErrorMs=result.estimatedVisualOnsetErrorMs;
  sync.push({clip:m.clip,audioStart:m.start,...result});
  console.log(`Clip ${m.clip}: cursor/audio ${onsetErrorMs?.toFixed(1)??'no medible'} ms`);
}
const report={format:video.codec_name+' '+video.width+'x'+video.height+' '+video.r_frame_rate+' '+video.pix_fmt+' / '+audio.codec_name+' '+audio.sample_rate,mp4Duration:+info.format.duration,timelineDuration:t.duration,voiceSeconds:t.voiceSeconds,clips:39,subtitles:39,audioChecks:checks,previews,wordActions:wordRows.length,tailChecks:tailRows,sync};
await writeFile(path.join(out,'revision.json'),JSON.stringify(report,null,2)+'\n');
console.log(`${report.clips} clips, ${report.subtitles} subtítulos, ${report.mp4Duration.toFixed(3)} s; formato y audio correctos.`);
if(sync.some(s=>!s.within40ms))throw new Error('Sincronía fuera de ±40 ms o no medible: revisar revision.json');

}

if(t.sampleFailures?.length)throw new Error('Piano usó el sonido de reserva; las muestras originales no cargaron');
