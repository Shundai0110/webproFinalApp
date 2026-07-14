import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  workers: 1,
  timeout: 45_000,
  expect: { timeout: 10_000 },
  use: {
    baseURL: "http://127.0.0.1:4190",
    headless: true,
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "npm run build && PORT=4190 HOST=0.0.0.0 DEMO_STORAGE_MODE=ephemeral SERVE_FRONTEND=true npm start",
    url: "http://127.0.0.1:4190/api/health",
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
