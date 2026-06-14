import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  browserClose,
  browserNewPage,
  pageClose,
  pageEvaluate,
  pagePdf,
  pageSetContent,
  pageSetRequestInterception,
  pageSetViewport,
  puppeteerLaunch,
} = vi.hoisted(() => ({
  browserClose: vi.fn(),
  browserNewPage: vi.fn(),
  pageClose: vi.fn(),
  pageEvaluate: vi.fn(),
  pagePdf: vi.fn(),
  pageSetContent: vi.fn(),
  pageSetRequestInterception: vi.fn(),
  pageSetViewport: vi.fn(),
  puppeteerLaunch: vi.fn(),
}));

vi.mock('puppeteer-core', () => ({
  default: {
    launch: puppeteerLaunch,
  },
}));

vi.mock('@sparticuz/chromium', () => ({
  default: {
    args: [],
    executablePath: vi.fn().mockResolvedValue('chromium'),
    headless: true,
  },
}));

vi.mock('../server-utils/logger', () => ({
  logError: vi.fn(),
  logEvent: vi.fn(),
}));

import { generateCVHTML, generatePdfDocument } from './pdfService';

describe('PDF profile image rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('PUPPETEER_EXECUTABLE_PATH', '/usr/bin/fake-chrome');

    const page = {
      close: pageClose.mockResolvedValue(undefined),
      evaluate: pageEvaluate.mockResolvedValue(undefined),
      on: vi.fn((event: string, handler: (request: unknown) => void) => {
        if (event === 'request') {
          pageSetContent.mockImplementationOnce(async () => {
            handler(profileImageRequest);
          });
        }
      }),
      pdf: pagePdf.mockResolvedValue(Buffer.from('%PDF-profile-image')),
      setContent: pageSetContent,
      setRequestInterception: pageSetRequestInterception.mockResolvedValue(undefined),
      setViewport: pageSetViewport.mockResolvedValue(undefined),
    };

    browserNewPage.mockResolvedValue(page);
    puppeteerLaunch.mockResolvedValue({
      close: browserClose.mockResolvedValue(undefined),
      newPage: browserNewPage,
    });
  });

  const profileImageUrl = 'https://api.nexcv.test/api/cv-assets/user-1/profile.webp';
  const profileImageRequest = {
    abort: vi.fn(),
    continue: vi.fn(),
    redirectChain: vi.fn(() => []),
    url: vi.fn(() => profileImageUrl),
  };

  it('loads the profile photo before producing the PDF buffer', async () => {
    const cvData = {
      personalInfo: {
        fullName: 'Profile Photo User',
        position: 'Engineer',
        email: 'profile@example.com',
      },
      profileImage: profileImageUrl,
      experience: [],
      education: [],
      skills: [],
      sectionOrder: ['personalDetails'],
    };
    const html = generateCVHTML(cvData, 'timeline');

    expect(html).toContain(`<img src="${profileImageUrl}"`);

    const result = await generatePdfDocument({
      cvData,
      template: 'timeline',
      watermark: false,
      html,
      templateSource: 'built-in',
      useWarmBrowser: false,
      useLambda: false,
    });

    expect(pageSetRequestInterception).toHaveBeenCalledWith(true);
    expect(profileImageRequest.continue).toHaveBeenCalledOnce();
    expect(profileImageRequest.abort).not.toHaveBeenCalled();
    expect(pageEvaluate).toHaveBeenCalledOnce();
    expect(pagePdf).toHaveBeenCalledWith(expect.objectContaining({
      format: 'A4',
      printBackground: true,
    }));
    expect(result).toEqual({
      buffer: Buffer.from('%PDF-profile-image'),
      renderer: 'local',
      templateSource: 'built-in',
    });
  });
});
