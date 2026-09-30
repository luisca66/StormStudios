"use client";

import { useCallback, useEffect, useMemo,useRef, useState } from "react";
import { activeVoices, clefAt, createScore, durationTicks, importScore, locateTick, measureStart, measureTicks,
  newId, parsePitchList, parseScoreText, pitchToMidi, scoreTicks, transposePitches, validateScore } from "@/lib/sequencer/model";
import { exportMidi, exportMusicXml } from "@/lib/sequencer/export";
import { importMusicXml } from "@/lib/sequencer/import-musicxml";
import { changeTimeSignature } from "@/lib/sequencer/operations";
import {writeWithMouse,moveWithMouse} from "@/lib/sequencer/mouse-editing";
import { SequencerAudio, type AudioState } from "@/lib/sequencer/audio-engine";
import { downloadBlob, exportGraphic } from "@/lib/sequencer/graphics";
import { SEQUENCER_EXAMPLES } from "@/lib/sequencer/examples";
import { INSTRUMENTS, PPQ, type Duration, type NoteEvent, type ParseResult, type Scene, type Score, type VoiceId } from "@/lib/sequencer/types";
import ScoreView,{type MouseEditing} from "./ScoreView";
import PianoRoll from "./PianoRoll";
import styles from "./sequencer.module.css";

const STORAGE_KEY = "storm-sequencer-studio-v1";
const DURATIONS: Array<[Duration,string,string,string]> = [
  ["w","Redonda","Whole","𝅝"], ["h","Blanca","Half","𝅗𝅥"], ["q","Negra","Quarter","♩"],
  ["8","Corchea","Eighth","♪"], ["16","Semicorchea","Sixteenth","𝅘𝅥𝅯"], ["32","Fusa","Thirty-second","𝅘𝅥𝅰"],
];
const KEYS = ["C","G","D","A","E","B","F#","C#","F","Bb","Eb","Ab","Db","Gb","Cb"];
type Draft = { voice: VoiceId; measure: number; beat: number; pitches: string; duration: Duration; dotted: boolean; triplet: boolean; tie: boolean };
type Selection = { voice: VoiceId; event: NoteEvent };
const emptyDraft: Draft = { voice:"melody",measure:1,beat:1,pitches:"C4",duration:"q",dotted:false,triplet:false,tie:false };
const clone = <T,>(value:T):T => structuredClone(value);

export default function SequencerStudio({ locale }: { locale: string }) {
  const es = locale === "es";
  const t = useCallback((spanish:string, english:string) => es ? spanish : english,[es]);
  const [score,setScore] = useState<Score>(() => createScore());
  const [ready,setReady] = useState(false), [saved,setSaved] = useState(false);
  const [selected,setSelected] = useState<string[]>([]);
  const [draft,setDraft] = useState<Draft>(emptyDraft);
  const [message,setMessage] = useState(""), [error,setError] = useState(""), [warning,setWarning] = useState("");
  const [audioState,setAudioState] = useState<AudioState>("stopped"), [tick,setTick] = useState<number|null>(null);
  const [metronome,setMetronome] = useState(false), [loop,setLoop] = useState(false);
  const [view,setView] = useState<"staff"|"roll">("staff");
  const [scoreLayout,setScoreLayout]=useState<"line"|"page">("line"),[page,setPage]=useState(0);
  const [mouseTool,setMouseTool]=useState<MouseEditing["tool"]>("write"),[accidental,setAccidental]=useState<MouseEditing["accidental"]>("key");
  const [panel,setPanel] = useState<"text"|"events"|"scenes"|"annotations">("text");
  const [annotationText,setAnnotationText] = useState(""), [annotationId,setAnnotationId] = useState("");
  const [annotationKind,setAnnotationKind] = useState<"roman"|"text">("roman");
  const [cipherVisible,setCipherVisible]=useState(true);
  const [text,setText] = useState(SEQUENCER_EXAMPLES[0].text), [preview,setPreview] = useState<ParseResult|null>(null);
  const [presentation,setPresentation] = useState(false), [sceneId,setSceneId] = useState("");
  const [copyTo,setCopyTo] = useState(2), [transpose,setTranspose] = useState(12);
  const [availability,setAvailability] = useState({undo:0,redo:0,clipboard:0});
  const history = useRef<Score[]>([]), future = useRef<Score[]>([]), clipboard = useRef<Selection[]>([]);
  const audio = useRef<SequencerAudio|null>(null), fileInput = useRef<HTMLInputElement>(null);
  const keyboard = useRef<HTMLDivElement>(null), graphic = useRef<HTMLDivElement>(null);

  useEffect(() => {
    audio.current = new SequencerAudio(setAudioState, setTick, setWarning);
    // Hydrate after mount; never overwrite an existing draft with the initial empty score.
    queueMicrotask(() => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) { const parsed = importScore(saved); setScore(parsed); setSceneId(parsed.scenes[0]?.id ?? ""); }
      } catch { setError(es ? "No se pudo recuperar el borrador. Puedes abrir un archivo JSON." : "Draft recovery failed. You can open a JSON file."); }
      setReady(true);
    });
    return () => { audio.current?.dispose(); };
  }, [es]);

  useEffect(() => {
    if (!ready) return;
    const timer = setTimeout(() => {
      try { localStorage.setItem(STORAGE_KEY,JSON.stringify(score)); setSaved(true); }
      catch { setSaved(false); setError(es ? "No se pudo autoguardar. Descarga tu proyecto JSON." : "Autosave failed. Download your JSON project."); }
    },500);
    return () => clearTimeout(timer);
  },[score,ready,es]);

  const selection = selected.flatMap(id => score.voices.flatMap(voice =>
    voice.events.filter(event => event.id===id).map(event => ({voice:voice.id,event}))));
  const voices = activeVoices(score);
  const scene = score.scenes.find(s => s.id===sceneId) ?? score.scenes[0];
  const positionTick = measureStart(score,Math.min(draft.measure,score.measures.length)) + Math.round((draft.beat-1)*PPQ);

  const commit = useCallback((next:Score,notice = "") => {
    try {
      const valid = validateScore(next);
      history.current.push(score); if (history.current.length>60) history.current.shift();
      future.current = [];
      setAvailability(prev=>({...prev,undo:history.current.length,redo:0}));
      audio.current?.stop(); setTick(null); setScore(valid); setSaved(false); setPreview(null);
      setError(""); setMessage(notice);
      return true;
    } catch(error) { setError(error instanceof Error ? error.message : "Invalid score"); return false; }
  },[score]);

  const patchDraft = (change:Partial<Draft>) => { setDraft(prev=>({...prev,...change})); setError(""); };
  const eraseMouse=useCallback((id:string)=>{
    const next=clone(score);next.voices.forEach(v=>{v.events=v.events.filter(e=>e.id!==id);});
    if(commit(next,t("Nota borrada.","Note deleted.")))setSelected(prev=>prev.filter(item=>item!==id));
  },[score,commit,t]);
  const writeMouse=useCallback((voice:VoiceId,start:number,pitch:string,chord=false)=>{
    try {
      const existing=score.voices.find(v=>v.id===voice)!.events.find(e=>e.start===start);
      const event:NoteEvent=chord&&existing?{...existing,pitches:[...new Set([...existing.pitches,pitch])]}:
        {id:newId(),start,pitches:[pitch],duration:draft.duration,dotted:draft.dotted,triplet:draft.triplet,tie:draft.tie};
      const next=writeWithMouse(score,voice,event);
      if(commit(next,t("Nota escrita con el mouse.","Note written with the mouse."))) {
        const at=locateTick(next,start);setDraft(prev=>({...prev,voice,measure:at.measure,beat:at.beat,pitches:event.pitches.join(" ")}));setSelected([event.id]);
        void audio.current?.preview(next.voices.find(v=>v.id===voice)!,event.pitches,next.masterVolume).catch(()=>setWarning("audio"));
      }
    }catch(error){setError(error instanceof Error?error.message:"Invalid note");}
  },[score,commit,draft.duration,draft.dotted,draft.triplet,draft.tie,t]);
  const moveMouse=useCallback((id:string,pitch:string,start?:number,ticks?:number)=>{
    try{const next=moveWithMouse(score,id,pitch,start,ticks);if(commit(next,t("Nota editada con el mouse.","Note edited with the mouse."))){
      const voice=next.voices.find(v=>v.events.some(e=>e.id===id))!,event=voice.events.find(e=>e.id===id)!,at=locateTick(next,event.start);
      setSelected([id]);setDraft(prev=>({...prev,voice:voice.id,measure:at.measure,beat:at.beat,pitches:event.pitches.join(" "),duration:event.duration,dotted:event.dotted,triplet:event.triplet}));
    }}catch(error){setError(error instanceof Error?error.message:"Invalid note");}
  },[score,commit,t]);
  const previewMouse=useCallback((id:string,pitch:string)=>{
    const voice=score.voices.find(v=>v.events.some(e=>e.id===id)),event=voice?.events.find(e=>e.id===id);
    if(!voice||!event?.pitches.length)return;
    try{const pitches=event.pitches.length===1?[pitch]:transposePitches(event.pitches,pitchToMidi(pitch)-pitchToMidi(event.pitches[0]));
      void audio.current?.preview(voice,pitches,score.masterVolume,true).catch(()=>setWarning("audio"));
    }catch{/* A drag can leave the supported pitch range. */}
  },[score]);
  const endMousePreview=useCallback(()=>audio.current?.stopPreview(),[]);
  const positionMouse=useCallback((voice:VoiceId,start:number)=>{const at=locateTick(score,start);setDraft(prev=>({...prev,voice,measure:at.measure,beat:at.beat}));setSelected([]);},[score]);
  const mouse=useMemo<MouseEditing>(()=>({tool:mouseTool,accidental,step:durationTicks({duration:draft.duration,dotted:draft.dotted,triplet:draft.triplet}),onWrite:writeMouse,onErase:eraseMouse,onMove:moveMouse,onPreview:previewMouse,onPreviewEnd:endMousePreview,onPosition:positionMouse}),[mouseTool,accidental,draft.duration,draft.dotted,draft.triplet,writeMouse,eraseMouse,moveMouse,previewMouse,endMousePreview,positionMouse]);
  const selectNote = useCallback((id:string,extend=false) => {
    const voice = score.voices.find(v=>v.events.some(e=>e.id===id));
    const event = voice?.events.find(e=>e.id===id);
    if (!voice || !event) return;
    setSelected(prev => extend ? prev.includes(id) ? prev.filter(i=>i!==id) : [...prev,id] : [id]);
    const location = locateTick(score,event.start);
    setDraft({voice:voice.id,measure:location.measure,beat:Math.round(location.beat*1e6)/1e6,
      pitches:event.pitches.join(" "),duration:event.duration,dotted:event.dotted,triplet:event.triplet,tie:event.tie});
    setError("");
  },[score]);

  const insert = (pitches?:string[]) => {
    try {
      const event:NoteEvent = { id:newId(),start:positionTick,duration:draft.duration,dotted:draft.dotted,
        triplet:draft.triplet,tie:draft.tie,pitches:pitches ?? parsePitchList(draft.pitches) };
      const next = writeWithMouse(score,draft.voice,event);
      if (commit(next,t("Nota insertada.","Note inserted."))) {
        setSelected([]);
        const end = event.start+durationTicks(event);
        if(end<scoreTicks(next)) {
          const position = locateTick(next,end); patchDraft({measure:position.measure,beat:Math.round(position.beat*1e6)/1e6});
        }
        const voice = next.voices.find(v=>v.id===draft.voice)!;
        void audio.current?.preview(voice,event.pitches,next.masterVolume).catch(()=>setWarning("audio"));
      }
    } catch(error) { setError(error instanceof Error ? error.message : "Invalid note"); }
  };

  const updateSelection = () => {
    try {
      const next=clone(score), pitches=parsePitchList(draft.pitches);
      for(const voice of next.voices) for(const event of voice.events) if(selected.includes(event.id)) {
        Object.assign(event,{pitches,duration:draft.duration,dotted:draft.dotted,triplet:draft.triplet,tie:draft.tie});
        if(selected.length===1) event.start=positionTick;
      }
      if(selected.length===1 && selection[0].voice!==draft.voice) {
        const from=next.voices.find(v=>v.id===selection[0].voice)!, event=from.events.find(e=>e.id===selected[0])!;
        from.events=from.events.filter(e=>e.id!==event.id); next.voices.find(v=>v.id===draft.voice)!.events.push(event);
      }
      commit(next,t("Selección actualizada.","Selection updated."));
    } catch(error) { setError(error instanceof Error ? error.message : "Invalid note"); }
  };

  const removeSelection = () => {
    const next=clone(score);
    next.voices.forEach(v=>{v.events=v.events.filter(e=>!selected.includes(e.id));});
    if(commit(next,t("Selección eliminada.","Selection deleted."))) setSelected([]);
  };
  const previewSelection = (next:Score) => { const voice=next.voices.find(v=>v.events.some(e=>selected.includes(e.id))),event=voice?.events.find(e=>selected.includes(e.id));if(voice&&event)void audio.current?.preview(voice,event.pitches,next.masterVolume).catch(()=>setWarning("audio")); };
  const shiftSelection = (semitones:number) => {
    try {const next=clone(score);for(const voice of next.voices)for(const event of voice.events)if(selected.includes(event.id))event.pitches=transposePitches(event.pitches,semitones);
      if(commit(next)){const first=next.voices.flatMap(v=>v.events).find(e=>selected.includes(e.id));if(first)patchDraft({pitches:first.pitches.join(" ")});previewSelection(next);}
    }catch(error){setError(error instanceof Error?error.message:"Invalid pitch");}
  };
  const toggleSelectedFlag = (flag:"tie"|"ornament") => {
    if(!selected.length){if(flag==="tie")patchDraft({tie:!draft.tie});return;}
    const next=clone(score);for(const voice of next.voices)for(const event of voice.events)if(selected.includes(event.id))event[flag]=!event[flag];
    if(commit(next)&&flag==="tie")patchDraft({tie:next.voices.flatMap(v=>v.events).find(e=>selected.includes(e.id))?.tie??false});
  };
  const applyAccidental = (value:MouseEditing["accidental"]) => {
    setAccidental(value);if(value==="key"||!selected.length)return;
    try{const next=clone(score);for(const voice of next.voices)for(const event of voice.events)if(selected.includes(event.id))event.pitches=event.pitches.map(pitch=>{
      const match=pitch.match(/^([A-G])([#b]*)(-?\d+)$/)!;const alteration=value==="#"&&match[2]==="#"?"##":value==="b"&&match[2]==="b"?"bb":value;
      const changed=match[1]+alteration+match[3];pitchToMidi(changed);return changed;
    });if(commit(next)){const first=next.voices.flatMap(v=>v.events).find(e=>selected.includes(e.id));if(first)patchDraft({pitches:first.pitches.join(" ")});previewSelection(next);}}
    catch(error){setError(error instanceof Error?error.message:"Invalid pitch");}
  };
  const undo = () => {
    const previous=history.current.pop(); if(!previous)return;
    future.current.push(score); audio.current?.stop(); setTick(null); setScore(previous); setSelected([]);setPreview(null);setSaved(false);setError("");
    setAvailability(prev=>({...prev,undo:history.current.length,redo:future.current.length}));
    setDraft(prev=>({...prev,measure:Math.min(prev.measure,previous.measures.length),voice:previous.mode==="single"?"melody":prev.voice==="melody"?"soprano":prev.voice}));
  };
  const redo = () => {
    const next=future.current.pop();if(!next)return;
    history.current.push(score);audio.current?.stop();setTick(null);setScore(next);setSelected([]);setPreview(null);setSaved(false);setError("");
    setAvailability(prev=>({...prev,undo:history.current.length,redo:future.current.length}));
    setDraft(prev=>({...prev,measure:Math.min(prev.measure,next.measures.length),voice:next.mode==="single"?"melody":prev.voice==="melody"?"soprano":prev.voice}));
  };
  const copy = () => { clipboard.current=clone(selection);setAvailability(prev=>({...prev,clipboard:selection.length}));setMessage(t("Selección copiada.","Selection copied.")); };
  const paste = () => {
    if(!clipboard.current.length)return;
    const next=clone(score),start=Math.min(...clipboard.current.map(s=>s.event.start));
    for(const item of clipboard.current) {
      const voice=next.voices.find(v=>v.id===(score.mode==="single"?"melody":item.voice==="melody"?draft.voice:item.voice))!;
      voice.events.push({...item.event,id:newId(),start:positionTick+item.event.start-start});
    }
    commit(next,t("Selección pegada.","Selection pasted."));
  };
  const transposeSelection = () => {
    try {
      const next=clone(score);
      next.voices.forEach(v=>v.events.forEach(e=>{if(selected.includes(e.id))e.pitches=transposePitches(e.pitches,transpose);}));
      commit(next,t("Selección transpuesta.","Selection transposed."));
    } catch(error) {setError(error instanceof Error?error.message:"Invalid pitch");}
  };
  const duplicateMeasure = () => {
    if(!Number.isInteger(copyTo) || copyTo<1 || copyTo>score.measures.length) {
      setError(t("Elige un compás de destino existente.","Choose an existing destination measure."));return;
    }
    const next=clone(score);
    const source=measureStart(score,draft.measure), length=measureTicks(score.measures[draft.measure-1]);
    const target=measureStart(score,copyTo);
    for(const voice of next.voices) {
      const events=voice.events.filter(e=>e.start>=source && e.start<source+length);
      if(voice.events.some(e=>e.start>=target && e.start<target+measureTicks(score.measures[copyTo-1]))) {
        setError(t("El compás de destino debe estar vacío.","Destination measure must be empty."));return;
      }
      voice.events.push(...events.map(e=>({...e,id:newId(),start:target+e.start-source})));
    }
    next.annotations=[...(next.annotations??[]),...(score.annotations??[]).filter(a=>a.measure===draft.measure)
      .map(a=>({...a,id:newId(),measure:copyTo}))];
    commit(next,t("Compás duplicado.","Measure duplicated."));
  };
  const play = () => {
    const from=presentation && scene ? measureStart(score,scene.startMeasure):positionTick;
    const to=presentation && scene ? measureStart(score,scene.endMeasure)+measureTicks(score.measures[scene.endMeasure-1]):scoreTicks(score);
    if(from>=to) {setError(t("Elige una posición dentro de la partitura.","Choose a position within the score."));return;}
    void audio.current?.play(score,from,to,metronome,loop);
  };
  const stop = () => {if(tick!==null)setPage(Math.floor((locateTick(score,tick).measure-1)/(score.mode==="satb"?2:4)));audio.current?.stop();setTick(null);};
  const loadFile = async (file:File) => {
    try { const text=await file.text(),xml=text.trimStart().startsWith("<");
      const next=xml?importMusicXml(text):importScore(text);
      const legacy=!xml && !!JSON.parse(text).projectData;
      const notice=legacy?t("Proyecto v3 importado con cifrados, ornamentos, textos y cambios de clave.","V3 project imported with harmony symbols, ornaments, text and clef changes."):t("Proyecto abierto.","Project opened.");
      if(commit(next,notice)) {
      setSelected([]);setDraft({...emptyDraft,voice:next.mode==="satb"?"soprano":"melody"});setSceneId(next.scenes[0]?.id??"");
    }} catch(error){setError(error instanceof Error?error.message:"Invalid file");}
  };
  const changeMode = (mode:Score["mode"]) => {
    const next=clone(score);next.mode=mode;
    if(commit(next)) {setSelected([]);patchDraft({voice:mode==="satb"?"soprano":"melody"});}
  };
  const changeKey = (key:string) => {
    const next=clone(score),index=draft.measure-1,old=score.measures[index].key;
    for(let i=index;i<next.measures.length&&(i===index||(!score.measures[i].keyChange&&score.measures[i].key===old));i++)next.measures[i].key=key;
    next.measures[index].keyChange=true;
    commit(next);
  };
  const changeMeter = (time:[number,number]) => {
    try{const old=score.measures[draft.measure-1].time.join("/"),end=score.measures.findIndex((m,i)=>i>=draft.measure&&(m.timeChange||m.time.join("/")!==old));
      let next=clone(score);for(let i=draft.measure;i<=(end<0?score.measures.length:end);i++)next=changeTimeSignature(next,i,time);next.measures[draft.measure-1].timeChange=true;commit(next);
    }catch(error){setError(error instanceof Error?error.message:"Invalid time signature");}
  };
  const changeClef = (clef:"treble"|"bass") => {
    const next=clone(score);next.measures[draft.measure-1].clefs={...next.measures[draft.measure-1].clefs,[draft.voice]:clef};commit(next);
  };
  const changeScene = (patch:Partial<Scene>) => {
    if(!scene)return;const next=clone(score);
    Object.assign(next.scenes.find(s=>s.id===scene.id)!,patch);commit(next);
  };
  const saveAnnotation = () => {
    const next=clone(score), id=annotationId||newId();
    next.annotations=[...(next.annotations??[]).filter(a=>a.id!==id),
      {id,measure:draft.measure,beat:draft.beat,text:annotationText,kind:annotationKind}];
    if(commit(next,t("Anotación guardada.","Annotation saved."))) {setAnnotationText("");setAnnotationId("");}
  };
  const inlineAnnotation=useCallback((measure:number,beat:number,text:string)=>{
    const next=clone(score),existing=next.annotations?.find(a=>a.kind==="roman"&&a.measure===measure&&a.beat===beat);
    next.annotations=(next.annotations??[]).filter(a=>a.id!==existing?.id);
    if(text.trim())next.annotations.push({id:existing?.id??newId(),measure,beat,text:text.trim(),kind:"roman"});commit(next);
  },[score,commit]);
  const saveGraphic = async (png:boolean) => {
    try {
      if(!graphic.current)return;
      const blob=await exportGraphic(graphic.current,{title:presentation&&scene?scene.title:score.title,
        caption:presentation&&scene?scene.caption:"",aspect:scene?.aspect??"16:9",png});
      downloadBlob(blob,"storm-scene."+(png?"png":"svg"));setMessage(t("Imagen exportada.","Image exported."));
    } catch(error){setError(error instanceof Error?error.message:"Export failed");}
  };
  const saveWav = async () => {
    const from=presentation&&scene?measureStart(score,scene.startMeasure):0;
    const to=presentation&&scene?measureStart(score,scene.endMeasure)+measureTicks(score.measures[scene.endMeasure-1]):scoreTicks(score);
    const blob=await audio.current?.wav(score,from,to);
    if(blob)downloadBlob(blob,"storm-audio.wav");
  };

  const keyboardEvent = (event:React.KeyboardEvent) => {
    const target=event.target as HTMLElement;
    if(["INPUT","TEXTAREA","SELECT"].includes(target.tagName))return;
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="z"){event.preventDefault();if(event.shiftKey)redo();else undo();return;}
    if((event.ctrlKey||event.metaKey)&&event.key.toLowerCase()==="y"){event.preventDefault();redo();return;}
    if(event.key==="Escape"){setSelected([]);if(presentation)setPresentation(false);return;}
    if(target.tagName==="BUTTON"&&event.key===" ")return;
    if(event.key===" "){event.preventDefault();if(audioState==="playing"||audioState==="loading")stop();else play();return;}
    if((event.key==="Delete"||event.key==="Backspace")&&selected.length){event.preventDefault();removeSelection();return;}
    if(selected.length&&(event.key==="ArrowUp"||event.key==="ArrowDown")){event.preventDefault();shiftSelection(event.key==="ArrowUp"?1:-1);return;}
    if(selected.length&&event.key.toLowerCase()==="t"){event.preventDefault();toggleSelectedFlag("tie");return;}
    if(target.tagName==="BUTTON")return;
    if(target!==keyboard.current)return;
    const key=event.key.toUpperCase();
    if(/^[A-G]$/.test(key)){
      event.preventDefault();const octave=draft.pitches.match(/(-?\d+)$/)?.[1]??"4";insert([key+octave]);
    } else if(key==="R"){event.preventDefault();insert([]);}
    else if(/^[1-6]$/.test(key)){patchDraft({duration:DURATIONS[Number(key)-1][0]});}
    else if(event.key==="PageUp"||event.key==="PageDown"){
      event.preventDefault();try{patchDraft({pitches:transposePitches(parsePitchList(draft.pitches),event.key==="PageUp"?12:-12).join(" ")});}catch{}
    } else if(event.key==="Enter"){event.preventDefault();insert();}
    else if(event.key==="ArrowLeft"||event.key==="ArrowRight"){
      event.preventDefault();const offset=durationTicks(draft)*(event.key==="ArrowLeft"?-1:1);
      const location=locateTick(score,Math.max(0,Math.min(scoreTicks(score)-1,positionTick+offset)));
      patchDraft({measure:location.measure,beat:Math.round(location.beat*1e6)/1e6});setSelected([]);
    }
  };
  const phase = { stopped:t("Detenido","Stopped"), loading:t("Cargando sonidos…","Loading sounds…"),
    playing:t("Reproduciendo","Playing"), exporting:t("Exportando audio…","Exporting audio…") }[audioState];
  const events = voices.flatMap(v=>v.events.map(event=>({voice:v,event}))).sort((a,b)=>a.event.start-b.event.start);
  const barsPerPage=score.mode==="satb"?2:4,pageCount=Math.ceil(score.measures.length/barsPerPage);
  const displayedPage=tick===null?Math.min(page,pageCount-1):Math.floor((locateTick(score,tick).measure-1)/barsPerPage);
  const monitorTick=tick??positionTick;
  const currentCipher=(score.annotations??[]).filter(a=>a.kind==="roman"&&a.measure===locateTick(score,monitorTick).measure&&a.text.trim()&&measureStart(score,a.measure)+(a.beat-1)*PPQ<=monitorTick)
    .sort((a,b)=>measureStart(score,b.measure)+(b.beat-1)*PPQ-measureStart(score,a.measure)-(a.beat-1)*PPQ)[0]?.text??"—";

  return <section inert={!ready} aria-label="Storm Sequencer Studio" className={styles.studio+" "+(presentation?styles.present:"")} onKeyDown={keyboardEvent} data-testid="sequencer-studio">
    <header className={styles.header}>
      <div className={styles.identity}>
        <a href={es?"/es/curso-armonia":"/en/harmony-course"}>{t("Volver al curso de armonía","Back to the harmony course")}</a>
        <h1>Storm Sequencer <span className={styles.versionBadge}>v4.0</span></h1>
        <p>{t("Escribe música. Prepara tu próxima lección.","Write music. Prepare your next lesson.")}</p>
      </div>
      <div className={styles.transport} role="group" aria-label={t("Transporte","Transport")}>
        <label>{t("Tempo","Tempo")}<input aria-label={t("Tempo","Tempo")} type="number" min={30} max={240} value={score.tempo}
          onChange={e=>{const n=Number(e.target.value);if(n>=30&&n<=240)commit({...score,tempo:n});}}/></label>
        <label>{t("Volumen","Volume")}<input aria-label={t("Volumen general","Master volume")} type="range" min={0} max={100} value={Math.round(score.masterVolume*100)}
          onChange={e=>{const volume=Number(e.target.value)/100;audio.current?.setMasterVolume(volume);setScore(prev=>({...prev,masterVolume:volume}));setSaved(false);}}/></label>
        <button className={styles.primary} onClick={play} disabled={!ready||audioState==="exporting"}>{t("Reproducir","Play")}</button>
        <button onClick={stop}>{t("Detener","Stop")}</button>
        <button onClick={()=>{stop();setPresentation(!presentation);setView("staff");}} aria-pressed={presentation}>{presentation?t("Volver a editar","Back to editing"):t("Presentar","Present")}</button>
      </div>
    </header>
    <div className={styles.commandbar}>
      <div className={styles.actions}>
        {!presentation&&<><label>{t("Título del proyecto","Project title")}<input value={score.title} aria-label={t("Título del proyecto","Project title")}
          onChange={e=>commit({...score,title:e.target.value})}/></label>
          <label>{t("Modo","Mode")}<select aria-label={t("Modo","Mode")} value={score.mode} onChange={e=>changeMode(e.target.value as Score["mode"])}>
            <option value="single">{t("Melodía y acordes","Melody and chords")}</option><option value="satb">SATB</option></select></label></>}
        <button onClick={()=>downloadBlob(new Blob([JSON.stringify(score,null,2)],{type:"application/json"}),"storm-project.json")}>{t("Guardar JSON","Save JSON")}</button>
        <button onClick={()=>fileInput.current?.click()}>{t("Abrir proyecto","Open project")}</button>
        <input ref={fileInput} type="file" accept=".json,.xml,.musicxml,application/json,application/xml" hidden aria-label={t("Archivo de proyecto","Project file")} onChange={e=>{
          const file=e.target.files?.[0];if(file)void loadFile(file);e.target.value="";
        }}/>
        <button onClick={()=>{try{const bytes=exportMidi(score);downloadBlob(new Blob([new Uint8Array(bytes)],{type:"audio/midi"}),"storm-score.mid");}catch(e){setError(String(e));}}}>{t("Exportar MIDI","Export MIDI")}</button>
        <button onClick={()=>{try{downloadBlob(new Blob([exportMusicXml(score)],{type:"application/vnd.recordare.musicxml+xml"}),"storm-score.musicxml");}catch(e){setError(String(e));}}}>{t("Exportar MusicXML","Export MusicXML")}</button>
      </div>
      <div className={styles.actions}>
        <button onClick={()=>void saveGraphic(false)}>SVG</button><button onClick={()=>void saveGraphic(true)}>PNG</button>
        <button onClick={()=>void saveWav()} disabled={audioState==="exporting"}>WAV</button>
      </div>
    </div>
    <div className={styles.status} role="status" aria-live="polite">
      <span data-testid="audio-state">{phase}</span><span>{saved?t("Borrador guardado en este navegador","Draft saved in this browser"):t("Borrador local","Local draft")}</span>
      <span>{message}</span>
    </div>
    {error&&<div role="alert" className={styles.error}>{error}<button style={{marginLeft:12}} onClick={()=>setError("")}>{t("Cerrar aviso","Dismiss")}</button></div>}
    {warning&&<div role="status" className={styles.warning}>{warning==="samples"
      ?t("Algunos sonidos no pudieron descargarse. Se usa sintetizador para esas notas; puedes volver a reproducir para reintentar.","Some sounds could not be downloaded. Those notes use a synth; play again to retry.")
      :t("No se pudo iniciar el audio. Pulsa Reproducir para reintentar.","Audio could not start. Press Play to retry.")}</div>}
    {presentation?<>
      <div className={styles.actions}><label>{t("Escena","Scene")}<select aria-label={t("Escena","Scene")} value={scene?.id??""} onChange={e=>{stop();setSceneId(e.target.value);}}>
        {score.scenes.map(s=><option key={s.id} value={s.id}>{s.title}</option>)}</select></label>
        <label className={styles.check}><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/>{t("Repetir escena","Loop scene")}</label><button onClick={()=>{void graphic.current?.requestFullscreen().then(()=>graphic.current?.focus()).catch(()=>setError(t("El navegador no permitió pantalla completa.","The browser did not allow fullscreen.")));}}>{t("Pantalla completa","Fullscreen")}</button>
      </div>
      <div className={styles.stage} data-aspect={scene?.aspect??"16:9"} ref={graphic} data-testid="presentation-stage" tabIndex={0} aria-label={t("Escena: espacio reproduce o detiene","Scene: space plays or stops")}>
        <h2>{scene?.title??score.title}</h2>{scene?.caption&&<p>{scene.caption}</p>}
        <ScoreView score={score} selected={selected} locale={locale} onSelect={selectNote} tick={tick} showAnnotations={cipherVisible}
          from={scene?.startMeasure??1} to={scene?.endMeasure??score.measures.length} focusVoice={scene?.highlightVoice??"all"}/>
        <footer><span>Storm Studios</span><span>{score.tempo} BPM</span></footer>
      </div>
    </>:<div className={styles.layout}>
      <div className={styles.workspace}>
        <div className={styles.viewbar}>
          <div className={styles.actions}>
            <button aria-pressed={view==="staff"} onClick={()=>setView("staff")}>{t("Pentagrama","Staff")}</button>
            <button aria-pressed={view==="roll"} onClick={()=>setView("roll")}>Piano Roll</button>
            <button onClick={()=>keyboard.current?.focus()}>{t("Escribir con teclado","Write with keyboard")}</button>
            <button onClick={()=>{const next=clone(score),last=next.measures.at(-1)!;next.measures.push({id:newId(),key:last.key,time:[...last.time]});commit(next);}}>{t("Añadir compás","Add measure")}</button>
          </div>
          <p>{score.measures.length} {t("compases","measures")} / {events.length} {t("eventos","events")}</p>
        </div>
        <div className={styles.noteToolbar} role="group" aria-label={t("Herramientas de escritura","Writing tools")}>
          <div className={styles.durationTools}>{DURATIONS.map(([value,spanish,english,symbol])=><button key={value} aria-label={t("Elegir ","Choose ")+(es?spanish:english)} aria-pressed={draft.duration===value} onClick={()=>patchDraft({duration:value})}><span>{symbol}</span><small>{es?spanish:english}</small></button>)}</div>
          <div className={styles.actions}>{(["write","select","erase"] as const).map(tool=><button key={tool} aria-pressed={mouseTool===tool} onClick={()=>setMouseTool(tool)}>{{write:t("✎ Escribir","✎ Write"),select:t("↖ Seleccionar","↖ Select"),erase:t("⌫ Borrador","⌫ Eraser")}[tool]}</button>)}</div>
          <div className={styles.actions} role="group" aria-label={t("Alteraciones","Accidentals")}>{(["key","#","b","","##","bb"] as const).map(value=><button key={value} aria-pressed={accidental===value} aria-label={t("Alteración ","Accidental ")+(value==="key"?t("armadura","key signature"):value||t("natural","natural"))} onClick={()=>applyAccidental(value)}>{value==="key"?t("Armadura","Key"):({"#":"♯",b:"♭","":"♮","##":"𝄪",bb:"𝄫"}[value])}</button>)}</div>
          <div className={styles.actions}>
            <button aria-label={t("Ligar selección","Tie selection")} aria-pressed={selection.length?selection.every(s=>s.event.tie):draft.tie} onClick={()=>toggleSelectedFlag("tie")}>⌒ {t("Liga","Tie")}</button>
            <button disabled={!selected.length} aria-label={t("Ornamento de selección","Selection ornament")} aria-pressed={selection.length>0&&selection.every(s=>s.event.ornament)} onClick={()=>toggleSelectedFlag("ornament")}>+ {t("Ornamento","Ornament")}</button>
            <button aria-pressed={cipherVisible} onClick={()=>setCipherVisible(!cipherVisible)}>{cipherVisible?t("Ocultar cifrados","Hide harmony symbols"):t("Mostrar cifrados","Show harmony symbols")}</button>
          </div>
        </div>
        <output aria-label={t("Cifrado vigente","Current harmony symbol")} style={{display:"block",fontSize:30,fontWeight:800,color:"#6ee7b7",padding:"12px 18px",background:"#0b1730",border:"2px solid #155e75",borderRadius:12,minHeight:64}}>{currentCipher}</output>
        {view==="staff"&&<div className={styles.pagebar}>
          <div className={styles.actions}><button aria-pressed={scoreLayout==="line"} onClick={()=>setScoreLayout("line")}>{t("Vista continua","Continuous view")}</button><button aria-pressed={scoreLayout==="page"} onClick={()=>{setScoreLayout("page");setPage(Math.floor((draft.measure-1)/barsPerPage));}}>{t("Vista por páginas","Page view")}</button></div>
          {scoreLayout==="page"&&<div className={styles.actions}><button disabled={displayedPage===0} onClick={()=>{stop();setPage(displayedPage-1);}}>{t("Página anterior","Previous page")}</button><span role="status">{t("Página ","Page ")}{displayedPage+1} / {pageCount}</span><button disabled={displayedPage+1===pageCount} onClick={()=>{stop();setPage(displayedPage+1);}}>{t("Página siguiente","Next page")}</button></div>}
          <p>{t("Clic para escribir · clic derecho para borrar · arrastra para cambiar altura · Ctrl+clic añade al acorde","Click to write · right-click to delete · drag to change pitch · Ctrl+click adds to chord")}</p>
        </div>}
        <div ref={keyboard} tabIndex={0} role="region" aria-label={t("Escritura con teclado","Keyboard note entry")} className={styles.workspace}>
          <div ref={graphic}>
            {view==="staff"?<ScoreView score={score} selected={selected} locale={locale} onSelect={selectNote} mouse={mouse} tick={tick} cursorTick={positionTick} focusVoice="all" layout={scoreLayout} showAnnotations={cipherVisible} onAnnotation={inlineAnnotation}
              from={scoreLayout==="page"?displayedPage*barsPerPage+1:1} to={scoreLayout==="page"?Math.min(score.measures.length,(displayedPage+1)*barsPerPage):score.measures.length}/>:
              <PianoRoll score={score} selected={selected} mouse={mouse} voiceId={draft.voice} onSelect={selectNote} locale={locale} tick={tick} positionTick={positionTick}/>}
          </div>
        </div>
        <div className={styles.mixer} role="group" aria-label={t("Mezclador de voces","Voice mixer")}>
          {voices.map(voice=><div className={styles.voiceStrip} key={voice.id}>
            <strong>{voice.name}</strong>
            <label>{t("Instrumento","Instrument")}<select aria-label={t("Instrumento de ","Instrument for ")+voice.name} value={voice.instrument}
              onChange={e=>{const next=clone(score);next.voices.find(v=>v.id===voice.id)!.instrument=e.target.value as typeof voice.instrument;commit(next);}}>
              {INSTRUMENTS.map(i=><option key={i} value={i}>{i==="Synth"?t("Sintetizador","Synth"):i}</option>)}</select></label>
            <input type="range" aria-label={t("Volumen de ","Volume for ")+voice.name} min={0} max={100} value={voice.volume*100}
              onChange={e=>{const next=clone(score);next.voices.find(v=>v.id===voice.id)!.volume=Number(e.target.value)/100;commit(next);}}/>
            <div className={styles.actions}>{(["mute","solo"] as const).map(field=><button key={field} aria-pressed={voice[field]}
              aria-label={(field==="mute"?t("Silenciar ","Mute "):t("Solo ","Solo "))+voice.name}
              onClick={()=>{const next=clone(score);next.voices.find(v=>v.id===voice.id)![field]=!voice[field];commit(next);}}>
              {field==="mute"?t("Silenciar","Mute"):"Solo"}</button>)}</div>
          </div>)}
        </div>
        <section className={styles.panel}>
          <div className={styles.panelHeader}>
            <div className={styles.actions}>{(["text","events","annotations","scenes"] as const).map(item=><button key={item} aria-pressed={panel===item} onClick={()=>setPanel(item)}>
              {{text:t("Entrada por texto","Text entry"),events:t("Lista de notas","Note list"),annotations:t("Cifrados y anotaciones","Harmony annotations"),scenes:t("Escenas","Scenes")}[item]}</button>)}</div>
            <span>{t("Edición precisa para personas y agentes","Precise editing for people and agents")}</span>
          </div>
          {panel==="text"?<>
            <p>{t("Escribe notas o acordes por voz y compás. Valida antes de aplicar; un error conserva tu partitura.","Write notes or chords by voice and measure. Validate before applying; errors preserve your score.")}</p>
            <label>{t("Ejemplo","Example")}<select aria-label={t("Ejemplo","Example")} defaultValue="" onChange={e=>{const example=SEQUENCER_EXAMPLES.find(x=>x.id===e.target.value);if(example){setText(example.text);setPreview(null);if(example.mode!==score.mode)changeMode(example.mode);}}}>
              <option value="" disabled>{t("Elegir ejemplo","Choose example")}</option>{SEQUENCER_EXAMPLES.map(ex=><option key={ex.id} value={ex.id}>{es?ex.titleEs:ex.titleEn}</option>)}</select></label>
            <textarea aria-label={t("Texto musical","Musical text")} spellCheck={false} value={text} onChange={e=>{setText(e.target.value);setPreview(null);}}/>
            <div className={styles.actions}><button onClick={()=>{setPreview(parseScoreText(text,score));setError("");}}>{t("Validar texto","Validate text")}</button>
              <button className={styles.primary} disabled={!preview?.score||preview.issues.length>0} onClick={()=>{if(preview?.score){commit(preview.score,t("Texto aplicado como una sola edición.","Text applied as one edit."));setSelected([]);}}}>{t("Aplicar texto","Apply text")}</button>
              <button onClick={()=>{const next=createScore(score.mode);next.title=score.title;if(commit(next,t("Proyecto nuevo.","New project."))){setDraft({...emptyDraft,voice:score.mode==="satb"?"soprano":"melody"});setSelected([]);setSceneId(next.scenes[0]?.id??"");}}}>{t("Nuevo proyecto","New project")}</button>
            </div>
            {preview&&<div role={preview.issues.length?"alert":"status"} data-testid="text-validation">
              <p>{preview.count} {t("eventos","events")}, {preview.issues.length} {t("errores","errors")}</p>
              {preview.issues.map((issue,index)=><p key={index}>{t("Línea ","Line ")}{issue.line}: {issue.message}</p>)}
              {preview.score&&<p>{t("Voces: ","Voices: ")}{activeVoices(preview.score).filter(v=>v.events.length).map(v=>v.name).join(", ")}</p>}
            </div>}
          </>:panel==="events"?<>
            <div className={styles.actions} style={{marginTop:12}}>
              <button onClick={()=>setSelected(events.map(e=>e.event.id))}>{t("Seleccionar todas","Select all notes")}</button>
              <button onClick={()=>setSelected([])}>{t("Quitar selección","Clear selection")}</button>
            </div>
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr>
              {[t("Seleccionar","Select"),t("Voz","Voice"),t("Compás","Measure"),t("Pulso","Beat"),t("Notas","Notes"),t("Duración","Duration"),t("Editar","Edit")].map(h=><th key={h}>{h}</th>)}
            </tr></thead><tbody>{events.map(({voice,event})=>{const location=locateTick(score,event.start);return <tr key={event.id}>
              <td><input type="checkbox" aria-label={t("Seleccionar ","Select ")+voice.name+" "+location.measure+" "+location.beat}
                checked={selected.includes(event.id)} onChange={()=>selectNote(event.id,true)}/></td>
              <td>{voice.name}</td><td>{location.measure}</td><td>{Number(location.beat.toFixed(3))}</td>
              <td>{event.pitches.join(" ")||t("Silencio","Rest")}</td>
              <td>{DURATIONS.find(d=>d[0]===event.duration)?.[es?1:2]}{event.dotted?" •":""}{event.triplet?" (3)":""}{event.tie?" ⌒":""}</td>
              <td><button aria-label={t("Editar ","Edit ")+voice.name+", "+t("compás ","measure ")+location.measure+", "+t("pulso ","beat ")+location.beat}
                onClick={()=>selectNote(event.id)}>{t("Editar","Edit")}</button></td>
            </tr>;})}</tbody></table></div>
          </>:panel==="annotations"?<>
            <p>{t("El cifrado se guarda en el compás y pulso del inspector. Puedes escribir I, V7, ii6 o una explicación breve.","Annotations are saved at the inspector's measure and beat. Write I, V7, ii6 or a short explanation.")}</p>
            <label>{t("Texto de anotación","Annotation text")}<input value={annotationText} onChange={e=>setAnnotationText(e.target.value)} maxLength={200}/></label>
            <label>{t("Tipo de anotación","Annotation type")}<select aria-label={t("Tipo de anotación","Annotation type")} value={annotationKind} onChange={e=>setAnnotationKind(e.target.value as "roman"|"text")}>
              <option value="roman">{t("Cifrado armónico","Harmony symbol")}</option><option value="text">{t("Texto","Text")}</option></select></label>
            <div className={styles.actions}><button disabled={!annotationText.trim()} onClick={saveAnnotation}>{t("Guardar anotación","Save annotation")}</button>
              <button onClick={()=>{setAnnotationText("");setAnnotationId("");}}>{t("Nueva anotación","New annotation")}</button></div>
            <div className={styles.tableWrap}><table className={styles.table}><thead><tr><th>{t("Compás","Measure")}</th><th>{t("Pulso","Beat")}</th><th>{t("Texto","Text")}</th><th>{t("Acciones","Actions")}</th></tr></thead>
              <tbody>{(score.annotations??[]).map(a=><tr key={a.id}><td>{a.measure}</td><td>{a.beat}</td><td>{a.text}</td><td>
                <button aria-label={t("Editar anotación ","Edit annotation ")+a.text} onClick={()=>{setAnnotationId(a.id);setAnnotationText(a.text);setAnnotationKind(a.kind);patchDraft({measure:a.measure,beat:a.beat});}}>{t("Editar","Edit")}</button>
                <button aria-label={t("Eliminar anotación ","Delete annotation ")+a.text} onClick={()=>{const next=clone(score);next.annotations=(next.annotations??[]).filter(item=>item.id!==a.id);if(commit(next)&&annotationId===a.id){setAnnotationId("");setAnnotationText("");}}}>{t("Eliminar","Delete")}</button>
              </td></tr>)}</tbody></table></div>
          </>:<>
            <p>{t("Cada escena conserva encuadre, rango y explicación. Presentar reproduce únicamente ese rango.","Each scene stores framing, range and explanation. Present plays only that range.")}</p>
            <div className={styles.scenes}>{score.scenes.map(s=><button key={s.id} aria-pressed={scene?.id===s.id} onClick={()=>setSceneId(s.id)}>{s.title}</button>)}
              <button onClick={()=>{const next=clone(score),id=newId();next.scenes.push({id,title:t("Nueva escena","New scene"),caption:"",startMeasure:1,endMeasure:Math.min(2,score.measures.length),aspect:"16:9",highlightVoice:"all"});if(commit(next))setSceneId(id);}}>{t("Añadir escena","Add scene")}</button></div>
            {scene&&<div className={styles.sceneForm}>
              <label>{t("Título de escena","Scene title")}<input value={scene.title} onChange={e=>changeScene({title:e.target.value})}/></label>
              <label>{t("Desde compás","From measure")}<input type="number" min={1} max={scene.endMeasure} value={scene.startMeasure} onChange={e=>changeScene({startMeasure:Number(e.target.value)})}/></label>
              <label>{t("Hasta compás","To measure")}<input type="number" min={scene.startMeasure} max={score.measures.length} value={scene.endMeasure} onChange={e=>changeScene({endMeasure:Number(e.target.value)})}/></label>
              <label>{t("Formato","Format")}<select aria-label={t("Formato","Format")} value={scene.aspect} onChange={e=>changeScene({aspect:e.target.value as Scene["aspect"]})}><option>16:9</option><option>9:16</option></select></label>
              <label style={{gridColumn:"1/-1"}}>{t("Explicación","Caption")}<input value={scene.caption} onChange={e=>changeScene({caption:e.target.value})}/></label>
              <label>{t("Resaltar voz","Highlight voice")}<select aria-label={t("Resaltar voz","Highlight voice")} value={scene.highlightVoice} onChange={e=>changeScene({highlightVoice:e.target.value as Scene["highlightVoice"]})}>
                <option value="all">{t("Todas","All")}</option>{voices.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
              <button onClick={()=>{stop();setPresentation(true);setView("staff");}}>{t("Presentar escena","Present scene")}</button>
              <button disabled={score.scenes.length<2} onClick={()=>{const next=clone(score);next.scenes=next.scenes.filter(s=>s.id!==scene.id);if(commit(next))setSceneId(next.scenes[0].id);}}>{t("Eliminar escena","Delete scene")}</button>
            </div>}
          </>}
        </section>
        <p className={styles.help}>{t("Teclado: enfoca «Escribir con teclado». A–G insertan notas; R silencio; 1–6 duración; PageUp/PageDown octava; ←/→ mueven el cursor. Con selección: ↑/↓ cambian semitono y suenan; T liga; Supr/Backspace borra. Espacio reproduce/detiene. Ctrl/Cmd+Z deshace. Shift+click amplía la selección.","Keyboard: focus “Write with keyboard”. A–G insert notes; R rest; 1–6 duration; PageUp/PageDown octave; ←/→ move the cursor. With a selection: ↑/↓ transpose one semitone and sound; T ties; Delete/Backspace deletes. Space plays/stops. Ctrl/Cmd+Z undoes. Shift+click extends selection.")}</p>
        <a href={es?"/tools/secuenciador.html":"/tools/sequencer.html"} style={{color:"#acbdd4",fontSize:12}}>{t("Abrir Workstation v3 · versión de los videos","Open Workstation v3 · version used in the videos")}</a>
      </div>
      <aside className={styles.inspector} aria-label={t("Inspector musical","Music inspector")}>
        <h2>{selected.length?t("Editar selección","Edit selection"):t("Escribir música","Write music")}</h2>
        <p>{selected.length?selected.length+" "+t("eventos seleccionados","selected events"):t("Inserta en la posición exacta. El cursor avanza con cada nota.","Insert at an exact position. The cursor advances with each note.")}</p>
        <div className={styles.fields}>
          <label className={styles.full}>{t("Voz","Voice")}<select aria-label={t("Voz","Voice")} value={draft.voice} onChange={e=>patchDraft({voice:e.target.value as VoiceId})}>{voices.map(v=><option key={v.id} value={v.id}>{v.name}</option>)}</select></label>
          <label>{t("Compás","Measure")}<input type="number" min={1} max={score.measures.length} value={draft.measure} onChange={e=>{const n=Number(e.target.value);if(Number.isInteger(n)&&n>=1&&n<=score.measures.length)patchDraft({measure:n,beat:1});}}/></label>
          <label>{t("Pulso","Beat")}<input type="number" min={1} step="any" value={draft.beat} onChange={e=>patchDraft({beat:Number(e.target.value)})}/></label>
          <label className={styles.full}>{t("Notas / acorde","Notes / chord")}<input value={draft.pitches} placeholder="C4 E4 G4" onChange={e=>patchDraft({pitches:e.target.value})}/></label>
          {selection.length===1&&<label className={styles.full}>{t("Texto de la nota","Note text")}<input aria-label={t("Texto de la nota","Note text")} value={selection[0].event.text??""} maxLength={200} onChange={e=>{const next=clone(score);next.voices.find(v=>v.id===selection[0].voice)!.events.find(n=>n.id===selection[0].event.id)!.text=e.target.value;commit(next);}}/></label>}
          <label className={styles.full}>{t("Duración","Duration")}<select aria-label={t("Duración","Duration")} value={draft.duration} onChange={e=>patchDraft({duration:e.target.value as Duration})}>{DURATIONS.map(([value,spanish,english,symbol])=><option key={value} value={value}>{symbol} {es?spanish:english}</option>)}</select></label>
          <label className={styles.check}><input type="checkbox" checked={draft.dotted} onChange={e=>patchDraft({dotted:e.target.checked})}/>{t("Puntillo","Dotted")}</label>
          <label className={styles.check}><input type="checkbox" checked={draft.triplet} onChange={e=>patchDraft({triplet:e.target.checked})}/>{t("Tresillo","Triplet")}</label>
          <label className={styles.check+" "+styles.full}><input type="checkbox" checked={draft.tie} onChange={e=>patchDraft({tie:e.target.checked})}/>{t("Ligar a la siguiente nota","Tie to the next note")}</label>
        </div>
        <button className={styles.primary} onClick={()=>insert()}>{t("Insertar nota","Insert note")}</button>
        <button onClick={()=>insert([])}>{t("Insertar silencio","Insert rest")}</button>
        <button disabled={!selected.length} onClick={updateSelection}>{t("Actualizar selección","Update selection")}</button>
        <div className={styles.actions}>
          <button disabled={!selected.length} onClick={removeSelection}>{t("Eliminar","Delete")}</button>
          <button onClick={()=>setSelected([])}>{t("Cursor libre","Free cursor")}</button>
        </div>
        <div className={styles.actions+" "+styles.divider}>
          <button disabled={!availability.undo} onClick={undo}>{t("Deshacer","Undo")}</button><button disabled={!availability.redo} onClick={redo}>{t("Rehacer","Redo")}</button>
          <button disabled={!selected.length} onClick={copy}>{t("Copiar","Copy")}</button><button disabled={!availability.clipboard} onClick={paste}>{t("Pegar","Paste")}</button>
        </div>
        <div className={styles.fields}>
          <label>{t("Semitonos","Semitones")}<input type="number" min={-36} max={36} value={transpose} onChange={e=>setTranspose(Number(e.target.value))}/></label>
          <button disabled={!selected.length} onClick={transposeSelection}>{t("Transponer","Transpose")}</button>
          <label>{t("Duplicar a compás","Duplicate to measure")}<input type="number" min={1} max={score.measures.length} value={copyTo}
            onChange={e=>{const n=Number(e.target.value);if(n>=1&&n<=score.measures.length)setCopyTo(n);}}/></label>
          <button onClick={duplicateMeasure}>{t("Duplicar","Duplicate")}</button>
        </div>
        <div className={styles.fields+" "+styles.divider}>
          <label className={styles.full}>{t("Clave de esta voz","Clef for this voice")}<select aria-label={t("Clave de esta voz","Clef for this voice")} value={clefAt(score,draft.voice,draft.measure)} onChange={e=>changeClef(e.target.value as "treble"|"bass")}><option value="treble">{t("Clave de Sol","Treble clef")}</option><option value="bass">{t("Clave de Fa","Bass clef")}</option></select></label>
          <label>{t("Armadura","Key")}<select aria-label={t("Armadura","Key")} value={score.measures[draft.measure-1]?.key??"C"} onChange={e=>changeKey(e.target.value)}>
            {KEYS.map(k=><option key={k} value={k}>{k}</option>)}</select></label>
          <label>{t("Compás rítmico","Time signature")}<select aria-label={t("Compás rítmico","Time signature")} value={score.measures[draft.measure-1]?.time.join("/")??"4/4"} onChange={e=>{
            changeMeter(e.target.value.split("/").map(Number) as [number,number]);
          }}>
            {["4/4","3/4","2/4","6/8","9/8","12/8","5/4","7/8"].map(m=><option key={m}>{m}</option>)}</select></label>
        </div>
        <p className={styles.help}>{t("Armadura, compás y clave se aplican desde este compás hasta el siguiente cambio.","Key, meter and clef apply from this measure until the next change.")}</p>
        <label className={styles.check}><input type="checkbox" checked={metronome} onChange={e=>setMetronome(e.target.checked)}/>{t("Metrónomo","Metronome")}</label>
        <label className={styles.check}><input type="checkbox" checked={loop} onChange={e=>setLoop(e.target.checked)}/>{t("Repetir reproducción","Loop playback")}</label>
      </aside>
    </div>}
  </section>;
}
