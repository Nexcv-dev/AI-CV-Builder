export type SeoRoute = {
  path: string;
  title: string;
  description: string;
  keywords: string[];
  image: string;
  structuredData?: Record<string, unknown> | Array<Record<string, unknown>>;
};

export const SITE_NAME = 'NexCV';
export const DEFAULT_SITE_URL = 'https://free-ai-cv-builder.onrender.com';
export const DEFAULT_OG_IMAGE = '/brand/logo.webp';

export const PUBLIC_SEO_ROUTES: SeoRoute[] = [
  {
    path: '/',
    title: 'NexCV | Free AI CV Builder & Resume Maker',
    description:
      'Create a professional, ATS-friendly CV with NexCV. Choose modern templates, write faster with AI assistance, and download a polished resume in minutes.',
    keywords: ['free CV builder', 'AI resume builder', 'ATS friendly resume builder', 'online CV maker'],
    image: DEFAULT_OG_IMAGE,
    structuredData: [
      {
        '@type': 'WebApplication',
        '@id': '#webapp',
        name: 'NexCV',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        description:
          'AI-assisted CV builder for creating professional, ATS-friendly resumes and downloadable CVs.',
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'USD',
        },
      },
      {
        '@type': 'FAQPage',
        '@id': '#faq',
        mainEntity: [
          buildFaq('Is NexCV a free CV builder?', 'Yes. You can start for free, build your CV with guided sections, preview it live, and export one watermarked PDF before upgrading.'),
          buildFaq('Can NexCV create an ATS-friendly resume?', 'NexCV helps you use clear sections, readable templates, and job-relevant wording so your resume is easier for recruiters and applicant tracking systems to understand.'),
          buildFaq('Can AI help write or improve my CV?', 'Yes. AI tools can turn rough notes into stronger resume wording, refine summaries, and improve bullet points while you stay in control of the final content.'),
          buildFaq('Can I change CV templates after entering my details?', 'Yes. Your details stay in the builder, so you can switch templates, compare styles, and adjust the design without rewriting your CV.'),
          buildFaq('Can I download my finished CV as a PDF?', 'Yes. Once your CV is ready, you can export a polished PDF for job applications, email attachments, and online submissions.'),
          buildFaq('Do I need resume design experience?', 'No. NexCV gives you ready-made templates, live preview, and simple controls for layout, colors, fonts, and sections.'),
        ],
      },
    ],
  },
  {
    path: '/templates',
    title: 'Professional CV Templates | NexCV',
    description:
      'Browse professional, modern, creative, and ATS-friendly CV templates for job applications, career changes, and polished resume downloads.',
    keywords: ['CV templates', 'resume templates', 'professional CV templates', 'ATS CV template'],
    image: '/templates/professional.webp',
    structuredData: {
      '@type': 'CollectionPage',
      '@id': '#templates',
      name: 'Professional CV Templates',
      mainEntity: {
        '@type': 'FAQPage',
        mainEntity: [
          buildFaq('Which CV template should I choose?', 'Choose a clean professional template for corporate, technical, finance, and operations roles. Use a creative template when the job values portfolio work, brand sense, or visual presentation.'),
          buildFaq('Are NexCV templates ATS-friendly?', 'NexCV templates are designed with readable sections, clear headings, and recruiter-friendly structure so your CV content stays easy to understand.'),
          buildFaq('Can I switch templates after entering my CV details?', 'Yes. You can add your details once, then switch templates and continue refining the design without rewriting your CV.'),
          buildFaq('Can I download my CV as a PDF?', 'Yes. After building your CV, NexCV can export it as a PDF for job applications, email attachments, and online submissions.'),
        ],
      },
    },
  },
  {
    path: '/pricing',
    title: 'NexCV Pricing | Free CV Builder & Premium Templates',
    description:
      'Start building CVs for free with NexCV, then upgrade when you need premium templates, downloads, and advanced resume-building features.',
    keywords: ['resume builder pricing', 'premium CV templates', 'CV builder plans'],
    image: DEFAULT_OG_IMAGE,
    structuredData: {
      '@type': 'OfferCatalog',
      '@id': '#pricing',
      name: 'NexCV CV Builder Plans',
      itemListElement: [
        { '@type': 'Offer', name: 'Free', price: '0', priceCurrency: 'LKR' },
        { '@type': 'Offer', name: 'Pay As You Go', price: '499', priceCurrency: 'LKR' },
        { '@type': 'Offer', name: 'Monthly', price: '2199', priceCurrency: 'LKR' },
      ],
    },
  },
  {
    path: '/tips',
    title: 'Resume Writing Tips & ATS CV Guide | NexCV',
    description:
      'Learn how to write a stronger CV, improve ATS compatibility, choose resume templates, and present your experience with confidence.',
    keywords: ['resume writing tips', 'ATS resume guide', 'how to write a CV', 'CV writing guide'],
    image: '/images/resume_tips_hero.webp',
    structuredData: {
      '@type': 'Article',
      '@id': '#resume-guide',
      headline: 'Resume Writing Tips and ATS CV Guide',
      description:
        'A practical guide to writing stronger, ATS-friendly resumes with better summaries, keywords, tailoring, and achievement-focused bullet points.',
      author: {
        '@type': 'Organization',
        name: SITE_NAME,
      },
    },
  },
  {
    path: '/about',
    title: 'About NexCV | AI CV Builder',
    description:
      'Learn about NexCV, an AI-assisted CV builder made to help job seekers create professional resumes quickly and confidently.',
    keywords: ['about NexCV', 'AI CV builder', 'online resume maker'],
    image: DEFAULT_OG_IMAGE,
  },
  {
    path: '/contact',
    title: 'Contact NexCV Support',
    description:
      'Contact the NexCV team for help with CV building, templates, billing, downloads, or account support.',
    keywords: ['contact NexCV', 'CV builder support', 'resume builder help'],
    image: DEFAULT_OG_IMAGE,
  },
  {
    path: '/privacy-policy',
    title: 'Privacy Policy | NexCV',
    description:
      'Read the NexCV privacy policy to understand how account, CV, billing, and usage information is handled.',
    keywords: ['NexCV privacy policy', 'CV builder privacy'],
    image: DEFAULT_OG_IMAGE,
  },
  {
    path: '/terms',
    title: 'Terms and Conditions | NexCV',
    description:
      'Read the NexCV terms and conditions for using the online CV builder, templates, downloads, and account features.',
    keywords: ['NexCV terms', 'CV builder terms'],
    image: DEFAULT_OG_IMAGE,
  },
  {
    path: '/refund-policy',
    title: 'Refund Policy | NexCV',
    description:
      'Review the NexCV refund policy for premium plans, template purchases, downloads, and billing support.',
    keywords: ['NexCV refund policy', 'CV builder refund'],
    image: DEFAULT_OG_IMAGE,
  },
];

export const PRIVATE_SEO_PATHS = [
  '/admin',
  '/builder',
  '/checkout',
  '/dashboard',
  '/forgot-password',
  '/my-cvs',
  '/print',
  '/profile',
  '/reset-password',
  '/settings',
  '/verify-email',
];

export function normalizeSiteUrl(siteUrl = DEFAULT_SITE_URL) {
  return siteUrl.replace(/\/+$/, '') || DEFAULT_SITE_URL;
}

export function getSeoRoute(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  return PUBLIC_SEO_ROUTES.find((route) => route.path === normalizedPath) || PUBLIC_SEO_ROUTES[0];
}

export function isPublicSeoPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  return PUBLIC_SEO_ROUTES.some((route) => route.path === normalizedPath);
}

export function shouldNoIndexPath(pathname: string) {
  const normalizedPath = normalizePathname(pathname);
  return PRIVATE_SEO_PATHS.some((path) => normalizedPath === path || normalizedPath.startsWith(`${path}/`));
}

export function buildCanonicalUrl(pathname: string, siteUrl = DEFAULT_SITE_URL) {
  const normalizedPath = normalizePathname(pathname);
  return `${normalizeSiteUrl(siteUrl)}${normalizedPath === '/' ? '' : normalizedPath}`;
}

export function buildAssetUrl(assetPath: string, siteUrl = DEFAULT_SITE_URL) {
  if (/^https?:\/\//i.test(assetPath)) return assetPath;
  return `${normalizeSiteUrl(siteUrl)}${assetPath.startsWith('/') ? assetPath : `/${assetPath}`}`;
}

export function buildJsonLd(route: SeoRoute, siteUrl = DEFAULT_SITE_URL) {
  const canonicalUrl = buildCanonicalUrl(route.path, siteUrl);
  const organization = {
    '@type': 'Organization',
    '@id': `${normalizeSiteUrl(siteUrl)}#organization`,
    name: SITE_NAME,
    url: normalizeSiteUrl(siteUrl),
    logo: buildAssetUrl(DEFAULT_OG_IMAGE, siteUrl),
  };
  const website = {
    '@type': 'WebSite',
    '@id': `${normalizeSiteUrl(siteUrl)}#website`,
    name: SITE_NAME,
    url: normalizeSiteUrl(siteUrl),
    publisher: { '@id': organization['@id'] },
  };
  const webPage = {
    '@type': 'WebPage',
    '@id': `${canonicalUrl}#webpage`,
    name: route.title,
    description: route.description,
    url: canonicalUrl,
    isPartOf: { '@id': website['@id'] },
    about: { '@id': organization['@id'] },
    breadcrumb: { '@id': `${canonicalUrl}#breadcrumb` },
  };
  const breadcrumb = {
    '@type': 'BreadcrumbList',
    '@id': `${canonicalUrl}#breadcrumb`,
    itemListElement: buildBreadcrumbItems(route, siteUrl),
  };
  const routeData = Array.isArray(route.structuredData)
    ? route.structuredData
    : route.structuredData
      ? [route.structuredData]
      : [];

  return {
    '@context': 'https://schema.org',
    '@graph': [
      organization,
      website,
      webPage,
      breadcrumb,
      ...routeData.map((entry) => ({
        ...entry,
        url: canonicalUrl,
        publisher: { '@id': organization['@id'] },
        isPartOf: { '@id': webPage['@id'] },
      })),
    ],
  };
}

function buildFaq(question: string, answer: string) {
  return {
    '@type': 'Question',
    name: question,
    acceptedAnswer: {
      '@type': 'Answer',
      text: answer,
    },
  };
}

function buildBreadcrumbItems(route: SeoRoute, siteUrl: string) {
  const home = {
    '@type': 'ListItem',
    position: 1,
    name: 'Home',
    item: normalizeSiteUrl(siteUrl),
  };
  if (route.path === '/') return [home];

  return [
    home,
    {
      '@type': 'ListItem',
      position: 2,
      name: route.title.split('|')[0].trim(),
      item: buildCanonicalUrl(route.path, siteUrl),
    },
  ];
}

function normalizePathname(pathname: string) {
  const pathOnly = pathname.split(/[?#]/)[0] || '/';
  const withLeadingSlash = pathOnly.startsWith('/') ? pathOnly : `/${pathOnly}`;
  if (withLeadingSlash.length > 1 && withLeadingSlash.endsWith('/')) {
    return withLeadingSlash.slice(0, -1);
  }
  return withLeadingSlash;
}
