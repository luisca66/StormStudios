import { readdir } from 'node:fs/promises';
import path from 'node:path';
import { REDES, json, validate, credentials, writeReport } from './core.mjs';
import { APIs } from './apis.mjs';

// Read-only remote task for Windows Task Scheduler. No upload code is invoked.
try {
  const consult = process.argv.length === 3 && process.argv[2] === '--consultar';
  if (process.argv.length > 2 && !consult) throw Error();
  const batches = await readdir(path.join(REDES, 'lotes'), { withFileTypes: true });
  const c = consult ? await credentials() : null;
  let failed = false;
  for (const batch of batches.filter(x => x.isDirectory() && /^\d{4}-S\d{2}$/.test(x.name))) {
    const file = path.join(REDES, 'lotes', batch.name, 'manifiesto.json');
    try {
      const m = validate(await json(file));
      if (!m.pieces.some(p => p.remote?.id)) continue;
      if (!consult) { console.log(`Simulación de reporte: ${m.batch}`); continue; }
      const api = new APIs(c, file); const rows = [];
      const date = new Date().toISOString().slice(0, 10);
      for (const p of m.pieces) {
        try { rows.push(await api.metrics(p, date)); }
        catch { rows.push({ key: p.key, state: 'sin verificar', note: 'API no disponible; revisar permisos/token.' }); }
      }
      console.log(await writeReport(m, rows, { date }));
    } catch (error) {
      if (error.code === 'ENOENT' && error.path === file) continue; // Older batches may have no manifest.
      failed = true; console.error(`Reporte no generado: ${batch.name}. Revise manifiesto y archivos.`);
    }
  }
  if (failed) process.exitCode = 1;
} catch { console.error('No se pudieron consultar los lotes. Revise configuración y rutas.'); process.exitCode = 1; }
