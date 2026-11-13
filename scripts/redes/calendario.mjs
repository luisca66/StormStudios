import { calendar } from './core.mjs';
try { console.log(JSON.stringify(calendar(process.argv[2]), null, 2)); }
catch { console.error('Uso: node scripts/redes/calendario.mjs AAAA-SNN'); process.exitCode = 1; }
