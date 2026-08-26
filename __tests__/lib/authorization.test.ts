import { describe, expect, it } from "vitest";
import { requireAdmin } from "../../lib/authorization";

describe("requireAdmin", () => {
  it("rejects no user with 401", () => {
    expect(requireAdmin(null)).toEqual({ ok: false, status: 401, error: "Not logged in." });
  });

  it("rejects a Team Rep with 403", () => {
    expect(requireAdmin({ role: "team_rep" })).toEqual({ ok: false, status: 403, error: "Admins only." });
  });

  it("allows an Admin", () => {
    expect(requireAdmin({ role: "admin" })).toEqual({ ok: true });
  });
});
