import { defineConfig } from "@playwright/test";

const CI = !!process.env.CI;

// Tier 4 of the testing model (see README): a handful of critical journeys through a real running
// app in a real browser. Deliberately small -- login, CSV import, the full matchmaking flow --
// not comprehensive coverage. See MANUAL-TEST-CASES.md for the checklist this replaces.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  workers: 1, // one shared database; keep it sequential and predictable
  forbidOnly: CI,
  retries: CI ? 1 : 0,
  timeout: 30_000,
  reporter: CI
    ? [["list"], ["github"], ["junit", { outputFile: "test-results/e2e-junit.xml" }], ["html", { open: "never" }]]
    : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: "http://localhost:3000",
    trace: "retain-on-failure",
    video: "on", // every journey is recorded; the HTML report embeds them, uploaded as a CI artifact
    screenshot: "only-on-failure",
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      name: "e2e",
      testMatch: /.*\.spec\.ts/,
      dependencies: ["setup"],
      use: { storageState: "e2e/.artifacts/storage-state.json" },
    },
  ],
  webServer: {
    // Prod build in CI (also catches a broken production bundle); fast dev server locally.
    command: CI ? "npm run build && npm run start" : "npm run dev",
    url: "http://localhost:3000",
    reuseExistingServer: !CI,
    timeout: 180_000,
    env: { E2E_TEST_MODE: "1" },
  },
});
