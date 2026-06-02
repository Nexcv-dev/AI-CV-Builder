import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import esbuild from 'esbuild';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(projectRoot, '..');
const lambdaRoot = path.join(projectRoot, 'lambda-ocr');
const buildDir = path.join(lambdaRoot, 'build');
const distDir = path.join(lambdaRoot, 'dist');
const zipPath = path.join(distDir, 'nexcv-ocr-lambda.zip');

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

fs.rmSync(buildDir, { recursive: true, force: true });
fs.mkdirSync(buildDir, { recursive: true });
fs.mkdirSync(distDir, { recursive: true });

await esbuild.build({
  entryPoints: ['./lambda-ocr/src/handler.ts'],
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: './lambda-ocr/build/handler.js',
  absWorkingDir: projectRoot,
  minify: true,
});

fs.copyFileSync(path.join(buildDir, 'handler.js'), path.join(buildDir, 'index.js'));
await sleep(500);

fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify({
  name: 'nexcv-ocr-lambda',
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
