import 'dotenv/config';
import { HeadObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const mapPath = path.join(projectRoot, 'config', 'template-release-map.json');

const bucket = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
const prefix = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\/+|\/+$/g, '');
const region = process.env.AWS_REGION || 'eu-north-1';
const requestedKey = process.argv.find((arg) => arg.startsWith('--key='))?.slice('--key='.length);

if (!bucket) {
  throw new Error('S3_TEMPLATE_BUCKET_NAME or TEMPLATE_BUCKET_NAME is required.');
}

const releaseMap = JSON.parse(await fs.readFile(mapPath, 'utf8'));
if (!Array.isArray(releaseMap)) throw new Error('template-release-map.json must be an array.');

const keyFor = (template, fileName) => (
  prefix ? `${prefix}/${template}/${fileName}` : `${template}/${fileName}`
);

const client = new S3Client({ region });

const objectExists = async (key) => {
  try {
    await client.send(new HeadObjectCommand({ Bucket: bucket, Key: key }));
    return true;
  } catch (error) {
    const code = error?.name || error?.Code || error?.code;
    if (code === 'NotFound' || code === 'NoSuchKey' || error?.$metadata?.httpStatusCode === 404) return false;
    throw error;
  }
};

const thumbnailCandidates = (template) => ['thumbnail.webp', 'thumbnail.png', 'thumbnail.jpg', 'thumbnail.jpeg', 'thumbnail.svg']
  .map((fileName) => keyFor(template, fileName));

const templates = requestedKey
  ? [{ targetKey: requestedKey }]
  : releaseMap.map((item) => ({ targetKey: item.targetKey }));

let missing = 0;

for (const template of templates) {
  const targetKey = template.targetKey;
  const requiredKeys = [keyFor(targetKey, 'index.html'), keyFor(targetKey, 'style.css')];
  const missingRequired = [];

  for (const key of requiredKeys) {
    if (!(await objectExists(key))) missingRequired.push(key);
  }

  const thumbnailKeys = thumbnailCandidates(targetKey);
  const hasThumbnail = (await Promise.all(thumbnailKeys.map(objectExists))).some(Boolean);
  if (!hasThumbnail) missingRequired.push(`${prefix ? `${prefix}/` : ''}${targetKey}/thumbnail.(webp|png|jpg|svg)`);

  if (missingRequired.length) {
    missing += missingRequired.length;
    console.error(`missing assets for ${targetKey}:`);
    for (const key of missingRequired) console.error(`  - s3://${bucket}/${key}`);
  } else {
    console.log(`ok ${targetKey}`);
  }
}

if (missing) {
  console.error(`S3 template verification failed: ${missing} missing asset${missing === 1 ? '' : 's'}.`);
  process.exit(1);
}

console.log(`S3 template verification passed for ${templates.length} template${templates.length === 1 ? '' : 's'}.`);
