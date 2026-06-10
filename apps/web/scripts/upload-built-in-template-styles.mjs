import 'dotenv/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const bucket = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
const prefix = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\/+|\/+$/g, '');
const region = process.env.AWS_REGION || 'eu-north-1';
const templates = ['classic', 'modern', 'professional', 'timeline', 'minimalist', 'startup'];
const markerStart = '/* NexCV shared pagination rules:start */';
const markerEnd = '/* NexCV shared pagination rules:end */';
const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(projectRoot, '../..');

if (!bucket) {
  throw new Error('S3_TEMPLATE_BUCKET_NAME or TEMPLATE_BUCKET_NAME is required.');
}

const rulesSource = await fs.readFile(path.join(repoRoot, 'packages', 'templates', 'src', 'cvTemplateRules.ts'), 'utf8');
const rulesMatch = rulesSource.match(/export const CV_TEMPLATE_PAGINATION_RULES = `([\s\S]*?)`;/);
if (!rulesMatch) {
  throw new Error('Could not read CV_TEMPLATE_PAGINATION_RULES.');
}

const sharedRules = `${markerStart}\n${rulesMatch[1].trim()}\n${markerEnd}`;
const client = new S3Client({ region });

const keyFor = (template, fileName) => (
  prefix ? `${prefix}/${template}/${fileName}` : `${template}/${fileName}`
);

const stripExistingSharedRules = (css) => {
  const pattern = new RegExp(`${markerStart.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}[\\s\\S]*?${markerEnd.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*`, 'g');
  return css.replace(pattern, '').trimStart();
};

const ensureStartupClipFallback = (template, css) => {
  if (template !== 'startup') return css;
  if (css.includes('-webkit-clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%)')) return css;
  return css.replace(
    'clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);',
    '-webkit-clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);\n  clip-path: polygon(0 0, 100% 0, 100% 75%, 0 100%);'
  );
};

for (const template of templates) {
  const key = keyFor(template, 'style.css');
  const response = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const currentCss = await response.Body.transformToString();
  const css = `${sharedRules}\n\n${ensureStartupClipFallback(template, stripExistingSharedRules(currentCss))}`;
  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: css,
    ContentType: 'text/css; charset=utf-8',
    CacheControl: 'no-store',
  }));
  console.log(`uploaded ${key} (${css.length} bytes)`);
}
