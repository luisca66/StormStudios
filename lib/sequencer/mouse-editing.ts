import {durationTicks,keySignature,locateTick,measureStart,measureTicks,newId,pitchToMidi,scoreTicks,splitTicks,validateScore} from "./model";
import {PPQ,type NoteEvent,type Score,type VoiceId} from "./types";

/** Divide only at bar boundaries; retain the first id for selection and lyrics. */
export function splitEventAtBars(score:Score,event:NoteEvent):NoteEvent[] {
  const end=event.start+durationTicks(event);
  if (end > scoreTicks(score)) throw new Error("La nota termina después del final de la partitura. Añade un compás.");
  const result:NoteEvent[]=[];let position=event.start,first=true;
  while(position<end){
    const at=locateTick(score,position).measure;
    const segmentEnd=Math.min(end,measureStart(score,at)+measureTicks(score.measures[at-1]));
    const values=segmentEnd===end&&position===event.start?[{duration:event.duration,dotted:event.dotted,triplet:event.triplet}]:splitTicks(segmentEnd-position);
    if(!values)throw new Error("La nota cruza una subdivisión incompatible. Elige otra duración o posición.");
    for(const value of values){
      const finishes=position+durationTicks(value)===end;
      const part:NoteEvent={...event,...value,id:first?event.id:newId(),start:position,pitches:[...event.pitches],tie:event.pitches.length>0&&(!finishes||event.tie)};
      if(!first)delete part.text;
      result.push(part);position+=durationTicks(value);first=false;
    }
  }
  return result;
}

/** Staff top lines are F5 (treble) and A3 (bass); each space/line step is five SVG units. */
export function staffPitch(clef:"treble"|"bass",offsetY:number,key:string) {
  const step=(clef==="bass"?26:38)-Math.round(offsetY/5);
  const letter="CDEFGAB"[((step%7)+7)%7],octave=Math.floor(step/7);
  const {fifths}=keySignature(key);
  const altered=(fifths>0?"FCGDAEB":"BEADGCF").slice(0,Math.abs(fifths)).includes(letter);
  const pitch=letter+(altered?(fifths>0?"#":"b"):"")+octave;
  pitchToMidi(pitch);return pitch;
}

/** Replace only the touched span; retain representable fragments on either side. */
export function writeWithMouse(score:Score,voiceId:VoiceId,event:NoteEvent):Score {
  const next=structuredClone(score),voice=next.voices.find(v=>v.id===voiceId)!;
  const end=event.start+durationTicks(event);
  const fragments=(old:NoteEvent,start:number,ticks:number,tie:boolean)=>{
    const values=splitTicks(ticks);
    if(!values)throw new Error("La edición corta una subdivisión incompatible. Elige otra duración o posición.");
    return values.map((value,index)=>{const part={...old,...value,id:newId(),start,pitches:[...old.pitches],tie:old.pitches.length>0&&(index<values.length-1||tie)};start+=durationTicks(value);return part;});
  };
  voice.events=voice.events.flatMap(old=>{
    const oldEnd=old.start+durationTicks(old);
    if(oldEnd<=event.start||old.start>=end)return [old];
    const result:NoteEvent[]=[];
    if(old.start<event.start)result.push(...fragments(old,old.start,event.start-old.start,false));
    if(oldEnd>end)result.push(...fragments(old,end,oldEnd-end,old.tie));
    return result;
  });
  voice.events.push(...splitEventAtBars(next,event));
  return validateScore(next);
}

export function moveWithMouse(score:Score,id:string,pitch:string,start?:number,ticks?:number):Score {
  const next=structuredClone(score),voice=next.voices.find(v=>v.events.some(e=>e.id===id))!;
  const event=voice.events.find(e=>e.id===id)!;
  // Preserve chords by transposing every pitch by the same interval.
  const delta=pitchToMidi(pitch)-pitchToMidi(event.pitches[0]??pitch);
  if(event.pitches.length===1)event.pitches=[pitch];
  else if(delta!==0) {
    // Imported separately to keep enharmonic spelling at unchanged pitches.
    event.pitches=event.pitches.map(p=>transposeMidi(p,delta));
  }
  if(start!==undefined)event.start=start;
  if(ticks!==undefined){
    const choices=(['w','h','q','8','16','32'] as const).flatMap(duration=>[false,true].flatMap(dotted=>[false,true].map(triplet=>({duration,dotted,triplet}))));
    const value=choices.sort((a,b)=>Math.abs(durationTicks(a)-ticks)-Math.abs(durationTicks(b)-ticks))[0];
    Object.assign(event,value);
  }
  voice.events=voice.events.flatMap(old=>old.id===id?splitEventAtBars(next,event):[old]);
  return validateScore(next);
}

import {midiToPitch} from "./model";
function transposeMidi(pitch:string,delta:number){return midiToPitch(pitchToMidi(pitch)+delta);}

export function rollTick(score:Score,raw:number,step:number) {
  const location=locateTick(score,Math.max(0,raw)),start=measureStart(score,location.measure);
  return start+Math.min(measureTicks(score.measures[location.measure-1])-Math.min(step,PPQ/8),Math.max(0,Math.round((raw-start)/step)*step));
}
