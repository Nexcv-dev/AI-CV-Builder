import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import esbuild from 'esbuild';
import { createMonorepoResolvePlugin } from './esbuild-monorepo-resolver.mjs';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(projectRoot, '../..');
const workerRoot = path.join(repoRoot, 'apps', 'workers', 'email-worker');
const moduleResolutionPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(repoRoot, 'apps', 'api', 'node_modules'),
  path.join(repoRoot, 'node_modules'),
];
const buildDir = path.join(workerRoot, 'build');
const distDir = path.join(workerRoot, 'dist');
const zipPath = path.join(distDir, 'nexcv-email-worker.zip');

function cleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

cleanDir(buildDir);
fs.mkdirSync(distDir, { recursive: true });

await esbuild.build({
  stdin: {
    contents: fs.readFileSync(path.join(workerRoot, 'src', 'handler.ts'), 'utf8'),
    loader: 'ts',
    sourcefile: 'handler.ts',
    resolveDir: path.join(workerRoot, 'src'),
  },
  bundle: true,
  platform: 'node',
  target: 'node20',
  format: 'cjs',
  outfile: path.join(buildDir, 'handler.js'),
  absWorkingDir: repoRoot,
  nodePaths: moduleResolutionPaths,
  plugins: [createMonorepoResolvePlugin({ repoRoot, projectRoot })],
  minify: true,
});

fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify({
  name: 'nexcv-email-worker-lambda',
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
