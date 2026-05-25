import 'dotenv/config';
import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'node:fs/promises';
import path from 'node:path';

const bucket = (process.env.S3_TEMPLATE_BUCKET_NAME || process.env.TEMPLATE_BUCKET_NAME || '').trim();
const prefix = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\/+|\/+$/g, '');
const region = process.env.AWS_REGION || 'eu-north-1';
const repoRoot = path.resolve(process.cwd(), '..');
const adminTemplatesRoot = path.join(repoRoot, 'Admin Templates');
const backupRoot = path.join('C:\\tmp', `nexcv-s3-template-backup-${new Date().toISOString().replace(/[:.]/g, '-')}`);

const templates = [
  'compact-timeline',
  'corporate-split',
  'elegant-sidebar',
  'modular-card',
  'tech-gradient',
];

const contentTypes = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.css', 'text/css; charset=utf-8'],
  ['.svg', 'image/svg+xml; charset=utf-8'],
  ['.webp', 'image/webp'],
  ['.png', 'image/png'],
  ['.jpg', 'image/jpeg'],
  ['.jpeg', 'image/jpeg'],
]);

if (!bucket) {
  throw new Error('S3_TEMPLATE_BUCKET_NAME or TEMPLATE_BUCKET_NAME is required.');
}

const client = new S3Client({ region });

const keyFor = (template, fileName) => (
  prefix ? `${prefix}/${template}/${fileName}` : `${template}/${fileName}`
);

const streamToBuffer = async (stream) => {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks);
};

const uploadFile = async (template, fileName) => {
  const source = path.join(adminTemplatesRoot, template, fileName);
  const body = await fs.readFile(source);
  const key = keyFor(template, fileName);
  const contentType = contentTypes.get(path.extname(fileName).toLowerCase()) || 'application/octet-stream';

  try {
    const current = await client.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
    const backupBody = await streamToBuffer(current.Body);
    const backupPath = path.join(backupRoot, template, fileName);
    await fs.mkdir(path.dirname(backupPath), { recursive: true });
    await fs.writeFile(backupPath, backupBody);
  } catch (error) {
    const code = error?.name || error?.Code || error?.code;
    if (code !== 'NoSuchKey' && code !== 'NotFound' && error?.$metadata?.httpStatusCode !== 404) {
      throw error;
    }
  }

  await client.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
    CacheControl: 'no-store',
  }));
  console.log(`uploaded ${key}`);
};

for (const template of templates) {
  const files = await fs.readdir(path.join(adminTemplatesRoot, template));
  for (const fileName of files.filter((file) => ['index.html', 'style.css'].includes(file) || file.startsWith('thumbnail.'))) {
    await uploadFile(template, fileName);
  }
}

console.log(`backup saved to ${backupRoot}`);
