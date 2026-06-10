import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { createPdfQueuePayload } from '@nexcv/shared/queuePayloads';

const PDF_QUEUE_URL = (process.env.PDF_QUEUE_URL || process.env.SQS_PDF_QUEUE_URL || '').trim();

let sqsClient: SQSClient | null = null;

const getSqsClient = () => {
    if (!PDF_QUEUE_URL) return null;
    if (!sqsClient) {
        sqsClient = new SQSClient({ region: process.env.PDF_QUEUE_REGION || process.env.AWS_REGION || 'eu-north-1' });
    }
    return sqsClient;
};

export const isPdfQueueConfigured = () => Boolean(PDF_QUEUE_URL);

export const enqueuePdfJob = async (jobId: string) => {
    const client = getSqsClient();
    if (!client || !PDF_QUEUE_URL) return false;

    await client.send(new SendMessageCommand({
        QueueUrl: PDF_QUEUE_URL,
        MessageBody: JSON.stringify(createPdfQueuePayload(jobId)),
    }));
    return true;
};
