// Recording-only capture. v4 keeps its original implementation.
import {writeFile} from 'node:fs/promises';
export {PCM_WORKLET_SOURCE,inspectAudio,findPCMOnset} from './tutorial-audio.mjs';

export function installAudioCapture({url,testStalls=false}) {
  const Native=window.AudioContext,connect=AudioNode.prototype.connect,disconnect=AudioNode.prototype.disconnect;
  window.__tutorialNativeAudioContext=Native;
  const contexts=new Map(),pending=new Set();
  let nextContext=0;
  const absoluteNow=()=>performance.timeOrigin+performance.now();

  // currentTime/currentFrame are a rendering clock, not elapsed wall time.
  // A silent output device can stop that clock even while state stays "running".
  // Each context therefore owns a sequence of clock anchors, not one lifetime epoch.
  function observe(state,reason,frame=Math.round(state.context.currentTime*state.context.sampleRate)) {
    const context=state.context,now=performance.now(),stamp=context.getOutputTimestamp();
    const current=context.currentTime;
    const fresh=context.state==='running'&&stamp.contextTime>0&&stamp.performanceTime>0
      &&now-stamp.performanceTime>=-5&&now-stamp.performanceTime<250
      &&current-stamp.contextTime>=-.02&&current-stamp.contextTime<.5;
    if(context.state!=='running')return state.anchors.at(-1)??null;
    if(fresh)state.outputDelayMs=Math.max(0,Math.min(150,stamp.performanceTime-now+(current-stamp.contextTime)*1000));
    const epoch=performance.timeOrigin+(fresh?stamp.performanceTime-stamp.contextTime*1000:now-current*1000+state.outputDelayMs);
    const previous=state.anchors.at(-1);
    if(!previous||(frame>=previous.frame&&Math.abs(epoch-previous.epoch)>10)){
      const anchor={id:state.anchors.length+1,frame:previous?frame:0,epoch,
        observedAt:performance.timeOrigin+now,contextTime:current,
        outputContextTime:stamp.contextTime,outputPerformanceTime:stamp.performanceTime,
        method:fresh?'getOutputTimestamp':'currentTime',reason,
        deltaMs:previous?epoch-previous.epoch:0};
      state.anchors.push(anchor);
    }
    return state.anchors.at(-1);
  }
  const anchorAt=(state,frame)=>state.anchors.findLast(a=>a.frame<=frame)??state.anchors[0];

  window.AudioContext=class extends Native {
    constructor(options) {
      if(window.__tutorialSkipNextAudioCapture){window.__tutorialSkipNextAudioCapture=false;return new Native(options);}
      super({...options,sampleRate:48000});
      const tap=this.createGain(),state={id:++nextContext,context:this,tap,node:null,flush:null,ready:null,
        outputDelayMs:0,anchors:[],lifecycle:[{time:absoluteNow(),state:this.state}]};
      contexts.set(this,state);
      this.addEventListener('statechange',()=>{
        state.lifecycle.push({time:absoluteNow(),state:this.state,currentTime:this.currentTime});
        if(this.state==='running')observe(state,'statechange');
      });
      state.ready=this.audioWorklet.addModule(url).then(()=>{
        const node=new AudioWorkletNode(this,'tutorial-pcm',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});
        state.node=node;
        connect.call(tap,node);connect.call(node,this.destination);
        node.port.onmessage=({data})=>{
          if(data.flushed){state.flush?.();return;}
          observe(state,'pcm',data.frame);
          // Split a packet at a pause/re-anchor boundary; never apply a new era to old samples.
          const end=data.frame+data.pcm.length/2;
          const boundaries=[data.frame,...state.anchors.filter(a=>a.frame>data.frame&&a.frame<end).map(a=>a.frame),end];
          for(let i=0;i<boundaries.length-1;i++){
            const first=boundaries[i],last=boundaries[i+1],anchor=anchorAt(state,first);
            if(!anchor)throw new Error('PCM sin ancla válida');
            const pcm=data.pcm.subarray((first-data.frame)*2,(last-data.frame)*2);
            const bytes=new Uint8Array(pcm.buffer,pcm.byteOffset,pcm.byteLength);
            let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);
            const promise=window.tutorialPCM({contextId:state.id,clockId:anchor.id,frame:first,
              sampleRate:this.sampleRate,time:anchor.epoch+first/this.sampleRate*1000,pcm:btoa(binary)});
            pending.add(promise);promise.finally(()=>pending.delete(promise));
          }
        };
      });
    }
    async resume(){await contexts.get(this).ready;const result=await super.resume();observe(contexts.get(this),'resume');return result;}
  };
  AudioNode.prototype.connect=function(destination,...args){
    const result=connect.call(this,destination,...args),state=contexts.get(this.context);
    if(state&&destination===this.context.destination)connect.call(this,state.tap,args[0]??0,0);
    return result;
  };
  AudioNode.prototype.disconnect=function(...args){
    const state=contexts.get(this.context);
    if(state&&args[0]===this.context.destination)try{disconnect.call(this,state.tap,args[1]??0,0);}catch{}
    return disconnect.apply(this,args);
  };
  function clockFor(context,when) {
    const state=contexts.get(context);if(!state||context.state!=='running')return null;
    observe(state,'source');
    const seconds=Math.max(when,context.currentTime),frame=Math.round(seconds*context.sampleRate),anchor=anchorAt(state,frame);
    return anchor?{time:anchor.epoch+seconds*1000,contextId:state.id,clockId:anchor.id,
      frame,epoch:anchor.epoch,contextTime:context.currentTime,performanceTime:absoluteNow()}:null;
  }
  window.tutorialAudio={
    isCaptured:context=>contexts.has(context),clockFor,
    pauseForTest:testStalls?async ms=>{const active=[...contexts.keys()].filter(c=>c.state==='running');await Promise.all(active.map(c=>c.suspend()));await new Promise(resolve=>setTimeout(resolve,ms));await Promise.all(active.map(c=>c.resume()));}:undefined,
    timeFor:(context,when)=>clockFor(context,when)?.time??null,
    snapshot:()=>[...contexts.values()].map(s=>({contextId:s.id,sampleRate:s.context.sampleRate,state:s.context.state,
      anchors:s.anchors.map(a=>({...a})),lifecycle:s.lifecycle.map(e=>({...e}))})),
    async flush(){
      for(const state of contexts.values()){
        if(state.context.state!=='running')continue;
        await state.ready;
        await new Promise(resolve=>{state.flush=resolve;state.node.port.postMessage('flush');});
      }
      await Promise.all([...pending]);
    },
  };
}

// Sum independent captured outputs. Silent packets from one context must not erase another.
export async function writeCapturedPCM(file,chunks,start,end) {
  const pcm=new Float32Array(Math.round((end-start)*48)*2),outputs=new Map();
  for(const chunk of chunks){
    const id=chunk.contextId??0;if(!outputs.has(id))outputs.set(id,new Float32Array(pcm.length));
    const output=outputs.get(id);
    const offset=Math.round((chunk.time-start)*48),samples=new Float32Array(chunk.pcm.buffer,chunk.pcm.byteOffset,chunk.pcm.length/4);
    const first=Math.max(0,-offset),last=Math.min(samples.length/2,pcm.length/2-offset);
    for(let i=first;i<last;i++){output[(offset+i)*2]=samples[i*2];output[(offset+i)*2+1]=samples[i*2+1];}
  }
  for(const output of outputs.values())for(let i=0;i<pcm.length;i++)pcm[i]+=output[i];
  await writeFile(file,new Uint8Array(pcm.buffer));
}
