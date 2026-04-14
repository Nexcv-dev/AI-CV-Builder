import puppeteer from 'puppeteer';

const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: sans-serif; background: white; color: #111827; margin: 0; }
  </style>
</head>
<body>
  <div style="padding:0 20mm;display:block;">
    <header style="margin-bottom:32px;text-align:center;">
      <h1 style="font-size:2.25rem;font-weight:700;text-transform:uppercase;margin-bottom:12px;">JANE DOE</h1>
      <div style="font-size:0.875rem;text-align:center;">jane.doe@example.com</div>
    </header>
    <section style="margin-bottom:2rem;break-inside:avoid">
      <h2 style="font-size:1.125rem;font-weight:700;text-transform:uppercase;border-bottom:2px solid;padding-bottom:4px;margin-bottom:16px;">Personal Info</h2>
      <div style="display:grid;grid-template-columns:1fr 1fr;column-gap:48px;row-gap:8px;font-size:0.875rem">
        <div>Date of Birth: 01/01/1990</div>
      </div>
    </section>
  </div>
</body>
</html>`;

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();
  await page.setContent(html, { waitUntil: 'networkidle0' });
  await page.pdf({
    path: 'test-classic.pdf',
    format: 'A4',
    printBackground: true,
    margin: { top: '20mm', right: '0', bottom: '20mm', left: '0' }
  });
  await browser.close();
  console.log("Written test-classic.pdf");
})();
