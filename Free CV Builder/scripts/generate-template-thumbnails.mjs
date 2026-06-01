import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import puppeteer from 'puppeteer-core';
import { renderCvTemplateString } from '../services/s3Service.ts';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoRoot = path.resolve(projectRoot, '..');
const builtInPreviewRoot = path.join(projectRoot, 'public', 'templates', 'previews');
const builtInOutputRoot = path.join(projectRoot, 'public', 'templates');
const adminTemplatesRoot = path.join(repoRoot, 'Admin Templates');

const builtInTemplates = ['classic', 'modern', 'professional', 'timeline', 'minimalist', 'startup'];
const viewport = { width: 794, height: 1123, deviceScaleFactor: 1 };
const templateArgIndex = process.argv.indexOf('--template');
const selectedTemplate = templateArgIndex >= 0 ? process.argv[templateArgIndex + 1]?.trim() : '';

if (templateArgIndex >= 0 && !selectedTemplate) {
  throw new Error('Pass a template key or admin folder name after --template, for example: --template modular-card');
}

const chromeCandidates = [
  process.env.CHROME_PATH,
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
].filter(Boolean);

const sampleCvData = {
  template: 'professional',
  fontFamily: 'Inter',
  themeColor: '#000000',
  sidebarColor: '#1e293b',
  lineSpacing: 1.35,
  sectionGap: 1.5,
  imageZoom: 1,
  imageX: 0,
  imageY: 0,
  personalInfo: {
    fullName: 'Alex Morgan',
    email: 'alex.morgan@example.com',
    phone: '+1 555 0148',
    address: 'San Francisco, CA',
    summary: 'Product-minded operations leader with 8+ years of experience improving customer workflows, launching cross-functional programs, and turning complex requirements into measurable delivery plans.',
    dob: '14 May 1992',
    nationality: 'American',
    maritalStatus: 'Single',
  },
  experience: [
    {
      position: 'Senior Product Operations Manager',
      company: 'Northstar Labs',
      startDate: '2021',
      endDate: 'Present',
      description: '<ul><li>Led a 12-person rollout team for a customer analytics platform used by 45 enterprise accounts.</li><li>Reduced onboarding cycle time by 32% through clearer playbooks, stakeholder dashboards, and QA checkpoints.</li></ul>',
    },
    {
      position: 'Business Analyst',
      company: 'BrightPath Systems',
      startDate: '2018',
      endDate: '2021',
      description: '<ul><li>Mapped operational processes, wrote product requirements, and partnered with engineering on workflow automation.</li></ul>',
    },
  ],
  education: [
    {
      degree: 'BSc Business Information Systems',
      institution: 'University of California',
      startDate: '2014',
      endDate: '2018',
      description: 'Focused on analytics, systems design, and organizational strategy.',
    },
  ],
  skills: [
    { name: 'Program Management', level: 5, category: 'Leadership' },
    { name: 'Process Design', level: 5, category: 'Operations' },
    { name: 'SQL & Dashboards', level: 4, category: 'Analytics' },
    { name: 'Stakeholder Communication', level: 5, category: 'Leadership' },
  ],
  projects: [
    {
      name: 'Customer Health Dashboard',
      description: 'Created an executive reporting workflow combining adoption, support, and renewal signals.',
      link: 'https://example.com',
    },
  ],
  courses: [
    { name: 'Agile Product Management', institution: 'Product School', startDate: '2023', endDate: '' },
  ],
  awards: [
    { name: 'Operational Excellence Award', issuer: 'Northstar Labs', date: '2024' },
  ],
  languages: [
    { name: 'English', proficiency: 'Native' },
    { name: 'Spanish', proficiency: 'Professional' },
  ],
  references: [
    {
      name: 'Jordan Blake',
      position: 'Director of Product',
      company: 'Northstar Labs',
      email: 'jordan@example.com',
      phone: '+1 555 0199',
    },
  ],
};

const fileExists = async (filePath) => {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
};

const findChrome = async () => {
  for (const candidate of chromeCandidates) {
    if (await fileExists(candidate)) return candidate;
  }
  throw new Error('Chrome or Edge executable was not found. Set CHROME_PATH to generate thumbnails.');
};

const injectStyle = (html, css) => (
  html.includes('</head>')
    ? html.replace('</head>', `<style>\n${css}\n</style>\n</head>`)
    : `<style>\n${css}\n</style>\n${html}`
);

const waitForRender = async (page) => {
  await page.evaluate(() => document.fonts?.ready);
  await new Promise((resolve) => setTimeout(resolve, 250));
};

const screenshotElementAsA4 = async (page, element, outputPath) => {
  const box = await element.boundingBox();
  if (!box) throw new Error(`Could not measure rendered template for ${outputPath}`);
  await page.evaluate((selector) => {
    document.querySelectorAll(selector).forEach((element) => {
      if (element instanceof HTMLElement) {
        element.style.minHeight = '1123px';
      }
    });
  }, '.page, .cv, .resume, .a4');
  await page.screenshot({
    path: outputPath,
    type: 'webp',
    quality: 88,
    clip: {
      x: Math.max(0, box.x),
      y: Math.max(0, box.y),
      width: Math.min(Math.ceil(box.width), viewport.width),
      height: viewport.height,
    },
    omitBackground: false,
  });
};

const capturePage = async (browser, url, outputPath) => {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: 'networkidle0', timeout: 30_000 });
  await waitForRender(page);

  const pageElement = await page.$('.page, .cv, .resume, .a4');
  if (!pageElement) {
    throw new Error(`Could not find .page while rendering ${url}`);
  }

  await screenshotElementAsA4(page, pageElement, outputPath);
  await page.close();
};

const captureHtml = async (browser, html, outputPath) => {
  const page = await browser.newPage();
  await page.setViewport(viewport);
  await page.setContent(html, { waitUntil: 'networkidle0', timeout: 30_000 });
  await waitForRender(page);

  const pageElement = await page.$('.page, .cv, .resume, .a4');
  if (!pageElement) {
    throw new Error(`Could not find .page while rendering ${outputPath}`);
  }

  await screenshotElementAsA4(page, pageElement, outputPath);
  await page.close();
};

const renderBuiltInThumbnails = async (browser) => {
  const templates = selectedTemplate
    ? builtInTemplates.filter((template) => template === selectedTemplate)
    : builtInTemplates;

  for (const template of templates) {
    const previewPath = path.join(builtInPreviewRoot, `${template}.html`);
    if (!(await fileExists(previewPath))) {
      console.warn(`skip built-in ${template}: preview HTML not found`);
      continue;
    }

    const outputPath = path.join(builtInOutputRoot, `${template}.webp`);
    await capturePage(browser, pathToFileURL(previewPath).href, outputPath);
    console.log(`generated public/templates/${template}.webp`);
  }
};

const renderAdminThumbnails = async (browser) => {
  const entries = (await fs.readdir(adminTemplatesRoot, { withFileTypes: true }))
    .filter((entry) => entry.isDirectory())
    .filter((entry) => !selectedTemplate || entry.name === selectedTemplate)
    .sort((a, b) => a.name.localeCompare(b.name));

  for (const entry of entries) {
    const templateDir = path.join(adminTemplatesRoot, entry.name);
    const indexPath = path.join(templateDir, 'index.html');
    const stylePath = path.join(templateDir, 'style.css');
    if (!(await fileExists(indexPath)) || !(await fileExists(stylePath))) {
      console.warn(`skip admin ${entry.name}: index.html or style.css not found`);
      continue;
    }

    const [indexHtml, styleCss] = await Promise.all([
      fs.readFile(indexPath, 'utf8'),
      fs.readFile(stylePath, 'utf8'),
    ]);
    const rendered = renderCvTemplateString(injectStyle(indexHtml, styleCss), {
      ...sampleCvData,
      template: entry.name,
    });

    const outputPath = path.join(templateDir, 'thumbnail.webp');
    await captureHtml(browser, rendered, outputPath);
    console.log(`generated Admin Templates/${entry.name}/thumbnail.webp`);
  }
};

const chromePath = await findChrome();
const browser = await puppeteer.launch({
  executablePath: chromePath,
  headless: 'new',
  args: ['--no-sandbox', '--disable-setuid-sandbox'],
});

try {
  await renderBuiltInThumbnails(browser);
  await renderAdminThumbnails(browser);
  if (selectedTemplate && !builtInTemplates.includes(selectedTemplate)) {
    const adminPath = path.join(adminTemplatesRoot, selectedTemplate);
    if (!(await fileExists(adminPath))) {
      throw new Error(`Template "${selectedTemplate}" was not found in built-in templates or Admin Templates.`);
    }
  }
} finally {
  await browser.close();
}
