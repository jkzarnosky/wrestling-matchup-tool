import { describe, expect, it } from "vitest";
import { canViewTeam } from "../../lib/authorization";

describe("canViewTeam", () => {
  it("allows an Admin to view any team", () => {
    expect(canViewTeam({ role: "admin", teamId: null }, 1)).toBe(true);
    expect(canViewTeam({ role: "admin", teamId: null }, 999)).toBe(true);
  });

  it("allows a Team Rep to view their own team", () => {
    expect(canViewTeam({ role: "team_rep", teamId: 5 }, 5)).toBe(true);
  });

  it("blocks a Team Rep from viewing another team", () => {
    expect(canViewTeam({ role: "team_rep", teamId: 5 }, 6)).toBe(false);
  });
});
