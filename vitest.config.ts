import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    exclude: ["node_modules/**", ".next/**"],
    setupFiles: ["./vitest.setup.ts"],
    // JUnit output only in CI -- local runs stay plain console output, no stray XML files.
    reporters: process.env.CI ? ["default", "junit"] : ["default"],
    outputFile: {
      junit: "./test-results/junit.xml",
    },
  },
});
