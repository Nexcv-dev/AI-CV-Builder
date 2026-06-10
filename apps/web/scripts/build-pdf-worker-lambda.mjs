import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import esbuild from 'esbuild';
import { createMonorepoResolvePlugin } from './esbuild-monorepo-resolver.mjs';

const __filename = fileURLToPath(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(projectRoot, '../..');
const workerRoot = path.join(repoRoot, 'apps', 'workers', 'pdf-worker');
const moduleResolutionPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(repoRoot, 'apps', 'api', 'node_modules'),
  path.join(repoRoot, 'node_modules'),
];
const dependencyRoot = fs.existsSync(path.join(projectRoot, 'node_modules', '@sparticuz'))
  ? path.join(projectRoot, 'node_modules')
  : path.join(repoRoot, 'node_modules');
const buildDir = path.join(workerRoot, 'build');
const distDir = path.join(workerRoot, 'dist');
const zipPath = path.join(distDir, 'nexcv-pdf-worker.zip');

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
  external: ['@sparticuz/chromium'],
  absWorkingDir: repoRoot,
  nodePaths: moduleResolutionPaths,
  plugins: [createMonorepoResolvePlugin({ repoRoot, projectRoot })],
  minify: true,
});

fs.writeFileSync(path.join(buildDir, 'package.json'), JSON.stringify({
  name: 'nexcv-pdf-worker-lambda',
  version: '1.0.0',
  private: true,
  main: 'handler.js',
  dependencies: {
    '@sparticuz/chromium': '^147.0.0',
  },
}, null, 2), 'utf8');

function copyDir(src, dest) {
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  fs.cpSync(src, dest, { recursive: true, force: true });
}

function copyDirIfExists(src, dest) {
  if (fs.existsSync(src)) copyDir(src, dest);
}

copyDir(path.join(dependencyRoot, '@sparticuz'), path.join(buildDir, 'node_modules', '@sparticuz'));
[
  'follow-redirects',
  'tar-fs',
  'tar-stream',
  'pump',
  'end-of-stream',
  'once',
  'wrappy',
  'streamx',
  'events-universal',
  'fast-fifo',
  'text-decoder',
  'bare-events',
  'bare-fs',
  'bare-os',
  'bare-path',
  'bare-stream',
  'bare-url',
].forEach((name) => {
  copyDirIfExists(path.join(dependencyRoot, name), path.join(buildDir, 'node_modules', name));
});

if (fs.existsSync(zipPath)) fs.rmSync(zipPath, { force: true });
if (process.platform === 'win32') {
  execFileSync('tar.exe', ['-a', '-cf', zipPath, '-C', buildDir, '.'], { stdio: 'inherit' });
} else {
  execFileSync('zip', ['-qr', zipPath, '.'], {
    cwd: buildDir,
    stdio: 'inherit',
  });
}

const zipSizeMb = fs.statSync(zipPath).size / (1024 * 1024);
fs.rmSync(buildDir, { recursive: true, force: true });
console.log(`Created ${path.relative(repoRoot, zipPath)} (${zipSizeMb.toFixed(2)} MB)`);
