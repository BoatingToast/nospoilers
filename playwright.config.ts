import { defineConfig, devices } from '@playwright/test'

const port = Number(process.env.E2E_PORT ?? 3100)
const mockTmdbPort = Number(process.env.E2E_TMDB_PORT ?? 4100)
const baseURL = process.env.E2E_BASE_URL ?? `http://127.0.0.1:${port}`

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  timeout: 60_000,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    {
      name: 'desktop-chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile-chromium',
      use: { ...devices['iPhone 13'], browserName: 'chromium' },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : [
        {
          command: `node e2e/support/mock-tmdb-server.mjs --port ${mockTmdbPort}`,
          port: mockTmdbPort,
          reuseExistingServer: !process.env.CI,
          timeout: 30_000,
        },
        {
          command: `npm run dev -- --hostname 127.0.0.1 --port ${port}`,
          port,
          reuseExistingServer: !process.env.CI,
          timeout: 120_000,
          env: {
            DATABASE_URL: process.env.DATABASE_URL ?? 'postgresql://e2e:e2e@127.0.0.1:5432/e2e',
            NEXTAUTH_SECRET: 'nospoilers-e2e-secret',
            NEXTAUTH_URL: baseURL,
            TMDB_API_KEY: 'e2e-fixture-key',
            TMDB_BASE_URL: `http://127.0.0.1:${mockTmdbPort}/3`,
          },
        },
      ],
})
