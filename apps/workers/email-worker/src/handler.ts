import { parseEmailPayloadsFromSqsEvent } from '@nexcv/shared/queuePayloads';
import { sendAppEmail, type AppEmailOptions } from '../../../api/services/emailService';

const parseEmailMessages = (event: any): AppEmailOptions[] => {
  return parseEmailPayloadsFromSqsEvent(event).map((email: any) => {
    if (!email.to || !email.from || !email.subject || !email.text) {
      throw new Error('Email payload is missing required fields.');
    }
    return {
      to: String(email.to),
      from: String(email.from),
      subject: String(email.subject),
      text: String(email.text),
      ...(email.html ? { html: String(email.html) } : {}),
      ...(email.replyTo ? { replyTo: String(email.replyTo) } : {}),
    };
  });
};

export async function handler(event: any) {
  const emails = parseEmailMessages(event);
  for (const email of emails) {
    await sendAppEmail(email);
  }
  return { processed: emails.length };
}
