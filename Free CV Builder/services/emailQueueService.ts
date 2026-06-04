import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { logEvent } from '../server-utils/logger';
import type { AppEmailOptions } from './emailService';

const EMAIL_QUEUE_URL = (process.env.EMAIL_QUEUE_URL || process.env.SQS_EMAIL_QUEUE_URL || '').trim();

let sqsClient: SQSClient | null = null;

const getSqsClient = () => {
    if (!EMAIL_QUEUE_URL) return null;
    if (!sqsClient) {
        sqsClient = new SQSClient({ region: process.env.EMAIL_QUEUE_REGION || process.env.AWS_REGION || 'eu-north-1' });
    }
    return sqsClient;
};

export const isEmailQueueConfigured = () => Boolean(EMAIL_QUEUE_URL);

export const enqueueEmail = async (email: AppEmailOptions) => {
    const client = getSqsClient();
    if (!client || !EMAIL_QUEUE_URL) return false;

    await client.send(new SendMessageCommand({
        QueueUrl: EMAIL_QUEUE_URL,
        MessageBody: JSON.stringify({ email }),
    }));
    logEvent('info', 'email.queued', { to: email.to, subject: email.subject });
    return true;
};
