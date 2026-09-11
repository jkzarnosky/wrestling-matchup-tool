// Tier 3 example for the matchup-runs route -- same pattern as __tests__/api/teams.test.ts: mocks
// lib/matchup-runs and lib/current-user, tests auth gating + response shape, not business logic
// (already covered at Tier 2 in __tests__/lib/matchup-runs.test.ts against real Postgres via pglite).
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { POST } from "../../app/api/matchup-runs/route";
import { PATCH } from "../../app/api/matchup-runs/[id]/route";
import { POST as generatePost } from "../../app/api/matchup-runs/[id]/generate/route";
import { ValidationError } from "../../lib/matchup-runs";

const {
  getCurrentUserMock,
  createMatchupRunMock,
  getMatchupRunByIdMock,
  setMatchupRunThresholdsMock,
  generateMatchupRunPairingsMock,
} = vi.hoisted(() => ({
  getCurrentUserMock: vi.fn(),
  createMatchupRunMock: vi.fn(),
  getMatchupRunByIdMock: vi.fn(),
  setMatchupRunThresholdsMock: vi.fn(),
  generateMatchupRunPairingsMock: vi.fn(),
}));

vi.mock("@/db", () => ({ db: {} }));
vi.mock("@/lib/current-user", () => ({ getCurrentUser: getCurrentUserMock }));
vi.mock("@/lib/matchup-runs", async () => {
  const actual = await vi.importActual<typeof import("../../lib/matchup-runs")>("../../lib/matchup-runs");
  return {
    ...actual,
    createMatchupRun: createMatchupRunMock,
    getMatchupRunById: getMatchupRunByIdMock,
    setMatchupRunThresholds: setMatchupRunThresholdsMock,
  };
});
vi.mock("@/lib/matchup-generation", async () => {
  const actual = await vi.importActual<typeof import("../../lib/matchup-generation")>("../../lib/matchup-generation");
  return { ...actual, generateMatchupRunPairings: generateMatchupRunPairingsMock };
});

function postRequest(body: unknown) {
  return new NextRequest("http://localhost/api/matchup-runs", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function patchRequest(id: string, body: unknown) {
  return {
    request: new NextRequest(`http://localhost/api/matchup-runs/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
      headers: { "Content-Type": "application/json" },
    }),
    params: { params: Promise.resolve({ id }) },
  };
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

const validThresholds = { ageDiffYears: 1, skillDiffLevels: 1, weightDiffMode: "percent", weightDiffValue: 10, matCount: 3 };

describe("PATCH /api/matchup-runs/[id]", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const { request, params } = patchRequest("1", validThresholds);
    const res = await PATCH(request, params);
    expect(res.status).toBe(401);
    expect(setMatchupRunThresholdsMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a nonexistent run", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    getMatchupRunByIdMock.mockResolvedValue(null);

    const { request, params } = patchRequest("999", validThresholds);
    const res = await PATCH(request, params);
    expect(res.status).toBe(404);
    expect(setMatchupRunThresholdsMock).not.toHaveBeenCalled();
  });

  it("sets thresholds and returns the updated run", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 1, id: 7 });
    getMatchupRunByIdMock.mockResolvedValue({ id: 1, createdBy: 7, teams: [] });
    setMatchupRunThresholdsMock.mockResolvedValue({ id: 1, ...validThresholds });

    const { request, params } = patchRequest("1", validThresholds);
    const res = await PATCH(request, params);
    expect(res.status).toBe(200);
    expect((await res.json()).run).toMatchObject(validThresholds);
    expect(setMatchupRunThresholdsMock).toHaveBeenCalledWith({}, 1, validThresholds);
  });

  it("returns 400 with the validation message when the lib rejects a threshold value", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    getMatchupRunByIdMock.mockResolvedValue({ id: 1, createdBy: 5, teams: [] });
    setMatchupRunThresholdsMock.mockRejectedValue(new ValidationError("Number of mats must be a positive whole number."));

    const { request, params } = patchRequest("1", { ...validThresholds, matCount: 0 });
    const res = await PATCH(request, params);
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Number of mats must be a positive whole number.");
  });
});

function idParams(id: string) {
  return { params: Promise.resolve({ id }) };
}

describe("POST /api/matchup-runs/[id]/generate", () => {
  it("returns 401 when not logged in", async () => {
    getCurrentUserMock.mockResolvedValue(null);
    const res = await generatePost(new Request("http://localhost"), idParams("1"));
    expect(res.status).toBe(401);
    expect(generateMatchupRunPairingsMock).not.toHaveBeenCalled();
  });

  it("returns 404 for a nonexistent run", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    getMatchupRunByIdMock.mockResolvedValue(null);

    const res = await generatePost(new Request("http://localhost"), idParams("999"));
    expect(res.status).toBe(404);
    expect(generateMatchupRunPairingsMock).not.toHaveBeenCalled();
  });

  it("generates and returns the sheet", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "team_rep", teamId: 1, id: 7 });
    getMatchupRunByIdMock.mockResolvedValue({ id: 1, createdBy: 7, teams: [] });
    const sheet = { pairings: [{ matNumber: 1, wrestlerOne: { id: 1 }, wrestlerTwo: { id: 2 } }], outliers: [] };
    generateMatchupRunPairingsMock.mockResolvedValue(sheet);

    const res = await generatePost(new Request("http://localhost"), idParams("1"));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual(sheet);
    expect(generateMatchupRunPairingsMock).toHaveBeenCalledWith({}, 1);
  });

  it("returns 400 with the validation message when thresholds aren't set", async () => {
    getCurrentUserMock.mockResolvedValue({ role: "admin", teamId: null, id: 5 });
    getMatchupRunByIdMock.mockResolvedValue({ id: 1, createdBy: 5, teams: [] });
    generateMatchupRunPairingsMock.mockRejectedValue(new ValidationError("Set thresholds before generating matchups."));

    const res = await generatePost(new Request("http://localhost"), idParams("1"));
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Set thresholds before generating matchups.");
  });
});
