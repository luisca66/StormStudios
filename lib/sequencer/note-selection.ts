import type {NoteEvent,Pitch,Score,VoiceId} from "./types";
import {normalizePitch,validateScore} from "./model";

/**
 * Note-level selection. A selection key is either
 *   "<eventId>"          the whole event (every pitch of the chord, or a rest), or
 *   "<eventId>@<pitch>"  one pitch of a chord, spelled exactly as stored in event.pitches.
 * Event ids never contain "@".
 */
export type SelectedEvent={voice:VoiceId;event:NoteEvent;pitches:Pitch[];whole:boolean};

export function noteKey(id:string,pitch?:Pitch):string{return pitch===undefined?id:`${id}@${pitch}`;}
export function parseKey(key:string):{id:string;pitch?:Pitch}{
  const at=key.indexOf("@");
  return at===-1?{id:key}:{id:key.slice(0,at),pitch:key.slice(at+1)};
}

/** Drops keys whose event/pitch no longer exists, dedupes, and collapses a chord whose pitches are all
 *  selected into its plain event id. A single-pitch event is always its plain id. Order is preserved. */
export function normalizeSelection(score:Score,keys:string[]):string[]{
  const events=new Map(score.voices.flatMap(voice=>voice.events.map(event=>[event.id,event] as const)));
  const valid=[...new Set(keys)].filter(key=>{
    const {id,pitch}=parseKey(key),event=events.get(id);
    return event!==undefined&&(pitch===undefined||event.pitches.includes(pitch));
  });
  const selected=new Set(valid);
  const whole=new Set([...events.values()].filter(event=>selected.has(event.id)||
    (event.pitches.length>0&&event.pitches.every(pitch=>selected.has(noteKey(event.id,pitch)))))
    .map(event=>event.id));
  return [...new Set(valid.map(key=>{const {id}=parseKey(key);return whole.has(id)?id:key;}))];
}

/** One entry per touched event, in score order (voice order, then start). */
export function resolveSelection(score:Score,keys:string[]):SelectedEvent[]{
  const selected=new Set(normalizeSelection(score,keys));
  return score.voices.flatMap(voice=>[...voice.events].sort((a,b)=>a.start-b.start).flatMap(event=>{
    const whole=selected.has(event.id);
    const pitches=event.pitches.filter(pitch=>whole||selected.has(noteKey(event.id,pitch)));
    return whole||pitches.length>0?[{voice:voice.id,event,pitches,whole}]:[];
  }));
}

/** Shift/Ctrl-click: toggles `key` in `keys`. Toggling a pitch off a wholly selected chord leaves the
 *  other pitches selected; toggling a plain id adds/removes the whole event. Result is normalized. */
export function toggleKey(score:Score,keys:string[],key:string):string[]{
  const current=normalizeSelection(score,keys),target=normalizeSelection(score,[key])[0];
  if(target===undefined)return current;
  const {id,pitch}=parseKey(target);
  if(pitch===undefined){
    const others=current.filter(entry=>parseKey(entry).id!==id);
    return normalizeSelection(score,current.includes(id)?others:[...others,id]);
  }
  if(current.includes(id)){
    const event=score.voices.flatMap(voice=>voice.events).find(event=>event.id===id)!;
    return normalizeSelection(score,current.flatMap(entry=>entry===id?
      event.pitches.filter(other=>other!==pitch).map(other=>noteKey(id,other)):[entry]));
  }
  return normalizeSelection(score,current.includes(target)?current.filter(entry=>entry!==target):[...current,target]);
}

/** Applies `fn` to the selected pitches only (transpose, accidentals). Returns a new score (input untouched)
 *  and the selection keys rewritten to the new spellings. Duplicate pitches inside an event collapse.
 *  Errors thrown by `fn` propagate. */
export function mapSelectedPitches(score:Score,keys:string[],fn:(pitch:Pitch)=>Pitch):{score:Score;keys:string[]}{
  const normalized=normalizeSelection(score,keys),selected=resolveSelection(score,normalized);
  const next=structuredClone(score),rewritten=new Map<string,string>();
  const byId=new Map(selected.map(entry=>[entry.event.id,entry]));
  for(const voice of next.voices)for(const event of voice.events){
    const entry=byId.get(event.id);
    if(!entry)continue;
    const pitches=new Set(entry.pitches);
    event.pitches=[...new Set(event.pitches.map(pitch=>{
      if(!pitches.has(pitch))return pitch;
      const mapped=normalizePitch(fn(pitch));
      rewritten.set(noteKey(event.id,pitch),noteKey(event.id,mapped));
      return mapped;
    }))];
  }
  // Validation returns a canonical, sorted copy; keep our existing pitch order instead.
  validateScore(next);
  return {score:next,keys:normalizeSelection(next,normalized.map(key=>rewritten.get(key)??key))};
}

/** Removes the selected pitches; an event left with no pitches is removed entirely (not turned into a rest).
 *  Whole-event keys remove the event (rests included). Returns a new score. */
export function removeSelectedPitches(score:Score,keys:string[]):Score{
  const selected=new Map(resolveSelection(score,keys).map(entry=>[entry.event.id,entry]));
  const next=structuredClone(score);
  for(const voice of next.voices)voice.events=voice.events.flatMap(event=>{
    const entry=selected.get(event.id);
    if(!entry)return [event];
    if(entry.whole)return [];
    event.pitches=event.pitches.filter(pitch=>!entry.pitches.includes(pitch));
    return event.pitches.length>0?[event]:[];
  });
  validateScore(next);
  return next;
}

/** Moves one pitch of an event to `to` (drag of one notehead). Other pitches keep their spelling;
 *  if `to` is already in the chord the two merge. Returns a new score. */
export function movePitch(score:Score,id:string,from:Pitch,to:Pitch):Score{
  return mapSelectedPitches(score,[noteKey(id,from)],()=>to).score;
}
