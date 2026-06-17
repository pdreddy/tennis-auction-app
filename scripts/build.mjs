import { spawnSync } from 'node:child_process';

const result = spawnSync('tsc', [
  '--jsx', 'react',
  '--target', 'ES2020',
  '--module', 'none',
  '--allowJs',
  '--outFile', 'app.js',
  'src/app.jsx',
  '--noEmitOnError', 'false',
  '--skipLibCheck',
  '--ignoreDeprecations', '6.0',
], { stdio: 'inherit' });

if (result.error) {
  console.error('Build failed to start. Make sure the TypeScript CLI `tsc` is available in your IDE terminal.');
  process.exit(1);
}

process.exit(result.status ?? 1);
