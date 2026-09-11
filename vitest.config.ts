import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  resolve: {
    // Matches tsconfig's "@/*" path alias, so route-handler tests can import "@/db",
    // "@/lib/..." etc. the same way the app code does.
    alias: {
      "@": rootDir,
    },
  },
  test: {
    environment: "node",
    // e2e/** is Playwright's, not Vitest's -- its .spec.ts files import @playwright/test.
    exclude: ["node_modules/**", ".next/**", "e2e/**"],
    setupFiles: ["./vitest.setup.ts"],
    // JUnit output only in CI -- local runs stay plain console output, no stray XML files.
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
  },
});
