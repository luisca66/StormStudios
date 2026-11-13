import {spawn} from 'node:child_process';

async function stripe(file,time){
  const bytes=await new Promise((resolve,reject)=>{
    const p=spawn('ffmpeg',['-v','error','-ss',String(Math.max(0,time)),'-i',file,'-frames:v','1','-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{windowsHide:true});
    const chunks=[];let error='';p.stdout.on('data',d=>chunks.push(d));p.stderr.on('data',d=>error+=d);p.on('error',reject);p.on('close',c=>c?reject(new Error(error)):resolve(Buffer.concat(chunks)));
  });
  const counts=new Int32Array(1920);
  for(let y=270;y<1050;y++)for(let x=120;x<1470;x++){
    const i=(y*1920+x)*3,r=bytes[i],g=bytes[i+1],b=bytes[i+2];
    if(r>90&&r<215&&g>15&&g<120&&b>35&&b<160&&r-g>30&&b-g>3)counts[x]++;
  }
  let best=0;for(let x=120;x<1470;x++)if(counts[x]>counts[best])best=x;
  return counts[best]>65?best:null;
}

/** Measure publication latency of the rendered red staff cursor against the engine clock.
 * Fit only the first measure, before automatic horizontal scrolling can change its origin. */
export async function measureTutorialOnset(file,start){
  const samples=[];
  for(const offset of [-.02,.02,.15,.4,.8,1.2,1.6])samples.push({offset,x:await stripe(file,start+offset)});
  const baseline=samples[0].x??samples[1].x,usable=samples.filter(s=>s.offset>=.15&&s.x!==null);
  let estimatedVisualOnsetErrorMs=null,pixelsPerSecond=null;
  if(baseline!==null&&usable.length>=3){
    const meanT=usable.reduce((a,s)=>a+s.offset,0)/usable.length,meanX=usable.reduce((a,s)=>a+s.x,0)/usable.length;
    pixelsPerSecond=usable.reduce((a,s)=>a+(s.offset-meanT)*(s.x-meanX),0)/usable.reduce((a,s)=>a+(s.offset-meanT)**2,0);
    if(pixelsPerSecond>5)estimatedVisualOnsetErrorMs=((baseline-(meanX-pixelsPerSecond*meanT))/pixelsPerSecond)*1000;
  }
  return{samples,estimatedVisualOnsetErrorMs,pixelsPerSecond,within40ms:estimatedVisualOnsetErrorMs!==null&&Math.abs(estimatedVisualOnsetErrorMs)<=40};
}

/** Locate the purple click ring or fresh keyboard-badge pulse in encoded CFR frames. */
export async function measureTutorialMarker(file,gesture,epoch){
  const x=gesture.kind==='key'?840:Math.max(0,Math.min(1832,Math.floor(gesture.x-44)));
  const y=gesture.kind==='key'?990:Math.max(0,Math.min(992,Math.floor(gesture.y-44)));
  const width=gesture.kind==='key'?240:88,height=gesture.kind==='key'?70:88;
  const first=Math.max(0,Math.floor((gesture.visualTime-epoch)/1000*30)-1),samples=[];let baseline=Infinity;
  for(let frame=first;frame<=first+6;frame++){
    const bytes=await new Promise((resolve,reject)=>{const p=spawn('ffmpeg',['-v','error','-ss',String(frame/30),'-i',file,'-frames:v','1','-vf',`crop=${width}:${height}:${x}:${y}`,'-pix_fmt','rgb24','-f','rawvideo','pipe:1'],{windowsHide:true});let error='';const chunks=[];p.stdout.on('data',d=>chunks.push(d));p.stderr.on('data',d=>error+=d);p.on('error',reject);p.on('close',code=>code?reject(new Error(error)):resolve(Buffer.concat(chunks)));});
    let purple=0;for(let i=0;i<bytes.length;i+=3){const r=bytes[i],g=bytes[i+1],b=bytes[i+2];if(r>100&&r<161&&g>60&&g<121&&b>210&&b-r>70)purple++;}
    samples.push({frame,purple});
    if(samples.length>1&&purple>baseline+20)return {visualTime:epoch+frame/30*1000,samples};
    baseline=Math.min(baseline,purple);
  }
  return {visualTime:null,samples};
}
