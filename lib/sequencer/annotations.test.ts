import {expect,it} from "vitest";
import {createScore,validateScore} from "./model";
import {exportMusicXml} from "./export";
import {changeTimeSignature} from "./operations";

it("loads existing version-one JSON without annotations and normalizes a fresh copy",()=>{
  const score=createScore();delete score.annotations;
  const loaded=validateScore(score);
  expect(loaded.annotations).toEqual([]);expect(score.annotations).toBeUndefined();
  score.annotations=[{id:"a",measure:2,beat:1.5,text:"  ii6  ",kind:"roman"}];
  expect(validateScore(score).annotations?.[0].text).toBe("ii6");
  expect(score.annotations[0].text).toBe("  ii6  ");
});

it("rejects invalid, empty or duplicate annotation data instead of dropping it",()=>{
  const score=createScore();
  const annotation={id:"a",measure:1,beat:1,text:"I",kind:"roman" as const};
  for(const patch of [{measure:0},{measure:1.5},{beat:5},{beat:NaN},{text:" "},{text:"x".repeat(201)},{id:score.measures[0].id},{unexpected:true}]){
    score.annotations=[{...annotation,...patch}];
    expect(()=>validateScore(score)).toThrow(/annotations/);
  }
  score.annotations=[annotation,annotation];expect(()=>validateScore(score)).toThrow(/repetido/);
});

it("time changes keep annotations on their measures and reject a now invalid annotation position",()=>{
  const score=createScore();score.annotations=[{id:"a",measure:2,beat:4,text:"V7",kind:"roman"}];
  expect(changeTimeSignature(score,1,[3,4]).annotations).toEqual(score.annotations);
  expect(()=>changeTimeSignature(score,2,[3,4])).toThrow(/annotations/);
  expect(score.measures[1].time).toEqual([4,4]);
});

it("MusicXML writes escaped harmony annotations once, at exact quarter-beat offsets",()=>{
  const score=createScore("satb");score.annotations=[{id:"a",measure:2,beat:1.5,text:"ii6 < V7 & I",kind:"roman"}];
  const xml=exportMusicXml(score);
  expect(xml).toContain('<words font-style="italic">ii6 &lt; V7 &amp; I</words>');
  expect(xml).toContain("<offset>480</offset>");
  expect(xml.match(/ii6 &lt;/g)).toHaveLength(1);
});
