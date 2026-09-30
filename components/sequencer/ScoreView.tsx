"use client";

import { memo, useEffect, useRef, useState } from "react";
import { activeVoices, clefAt, durationTicks, locateTick, measureStart, measureTicks, pitchToMidi, pitchToVex } from "@/lib/sequencer/model";
import { PPQ, type NoteEvent, type Score, type VoiceId } from "@/lib/sequencer/types";
import styles from "./sequencer.module.css";
import {staffPitch} from "@/lib/sequencer/mouse-editing";

export type MouseEditing={tool:"write"|"select"|"erase";step:number;accidental:"key"|"#"|"b"|""|"##"|"bb";
  onWrite:(voice:VoiceId,start:number,pitch:string,chord?:boolean)=>void;
  onErase:(id:string)=>void;onMove:(id:string,pitch:string,start?:number,ticks?:number)=>void;
  onPreview:(id:string,pitch:string)=>void;onPreviewEnd:()=>void;
  onPosition:(voice:VoiceId,start:number)=>void};

const COLORS: Record<VoiceId, string> = { melody: "#215cba", soprano: "#ba3f69", alto: "#a36215", tenor: "#247863", bass: "#435bb3" };
const values = [
  ["w", 3840], ["h", 1920], ["q", 960], ["8", 480], ["16", 240], ["32", 120],
] as const;

function displayEvents(events: NoteEvent[], start: number, end: number): NoteEvent[] {
  const result: NoteEvent[] = [];
  const fill = (from: number, to: number) => {
    while (from < to) {
      const [duration, ticks] = values.find(([, ticks]) => ticks <= to - from) ?? ["32", to - from];
      result.push({ id: "", start: from, duration, dotted: false, triplet: false, pitches: [], tie: false });
      // Fractional gaps after triplets are represented by exact invisible spacing.
      if (ticks < 120) result[result.length - 1].id = "gap:" + ticks;
      from += ticks;
    }
  };
  let cursor = start;
  for (const event of [...events].filter(e => e.start >= start && e.start < end).sort((a, b) => a.start - b.start)) {
    fill(cursor, event.start); result.push(event); cursor = event.start + durationTicks(event);
  }
  fill(cursor, end); return result;
}

type MeasureProps = {
  score: Score; measure: number; selected: string[]; locale: string;
  focusVoice: VoiceId | "all"; onSelect: (id: string, extend?: boolean) => void;
  mouse?:MouseEditing;
  continuous?: boolean;
  showAnnotations?: boolean;
};

const MeasureView = memo(function MeasureView({ score, measure, selected, locale, focusVoice, onSelect,mouse,continuous=false,showAnnotations=true }: MeasureProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    let cancelled = false;
    const cleanups:Array<()=>void>=[];
    void (async () => {
      const V = await import("vexflow");
      await document.fonts.ready;
      if (cancelled || !ref.current) return;
      const target = ref.current; target.replaceChildren();
      try {
        const voices = activeVoices(score), width = 620, rowHeight=score.mode==="satb"?110:150, height = voices.length * rowHeight + 65;
        const renderer = new V.Renderer(target, V.Renderer.Backends.SVG);
        renderer.resize(width, height);
        const context = renderer.getContext();
        const start = measureStart(score, measure), meta = score.measures[measure - 1];
        const previous = score.measures[measure - 2];
        const systemStart = !continuous || measure === 1;
        const end = start + measureTicks(meta);
        const ties: Array<{ event: NoteEvent; note: InstanceType<typeof V.StaveNote> }> = [];
        const annotationX = new Map<number,number>();
        const prepared=voices.map((sourceVoice, row) => {
          const voice={...sourceVoice,clef:clefAt(score,sourceVoice.id,measure)};
          const staveX = systemStart ? 110 : 0;
          const stave = new V.Stave(staveX, row * rowHeight + 14, width - staveX);
          if (systemStart || voice.clef!==clefAt(score,voice.id,measure-1)) stave.addClef(voice.clef);
          if (systemStart || previous.key !== meta.key)
            stave.addKeySignature(meta.key, systemStart ? undefined : previous.key);
          if (systemStart || previous.time.join("/") !== meta.time.join("/"))
            stave.addTimeSignature(meta.time.join("/"));
          if (!systemStart) stave.setBegBarType(V.BarlineType.NONE);
          if (continuous && score.measures[measure]?.key!==undefined && score.measures[measure].key!==meta.key)
            stave.setEndBarType(V.BarlineType.DOUBLE);
          stave.setContext(context).draw();
          if (systemStart) context.setFont("Academico", 14).fillText(voice.name, 8, row * rowHeight + 79);
          const events = displayEvents(voice.events, start, end);
          const notes = events.map(event => {
            const gap = event.id.startsWith("gap:");
            const note = new V.StaveNote({
              keys: event.pitches.length ? [...event.pitches].sort((a, b) => pitchToMidi(a) - pitchToMidi(b)).map(pitchToVex)
                : [voice.clef === "bass" ? "d/3" : "b/4"],
              clef: voice.clef, duration: event.duration + (event.pitches.length ? "" : "r"),
              dots: event.dotted ? 1 : 0, autoStem: score.mode!=="satb",
              ...(score.mode==="satb"?{stemDirection:voice.id==="soprano"||voice.id==="tenor"?V.Stem.UP:V.Stem.DOWN}:{}),
              ...(gap ? { durationOverride: new V.Fraction(Number(event.id.slice(4)), PPQ * 4) } : {}),
            });
            if (event.dotted) V.Dot.buildAndAttach([note], { all: true });
            const color = event.ornament ? "#dc2626" : selected.includes(event.id) ? COLORS[voice.id] : "#17273a";
            const dim = focusVoice !== "all" && focusVoice !== voice.id;
            note.setStyle({ fillStyle: gap ? "transparent" : dim ? "#aab2bd" : color, strokeStyle: gap ? "transparent" : dim ? "#aab2bd" : color });
            return note;
          });
          const tuplets: InstanceType<typeof V.Tuplet>[] = [];
          for (let i = 0; i < events.length; i++) if (events[i].triplet) {
            const group = [notes[i]];
            let next = i + 1;
            while (group.length < 3 && next < events.length && events[next].triplet
              && events[next].duration === events[i].duration && events[next].dotted === events[i].dotted) {
              group.push(notes[next]); next++;
            }
            tuplets.push(new V.Tuplet(group, { numNotes: 3, notesOccupied: 2, bracketed: true }));
            i = next - 1;
          }
          const vexVoice = new V.Voice({ numBeats: meta.time[0], beatValue: meta.time[1] }).setMode(V.Voice.Mode.SOFT);
          vexVoice.addTickables(notes);
          V.Accidental.applyAccidentals([vexVoice], meta.key);
          return {voice,row,stave,events,notes,tuplets,vexVoice};
        });
        const formatter=new V.Formatter();
        prepared.forEach(({vexVoice})=>formatter.joinVoices([vexVoice]));
        formatter.formatToStave(prepared.map(p=>p.vexVoice),prepared[0].stave);
        const section=target.closest<HTMLElement>("section");
        section?.style.setProperty("--music-start",(prepared[0].stave.getNoteStartX()/width*100)+"%");
        section?.style.setProperty("--music-end",(prepared[0].stave.getNoteEndX()/width*100)+"%");
        if(prepared.length>1) for(const type of (systemStart ? ["bracket","singleLeft","singleRight"] : ["singleRight"]) as Array<"bracket"|"singleLeft"|"singleRight">) {
          new V.StaveConnector(prepared[0].stave,prepared.at(-1)!.stave).setType(type).setContext(context).draw();
        }
        prepared.forEach(({voice,row,stave,events,notes,tuplets,vexVoice})=>{
          const beams = V.Beam.generateBeams(notes,{maintainStemDirections:score.mode==="satb"});
          vexVoice.draw(context, stave);
          beams.forEach(b => b.setContext(context).draw());
          tuplets.forEach(t => t.setContext(context).draw());
          notes.forEach((note, index) => {
            const event = events[index];
            if(row===0) annotationX.set(event.start,note.getAbsoluteX());
            const element=note.getSVGElement();
            element?.setAttribute("data-event-start",String(event.start));
            element?.setAttribute("data-event-voice",voice.id);
            if (!event.id || event.id.startsWith("gap:")) return;
            ties.push({ event, note });
            const group = note.getSVGElement();
            if (group) {
              const position = locateTick(score, event.start);
              group.setAttribute("role", "button"); group.setAttribute("tabindex", "0");
              group.setAttribute("data-note-id", event.id);
              group.setAttribute("aria-pressed", String(selected.includes(event.id)));
              group.setAttribute("aria-label", voice.name + ", " + (locale === "es" ? "compás " : "measure ") + measure
                + ", " + (locale === "es" ? "pulso " : "beat ") + position.beat.toFixed(2)
                + ", " + (event.pitches.join(" ") || (locale === "es" ? "silencio" : "rest")));
              group.addEventListener("click", e => {if(!mouse||(e as MouseEvent).detail===0)onSelect(event.id, (e as MouseEvent).shiftKey);});
              group.addEventListener("keydown", e => {
                if ((e as KeyboardEvent).key === "Enter" || (e as KeyboardEvent).key === " ") {
                  e.preventDefault(); onSelect(event.id, (e as KeyboardEvent).shiftKey);
                }
              });
            }
          });
          const real = ties.filter(t => voice.events.some(e => e.id === t.event.id));
          real.forEach((entry, index) => {
            const next = real[index + 1];
            if (entry.event.tie && next && next.event.start === entry.event.start + durationTicks(entry.event)
              && entry.event.pitches.join() === next.event.pitches.join()) {
              new V.StaveTie({ firstNote: entry.note, lastNote: next.note,
                firstIndexes: entry.event.pitches.map((_, i) => i), lastIndexes: entry.event.pitches.map((_, i) => i),
              }).setContext(context).draw();
            }
            const at=voice.events.findIndex(e=>e.id===entry.event.id);
            const following=voice.events[at+1], previous=voice.events[at-1];
            const indexes=entry.event.pitches.map((_,i)=>i);
            if(entry.event.pitches.length && entry.event.tie && following?.start===end
              && entry.event.start+durationTicks(entry.event)===end && following.pitches.join()===entry.event.pitches.join()) {
              new V.StaveTie({firstNote:entry.note,firstIndexes:indexes,lastIndexes:indexes}).setContext(context).draw();
            }
            if(entry.event.pitches.length && entry.event.start===start && previous?.tie
              && previous.start+durationTicks(previous)===start && previous.pitches.join()===entry.event.pitches.join()) {
              new V.StaveTie({lastNote:entry.note,firstIndexes:indexes,lastIndexes:indexes}).setContext(context).draw();
            }
          });
        });
        for(const annotation of showAnnotations?score.annotations??[]:[]) if(annotation.measure===measure) {
          const at=start+Math.round((annotation.beat-1)*PPQ);
          const x=annotationX.get(at)??(160+430*(at-start)/(end-start));
          context.setFont("Academico",16,annotation.kind==="roman"?"italic":"normal")
            .fillText(annotation.text,x,height-22);
        }
        const svg = target.querySelector("svg");
        svg?.setAttribute("viewBox", "0 0 " + width + " " + height);
        svg?.setAttribute("width", "100%"); svg?.removeAttribute("height");
        if (svg) { svg.style.width = "100%"; svg.style.height = "auto"; }
        if(svg&&mouse) {
          svg.setAttribute("pointer-events","all");
          svg.setAttribute("data-mouse-staff","true");
          const point=(e:PointerEvent|MouseEvent)=>{const rect=svg.getBoundingClientRect();return {x:(e.clientX-rect.left)*width/rect.width,y:(e.clientY-rect.top)*height/rect.height};};
          const pitchAt=(voice:typeof voices[number],y:number,top:number)=>{
            const pitch=staffPitch(voice.clef,y-top,meta.key);
            return mouse.accidental==="key"?pitch:pitch.replace(/(##|bb|#|b)?(-?\d+)$/,mouse.accidental+"$2");
          };
          const down=(e:PointerEvent)=>{
            if(e.button!==0)return;e.preventDefault();
            const p=point(e),row=Math.max(0,Math.min(prepared.length-1,Math.floor((p.y-14)/rowHeight)));
            const data=prepared[row],{voice,stave,events,notes}=data;
            if(p.x<stave.getNoteStartX()-12||p.y<stave.getYForLine(0)-40||p.y>stave.getYForLine(4)+45)return;
            let index=notes.findIndex(n=>Math.abs(n.getAbsoluteX()-p.x)<18);
            const dom=(e.target as Element).closest("[data-event-start]");
            if(dom?.getAttribute("data-event-voice")===voice.id)index=events.findIndex(event=>String(event.start)===dom.getAttribute("data-event-start"));
            const hit=index>=0?events[index]:null;
            if(mouse.tool==="erase"){if(hit?.id&&!hit.id.startsWith("gap:"))mouse.onErase(hit.id);return;}
            if(hit?.id&&!hit.id.startsWith("gap:")&&hit.pitches.length) {
              if(e.ctrlKey||e.metaKey){mouse.onWrite(voice.id,hit.start,pitchAt(voice,p.y,stave.getYForLine(0)),true);return;}
              const group=notes[index].getSVGElement(),original=group?.getAttribute("transform");
              const match=/^([A-G])(?:##|bb|#|b)?(-?\d+)$/.exec(hit.pitches[0])!;
              const anchor=Number(match[2])*7+"CDEFGAB".indexOf(match[1]),top=voice.clef==="bass"?26:38;
              const movedPitch=(delta:number)=>pitchAt(voice,stave.getYForLine(0)+(top-anchor)*5+delta,stave.getYForLine(0));
              let heardPitch=hit.pitches[0];mouse.onPreview(hit.id,heardPitch);
              const move=(event:PointerEvent)=>{
                const delta=point(event).y-p.y;
                if(group&&Math.abs(delta)>4)group.setAttribute("transform","translate(0 "+delta+")");
                if(mouse.tool!=="select"&&Math.abs(delta)>4){try{const pitch=movedPitch(delta);if(pitch!==heardPitch){heardPitch=pitch;mouse.onPreview(hit.id,pitch);}}catch{/* Outside MIDI range: keep the last valid preview. */}}
              };
              const finish=(event:PointerEvent)=>{
                window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",abort);
                mouse.onPreviewEnd();
                if(group){if(original)group.setAttribute("transform",original);else group.removeAttribute("transform");}
                const endPoint=point(event);
                if(Math.abs(endPoint.y-p.y)>4&&mouse.tool!=="select") {
                  mouse.onMove(hit.id,movedPitch(endPoint.y-p.y));
                }
                else onSelect(hit.id,e.shiftKey);
              };
              const abort=()=>{mouse.onPreviewEnd();window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",abort);if(group){if(original)group.setAttribute("transform",original);else group.removeAttribute("transform");}};
              window.addEventListener("pointermove",move);window.addEventListener("pointerup",finish,{once:true});window.addEventListener("pointercancel",abort,{once:true});cleanups.push(abort);return;
            }
            if(mouse.tool==="select"&&hit?.id&&!hit.id.startsWith("gap:")){onSelect(hit.id,e.shiftKey);return;}
            const anchors=events.map((event,i)=>({x:notes[i].getAbsoluteX(),tick:event.start})).concat({x:stave.getNoteEndX(),tick:end}).sort((a,b)=>a.x-b.x);
            const left=[...anchors].reverse().find(a=>a.x<=p.x)??{x:stave.getNoteStartX(),tick:start};
            const right=anchors.find(a=>a.x>p.x)??anchors.at(-1)!;
            const raw=left.tick+(right.tick-left.tick)*Math.max(0,Math.min(1,(p.x-left.x)/Math.max(1,right.x-left.x)));
            const tick=hit?hit.start:start+Math.min(end-start-PPQ/8,Math.max(0,Math.round((raw-start)/mouse.step)*mouse.step));
            if(mouse.tool==="select"){mouse.onPosition(voice.id,tick);return;}
            mouse.onWrite(voice.id,tick,pitchAt(voice,p.y,stave.getYForLine(0)));
          };
          const erase=(e:MouseEvent)=>{
            e.preventDefault();const p=point(e),dom=(e.target as Element).closest("[data-note-id]");
            let id=dom?.getAttribute("data-note-id");
            if(!id)for(const data of prepared)if(Math.abs(p.y-(data.stave.getYForLine(0)+20))<65){
              const i=data.notes.findIndex(n=>Math.abs(n.getAbsoluteX()-p.x)<23);
              if(i>=0&&data.events[i].id&&!data.events[i].id.startsWith("gap:"))id=data.events[i].id;
            }
            if(id)mouse.onErase(id);
          };
          svg.addEventListener("pointerdown",down);svg.addEventListener("contextmenu",erase);
          cleanups.push(()=>{svg.removeEventListener("pointerdown",down);svg.removeEventListener("contextmenu",erase);});
        }
        setError("");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Notation error");
      }
    })();
    return () => { cancelled = true;cleanups.forEach(clean=>clean()); };
  }, [score, measure, selected, locale, focusVoice, onSelect,mouse,continuous,showAnnotations]);
  return <><div ref={ref} className={styles.notation} />{error && <p role="alert" className={styles.renderError}>{error}</p>}</>;
});

export default function ScoreView({ score, selected, locale, onSelect, mouse,tick,cursorTick, focusVoice = "all", from = 1, to = score.measures.length,layout="scene",showAnnotations=true,onAnnotation }: Omit<MeasureProps, "measure"> & {
  tick: number | null; from?: number; to?: number;layout?:"line"|"page"|"scene";
  cursorTick?:number;
  onAnnotation?:(measure:number,beat:number,text:string)=>void;
}) {
  const surface=useRef<HTMLDivElement>(null);
  const playingMeasure=tick===null?null:locateTick(score,tick).measure;
  useEffect(()=>{
    if(layout!=="line"||playingMeasure===null)return;
    const container=surface.current,bar=container?.querySelector<HTMLElement>('[data-measure="'+playingMeasure+'"]');
    if(container&&bar&&(bar.offsetLeft<container.scrollLeft||bar.offsetLeft+bar.offsetWidth>container.scrollLeft+container.clientWidth))
      container.scrollTo({left:Math.max(0,bar.offsetLeft-container.clientWidth/4),behavior:"auto"});
  },[layout,playingMeasure]);
  return <div ref={surface} className={styles.scoreSurface} data-layout={layout} data-testid="score-view"><div className={styles.measures}>
    {score.measures.map((measure, index) => {
      const n = index + 1;
      if (n < from || n > to) return null;
      const start = measureStart(score, n), length = measureTicks(measure);
      const displayedTick=tick??cursorTick;
      const playing = displayedTick !== undefined && displayedTick !== null && displayedTick >= start && displayedTick < start + length;
      return <section key={measure.id} data-measure={n} className={styles.measure} aria-label={(locale === "es" ? "Compás " : "Measure ") + n}>
        <div className={styles.measureHeading}><span>{String(n).padStart(2, "0")}</span>{(layout!=="line" || n===1 || score.measures[index-1].key!==measure.key || score.measures[index-1].time.join("/")!==measure.time.join("/")) && <span>{measure.key} / {measure.time.join("/")}</span>}</div>
        <MeasureView score={score} measure={n} selected={selected} locale={locale} focusVoice={focusVoice} onSelect={onSelect} mouse={mouse} continuous={layout==="line"} showAnnotations={showAnnotations} />
        {showAnnotations&&onAnnotation&&<div className={styles.inlineCiphers} style={{gridTemplateColumns:`repeat(${Math.ceil(length/PPQ)},minmax(0,1fr))`}}>
          {Array.from({length:Math.ceil(length/PPQ)},(_,i)=>{const annotation=score.annotations?.find(a=>a.kind==="roman"&&a.measure===n&&a.beat===i+1);return <input key={annotation?.id+":"+(annotation?.text??"")+":"+i} defaultValue={annotation?.text??""} aria-label={(locale==="es"?"Cifrado compás ":"Cipher measure ")+n+(locale==="es"?", pulso ":", beat ")+(i+1)} placeholder="—" maxLength={200} onBlur={e=>{if(e.target.value!==(annotation?.text??""))onAnnotation(n,i+1,e.target.value);}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/>;})}
        </div>}
        {playing && <div data-testid="staff-cursor" className={styles.playhead} style={{ background:tick===null?"#2563eb":"#bb4166",left: `calc(var(--music-start,14%) + (var(--music-end,97%) - var(--music-start,14%)) * ${(displayedTick! - start) / length})` }} />}
      </section>;
    })}
  </div></div>;
}
