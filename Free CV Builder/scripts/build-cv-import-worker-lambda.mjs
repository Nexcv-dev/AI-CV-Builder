import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(projectRoot, '..');
const workerRoot = path.join(projectRoot, 'lambda-cv-import-worker');
const buildDir = path.join(workerRoot, 'build');
const distDir = path.join(workerRoot, 'dist');
const zipPath = path.join(distDir, 'nexcv-cv-import-worker.zip');

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

cleanDir(buildDir);
fs.mkdirSync(distDir, { recursive: true });

await esbuild.build({
  entryPoints: [path.join(workerRoot, 'src', 'handler.ts')],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(buildDir, 'handler.js'),
  minify: true,
});

fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify({
  name: 'nexcv-cv-import-worker-lambda',
  version: '1.0.0',
  private: true,
  main: 'handler.js',
}, null, 2), 'utf8');

if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
if (process.platform === 'win32') {
  execFileSync('powershell.exe', [
    '-NoProfile',
    '-Command',
    `Compress-Archive -Path '${buildDir.replaceAll("'", "''")}\\*' -DestinationPath '${zipPath.replaceAll("'", "''")}' -Force`,
  ], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', zipPath, '.'], {
    cwd: buildDir,
    stdio: 'inherit',
  });
}

const zipSizeMb = fs.statSync(zipPath).size / (1024 * 1024);
fs.rmSync(buildDir, { recursive: true, force: true });
console.log(`Created ${path.relative(repoRoot, zipPath)} (${zipSizeMb.toFixed(2)} MB)`);
