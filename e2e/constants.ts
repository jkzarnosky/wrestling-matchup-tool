// Shared between e2e/seed.ts (a plain tsx script) and e2e/helpers.ts (imported by the specs).
// Kept dependency-free so the seed script doesn't pull in @playwright/test.
export const ADMIN_EMAIL = "e2e-admin@example.com";

export const TEAM_NAMES = {
  ironclad: "Ironclad Wrestling Club",
  northgate: "Northgate Grapplers",
  riverValley: "River Valley Wrestling",
} as const;
