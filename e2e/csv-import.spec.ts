import { test, expect } from "@playwright/test";
import { readSeedData } from "./helpers";

// Epic 1 journey: import a roster CSV and see the created / skipped-duplicate / rejected-invalid
// summary. The fixture (e2e/fixtures/roster.csv) is 2 new valid rows, 1 in-file duplicate, and 1
// row naming a team other than the one being imported into.
test("import a roster CSV and see the created / duplicate / invalid summary", async ({ page }) => {
  const { teams } = readSeedData();

  await page.goto(`/team/${teams.riverValley}`);
  await expect(page.getByRole("heading", { name: "Roster (0)" })).toBeVisible();

  await page.setInputFiles("#csv-file", "e2e/fixtures/roster.csv");
  await page.getByRole("button", { name: "Import" }).click();

  await expect(page.getByText("Created 2, skipped 1 duplicate(s), rejected 1 invalid row(s).")).toBeVisible();
  await expect(page.getByText(/doesn.t match the team/)).toBeVisible();

  // The two valid rows are now on the roster.
  await expect(page.getByRole("heading", { name: "Roster (2)" })).toBeVisible();
});
