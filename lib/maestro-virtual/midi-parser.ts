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
  spelling?: string;  // grafía enarmónica incrustada por el secuenciador (ej: 'a##', 'b', 'gb')
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

// El Maestro Virtual evalúa ejercicios breves, no secuencias completas. Estos
// límites evitan que un archivo MIDI válido pero desproporcionado agote la
// función antes de llegar a los validadores pedagógicos.
export const MAX_MIDI_TRACKS = 32;
export const MAX_MIDI_EVENTS = 10_000;
export const MAX_MIDI_TICKS = 1_000_000;
const MAX_VARIABLE_LENGTH_BYTES = 4;
const MAX_SPELLING_META_BYTES = 32;

export function parseMidiBuffer(buffer: ArrayBuffer): VoiceData {
  const view = new DataView(buffer);
  let pos = 0;

  const ensureAvailable = (length: number) => {
    if (!Number.isSafeInteger(length) || length < 0 || pos + length > view.byteLength) {
      throw new Error('Archivo MIDI truncado o corrupto');
    }
  };
  const readUint32 = () => { ensureAvailable(4); const v = view.getUint32(pos); pos += 4; return v; };
  const readUint16 = () => { ensureAvailable(2); const v = view.getUint16(pos); pos += 2; return v; };
  const readUint8  = () => { ensureAvailable(1); return view.getUint8(pos++); };
  const readDataByte = () => {
    const value = readUint8();
    if (value > 0x7f) throw new Error('Archivo MIDI contiene un byte de datos inválido');
    return value;
  };
  const readVarLen = () => {
    let val = 0, b: number;
    for (let byteCount = 0; byteCount < MAX_VARIABLE_LENGTH_BYTES; byteCount++) {
      b = readUint8();
      val = val * 128 + (b & 0x7f);
      if (!(b & 0x80)) return val;
    }
    throw new Error('Archivo MIDI contiene una longitud variable inválida');
  };

  if (view.byteLength < 14) throw new Error('Archivo MIDI inválido');
  if (readUint32() !== 0x4D546864) throw new Error('Archivo MIDI inválido');
  const headerLength = readUint32();
  if (headerLength < 6) throw new Error('Header MIDI inválido');
  ensureAvailable(headerLength);
  const format = readUint16();
  if (format > 1) throw new Error('Formato MIDI no soportado');
  const numTracks    = readUint16();
  const ticksPerBeat = readUint16();
  pos += headerLength - 6;

  if (numTracks === 0 || numTracks > MAX_MIDI_TRACKS) {
    throw new Error(`El archivo MIDI excede el máximo de ${MAX_MIDI_TRACKS} pistas`);
  }
  if (ticksPerBeat === 0 || (ticksPerBeat & 0x8000)) {
    throw new Error('División temporal MIDI no soportada');
  }

  // channel → notes, plus key change timeline
  const channelNotes: Record<number, ParsedNote[]> = {};
  const keyChanges: KeyChange[] = [];
  let currentKey = 'C'; // default
  let eventCount = 0;

  for (let t = 0; t < numTracks; t++) {
    if (readUint32() !== 0x4D54726B) throw new Error(`Track ${t}: header inválido`);
    const trackLen = readUint32();
    ensureAvailable(trackLen);
    const trackEnd = pos + trackLen;
    const ensureTrackBoundary = () => {
      if (pos > trackEnd) throw new Error(`Track ${t}: datos truncados o corruptos`);
    };
    let absoluteTick = 0;
    let runningStatus = 0;
    // Grafía incrustada (meta-texto 'SP:…') que precede a cada note-on en esta pista.
    let pendingSpelling: string | null = null;

    while (pos < trackEnd) {
      const delta = readVarLen();
      ensureTrackBoundary();
      absoluteTick += delta;
      if (absoluteTick > MAX_MIDI_TICKS) {
        throw new Error(`El archivo MIDI excede el máximo de ${MAX_MIDI_TICKS} ticks`);
      }
      eventCount++;
      if (eventCount > MAX_MIDI_EVENTS) {
        throw new Error(`El archivo MIDI excede el máximo de ${MAX_MIDI_EVENTS} eventos`);
      }
      if (pos >= trackEnd) throw new Error(`Track ${t}: evento truncado o corrupto`);
      let statusByte = view.getUint8(pos);

      // Meta message
      if (statusByte === 0xFF) {
        pos++;
        const metaType = readUint8();
        const metaLen  = readVarLen();
        ensureTrackBoundary();
        if (pos + metaLen > trackEnd) throw new Error(`Track ${t}: meta-evento truncado o corrupto`);

        // Key signature: FF 59 02 sf mi
        if (metaType === 0x59 && metaLen === 2) {
          const sf = view.getInt8(pos);     // signed: negative = flats
          // mi = readUint8() but we don't need it (always major here)
          pos += metaLen;
          const key = sfToKey(sf);
          currentKey = key;
          keyChanges.push({ tick: absoluteTick, key });
        } else if (metaType === 0x01) {
          // Text meta: el secuenciador Storm Studios incrusta la grafía de cada
          // nota como 'SP:<grafía>' (ej. 'SP:a##') justo antes de su note-on,
          // porque el número MIDI no distingue enarmonías (La## y Si = 71).
          const isSpelling = metaLen >= 3
            && view.getUint8(pos) === 0x53 // S
            && view.getUint8(pos + 1) === 0x50 // P
            && view.getUint8(pos + 2) === 0x3a; // :

          // Sólo se necesita una grafía breve. Evitar construir texto MIDI
          // arbitrariamente largo impide presión de memoria y trabajo O(n²).
          if (isSpelling) {
            const spellingLength = metaLen - 3;
            pendingSpelling = null;
            if (spellingLength <= MAX_SPELLING_META_BYTES) {
              let spelling = '';
              for (let i = 0; i < spellingLength; i++) {
                spelling += String.fromCharCode(view.getUint8(pos + 3 + i));
              }
              pendingSpelling = spelling;
            }
          }
          pos += metaLen;
        } else {
          pos += metaLen;
        }
        ensureTrackBoundary();
        continue;
      }

      // SysEx
      if (statusByte === 0xF0 || statusByte === 0xF7) {
        pos++;
        const sysExLength = readVarLen();
        ensureTrackBoundary();
        if (pos + sysExLength > trackEnd) throw new Error(`Track ${t}: SysEx truncado o corrupto`);
        pos += sysExLength;
        ensureTrackBoundary();
        continue;
      }

      // MIDI event
      if (statusByte & 0x80) { runningStatus = statusByte; pos++; }
      else {
        if (!runningStatus) throw new Error('Archivo MIDI usa running status inválido');
        statusByte = runningStatus;
      }
      if (statusByte >= 0xF0) throw new Error('Evento MIDI de sistema no soportado');

      const msgType = (statusByte & 0xF0) >> 4;
      const channel = statusByte & 0x0F;

      if (msgType === 0x9 || msgType === 0x8) {
        const note     = readDataByte();
        const velocity = readDataByte();
        const isOn = msgType === 0x9 && velocity > 0;
        if (isOn) {
          if (!channelNotes[channel]) channelNotes[channel] = [];
          channelNotes[channel].push({
            midi:  note,
            pitch: note % 12,
            tick:  absoluteTick,
            key:   currentKey,
            spelling: pendingSpelling ?? undefined,
          });
          pendingSpelling = null;
        }
      } else if (msgType === 0xA || msgType === 0xB) { readDataByte(); readDataByte(); }
      else if (msgType === 0xC || msgType === 0xD)   { readDataByte(); }
      else if (msgType === 0xE)                       { readDataByte(); readDataByte(); }
      else { throw new Error('Evento MIDI inválido'); }
      ensureTrackBoundary();
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

  const sortedKeyChanges = keyChanges.sort((a, b) => a.tick - b.tick);
  const notesAtTickByVoice = Object.entries(channelNotes).flatMap(([channel, notes]) => {
    const voiceName = CHANNEL_TO_VOICE[Number(channel)];
    if (!voiceName) return [];
    const notesAtTick = new Map<number, ParsedNote>();
    for (const note of notes) {
      // Conserva la misma semántica que Array#find: la primera nota de una voz
      // en ese tick es la que representa el beat.
      if (!notesAtTick.has(note.tick)) notesAtTick.set(note.tick, note);
    }
    return [{ voiceName, notesAtTick }];
  });
  let keyChangeIndex = 0;
  let activeKey = 'C';

  const beats: BeatSlice[] = allTicks.map((tick, index) => {
    while (
      keyChangeIndex < sortedKeyChanges.length
      && sortedKeyChanges[keyChangeIndex].tick <= tick
    ) {
      activeKey = sortedKeyChanges[keyChangeIndex].key;
      keyChangeIndex++;
    }
    const slice: BeatSlice = { index, tick, key: activeKey };
    for (const { voiceName, notesAtTick } of notesAtTickByVoice) {
      const note = notesAtTick.get(tick);
      if (note) {
        if (voiceName === 'SOPRANO') slice.SOPRANO = note.midi;
        else if (voiceName === 'ALTO')    slice.ALTO    = note.midi;
        else if (voiceName === 'TENOR')   slice.TENOR   = note.midi;
        else if (voiceName === 'BASS')    slice.BASS    = note.midi;
      }
    }
    return slice;
  });

  return { ticksPerBeat, keyChanges: sortedKeyChanges, voices, beats };
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
