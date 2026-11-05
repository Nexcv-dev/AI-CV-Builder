import type { Mongoose } from 'mongoose';
import type CheckoutSessionModel from '../server-models/CheckoutSession';
import type { ICheckoutSession } from '../server-models/CheckoutSession';
import type PaymentTransactionModel from '../server-models/PaymentTransaction';
import type { IPaymentTransaction } from '../server-models/PaymentTransaction';
import type UserModel from '../server-models/User';
import type { IUser } from '../server-models/User';
import { createRenewedPlanExpiry, type PaidBillingPlan } from '../server-models/userPlan';
import { isMongoDuplicateKeyError } from '../server-utils/requestValidation';
import { stalePaymentProcessingDate } from './checkoutSessionService';

/**
 * Turns a verified payment notification into a plan upgrade, exactly once.
 *
 * Each provider payment (`provider` + `paymentId`, unique in the schema) gets
 * one PaymentTransaction:
 *
 * 1. Upsert it as received (`processed: false`). A duplicate delivery of an
 *    already processed payment stops here.
 * 2. Claim it by setting `processingStartedAt`. A delivery that finds a claim
 *    younger than the processing lock timeout stops here, so two concurrent
 *    deliveries cannot both upgrade the user. A stale claim is taken over.
 * 3. In one Mongo transaction: upgrade the user's plan, mark the checkout
 *    `paid`, and mark the payment processed.
 *
 * Signature, amount, and context checks are the caller's job and must pass
 * before this runs.
 */
export interface PaymentProcessingDeps {
    mongoose: Pick<Mongoose, 'startSession'>;
    User: typeof UserModel;
    CheckoutSession: typeof CheckoutSessionModel;
    PaymentTransaction: typeof PaymentTransactionModel;
}

export type PaymentProvider = IPaymentTransaction['provider'];

export interface PaymentTransactionFilter {
    provider: PaymentProvider;
    paymentId: string;
}

/** The fields a PaymentTransaction is saved with. */
export type PaymentTransactionRecord = PaymentTransactionFilter & {
    orderId: string;
    userId?: unknown;
    plan?: PaidBillingPlan;
    amount?: string;
    currency?: string;
    baseAmountCents?: number;
    discountCents?: number;
    finalAmountCents?: number;
    couponCode?: string;
    statusCode: string;
    rawPayload: Record<string, unknown>;
};

export type PaymentProcessingResult =
    | { status: 'duplicate_processed' }
    | { status: 'duplicate_in_progress' }
    | { status: 'processed'; user: IUser };

// Kept per provider so existing log searches keep matching.
const USER_MISSING_MESSAGES: Record<PaymentProvider, string> = {
    payhere: 'User not found while processing payment transaction.',
    lemonsqueezy: 'User not found while processing Lemon Squeezy transaction.',
};

const transactionFilterFor = (record: PaymentTransactionFilter): PaymentTransactionFilter => ({
    provider: record.provider,
    paymentId: record.paymentId,
});

/**
 * Records a notification that must not upgrade the user, such as a failed
 * PayHere status. The payment stays unprocessed, so it shows in Needs Review.
 */
export const recordUnprocessedPayment = async (
    PaymentTransaction: PaymentProcessingDeps['PaymentTransaction'],
    record: PaymentTransactionRecord,
) => (
    PaymentTransaction.findOneAndUpdate(
        transactionFilterFor(record),
        { ...record, processed: false },
        { upsert: true, new: true, setDefaultsOnInsert: true }
    )
);

const upsertReceivedTransaction = async (
    PaymentTransaction: PaymentProcessingDeps['PaymentTransaction'],
    record: PaymentTransactionRecord,
    refreshOnReceive?: Partial<PaymentTransactionRecord>,
) => {
    const filter = transactionFilterFor(record);
    try {
        const transaction = await PaymentTransaction.findOneAndUpdate(
            filter,
            {
                $setOnInsert: { ...record, processed: false },
                ...(refreshOnReceive ? { $set: refreshOnReceive } : {}),
            },
            { upsert: true, new: true, setDefaultsOnInsert: true }
        );
        if (!transaction) throw new Error('Payment transaction upsert returned no document.');
        return transaction;
    } catch (error) {
        // Two deliveries raced on the upsert; the other one inserted the row.
        if (!isMongoDuplicateKeyError(error)) throw error;
        const transaction = await PaymentTransaction.findOne(filter);
        if (!transaction) throw error;
        return transaction;
    }
};

const claimTransaction = async (
    PaymentTransaction: PaymentProcessingDeps['PaymentTransaction'],
    filter: PaymentTransactionFilter,
) => (
    PaymentTransaction.findOneAndUpdate(
        {
            ...filter,
            processed: false,
            $or: [
                { processingStartedAt: { $exists: false } },
                { processingStartedAt: { $lt: stalePaymentProcessingDate() } },
            ],
        },
        { $set: { processingStartedAt: new Date() } },
        { new: true }
    )
);

export const processVerifiedPayment = async (
    deps: PaymentProcessingDeps,
    input: {
        transaction: PaymentTransactionRecord;
        /** Fields to overwrite when the payment row already exists. */
        refreshOnReceive?: Partial<PaymentTransactionRecord>;
        user: IUser;
        plan: PaidBillingPlan;
        checkoutSession?: Pick<ICheckoutSession, '_id'> | null;
    },
): Promise<PaymentProcessingResult> => {
    const { mongoose, User, CheckoutSession, PaymentTransaction } = deps;
    const { transaction, refreshOnReceive, user, plan, checkoutSession } = input;
    const filter = transactionFilterFor(transaction);

    const receivedTransaction = await upsertReceivedTransaction(PaymentTransaction, transaction, refreshOnReceive);
    if (receivedTransaction.processed) return { status: 'duplicate_processed' };

    const claimedTransaction = await claimTransaction(PaymentTransaction, filter);
    if (!claimedTransaction) return { status: 'duplicate_in_progress' };

    let processedUser = user;
    const session = await mongoose.startSession();
    try {
        await session.withTransaction(async () => {
            const planStartedAt = new Date();
            const userUpdate: Record<string, unknown> = {
                $set: {
                    plan,
                    planStartedAt,
                    planExpiresAt: createRenewedPlanExpiry(plan, user, planStartedAt),
                },
            };
            if (plan === 'payg') {
                userUpdate.$inc = { paygCvSaveCredits: 1 };
            }

            const updatedUser = await User.findByIdAndUpdate(user._id, userUpdate, { new: true, session });
            if (!updatedUser) throw new Error(USER_MISSING_MESSAGES[transaction.provider]);
            processedUser = updatedUser;

            if (checkoutSession) {
                await CheckoutSession.updateOne(
                    { _id: checkoutSession._id },
                    { $set: { status: 'paid', couponReserved: false } },
                    { session }
                );
            }

            await PaymentTransaction.findOneAndUpdate(
                filter,
                {
                    ...transaction,
                    userId: updatedUser._id,
                    processed: true,
                    processedAt: new Date(),
                },
                { upsert: true, new: true, setDefaultsOnInsert: true, session }
            );
        });
    } finally {
        await session.endSession();
    }

    return { status: 'processed', user: processedUser };
};
