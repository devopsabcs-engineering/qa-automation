const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require(path.join(process.cwd(), 'playwright-tests', 'node_modules', 'playwright'));
const out = __dirname;
const base = 'http://localhost:5158';
const tags = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'];
const save = (name, data) => fs.writeFileSync(path.join(out, name), JSON.stringify(data, null, 2));
const states = [
  ['home', '/', 'default'],
  ['privacy', '/Privacy', 'default'],
  ['requests', '/Requests', 'seeded'],
  ['new', '/Requests/New', 'empty'],
  ['new', '/Requests/New', 'errors-client'],
  ['new', '/Requests/New', 'errors-server'],
  ['new', '/Requests/New', 'errors-client-invalid'],
  ['new', '/Requests/New', 'submitted'],
  ['error', '/Error', 'default']
];

async function prepare(page, route, state) {
  await page.goto(base + route, { waitUntil: 'networkidle' });
  if (state === 'errors-server') {
    await page.evaluate(() => { window.jQuery('#new-request-form').validate().destroy(); });
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.locator('#submit-request').click()
    ]);
  } else if (state === 'errors-client' || state === 'errors-client-invalid') {
    if (state === 'errors-client-invalid') {
      await page.locator('#Input_FullName').fill('X');
      await page.locator('#Input_Email').fill('invalid-email');
      await page.locator('#Input_Category').selectOption({ index: 1 });
      await page.locator('#Input_Description').fill('short');
    }
    await page.locator('#submit-request').click();
    await page.waitForTimeout(100);
  } else if (state === 'submitted') {
    await page.locator('#Input_FullName').fill('Accessibility Audit');
    await page.locator('#Input_Email').fill('audit@example.com');
    await page.locator('#Input_Category').selectOption({ index: 1 });
    await page.locator('#Input_Description').fill('Synthetic accessibility audit request, no real personal information.');
    await Promise.all([
      page.waitForNavigation({ waitUntil: 'networkidle' }),
      page.locator('#submit-request').click()
    ]);
    await page.locator('#submission-confirmation').waitFor();
  }
}

async function snapshot(page) {
  return page.evaluate(() => {
    const desc = el => {
      const s = getComputedStyle(el), r = el.getBoundingClientRect();
      return {
        tag: el.tagName, id: el.id, text: (el.getAttribute('aria-label') || el.innerText || el.getAttribute('name') || '').trim().slice(0, 140),
        href: el.getAttribute('href'), role: el.getAttribute('role'),
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        color: s.color, background: s.backgroundColor, outline: s.outline, outlineOffset: s.outlineOffset,
        shadow: s.boxShadow, fontSize: s.fontSize, lineHeight: s.lineHeight
      };
    };
    return {
      title: document.title, lang: document.documentElement.lang, url: location.href,
      active: desc(document.activeElement),
      headings: [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(desc),
      navigation: [...document.querySelectorAll('nav a')].map(el => ({ ...desc(el), current: el.getAttribute('aria-current') })),
      controls: [...document.querySelectorAll('input:not([type=hidden]),select,textarea')].map(el => ({
        ...desc(el), label: [...el.labels].map(l => l.innerText), required: el.required,
        invalid: el.getAttribute('aria-invalid'), describedby: el.getAttribute('aria-describedby'),
        description: (el.getAttribute('aria-describedby') || '').split(/\s+/).map(id => ({
          id, exists: !!document.getElementById(id), text: document.getElementById(id)?.textContent.trim()
        })), autocomplete: el.autocomplete
      })),
      summary: document.querySelector('#error-summary')?.outerHTML || null,
      errors: [...document.querySelectorAll('.field-validation-error')].map(desc),
      links: [...document.querySelectorAll('a')].map(desc),
      fixed: [...document.querySelectorAll('*')].filter(el => ['fixed', 'sticky'].includes(getComputedStyle(el).position)).map(desc),
      clientValidation: { jquery: !!window.jQuery, validator: !!window.jQuery?.validator },
      dimensions: { viewport: innerWidth, document: document.documentElement.scrollWidth }
    };
  });
}

async function keyboard(page) {
  await page.evaluate(() => {
    document.activeElement.blur();
    document.body.setAttribute('tabindex', '-1');
    document.body.focus();
    document.body.removeAttribute('tabindex');
  });
  const trace = [];
  for (let i = 0; i < 60; i++) {
    await page.keyboard.press('Tab');
    const item = await page.evaluate(() => {
      const el = document.activeElement, s = getComputedStyle(el), r = el.getBoundingClientRect();
      const points = [[r.left + r.width / 2, r.top + r.height / 2], [r.left + 1, r.top + 1], [r.right - 1, r.bottom - 1]];
      return {
        tag: el.tagName, id: el.id, name: (el.getAttribute('aria-label') || el.innerText || [...(el.labels || [])].map(l => l.innerText).join(' ') || el.name || '').trim().slice(0, 100),
        href: el.getAttribute('href'), outline: s.outline, outlineOffset: s.outlineOffset, shadow: s.boxShadow,
        color: s.color, background: s.backgroundColor,
        rect: { x: r.x, y: r.y, width: r.width, height: r.height },
        visibleSamples: points.map(([x, y]) => {
          const hit = document.elementFromPoint(x, y);
          return !!hit && (hit === el || el.contains(hit));
        })
      };
    });
    trace.push(item);
    if (i > 0 && item.tag === 'BODY') break;
  }
  return trace;
}

async function layout(page) {
  return page.evaluate(() => {
    const rect = el => { const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, width: r.width, height: r.height }; };
    return {
      width: innerWidth, documentWidth: document.documentElement.scrollWidth, bodyWidth: document.body.scrollWidth,
      overflow: [...document.querySelectorAll('body *')].filter(el => {
        if (el.closest('.ontario-table-scroll') || el.closest('.ontario-show-for-sr') || el.matches('.ontario-skip-link')) return false;
        const r = el.getBoundingClientRect();
        return r.width > 0 && (r.right > innerWidth + 1 || r.left < -1);
      }).map(el => ({ tag: el.tagName, id: el.id, class: el.className, text: el.textContent.trim().slice(0, 100), rect: rect(el) })),
      clipped: [...document.querySelectorAll('h1,h2,h3,p,a,button,label,input,select,textarea,li')].filter(el => {
        const s = getComputedStyle(el);
        return !el.closest('.ontario-show-for-sr') && el.offsetWidth > 0 &&
          ((['hidden', 'clip'].includes(s.overflowY) && el.scrollHeight > el.clientHeight + 2) ||
           (['hidden', 'clip'].includes(s.overflowX) && el.scrollWidth > el.clientWidth + 2));
      }).map(el => ({ tag: el.tagName, id: el.id, text: el.textContent.trim().slice(0, 100), rect: rect(el) })),
      targets: [...document.querySelectorAll('a,button,input:not([type=hidden]),select,textarea,[tabindex="0"]')].filter(el => el.getBoundingClientRect().width > 0)
        .map(el => ({ tag: el.tagName, id: el.id, text: el.innerText?.trim().slice(0, 60), rect: rect(el),
          inlineException: !!el.closest('p') && !el.classList.contains('ontario-button'), display: getComputedStyle(el).display })),
      scrollRegions: [...document.querySelectorAll('.ontario-table-scroll')].map(el => ({ rect: rect(el), scrollWidth: el.scrollWidth, clientWidth: el.clientWidth, tabIndex: el.tabIndex, label: el.getAttribute('aria-labelledby') }))
    };
  });
}

(async () => {
  const browser = await chromium.launch();
  const all = [];
  try {
    for (const [slug, route, state] of states) {
      const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
      const page = await context.newPage();
      const messages = [];
      page.on('pageerror', error => messages.push({ type: 'pageerror', message: error.message }));
      page.on('requestfailed', request => messages.push({ type: 'requestfailed', url: request.url(), failure: request.failure() }));
      await prepare(page, route, state);
      const key = `${slug}-${state}`;
      const initial = await snapshot(page);
      await page.addScriptTag({ url: 'https://cdn.jsdelivr.net/npm/axe-core@4.10.3/axe.min.js' });
      const axe = await page.evaluate(async tags => window.axe.run(document, {
        runOnly: { type: 'tag', values: tags }, resultTypes: ['violations', 'incomplete']
      }), tags);
      save(`axe-${key}.json`, axe);
      const trace = await keyboard(page);
      save(`keyboard-${key}.json`, trace);
      await page.evaluate(() => { document.activeElement.blur(); document.body.tabIndex = -1; document.body.focus(); document.body.removeAttribute('tabindex'); });
      await page.keyboard.press('Tab');
      const skipFirst = await page.locator(':focus').getAttribute('class');
      await page.keyboard.press('Enter');
      const skipTarget = await page.evaluate(() => ({ id: document.activeElement.id, insideMain: !!document.activeElement.closest('main') }));
      await page.setViewportSize({ width: 320, height: 640 });
      const narrow = await layout(page);
      await page.addStyleTag({ content: '* { line-height: 1.5 !important; letter-spacing: 0.12em !important; word-spacing: 0.16em !important; } p { margin-bottom: 2em !important; }' });
      const spacingNarrow = await layout(page);
      if (spacingNarrow.overflow.length || spacingNarrow.clipped.length) await page.screenshot({ path: path.join(out, `spacing-${key}.png`), fullPage: true });
      await page.setViewportSize({ width: 1280, height: 900 });
      const spacingDesktop = await layout(page);
      await page.emulateMedia({ reducedMotion: 'reduce' });
      const motion = await page.evaluate(() => [...document.querySelectorAll('a,button,input,select,textarea')].map(el => ({
        tag: el.tagName, id: el.id, transition: getComputedStyle(el).transitionDuration, animation: getComputedStyle(el).animationDuration
      })));
      const result = { route, state, key, initial, skipFirst, skipTarget, narrow, spacingNarrow, spacingDesktop, motion, messages,
        axe: { version: axe.testEngine.version, violations: axe.violations.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.length })),
          incomplete: axe.incomplete.map(v => ({ id: v.id, impact: v.impact, nodes: v.nodes.map(n => n.target) })) } };
      save(`interaction-${key}.json`, result);
      all.push(result);
      console.log(JSON.stringify({ key, axe: result.axe, width: narrow.documentWidth, spacingWidth: spacingNarrow.documentWidth, focus: initial.active.id, title: initial.title, errors: initial.errors.length, messages }));
      await context.close();
    }
    const nojs = await browser.newContext({ javaScriptEnabled: false });
    const page = await nojs.newPage();
    await page.goto(base + '/Requests/New');
    await Promise.all([page.waitForNavigation(), page.locator('#submit-request').click()]);
    save('nojs-errors.html.json', { title: await page.title(), html: await page.content() });
    await nojs.close();
    save('all-states.json', all);
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
