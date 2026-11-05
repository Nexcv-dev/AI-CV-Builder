import { vi } from 'vitest';

/**
 * A tiny in-memory stand-in for a Mongoose model.
 *
 * It supports only the query shapes the payment and billing code uses:
 * equality, `$lt`/`$lte`/`$gt`/`$gte`, `$ne`, `$in`, `$exists`, `$or`, `$and`,
 * `$expr: { $lt: ['$a', '$b'] }`, and the `$set`/`$unset`/`$inc`/`$setOnInsert`
 * update operators. Query results are thenables with chainable `sort`, `limit`,
 * `populate`, and `select`, which are no-ops.
 *
 * Tests assert on the stored documents (`model.docs`) instead of on call
 * shapes, so they keep passing when the code moves between routes and services.
 */
// Mongoose documents and queries are loosely typed, and so are these fakes.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loose = any;

export type FakeDoc = Record<string, Loose>;

const isOperatorObject = (value: unknown): value is Record<string, unknown> => (
    Boolean(value)
    && typeof value === 'object'
    && !Array.isArray(value)
    && !(value instanceof Date)
    && Object.keys(value as object).length > 0
    && Object.keys(value as object).every((key) => key.startsWith('$'))
);

const comparable = (value: unknown) => (value instanceof Date ? value.getTime() : value as Loose);

const sameValue = (a: unknown, b: unknown) => {
    if (a === undefined || a === null || b === undefined || b === null) return a == b;
    if (a instanceof Date || b instanceof Date) return comparable(a) === comparable(b);
    return String(a) === String(b);
};

const resolveExprOperand = (doc: FakeDoc, operand: unknown) => (
    typeof operand === 'string' && operand.startsWith('$') ? doc[operand.slice(1)] : operand
);

export const matchesFilter = (doc: FakeDoc, filter: Record<string, Loose> = {}): boolean => (
    Object.entries(filter).every(([key, condition]) => {
        if (key === '$or') return (condition as Record<string, Loose>[]).some((part) => matchesFilter(doc, part));
        if (key === '$and') return (condition as Record<string, Loose>[]).every((part) => matchesFilter(doc, part));
        if (key === '$expr') {
            const [operator, operands] = Object.entries(condition as Record<string, unknown[]>)[0];
            const [left, right] = operands.map((operand) => resolveExprOperand(doc, operand));
            if (operator !== '$lt') throw new Error(`fakeModels: unsupported $expr operator ${operator}`);
            return left !== undefined && left !== null && right !== undefined && right !== null
                && comparable(left) < comparable(right);
        }

        const value = doc[key];
        if (!isOperatorObject(condition)) return sameValue(value, condition);

        return Object.entries(condition).every(([operator, argument]) => {
            switch (operator) {
                case '$exists': return (value !== undefined) === argument;
                case '$ne': return !sameValue(value, argument);
                case '$in': return (argument as unknown[]).some((item) => sameValue(value, item));
                case '$lt': return value !== undefined && value !== null && comparable(value) < comparable(argument);
                case '$lte': return value !== undefined && value !== null && comparable(value) <= comparable(argument);
                case '$gt': return value !== undefined && value !== null && comparable(value) > comparable(argument);
                case '$gte': return value !== undefined && value !== null && comparable(value) >= comparable(argument);
                default: throw new Error(`fakeModels: unsupported query operator ${operator}`);
            }
        });
    })
);

const applyUpdate = (doc: FakeDoc, update: Record<string, Loose>) => {
    const usesOperators = Object.keys(update).some((key) => key.startsWith('$'));
    if (!usesOperators) {
        Object.assign(doc, update);
        return;
    }
    Object.assign(doc, update.$set || {});
    Object.keys(update.$unset || {}).forEach((key) => {
        delete doc[key];
    });
    Object.entries(update.$inc || {}).forEach(([key, amount]) => {
        doc[key] = (Number(doc[key]) || 0) + Number(amount);
    });
};

const equalityFields = (filter: Record<string, Loose>) => Object.fromEntries(
    Object.entries(filter).filter(([key, value]) => !key.startsWith('$') && !isOperatorObject(value))
);

const query = <T>(value: T) => {
    const chain = {
        sort: () => chain,
        limit: () => chain,
        populate: () => chain,
        select: () => chain,
        then: <R1 = T, R2 = never>(
            onFulfilled?: ((result: T) => R1 | PromiseLike<R1>) | null,
            onRejected?: ((reason: unknown) => R2 | PromiseLike<R2>) | null,
        ) => Promise.resolve(value).then(onFulfilled, onRejected),
        catch: <R = never>(onRejected?: ((reason: unknown) => R | PromiseLike<R>) | null) => (
            Promise.resolve(value).catch(onRejected)
        ),
    };
    return chain;
};

let fakeIdCounter = 0;
const nextFakeId = () => {
    fakeIdCounter += 1;
    return fakeIdCounter.toString(16).padStart(24, 'f');
};

export const createFakeModel = (initialDocs: FakeDoc[] = []) => {
    const docs: FakeDoc[] = [];
    const insert = (data: FakeDoc) => {
        const doc: FakeDoc = { _id: nextFakeId(), ...data };
        doc.save = vi.fn(async () => doc);
        docs.push(doc);
        return doc;
    };
    initialDocs.forEach(insert);

    const findFirst = (filter: Record<string, Loose>) => docs.find((doc) => matchesFilter(doc, filter)) || null;

    const findOneAndUpdate = (filter: Record<string, Loose>, update: Record<string, Loose>, options: Record<string, Loose> = {}) => {
        let doc = findFirst(filter);
        if (!doc) {
            if (!options.upsert) return query(null);
            doc = insert({ ...equalityFields(filter), ...(update.$setOnInsert || {}) });
        }
        const { $setOnInsert: _ignored, ...rest } = update;
        applyUpdate(doc, rest);
        return query(doc);
    };

    return {
        docs,
        insert,
        find: vi.fn((filter: Record<string, Loose> = {}) => query(docs.filter((doc) => matchesFilter(doc, filter)))),
        findOne: vi.fn((filter: Record<string, Loose> = {}) => query(findFirst(filter))),
        findById: vi.fn((id: unknown) => query(docs.find((doc) => sameValue(doc._id, id)) || null)),
        countDocuments: vi.fn(async (filter: Record<string, Loose> = {}) => docs.filter((doc) => matchesFilter(doc, filter)).length),
        create: vi.fn(async (data: FakeDoc) => insert(data)),
        updateOne: vi.fn(async (filter: Record<string, Loose>, update: Record<string, Loose>) => {
            const doc = findFirst(filter);
            if (!doc) return { matchedCount: 0, modifiedCount: 0 };
            applyUpdate(doc, update);
            return { matchedCount: 1, modifiedCount: 1 };
        }),
        updateMany: vi.fn(async (filter: Record<string, Loose>, update: Record<string, Loose>) => {
            const matched = docs.filter((doc) => matchesFilter(doc, filter));
            matched.forEach((doc) => applyUpdate(doc, update));
            return { matchedCount: matched.length, modifiedCount: matched.length };
        }),
        deleteOne: vi.fn(async (filter: Record<string, Loose>) => {
            const index = docs.findIndex((doc) => matchesFilter(doc, filter));
            if (index >= 0) docs.splice(index, 1);
            return { deletedCount: index >= 0 ? 1 : 0 };
        }),
        deleteMany: vi.fn(async (filter: Record<string, Loose> = {}) => {
            const remaining = docs.filter((doc) => !matchesFilter(doc, filter));
            const deletedCount = docs.length - remaining.length;
            docs.splice(0, docs.length, ...remaining);
            return { deletedCount };
        }),
        findByIdAndDelete: vi.fn((id: unknown) => {
            const index = docs.findIndex((doc) => sameValue(doc._id, id));
            const [deleted] = index >= 0 ? docs.splice(index, 1) : [null];
            return query(deleted);
        }),
        findOneAndUpdate: vi.fn(findOneAndUpdate),
        findByIdAndUpdate: vi.fn((id: unknown, update: Record<string, Loose>, options: Record<string, Loose> = {}) => (
            findOneAndUpdate({ _id: id }, update, { ...options, upsert: false })
        )),
    };
};

export type FakeModel = ReturnType<typeof createFakeModel>;

/** Runs `withTransaction` callbacks inline, like a replica set with no conflicts. */
export const createFakeMongoose = () => ({
    startSession: vi.fn(async () => ({
        withTransaction: vi.fn(async (callback: () => Promise<unknown>) => callback()),
        endSession: vi.fn(async () => undefined),
    })),
});

/** Captures route handlers registered on an Express router. */
export const createRouteCapture = () => {
    const routes: Array<{ method: string; path: string; handlers: Loose[] }> = [];
    const register = (method: string) => vi.fn((path: string, ...handlers: Loose[]) => {
        routes.push({ method, path, handlers });
        return router;
    });
    const router: Loose = {
        get: register('get'),
        post: register('post'),
        put: register('put'),
        patch: register('patch'),
        delete: register('delete'),
    };
    const handlers = (method: string, path: string) => {
        const route = routes.find((item) => item.method === method && item.path === path);
        if (!route) throw new Error(`No ${method.toUpperCase()} ${path} route registered.`);
        return route.handlers;
    };
    const handler = (method: string, path: string) => handlers(method, path).at(-1);
    return { router, handler, handlers };
};

export const createResponse = () => {
    const res: Loose = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    res.send = vi.fn(() => res);
    res.setHeader = vi.fn(() => res);
    res.redirect = vi.fn(() => res);
    res.clearCookie = vi.fn(() => res);
    return res;
};
