/**
 * midi-parser.ts
 * Parsea archivos MIDI tipo 1 exportados por el secuenciador Storm Studios.
 * Lee key_signature meta-messages para resolver enarmonías nota por nota.
 * Convención de canales: 0=Soprano, 1=Alto, 2=Tenor, 3=Bajo
 */

export interface ParsedNote {
  midi: number;       // número MIDI absoluto (ej: 60)
  pitch: number;      // clase de altura 0–11
  tick: number;       // tick absoluto de inicio
  key: string;        // tonalidad activa cuando sonó esta nota (ej: 'Gb', 'C#')
}

export interface KeyChange {
  tick: number;
  key: string;
}

export interface VoiceData {
  ticksPerBeat: number;
  keyChanges: KeyChange[];          // historial de cambios de tonalidad
  voices: {
    SOPRANO?: ParsedNote[];
    ALTO?: ParsedNote[];
    TENOR?: ParsedNote[];
    BASS?: ParsedNote[];
  };
  beats: BeatSlice[];
}

export interface BeatSlice {
  index: number;
  tick: number;
  key: string;        // tonalidad activa en este beat
  SOPRANO?: number;
  ALTO?: number;
  TENOR?: number;
  BASS?: number;
}

const CHANNEL_TO_VOICE: Record<number, keyof VoiceData['voices']> = {
  0: 'SOPRANO', 1: 'ALTO', 2: 'TENOR', 3: 'BASS',
};

export function parseMidiBuffer(buffer: ArrayBuffer): VoiceData {
  const view = new DataView(buffer);
  let pos = 0;

  const readUint32 = () => { const v = view.getUint32(pos); pos += 4; return v; };
  const readUint16 = () => { const v = view.getUint16(pos); pos += 2; return v; };
  const readUint8  = () => view.getUint8(pos++);
  const readVarLen = () => {
    let val = 0, b: number;
    do { b = readUint8(); val = (val << 7) | (b & 0x7f); } while (b & 0x80);
    return val;
  };

  if (readUint32() !== 0x4D546864) throw new Error('Archivo MIDI inválido');
  readUint32(); // header length
  readUint16(); // format
  const numTracks    = readUint16();
  const ticksPerBeat = readUint16();

  // channel → notes, plus key change timeline
  const channelNotes: Record<number, ParsedNote[]> = {};
  const keyChanges: KeyChange[] = [];
  let currentKey = 'C'; // default

  for (let t = 0; t < numTracks; t++) {
    if (readUint32() !== 0x4D54726B) throw new Error(`Track ${t}: header inválido`);
    const trackLen = readUint32();
    const trackEnd = pos + trackLen;
    let absoluteTick = 0;
    let runningStatus = 0;

    while (pos < trackEnd) {
      const delta = readVarLen();
      absoluteTick += delta;
      let statusByte = view.getUint8(pos);

      // Meta message
      if (statusByte === 0xFF) {
        pos++;
        const metaType = readUint8();
        const metaLen  = readVarLen();

        // Key signature: FF 59 02 sf mi
        if (metaType === 0x59 && metaLen === 2) {
          const sf = view.getInt8(pos);     // signed: negative = flats
          // mi = readUint8() but we don't need it (always major here)
          pos += metaLen;
          const key = sfToKey(sf);
          currentKey = key;
          keyChanges.push({ tick: absoluteTick, key });
        } else {
          pos += metaLen;
        }
        continue;
      }

      // SysEx
      if (statusByte === 0xF0 || statusByte === 0xF7) {
        pos++;
        pos += readVarLen();
        continue;
      }

      // MIDI event
      if (statusByte & 0x80) { runningStatus = statusByte; pos++; }
      else { statusByte = runningStatus; }

      const msgType = (statusByte & 0xF0) >> 4;
      const channel = statusByte & 0x0F;

      if (msgType === 0x9 || msgType === 0x8) {
        const note     = readUint8();
        const velocity = readUint8();
        const isOn = msgType === 0x9 && velocity > 0;
        if (isOn) {
          if (!channelNotes[channel]) channelNotes[channel] = [];
          channelNotes[channel].push({
            midi:  note,
            pitch: note % 12,
            tick:  absoluteTick,
            key:   currentKey,
          });
        }
      } else if (msgType === 0xA || msgType === 0xB) { pos += 2; }
      else if (msgType === 0xC || msgType === 0xD)   { pos += 1; }
      else if (msgType === 0xE)                       { pos += 2; }
      else { pos++; }
    }
    pos = trackEnd;
  }

  // Build voice map
  const voices: VoiceData['voices'] = {};
  for (const [ch, notes] of Object.entries(channelNotes)) {
    const voiceName = CHANNEL_TO_VOICE[Number(ch)];
    if (voiceName) voices[voiceName] = notes.sort((a, b) => a.tick - b.tick);
  }

  // Build beat grid
  const allTicks = [...new Set(
    Object.values(channelNotes).flat().map(n => n.tick)
  )].sort((a, b) => a - b);

  const beats: BeatSlice[] = allTicks.map((tick, index) => {
    // Find active key at this tick
    let activeKey = 'C';
    for (const kc of keyChanges) {
      if (kc.tick <= tick) activeKey = kc.key;
      else break;
    }
    const slice: BeatSlice = { index, tick, key: activeKey };
    for (const [ch, notes] of Object.entries(channelNotes)) {
      const voiceName = CHANNEL_TO_VOICE[Number(ch)];
      if (!voiceName) continue;
      const note = notes.find(n => n.tick === tick);
      if (note) {
        if (voiceName === 'SOPRANO') slice.SOPRANO = note.midi;
        else if (voiceName === 'ALTO')    slice.ALTO    = note.midi;
        else if (voiceName === 'TENOR')   slice.TENOR   = note.midi;
        else if (voiceName === 'BASS')    slice.BASS    = note.midi;
      }
    }
    return slice;
  });

  return { ticksPerBeat, keyChanges, voices, beats };
}

// MIDI key signature sf value → key name
function sfToKey(sf: number): string {
  const map: Record<string, string> = {
    '-7': 'Cb', '-6': 'Gb', '-5': 'Db', '-4': 'Ab',
    '-3': 'Eb', '-2': 'Bb', '-1': 'F',
     '0': 'C',
     '1': 'G',  '2': 'D',  '3': 'A',  '4': 'E',
     '5': 'B',  '6': 'F#', '7': 'C#',
  };
  return map[String(sf)] ?? 'C';
}
