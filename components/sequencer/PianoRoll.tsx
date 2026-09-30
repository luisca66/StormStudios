"use client";
import {useEffect,useRef} from "react";
import {durationTicks,locateTick,measureStart,measureTicks,midiToPitch,pitchToMidi,scoreTicks,activeVoices} from "@/lib/sequencer/model";
import {rollTick} from "@/lib/sequencer/mouse-editing";
import {PPQ,type NoteEvent,type Score} from "@/lib/sequencer/types";
import type {MouseEditing} from "./ScoreView";
import styles from "./sequencer.module.css";

export default function PianoRoll({score,selected,mouse,voiceId,onSelect,locale,tick=null,positionTick=0}:{score:Score;selected:string[];mouse:MouseEditing;voiceId:Score["voices"][number]["id"];onSelect:(id:string,extend?:boolean)=>void;locale:string;tick?:number|null;positionTick?:number}){
  const surface=useRef<HTMLDivElement>(null),cancelDrag=useRef<(()=>void)|null>(null);
  useEffect(()=>()=>cancelDrag.current?.(),[]);
  const events=activeVoices(score).flatMap(voice=>voice.events.map(event=>({voice,event})));
  const pitches=events.flatMap(e=>e.event.pitches.map(pitchToMidi));
  const low=Math.min(38,...pitches),high=Math.max(84,...pitches),es=locale==="es";
  useEffect(()=>{const container=surface.current;if(!container||tick===null)return;const x=70+tick/PPQ*48;
    if(x<container.scrollLeft+70||x>container.scrollLeft+container.clientWidth-30)container.scrollTo({left:Math.max(0,x-container.clientWidth/3),behavior:"auto"});
  },[tick]);
  const drag=(e:React.PointerEvent<HTMLButtonElement>,event:NoteEvent)=>{
    if(e.button!==0)return;e.preventDefault();e.stopPropagation();
    cancelDrag.current?.();
    if(mouse.tool==="erase"){mouse.onErase(event.id);return;}
    const button=e.currentTarget,bounds=button.getBoundingClientRect(),resize=e.clientX>bounds.right-12;
    const x=e.clientX,y=e.clientY;
    let heardPitch=event.pitches[0];mouse.onPreview(event.id,heardPitch);
    const movedPitch=(delta:number)=>midiToPitch(Math.max(0,Math.min(127,pitchToMidi(event.pitches[0])-Math.round(delta/26))));
    const move=(ev:PointerEvent)=>{button.style.transform="translate("+(resize?0:ev.clientX-x)+"px,"+(resize?0:ev.clientY-y)+"px)";if(resize)button.style.width=Math.max(12,bounds.width+ev.clientX-x)+"px";
      else if(mouse.tool==="write"){const pitch=movedPitch(ev.clientY-y);if(pitch!==heardPitch){heardPitch=pitch;mouse.onPreview(event.id,pitch);}}
    };
    const finish=(ev:PointerEvent)=>{
      window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",cancel);
      mouse.onPreviewEnd();
      cancelDrag.current=null;
      button.style.transform="";button.style.width=Math.max(12,durationTicks(event)/PPQ*48-2)+"px";
      if(Math.abs(ev.clientX-x)<4&&Math.abs(ev.clientY-y)<4){onSelect(event.id,e.shiftKey);return;}
      if(resize)mouse.onMove(event.id,event.pitches[0],undefined,Math.max(PPQ/8,durationTicks(event)+(ev.clientX-x)/48*PPQ));
      else if(mouse.tool==="write"){
        const pitch=movedPitch(ev.clientY-y);
        const start=rollTick(score,event.start+(ev.clientX-x)/48*PPQ,PPQ/8);
        mouse.onMove(event.id,pitch,start);
      }
    };
    const cancel=()=>{cancelDrag.current=null;mouse.onPreviewEnd();window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",cancel);button.style.transform="";button.style.width=Math.max(12,durationTicks(event)/PPQ*48-2)+"px";};
    cancelDrag.current=cancel;
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",finish,{once:true});window.addEventListener("pointercancel",cancel,{once:true});
  };
  return <div ref={surface} className={styles.roll} data-testid="piano-roll"><div className={styles.rollInner} style={{width:70+scoreTicks(score)/PPQ*48}}>
    <div className={styles.rollMeasures}>{score.measures.map((measure,i)=><div key={measure.id} style={{left:70+measureStart(score,i+1)/PPQ*48,width:measureTicks(measure)/PPQ*48}}>{es?"Compás ":"Measure "}{i+1} · {measure.time.join("/")}</div>)}</div>
    {score.measures.map((measure,i)=><div key={measure.id} className={styles.rollBarline} style={{left:70+measureStart(score,i+1)/PPQ*48}}/>)}
    <div data-testid="roll-cursor" className={styles.rollCursor} style={{left:70+(tick??positionTick)/PPQ*48,background:tick===null?"#2563eb":"#e11d48"}}/>
    {Array.from({length:high-low+1},(_,i)=>high-i).map(midi=><div className={styles.rollRow} style={{background:[1,3,6,8,10].includes(midi%12)?"#f1f5f9":"#fff"}} key={midi}>
      <span className={styles.rollLabel}>{midiToPitch(midi)}</span><div className={styles.rollTrack} data-pitch={midiToPitch(midi)}
        onPointerDown={e=>{if(e.button!==0||mouse.tool==="erase"||e.target!==e.currentTarget)return;e.preventDefault();const x=e.clientX-e.currentTarget.getBoundingClientRect().left,start=rollTick(score,x/48*PPQ,mouse.step);if(mouse.tool==="select")mouse.onPosition(voiceId,start);else mouse.onWrite(voiceId,start,midiToPitch(midi));}}
        onContextMenu={e=>e.preventDefault()}>
        {events.filter(({event})=>event.pitches.some(p=>pitchToMidi(p)===midi)).map(({voice,event})=><button key={event.id}
          data-roll-note={event.id} className={styles.rollNote} aria-pressed={selected.includes(event.id)} aria-label={voice.name+", "+midiToPitch(midi)+", "+(es?"compás ":"measure ")+locateTick(score,event.start).measure}
          onPointerDown={e=>drag(e,event)} onClick={e=>{if(e.detail===0)onSelect(event.id,e.shiftKey);}}
          onContextMenu={e=>{e.preventDefault();e.stopPropagation();mouse.onErase(event.id);}}
          style={{left:event.start/PPQ*48,width:Math.max(12,durationTicks(event)/PPQ*48-2),background:selected.includes(event.id)?"#f59e0b":({melody:"#2563eb",soprano:"#ec4899",alto:"#f59e0b",tenor:"#10b981",bass:"#8b5cf6"}[voice.id])}}>
          {midiToPitch(midi)}<span className={styles.resizeGrip} aria-hidden="true">⋮</span></button>)}
      </div></div>)}
  </div></div>;
}
