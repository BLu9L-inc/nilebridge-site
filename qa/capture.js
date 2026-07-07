// Reusable before/after capture script. Usage: node qa/capture.js <baseUrl> <outDir>
// Must be run unmodified against both the pre-edit and post-edit server so pairs are comparable.
const { chromium } = require('playwright');
const path = require('path');

const [,, baseUrl, outDir] = process.argv;
if (!baseUrl || !outDir) {
  console.error('Usage: node capture.js <baseUrl> <outDir>');
  process.exit(1);
}

async function advanceInstrument(page, mountSelector, countSelector, n) {
  await page.evaluate(({ mountSelector, n }) => {
    const wrap = document.querySelector(mountSelector);
    if (!wrap) return;
  }, { mountSelector, n });
}

(async () => {
  const browser = await chromium.launch();

  // ---- 1. Hero desktop / mobile ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2600); // let reveal/hero animation settle
    await page.screenshot({ path: path.join(outDir, '01-hero-desktop.png') });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(300);
    await page.screenshot({ path: path.join(outDir, '02-hero-mobile.png') });
    await page.close();
  }

  // ---- 2. Typography close-ups: hero h1, first chapter h2 ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(2000);
    const h1 = page.locator('.hero-h1').first();
    await h1.screenshot({ path: path.join(outDir, '03-type-hero-h1.png') });
    const ch1 = page.locator('.chapter[data-stage] .ch-h').first();
    await ch1.scrollIntoViewIfNeeded();
    await page.waitForTimeout(800);
    await ch1.screenshot({ path: path.join(outDir, '04-type-chapter-h2.png') });
    await page.close();
  }

  // ---- 3. Instrument progression: scroll to each chapter, capture pinned instrument ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1000);
    const chapters = page.locator('.chapter[data-stage]');
    const count = await chapters.count();
    const targets = [0, Math.floor(count / 2), count - 2, count - 1]; // early, mid, network chapter, trust chapter
    for (let idx = 0; idx < targets.length; idx++) {
      const i = targets[idx];
      await chapters.nth(i).scrollIntoViewIfNeeded();
      await page.waitForTimeout(1400);
      const stage = page.locator('.inst-stage').first();
      await stage.screenshot({ path: path.join(outDir, `05-instrument-${idx}.png`) });
    }
    await page.close();
  }

  // ---- 4. Background / starfield mid-page ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight * 0.35));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(outDir, '06-background-midpage.png') });
    await page.close();
  }

  // ---- 5. Reduced motion: hero + instrument ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '07-reduced-motion-hero.png') });
    const chapters = page.locator('.chapter[data-stage]');
    await chapters.last().scrollIntoViewIfNeeded();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '08-reduced-motion-instrument.png') });
    console.log('reduced-motion console/page errors:', errors.length ? JSON.stringify(errors) : 'NONE');
    await page.close();
  }

  // ---- 6. Full page desktop / tablet / mobile ----
  {
    const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
    await page.goto(baseUrl, { waitUntil: 'networkidle', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, '09-full-desktop.png'), fullPage: true });
    await page.setViewportSize({ width: 834, height: 1194 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, '10-full-tablet.png'), fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.waitForTimeout(400);
    await page.screenshot({ path: path.join(outDir, '11-full-mobile.png'), fullPage: true });
    await page.close();
  }

  console.log('DONE ->', outDir);
  await browser.close();
})();
