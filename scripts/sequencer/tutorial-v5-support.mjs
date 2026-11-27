import net from 'node:net';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {writeFile,access,readdir} from 'node:fs/promises';

export async function assertFreePort() {
  await new Promise((resolve, reject) => {
    const socket = net.connect({port:3100, host:'localhost'});
    socket.once('connect', () => { socket.destroy(); reject(new Error('Puerto 3100 ocupado. Detén el servidor existente (posiblemente next dev); no se reutiliza para grabar.')); });
    socket.once('error', error => error.code === 'ECONNREFUSED' ? resolve() : reject(error));
  });
}

export async function startProduction(work,{reuseBuild=false}={}) {
  await assertFreePort();
  const env={...process.env,NODE_ENV:'production',NEXT_PUBLIC_SEQUENCER_AUTHOR:'0'};
  const next='node_modules/next/dist/bin/next';
  if(reuseBuild)await access('.next/BUILD_ID');
  else await new Promise((resolve,reject)=>{
    const build=spawn(process.execPath,[next,'build'],{env,windowsHide:true,stdio:'inherit'});
    build.on('error',reject);build.on('close',code=>code?reject(new Error(`next build falló (${code})`)):resolve());
  });
  await new Promise((resolve,reject)=>{
    const verify=spawn(process.execPath,['scripts/verify-no-author-bundle.mjs'],{env,windowsHide:true,stdio:'inherit'});
    verify.on('error',reject);verify.on('close',code=>code?reject(new Error('Bundle autor detectado')):resolve());
  });
  await assertFreePort();
  const server=spawn(process.execPath,[next,'start','-p','3100'],{env,windowsHide:true,stdio:['ignore','pipe','pipe']});
  let log='',failure;server.on('error',e=>{failure=e;});
  server.stdout.on('data',d=>{log+=d;});server.stderr.on('data',d=>{log+=d;});
  try {
    for(let i=0;i<120;i++){
      if(failure)throw failure;
      if(server.exitCode!==null)throw new Error(log);
      try {const response=await fetch('http://localhost:3100/es/sequencer/v5');if(response.ok){await writeFile(`${work}/production-server.log`,log);return server;}}catch{}
      await new Promise(r=>setTimeout(r,500));
    }
    throw new Error('next start no respondió en 3100');
  }catch(error){server.kill();throw error;}
}

// Installed before navigation. The microphone feeds only a MediaStreamDestination:
// its test tone never reaches the speakers or the recorded sequencer audio.
export function installDevices() {
  const input={name:'Storm tutorial MIDI',state:'connected',onmidimessage:null};
  Object.defineProperty(navigator,'requestMIDIAccess',{configurable:true,value:async()=>({inputs:new Map([['tutorial',input]]),onstatechange:null})});
  let mic;
  window.tutorialDevices={
    midi(notes,velocity=90){if(!input.onmidimessage)throw new Error('Activa MIDI primero');for(const note of notes)input.onmidimessage({data:new Uint8Array([0x90,note,velocity])});},
    release(notes){for(const note of notes)input.onmidimessage?.({data:new Uint8Array([0x80,note,0])});},
    tone(frequency){if(!mic)throw new Error('Activa Mic primero');for(const [i,oscillator] of mic.oscillators.entries())oscillator.frequency.value=frequency*(i+1);mic.gain.gain.value=frequency?1:0;},
  };
  navigator.mediaDevices.getUserMedia=async()=>{
    const Native=window.__tutorialNativeAudioContext??window.AudioContext;
    const context=new Native(),output=context.createMediaStreamDestination(),gain=context.createGain();
    context.__tutorialMic=true;
    gain.gain.value=0;gain.connect(output);
    const oscillators=[0.3,0.18,0.1].map((level,i)=>{
      const oscillator=context.createOscillator(),harmonic=context.createGain();
      oscillator.frequency.value=440*(i+1);harmonic.gain.value=level;
      oscillator.connect(harmonic).connect(gain);oscillator.start();return oscillator;
    });
    mic={context,gain,oscillators};await context.resume();window.__tutorialSkipNextAudioCapture=true;return output.stream;
  };
}

export function audioGroups(clips,continuous=[]) {
  const result=[];
  for(const clip of clips){const group=continuous.find(g=>g.includes(clip.clip));
    if(group&&group[0]!==clip.clip)continue;
    result.push(group?group.map(n=>clips.find(c=>c.clip===n)):[clip]);
  }
  return result;
}


export async function findChromium(preferred) {
  try {await access(preferred);return preferred;}catch{}
  if(process.platform!=='win32')throw new Error('Instala Chromium de Playwright');
  const cache=path.join(process.env.LOCALAPPDATA??path.join(process.env.USERPROFILE,'AppData','Local'),'ms-playwright');
  const versions=(await readdir(cache)).filter(n=>/^chromium_headless_shell-\d+$/.test(n)).sort((a,b)=>Number(b.split('-').at(-1))-Number(a.split('-').at(-1)));
  for(const name of versions){const executable=path.join(cache,name,'chrome-headless-shell-win64','chrome-headless-shell.exe');try{await access(executable);console.log('Chromium instalado: '+executable);return executable;}catch{}}
  throw new Error('No hay Chromium disponible; ejecuta playwright install chromium');
}

export async function stopProduction(server) {
  if(server.exitCode!==null)return;
  const closed=new Promise(resolve=>server.once('close',resolve));
  server.kill();
  await Promise.race([closed,new Promise(resolve=>setTimeout(resolve,5000))]);
  await assertFreePort();
  console.log('Servidor propio detenido; puerto 3100 libre.');
}
