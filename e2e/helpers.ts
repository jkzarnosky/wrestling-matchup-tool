import { readFileSync } from "node:fs";
import { expect, type Page } from "@playwright/test";

export { ADMIN_EMAIL, TEAM_NAMES } from "./constants";

const LOGIN_CODES_FILE = "e2e/.artifacts/login-codes.log";
const SEED_DATA_FILE = "e2e/.artifacts/seed-data.json";
export const STORAGE_STATE_FILE = "e2e/.artifacts/storage-state.json";

export interface SeedData {
  adminEmail: string;
  teams: { ironclad: number; northgate: number; riverValley: number };
}

export function readSeedData(): SeedData {
  return JSON.parse(readFileSync(SEED_DATA_FILE, "utf8"));
}

/** Polls the file lib/e2e-otp-capture.ts writes to (only when E2E_TEST_MODE=1) for the most recent
 * login code issued to `email`. The app "sends" the code by appending a line here instead of
 * emailing it, so the test can complete the real OTP UI. */
export async function readLatestLoginCode(email: string, { timeoutMs = 10_000 } = {}): Promise<string> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const lines = readFileSync(LOGIN_CODES_FILE, "utf8").trim().split("\n").filter(Boolean);
      for (let i = lines.length - 1; i >= 0; i--) {
        const [, lineEmail, code] = lines[i].split("\t");
        if (lineEmail === email) return code;
      }
    } catch {
      // file not written yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`No login code for ${email} appeared in ${LOGIN_CODES_FILE} within ${timeoutMs}ms`);
}

/** Drives the real email -> code -> session login UI. */
export async function logInThroughUi(page: Page, email: string): Promise<void> {
  await page.goto("/login");
  await page.getByLabel("Email").fill(email);
  await page.getByRole("button", { name: "Send code" }).click();

  await expect(page.getByRole("heading", { name: "Enter your code" })).toBeVisible();
  const code = await readLatestLoginCode(email);
  await page.getByLabel("Code").fill(code);
  await page.getByRole("button", { name: "Log in" }).click();

  // verify-code redirects to "/"; being off /login means the session cookie took.
  await expect(page).toHaveURL(/\/$/);
}
