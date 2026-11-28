#!/usr/bin/env node
/**
 * Genera la narración en MP3 de un guion usando la API de ElevenLabs.
 *
 * Uso:
 *   node scripts/sequencer/narracion-elevenlabs.mjs <guion.md> <carpeta-salida> [--solo N] [--forzar]
 *
 * Requiere la variable de entorno ELEVENLABS_API_KEY y ffprobe en el PATH.
 */

import { access, mkdir, readFile, rename, writeFile } from 'node:fs/promises';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';

const execFileAsync = promisify(execFile);

const VOICE_ID = 'HElWpNxM5StCm7Z1EAIk';
const MODEL_ID = 'eleven_v4';
const OUTPUT_FORMAT = 'mp3_44100_128';
const API_BASE = 'https://api.elevenlabs.io/v1';
const MAX_RETRIES = 3;

function parseArgs(argv) {
  const positional = [];
  let solo = null;
  let forzar = false;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--forzar') {
      forzar = true;
    } else if (arg === '--solo') {
      const next = argv[++i];
      if (!next || !/^\d+$/.test(next)) {
        throw new Error('El parámetro --solo requiere un número entero positivo.');
      }
      solo = Number.parseInt(next, 10);
      if (solo < 1) {
        throw new Error('El número de --solo debe ser >= 1.');
      }
    } else if (arg.startsWith('--')) {
      throw new Error(`Opción desconocida: ${arg}`);
    } else {
      positional.push(arg);
    }
  }

  if (positional.length !== 2) {
    throw new Error(
      'Uso: node scripts/sequencer/narracion-elevenlabs.mjs <guion.md> <carpeta-salida> [--solo N] [--forzar]'
    );
  }

  return {
    guionPath: positional[0],
    salidaDir: positional[1],
    solo,
    forzar,
  };
}

function esTituloSeccion(linea) {
  return /^\d+\.\s+/.test(linea) && !/[a-záéíóúüñ]/.test(linea);
}

function esLineaCorchetes(linea) {
  return /^\[.*\]$/.test(linea);
}

function esSeparadorNotas(linea) {
  return /^-{5,}$/.test(linea);
}

function extraerParrafos(contenido) {
  const lineas = contenido.replace(/^\uFEFF/, '').split(/\r?\n/);
  const parrafos = [];
  let iniciado = false;
  let buffer = [];

  const volcarBuffer = () => {
    if (buffer.length > 0) {
      parrafos.push(buffer.join(' ').trim());
      buffer = [];
    }
  };

  for (const lineaRaw of lineas) {
    const linea = lineaRaw.trim();

    if (!iniciado) {
      if (esTituloSeccion(linea)) {
        iniciado = true;
      }
      continue;
    }

    if (esSeparadorNotas(linea)) {
      volcarBuffer();
      break;
    }

    if (linea === '' || esTituloSeccion(linea) || esLineaCorchetes(linea)) {
      volcarBuffer();
      continue;
    }

    buffer.push(linea);
  }

  volcarBuffer();
  return parrafos;
}

async function existeArchivo(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchConReintentos(url, options, descripcion) {
  for (let intento = 0; intento <= MAX_RETRIES; intento++) {
    try {
      const res = await fetch(url, options);
      if (res.ok) {
        return res;
      }

      const retriable = res.status === 429 || (res.status >= 500 && res.status < 600);
      const bodyText = await res.text().catch(() => '');

      if (!retriable || intento === MAX_RETRIES) {
        throw new Error(
          `Error HTTP ${res.status} en ${descripcion}: ${bodyText.slice(0, 300)}`
        );
      }

      const retryAfterSec = Number.parseFloat(res.headers.get('retry-after') ?? '');
      const esperaMs = Number.isFinite(retryAfterSec) && retryAfterSec > 0
        ? Math.ceil(retryAfterSec * 1000)
        : (intento + 1) * 3000;

      console.warn(
        `  [reintento ${intento + 1}/${MAX_RETRIES}] HTTP ${res.status} en ${descripcion}; esperando ${Math.round(esperaMs / 1000)}s...`
      );
      await sleep(esperaMs);
    } catch (err) {
      if (intento === MAX_RETRIES || (err instanceof Error && err.message.startsWith('Error HTTP'))) {
        throw err;
      }
      const esperaMs = (intento + 1) * 3000;
      console.warn(
        `  [reintento ${intento + 1}/${MAX_RETRIES}] Error de red en ${descripcion}: ${err.message}; esperando ${Math.round(esperaMs / 1000)}s...`
      );
      await sleep(esperaMs);
    }
  }
  throw new Error(`No se pudo completar ${descripcion}`);
}

async function obtenerAjustesVoz(apiKey) {
  const url = `${API_BASE}/voices/${VOICE_ID}/settings`;
  const res = await fetchConReintentos(
    url,
    {
      method: 'GET',
      headers: {
        'xi-api-key': apiKey,
        Accept: 'application/json',
      },
    },
    'GET voice settings'
  );
  return await res.json();
}

async function generarClip(apiKey, texto, voiceSettings, destinoPath, numero) {
  const url = `${API_BASE}/text-to-speech/${VOICE_ID}?output_format=${OUTPUT_FORMAT}`;
  const res = await fetchConReintentos(
    url,
    {
      method: 'POST',
      headers: {
        'xi-api-key': apiKey,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: texto,
        model_id: MODEL_ID,
        voice_settings: voiceSettings,
      }),
    },
    `POST clip ${numero}`
  );

  const audioBuffer = Buffer.from(await res.arrayBuffer());
  if (audioBuffer.length === 0) {
    throw new Error(`ElevenLabs devolvió un archivo vacío para el clip ${numero}.`);
  }

  const tmpPath = `${destinoPath}.tmp`;
  await writeFile(tmpPath, audioBuffer);
  await rename(tmpPath, destinoPath);
}

async function medirDuracion(mp3Path) {
  const { stdout } = await execFileAsync('ffprobe', [
    '-v',
    'error',
    '-show_entries',
    'format=duration',
    '-of',
    'default=noprint_wrappers=1:nokey=1',
    mp3Path,
  ]);
  const dur = Number.parseFloat(stdout.trim());
  if (!Number.isFinite(dur)) {
    throw new Error(`No se pudo leer la duración de ${mp3Path} con ffprobe (salida: "${stdout.trim()}").`);
  }
  return dur;
}

async function main() {
  const { guionPath, salidaDir, solo, forzar } = parseArgs(process.argv.slice(2));

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    throw new Error('Falta la variable de entorno ELEVENLABS_API_KEY.');
  }

  const guionTexto = await readFile(guionPath, 'utf8');
  const parrafos = extraerParrafos(guionTexto);

  if (parrafos.length === 0) {
    throw new Error(`No se encontraron párrafos hablados en ${guionPath}.`);
  }

  if (solo !== null && solo > parrafos.length) {
    throw new Error(`--solo ${solo} excede el total de párrafos (${parrafos.length}).`);
  }

  await mkdir(salidaDir, { recursive: true });

  const guionClipsPath = path.join(salidaDir, 'guion-clips.txt');
  await writeFile(guionClipsPath, `${parrafos.join('\n')}\n`, 'utf8');
  console.log(`Guion procesado: ${parrafos.length} párrafos -> ${guionClipsPath}`);

  const indices = solo !== null
    ? [solo]
    : Array.from({ length: parrafos.length }, (_, idx) => idx + 1);

  const pendientes = [];
  for (const n of indices) {
    const mp3Path = path.join(salidaDir, `${n}_Chapter_1.mp3`);
    if (forzar || !(await existeArchivo(mp3Path))) {
      pendientes.push(n);
    }
  }

  if (pendientes.length > 0) {
    const voiceSettings = await obtenerAjustesVoz(apiKey);
    console.log('Ajustes de voz obtenidos:', JSON.stringify(voiceSettings));

    for (const n of pendientes) {
      const mp3Path = path.join(salidaDir, `${n}_Chapter_1.mp3`);
      const texto = parrafos[n - 1];
      process.stdout.write(`Generando clip ${n}/${parrafos.length}... `);
      await generarClip(apiKey, texto, voiceSettings, mp3Path, n);
      const dur = await medirDuracion(mp3Path);
      console.log(`OK (${dur.toFixed(3)} s)`);
    }
  } else {
    console.log('Todos los clips solicitados ya existen (usa --forzar para regenerar).');
  }

  const lineasDuraciones = [];
  let duracionTotal = 0;

  for (let n = 1; n <= parrafos.length; n++) {
    const nombre = `${n}_Chapter_1.mp3`;
    const mp3Path = path.join(salidaDir, nombre);
    if (await existeArchivo(mp3Path)) {
      const dur = await medirDuracion(mp3Path);
      duracionTotal += dur;
      lineasDuraciones.push(`${String(n).padStart(3, '0')} ${nombre} ${dur.toFixed(3)}`);
    }
  }

  const duracionesPath = path.join(salidaDir, 'Duraciones_Video_Secuenciador.txt');
  await writeFile(duracionesPath, `${lineasDuraciones.join('\n')}\n`, 'utf8');

  console.log(
    `Duraciones escritas (${lineasDuraciones.length} clips, total ${(duracionTotal / 60).toFixed(2)} min) -> ${duracionesPath}`
  );
}

main().catch((err) => {
  console.error(`Error: ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
