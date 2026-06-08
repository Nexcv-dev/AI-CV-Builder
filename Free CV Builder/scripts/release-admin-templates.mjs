import 'dotenv/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(projectRoot, '..');
const mapPath = path.join(projectRoot, 'config', 'template-release-map.json');
const adminTemplatesRoot = path.join(repoRoot, 'Admin Templates');
const dryRun = process.argv.includes('--dry-run');

const bucket = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
const prefix = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\/+|\/+$/g, '');
const region = process.env.AWS_REGION || 'eu-north-1';
const backupRoot = path.join('C:\\tmp', `nexcv-s3-template-release-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
]);

if (!dryRun && !bucket) {
  throw new Error('S3_TEMPLATE_BUCKET_NAME or TEMPLATE_BUCKET_NAME is required.');
}

const releaseMap = JSON.parse(await fs.readFile(mapPath, 'utf8'));
if (!Array.isArray(releaseMap)) throw new Error('template-release-map.json must be an array.');

const client = dryRun ? null : new S3Client({ region });
const uploadedKeys = [];

const keyFor = (template, fileName) => (
  prefix ? `${prefix}/${template}/${fileName}` : `${template}/${fileName}`
);

const sha256 = (body) => crypto.createHash('sha256').update(body).digest('hex');

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  return Buffer.concat(chunks);
};

const uploadFile = async ({ sourceFolder, targetKey }, fileName) => {
  const source = path.join(adminTemplatesRoot, sourceFolder, fileName);
  const body = await fs.readFile(source);
  const key = keyFor(targetKey, fileName);
  const contentType = contentTypes.get(path.extname(fileName).toLowerCase()) || 'application/octet-stream';

  if (dryRun) {
    console.log(`[dry-run] ${sourceFolder}/${fileName} -> ${key} (${contentType}, ${body.length} bytes)`);
    return;
  }

  try {
    const current = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const backupBody = await streamToBuffer(current.Body);
    const backupPath = path.join(backupRoot, targetKey, fileName);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, backupBody);
  } catch (error) {
    const code = error?.name || error?.Code || error?.code;
    if (code !== 'NoSuchKey' && code !== 'NotFound' && error?.$metadata?.httpStatusCode !== 404) throw error;
  }

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'no-store',
  }));

  const verify = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  if (!verify.Body) throw new Error(`Upload verification failed for ${key}.`);
  const uploadedBody = await streamToBuffer(verify.Body);
  if (uploadedBody.length !== body.length || sha256(uploadedBody) !== sha256(body)) {
    throw new Error(`Upload verification mismatch for ${key}.`);
  }

  uploadedKeys.push(key);
  console.log(`uploaded ${key}`);
};

for (const item of releaseMap) {
  const files = await fs.readdir(path.join(adminTemplatesRoot, item.sourceFolder));
  const hasWebpThumbnail = files.some((fileName) => /^thumbnail\.webp$/i.test(fileName));
  const uploadableFiles = files
    .filter((fileName) => (
      ['index.html', 'style.css'].includes(fileName)
      || /^thumbnail\.(svg|png|jpe?g|webp)$/i.test(fileName)
    ))
    .filter((fileName) => !hasWebpThumbnail || !/^thumbnail\.(svg|png|jpe?g)$/i.test(fileName))
    .sort((a, b) => a.localeCompare(b));

  for (const fileName of uploadableFiles) {
    await uploadFile(item, fileName);
  }
}

if (dryRun) {
  console.log(`Dry run complete for ${releaseMap.length} templates.`);
} else {
  console.log(`uploaded ${uploadedKeys.length} objects across ${releaseMap.length} templates`);
  console.log(`backup saved to ${backupRoot}`);
}
