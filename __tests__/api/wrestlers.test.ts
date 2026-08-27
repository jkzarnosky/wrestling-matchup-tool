// Tier 3 example for the wrestler routes -- same pattern as __tests__/api/teams.test.ts: mocks
// lib/wrestlers and lib/current-user, tests auth gating + response shape, not business logic
// (already covered at Tier 2 in __tests__/lib/wrestlers.test.ts against real Postgres via pglite).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET } from "../../app/api/teams/[id]/wrestlers/route";
import { POST } from "../../app/api/teams/[id]/wrestlers/import/route";

const { getCurrentUserMock, listWrestlersMock, importWrestlersFromCsvMock } = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  listWrestlersMock: vi.fn(),
  importWrestlersFromCsvMock: vi.fn(),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/wrestlers", async () => {
  const actual = await vi.importActual<typeof import("../../lib/wrestlers")>("../../lib/wrestlers");
  return { ...actual, listWrestlers: listWrestlersMock, importWrestlersFromCsv: importWrestlersFromCsvMock };
});

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function importRequest(csv: unknown) {
  return new NextRequest("http://localhost/api/teams/1/wrestlers/import", {
    method: "POST",
    body: JSON.stringify({ csv }),
    headers: { "Content-Type": "application/json" },
  });
}

beforeEach(() => {
  vi.clearAllMocks();
});

describe("GET /api/teams/[id]/wrestlers", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await GET(new Request("http://localhost"), params("1"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a Team Rep on another team", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 2 });
    const res = await GET(new Request("http://localhost"), params("1"));
    expect(res.status).toBe(403);
    expect(listWrestlersMock).not.toHaveBeenCalled();
  });

  it("returns the roster for a Team Rep's own team", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 1 });
    listWrestlersMock.mockResolvedValue([{ id: 1, firstName: "Sam", lastName: "Rep" }]);
    const res = await GET(new Request("http://localhost"), params("1"));
    expect(res.status).toBe(200);
    expect((await res.json()).wrestlers).toHaveLength(1);
  });
});

describe("POST /api/teams/[id]/wrestlers/import", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await POST(importRequest("team,first_name\n"), params("1"));
    expect(res.status).toBe(401);
    expect(importWrestlersFromCsvMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a Team Rep on another team", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 2 });
    const res = await POST(importRequest("team,first_name\n"), params("1"));
    expect(res.status).toBe(403);
    expect(importWrestlersFromCsvMock).not.toHaveBeenCalled();
  });

  it("returns 400 when csv is missing", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null });
    const res = await POST(importRequest(undefined), params("1"));
    expect(res.status).toBe(400);
  });

  it("imports and returns the summary for an authorized user", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    importWrestlersFromCsvMock.mockResolvedValue({ createdCount: 1, duplicateCount: 0, invalidCount: 0, rows: [] });
    const res = await POST(importRequest("team,first_name\nX,Sam"), params("1"));
    expect(res.status).toBe(200);
    expect((await res.json()).createdCount).toBe(1);
    expect(importWrestlersFromCsvMock).toHaveBeenCalledWith({}, 1, "team,first_name\nX,Sam", 5);
  });
});
