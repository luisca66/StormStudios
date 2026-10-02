import {expect,it} from "vitest";
import {createScore,newId,transposePitches,validateScore} from "./model";
import {noteKey,parseKey,normalizeSelection,resolveSelection,toggleKey,mapSelectedPitches,removeSelectedPitches,movePitch} from "./note-selection";
import type {NoteEvent} from "./types";
const note=(start=0,pitches=["C4"]):NoteEvent=>({id:newId(),start,duration:"q",pitches,dotted:false,triplet:false,tie:false});
const fixture=()=>{
  const score=createScore(),chord={...note(0,["G4","Db4","Bbb3"]),ornament:true,text:"acorde"},single=note(960),rest=note(1920,[]);
  score.voices[0].events=[chord,single,rest];
  return {score,chord,single,rest};
};

it("builds and parses event and exact pitch keys, including negative octaves",()=>{
  expect(noteKey("event")).toBe("event");
  expect(noteKey("event","Cb-1")).toBe("event@Cb-1");
  expect(parseKey("event")).toEqual({id:"event"});
  expect(parseKey("event@Bbb3")).toEqual({id:"event",pitch:"Bbb3"});
  expect(parseKey("event@")).toEqual({id:"event",pitch:""});
});
it("collapses complete chords and single notes at their first selected position",()=>{
  const {score,chord,single,rest}=fixture();
  const keys=[noteKey(chord.id,"Db4"),rest.id,noteKey(chord.id,"G4"),noteKey(single.id,"C4"),noteKey(chord.id,"Bbb3")];
  expect(normalizeSelection(score,keys)).toEqual([chord.id,rest.id,single.id]);
  expect(normalizeSelection(score,[keys[0],rest.id,chord.id,keys[0]])).toEqual([chord.id,rest.id]);
  expect(keys).toHaveLength(5);
});
it("discards stale keys and dedupes without changing partial selection order or spelling",()=>{
  const {score,chord,single,rest}=fixture(),first=noteKey(chord.id,"Db4"),second=noteKey(chord.id,"G4");
  expect(normalizeSelection(score,["missing",noteKey(chord.id,"C#4"),first,single.id,first,second,
    noteKey(rest.id,"C4"),noteKey(chord.id,""),noteKey(chord.id,"Db4@extra")])).toEqual([first,single.id,second]);
  expect(normalizeSelection(score,[])).toEqual([]);
});
it("resolves each event once in voice and start order, including rests",()=>{
  const {score,chord,single,rest}=fixture(),other=note();
  score.voices[1].events=[other];score.voices[0].events=[rest,single,chord];
  const before=structuredClone(score);
  const selected=resolveSelection(score,[other.id,rest.id,single.id,noteKey(chord.id,"Bbb3"),noteKey(chord.id,"G4"),"missing"]);
  expect(selected.map(entry=>[entry.voice,entry.event.id,entry.pitches,entry.whole])).toEqual([
    ["melody",chord.id,["G4","Bbb3"],false],["melody",single.id,["C4"],true],
    ["melody",rest.id,[],true],["soprano",other.id,["C4"],true],
  ]);
  expect(resolveSelection(score,[chord.id])[0].pitches).toEqual(chord.pitches);
  expect(resolveSelection(score,[])).toEqual([]);
  expect(score).toEqual(before);
});
it("toggles a note out of a whole chord and collapses it again when toggled on",()=>{
  const {score,chord,rest}=fixture(),key=noteKey(chord.id,"Db4");
  const next=toggleKey(score,[rest.id,chord.id],key);
  expect(next).toEqual([rest.id,noteKey(chord.id,"G4"),noteKey(chord.id,"Bbb3")]);
  expect(toggleKey(score,next,key)).toEqual([rest.id,chord.id]);
});
it("adds and removes partial pitches and toggles plain ids, single notes and rests",()=>{
  const {score,chord,single,rest}=fixture(),key=noteKey(chord.id,"Db4");
  expect(toggleKey(score,[],key)).toEqual([key]);
  expect(toggleKey(score,[key],key)).toEqual([]);
  expect(toggleKey(score,[key],chord.id)).toEqual([chord.id]);
  expect(toggleKey(score,[chord.id],chord.id)).toEqual([]);
  expect(toggleKey(score,[],noteKey(single.id,"C4"))).toEqual([single.id]);
  expect(toggleKey(score,[single.id],noteKey(single.id,"C4"))).toEqual([]);
  expect(toggleKey(score,[],rest.id)).toEqual([rest.id]);
  expect(toggleKey(score,[rest.id],rest.id)).toEqual([]);
  expect(toggleKey(score,["missing",key],noteKey(chord.id,"C#4"))).toEqual([key]);
});
it("transposes only one chord pitch, preserving other spellings, order and metadata",()=>{
  const {score,chord}=fixture(),before=structuredClone(score),keys=[noteKey(chord.id,"Db4")];
  const next=mapSelectedPitches(score,keys,pitch=>transposePitches([pitch],1)[0]);
  expect(next.score.voices[0].events[0]).toEqual({...chord,pitches:["G4","D4","Bbb3"]});
  expect(next.keys).toEqual([noteKey(chord.id,"D4")]);
  expect(next.score).not.toBe(score);
  expect(next.score.voices[0].events[1]).not.toBe(score.voices[0].events[1]);
  expect(score).toEqual(before);expect(keys).toEqual([noteKey(chord.id,"Db4")]);
  expect(()=>validateScore(next.score)).not.toThrow();
});
it("maps whole chords once per pitch, retaining whole-event selections and rests",()=>{
  const {score,chord,single,rest}=fixture(),seen:string[]=[];
  const next=mapSelectedPitches(score,[chord.id,noteKey(chord.id,"Db4"),rest.id,single.id,"missing"],pitch=>{
    seen.push(pitch);return transposePitches([pitch],12)[0];
  });
  expect(seen).toEqual(["G4","Db4","Bbb3","C4"]);
  expect(next.score.voices[0].events.map(event=>event.pitches)).toEqual([["G5","Db5","Bbb4"],["C5"],[]]);
  expect(next.keys).toEqual([chord.id,rest.id,single.id]);
});
it("merges mapped duplicates and rewrites partial keys without selecting other notes",()=>{
  const {score,chord}=fixture();
  const next=mapSelectedPitches(score,[noteKey(chord.id,"Db4"),noteKey(chord.id,"Bbb3")],()=>"G4");
  expect(next.score.voices[0].events[0].pitches).toEqual(["G4"]);
  expect(next.keys).toEqual([chord.id]);
  const partial=mapSelectedPitches(score,[noteKey(chord.id,"Db4")],()=>"G4");
  expect(partial.score.voices[0].events[0].pitches).toEqual(["G4","Bbb3"]);
  expect(partial.keys).toEqual([noteKey(chord.id,"G4")]);
});
it("propagates callback and invalid pitch errors without mutating the score",()=>{
  const {score,chord}=fixture(),before=structuredClone(score),error=new Error("callback failed");
  expect(()=>mapSelectedPitches(score,[chord.id],pitch=>{if(pitch==="Db4")throw error;return "A4";})).toThrow(error);
  expect(()=>mapSelectedPitches(score,[chord.id],()=>"C99")).toThrow();
  expect(score).toEqual(before);
});
it("ignores stale mapping keys and does not call the callback for unselected pitches or rests",()=>{
  const {score,chord,rest}=fixture();let calls=0;
  const next=mapSelectedPitches(score,["missing",noteKey(chord.id,"C#4"),rest.id],pitch=>{calls++;return pitch;});
  expect(calls).toBe(0);expect(next.score).toEqual(score);expect(next.keys).toEqual([rest.id]);
});
it("removes individual pitches while keeping event metadata and the original score intact",()=>{
  const {score,chord}=fixture(),before=structuredClone(score);
  const next=removeSelectedPitches(score,[noteKey(chord.id,"Db4"),"missing"]);
  expect(next.voices[0].events[0]).toEqual({...chord,pitches:["G4","Bbb3"]});
  expect(next.voices[0].events).toHaveLength(3);expect(score).toEqual(before);
});
it("removes the last pitch entirely and removes whole events including rests",()=>{
  const {score,chord,single,rest}=fixture(),before=structuredClone(score);
  const next=removeSelectedPitches(score,[noteKey(single.id,"C4"),rest.id]);
  expect(next.voices[0].events).toEqual([chord]);
  expect(removeSelectedPitches(next,chord.pitches.map(pitch=>noteKey(chord.id,pitch))).voices[0].events).toEqual([]);
  expect(removeSelectedPitches(score,[chord.id]).voices[0].events).toEqual([single,rest]);
  expect(removeSelectedPitches(score,["missing",noteKey(chord.id,"C#4")])).toEqual(score);
  expect(score).toEqual(before);
});
it("moves one notehead and merges an existing pitch without changing the other spellings",()=>{
  const {score,chord}=fixture(),before=structuredClone(score);
  expect(movePitch(score,chord.id,"Db4","F4").voices[0].events[0]).toEqual({...chord,pitches:["G4","F4","Bbb3"]});
  expect(movePitch(score,chord.id,"Db4","G4").voices[0].events[0].pitches).toEqual(["G4","Bbb3"]);
  expect(movePitch(score,chord.id,"G4","G4")).toEqual(score);
  expect(score).toEqual(before);
});
it("moves a single note, ignores stale source pitches, and rejects invalid destinations",()=>{
  const {score,chord,single}=fixture(),before=structuredClone(score);
  expect(movePitch(score,single.id,"C4","Eb4").voices[0].events[1].pitches).toEqual(["Eb4"]);
  expect(movePitch(score,"missing","C4","D4")).toEqual(score);
  expect(movePitch(score,chord.id,"C#4","D4")).toEqual(score);
  expect(()=>movePitch(score,chord.id,"Db4","bad")).toThrow();
  expect(score).toEqual(before);
});
it("keeps distinct enharmonic spellings when moving a pitch",()=>{
  const {score,chord}=fixture();
  const next=movePitch(score,chord.id,"G4","C#4");
  expect(next.voices[0].events[0].pitches).toEqual(["C#4","Db4","Bbb3"]);
});
