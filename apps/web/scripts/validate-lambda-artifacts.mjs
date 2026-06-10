import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const repoRoot = path.resolve(path.dirname(__filename), '../..', '..');

const artifacts = [
  {
    name: 'PDF renderer Lambda',
    zipPath: 'apps/workers/pdf-lambda/dist/nexcv-pdf-lambda.zip',
    requiredEntries: ['handler.js', 'package.json'],
  },
  {
    name: 'PDF worker Lambda',
    zipPath: 'apps/workers/pdf-worker/dist/nexcv-pdf-worker.zip',
    requiredEntries: ['handler.js', 'package.json'],
  },
  {
    name: 'CV import worker Lambda',
    zipPath: 'apps/workers/cv-import-worker/dist/nexcv-cv-import-worker.zip',
    requiredEntries: ['handler.js', 'package.json'],
  },
  {
    name: 'Email worker Lambda',
    zipPath: 'apps/workers/email-worker/dist/nexcv-email-worker.zip',
    requiredEntries: ['handler.js', 'package.json'],
  },
  {
    name: 'OCR Lambda',
    zipPath: 'apps/workers/ocr-lambda/dist/nexcv-ocr-lambda.zip',
    requiredEntries: ['handler.js', 'index.js', 'package.json'],
  },
];

const normalizeZipEntry = (entry) => entry.trim().replace(/\\/g, '/').replace(/^\.\//, '');

const listZipEntries = (zipPath) => {
  try {
    return execFileSync('tar', ['-tf', zipPath], { encoding: 'utf8' })
      .split(/\r?\n/)
      .map(normalizeZipEntry)
      .filter(Boolean);
  } catch (error) {
    throw new Error(`Could not inspect ZIP entries for ${path.relative(repoRoot, zipPath)}: ${error.message}`);
  }
};

const failures = [];

for (const artifact of artifacts) {
  const absoluteZipPath = path.join(repoRoot, artifact.zipPath);
  if (!fs.existsSync(absoluteZipPath)) {
    failures.push(`${artifact.name}: missing ${artifact.zipPath}`);
    continue;
  }

  const sizeBytes = fs.statSync(absoluteZipPath).size;
  if (sizeBytes <= 0) {
    failures.push(`${artifact.name}: ${artifact.zipPath} is empty`);
    continue;
  }

  const entries = new Set(listZipEntries(absoluteZipPath));
  for (const requiredEntry of artifact.requiredEntries) {
    if (!entries.has(requiredEntry)) {
      failures.push(`${artifact.name}: ${artifact.zipPath} is missing ${requiredEntry}`);
    }
  }

  console.log(`OK ${artifact.zipPath} (${(sizeBytes / (1024 * 1024)).toFixed(2)} MB)`);
}

if (failures.length) {
  console.error('Lambda artifact validation failed:');
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log('Lambda artifact validation passed.');
