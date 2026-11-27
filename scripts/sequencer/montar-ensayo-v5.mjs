#!/usr/bin/env node
// Diagnostic preview: never writes the final tutorial filename.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {concatFile,srtTime} from './video-utils.mjs';
const out=path.resolve(process.argv[2]??'.local-work/tutorial-v5-ensayo'),work=path.join(out,'work');
const timeline=JSON.parse(await readFile(path.join(work,'rehearsal.json'),'utf8'));
if(timeline.clips.length!==39)throw new Error('Ensayo incompleto');
if(timeline.clips.some(s=>s.voiceEnd>s.end))throw new Error('El ensayo corto no conserva los tiempos de voz; repite --rehearse-video');
const plan=JSON.parse(await readFile('content/tutoriales/secuenciador-v5-es.json','utf8'));
const run=args=>new Promise((resolve,reject)=>{const p=spawn('ffmpeg',['-v','error','-y',...args],{windowsHide:true});let err='';p.stderr.on('data',d=>err+=d);p.on('error',reject);p.on('close',c=>c?reject(new Error(err)):resolve());});
const files=[];
for(const s of timeline.clips){
 const duration=s.end-s.start,samples=Math.round(duration*48000),delay=s.audioDelayMs??0;
 const shift=delay>=0?'adelay='+Math.round(delay*48)+'S:all=1':'atrim=start='+(-delay/1000)+',asetpts=PTS-STARTPTS';
 const voice='[0:a]adelay='+Math.round((s.voiceStart-s.start)*48000)+'S:all=1,apad,atrim=end_sample='+samples+'[voice]';
 const music='[1:a]'+shift+',volume=0.65,apad,atrim=end_sample='+samples+'[music]';
 const filter=voice+';'+music+';[voice][music]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.8414:level=false:latency=true[audio]';
 const file=path.join(work,'preview-audio-'+s.clip+'.wav');
 await run(['-i',path.join(work,'normalized-'+s.clip+'.wav'),'-i',s.sequencerAudio,'-filter_complex',filter,'-map','[audio]','-t',String(duration),'-c:a','pcm_s16le','-ar','48000',file]);files.push(file);
}
const list=path.join(work,'preview.txt');
await writeFile(list,files.map(concatFile).join('\n'));
const mixed=path.join(work,'preview-audio.wav');
await run(['-f','concat','-safe','0','-i',list,'-c:a','copy',mixed]);
const videoList=path.join(work,'preview-video.txt');
await writeFile(videoList,timeline.clips.map(s=>concatFile(path.join(work,'segment-'+s.clip+'.mp4'))).join('\n'));
await run(['-f','concat','-safe','0','-i',videoList,'-i',mixed,'-map','0:v','-map','1:a','-t',String(timeline.duration),'-c:v','copy','-c:a','aac','-b:a','192k','-ar','48000','-movflags','+faststart',path.join(out,'ensayo-con-voz.mp4')]);
await writeFile(path.join(out,'ensayo.srt'),timeline.clips.map((s,i)=>(i+1)+'\n'+srtTime(s.voiceStart)+' --> '+srtTime(s.voiceEnd)+'\n'+plan.clips[i].text+'\n').join('\n'));
await mkdir(path.join(work,'contacts'),{recursive:true});
for(const s of timeline.clips)await run(['-i',path.join(work,'clip-'+s.clip+'.png'),'-vf','scale=480:270','-frames:v','1',path.join(work,'contacts',String(s.clip).padStart(2,'0')+'.png')]);
await run(['-framerate','1','-i',path.join(work,'contacts','%02d.png'),'-vf','tile=4x10:padding=6:margin=6','-frames:v','1',path.join(out,'hoja-contactos-ensayo.png')]);
console.log('Vista de revisión: '+path.join(out,'ensayo-con-voz.mp4')+'; '+timeline.duration.toFixed(3)+' s. No es la entrega final.');
