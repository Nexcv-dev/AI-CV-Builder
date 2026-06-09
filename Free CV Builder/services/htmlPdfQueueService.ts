import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';
import { createHtmlPdfQueuePayload } from '@nexcv/shared/queuePayloads';

const HTML_PDF_QUEUE_URL = (process.env.HTML_PDF_QUEUE_URL || '').trim();

let sqsClient: SQSClient | null = null;

const getSqsClient = () => {
    if (!HTML_PDF_QUEUE_URL) return null;
    if (!sqsClient) {
        sqsClient = new SQSClient({ region: process.env.HTML_PDF_QUEUE_REGION || process.env.AWS_REGION || 'eu-north-1' });
    }
    return sqsClient;
};

export const isHtmlPdfQueueConfigured = () => Boolean(HTML_PDF_QUEUE_URL);

export const enqueueHtmlPdfJob = async (jobId: string) => {
    const client = getSqsClient();
    if (!client || !HTML_PDF_QUEUE_URL) return false;

    await client.send(new SendMessageCommand({
        QueueUrl: HTML_PDF_QUEUE_URL,
        MessageBody: JSON.stringify(createHtmlPdfQueuePayload(jobId)),
    }));
    return true;
};
