import { defineConfig, devices } from '@playwright/test';

// Set E2E_BASE_URL to test an already-running/deployed app; otherwise the app is started locally.
const externalBaseUrl = process.env.E2E_BASE_URL || undefined;
const port = Number(process.env.E2E_PORT || 5158);
const baseURL = externalBaseUrl ?? `http://localhost:${port}`;
const configuration = process.env.E2E_CONFIGURATION || 'Debug';
const noBuild = process.env.E2E_NO_BUILD === 'true' ? ' --no-build' : '';
const isCI = !!process.env.CI;

export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: isCI,
  retries: isCI ? 2 : 0,
  workers: isCI ? 2 : undefined,
  timeout: 30_000,
  expect: { timeout: 5_000 },
  reporter: [
    ['list'],
    ['html', { outputFolder: 'playwright-report', open: 'never' }],
    ['junit', { outputFile: 'test-results/junit.xml' }],
  ],
  outputDir: 'test-results/artifacts',
  use: {
    baseURL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile-chromium', use: { ...devices['Pixel 7'] } },
  ],
  webServer: externalBaseUrl
    ? undefined
    : {
        command:
          `dotnet run --project ../src/OntarioCsc.Web/OntarioCsc.Web.csproj ` +
          `--configuration ${configuration}${noBuild} --no-launch-profile -- --urls ${baseURL}`,
        url: baseURL,
        reuseExistingServer: !isCI,
        timeout: 180_000,
        stdout: 'ignore',
        stderr: 'pipe',
        env: { ASPNETCORE_ENVIRONMENT: 'Development' },
      },
});
