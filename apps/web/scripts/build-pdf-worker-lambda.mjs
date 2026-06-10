import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { createRequire } from 'node:module';
import esbuild from 'esbuild';
import { createMonorepoResolvePlugin } from './esbuild-monorepo-resolver.mjs';

const __filename = fileURLToPath(import.meta.url);
const require = createRequire(import.meta.url);
const projectRoot = path.resolve(path.dirname(__filename), '..');
const repoRoot = path.resolve(projectRoot, '../..');
const workerRoot = path.join(repoRoot, 'apps', 'workers', 'pdf-worker');
const moduleResolutionPaths = [
  path.join(projectRoot, 'node_modules'),
  path.join(repoRoot, 'apps', 'api', 'node_modules'),
  path.join(repoRoot, 'node_modules'),
];
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
  plugins: [createMonorepoResolvePlugin({ repoRoot, projectRoot, externalPackages: ['@sparticuz/chromium'] })],
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
  fs.cpSync(src, dest, { recursive: true, force: true, dereference: true });
}

function resolvePackageDir(packageName) {
  try {
    return path.dirname(require.resolve(`${packageName}/package.json`, {
      paths: moduleResolutionPaths,
    }));
  } catch {
    try {
      let current = path.dirname(require.resolve(packageName, {
        paths: moduleResolutionPaths,
      }));
      while (current && current !== path.dirname(current)) {
        const packageJsonPath = path.join(current, 'package.json');
        if (fs.existsSync(packageJsonPath)) {
          const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
          if (packageJson.name === packageName) return fs.realpathSync(current);
        }
        current = path.dirname(current);
      }
    } catch {
      return null;
    }
    return null;
  }
}

function copyPackageAndDependencies(packageName, seen = new Set()) {
  if (seen.has(packageName)) return;
  seen.add(packageName);

  const packageDir = resolvePackageDir(packageName);
  if (!packageDir) return;

  const packageJsonPath = path.join(packageDir, 'package.json');
  const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
  const dest = path.join(buildDir, 'node_modules', ...packageName.split('/'));
  copyDir(packageDir, dest);

  for (const dependencyName of Object.keys({
    ...(packageJson.dependencies || {}),
    ...(packageJson.optionalDependencies || {}),
  })) {
    copyPackageAndDependencies(dependencyName, seen);
  }
}

copyPackageAndDependencies('@sparticuz/chromium');

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
