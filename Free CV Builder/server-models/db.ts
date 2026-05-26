import mongoose from 'mongoose';
import User from './User';
import { logError, logEvent } from '../server-utils/logger';

const ensureUserIndexes = async () => {
  const indexes = await User.collection.indexes();
  const googleIdIndex = indexes.find((index) => index.name === 'googleId_1');

  if (googleIdIndex && !googleIdIndex.partialFilterExpression) {
    logEvent('warn', 'mongodb.legacy_index_repair_started', { index: 'googleId_1' });
    await User.collection.dropIndex('googleId_1');
  }

  await User.createIndexes();
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const conn = await mongoose.connect(mongoUri as string);
    await ensureUserIndexes();
    logEvent('info', 'mongodb.connected', { host: conn.connection.host });
  } catch (error: any) {
    logError('mongodb.connection_failed', error);
    process.exit(1);
  }
};

export default connectDB;
