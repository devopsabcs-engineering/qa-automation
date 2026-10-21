import { test, expect } from '@playwright/test';

const SITE_SUFFIX = ' - Ontario Common Service Centre';

test.describe('Home page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('shows the hero, title and emergency callout', async ({ page }) => {
    await expect(page).toHaveTitle(`Common Service Centre — request a service${SITE_SUFFIX}`);
    await expect(
      page.getByRole('heading', { level: 1, name: 'Request a Government of Ontario service' }),
    ).toBeVisible();
    await expect(page.getByText('within five business days')).toBeVisible();
    await expect(page.locator('.ontario-callout--alert')).toContainText('9-1-1');
  });

  test('"Start a new request" opens the request form', async ({ page }) => {
    await page.getByRole('link', { name: 'Start a new request' }).click();
    await expect(page).toHaveURL(/\/Requests\/New$/);
    await expect(page.getByRole('heading', { level: 1, name: 'New service request' })).toBeVisible();
  });

  test('"View existing requests" opens the requests list', async ({ page }) => {
    await page.getByRole('link', { name: 'View existing requests' }).click();
    await expect(page).toHaveURL(/\/Requests$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Service requests' })).toBeVisible();
  });
});

test.describe('Primary navigation', () => {
  const routes = [
    { link: 'Requests', url: /\/Requests$/, heading: 'Service requests', title: 'Service requests' },
    { link: 'New request', url: /\/Requests\/New$/, heading: 'New service request', title: 'New service request' },
    { link: 'Privacy', url: /\/Privacy$/, heading: 'Privacy', title: 'Privacy' },
    { link: 'Home', url: /\/$/, heading: 'Request a Government of Ontario service', title: 'Common Service Centre — request a service' },
  ];

  for (const route of routes) {
    test(`"${route.link}" link navigates to the ${route.heading} page`, async ({ page }) => {
      await page.goto('/Privacy');
      const nav = page.getByRole('navigation', { name: 'Primary navigation' });
      await nav.getByRole('link', { name: route.link, exact: true }).click();

      await expect(page).toHaveURL(route.url);
      await expect(page).toHaveTitle(`${route.title}${SITE_SUFFIX}`);
      await expect(page.getByRole('heading', { level: 1, name: route.heading })).toBeVisible();
    });
  }
});

test.describe('Layout', () => {
  test('renders the Ontario header, subheader and footer on every page', async ({ page }) => {
    for (const path of ['/', '/Requests', '/Requests/New', '/Privacy']) {
      await page.goto(path);
      await expect(page.getByRole('banner').getByRole('link', { name: 'Government of Ontario' })).toBeVisible();
      await expect(page.getByText('Common Service Centre — workshop demo')).toBeVisible();

      const footer = page.getByRole('contentinfo');
      await expect(footer.getByRole('link', { name: 'Accessibility' })).toHaveAttribute(
        'href',
        'https://www.ontario.ca/page/accessibility',
      );
      await expect(footer).toContainText(`2012–${new Date().getUTCFullYear()}`);
    }
  });

  test('skip link moves keyboard focus to the main content', async ({ page }) => {
    await page.goto('/');
    await page.keyboard.press('Tab');

    const skipLink = page.getByRole('link', { name: 'Skip to main content' });
    await expect(skipLink).toBeFocused();

    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(/#main-content$/);
    await expect(page.locator('#main-content')).toBeFocused();
  });

  test('privacy page warns not to enter real personal information', async ({ page }) => {
    await page.goto('/Privacy');
    await expect(page.getByText('Do not enter real personal information into this demo.')).toBeVisible();
  });

  test('unknown routes return 404', async ({ page }) => {
    const response = await page.goto('/does-not-exist');
    expect(response?.status()).toBe(404);
  });
});
