#!/usr/bin/env node
import {readFile,mkdir,writeFile,unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
const out=path.resolve('.local-work/tutorial-v5-provisional');
await mkdir(out,{recursive:true});
const plan=JSON.parse(await readFile('content/tutoriales/secuenciador-v5-es.json','utf8'));
const run=(cmd,args)=>new Promise((resolve,reject)=>{const p=spawn(cmd,args,{windowsHide:true});let stdout='',stderr='';p.stdout.on('data',d=>stdout+=d);p.stderr.on('data',d=>stderr+=d);p.on('error',reject);p.on('close',c=>c?reject(new Error(stderr)):resolve(stdout));});
const rows=[];
for(const clip of plan.clips){
 const duration=Math.ceil(Math.max(clip.text.split(/\s+/).length*.48,6,...clip.actions.filter(a=>!a.afterVoice).map(a=>(a.at??0)+(a.seconds??0)+2)));
 const mp3=path.join(out,clip.clip+'_Chapter_1.mp3'),wav=path.join(out,'probe.wav');
 await run('ffmpeg',['-v','error','-y','-f','lavfi','-i','anullsrc=r=48000:cl=stereo','-t',String(duration),'-c:a','libmp3lame',mp3]);
 await run('ffmpeg',['-v','error','-y','-i',mp3,wav]);
 const seconds=await run('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',wav]);
 rows.push(clip.clip+' '+clip.clip+'_Chapter_1.mp3 '+seconds.trim());
}
await unlink(path.join(out,'probe.wav'));
await writeFile(path.join(out,'guion-clips.txt'),plan.clips.map(c=>c.text).join('\n')+'\n');
await writeFile(path.join(out,'Duraciones_Video_Secuenciador.txt'),rows.join('\n')+'\n');
await writeFile(path.join(out,'PROVISIONAL.txt'),'Silencios para probar acciones. No es narración; no usar en la entrega.\n');
console.log(out);
