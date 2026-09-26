import { defineConfig } from "@playwright/test";

// E2E_PROD=1 runs against a production build (`next start`), where the service worker
// is active; otherwise tests run against `next dev`.
const PROD = process.env.E2E_PROD === "1";
const PORT = Number(process.env.PORT ?? (PROD ? 3100 : 3000));

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 60_000,
  retries: 0,
  workers: 1,
  use: { baseURL: `http://localhost:${PORT}`, trace: "retain-on-failure" },
  webServer: {
    command: PROD ? `npx next start -p ${PORT}` : `npx next dev -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: !PROD,
    env: { ADMIN_PASSCODE: "ncpor2026" },
    timeout: 120_000,
  },
});
