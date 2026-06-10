import mongoose from 'mongoose';
import User from './User';
import { logError, logEvent } from '../server-utils/logger';

const parsePositiveInt = (value: string | undefined, fallback: number) => {
  const parsed = Number.parseInt(value || '', 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

const dbPoolOptions = () => ({
  maxPoolSize: parsePositiveInt(process.env.MONGODB_MAX_POOL_SIZE, 20),
  minPoolSize: parsePositiveInt(process.env.MONGODB_MIN_POOL_SIZE, 0),
  maxIdleTimeMS: parsePositiveInt(process.env.MONGODB_MAX_IDLE_TIME_MS, 30_000),
  serverSelectionTimeoutMS: parsePositiveInt(process.env.MONGODB_SERVER_SELECTION_TIMEOUT_MS, 10_000),
  monitorCommands: true,
});

let mongoEventLoggingEnabled = false;

const errorMessage = (error: unknown) => error instanceof Error ? error.message : String(error);

const enableConnectionEventLogging = (conn: typeof mongoose) => {
  if (mongoEventLoggingEnabled) return;
  mongoEventLoggingEnabled = true;

  conn.connection.on('error', (error) => {
    logError('mongodb.connection_error', error);
  });

  conn.connection.on('disconnected', () => {
    logEvent('warn', 'mongodb.disconnected');
  });

  conn.connection.on('reconnected', () => {
    logEvent('info', 'mongodb.reconnected');
  });

  const client = conn.connection.getClient() as any;
  client.on('error', (error: unknown) => {
    logError('mongodb.client_error', error);
  });
  client.on('serverHeartbeatFailed', (event: any) => {
    logEvent('warn', 'mongodb.server_heartbeat_failed', {
      connectionId: event.connectionId,
      failure: errorMessage(event.failure),
    });
  });
  client.on('connectionPoolClosed', (event: any) => {
    logEvent('warn', 'mongodb.connection_pool_closed', {
      address: event.address,
      serviceId: event.serviceId?.toString?.(),
    });
  });
};

const enableSlowQueryLogging = (conn: typeof mongoose) => {
  const thresholdMs = parsePositiveInt(process.env.MONGODB_SLOW_QUERY_MS, 500);
  const activeCommands = new Map<number, { startedAt: number; commandName: string; collection?: unknown }>();
  const client = conn.connection.getClient();

  client.on('commandStarted', (event) => {
    activeCommands.set(event.requestId, {
      startedAt: Date.now(),
      commandName: event.commandName,
      collection: event.command?.[event.commandName],
    });
  });

  client.on('commandSucceeded', (event) => {
    const command = activeCommands.get(event.requestId);
    activeCommands.delete(event.requestId);
    if (!command) return;

    const durationMs = Date.now() - command.startedAt;
    if (durationMs >= thresholdMs) {
      logEvent('warn', 'mongodb.slow_query', {
        collection: typeof command.collection === 'string' ? command.collection : undefined,
        command: command.commandName,
        durationMs,
      });
    }
  });

  client.on('commandFailed', (event) => {
    activeCommands.delete(event.requestId);
  });
};

const ensureUserIndexes = async () => {
  const indexes = await User.collection.indexes();
  const googleIdIndex = indexes.find((index) => index.name === 'googleId_1');

  if (googleIdIndex && !googleIdIndex.partialFilterExpression) {
    logEvent('warn', 'mongodb.legacy_index_repair_started', { index: 'googleId_1' });
    await User.collection.dropIndex('googleId_1');
  }

  await User.createIndexes();
};

const ensureAppIndexes = async () => {
  await ensureUserIndexes();

  await Promise.all(
    mongoose.modelNames()
      .filter((modelName) => modelName !== User.modelName)
      .map((modelName) => mongoose.model(modelName).createIndexes())
  );
};

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
    const conn = await mongoose.connect(mongoUri as string, dbPoolOptions());
    enableConnectionEventLogging(mongoose);
    enableSlowQueryLogging(mongoose);
    await ensureAppIndexes();
    logEvent('info', 'mongodb.connected', { host: conn.connection.host, ...dbPoolOptions() });
  } catch (error: any) {
    logError('mongodb.connection_failed', error);
    throw error;
  }
};

export default connectDB;
