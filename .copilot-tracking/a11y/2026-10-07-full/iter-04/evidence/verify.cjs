const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.join(process.cwd(), 'playwright-tests', 'node_modules', 'playwright'));
const out = __dirname;
const save = (name, value) => fs.writeFileSync(path.join(out, name), JSON.stringify(value, null, 2));
const rgb = text => text.match(/[\d.]+/g).slice(0, 3).map(Number);
const luminance = channels => channels.map(x => x / 255).map(x => x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4).reduce((v, x, i) => v + x * [0.2126, 0.7152, 0.0722][i], 0);
const contrast = (a, b) => {
  const [hi, lo] = [luminance(rgb(a)), luminance(rgb(b))].sort((a, b) => b - a);
  return (hi + 0.05) / (lo + 0.05);
};
async function getForm(page) {
  return page.evaluate(() => ({
    title: document.title, focus: document.activeElement.id,
    summary: !!document.getElementById('error-summary'),
    live: [...document.querySelectorAll('[aria-live],[role=alert],[role=status]')].map(el => el.outerHTML),
    invalid: [...document.querySelectorAll('[aria-invalid=true]')].map(el => el.id),
    errors: [...document.querySelectorAll('.field-validation-error')].map(el => el.textContent.trim()),
    validator: { lastActive: window.jQuery('#new-request-form').data('validator')?.lastActive?.id,
      focusInvalid: window.jQuery('#new-request-form').data('validator')?.settings.focusInvalid }
  }));
}
(async () => {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
    const page = await context.newPage();
    await page.goto('http://localhost:5158', { waitUntil: 'networkidle' });
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    await page.screenshot({ path: path.join(out, 'focus-header-logo.png') });
    const headerFocus = await page.locator(':focus').evaluate(el => ({
      outline: getComputedStyle(el).outline, color: getComputedStyle(el).color, html: el.outerHTML
    }));
    await page.locator('footer a').first().focus();
    await page.screenshot({ path: path.join(out, 'focus-footer.png') });
    const footerFocus = await page.locator(':focus').evaluate(el => ({
      outline: getComputedStyle(el).outline, color: getComputedStyle(el).color
    }));
    const hero = await page.locator('.ontario-hero').evaluate(el => ({
      background: getComputedStyle(el).backgroundImage,
      children: [...el.querySelectorAll('.ontario-eyebrow,h1,.ontario-lead')].map(el => ({
        text: el.textContent.trim(), color: getComputedStyle(el).color
      }))
    }));
    hero.ratios = hero.children.map(c => ({
      text: c.text, minimum: Math.min(contrast(c.color, 'rgb(255,244,196)'), contrast(c.color, 'rgb(255,255,255)'))
    }));
    save('manual-contrast.json', { headerFocus, footerFocus, hero,
      textarea: { foreground: '#1a1a1a', backgrounds: ['#ffffff', '#f9e3e3'], ratios: [contrast('rgb(26,26,26)', 'rgb(255,255,255)'), contrast('rgb(26,26,26)', 'rgb(249,227,227)')] },
      note: 'Gradient endpoints bound each color channel; dark foreground is worst against the darker endpoint. Textarea colours are opaque and authored; scrolling checks eliminate the obscured-viewport candidate.' });
    const samples = [];
    for (const mode of ['mouse', 'keyboard', 'direct-values']) {
      await page.goto('http://localhost:5158/Requests/New', { waitUntil: 'networkidle' });
      if (mode === 'direct-values') {
        await page.evaluate(() => {
          document.getElementById('Input_FullName').value = 'X';
          document.getElementById('Input_Email').value = 'invalid-email';
          document.getElementById('Input_Category').value = '0';
          document.getElementById('Input_Description').value = 'short';
        });
      } else {
        await page.locator('#Input_FullName').fill('X');
        await page.locator('#Input_Email').fill('invalid-email');
        await page.locator('#Input_Category').selectOption({ index: 1 });
        await page.locator('#Input_Description').fill('short');
      }
      if (mode === 'keyboard') {
        await page.locator('#submit-request').focus();
        await page.keyboard.press('Enter');
      } else {
        await page.locator('#submit-request').click();
      }
      await page.waitForTimeout(500);
      samples.push({ mode, ...await getForm(page) });
    }
    await page.goto('http://localhost:5158/Requests/New', { waitUntil: 'networkidle' });
    await page.locator('#submit-request').click();
    await page.waitForTimeout(200);
    samples.push({ mode: 'empty', ...await getForm(page) });
    await page.evaluate(() => window.jQuery('#new-request-form').validate().destroy());
    await Promise.all([page.waitForNavigation({ waitUntil: 'networkidle' }), page.locator('#submit-request').click()]);
    const cdp = await context.newCDPSession(page);
    const ax = await cdp.send('Accessibility.getFullAXTree');
    save('summary-accessibility-tree.json', ax.nodes.filter(n => n.name?.value === 'There is a problem' || n.properties?.some(p => p.name === 'focused' && p.value.value)));
    const summaryLinks = [];
    for (let i = 0; i < 4; i++) {
      const link = page.locator('#error-summary a').nth(i);
      await link.focus();
      await page.keyboard.press('Enter');
      summaryLinks.push({ index: i, target: await link.getAttribute('href'), active: await page.evaluate(() => document.activeElement.id) });
    }
    await page.locator('#Input_FullName').fill('Accessibility Audit');
    await page.locator('#Input_Email').fill('audit@example.com');
    await page.locator('#Input_Category').selectOption({ index: 1 });
    await page.locator('#Input_Description').fill('Valid synthetic audit description, no personal data.');
    await page.locator('#submit-request').focus();
    samples.push({ mode: 'server-errors-corrected-before-submit', ...await getForm(page) });
    await page.locator('#Input_Description').scrollIntoViewIfNeeded();
    await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js' });
    const textarea = await page.evaluate(() => window.axe.run('#Input_Description', {
      runOnly: { type: 'rule', values: ['color-contrast'] }, resultTypes: ['violations', 'incomplete', 'passes']
    }));
    save('axe-textarea-scrolled.json', textarea);
    save('form-followup.json', { samples, summaryLinks });
    await page.goto('http://localhost:5158/Error');
    await page.setViewportSize({ width: 320, height: 640 });
    await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });
    const spacing = await page.evaluate(() => {
      const el = [...document.querySelectorAll('strong')].find(el => el.textContent === 'ASPNETCORE_ENVIRONMENT');
      const r = document.createRange(); r.selectNodeContents(el);
      return { viewport: innerWidth, scrollWidth: document.documentElement.scrollWidth,
        wordRects: [...r.getClientRects()].map(r => ({ x: r.x, y: r.y, width: r.width, height: r.height })),
        scrollLeftBefore: scrollX };
    });
    await page.evaluate(() => scrollTo(1000, scrollY));
    spacing.scrollLeftAfter = await page.evaluate(() => scrollX);
    save('spacing-error-confirmed.json', spacing);
    console.log(JSON.stringify({ forms: samples, summaryLinks, contrast: hero.ratios, textarea: { violations: textarea.violations.length, incomplete: textarea.incomplete.length }, spacing }));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
