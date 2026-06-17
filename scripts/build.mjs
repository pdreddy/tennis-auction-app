import { cpSync, rmSync } from 'node:fs';
import { spawnSync } from 'node:child_process';

const outDir = '.build';
rmSync(outDir, { recursive: true, force: true });

const result = spawnSync('tsc', [
  '--jsx', 'react',
  '--target', 'ES2020',
  '--module', 'ES2020',
  '--moduleResolution', 'bundler',
  '--allowJs',
  '--outDir', outDir,
  'src/app.jsx',
  '--noEmitOnError', 'false',
  '--skipLibCheck',
], { stdio: 'inherit' });

if (result.error) {
  console.error('Build failed to start. Make sure the TypeScript CLI `tsc` is available in your IDE terminal.');
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status ?? 1);
}

cpSync(`${outDir}/app.js`, 'src/app.js');
rmSync(outDir, { recursive: true, force: true });
console.log('Built src/app.js from src/app.jsx');
