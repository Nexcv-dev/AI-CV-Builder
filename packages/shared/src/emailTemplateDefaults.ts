export type EmailTemplateKey =
  | 'verification'
  | 'passwordReset'
  | 'supportReply'
  | 'paymentReceipt'
  | 'maintenanceNotice';

export interface EmailTemplate {
  key: EmailTemplateKey;
  label: string;
  description: string;
  subject: string;
  body: string;
  variables: string[];
}

export type EmailTemplateMap = Record<EmailTemplateKey, EmailTemplate>;

export const DEFAULT_EMAIL_TEMPLATES: EmailTemplateMap = {
  verification: {
    key: 'verification',
    label: 'Email Verification',
    description: 'Sent when users create an account or request a new OTP.',
    subject: 'Your NexCV verification code',
    body: `Hi {{name}},

Welcome to NexCV. Use this one-time code to verify your email address:

{{code}}

This verification code will expire in {{expiresIn}}.

If you did not create a NexCV account, you can safely ignore this email.

Thanks,
The NexCV Team
`,
    variables: ['name', 'code', 'expiresIn'],
  },
  passwordReset: {
    key: 'passwordReset',
    label: 'Password Reset',
    description: 'Sent when a user requests a password reset link.',
    subject: 'Reset your NexCV password',
    body: `Hi {{name}},

We received a request to reset the password for your NexCV account.

Reset your password:
{{resetUrl}}

This reset link will expire in {{expiresIn}}.

If you did not request a password reset, you can safely ignore this email. Your password will stay unchanged.

Thanks,
The NexCV Team
`,
    variables: ['name', 'resetUrl', 'expiresIn'],
  },
  supportReply: {
    key: 'supportReply',
    label: 'Support Reply',
    description: 'Used when support agents reply to a support ticket.',
    subject: 'Update on your NexCV support request: {{ticketSubject}}',
    body: `Hi {{name}},

Thanks for contacting NexCV support.

{{replyMessage}}

Ticket: {{ticketSubject}}
Ticket ID: {{ticketId}}

Thanks,
The NexCV Team
`,
    variables: ['name', 'replyMessage', 'ticketSubject', 'ticketId'],
  },
  paymentReceipt: {
    key: 'paymentReceipt',
    label: 'Payment Receipt',
    description: 'Sent to customers after a successful payment.',
    subject: 'Your NexCV transaction is successful - {{transactionId}}',
    body: `Hi {{name}},

Your NexCV {{planName}} upgrade is active.

Transaction ID: {{transactionId}}
Plan: {{planName}}
Access expires at: {{expiresAt}}

Keep this transaction ID for support or refund requests.

Thanks,
The NexCV Team
`,
    variables: ['name', 'planName', 'transactionId', 'expiresAt'],
  },
  maintenanceNotice: {
    key: 'maintenanceNotice',
    label: 'Maintenance Notice',
    description: 'Prepared copy for planned downtime notifications.',
    subject: 'NexCV maintenance notice',
    body: `Hi {{name}},

NexCV will be under maintenance during this window:

{{maintenanceWindow}}

Expected impact:
{{impact}}

If you need help before then, contact us at {{supportEmail}}.

Thanks,
The NexCV Team
`,
    variables: ['name', 'maintenanceWindow', 'impact', 'supportEmail'],
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

export function mergeEmailTemplates(value: unknown): EmailTemplateMap {
  const source = isRecord(value) ? value : {};
  return (Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateKey[]).reduce((templates, key) => {
    const saved = isRecord(source[key]) ? source[key] : {};
    templates[key] = {
      ...DEFAULT_EMAIL_TEMPLATES[key],
      subject: typeof saved.subject === 'string' ? saved.subject : DEFAULT_EMAIL_TEMPLATES[key].subject,
      body: typeof saved.body === 'string' ? saved.body : DEFAULT_EMAIL_TEMPLATES[key].body,
    };
    return templates;
  }, {} as EmailTemplateMap);
}

export function renderEmailTemplate(template: Pick<EmailTemplate, 'subject' | 'body'>, variables: Record<string, unknown>) {
  const render = (text: string) => text.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key];
    return value === undefined || value === null ? '' : String(value);
  });

  return {
    subject: render(template.subject),
    text: render(template.body),
  };
}
