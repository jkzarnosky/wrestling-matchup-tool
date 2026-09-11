import { test, expect } from "@playwright/test";

// Epic 2 journey, end to end: select attending teams -> configure thresholds -> generate matchups
// -> see the printable sheet grouped by mat, with the unmatchable wrestler flagged as an outlier.
// Runs against the seeded roster (e2e/seed.ts): Ironclad {Sam 70 M, Ava 72 F, Big Unit 200 M},
// Northgate {Max 71 M, Nia 73 F}.
test("select teams, configure thresholds, generate matchups, see the sheet", async ({ page }) => {
  await page.goto("/matchups/new");

  await page.getByLabel("Ironclad Wrestling Club (National)").check();
  await page.getByLabel("Northgate Grapplers (National)").check();
  await page.getByRole("button", { name: "Continue" }).click();

  await expect(page).toHaveURL(/\/matchups\/\d+$/);
  await expect(page.getByRole("heading", { name: /Weekly matchup run #\d+/ })).toBeVisible();

  // Widen the defaults so the pairing is unambiguous, and pick flat-lbs mode.
  await page.locator("#age-diff").fill("2");
  await page.locator("#skill-diff").fill("2");
  await page.locator("#weight-mode").selectOption({ label: "Flat lbs" });
  await page.locator("#weight-diff").fill("20");
  await page.locator("#mat-count").fill("2");
  await page.getByRole("button", { name: /thresholds/ }).click();

  const generate = page.getByRole("button", { name: "Generate matchups" });
  await expect(generate).toBeEnabled();
  await generate.click();

  // Two clean cross-team pairs, one per mat.
  await expect(page.getByRole("heading", { name: "Mat 1" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Mat 2" })).toBeVisible();
  await expect(page.getByText("Sam Rivera (Ironclad Wrestling Club, 70 lbs, skill 2)")).toBeVisible();
  await expect(page.getByText("Max Kowalski (Northgate Grapplers, 71 lbs, skill 2)")).toBeVisible();
  await expect(page.getByText("Ava Chen (Ironclad Wrestling Club, 72 lbs, skill 2)")).toBeVisible();
  await expect(page.getByText("Nia Osei (Northgate Grapplers, 73 lbs, skill 2)")).toBeVisible();

  // The 200 lb wrestler can't be matched -- flagged, not dropped.
  await expect(page.getByRole("heading", { name: "No match found" })).toBeVisible();
  await expect(page.getByText("Big Unit (Ironclad Wrestling Club, 200 lbs, skill 1)")).toBeVisible();
});
