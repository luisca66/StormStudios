import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {resolveAtWord,LiveSilenceMeter,safeMusicCopy,measureWav,wordSyncReport} from './tutorial-quality-v5.mjs';

test('anclas: normalización, ocurrencia obligatoria y preparación antes del gesto',()=>{
  const words=[{text:'¡Arrástrala!',start:2,end:2.5},{text:'Snap,',start:4,end:4.3},{text:'snap',start:7,end:7.2}];
  const cue=resolveAtWord({word:'ARRASTRALA',offset:-.4},words);
  assert.equal(cue.target,2);assert.equal(cue.approach,1.6);
  assert.throws(()=>resolveAtWord({word:'snap'},words),/ambigua/);
  assert.throws(()=>resolveAtWord({word:'inexistente'},words),/no existe/);
  assert.throws(()=>resolveAtWord({word:'snap',occurrence:3},words),/inválida/);
  assert.equal(resolveAtWord({word:'snap',occurrence:2,offset:.2},words).target,7.2);
});

test('el silencio exige PCM reciente y 250 ms continuos desde la última señal',()=>{
  const meter=new LiveSilenceMeter();
  const chunk=(time,amplitude,frames=480)=>{const pcm=Buffer.alloc(frames*8);for(let i=0;i<frames*2;i++)pcm.writeFloatLE(amplitude,i*4);return {time,contextId:1,pcm};};
  meter.ingest(chunk(1000,.1));meter.ingest(chunk(1010,0,12000));
  assert.equal(meter.status(1260,1000).silent,true);
  assert.equal(meter.status(1400,1000).silent,false);
  meter.ingest(chunk(1260,.1));meter.ingest(chunk(1270,0,11040));
  assert.equal(meter.status(1500,1000).silent,false);
  meter.ingest(chunk(1500,0,1440));assert.equal(meter.status(1530,1000).silent,true);
});

test('el transporte se mide con keydown real; terminar una acción no sustituye el evento',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tutorial-v5-words-'));
  try{
    await writeFile(path.join(dir,'1_Chapter_1.words.json'),JSON.stringify([{text:'Espaciadora',start:1.82,end:2.1}]));
    const segment={clip:1,source:path.join(dir,'1_Chapter_1.mp3'),start:0,voiceStart:.4,captureEpoch:1000,
      actions:[{op:'play',key:true,eventKind:'play',actionId:'1-1',completed:3,atWord:{word:'espaciadora'}}],
      actionEvents:[{id:'1-1',kind:'keydown',time:3225}]};
    let rows=await wordSyncReport({clips:[segment]},dir);assert.ok(rows[0].pass);assert.ok(Math.abs(rows[0].errorMs-5)<1e-6);
    segment.actionEvents=[];rows=await wordSyncReport({clips:[segment]},dir);assert.equal(rows[0].pass,false);assert.equal(rows[0].measuredSeconds,null);
  }finally{await rm(dir,{recursive:true,force:true});}
});

test('el montaje conserva el original y suaviza paradas y fronteras',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tutorial-v5-quality-'));
  try{
    const frames=48000,buffer=Buffer.alloc(44+frames*4);
    buffer.write('RIFF');buffer.writeUInt32LE(buffer.length-8,4);buffer.write('WAVEfmt ',8);buffer.writeUInt32LE(16,16);
    buffer.writeUInt16LE(1,20);buffer.writeUInt16LE(2,22);buffer.writeUInt32LE(48000,24);buffer.writeUInt32LE(192000,28);buffer.writeUInt16LE(4,32);buffer.writeUInt16LE(16,34);buffer.write('data',36);buffer.writeUInt32LE(frames*4,40);
    for(let i=0;i<frames;i++)for(let c=0;c<2;c++)buffer.writeInt16LE(i<24000||i>40000?12000:0,44+i*4+c*2);
    const source=path.join(dir,'source.wav'),target=path.join(dir,'safe.wav');await writeFile(source,buffer);
    const fades=await safeMusicCopy(source,target,{captureEpoch:1000,stops:[{time:1500}]});
    assert.deepEqual(await readFile(source),buffer);
    const delivery=await readFile(target);assert.equal(measureWav(delivery,.92,1).peakDb,-300);
    assert.ok(fades.every(f=>f.duration>=.03));
    assert.ok(Math.abs(delivery.readInt16LE(44+23999*4))<10);
  }finally{await rm(dir,{recursive:true,force:true});}
});
