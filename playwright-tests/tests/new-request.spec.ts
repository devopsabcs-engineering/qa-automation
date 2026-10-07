import { test, expect } from '@playwright/test';
import { NewRequestPage, uniqueRequest } from '../pages/NewRequestPage';

test.describe('Submit a new service request', () => {
  let form: NewRequestPage;

  test.beforeEach(async ({ page }) => {
    form = new NewRequestPage(page);
    await form.goto();
  });

  test('lists every service category', async () => {
    await expect(form.category.locator('option')).toHaveText([
      '-- Select a category --',
      'Driver and vehicle',
      'Health card',
      'Birth, marriage and death',
      'Business and economy',
      'Other',
    ]);
  });

  test('a valid request shows a confirmation with a reference number', async () => {
    await form.submit(uniqueRequest());

    await expect(form.confirmation).toBeVisible();
    await expect(form.confirmation.getByRole('heading', { name: 'Request submitted' })).toBeVisible();
    await expect(form.reference).toHaveText(/^CSC-\d{5}$/);
    await expect(form.form).toHaveCount(0);
  });

  test('a submitted request appears in the list with status New', async ({ page }) => {
    const request = uniqueRequest({ category: 'Business and economy' });
    await form.submit(request);
    const reference = (await form.reference.innerText()).trim();

    await form.viewAllRequestsLink.click();
    await expect(page).toHaveURL(/\/Requests$/);

    const row = page.getByRole('row').filter({ hasText: request.fullName });
    await expect(row).toHaveCount(1);
    await expect(row.getByRole('cell').nth(0)).toHaveText(reference);
    await expect(row).toContainText('Business and economy');
    await expect(row.locator('.ontario-badge')).toHaveText('New');
  });

  test('trims surrounding whitespace from the name', async ({ page }) => {
    const request = uniqueRequest();
    await form.submit({ ...request, fullName: `   ${request.fullName}   ` });
    await expect(form.confirmation).toBeVisible();

    await page.goto('/Requests');
    const nameCell = page.getByRole('row').filter({ hasText: request.fullName }).getByRole('cell').nth(2);
    await expect(nameCell).toHaveText(request.fullName);
  });

  test('each submission gets a different reference number', async () => {
    await form.submit(uniqueRequest());
    const first = await form.reference.innerText();

    await form.goto();
    await form.submit(uniqueRequest());
    const second = await form.reference.innerText();

    expect(second).not.toEqual(first);
  });

  test('Cancel returns to the home page without submitting', async ({ page }) => {
    const request = uniqueRequest();
    await form.fill(request);
    await form.cancelLink.click();
    await expect(page).toHaveURL(/\/$/);

    await page.goto('/Requests');
    await expect(page.getByRole('row').filter({ hasText: request.fullName })).toHaveCount(0);
  });
});

test.describe('Request form validation', () => {
  let form: NewRequestPage;

  test.beforeEach(async ({ page }) => {
    form = new NewRequestPage(page);
    await form.goto();
  });

  test('an empty submission shows an error for every required field', async () => {
    await form.submitButton.click();

    await expect(form.errorFor(form.fullName)).toHaveText('Enter your full name.');
    await expect(form.errorFor(form.email)).toHaveText('Enter your email address.');
    await expect(form.errorFor(form.category)).toHaveText('Select a service category.');
    await expect(form.errorFor(form.description)).toHaveText('Describe your request.');
    await expect(form.confirmation).toHaveCount(0);
  });

  test('rejects an invalid email address', async () => {
    await form.submit(uniqueRequest({ email: 'not-an-email' }));
    await expect(form.errorFor(form.email)).toHaveText('Enter a valid email address.');
    await expect(form.confirmation).toHaveCount(0);
  });

  test('rejects a name shorter than 2 characters', async () => {
    await form.submit(uniqueRequest({ fullName: 'A' }));
    await expect(form.errorFor(form.fullName)).toHaveText('Name must be between 2 and 100 characters.');
    await expect(form.confirmation).toHaveCount(0);
  });

  test('rejects a description shorter than 10 characters', async () => {
    await form.submit(uniqueRequest({ description: 'Too short' }));
    await expect(form.errorFor(form.description)).toHaveText(
      'Description must be between 10 and 1000 characters.',
    );
    await expect(form.confirmation).toHaveCount(0);
  });

  test('keeps entered values when validation fails', async () => {
    const request = uniqueRequest({ email: 'not-an-email' });
    await form.submit(request);

    await expect(form.errorFor(form.email)).toBeVisible();
    await expect(form.fullName).toHaveValue(request.fullName);
    await expect(form.description).toHaveValue(request.description);
  });

  test('fixing the errors allows the request to be submitted', async () => {
    await form.submitButton.click();
    await expect(form.errorFor(form.fullName)).toHaveText('Enter your full name.');

    await form.fill(uniqueRequest());
    // fill() fires no keyup, so leave the last field like a user would to clear its stale error before clicking.
    await form.description.blur();
    await expect(form.errorFor(form.fullName)).toHaveText('');
    await expect(form.errorFor(form.description)).toHaveText('');

    await form.submitButton.click();
    await expect(form.reference).toHaveText(/^CSC-\d{5}$/);
  });
});

test.describe('Server-side validation (JavaScript disabled)', () => {
  test.use({ javaScriptEnabled: false });

  test('an empty submission is rejected by the server', async ({ page }) => {
    const form = new NewRequestPage(page);
    await form.goto();
    await form.submitButton.click();

    await expect(form.errorFor(form.fullName)).toHaveText('Enter your full name.');
    await expect(form.errorFor(form.email)).toHaveText('Enter your email address.');
    await expect(form.errorFor(form.category)).toHaveText('Select a service category.');
    await expect(form.errorFor(form.description)).toHaveText('Describe your request.');
  });

  test('a valid request is accepted by the server', async ({ page }) => {
    const form = new NewRequestPage(page);
    await form.goto();
    await form.submit(uniqueRequest());

    await expect(form.reference).toHaveText(/^CSC-\d{5}$/);
  });
});
