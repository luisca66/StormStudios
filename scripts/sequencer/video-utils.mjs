import { inflateRawSync } from "node:zlib";

/** Explicit text for a divided voice clip, supplied by the audio map. */
export function partialSubtitle(entry, clip, paragraph, from, to, duration) {
  if (from === 0 && to === duration) return paragraph;
  const explicit = entry.partialText?.[clip];
  if (typeof explicit === "string" && explicit.trim()) return explicit.trim();
  // Preserve the original Spanish Lesson 4 map until it is regenerated.
  if (clip === 16 && ["do-fundamental", "do-tercera", "do-quinta"].includes(entry.id)) {
    const parts = /^(.*?\.)(.*?,)(.*)$/.exec(paragraph);
    if (parts) return parts[entry.id === "do-fundamental" ? 1 : entry.id === "do-tercera" ? 2 : 3].trim();
  }
  throw new Error(`Clip ${clip}: falta texto explícito para subtítulos parciales`);
}

/** Read a small standard DOCX ZIP without a platform-dependent unzip command. */
export function docxParagraphs(zip) {
  let end = zip.length - 22;
  while (end >= Math.max(0, zip.length - 65557) && zip.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error("DOCX: ZIP inválido");
  let offset = zip.readUInt32LE(end + 16);
  const count = zip.readUInt16LE(end + 10);
  for (let i = 0; i < count; i++) {
    if (zip.readUInt32LE(offset) !== 0x02014b50) throw new Error("DOCX: directorio ZIP inválido");
    const method = zip.readUInt16LE(offset + 10), size = zip.readUInt32LE(offset + 20);
    const nameSize = zip.readUInt16LE(offset + 28), extra = zip.readUInt16LE(offset + 30), comment = zip.readUInt16LE(offset + 32);
    const name = zip.subarray(offset + 46, offset + 46 + nameSize).toString();
    if (name === "word/document.xml") {
      const local = zip.readUInt32LE(offset + 42);
      const start = local + 30 + zip.readUInt16LE(local + 26) + zip.readUInt16LE(local + 28);
      const data = zip.subarray(start, start + size);
      if (![0, 8].includes(method)) throw new Error("DOCX: compresión no admitida");
      return xmlParagraphs((method === 8 ? inflateRawSync(data) : data).toString());
    }
    offset += 46 + nameSize + extra + comment;
  }
  throw new Error("DOCX: falta word/document.xml");
}

export function xmlParagraphs(xml) {
  const decode = text => text.replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos);/gi, (_, entity) => {
    if (entity[0] === "#") return String.fromCodePoint(entity[1].toLowerCase() === "x" ? parseInt(entity.slice(2), 16) : Number(entity.slice(1)));
    return { amp: "&", lt: "<", gt: ">", quot: '"', apos: "'" }[entity];
  });
  return [...xml.matchAll(/<w:p\b[^>]*>([\s\S]*?)<\/w:p>/g)].map(p => [...p[1].matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>|<w:(?:br|tab)\b[^>]*\/>/g)].map(t => t[1] === undefined ? " " : decode(t[1])).join("").trim()).filter(Boolean);
}

export function silenceMidpoints(stderr) {
  const result = [];
  let start;
  for (const match of stderr.matchAll(/silence_(start|end):\s*([\d.]+)/g)) {
    if (match[1] === "start") start = Number(match[2]);
    else if (start !== undefined) { result.push((start + Number(match[2])) / 2); start = undefined; }
  }
  return result;
}

export function nearestPause(pauses, fraction, duration) {
  if (!pauses.length) throw new Error("No hay pausas para cortar la narración");
  return pauses.reduce((a, b) => Math.abs(a - fraction * duration) <= Math.abs(b - fraction * duration) ? a : b);
}

export function srtTime(seconds) {
  const ms = Math.round(seconds * 1000);
  return `${String(Math.floor(ms / 3600000)).padStart(2, "0")}:${String(Math.floor(ms / 60000) % 60).padStart(2, "0")}:${String(Math.floor(ms / 1000) % 60).padStart(2, "0")},${String(ms % 1000).padStart(3, "0")}`;
}

export function concatFile(file) {
  return `file '${file.replaceAll("\\", "/").replaceAll("'", "'\\''")}'`;
}

/** Reject missing, reordered, duplicate or overlapping narration; preserve every clip. */
export function validateAudioMap(board, map) {
  if (map.lesson !== board.lesson || map.stills.length !== board.stills.length) throw new Error("Mapa y storyboard no coinciden");
  let clip = 1, at = 0;
  for (let i = 0; i < board.stills.length; i++) {
    const entry = map.stills[i];
    if (entry.id !== board.stills[i].id || entry.start.clip !== clip || entry.start.at !== at) throw new Error(`Mapa discontinuo en ${entry.id}`);
    const end = entry.end;
    if (!Number.isInteger(end.clip) || end.clip < clip || end.clip > map.source.clips || !(end.at > 0 && end.at <= 1) || (end.clip === clip && end.at <= at)) throw new Error(`Final inválido en ${entry.id}`);
    if (end.at === 1) { clip = end.clip + 1; at = 0; } else { clip = end.clip; at = end.at; }
  }
  if (clip !== map.source.clips + 1 || at !== 0) throw new Error("Mapa incompleto");
}
