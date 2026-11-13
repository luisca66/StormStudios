#!/usr/bin/env node
import {readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {inspectAudio,REQUIRED_AUDIO_CLIPS} from './tutorial-audio.mjs';

const out=path.resolve(process.argv[2]??'stills/es/tutorial-secuenciador/video');
const rehearse=process.argv.includes('--rehearse');
const t=JSON.parse(await readFile(path.join(out,rehearse?'work/rehearsal.json':'timeline.json'),'utf8'));
async function audioRun(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{windowsHide:true});let stderr='';p.stderr.on('data',d=>stderr+=d);p.on('error',reject);p.on('close',code=>code?reject(new Error(stderr)):resolve({stderr}));});}
const checks=[];for(const clip of [...REQUIRED_AUDIO_CLIPS,20,21,44,50]){const s=t.clips.find(c=>c.clip===clip);if(!s?.sequencerAudio)throw new Error(`Clip ${clip}: falta la pista real del secuenciador`);const check={clip,...await inspectAudio(s.sequencerAudio,audioRun)};if(t.sequencerDuckedAudio)check.mixed=await inspectAudio(t.sequencerDuckedAudio,audioRun,{start:s.start,end:s.end});checks.push(check);}
await writeFile(path.join(out,rehearse?'revision-rehearsal.json':'revision-audio.json'),JSON.stringify(checks,null,2)+'\n');
if(checks.some(c=>!c.aboveMinus45||c.mixed&&!c.mixed.aboveMinus45))throw new Error(`Audio ≤ −45 dB: ${checks.filter(c=>!c.aboveMinus45||c.mixed&&!c.mixed.aboveMinus45).map(c=>c.clip)}`);
const previews=t.clips.flatMap(s=>(s.previewVisualSync??s.previewSync??[]).map(p=>({clip:s.clip,...p})));
if(previews.some(p=>!p.within40ms))throw new Error('Vista previa fuera de ±40 ms');
if(rehearse){await writeFile(path.join(out,'revision-rehearsal.json'),JSON.stringify({audioChecks:checks,previews},null,2)+'\n');console.log(`${checks.length} clips con audio > −45 dB; ${previews.length} marcas de vista previa dentro de ±40 ms.`);}else{
function run(cmd,args){return new Promise((resolve,reject)=>{const p=spawn(cmd,args,{windowsHide:true});const chunks=[];let err='';p.stdout.on('data',d=>chunks.push(d));p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c?reject(new Error(err)):resolve(Buffer.concat(chunks)));});}
const info=JSON.parse((await run('ffprobe',['-v','error','-show_streams','-show_format','-of','json',path.join(out,t.artifacts?.mp4??'tutorial-secuenciador-v1.mp4')])).toString());
const srt=await readFile(path.join(out,t.artifacts?.srt??'tutorial-secuenciador-v1.srt'),'utf8');
if(t.clips.length!==52||t.clips.some((c,i)=>c.clip!==i+1||Math.abs(c.start-(t.clips[i-1]?.end??0))>1e-6)||srt.split(/\r?\n/).filter(l=>l.includes(' --> ')).length!==52)throw new Error('Clips/SRT discontinuos');
if(Math.abs(t.clips.reduce((s,c)=>s+c.voiceEnd-c.voiceStart,0)-t.voiceSeconds)>.001)throw new Error('Voz incompleta');
const video=info.streams.find(s=>s.codec_type==='video'),audio=info.streams.find(s=>s.codec_type==='audio');
if(video.width!==1920||video.height!==1080||video.r_frame_rate!=='30/1'||video.codec_name!=='h264'||video.pix_fmt!=='yuv420p'||audio.codec_name!=='aac'||audio.sample_rate!=='48000'||Math.abs(+info.format.duration-t.duration)>.1)throw new Error('Formato incorrecto');
// Estimate the visible playhead's onset from its horizontal motion in the final MP4.
// The engine holds it at the initial position during its 80 ms scheduling lead.
async function stripe(time){
  const bytes=await run('ffmpeg',['-v','error','-ss',String(Math.max(0,time)),'-i',path.join(out,t.artifacts?.mp4??'tutorial-secuenciador-v1.mp4'),'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1']);
  const counts=new Int32Array(1920);
  for(let y=270;y<1050;y++)for(let x=120;x<1470;x++){const i=(y*1920+x)*3,r=bytes[i],g=bytes[i+1],b=bytes[i+2];if(r>90&&r<215&&g>15&&g<120&&b>35&&b<160&&r-g>30&&b-g>3)counts[x]++;}
  let best=0;for(let x=120;x<1470;x++)if(counts[x]>counts[best])best=x;
  return counts[best]>65?best:null;
}
const sync=[];
for(const m of t.music){
  const samples=[];
  for(const offset of [-.02,.02,.15,.4,.8,1.2,1.6])samples.push({offset,x:await stripe(m.start+offset)});
  const baseline=samples[0].x??samples[1].x,usable=samples.filter(s=>s.offset>=.15&&s.x!==null);
  let onsetErrorMs=null,slope=null;
  if(baseline!==null&&usable.length>=3){
    const meanT=usable.reduce((a,s)=>a+s.offset,0)/usable.length,meanX=usable.reduce((a,s)=>a+s.x,0)/usable.length;
    slope=usable.reduce((a,s)=>a+(s.offset-meanT)*(s.x-meanX),0)/usable.reduce((a,s)=>a+(s.offset-meanT)**2,0);
    if(slope>5)onsetErrorMs=((baseline-(meanX-slope*meanT))/slope)*1000;
  }
  sync.push({clip:m.clip,audioStart:m.start,samples,estimatedVisualOnsetErrorMs:onsetErrorMs,pixelsPerSecond:slope,within40ms:onsetErrorMs!==null&&Math.abs(onsetErrorMs)<=40});
  console.log(`Clip ${m.clip}: cursor/audio ${onsetErrorMs?.toFixed(1)??'no medible'} ms`);
}
const report={format:video.codec_name+' '+video.width+'x'+video.height+' '+video.r_frame_rate+' '+video.pix_fmt+' / '+audio.codec_name+' '+audio.sample_rate,mp4Duration:+info.format.duration,timelineDuration:t.duration,voiceSeconds:t.voiceSeconds,clips:52,subtitles:52,audioChecks:checks,previews,sync};
await writeFile(path.join(out,'revision.json'),JSON.stringify(report,null,2)+'\n');
console.log(`${report.clips} clips, ${report.subtitles} subtítulos, ${report.mp4Duration.toFixed(3)} s; formato y audio correctos.`);
if(sync.some(s=>!s.within40ms))throw new Error('Sincronía fuera de ±40 ms o no medible: revisar revision.json');

}
