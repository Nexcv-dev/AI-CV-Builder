export type PlanKey = 'free' | 'payg' | 'monthly';

export interface CmsPlanCopy {
  key: PlanKey;
  name: string;
  price: string;
  duration: string;
  description: string;
  cta: string;
  badge: string;
  features: string[];
}

export interface CmsFaqItem {
  question: string;
  answer: string;
}

export interface CmsLegalSection {
  heading: string;
  body: string;
  bullets?: string[];
}

export interface CmsLegalPage {
  title: string;
  lastUpdated: string;
  sections: CmsLegalSection[];
}

export interface CmsContent {
  announcement: {
    enabled: boolean;
    text: string;
    linkLabel: string;
    linkHref: string;
  };
  landing: {
    heroEyebrow: string;
    heroTitle: string;
    heroAccent: string;
    heroDescription: string;
    primaryCta: string;
    secondaryCta: string;
    statsEyebrow: string;
    statsTitle: string;
    featuresEyebrow: string;
    featuresTitle: string;
    featuresBadge: string;
    templatesEyebrow: string;
    templatesTitle: string;
    templatesDescription: string;
    pricingEyebrow: string;
    pricingTitle: string;
    faqEyebrow: string;
    faqTitle: string;
    faqDescription: string;
    testimonialsEyebrow: string;
    testimonialsTitle: string;
  };
  featureTiles: Array<{
    title: string;
    text: string;
  }>;
  pricingPlans: CmsPlanCopy[];
  faqs: CmsFaqItem[];
  legal: {
    privacy: CmsLegalPage;
    terms: CmsLegalPage;
    refund: CmsLegalPage;
  };
}

export const DEFAULT_CMS_CONTENT: CmsContent = {
  announcement: {
    enabled: false,
    text: 'New templates and AI polish tools are live.',
    linkLabel: 'Try them',
    linkHref: '/templates',
  },
  landing: {
    heroEyebrow: 'Free AI resume builder',
    heroTitle: 'AI CV Builder',
    heroAccent: 'that pops',
    heroDescription: 'Create a polished CV in minutes with guided sections, beautiful templates, AI writing help, and clean PDF exports.',
    primaryCta: 'Get Started',
    secondaryCta: 'Browse Templates',
    statsEyebrow: 'By the Numbers',
    statsTitle: 'Trusted by resume builders',
    featuresEyebrow: 'Features',
    featuresTitle: 'Less typing. More finished resume.',
    featuresBadge: 'Smart tools, clean controls, fast export',
    templatesEyebrow: 'Templates',
    templatesTitle: 'Choose your CV template',
    templatesDescription: 'Pick a polished layout, customize it live, and download a clean PDF.',
    pricingEyebrow: 'Pricing',
    pricingTitle: 'Start free. Upgrade only when you need more.',
    faqEyebrow: 'FAQ',
    faqTitle: 'Questions before you start?',
    faqDescription: 'Quick answers about creating, styling, and exporting your CV with NexCV.',
    testimonialsEyebrow: 'Testimonials',
    testimonialsTitle: 'Loved by resume builders',
  },
  featureTiles: [
    { title: 'AI polish', text: 'Improve rough content fast.' },
    { title: 'Design control', text: 'Tune colors, fonts, and layout.' },
    { title: 'Live preview', text: 'See edits as you build.' },
    { title: 'PDF export', text: 'Download a clean final resume.' },
  ],
  pricingPlans: [
    {
      key: 'free',
      name: 'Free',
      price: 'LKR 0',
      duration: 'Starter',
      description: 'Build your first CV and export once with a watermark.',
      cta: 'Start free',
      badge: '',
      features: ['1 saved CV', 'Classic template', '1 watermarked PDF download', 'Manual editing tools'],
    },
    {
      key: 'payg',
      name: 'Pay As You Go',
      price: 'LKR 499',
      duration: '7 days (One-time payment)',
      description: 'One CV with any template, AI tools, unlimited edits and downloads.',
      cta: 'Choose PAYG',
      badge: 'Popular',
      features: ['1 extra saved CV per purchase', 'Any template', 'Unlimited edits for 7 days', 'Unlimited downloads for 7 days', 'Faster warm PDF downloads', 'AI import, summary, and refine tools'],
    },
    {
      key: 'monthly',
      name: 'Monthly',
      price: 'LKR 2199',
      duration: '30 days (One-time payment)',
      description: 'Unlimited CV creation, saves, downloads, and AI features.',
      cta: 'Go monthly',
      badge: '',
      features: ['Unlimited CV creation', 'Unlimited saved CVs', 'Any template', 'Unlimited downloads for 30 days', 'Faster warm PDF downloads', 'AI import, summary, and refine tools'],
    },
  ],
  faqs: [
    { question: 'Is NexCV free to use?', answer: 'Yes. You can build, preview, and download your CV without paying.' },
    { question: 'Can AI help improve my CV content?', answer: 'Yes. The builder can polish rough notes into clearer resume wording while you stay in control of every section.' },
    { question: 'Can I change templates after adding details?', answer: 'Yes. Your information stays in the builder, so you can switch between available templates and adjust the design.' },
    { question: 'Does the final CV download as a PDF?', answer: 'Yes. Once your CV is ready, you can export a clean PDF for job applications.' },
    { question: 'Do I need design experience?', answer: 'No. NexCV gives you ready-made templates, live preview, and simple controls for colors, fonts, and layout.' },
  ],
  legal: {
    privacy: {
      title: 'Privacy Policy',
      lastUpdated: '',
      sections: [
        { heading: 'Information We Collect', body: 'We store account, CV, billing, and support information only as needed to provide the NexCV service. CV content you save is connected to your account so you can return to it later.' },
        { heading: 'Use of Information', body: 'We use your information to run the builder, generate previews and PDFs, provide AI-assisted editing, process payments, prevent abuse, and respond to support requests.' },
        { heading: 'Third-party Services', body: 'NexCV may use trusted providers for authentication, AI assistance, email delivery, payment processing, storage, analytics, and hosting. Information is shared only where needed to provide those services.' },
        { heading: 'Changes to This Policy', body: 'We may update this policy as the product changes. The latest version is always published on this page.' },
        { heading: 'Contact Us', body: 'If you have any questions about this Privacy Policy, please contact our support team.' },
      ],
    },
    terms: {
      title: 'Terms and Conditions',
      lastUpdated: '',
      sections: [
        { heading: 'Agreement to Terms', body: 'By using NexCV, you agree to these Terms and Conditions. If you do not agree, please do not use the application.' },
        { heading: 'License to Use', body: 'We grant you a personal, non-exclusive, non-transferable license to use NexCV to create CVs and resumes. The generated documents are yours to use for job applications and personal career activity.' },
        { heading: 'AI Processing', body: 'When you use AI features, the text you submit may be processed by external AI providers. Do not enter sensitive, classified, or proprietary information into AI tools.' },
        { heading: 'Limitation of Liability', body: 'NexCV is provided as a career document tool. We do not guarantee job interviews, employment outcomes, or acceptance of any generated CV.' },
      ],
    },
    refund: {
      title: 'Refund & Cancellation Policy',
      lastUpdated: '',
      sections: [
        {
          heading: 'Refund Eligibility',
          body: 'Since NexCV provides immediate digital access and AI-assisted tools, refunds are considered only in specific circumstances.',
          bullets: ['Technical failures that prevent you from downloading your CV after a successful payment.', 'Duplicate charges for the same transaction.', 'Requests made within 24 hours of purchase if no AI features or downloads were used.'],
        },
        { heading: 'Cancellation', body: 'You can let time-limited paid access expire naturally. Access continues until the end of the active period shown on your account.' },
        { heading: 'How to Request a Refund', body: 'Contact our support team with your transaction ID and the reason for your request. We aim to review requests within 3-5 business days.' },
        { heading: 'Sri Lankan Consumer Law', body: 'This policy is governed by the laws of Sri Lanka. Your statutory rights as a consumer are not affected by this policy.' },
      ],
    },
  },
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function mergeObject<T extends object>(defaults: T, value: unknown): T {
  return isRecord(value) ? { ...defaults, ...value } : defaults;
}

export function mergeCmsContent(value: unknown): CmsContent {
  const source = isRecord(value) ? value : {};
  const landing = mergeObject(DEFAULT_CMS_CONTENT.landing, source.landing);
  const announcement = mergeObject(DEFAULT_CMS_CONTENT.announcement, source.announcement);
  const featureTiles = Array.isArray(source.featureTiles) && source.featureTiles.length
    ? source.featureTiles.map((item, index) => mergeObject(DEFAULT_CMS_CONTENT.featureTiles[index] || DEFAULT_CMS_CONTENT.featureTiles[0], item))
    : DEFAULT_CMS_CONTENT.featureTiles;
  const pricingPlans = DEFAULT_CMS_CONTENT.pricingPlans.map((plan) => {
    const saved = Array.isArray(source.pricingPlans)
      ? source.pricingPlans.find((item) => isRecord(item) && item.key === plan.key)
      : undefined;
    return mergeObject(plan, saved);
  });
  const faqs = Array.isArray(source.faqs) && source.faqs.length
    ? source.faqs.map((item) => mergeObject(DEFAULT_CMS_CONTENT.faqs[0], item))
    : DEFAULT_CMS_CONTENT.faqs;
  const legalSource = isRecord(source.legal) ? source.legal : {};
  return {
    announcement,
    landing,
    featureTiles,
    pricingPlans,
    faqs,
    legal: {
      privacy: mergeLegalPage(DEFAULT_CMS_CONTENT.legal.privacy, legalSource.privacy),
      terms: mergeLegalPage(DEFAULT_CMS_CONTENT.legal.terms, legalSource.terms),
      refund: mergeLegalPage(DEFAULT_CMS_CONTENT.legal.refund, legalSource.refund),
    },
  };
}

function mergeLegalPage(defaultPage: CmsLegalPage, value: unknown): CmsLegalPage {
  const page = mergeObject(defaultPage, value);
  const sections = isRecord(value) && Array.isArray(value.sections) && value.sections.length
    ? value.sections.map((section, index) => mergeObject(defaultPage.sections[index] || defaultPage.sections[0], section))
    : defaultPage.sections;
  return { ...page, sections };
}
