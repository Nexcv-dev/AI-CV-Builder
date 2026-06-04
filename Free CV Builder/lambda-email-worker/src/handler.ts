import { sendAppEmail, type AppEmailOptions } from '../../services/emailService';

const parseEmailMessages = (event: any): AppEmailOptions[] => {
  const records = Array.isArray(event?.Records) ? event.Records : [];
  return records.map((record: any) => {
    const payload = JSON.parse(record.body || '{}');
    const email = payload?.email;
    if (!email || typeof email !== 'object') {
      throw new Error('SQS message is missing email payload.');
    }
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
