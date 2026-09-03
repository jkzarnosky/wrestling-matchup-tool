import { describe, expect, it } from "vitest";

describe("CI failure smoke test (throwaway, will not merge)", () => {
  it("deliberately fails to verify the required check actually goes red", () => {
    expect(1).toBe(2);
  });
});
