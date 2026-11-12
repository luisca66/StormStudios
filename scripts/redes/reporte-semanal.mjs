import { args, json, validate, credentials, writeReport } from './core.mjs';
import { APIs } from './apis.mjs';

try {
  const a = args(process.argv.slice(2), ['--consultar', '--dry-run']);
  const m = validate(await json(a.file));
  if (!a['--consultar'] || a['--dry-run']) {
    console.log(`Simulación sin red ni escritura: ${m.batch}, ${m.pieces.filter(p => p.remote?.id).length} IDs para consultar. Use --consultar para generar el reporte.`);
  } else {
    const api = new APIs(await credentials(), a.file);
    const date = new Date().toISOString().slice(0, 10);
    const rows = [];
    for (const p of m.pieces) {
      try { rows.push(await api.metrics(p, date)); }
      catch { rows.push({ key: p.key, state: 'sin verificar', note: 'API no disponible; revisar permisos/token y repetir.' }); }
    }
    console.log(await writeReport(m, rows, { date }));
  }
} catch { console.error('No se pudo generar el reporte. Revise el manifiesto, rutas y configuración.'); process.exitCode = 1; }
