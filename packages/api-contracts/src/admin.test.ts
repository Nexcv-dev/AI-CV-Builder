import { describe, expect, it } from 'vitest';
import type { AdminSettingsSummary, AdminTemplateItem } from './admin';

describe('admin contracts', () => {
  it('allows core admin response shapes', () => {
    const template = {
      key: 'modern',
      label: 'Modern',
      category: 'Modern',
      access: 'free',
      thumbnail: '/templates/modern.png',
      builtInThumbnail: '/templates/modern.png',
      surfaceColorRole: 'none',
      defaultThemeColor: '#000000',
      source: 'built_in',
      status: 'active',
      usageCount: 0,
    } satisfies AdminTemplateItem;

    const settings = {
      app: {
        maintenanceMode: false,
        announcementEnabled: false,
        announcementText: '',
        supportEmail: 'support@nexcv.com',
        emailVerificationRequired: true,
        payhereEnabled: true,
        payhereModeLabel: 'sandbox',
        freeCvCreationLimit: 1,
        freePdfDownloadLimit: 1,
        defaultTemplateKey: template.key,
        cmsContent: {
          announcement: { enabled: false, text: '', linkLabel: '', linkHref: '' },
          landing: {
            heroEyebrow: '',
            heroTitle: '',
            heroAccent: '',
            heroDescription: '',
            primaryCta: '',
            secondaryCta: '',
            statsEyebrow: '',
            statsTitle: '',
            featuresEyebrow: '',
            featuresTitle: '',
            featuresBadge: '',
            templatesEyebrow: '',
            templatesTitle: '',
            templatesDescription: '',
            pricingEyebrow: '',
            pricingTitle: '',
            faqEyebrow: '',
            faqTitle: '',
            faqDescription: '',
            testimonialsEyebrow: '',
            testimonialsTitle: '',
          },
          featureTiles: [],
          pricingPlans: [],
          faqs: [],
          legal: {
            privacy: { title: '', lastUpdated: '', sections: [] },
            terms: { title: '', lastUpdated: '', sections: [] },
            refund: { title: '', lastUpdated: '', sections: [] },
          },
        },
        emailTemplates: {
          verification: { key: 'verification', label: '', description: '', subject: '', body: '', variables: [] },
          passwordReset: { key: 'passwordReset', label: '', description: '', subject: '', body: '', variables: [] },
          supportReply: { key: 'supportReply', label: '', description: '', subject: '', body: '', variables: [] },
          paymentReceipt: { key: 'paymentReceipt', label: '', description: '', subject: '', body: '', variables: [] },
          maintenanceNotice: { key: 'maintenanceNotice', label: '', description: '', subject: '', body: '', variables: [] },
        },
      },
      environment: 'test',
      port: '0',
      origins: { frontend: 'http://localhost:3000', api: 'http://localhost:3001' },
      services: [],
      security: {
        sessionSecretConfigured: true,
        superAdminAllowlistCount: 1,
        adminIpAllowlistConfigured: false,
        payhereCheckoutUrl: '',
        payhereNotifyUrlConfigured: false,
        pdfLambdaConfigured: false,
      },
      email: {
        configured: false,
        provider: 'none',
        from: '',
        supportEmail: '',
        adminNotificationEmail: '',
        smtpHost: '',
        smtpPort: '',
        checks: [],
        secrets: {},
      },
    } satisfies AdminSettingsSummary;

    expect(settings.app.defaultTemplateKey).toBe('modern');
  });
});
