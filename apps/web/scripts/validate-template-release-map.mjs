import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(projectRoot, '../..');
const mapPath = path.join(projectRoot, 'config', 'template-release-map.json');
const adminTemplatesRoot = path.join(repoRoot, 'Admin Templates');

const keyPattern = /^[a-z0-9][a-z0-9-]{1,48}[a-z0-9]$/;
const colorPattern = /^#[0-9a-fA-F]{6}$/;
const categories = new Set(['Modern', 'ATS Friendly', 'Minimal', 'Executive', 'Creative', 'Tech', 'Corporate']);
const accessValues = new Set(['free', 'paid']);
const surfaceColorRoles = new Set(['none', 'sidebar', 'header']);

const map = JSON.parse(await fs.readFile(mapPath, 'utf8'));
const issues = [];
const targetKeys = new Set();
const sourceFolders = new Set();

if (!Array.isArray(map)) {
  throw new Error('template-release-map.json must be an array.');
}

for (const [index, item] of map.entries()) {
  const label = item?.targetKey || `entry ${index + 1}`;
  const sourceFolder = String(item?.sourceFolder || '');
  const targetKey = String(item?.targetKey || '');

  if (!sourceFolder) issues.push(`${label}: sourceFolder is required.`);
  else {
    sourceFolders.add(sourceFolder);
    try {
      const files = await fs.readdir(path.join(adminTemplatesRoot, sourceFolder));
      if (!files.includes('index.html')) issues.push(`${label}: ${sourceFolder}/index.html is missing.`);
      if (!files.includes('style.css')) issues.push(`${label}: ${sourceFolder}/style.css is missing.`);
      if (!files.some((file) => /^thumbnail\.(svg|png|jpe?g|webp)$/i.test(file))) {
        issues.push(`${label}: ${sourceFolder}/thumbnail.* is missing.`);
      }
    } catch {
      issues.push(`${label}: sourceFolder "${sourceFolder}" does not exist in Admin Templates.`);
    }
  }

  if (!keyPattern.test(targetKey)) issues.push(`${label}: targetKey must be a lowercase slug.`);
  if (targetKeys.has(targetKey)) issues.push(`${label}: duplicate targetKey.`);
  targetKeys.add(targetKey);

  if (!item?.label) issues.push(`${label}: label is required.`);
  if (!categories.has(item?.category)) issues.push(`${label}: category is invalid.`);
  if (!accessValues.has(item?.access)) issues.push(`${label}: access must be free or paid.`);
  if (!surfaceColorRoles.has(item?.surfaceColorRole)) issues.push(`${label}: surfaceColorRole is invalid.`);
  if (!colorPattern.test(String(item?.defaultThemeColor || ''))) issues.push(`${label}: defaultThemeColor must be a #rrggbb color.`);
}

const localFolders = (await fs.readdir(adminTemplatesRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .filter((name) => !sourceFolders.has(name));

if (issues.length) {
  console.log(`Template release map has ${issues.length} issue${issues.length === 1 ? '' : 's'}:`);
  for (const issue of issues) console.log(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Validated ${map.length} template release mappings.`);
}

if (localFolders.length) {
  console.log(`Unmapped local template folders: ${localFolders.join(', ')}`);
}
