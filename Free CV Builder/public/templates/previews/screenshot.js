/**
 * NexCV Template Thumbnail Generator
 * 
 * Generates WebP thumbnail images from template preview HTML files.
 * 
 * Usage:
 *   node screenshot.js
 * 
 * Requirements:
 *   npm install puppeteer
 *   (or use puppeteer-core if Chrome is already installed)
 * 
 * Output:
 *   Creates .webp files in the same directory for each template.
 *   These can be copied to /public/templates/ for production use.
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const TEMPLATES = ['classic', 'modern', 'professional', 'timeline', 'minimalist', 'startup'];
const VIEWPORT = { width: 794, height: 1123 }; // A4 at 96 DPI
const OUTPUT_DIR = path.join(__dirname);
const PREVIEW_DIR = path.join(__dirname);

async function generateThumbnails() {
  console.log('🚀 Starting NexCV Thumbnail Generator...\n');
  
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  for (const template of TEMPLATES) {
    const htmlPath = path.join(PREVIEW_DIR, `${template}.html`);
    
    if (!fs.existsSync(htmlPath)) {
      console.log(`⚠️  Skipping ${template} - HTML file not found`);
      continue;
    }

    console.log(`📄 Processing: ${template}...`);
    
    const page = await browser.newPage();
    await page.setViewport(VIEWPORT);
    
    // Load the HTML file
    const fileUrl = `file://${htmlPath.replace(/\\/g, '/')}`;
    await page.goto(fileUrl, { waitUntil: 'networkidle0', timeout: 30000 });
    
    // Wait for fonts to load
    await page.evaluate(() => document.fonts.ready);
    await new Promise(r => setTimeout(r, 1000)); // Extra wait for rendering
    
    // Find the CV page element
    const pageElement = await page.$('.page');
    
    if (pageElement) {
      // Screenshot just the CV element
      const pngPath = path.join(OUTPUT_DIR, `${template}.png`);
      await pageElement.screenshot({
        path: pngPath,
        type: 'png',
        omitBackground: true,
      });
      console.log(`   ✅ PNG saved: ${template}.png`);
      
      // Also save as WebP
      const webpPath = path.join(OUTPUT_DIR, `${template}.webp`);
      await pageElement.screenshot({
        path: webpPath,
        type: 'webp',
        quality: 85,
        omitBackground: true,
      });
      console.log(`   ✅ WebP saved: ${template}.webp`);
    } else {
      // Fallback: screenshot the full page
      const pngPath = path.join(OUTPUT_DIR, `${template}.png`);
      await page.screenshot({
        path: pngPath,
        type: 'png',
        fullPage: false,
      });
      console.log(`   ✅ PNG saved (full page fallback): ${template}.png`);
    }
    
    await page.close();
  }

  await browser.close();
  
  console.log('\n🎉 All thumbnails generated successfully!');
  console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  console.log('\nNext steps:');
  console.log('  1. Review the generated images');
  console.log('  2. Copy .webp files to /public/templates/');
  console.log('  3. Update templates.ts to use .webp for all templates');
}

generateThumbnails().catch(err => {
  console.error('❌ Error:', err);
  process.exit(1);
});
