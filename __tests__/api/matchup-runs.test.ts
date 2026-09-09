// Tier 3 example for the matchup-runs route -- same pattern as __tests__/api/teams.test.ts: mocks
// lib/matchup-runs and lib/current-user, tests auth gating + response shape, not business logic
// (already covered at Tier 2 in __tests__/lib/matchup-runs.test.ts against real Postgres via pglite).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/matchup-runs/route";
import { ValidationError } from "../../lib/matchup-runs";

const { getCurrentUserMock, createMatchupRunMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  createMatchupRunMock: vi.fn(),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/matchup-runs", async () => {
  const actual = await vi.importActual<typeof import("../../lib/matchup-runs")>("../../lib/matchup-runs");
  return { ...actual, createMatchupRun: createMatchupRunMock };
});

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/matchup-runs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("POST /api/matchup-runs", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await POST(postRequest({ teamIds: [1, 2] }));
    expect(res.status).toBe(401);
    expect(createMatchupRunMock).not.toHaveBeenCalled();
  });

  it("returns 400 when teamIds is missing", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    const res = await POST(postRequest({}));
    expect(res.status).toBe(400);
    expect(createMatchupRunMock).not.toHaveBeenCalled();
  });

  it("creates and returns 201 for a Team Rep selecting other teams", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 1, id: 7 });
    createMatchupRunMock.mockResolvedValue({ id: 1, createdBy: 7, teams: [{ id: 2 }, { id: 3 }] });

    const res = await POST(postRequest({ teamIds: [2, 3] }));
    expect(res.status).toBe(201);
    expect((await res.json()).run.id).toBe(1);
    expect(createMatchupRunMock).toHaveBeenCalledWith({}, [2, 3], 7);
  });

  it("returns 400 with the validation message when the lib rejects the selection", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    createMatchupRunMock.mockRejectedValue(new ValidationError("Select between 2 and 4 attending teams."));

    const res = await POST(postRequest({ teamIds: [1] }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Select between 2 and 4 attending teams.");
  });
});
