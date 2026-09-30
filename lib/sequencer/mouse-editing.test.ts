import {expect,it} from "vitest";
import {createScore,newId,durationTicks} from "./model";
import {staffPitch,writeWithMouse,moveWithMouse,rollTick} from "./mouse-editing";
import type {NoteEvent} from "./types";
const note=(start=0,duration:NoteEvent["duration"]="q",pitches=["C4"]):NoteEvent=>({id:newId(),start,duration,pitches,dotted:false,triplet:false,tie:false});

it("maps staff lines, spaces and ledger lines through clefs and key signatures",()=>{
  expect(staffPitch("treble",0,"C")).toBe("F5");
  expect(staffPitch("treble",40,"C")).toBe("E4");
  expect(staffPitch("treble",50,"C")).toBe("C4");
  expect(staffPitch("bass",0,"C")).toBe("A3");
  expect(staffPitch("bass",40,"C")).toBe("G2");
  expect(staffPitch("treble",35,"G")).toBe("F#4");
  expect(staffPitch("treble",55,"F")).toBe("Bb3");
});
it("writes inside a held note while retaining the surrounding musical spans",()=>{
  const score=createScore();score.voices[0].events=[note(0,"w")];
  const next=writeWithMouse(score,"melody",note(960,"q",["E4"]));
  expect(next.voices[0].events.map(e=>[e.start,durationTicks(e),e.pitches])).toEqual([[0,960,["C4"]],[960,960,["E4"]],[1920,1920,["C4"]]]);
  expect(score.voices[0].events).toHaveLength(1);
});
it("rejects an incompatible cut or score overflow without changing the score",()=>{
  const score=createScore();score.voices[0].events=[note(0,"w")];
  expect(()=>writeWithMouse(score,"melody",note(14400,"h"))).toThrow(/final/);
  expect(()=>writeWithMouse(score,"melody",{...note(320,"8"),triplet:true})).toThrow(/subdivisión/);
  expect(score.voices[0].events).toHaveLength(1);
});
it("splits a note across bar lines with automatic ties and preserves pedagogical metadata",()=>{
  const score=createScore(),event={...note(2880,"w",["C4","E4"]),ornament:true,text:"do"};
  const next=writeWithMouse(score,"melody",event),events=next.voices[0].events;
  expect(events.map(e=>[e.start,durationTicks(e),e.tie])).toEqual([[2880,960,true],[3840,2880,false]]);
  expect(events[0]).toMatchObject({id:event.id,ornament:true,text:"do",pitches:["C4","E4"]});
  expect(events[1]).toMatchObject({ornament:true,pitches:["C4","E4"]});
  expect(events[1].text).toBeUndefined();
  expect(score.voices[0].events).toEqual([]);
});
it("splits a rest across changing meters without adding ties",()=>{
  const score=createScore();score.measures[1].time=[2,4];
  const next=writeWithMouse(score,"melody",note(2880,"w",[]));
  expect(next.voices[0].events.map(e=>[e.start,durationTicks(e),e.tie])).toEqual([[2880,960,false],[3840,1920,false],[5760,960,false]]);
});
it("moves and resizes a chord as one event, while rejecting overlaps",()=>{
  const score=createScore(),chord=note(0,"q",["C4","E4","G4"]);score.voices[0].events=[chord,note(1920)];
  const moved=moveWithMouse(score,chord.id,"D4",960,480);
  expect(moved.voices[0].events[0]).toMatchObject({start:960,duration:"8",pitches:["D4","F#4","A4"]});
  expect(()=>moveWithMouse(score,chord.id,"D4",1920)).toThrow(/traslapa/);
  expect(score.voices[0].events[0].pitches).toEqual(["C4","E4","G4"]);
});
it("resizes through a bar without losing the original id or duration",()=>{
  const score=createScore(),event=note(2880);score.voices[0].events=[event];
  const next=moveWithMouse(score,event.id,"D4",undefined,3840);
  expect(next.voices[0].events.map(e=>[e.start,durationTicks(e),e.pitches,e.tie])).toEqual([[2880,960,["D4"],true],[3840,2880,["D4"],false]]);
  expect(next.voices[0].events[0].id).toBe(event.id);
});
it("snaps piano-roll positions within the score and each measure",()=>{
  const score=createScore();expect(rollTick(score,1020,960)).toBe(960);
  expect(rollTick(score,-300,960)).toBe(0);
  expect(rollTick(score,4000,960)).toBe(3840);
  expect(rollTick(score,999999,120)).toBe(15240);
});
