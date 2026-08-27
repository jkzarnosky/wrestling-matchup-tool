// Tier 3 example for the wrestler routes -- same pattern as __tests__/api/teams.test.ts: mocks
// lib/wrestlers and lib/current-user, tests auth gating + response shape, not business logic
// (already covered at Tier 2 in __tests__/lib/wrestlers.test.ts against real Postgres via pglite).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { GET, POST as createWrestlerRoute } from "../../app/api/teams/[id]/wrestlers/route";
import { POST as importRoute } from "../../app/api/teams/[id]/wrestlers/import/route";
import { PATCH } from "../../app/api/teams/[id]/wrestlers/[wrestlerId]/route";

const { getCurrentUserMock, listWrestlersMock, importWrestlersFromCsvMock, createWrestlerMock, updateWrestlerMock, getWrestlerByIdMock } =
  vi.hoisted(() => ({
    getCurrentUserMock: vi.fn(),
    listWrestlersMock: vi.fn(),
    importWrestlersFromCsvMock: vi.fn(),
    createWrestlerMock: vi.fn(),
    updateWrestlerMock: vi.fn(),
    getWrestlerByIdMock: vi.fn(),
  }));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/wrestlers", async () => {
  const actual = await vi.importActual<typeof import("../../lib/wrestlers")>("../../lib/wrestlers");
  return {
    ...actual,
    listWrestlers: listWrestlersMock,
    importWrestlersFromCsv: importWrestlersFromCsvMock,
    createWrestler: createWrestlerMock,
    updateWrestler: updateWrestlerMock,
    getWrestlerById: getWrestlerByIdMock,
  };
});

function params(id: string) {
  return { params: Promise.resolve({ id }) };
}

function wrestlerParams(id: string, wrestlerId: string) {
  return { params: Promise.resolve({ id, wrestlerId }) };
}

function jsonRequest(url: string, body: unknown, method = "POST") {
  return new NextRequest(url, { method, body: JSON.stringify(body), headers: { "Content-Type": "application/json" } });
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

describe("POST /api/teams/[id]/wrestlers (create)", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await createWrestlerRoute(jsonRequest("http://localhost/api/teams/1/wrestlers", {}), params("1"));
    expect(res.status).toBe(401);
    expect(createWrestlerMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a Team Rep on another team", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 2 });
    const res = await createWrestlerRoute(jsonRequest("http://localhost/api/teams/1/wrestlers", {}), params("1"));
    expect(res.status).toBe(403);
    expect(createWrestlerMock).not.toHaveBeenCalled();
  });

  it("creates and returns 201 for an authorized user", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    createWrestlerMock.mockResolvedValue({ id: 1, firstName: "Sam" });
    const res = await createWrestlerRoute(
      jsonRequest("http://localhost/api/teams/1/wrestlers", { first_name: "Sam" }),
      params("1")
    );
    expect(res.status).toBe(201);
    expect(createWrestlerMock).toHaveBeenCalledWith({}, 1, { first_name: "Sam" }, 5);
  });
});

describe("PATCH /api/teams/[id]/wrestlers/[wrestlerId]", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await PATCH(jsonRequest("http://localhost", {}, "PATCH"), wrestlerParams("1", "10"));
    expect(res.status).toBe(401);
  });

  it("returns 403 for a Team Rep on another team", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 2 });
    const res = await PATCH(jsonRequest("http://localhost", {}, "PATCH"), wrestlerParams("1", "10"));
    expect(res.status).toBe(403);
    expect(getWrestlerByIdMock).not.toHaveBeenCalled();
  });

  it("returns 404 when the wrestler belongs to a different team than the URL", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null });
    getWrestlerByIdMock.mockResolvedValue({ id: 10, teamId: 999 });
    const res = await PATCH(jsonRequest("http://localhost", {}, "PATCH"), wrestlerParams("1", "10"));
    expect(res.status).toBe(404);
    expect(updateWrestlerMock).not.toHaveBeenCalled();
  });

  it("updates and returns the wrestler for an authorized user", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    getWrestlerByIdMock.mockResolvedValue({ id: 10, teamId: 1 });
    updateWrestlerMock.mockResolvedValue({ id: 10, weightLbs: 60 });
    const res = await PATCH(jsonRequest("http://localhost", { weight: "60" }, "PATCH"), wrestlerParams("1", "10"));
    expect(res.status).toBe(200);
    expect(updateWrestlerMock).toHaveBeenCalledWith({}, 10, { weight: "60" }, 5);
  });
});

describe("POST /api/teams/[id]/wrestlers/import", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await importRoute(
      jsonRequest("http://localhost/api/teams/1/wrestlers/import", { csv: "team,first_name\n" }),
      params("1")
    );
    expect(res.status).toBe(401);
    expect(importWrestlersFromCsvMock).not.toHaveBeenCalled();
  });

  it("returns 403 for a Team Rep on another team", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 2 });
    const res = await importRoute(
      jsonRequest("http://localhost/api/teams/1/wrestlers/import", { csv: "team,first_name\n" }),
      params("1")
    );
    expect(res.status).toBe(403);
    expect(importWrestlersFromCsvMock).not.toHaveBeenCalled();
  });

  it("returns 400 when csv is missing", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null });
    const res = await importRoute(jsonRequest("http://localhost/api/teams/1/wrestlers/import", {}), params("1"));
    expect(res.status).toBe(400);
  });

  it("imports and returns the summary for an authorized user", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    importWrestlersFromCsvMock.mockResolvedValue({ createdCount: 1, duplicateCount: 0, invalidCount: 0, rows: [] });
    const res = await importRoute(
      jsonRequest("http://localhost/api/teams/1/wrestlers/import", { csv: "team,first_name\nX,Sam" }),
      params("1")
    );
    expect(res.status).toBe(200);
    expect((await res.json()).createdCount).toBe(1);
    expect(importWrestlersFromCsvMock).toHaveBeenCalledWith({}, 1, "team,first_name\nX,Sam", 5);
  });
});
