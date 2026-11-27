import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,rm} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {installAudioCapture,writeCapturedPCM} from './tutorial-audio-v5.mjs';

test('capture clocks follow a running-clock stall, suspension and a second context',async()=>{
  let now=2000;
  const messages=[],nodes=[];
  class Node {connect(){return this;}disconnect(){}}
  class Context {
    constructor(){this.sampleRate=48000;this.currentTime=1;this.state='running';this.destination=new Node();this.stamp={contextTime:.98,performanceTime:1980};this.audioWorklet={addModule:async()=>{}};}
    createGain(){return new Node();}getOutputTimestamp(){return this.stamp;}addEventListener(){}
    async resume(){this.state='running';}
  }
  class Worklet extends Node {
    constructor(){super();nodes.push(this);this.port={onmessage:null,postMessage:()=>this.port.onmessage({data:{flushed:true}})};}
  }
  const previous=Object.fromEntries(['window','AudioNode','AudioWorkletNode','performance'].map(key=>[key,Object.getOwnPropertyDescriptor(globalThis,key)]));
  try{
    globalThis.window={AudioContext:Context,tutorialPCM:async data=>{messages.push(data);}};
    globalThis.AudioNode=Node;globalThis.AudioWorkletNode=Worklet;
    Object.defineProperty(globalThis,'performance',{configurable:true,value:{timeOrigin:100000,now:()=>now}});
    installAudioCapture({url:'/worklet'});
    const a=new window.AudioContext();await a.resume();
    assert.equal(window.tutorialAudio.timeFor(a,1),102000);
    const initialClock=window.tutorialAudio.clockFor(a,1);
    now+=20000; // same context, same currentTime, still "running"; old output stamp is stale
    assert.equal(window.tutorialAudio.timeFor(a,1),122000);
    assert.equal(window.tutorialAudio.clockFor(a,1).contextId,initialClock.contextId);
    assert.equal(window.tutorialAudio.snapshot()[0].anchors.at(-1).deltaMs,20000);
    await Promise.resolve();
    nodes[0].port.onmessage({data:{frame:48000,pcm:new Float32Array(2048)}});
    assert.equal(messages[0].time,122000);
    nodes[0].port.onmessage({data:{frame:47500,pcm:new Float32Array(2048)}});
    assert.equal(messages[1].clockId,1);assert.equal(messages[1].frame,47500);
    assert.equal(messages[2].clockId,2);assert.equal(messages[2].frame,48000);
    assert.equal(messages[2].time,122000);
    const b=new window.AudioContext();b.currentTime=.1;b.stamp={contextTime:.08,performanceTime:now-20};await b.resume();
    assert.equal(window.tutorialAudio.timeFor(b,.1),122000);
    assert.notEqual(window.tutorialAudio.clockFor(a,1).contextId,window.tutorialAudio.clockFor(b,.1).contextId);
    assert.equal(window.tutorialAudio.timeFor(a,1),122000);assert.equal(window.tutorialAudio.timeFor(b,.1),122000);
    assert.equal(window.tutorialAudio.timeFor(new Context(),0),null); // uncaptured microphone
    window.__tutorialSkipNextAudioCapture=true;const mic=new window.AudioContext();
    assert.equal(window.tutorialAudio.isCaptured(mic),false);assert.equal(window.tutorialAudio.snapshot().length,2);
    a.state='suspended';now+=3000;
    assert.equal(window.tutorialAudio.timeFor(a,1),null);
    await a.resume();assert.equal(window.tutorialAudio.timeFor(a,1),125000);
    const snap=window.tutorialAudio.snapshot()[0];
    assert.equal(snap.anchors.at(-1).deltaMs,3000);
  }finally{for(const [key,descriptor] of Object.entries(previous)){if(descriptor)Object.defineProperty(globalThis,key,descriptor);else delete globalThis[key];}}
});

test('mixing captures from independent contexts cannot overwrite nonzero PCM with silence',async()=>{
  const dir=await mkdtemp(path.join(os.tmpdir(),'tutorial-v5-pcm-'));
  try{
    const file=path.join(dir,'mixed.f32'),signal=new Float32Array([.25,-.25,.5,-.5]),silence=new Float32Array(4);
    await writeCapturedPCM(file,[{contextId:1,time:1000,pcm:Buffer.from(signal.buffer)},{contextId:2,time:1000,pcm:Buffer.from(silence.buffer)}],1000,1000+2/48);
    const data=await readFile(file);assert.equal(data.readFloatLE(0),.25);assert.equal(data.readFloatLE(12),-.5);
    await writeCapturedPCM(file,[{contextId:1,time:1000,pcm:Buffer.from(signal.buffer)},{contextId:1,time:1000,pcm:Buffer.from(signal.buffer)}],1000,1000+2/48);
    assert.equal((await readFile(file)).readFloatLE(0),.25); // a re-anchored packet from one context is not a second output
  }finally{assert.equal(path.dirname(dir),path.resolve(os.tmpdir()));assert.ok(path.basename(dir).startsWith('tutorial-v5-pcm-'));await rm(dir,{recursive:true,force:true});}
});
