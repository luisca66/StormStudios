import { args, json, validate, preflight, publish, locked, atomic, credentials } from './core.mjs';
import { APIs } from './apis.mjs';

try {
  const a = args(process.argv.slice(2), ['--dry-run', '--confirmar']);
  // dry-run never reads credentials, creates locks or makes network calls.
  if (!a['--confirmar']) {
    const m = validate(await json(a.file));
    await preflight(m, a.file);
    console.log(JSON.stringify(await publish(m), null, 2));
  } else {
    await locked(a.file, async () => {
      const m = await json(a.file); await preflight(m, a.file);
      const adapter = new APIs(await credentials(), a.file);
      await adapter.prepare(new Set(m.pieces.filter(p => !p.remote).map(p => p.platform)));
      console.log(JSON.stringify(await publish(m, { confirmed: true, adapter, save: value => atomic(a.file, value) }), null, 2));
    });
  }
} catch (error) { console.error(error.message); process.exitCode = 1; }
