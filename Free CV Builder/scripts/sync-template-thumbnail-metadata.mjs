import 'dotenv/config';
import mongoose from 'mongoose';
import TemplateSetting from '../server-models/TemplateSetting.ts';
import { CV_TEMPLATES } from '../src/templates.ts';
import releaseMap from '../config/template-release-map.json' with { type: 'json' };

const mongoUri = (process.env.MONGO_URI || process.env.MONGODB_URI || '').trim();
const prefix = (process.env.S3_TEMPLATE_PREFIX || 'templates').replace(/^\/+|\/+$/g, '');
const dryRun = process.argv.includes('--dry-run');

if (!mongoUri) {
  throw new Error('MONGO_URI or MONGODB_URI is required to sync template thumbnail metadata.');
}

const keyFor = (template, fileName) => (
  prefix ? `${prefix}/${template}/${fileName}` : `${template}/${fileName}`
);

const routeThumbnail = (key) => `/api/templates/${encodeURIComponent(key)}/thumbnail?v=${Date.now()}`;

await mongoose.connect(mongoUri);

try {
  const operations = [];

  for (const template of CV_TEMPLATES) {
    operations.push({
      label: `built-in ${template.key}`,
      filter: { key: template.key },
      update: {
        $set: {
          key: template.key,
          label: template.label,
          access: template.access,
          thumbnail: template.image,
          source: 'built_in',
          status: 'active',
        },
        $setOnInsert: {
          category: 'Modern',
          surfaceColorRole: template.surfaceColorRole || 'none',
          defaultThemeColor: '#000000',
        },
      },
      options: { upsert: true },
    });
  }

  for (const item of releaseMap) {
    const thumbnailS3Key = keyFor(item.targetKey, 'thumbnail.webp');
    operations.push({
      label: `custom ${item.targetKey}`,
      filter: { key: item.targetKey, source: 'custom' },
      update: {
        $set: {
          thumbnail: routeThumbnail(item.targetKey),
          thumbnailS3Key,
          s3Prefix: prefix ? `${prefix}/${item.targetKey}` : item.targetKey,
        },
      },
      options: {},
    });
  }

  for (const operation of operations) {
    if (dryRun) {
      console.log(`[dry-run] ${operation.label}`, operation.filter, operation.update);
      continue;
    }
    const result = await TemplateSetting.updateOne(operation.filter, operation.update, operation.options);
    console.log(`${operation.label}: matched=${result.matchedCount} modified=${result.modifiedCount} upserted=${result.upsertedCount}`);
  }
} finally {
  await mongoose.disconnect();
}
