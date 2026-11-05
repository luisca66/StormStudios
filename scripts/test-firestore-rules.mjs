import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const toolsDirectory = path.join(root, '.local-work', 'firebase-cli');
const cli = path.join(toolsDirectory, 'node_modules/firebase-tools/lib/bin/firebase.js');
const cliVersion = '15.35.0';
const runDirectory = path.join(root, '.local-work', 'firebase-rules-runner');
const npmCli = process.env.npm_execpath;
if (!npmCli) throw new Error('Run with npm run test:rules');

function run(args, options = {}) {
  const result = spawnSync(process.execPath, args, { cwd: root, stdio: 'inherit', ...options });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

// Keep CLI-only dependencies out of the application and its deployment.
const cliManifest = path.join(toolsDirectory, 'node_modules/firebase-tools/package.json');
if (!existsSync(cli) || !existsSync(cliManifest) || JSON.parse(readFileSync(cliManifest, 'utf8')).version !== cliVersion) {
  run([npmCli, 'install', '--prefix', toolsDirectory, '--no-save', '--package-lock=false',
    '--ignore-scripts', `firebase-tools@${cliVersion}`, '--min-release-age-exclude=firebase-tools']);
}
const environment = { ...process.env,
  FIREBASE_EMULATORS_PATH: path.join(root, '.local-work', 'firebase-emulators'),
};
// Android Studio bundles a usable JDK on Luis's PC; CI supplies JAVA_HOME.
if (!environment.JAVA_HOME && process.platform === 'win32') {
  const bundledJava = path.join(process.env.ProgramFiles || 'C:/Program Files', 'Android/Android Studio/jbr');
  if (existsSync(path.join(bundledJava, 'bin/java.exe'))) environment.JAVA_HOME = bundledJava;
}
if (environment.JAVA_HOME) {
  const pathKey = Object.keys(environment).find(key => key.toLowerCase() === 'path') || 'PATH';
  environment[pathKey] = `${path.join(environment.JAVA_HOME, 'bin')}${path.delimiter}${environment[pathKey] || ''}`;
}
mkdirSync(runDirectory, { recursive: true });
run([cli, 'emulators:exec', '--only', 'firestore', '--project', 'demo-storm-mnemonic-rules',
  '--config', path.join(root, 'firebase.json'),
  'node --test ../../tests/firebase/firestore.rules.test.mjs'],
{ cwd: runDirectory, env: environment });
