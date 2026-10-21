const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.join(process.cwd(), 'playwright-tests', 'node_modules', 'playwright'));
const output = __dirname;
(async () => {
  const browser = await chromium.launch();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
    const runs = [];
    for (let i = 0; i < 3; i++) {
      await page.goto('http://localhost:5158/Requests/New', { waitUntil: 'networkidle' });
      await page.locator('#Input_FullName').fill('X');
      await page.locator('#Input_Email').fill('invalid-email');
      await page.locator('#Input_Category').selectOption({ index: 1 });
      await page.locator('#Input_Description').fill('short');
      const before = await page.evaluate(() => ({
        focus: document.activeElement.id,
        errors: [...document.querySelectorAll('.field-validation-error')].map(el => el.textContent.trim())
      }));
      await page.evaluate(() => {
        window.auditEvents = [];
        document.addEventListener('focusin', event => window.auditEvents.push({ event: 'focusin', id: event.target.id }));
        window.auditObserver = new MutationObserver(records => {
          for (const record of records) {
            const element = record.target.nodeType === 1 ? record.target : record.target.parentElement;
            if (element.closest('[data-valmsg-for]')) window.auditEvents.push({
              event: 'error-mutation', field: element.closest('[data-valmsg-for]').getAttribute('data-valmsg-for'),
              text: element.closest('[data-valmsg-for]').textContent, focused: document.activeElement.id
            });
          }
        });
        window.auditObserver.observe(document.querySelector('form'), { childList: true, subtree: true, characterData: true });
      });
      await page.locator('#submit-request').click();
      await page.waitForTimeout(1000);
      const after = await page.evaluate(() => ({
        focus: document.activeElement.id, title: document.title,
        summary: !!document.getElementById('error-summary'), events: window.auditEvents,
        errors: [...document.querySelectorAll('.field-validation-error')].map(el => ({
          text: el.textContent.trim(), html: el.outerHTML,
          liveAncestor: !!el.closest('[aria-live],[role=alert],[role=status]')
        }))
      }));
      runs.push({ before, after });
    }
    await page.screenshot({ path: path.join(output, 'client-invalid-notification.png'), fullPage: true });
    const cdp = await page.context().newCDPSession(page);
    const tree = await cdp.send('Accessibility.getFullAXTree');
    const focusAndLive = tree.nodes.filter(n => n.properties?.some(p => ['live', 'focused'].includes(p.name)));
    fs.writeFileSync(path.join(output, 'client-invalid-notification.json'), JSON.stringify({ runs, focusAndLive }, null, 2));
    console.log(JSON.stringify(runs.map(run => ({ before: run.before, focusAfter: run.after.focus, summary: run.after.summary, newErrors: run.after.errors.map(e => ({ text: e.text, live: e.liveAncestor })), focusEvents: run.after.events.filter(e => e.event === 'focusin') }))));
  } finally { await browser.close(); }
})().catch(error => { console.error(error); process.exitCode = 1; });
