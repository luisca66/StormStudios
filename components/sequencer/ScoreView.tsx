"use client";

import { memo, useEffect, useMemo, useRef, useState } from "react";
import { activeVoices, clefAt, durationTicks, locateTick, measureStart, measureTicks, pitchToMidi, pitchToVex, scoreTicks } from "@/lib/sequencer/model";
import { PPQ, type NoteEvent, type Score, type VoiceId } from "@/lib/sequencer/types";
import styles from "./sequencer.module.css";
import {staffPitch} from "@/lib/sequencer/mouse-editing";
import type { Still } from "@/lib/sequencer/storyboard";
import { STILL_COLORS } from "@/lib/sequencer/storyboard-resolve";
import { captureX, decorateCapture, type CaptureRow } from "@/lib/sequencer/capture-decoration";
import type { CaptureLayout } from "@/lib/sequencer/capture-layout";

export type MouseEditing={tool:"write"|"select"|"erase";step:number;accidental:"key"|"#"|"b"|""|"##"|"bb";
  onWrite:(voice:VoiceId,start:number,pitch:string,chord?:boolean)=>void;
  onErase:(id:string)=>void;onMove:(id:string,pitch:string,start?:number,ticks?:number)=>void;
  onPreview:(id:string,pitch:string)=>void;onPreviewEnd:()=>void;
  onPosition:(voice:VoiceId,start:number)=>void;
  /** Select tool on empty space: rubber-band selection across measures. `click` runs if the pointer barely moved. */
  beginMarquee?:(e:PointerEvent,click?:()=>void)=>void};
const SELECTED = "#7c5cff";

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
  /** Page layout: forces the start of a system (clef, key, names) and the SVG width. */
  systemStart?: boolean;
  renderWidth?: number;
  showAnnotations?: boolean;
  /** Optional stage decorations. Editor behavior is unchanged when omitted. */
  capture?: Still;
  captureLayout?: CaptureLayout;
};

const MeasureView = memo(function MeasureView({ score, measure, selected, locale, focusVoice, onSelect,mouse,continuous=false,systemStart:startsSystem,renderWidth,showAnnotations=true,capture,captureLayout }: MeasureProps) {
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
        const voices = activeVoices(score).filter(v => !capture?.voices || capture.voices === "all" || capture.voices.includes(v.id));
        const width = captureLayout?.widths[measure] ?? renderWidth ?? 620, rowHeight = captureLayout?.rowHeight ?? (score.mode === "satb" ? 110 : 150), height = captureLayout?.height ?? voices.length * rowHeight + 65;
        const renderer = new V.Renderer(target, V.Renderer.Backends.SVG);
        renderer.resize(width, height);
        const context = renderer.getContext();
        const start = measureStart(score, measure), meta = score.measures[measure - 1];
        const previous = score.measures[measure - 2];
        const systemStart = captureLayout ? measure === captureLayout.from : startsSystem ?? (!continuous || measure === 1);
        const end = start + measureTicks(meta);
        const ties: Array<{ event: NoteEvent; note: InstanceType<typeof V.StaveNote> }> = [];
        const annotationX = new Map<number,number>();
        const captureRows: CaptureRow[] = [];
        const positionTick = (m: number, beat = 1) => measureStart(score, m) + (beat - 1) * PPQ;
        const revealTick = capture?.reveal ? positionTick(capture.reveal.measure, capture.reveal.beat) : Infinity;
        const prepared=voices.map((sourceVoice, row) => {
          const voice={...sourceVoice,clef:clefAt(score,sourceVoice.id,measure)};
          const staveX = captureLayout ? (systemStart ? (score.mode === "single" ? 6 : 75) : 0) : systemStart ? 110 : 0;
          const stave = new V.Stave(staveX, row * rowHeight + (captureLayout?.staveY ?? 14), width - staveX);
          if (systemStart || voice.clef!==clefAt(score,voice.id,measure-1)) stave.addClef(voice.clef);
          if (systemStart || previous.key !== meta.key)
            stave.addKeySignature(meta.key, systemStart ? undefined : previous.key);
          // New page systems repeat clef and key, but the meter only appears at the start or when it changes.
          if ((systemStart && (startsSystem === undefined || measure === 1)) || (measure > 1 && previous.time.join("/") !== meta.time.join("/")))
            stave.addTimeSignature(meta.time.join("/"));
          if (!systemStart) stave.setBegBarType(V.BarlineType.NONE);
          const following = score.measures[measure];
          if (continuous && following && (following.key !== meta.key || following.time.join("/") !== meta.time.join("/") || following.keyChange || following.timeChange))
            stave.setEndBarType(V.BarlineType.DOUBLE);
          if (captureLayout) {
            stave.setEndBarType(measure === captureLayout.to ? V.BarlineType.DOUBLE : V.BarlineType.SINGLE);
            stave.setStyle({ strokeStyle: "#182030", fillStyle: "#182030" });
            if (focusVoice !== "all" && focusVoice !== voice.id) stave.setStyle({ strokeStyle: "#aab2bd", fillStyle: "#aab2bd" });
          }
          stave.setContext(context).draw();
          if (systemStart && (!capture || score.mode !== "single")) context.setFont("Academico", 14).fillText(voice.name, 8, row * rowHeight + (captureLayout ? 90 : 79));
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
            const color = event.ornament ? "#dc2626" : selected.includes(event.id) ? SELECTED : capture ? "#182030" : "#17273a";
            const dim = focusVoice !== "all" && focusVoice !== voice.id;
            note.setStyle({ fillStyle: gap ? "transparent" : dim ? "#aab2bd" : color, strokeStyle: gap ? "transparent" : dim ? "#aab2bd" : color });
            const mark = capture?.marks?.find(m => m.measure === measure && positionTick(m.measure, m.beat) === event.start && (!m.voice || m.voice === voice.id));
            if (mark) event.pitches.forEach((_, i) => note.setKeyStyle(i, { fillStyle: STILL_COLORS[mark.color ?? "amber"], strokeStyle: STILL_COLORS[mark.color ?? "amber"] }));
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
        // Capture shares tick contexts across voices, including beats silent in the first voice.
        if (capture) prepared.forEach(({ notes, stave }) => notes.forEach(note => note.setStave(stave)));
        const section=target.closest<HTMLElement>("section");
        section?.style.setProperty("--music-start",(prepared[0].stave.getNoteStartX()/width*100)+"%");
        section?.style.setProperty("--music-end",(prepared[0].stave.getNoteEndX()/width*100)+"%");
        if(prepared.length>1) // Only the system opening joins the staves; bar lines stay per staff so each one shows its own double bar.
        for(const type of (systemStart ? ["bracket","singleLeft"] : []) as Array<"bracket"|"singleLeft">) {
          new V.StaveConnector(prepared[0].stave,prepared.at(-1)!.stave).setType(type).setContext(context).draw();
        }
        prepared.forEach(({voice,row,stave,events,notes,tuplets,vexVoice})=>{
          const beams = V.Beam.generateBeams(notes,{maintainStemDirections:score.mode==="satb"});
          // draw attaches the stave to every note; absolute X is only final afterwards.
          if (capture) {
            notes.forEach((note, i) => {
              // VexFlow draws modifiers outside the stavenote group. Wrap the entire
              // draw operation so reveal also hides accidentals, dots and ledger lines.
              const group = context.openGroup("capture-event");
              note.setStave(stave).setContext(context).drawWithStyle();
              group?.setAttribute("data-capture-start", String(events[i].start));
              if (group && events[i].start >= revealTick) group.style.opacity = "0";
            });
          } else vexVoice.draw(context, stave);
          const geometry: CaptureRow = { voice: voice.id, top: stave.getYForLine(0), bottom: stave.getYForLine(4), left: stave.getNoteStartX() - 10, right: stave.getNoteEndX(), anchors: (capture ? prepared : [{ events, notes }]).flatMap(p => p.events.map((e, i) => ({ tick: e.start, x: p.notes[i].getAbsoluteX() }))).concat({ tick: end, x: stave.getNoteEndX() }) };
          captureRows.push(geometry);
          let clipIndex = 0;
          const clipMusic = (draw: () => void) => {
            if (!capture || revealTick >= end) { draw(); return; }
            const group = context.openGroup();
            draw(); context.closeGroup();
            const cutoff = revealTick <= start ? 0 : captureX(geometry, revealTick) - 5;
            const ns = "http://www.w3.org/2000/svg";
            const clip = document.createElementNS(ns, "clipPath");
            const id = `reveal-${measure}-${voice.id}-${clipIndex++}`;
            clip.id = id;
            const rect = document.createElementNS(ns, "rect");
            rect.setAttribute("width", String(Math.max(0, cutoff))); rect.setAttribute("height", String(height));
            clip.appendChild(rect); target.querySelector("svg")?.appendChild(clip);
            group?.setAttribute("clip-path", `url(#${id})`);
          };
          clipMusic(() => {
            beams.forEach(b => b.setContext(context).draw());
            tuplets.forEach(t => t.setContext(context).draw());
          });
          notes.forEach((note, index) => {
            const event = events[index];
            if(row===0) annotationX.set(event.start,note.getAbsoluteX());
            const element=note.getSVGElement();
            if (capture && event.start >= revealTick && element) element.style.opacity = "0";
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
          clipMusic(() => real.forEach((entry, index) => {
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
          }));
        });
        // Free text moves one line up in measures that also carry harmony symbols, so both stay legible.
        const hasRoman=(score.annotations??[]).some(a=>a.kind==="roman"&&a.measure===measure);
        const annotationAt=(beat:number)=>{const at=start+Math.round((beat-1)*PPQ);return annotationX.get(at)??(160+430*(at-start)/(end-start));};
        const romans=(score.annotations??[]).filter(a=>a.kind==="roman"&&a.measure===measure);
        const romanXs=romans.map(a=>annotationAt(a.beat)).sort((a,b)=>a-b);
        // Dense measures (one chord per beat) shrink every harmony symbol of the measure to the size the tightest one needs, so they stay even.
        const romanSize=romans.reduce((size,a)=>{
          const x=annotationAt(a.beat), room=(romanXs.find(other=>other>x)??width)-x-10;
          const natural=context.setFont("Academico",16,"italic").measureText(a.text).width;
          return natural>room?Math.min(size,Math.max(11,Math.floor(16*room/natural))):size;
        },16);
        for(const annotation of !capture && showAnnotations?score.annotations??[]:[]) if(annotation.measure===measure) {
          const x=annotationAt(annotation.beat);
          context.setFont("Academico",annotation.kind==="roman"?romanSize:16,annotation.kind==="roman"?"italic":"normal")
            .fillText(annotation.text,x,height-(annotation.kind==="text"&&hasRoman?52:22));
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
            if(p.x<stave.getNoteStartX()-12||p.y<stave.getYForLine(0)-40||p.y>stave.getYForLine(4)+45){if(mouse.tool==="select")mouse.beginMarquee?.(e);return;}
            let index=notes.findIndex(n=>Math.abs(n.getAbsoluteX()-p.x)<18);
            const dom=(e.target as Element).closest("[data-event-start]");
            if(dom?.getAttribute("data-event-voice")===voice.id)index=events.findIndex(event=>String(event.start)===dom.getAttribute("data-event-start"));
            const hit=index>=0?events[index]:null;
            if(mouse.tool==="erase"){if(hit?.id&&!hit.id.startsWith("gap:"))mouse.onErase(hit.id);return;}
            if(mouse.tool==="select"&&hit?.id&&!hit.id.startsWith("gap:")){onSelect(hit.id,e.shiftKey||e.ctrlKey||e.metaKey);return;}
            if(hit?.id&&!hit.id.startsWith("gap:")&&hit.pitches.length) {
              if(e.ctrlKey||e.metaKey){mouse.onWrite(voice.id,hit.start,pitchAt(voice,p.y,stave.getYForLine(0)),true);return;}
              const group=notes[index].getSVGElement(),original=group?.getAttribute("transform");
              const lowest=[...hit.pitches].sort((a,b)=>pitchToMidi(a)-pitchToMidi(b))[0];
              const match=/^([A-G])(?:##|bb|#|b)?(-?\d+)$/.exec(lowest)!;
              const anchor=Number(match[2])*7+"CDEFGAB".indexOf(match[1]),top=voice.clef==="bass"?26:38;
              // Drag moves by staff steps (line/space). A step is at least 7 screen pixels however small the
              // score is drawn, the note snaps to each step, and a label names the target pitch.
              const rect=svg.getBoundingClientRect(),pxPerStep=Math.max(7,5*rect.height/height);
              const stepsFor=(event:PointerEvent)=>-Math.round((event.clientY-e.clientY)/pxPerStep);
              // Dragging walks the notes of the key signature of this measure (the accidental buttons are for writing).
              const pitchFor=(steps:number)=>staffPitch(voice.clef,(top-anchor-steps)*5,meta.key);
              const label=document.createElementNS("http://www.w3.org/2000/svg","text");
              label.setAttribute("class",styles.dragLabel);label.setAttribute("text-anchor","middle");
              const noteX=notes[index].getAbsoluteX()+6,noteY=stave.getYForLine(0)+(top-anchor)*5;
              let heardPitch=lowest,steps=0,moved=false;mouse.onPreview(hit.id,heardPitch);
              const move=(event:PointerEvent)=>{
                if(!moved&&Math.abs(event.clientY-e.clientY)<3)return;
                const next=stepsFor(event);if(next===steps&&moved)return;
                let pitch:string;try{pitch=pitchFor(next);}catch{return;/* Outside MIDI range: stay on the last valid step. */}
                steps=next;moved=true;
                group?.setAttribute("transform","translate(0 "+(-steps*5)+")");
                if(!label.isConnected)svg.appendChild(label);
                label.setAttribute("x",String(noteX));label.setAttribute("y",String(noteY-steps*5-16));
                label.textContent=pitch.replace(/##/,"𝄪").replace(/bb(?=-?\d)/,"𝄫").replace(/#/,"♯").replace(/(?<=[A-G])b/,"♭");
                if(mouse.tool!=="select"&&pitch!==heardPitch){heardPitch=pitch;mouse.onPreview(hit.id,pitch);}
              };
              const cleanup=()=>{
                window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",finish);window.removeEventListener("pointercancel",abort);
                mouse.onPreviewEnd();label.remove();
                if(group){if(original)group.setAttribute("transform",original);else group.removeAttribute("transform");}
              };
              const finish=()=>{
                cleanup();
                if(moved&&steps!==0&&mouse.tool!=="select")mouse.onMove(hit.id,pitchFor(steps));
                else onSelect(hit.id,e.shiftKey);
              };
              const abort=()=>cleanup();
              window.addEventListener("pointermove",move);window.addEventListener("pointerup",finish,{once:true});window.addEventListener("pointercancel",abort,{once:true});cleanups.push(abort);return;
            }
            const anchors=events.map((event,i)=>({x:notes[i].getAbsoluteX(),tick:event.start})).concat({x:stave.getNoteEndX(),tick:end}).sort((a,b)=>a.x-b.x);
            const left=[...anchors].reverse().find(a=>a.x<=p.x)??{x:stave.getNoteStartX(),tick:start};
            const right=anchors.find(a=>a.x>p.x)??anchors.at(-1)!;
            const raw=left.tick+(right.tick-left.tick)*Math.max(0,Math.min(1,(p.x-left.x)/Math.max(1,right.x-left.x)));
            const tick=hit?hit.start:start+Math.min(end-start-PPQ/8,Math.max(0,Math.round((raw-start)/mouse.step)*mouse.step));
            if(mouse.tool==="select"){const click=()=>mouse.onPosition(voice.id,tick);if(mouse.beginMarquee)mouse.beginMarquee(e,click);else click();return;}
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
        if (svg && capture) decorateCapture(svg, capture, measure, captureRows, positionTick, captureLayout?.scale ?? 1, showAnnotations ? score.annotations : []);
        setError("");
      } catch (error) {
        setError(error instanceof Error ? error.message : "Notation error");
      }
    })();
    return () => { cancelled = true;cleanups.forEach(clean=>clean()); };
  }, [score, measure, selected, locale, focusVoice, onSelect,mouse,continuous,startsSystem,renderWidth,showAnnotations,capture,captureLayout]);
  return <><div ref={ref} className={styles.notation} />{error && <p role="alert" className={styles.renderError}>{error}</p>}</>;
});

const PAGE_FIRST_WIDTH = 540, PAGE_WIDTH = 420; // SVG units; equal scale keeps staves aligned across a system

export default function ScoreView({ score, selected, locale, onSelect, mouse,tick,cursorTick, focusVoice = "all", from = 1, to = score.measures.length,layout="scene",showAnnotations=true,onAnnotation,capture,captureLayout,systemSize=3,pageInfo,onSelectMany,onMeasure }: Omit<MeasureProps, "measure"> & {
  tick: number | null; from?: number; to?: number;layout?:"line"|"page"|"scene";
  cursorTick?:number;
  onAnnotation?:(measure:number,beat:number,text:string)=>void;
  /** Page layout: measures per system and "page N of M" footer. */
  systemSize?: number; pageInfo?: { index: number; total: number };
  /** Rubber-band result; `additive` with Shift/Ctrl/Cmd. An empty list clears the selection. */
  onSelectMany?: (ids: string[], additive: boolean) => void;
  /** Clicking a measure number moves the cursor there (to edit key, meter or clef from that measure). */
  onMeasure?: (measure: number) => void;
}) {
  const surface=useRef<HTMLDivElement>(null);
  const editing=useMemo<MouseEditing|undefined>(()=>!mouse||!onSelectMany?mouse:{...mouse,beginMarquee:(down:PointerEvent,click?:()=>void)=>{
    const host=surface.current;if(!host)return;
    const additive=down.shiftKey||down.ctrlKey||down.metaKey;
    const box=document.createElement("div");box.className=styles.marquee;box.setAttribute("data-testid","marquee");
    let dragged=false;
    const place=(e:PointerEvent)=>{
      const r=host.getBoundingClientRect();
      const x1=Math.min(down.clientX,e.clientX),x2=Math.max(down.clientX,e.clientX),y1=Math.min(down.clientY,e.clientY),y2=Math.max(down.clientY,e.clientY);
      Object.assign(box.style,{left:x1-r.left+host.scrollLeft+"px",top:y1-r.top+host.scrollTop+"px",width:x2-x1+"px",height:y2-y1+"px"});
      return {x1,x2,y1,y2};
    };
    const hits=(area:{x1:number;x2:number;y1:number;y2:number})=>[...host.querySelectorAll<SVGGElement>("[data-note-id]")].filter(note=>{
      const parts=note.querySelectorAll(".vf-notehead");
      return (parts.length?[...parts]:[note]).some(part=>{const b=part.getBoundingClientRect();return b.right>=area.x1&&b.left<=area.x2&&b.bottom>=area.y1&&b.top<=area.y2;});
    });
    const move=(e:PointerEvent)=>{
      if(!dragged&&Math.hypot(e.clientX-down.clientX,e.clientY-down.clientY)<5)return;
      if(!dragged){dragged=true;host.appendChild(box);}
      const area=place(e),inside=new Set(hits(area));
      host.querySelectorAll("[data-note-id]").forEach(n=>n.classList.toggle(styles.marqueeHit,inside.has(n as SVGGElement)));
    };
    const up=(e:PointerEvent)=>{
      window.removeEventListener("pointermove",move);window.removeEventListener("pointerup",up);
      host.querySelectorAll("."+styles.marqueeHit).forEach(n=>n.classList.remove(styles.marqueeHit));
      if(!dragged){if(click)click();else if(!additive)onSelectMany([],false);return;}
      const ids=hits(place(e)).map(n=>n.getAttribute("data-note-id")!).filter(Boolean);
      box.remove();onSelectMany([...new Set(ids)],additive);
    };
    window.addEventListener("pointermove",move);window.addEventListener("pointerup",up);
  }},[mouse,onSelectMany]);
  const es=locale==="es";
  // Follow the playhead, or the cursor when it jumps (start/end); only scrolls if the measure is off-screen.
  const playingMeasure=tick!==null?locateTick(score,tick).measure:cursorTick!==undefined?locateTick(score,Math.min(cursorTick,Math.max(0,scoreTicks(score)-1))).measure:null;
  useEffect(()=>{
    if(layout!=="line"||playingMeasure===null)return;
    const container=surface.current,bar=container?.querySelector<HTMLElement>('[data-measure="'+playingMeasure+'"]');
    if(container&&bar&&(bar.offsetLeft<container.scrollLeft||bar.offsetLeft+bar.offsetWidth>container.scrollLeft+container.clientWidth))
      container.scrollTo({left:Math.max(0,bar.offsetLeft-container.clientWidth/4),behavior:"auto"});
  },[layout,playingMeasure]);

  const renderMeasure=(n:number,page?:{systemStart:boolean;width:number})=>{
    const index=n-1,measure=score.measures[index];
    const start = measureStart(score, n), length = measureTicks(measure);
    const displayedTick=tick??cursorTick;
    const playing = displayedTick !== undefined && displayedTick !== null && displayedTick >= start && displayedTick < start + length;
    const signatureChanged = n===1 || score.measures[index-1].key!==measure.key || score.measures[index-1].time.join("/")!==measure.time.join("/");
    return <section key={measure.id} data-measure={n} className={styles.measure} style={captureLayout ? { width: captureLayout.widths[n] * captureLayout.scale, flex: "0 0 auto" } : undefined} aria-label={(es ? "Compás " : "Measure ") + n}>
      {!capture && (page
        ? <div className={styles.measureHeading}>{page.systemStart ? (onMeasure ? <button type="button" className={styles.measureNumber} onClick={()=>onMeasure(n)} aria-label={(es?"Ir al compás ":"Go to measure ")+n}>{n}</button> : <span>{n}</span>) : <span/>}</div>
        : <div className={styles.measureHeading}>{onMeasure?<button type="button" className={styles.measureNumber} onClick={()=>onMeasure(n)} aria-label={(es?"Ir al compás ":"Go to measure ")+n}>{String(n).padStart(2, "0")}</button>:<span>{String(n).padStart(2, "0")}</span>}{(layout!=="line" || signatureChanged) && <span>{measure.key} / {measure.time.join("/")}</span>}</div>)}
      <MeasureView score={score} measure={n} selected={selected} locale={locale} focusVoice={focusVoice} onSelect={onSelect} mouse={editing} continuous={layout==="line" || layout==="page" || !!captureLayout}
        systemStart={page?.systemStart} renderWidth={page?.width} showAnnotations={showAnnotations} capture={capture} captureLayout={captureLayout} />
      {showAnnotations&&onAnnotation&&<div className={styles.inlineCiphers} style={{gridTemplateColumns:`repeat(${Math.ceil(length/PPQ)},minmax(0,1fr))`}}>
        {Array.from({length:Math.ceil(length/PPQ)},(_,i)=>{const annotation=score.annotations?.find(a=>a.kind==="roman"&&a.measure===n&&a.beat===i+1);return <input key={annotation?.id+":"+(annotation?.text??"")+":"+i} defaultValue={annotation?.text??""} aria-label={(es?"Cifrado compás ":"Cipher measure ")+n+(es?", pulso ":", beat ")+(i+1)} placeholder="—" maxLength={200} onBlur={e=>{if(e.target.value!==(annotation?.text??""))onAnnotation(n,i+1,e.target.value);}} onKeyDown={e=>{if(e.key==="Enter")e.currentTarget.blur();}}/>;})}
      </div>}
      {playing && <div data-testid="staff-cursor" className={styles.playhead} style={{ background:tick===null?"#2563eb":"#bb4166",left: `calc(var(--music-start,14%) + (var(--music-end,97%) - var(--music-start,14%)) * ${(displayedTick! - start) / length})` }} />}
    </section>;
  };

  const numbers=score.measures.map((_,i)=>i+1).filter(n=>n>=from&&n<=to);
  if(layout==="page"&&!captureLayout){
    const systems:number[][]=[];
    for(let i=0;i<numbers.length;i+=systemSize)systems.push(numbers.slice(i,i+systemSize));
    // Every column keeps its SVG width as fr, so all measures share one scale; short systems get spacers.
    const columns=Array.from({length:systemSize},(_,i)=>`${i===0?PAGE_FIRST_WIDTH:PAGE_WIDTH}fr`).join(" ");
    return <div ref={surface} className={styles.scoreSurface} data-layout="page" data-testid="score-view">
      <article key={from} className={styles.pageSheet} aria-label={(es?"Página ":"Page ")+(pageInfo?.index??1)}>
        {from===1&&<header className={styles.pageTitle}><h3>{score.title||(es?"Sin título":"Untitled")}</h3><span>♩ = {score.tempo}</span></header>}
        <div className={styles.measures}>
          {systems.map(system=><div key={system[0]} className={styles.system} style={{gridTemplateColumns:columns}}>
            {system.map((n,i)=>renderMeasure(n,{systemStart:i===0,width:i===0?PAGE_FIRST_WIDTH:PAGE_WIDTH}))}
          </div>)}
        </div>
        {pageInfo&&<footer className={styles.pageNumber}>{pageInfo.index} / {pageInfo.total}</footer>}
      </article>
    </div>;
  }
  return <div ref={surface} className={styles.scoreSurface} data-layout={captureLayout ? "capture" : layout} data-testid="score-view"><div className={styles.measures}>
    {numbers.map(n=>renderMeasure(n))}
  </div></div>;
}
