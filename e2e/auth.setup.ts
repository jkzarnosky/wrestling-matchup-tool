import { test as setup, expect } from "@playwright/test";
import { ADMIN_EMAIL, STORAGE_STATE_FILE, logInThroughUi } from "./helpers";

// Runs once before the specs (Playwright `dependencies`). Also *is* the login journey: it drives
// the real email -> one-time code -> session UI end to end, then saves the authenticated storage
// state so the other specs don't each re-log-in.
setup("log in through the real one-time-code flow", async ({ page }) => {
  await logInThroughUi(page, ADMIN_EMAIL);

  // Sanity-check the session actually works on an auth-gated page.
  await page.goto("/team");
  await expect(page).not.toHaveURL(/\/login/);

  await page.context().storageState({ path: STORAGE_STATE_FILE });
});
