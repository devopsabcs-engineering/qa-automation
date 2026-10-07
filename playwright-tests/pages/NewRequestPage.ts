import { expect, type Locator, type Page } from '@playwright/test';

export type ServiceRequestInput = {
  fullName: string;
  email: string;
  category: string;
  description: string;
};

export class NewRequestPage {
  readonly heading: Locator;
  readonly form: Locator;
  readonly fullName: Locator;
  readonly email: Locator;
  readonly category: Locator;
  readonly description: Locator;
  readonly submitButton: Locator;
  readonly cancelLink: Locator;
  readonly confirmation: Locator;
  readonly reference: Locator;
  readonly viewAllRequestsLink: Locator;

  constructor(private readonly page: Page) {
    this.heading = page.getByRole('heading', { level: 1, name: 'New service request' });
    this.form = page.getByTestId('new-request-form');
    this.fullName = page.getByLabel('Full name');
    this.email = page.getByLabel('Email address');
    this.category = page.getByLabel('Service category');
    this.description = page.getByLabel('Describe your request');
    this.submitButton = page.getByRole('button', { name: 'Submit request' });
    this.cancelLink = this.form.getByRole('link', { name: 'Cancel' });
    this.confirmation = page.locator('#submission-confirmation');
    this.reference = this.confirmation.locator('strong');
    this.viewAllRequestsLink = this.confirmation.getByRole('link', { name: 'View all requests' });
  }

  async goto() {
    await this.page.goto('/Requests/New');
    await expect(this.heading).toBeVisible();
  }

  async fill(input: Partial<ServiceRequestInput>) {
    if (input.fullName !== undefined) await this.fullName.fill(input.fullName);
    if (input.email !== undefined) await this.email.fill(input.email);
    if (input.category !== undefined) await this.category.selectOption({ label: input.category });
    if (input.description !== undefined) await this.description.fill(input.description);
  }

  async submit(input: Partial<ServiceRequestInput>) {
    await this.fill(input);
    await this.submitButton.click();
  }

  errorFor(field: Locator) {
    return this.page.locator('.ontario-form-group').filter({ has: field }).locator('.ontario-error-message');
  }
}

export function uniqueRequest(overrides: Partial<ServiceRequestInput> = {}): ServiceRequestInput {
  const id = `${Date.now()}-${Math.floor(Math.random() * 10_000)}`;
  return {
    fullName: `E2E Tester ${id}`,
    email: `e2e.${id}@example.on.ca`,
    category: 'Health card',
    description: `Automated Playwright request ${id} for a replacement health card.`,
    ...overrides,
  };
}
