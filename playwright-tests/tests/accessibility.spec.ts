import AxeBuilder from '@axe-core/playwright';
import { test, expect, type Page, type TestInfo } from '@playwright/test';
import { NewRequestPage, uniqueRequest } from '../pages/NewRequestPage';

async function expectAccessible(page: Page, testInfo: TestInfo) {
  const results = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'])
    .analyze();

  await testInfo.attach('axe-results', {
    body: JSON.stringify(results, null, 2),
    contentType: 'application/json',
  });
  expect(results.violations).toEqual([]);
}

async function expectRequiredFieldErrors(page: Page, form: NewRequestPage) {
  for (const field of [form.fullName, form.email, form.category, form.description]) {
    const error = form.errorFor(field);
    await expect(field).toHaveAttribute('aria-invalid', 'true');
    await expect(error).not.toBeEmpty();
    const errorId = await error.getAttribute('id');
    if (!errorId) throw new Error('Expected a stable ID on the field error message.');
    await expect(field).toHaveAttribute('aria-describedby', errorId);
    await expect(field).toHaveAttribute('required', '');
    await expect(page.locator(`label[for="${await field.getAttribute('id')}"]`)).toContainText('(required)');
  }
}

test.describe('Accessibility @a11y', () => {
  test.describe.configure({ timeout: 60_000 });

  const routes = [
    { path: '/', name: 'home', heading: 'Request a Government of Ontario service', current: 'Home' },
    { path: '/Privacy', name: 'privacy', heading: 'Privacy', current: 'Privacy' },
    { path: '/Requests', name: 'requests list', heading: 'Service requests', current: 'Requests' },
    { path: '/Requests/New', name: 'empty request form', heading: 'New service request', current: 'New request' },
    { path: '/Error', name: 'error page', heading: 'Error.', current: undefined },
  ];

  for (const route of routes) {
    test(`${route.name} has no axe violations`, async ({ page }, testInfo) => {
      const response = await page.goto(route.path);
      expect(response?.status()).toBe(200);
      await expect(page.getByRole('heading', { level: 1 })).toHaveText(route.heading);
      await expect(page.locator('html')).toHaveAttribute('lang', 'en');
      if (route.current) {
        await expect(
          page.getByRole('navigation', { name: 'Primary navigation' }).getByRole('link', { name: route.current, exact: true }),
        ).toHaveAttribute('aria-current', 'page');
      }
      await expectAccessible(page, testInfo);
    });
  }

  test('client required-field errors have accessible associations and no axe violations', async ({ page }, testInfo) => {
    const form = new NewRequestPage(page);
    await form.goto();
    await form.submitButton.click();

    // A11Y-003/004/006, SC 1.3.1, 3.3.1 and 3.3.2: retain error relationships and required instructions.
    await expectRequiredFieldErrors(page, form);
    await expect(form.fullName).toBeFocused();
    await expectAccessible(page, testInfo);
  });

  test('client format and length errors have no axe violations', async ({ page }, testInfo) => {
    const form = new NewRequestPage(page);
    await form.goto();
    await form.submit(uniqueRequest({ fullName: 'X', email: 'invalid-email', description: 'short' }));

    await expect(form.errorFor(form.fullName)).toHaveText('Name must be between 2 and 100 characters.');
    await expect(form.errorFor(form.email)).toHaveText('Enter a valid email address.');
    await expect(form.errorFor(form.description)).toHaveText('Description must be between 10 and 1000 characters.');
    await expectAccessible(page, testInfo);
  });

  test('server errors expose a focused linked summary and have no axe violations', async ({ page }, testInfo) => {
    const form = new NewRequestPage(page);
    await form.goto();
    // Native submission bypasses client validation while retaining JavaScript for axe and server-rendered focus.
    const response = page.waitForResponse(response =>
      response.request().method() === 'POST' && new URL(response.url()).pathname === '/Requests/New',
    );
    await form.form.evaluate(element => {
      if (!(element instanceof HTMLFormElement)) throw new Error('Expected the request form.');
      element.submit();
    });
    expect((await response).status()).toBe(200);

    // A11Y-005, SC 3.3.1: preserve the server summary, error title and field navigation.
    const summary = page.locator('#error-summary');
    await expect(summary).toBeFocused();
    await expect(page).toHaveTitle(/^Error: New service request/);
    await expectRequiredFieldErrors(page, form);
    for (const field of [form.fullName, form.email, form.category, form.description]) {
      await expect(summary.locator(`a[href="#${await field.getAttribute('id')}"]`)).toHaveCount(1);
    }
    await expectAccessible(page, testInfo);
  });

  test('submission confirmation receives focus and has no axe violations', async ({ page }, testInfo) => {
    const form = new NewRequestPage(page);
    await form.goto();
    await form.submit(uniqueRequest());

    // A11Y-010: retain the state-specific title and confirmation focus.
    await expect(page).toHaveTitle(/^Request submitted/);
    await expect(form.confirmation.getByRole('heading', { name: 'Request submitted' })).toBeFocused();
    await expect(form.reference).toHaveText(/^CSC-\d{5}$/);
    await expectAccessible(page, testInfo);
  });
});
