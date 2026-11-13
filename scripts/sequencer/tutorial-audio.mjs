import {writeFile,readFile} from 'node:fs/promises';

export const PCM_WORKLET_SOURCE = `class TutorialPCM extends AudioWorkletProcessor {
    constructor(){super();this.samples=new Float32Array(2048);this.used=0;this.first=0;
      this.port.onmessage=()=>{this.flush();this.port.postMessage({flushed:true});};}
    flush(){if(this.used){this.port.postMessage({frame:this.first,pcm:this.samples.slice(0,this.used)},[]);this.used=0;}}
    process(inputs){const channels=inputs[0];const length=128;
      for(let i=0;i<length;i++){if(!this.used)this.first=currentFrame+i;
        this.samples[this.used++]=channels[0]?.[i]??0;this.samples[this.used++]=channels[1]?.[i]??channels[0]?.[i]??0;
        if(this.used===this.samples.length)this.flush();}return true;}}
    registerProcessor('tutorial-pcm',TutorialPCM);`;

// Installed before application scripts; the application's graph and audible output stay intact.
export function installAudioCapture({url}) {
  const Native = window.AudioContext, connect = AudioNode.prototype.connect, disconnect = AudioNode.prototype.disconnect;
  const contexts = new Map(), pending = new Set();
  window.AudioContext = class extends Native {
    constructor(options){super({...options,sampleRate:48000});
      const tap=this.createGain(), state={tap,node:null,epoch:null,flush:null,ready:null};contexts.set(this,state);
      state.ready=this.audioWorklet.addModule(url).then(()=>{
        const node=new AudioWorkletNode(this,'tutorial-pcm',{numberOfInputs:1,numberOfOutputs:1,outputChannelCount:[2]});state.node=node;
        connect.call(tap,node);connect.call(node,this.destination); // Processor output is silence, keeping the tap alive.
        node.port.onmessage=({data})=>{
          if(data.flushed){state.flush?.();return;}
          // A fixed sample-clock anchor avoids message-delivery jitter and encoder delay.
          if(state.epoch===null){const stamp=this.getOutputTimestamp();
            state.epoch=performance.timeOrigin+(stamp.contextTime>0?stamp.performanceTime-stamp.contextTime*1000:performance.now()-this.currentTime*1000);}
          const bytes=new Uint8Array(data.pcm.buffer);let binary='';for(let i=0;i<bytes.length;i++)binary+=String.fromCharCode(bytes[i]);
          const promise=window.tutorialPCM({time:state.epoch+data.frame/48,pcm:btoa(binary)});
          pending.add(promise);promise.finally(()=>pending.delete(promise));
        };
      });
    }
    async resume(){await contexts.get(this).ready;return super.resume();}
  };
  AudioNode.prototype.connect=function(destination,...args){const result=connect.call(this,destination,...args);
    const state=contexts.get(this.context);if(state&&destination===this.context.destination)connect.call(this,state.tap,args[0]??0,0);return result;};
  AudioNode.prototype.disconnect=function(...args){const state=contexts.get(this.context);
    if(state&&args[0]===this.context.destination){try{disconnect.call(this,state.tap,args[1]??0,0);}catch{/* Already disconnected. */}}
    return disconnect.apply(this,args);};
  window.tutorialAudio={timeFor(context,when){const state=contexts.get(context);return state?.epoch===null?null:state?.epoch+Math.max(when,context.currentTime)*1000;},async flush(){for(const state of contexts.values()){await state.ready;
    await new Promise(resolve=>{state.flush=resolve;state.node.port.postMessage('flush');});}
    await Promise.all([...pending]);}};
}

export async function writeCapturedPCM(file,chunks,start,end) {
  const pcm=Buffer.alloc(Math.round((end-start)*48)*8);
  for(const chunk of chunks){const offset=Math.round((chunk.time-start)*48),frames=chunk.pcm.length/8;
    const first=Math.max(0,-offset),last=Math.min(frames,pcm.length/8-offset);
    if(last>first)chunk.pcm.copy(pcm,(offset+first)*8,first*8,last*8);}
  await writeFile(file,pcm);
}

export const REQUIRED_AUDIO_CLIPS=[12,13,14,15,16,17,18,19,25,26,27,37,38,39,40];

export async function inspectAudio(file,run,{start,end}={}) {
  const range=start===undefined?[]:['-ss',String(start),'-t',String(end-start)];
  const {stderr}=await run('ffmpeg',['-hide_banner',...range,'-i',file,'-af','volumedetect','-f','null','-']);
  const peak=Number(stderr.match(/max_volume:\s*([\d.-]+) dB/)?.[1]??-Infinity);
  const mean=Number(stderr.match(/mean_volume:\s*([\d.-]+) dB/)?.[1]??-Infinity);
  return {peakDb:peak,meanDb:mean,aboveMinus45:peak>-45};
}

export async function findPCMOnset(file,expected) {
  const wav=await readFile(file);let data=null;
  for(let offset=12;offset+8<=wav.length;){const size=wav.readUInt32LE(offset+4);if(wav.toString('ascii',offset,offset+4)==='data'){data=wav.subarray(offset+8,offset+8+size);break;}offset+=8+size+(size%2);}
  if(!data)throw new Error('WAV PCM sin datos');
  const first=Math.max(0,Math.floor((expected-.04)*48000)),last=Math.min(data.length/4,Math.ceil((expected+.3)*48000));
  for(let i=first;i<last-3;i++)if([0,1,2].every(j=>Math.max(Math.abs(data.readInt16LE((i+j)*4)),Math.abs(data.readInt16LE((i+j)*4+2)))>32))return i/48000;
  throw new Error(`No se detecta el inicio real del audio cerca de ${expected} s`);
}
