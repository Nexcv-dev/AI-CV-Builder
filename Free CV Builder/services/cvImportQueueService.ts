import { SendMessageCommand, SQSClient } from '@aws-sdk/client-sqs';

const CV_IMPORT_QUEUE_URL = (process.env.CV_IMPORT_QUEUE_URL || process.env.SQS_CV_IMPORT_QUEUE_URL || '').trim();

let sqsClient: SQSClient | null = null;

const getSqsClient = () => {
    if (!CV_IMPORT_QUEUE_URL) return null;
    if (!sqsClient) {
        sqsClient = new SQSClient({ region: process.env.CV_IMPORT_QUEUE_REGION || process.env.AWS_REGION || 'eu-north-1' });
    }
    return sqsClient;
};

export const isCvImportQueueConfigured = () => Boolean(CV_IMPORT_QUEUE_URL);

export const enqueueCvImportJob = async (jobId: string) => {
    const client = getSqsClient();
    if (!client || !CV_IMPORT_QUEUE_URL) return false;

    await client.send(new SendMessageCommand({
        QueueUrl: CV_IMPORT_QUEUE_URL,
        MessageBody: JSON.stringify({ jobId }),
    }));
    return true;
};
