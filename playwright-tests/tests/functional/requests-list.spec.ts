import { test, expect } from '@playwright/test';

test.describe('Service requests list', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/Requests');
  });

  test('shows the requests table with the expected columns', async ({ page }) => {
    const table = page.locator('#requests-table');
    await expect(table).toBeVisible();
    await expect(page.locator('#no-requests')).toHaveCount(0);

    const headers = table.getByRole('columnheader');
    await expect(headers).toHaveText(['Reference', 'Submitted', 'Name', 'Category', 'Status']);
  });

  test('lists the seeded requests with category and status', async ({ page }) => {
    const pat = page.getByRole('row').filter({ hasText: 'Pat Citizen' });
    await expect(pat).toContainText('Driver and vehicle');
    await expect(pat.locator('.ontario-badge')).toHaveText('InProgress');
    await expect(pat.locator('.ontario-badge')).toHaveClass(/ontario-badge--inprogress/);

    const alex = page.getByRole('row').filter({ hasText: 'Alex Resident' });
    await expect(alex).toContainText('Health card');
    await expect(alex.locator('.ontario-badge')).toHaveText('New');
  });

  test('formats every reference as CSC-#####', async ({ page }) => {
    const references = page.locator('#requests-table tbody tr td:first-child');
    await expect(references.first()).toBeVisible();
    for (const text of await references.allInnerTexts()) {
      expect(text.trim()).toMatch(/^CSC-\d{5}$/);
    }
  });

  test('orders requests newest first', async ({ page }) => {
    const submitted = await page.locator('#requests-table tbody tr td:nth-child(2)').allInnerTexts();
    const sorted = [...submitted].sort().reverse();
    expect(submitted).toEqual(sorted);
  });

  test('"Submit a new request" opens the request form', async ({ page }) => {
    await page.getByRole('link', { name: 'Submit a new request' }).click();
    await expect(page).toHaveURL(/\/Requests\/New$/);
  });
});
