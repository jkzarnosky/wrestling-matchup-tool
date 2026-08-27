// Tier 3 (route/API) example: tests the HTTP wiring of app/api/teams/route.ts -- auth gating,
// request parsing, response shape/status codes -- with lib/teams and the db mocked out. The
// business logic those lib functions implement is already covered at Tier 2
// (__tests__/lib/teams.test.ts against real Postgres via pglite); this layer isn't meant to
// re-prove that, just prove the route calls it correctly and translates the result correctly.
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST } from "../../app/api/teams/route";
import { ValidationError } from "../../lib/teams";

const { getCurrentUserMock, listTeamsMock, createTeamMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  listTeamsMock: vi.fn(),
  createTeamMock: vi.fn(),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/teams", async () => {
  const actual = await vi.importActual<typeof import("../../lib/teams")>("../../lib/teams");
  return { ...actual, listTeams: listTeamsMock, createTeam: createTeamMock };
});

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/teams", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/teams", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await GET();
    expect(res.status).toBe(401);
  });

  it("returns the team list for any logged-in user", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 1 });
    listTeamsMock.mockResolvedValue([{ id: 1, name: "Ironclad", conference: "National" }]);
    const res = await GET();
    expect(res.status).toBe(200);
    expect((await res.json()).teams).toHaveLength(1);
  });
});

describe("POST /api/teams", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await POST(postRequest({ name: "X", conference: "Y" }));
    expect(res.status).toBe(401);
    expect(createTeamMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a Team Rep", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 1 });
    const res = await POST(postRequest({ name: "X", conference: "Y" }));
    expect(res.status).toBe(403);
    expect(createTeamMock).not.toHaveBeenCalled();
  });

  it("creates a team for an Admin and returns 201", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null });
    createTeamMock.mockResolvedValue({ id: 1, name: "X", conference: "Y" });
    const res = await POST(postRequest({ name: "X", conference: "Y" }));
    expect(res.status).toBe(201);
    expect(createTeamMock).toHaveBeenCalledWith({}, { name: "X", conference: "Y" });
  });

  it("returns 400 when lib/teams rejects with ValidationError", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null });
    createTeamMock.mockRejectedValue(new ValidationError("Team name is required."));
    const res = await POST(postRequest({ name: "", conference: "Y" }));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Team name is required.");
  });
});
