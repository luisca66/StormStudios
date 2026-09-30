import { createScore, durationTicks, newId, pitchToMidi, validateScore } from "./model";
import { PPQ, VOICE_IDS, type Duration, type NoteEvent, type Score } from "./types";

/** Uncompressed score-partwise MusicXML. Reject unsupported polyphony instead of losing notes. */
export function importMusicXml(text: string): Score {
  if (text.length>4_000_000) throw new Error("El MusicXML es demasiado grande.");
  if (/<!ENTITY\b/i.test(text)||/<!DOCTYPE[^>]*\[/i.test(text)) throw new Error("MusicXML con declaraciones de entidades no admitido.");
  // Ignore the standard external MusicXML DTD; never retrieve external declarations.
  const source=text.replace(/<!DOCTYPE[^>]*>/gi,"");
  const document = new DOMParser().parseFromString(source,"application/xml");
  if(document.querySelector("parsererror"))throw new Error("MusicXML inválido.");
  const root=document.documentElement;
  if(root.tagName!=="score-partwise")throw new Error("Se admite MusicXML score-partwise sin comprimir (.musicxml o .xml).");
  const parts=[...root.children].filter(e=>e.tagName==="part");
  if(!parts.length||parts.length>4)throw new Error("Importa una melodía o hasta cuatro partes separadas.");
  const count=Math.max(...parts.map(p=>[...p.children].filter(e=>e.tagName==="measure").length));
  if(count<1||count>128)throw new Error("El MusicXML debe tener entre 1 y 128 compases.");
  const score=createScore(parts.length===1?"single":"satb");
  score.title=root.querySelector("work-title, movement-title")?.textContent?.trim()||"MusicXML";
  score.measures=Array.from({length:count},()=>({id:newId(),time:[4,4],key:"C"}));
  score.scenes[0].title=score.title;score.scenes[0].endMeasure=count;
  const major=["Cb","Gb","Db","Ab","Eb","Bb","F","C","G","D","A","E","B","F#","C#"];
  const minor=["Abm","Ebm","Bbm","Fm","Cm","Gm","Dm","Am","Em","Bm","F#m","C#m","G#m","D#m","A#m"];
  const valueNames:Record<string,Duration>={whole:"w",half:"h",quarter:"q",eighth:"8","16th":"16","32nd":"32"};
  const number=(element:Element|null,fallback:number)=>element?Number(element.textContent):fallback;
  let reference:string[]=[];
  parts.forEach((part,index)=>{
    const id=parts.length===1?"melody":VOICE_IDS[index+1];
    const voice=score.voices.find(v=>v.id===id)!;
    const partId=part.getAttribute("id");
    const definition=[...root.querySelectorAll("score-part")].find(p=>p.getAttribute("id")===partId);
    voice.name=definition?.querySelector("part-name")?.textContent?.trim()||voice.name;
    let divisions=1,time:[number,number]=[4,4],key="C",absolute=0;
    const meters:string[]=[];
    [...part.children].filter(e=>e.tagName==="measure").forEach((measure,m)=>{
      let offset=0,last:NoteEvent|null=null;
      for(const item of [...measure.children]){
        if(item.tagName==="attributes"){
          divisions=number(item.querySelector("divisions"),divisions);
          if(!Number.isInteger(divisions)||divisions<1||divisions>100000)throw new Error("Divisiones rítmicas no válidas.");
          const meter=item.querySelector("time");
          if(meter){time=[number(meter.querySelector("beats"),4),number(meter.querySelector("beat-type"),4)];if(index===0)score.measures[m].timeChange=true;}
          const signature=item.querySelector("key");
          if(signature){
            const fifths=number(signature.querySelector("fifths"),0);
            if(!Number.isInteger(fifths)||fifths < -7||fifths>7)throw new Error("Armadura no compatible.");
            key=(signature.querySelector("mode")?.textContent==="minor"?minor:major)[fifths+7];
            if(index===0)score.measures[m].keyChange=true;
          }
          const clef=item.querySelector("clef");
          if(clef){
            const sign=clef.querySelector("sign")?.textContent;
            if(sign!=="G"&&sign!=="F")throw new Error("Por ahora la importación admite claves de sol y fa.");
            const next=sign==="F"?"bass":"treble";
            if(offset!==0)throw new Error("Los cambios de clave dentro de un compás requieren dividir el compás antes de importar.");
            if(m===0)voice.clef=next;
            else score.measures[m].clefs={...score.measures[m].clefs,[id]:next};
          }
        }else if(item.tagName==="backup"){
          throw new Error("Hay varias voces en una misma parte. Exporta cada voz en una parte separada.");
        }else if(item.tagName==="forward"){
          offset+=number(item.querySelector("duration"),0)*PPQ/divisions;
        }else if(item.tagName==="direction"){
          const tempo=Number(item.querySelector("sound")?.getAttribute("tempo"));
          if(index===0&&m===0&&tempo>0)score.tempo=tempo;
          if(index===0) for(const words of item.querySelectorAll("direction-type > words")) {
            const text=words.textContent?.trim();
            if(text) {
              const at=offset+number(item.querySelector("offset"),0)*PPQ/divisions;
              score.annotations??=[];
              score.annotations.push({id:newId(),measure:m+1,beat:1+at/PPQ,text,kind:words.getAttribute("font-style")==="italic"?"roman":"text"});
            }
          }
        }else if(item.tagName==="note"){
          if(item.querySelector("grace"))throw new Error("Los adornos deben convertirse a notas con duración para importar.");
          const actual=number(item.querySelector("duration"),0)*PPQ/divisions;
          if(!Number.isInteger(actual)||actual<=0)throw new Error("Duración de nota no representable.");
          const pitch=item.querySelector("pitch");
          const pitches:string[]=[];
          if(pitch){
            const step=pitch.querySelector("step")?.textContent??"";
            const alter=number(pitch.querySelector("alter"),0);
            if(!Number.isInteger(alter)||Math.abs(alter)>2)throw new Error("Solo se admiten alteraciones de hasta dos semitonos.");
            const p=step+(alter>0?"#".repeat(alter):"b".repeat(-alter))+number(pitch.querySelector("octave"),4);
            pitchToMidi(p);pitches.push(p);
          }else if(!item.querySelector("rest"))throw new Error("No se admiten notas sin altura o silencio.");
          if(item.querySelector("chord")){
            if(!last||!pitches.length||durationTicks(last)!==actual)throw new Error("Acorde con duraciones incompatibles.");
            last.pitches.push(...pitches);continue;
          }
          const type=item.querySelector("type")?.textContent??"",dotted=!!item.querySelector("dot");
          const modification=item.querySelector("time-modification");
          if(modification&&(number(modification.querySelector("actual-notes"),3)!==3||number(modification.querySelector("normal-notes"),2)!==2))
            throw new Error("Por ahora se admiten tresillos 3:2.");
          let duration:Duration=valueNames[type]??"q";
          let value={duration,dotted,triplet:!!modification};
          if(durationTicks(value)!==actual){
            const candidates=(["w","h","q","8","16","32"] as Duration[]).flatMap(duration=>
              [false,true].flatMap(dotted=>[false,true].map(triplet=>({duration,dotted,triplet}))));
            const match=candidates.find(v=>durationTicks(v)===actual);
            if(!match)throw new Error("La duración necesita subdivisión antes de importar.");
            value=match;duration=match.duration;
          }
          last={id:newId(),start:absolute+offset,...value,pitches,
            tie:[...item.querySelectorAll("tie,tied")].some(t=>t.getAttribute("type")==="start"),
            ...(item.getAttribute("color")?.toLowerCase()==="#ef4444"?{ornament:true}:{}),
            ...(item.querySelector("lyric > text")?{text:item.querySelector("lyric > text")!.textContent??""}:{})};
          voice.events.push(last);offset+=actual;
        }
      }
      meters.push(time.join("/")+" "+key);
      if(index===0)score.measures[m]={...score.measures[m],time:[...time],key};
      if(index>0&&reference[m]!==meters[m])throw new Error("Las partes deben compartir compás y armadura.");
      absolute+=time[0]*PPQ*4/time[1];
    });
    if(index===0)reference=meters;
  });
  return validateScore(score);
}
