import mongoose from 'mongoose';
import User from './User';

const ensureUserIndexes = async () => {
  const indexes = await User.collection.indexes();
  const googleIdIndex = indexes.find((index) => index.name === 'googleId_1');

  if (googleIdIndex && !googleIdIndex.partialFilterExpression) {
    console.warn('Repairing legacy googleId_1 index to allow email-only signup users.');
    await User.collection.dropIndex('googleId_1');
  }

  await User.createIndexes();
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const conn = await mongoose.connect(mongoUri as string);
    await ensureUserIndexes();
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error: any) {
    console.error(`Error: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;
