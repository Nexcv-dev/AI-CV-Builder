import type { IncrementResponse, Options, Store } from 'express-rate-limit';
import RateLimitCounter from '../server-models/RateLimitCounter';

export class MongoRateLimitStore implements Store {
    localKeys = false;
    prefix: string;
    windowMs = 60_000;

    constructor(prefix: string) {
        this.prefix = prefix;
    }

    init(options: Options) {
        this.windowMs = typeof options.windowMs === 'number' ? options.windowMs : this.windowMs;
    }

    private scopedKey(key: string) {
        return `${this.prefix}:${key}`;
    }

    async get(key: string) {
        const counter = await RateLimitCounter.findOne({ key: this.scopedKey(key), resetTime: { $gt: new Date() } }).lean();
        if (!counter) return undefined;
        return {
            totalHits: counter.hits,
            resetTime: counter.resetTime,
        };
    }

    async increment(key: string): Promise<IncrementResponse> {
        const scopedKey = this.scopedKey(key);
        const now = new Date();
        const resetTime = new Date(now.getTime() + this.windowMs);
        await RateLimitCounter.updateOne(
            { key: scopedKey, resetTime: { $lte: now } },
            { $set: { hits: 0, resetTime } }
        );
        const counter = await RateLimitCounter.findOneAndUpdate(
            { key: scopedKey },
            { $inc: { hits: 1 }, $setOnInsert: { resetTime } },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        return {
            totalHits: counter.hits,
            resetTime: counter.resetTime,
        };
    }

    async decrement(key: string) {
        await RateLimitCounter.updateOne(
            { key: this.scopedKey(key), hits: { $gt: 0 } },
            { $inc: { hits: -1 } }
        );
    }

    async resetKey(key: string) {
        await RateLimitCounter.deleteOne({ key: this.scopedKey(key) });
    }

    async resetAll() {
        await RateLimitCounter.deleteMany({ key: { $regex: `^${this.prefix}:` } });
    }
}
