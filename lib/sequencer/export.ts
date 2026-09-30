/**
 * Score exports: Standard MIDI File and MusicXML. Both validate the score
 * first and write every voice of the score's mode, muted or not: mute, solo
 * and volumes are playback settings, not part of the written music.
 */
import {
  durationTicks, keySignature, measureTicks, pitchToMidi, splitTicks, activeVoices, validateScore, clefAt,
} from "./model";
import { PPQ, type Duration, type NoteEvent, type Score, type VoiceId } from "./types";

const MIDI_CHANNELS: Record<VoiceId, number> = { melody: 0, soprano: 0, alto: 1, tenor: 2, bass: 3 };
const MIDI_VELOCITY = 100;

/** True when the event's tie is effective: the next event is contiguous with the same pitches. */
function tiesToNext(events: NoteEvent[], index: number): boolean {
  const event = events[index];
  const next = events[index + 1];
  return event.tie
    && event.pitches.length > 0
    && next !== undefined
    && next.start === event.start + durationTicks(event)
    && next.pitches.length === event.pitches.length
    && next.pitches.every((pitch, position) => pitch === event.pitches[position]);
}

function measureStarts(score: Score): number[] {
  const starts = [0];
  for (const measure of score.measures) starts.push(starts[starts.length - 1] + measureTicks(measure));
  return starts;
}

// ---------------------------------------------------------------------------
// MIDI
// ---------------------------------------------------------------------------

function variableLength(value: number): number[] {
  const bytes = [value & 0x7f];
  let rest = value >>> 7;
  while (rest > 0) {
    bytes.unshift((rest & 0x7f) | 0x80);
    rest >>>= 7;
  }
  return bytes;
}

function meta(type: number, data: number[]): number[] {
  return [0xff, type, ...variableLength(data.length), ...data];
}

const utf8 = (text: string) => Array.from(new TextEncoder().encode(text));
const ascii = (text: string) => Array.from(text, character => character.charCodeAt(0));
const uint32 = (value: number) => [(value >>> 24) & 0xff, (value >>> 16) & 0xff, (value >>> 8) & 0xff, value & 0xff];

/**
 * Standard MIDI File, format 1, 960 PPQ, one track per voice of the mode
 * (channels: melody/soprano 0, alto 1, tenor 2, bass 3), each with its name.
 *
 * As in the legacy exporter, the first track also carries the tempo and the
 * time signatures, written at the measure where each one changes. Key
 * signatures are written the same way but in every track, so that
 * lib/maestro-virtual/midi-parser.ts gives each note of each voice the key of
 * its own measure; the parser therefore lists every key change once per track
 * (same tick, same key), which its beat grid and the validators tolerate.
 * Rests are not written. Chords write every pitch. Tied events (contiguous,
 * same pitches) become one long note, which keeps the key of its onset.
 * Before each note-on a text meta "SP:<spelling>" (lowercase, e.g. "a##",
 * "gb") records the written spelling, which midi-parser.ts reads back.
 *
 * Minor keys set the MIDI minor flag; midi-parser.ts reports them by their
 * relative major. Each track ends at the end of the last measure.
 */
export function exportMidi(score: Score): Uint8Array {
  const valid = validateScore(score);
  const voices = activeVoices(valid);
  const starts = measureStarts(valid);
  const end = starts[starts.length - 1];
  const bytes: number[] = [...ascii("MThd"), ...uint32(6), 0, 1, 0, voices.length, (PPQ >> 8) & 0xff, PPQ & 0xff];

  voices.forEach((voice, trackIndex) => {
    // rank keeps simultaneous events in order: metas, note-offs, then (spelling, note-on) pairs.
    const timeline: Array<{ tick: number; rank: number; data: number[] }> = [
      { tick: 0, rank: 0, data: meta(0x03, utf8(voice.name || voice.id)) },
    ];

    if (trackIndex === 0) {
      const microseconds = Math.min(0xffffff, Math.round(60_000_000 / valid.tempo));
      timeline.push({ tick: 0, rank: 0, data: meta(0x51, [(microseconds >> 16) & 0xff, (microseconds >> 8) & 0xff, microseconds & 0xff]) });
      let lastTime = "";
      valid.measures.forEach((measure, index) => {
        const [numerator, denominator] = measure.time;
        if (measure.time.join("/") !== lastTime) {
          lastTime = measure.time.join("/");
          timeline.push({ tick: starts[index], rank: 0, data: meta(0x58, [numerator, Math.log2(denominator), (24 * 4) / denominator, 8]) });
        }
      });
    }
    // Every track, not only the first: midi-parser.ts reads one track at a time
    // and stamps each note with the last key signature it has seen so far.
    let lastKey = "";
    valid.measures.forEach((measure, index) => {
      if (measure.key === lastKey) return;
      lastKey = measure.key;
      const { fifths, minor } = keySignature(measure.key);
      timeline.push({ tick: starts[index], rank: 0, data: meta(0x59, [fifths & 0xff, minor ? 1 : 0]) });
    });

    const channel = MIDI_CHANNELS[voice.id];
    const { events } = voice;
    for (let index = 0; index < events.length; index++) {
      const first = events[index];
      if (first.pitches.length === 0) continue;
      while (tiesToNext(events, index)) index += 1;
      const last = events[index];
      const off = last.start + durationTicks(last);
      const sounding = new Set<number>();
      for (const pitch of first.pitches) {
        const midi = pitchToMidi(pitch);
        if (sounding.has(midi)) continue; // enharmonic twins in a chord sound once
        sounding.add(midi);
        const spelling = pitch.replace(/-?\d+$/, "").toLowerCase();
        timeline.push({ tick: first.start, rank: 2, data: [...meta(0x01, ascii("SP:" + spelling)), 0, 0x90 | channel, midi, MIDI_VELOCITY] });
        timeline.push({ tick: off, rank: 1, data: [0x80 | channel, midi, 0] });
      }
    }

    timeline.push({ tick: end, rank: 3, data: meta(0x2f, []) });
    const ordered = timeline
      .map((entry, order) => ({ ...entry, order }))
      .sort((a, b) => a.tick - b.tick || a.rank - b.rank || a.order - b.order);
    const track: number[] = [];
    let position = 0;
    for (const entry of ordered) {
      track.push(...variableLength(entry.tick - position), ...entry.data);
      position = entry.tick;
    }
    bytes.push(...ascii("MTrk"), ...uint32(track.length), ...track);
  });

  return new Uint8Array(bytes);
}

// ---------------------------------------------------------------------------
// MusicXML
// ---------------------------------------------------------------------------

const XML_TYPES: Record<Duration, string> = { w: "whole", h: "half", q: "quarter", "8": "eighth", "16": "16th", "32": "32nd" };

function escapeXml(text: string): string {
  return text
    // Characters XML 1.0 cannot carry at all.
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g, "")
    .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

function pitchXml(pitch: string): string {
  const match = /^([A-G])(#*|b*)(-?\d+)$/.exec(pitch)!; // validateScore normalized the spelling
  const alter = match[2].startsWith("#") ? match[2].length : -match[2].length;
  return `<pitch><step>${match[1]}</step>${alter !== 0 ? `<alter>${alter}</alter>` : ""}<octave>${match[3]}</octave></pitch>`;
}

type Slot = {
  ticks: number;
  value: Pick<NoteEvent, "duration" | "dotted" | "triplet"> | null; // null: rest of odd length, written without <type>
  pitches: string[];
  tieStart: boolean;
  tieStop: boolean;
  tupletStart: boolean;
  tupletStop: boolean;
  ornament?: boolean;
  text?: string;
};

function restSlots(ticks: number): Slot[] {
  const values = splitTicks(ticks);
  const blank = { pitches: [], tieStart: false, tieStop: false, tupletStart: false, tupletStop: false };
  if (!values) return [{ ticks, value: null, ...blank }];
  return values.map(value => ({ ticks: durationTicks(value), value, ...blank }));
}

/** Marks tuplet brackets: a run of contiguous triplet events closes when it adds up to whole sixteenths. */
function markTuplets(slots: Slot[]): void {
  let run: Slot[] = [];
  let sum = 0;
  const close = () => {
    if (run.length > 0) {
      run[0].tupletStart = true;
      run[run.length - 1].tupletStop = true;
    }
    run = [];
    sum = 0;
  };
  for (const slot of slots) {
    if (!slot.value?.triplet) {
      close();
      continue;
    }
    run.push(slot);
    sum += slot.ticks;
    if (sum % (PPQ / 4) === 0) close();
  }
  close();
}

function slotXml(slot: Slot): string {
  const notes = slot.pitches.length > 0 ? slot.pitches : [null];
  return notes.map((pitch, index) => {
    const parts = [slot.ornament ? '<note color="#ef4444">' : "<note>"];
    if (index > 0) parts.push("<chord/>");
    parts.push(pitch === null ? "<rest/>" : pitchXml(pitch));
    parts.push(`<duration>${slot.ticks}</duration>`);
    if (slot.tieStop) parts.push('<tie type="stop"/>');
    if (slot.tieStart) parts.push('<tie type="start"/>');
    parts.push("<voice>1</voice>");
    if (slot.value) {
      parts.push(`<type>${XML_TYPES[slot.value.duration]}</type>`);
      if (slot.value.dotted) parts.push("<dot/>");
      if (slot.value.triplet) parts.push("<time-modification><actual-notes>3</actual-notes><normal-notes>2</normal-notes></time-modification>");
    }
    const notations: string[] = [];
    if (slot.tieStop) notations.push('<tied type="stop"/>');
    if (slot.tieStart) notations.push('<tied type="start"/>');
    if (index === 0 && slot.tupletStart) notations.push('<tuplet type="start" number="1"/>');
    if (index === 0 && slot.tupletStop) notations.push('<tuplet type="stop" number="1"/>');
    if (notations.length > 0) parts.push(`<notations>${notations.join("")}</notations>`);
    if(index===0&&slot.text!==undefined)parts.push(`<lyric><text>${escapeXml(slot.text)}</text></lyric>`);
    parts.push("</note>");
    return "      " + parts.join("");
  }).join("\n");
}

/**
 * MusicXML 4.0 score-partwise, one part per voice of the mode, divisions 960.
 *
 * Every measure is complete: gaps between events are filled with rests (an
 * empty measure gets a whole-measure rest). A gap that no plain note value
 * can express (left by an incomplete triplet) is written as a rest with only
 * <duration>. Key, time and clef go in the first measure; key and time are
 * repeated where they change. Triplets carry <time-modification> 3:2 and
 * tuplet brackets; effective ties carry <tie> and <tied>. The tempo is a
 * metronome mark in the first measure of the first part.
 */
export function exportMusicXml(score: Score): string {
  const valid = validateScore(score);
  const voices = activeVoices(valid);
  const starts = measureStarts(valid);
  const title = escapeXml(valid.title);
  const lines: string[] = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<!DOCTYPE score-partwise PUBLIC "-//Recordare//DTD MusicXML 4.0 Partwise//EN" "http://www.musicxml.org/dtds/partwise.dtd">',
    '<score-partwise version="4.0">',
    `  <work><work-title>${title}</work-title></work>`,
    `  <movement-title>${title}</movement-title>`,
    "  <part-list>",
    ...voices.map((voice, index) => `    <score-part id="P${index + 1}"><part-name>${escapeXml(voice.name || voice.id)}</part-name></score-part>`),
    "  </part-list>",
  ];

  voices.forEach((voice, partIndex) => {
    lines.push(`  <part id="P${partIndex + 1}">`);
    const { events } = voice;
    let cursor = 0; // next event of this voice
    valid.measures.forEach((measure, measureIndex) => {
      const start = starts[measureIndex];
      const end = starts[measureIndex + 1];
      lines.push(`    <measure number="${measureIndex + 1}">`);

      const previous = valid.measures[measureIndex - 1];
      const attributes: string[] = [];
      if (measureIndex === 0) attributes.push(`<divisions>${PPQ}</divisions>`);
      if (!previous || previous.key !== measure.key) {
        const { fifths, minor } = keySignature(measure.key);
        attributes.push(`<key><fifths>${fifths}</fifths><mode>${minor ? "minor" : "major"}</mode></key>`);
      }
      if (!previous || previous.time.join("/") !== measure.time.join("/")) {
        attributes.push(`<time><beats>${measure.time[0]}</beats><beat-type>${measure.time[1]}</beat-type></time>`);
      }
      const clef = clefAt(valid,voice.id,measureIndex+1);
      if (measureIndex === 0 || clef !== clefAt(valid,voice.id,measureIndex)) {
        attributes.push(clef === "bass" ? "<clef><sign>F</sign><line>4</line></clef>" : "<clef><sign>G</sign><line>2</line></clef>");
      }
      if (attributes.length > 0) lines.push(`      <attributes>${attributes.join("")}</attributes>`);
      if (measureIndex === 0 && partIndex === 0) {
        const tempo = Number(valid.tempo.toFixed(2));
        lines.push(`      <direction placement="above"><direction-type><metronome><beat-unit>quarter</beat-unit><per-minute>${tempo}</per-minute></metronome></direction-type><sound tempo="${tempo}"/></direction>`);
      }

      const slots: Slot[] = [];
      if(partIndex===0) for(const annotation of valid.annotations??[]) if(annotation.measure===measureIndex+1) {
        const offset=Math.round((annotation.beat-1)*PPQ);
        lines.push(`      <direction placement="below"><direction-type><words font-style="${annotation.kind==="roman"?"italic":"normal"}">${escapeXml(annotation.text)}</words></direction-type><offset>${offset}</offset></direction>`);
      }
      let position = start;
      while (cursor < events.length && events[cursor].start < end) {
        const event = events[cursor];
        if (event.start > position) slots.push(...restSlots(event.start - position));
        slots.push({
          ticks: durationTicks(event),
          value: event,
          pitches: event.pitches,
          tieStart: tiesToNext(events, cursor),
          tieStop: cursor > 0 && tiesToNext(events, cursor - 1),
          tupletStart: false,
          tupletStop: false,
          ornament:event.ornament,
          text:event.text,
        });
        position = event.start + durationTicks(event);
        cursor += 1;
      }
      if (slots.length === 0) {
        lines.push(`      <note><rest measure="yes"/><duration>${end - start}</duration><voice>1</voice></note>`);
      } else {
        if (position < end) slots.push(...restSlots(end - position));
        markTuplets(slots);
        lines.push(...slots.map(slotXml));
      }
      lines.push("    </measure>");
    });
    lines.push("  </part>");
  });

  lines.push("</score-partwise>");
  return lines.join("\n") + "\n";
}
