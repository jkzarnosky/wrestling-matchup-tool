import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/current-user";
import { ValidationError, getMatchupRunById, setMatchupRunThresholds } from "@/lib/matchup-runs";

// Same "no team-scoping gate beyond logged in" call as POST /api/matchup-runs -- see DECISIONS.md.
export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { id } = await params;
  const runId = Number(id);

  // Checked explicitly here (not just left to setMatchupRunThresholds's own existence check) so a
  // bad run id is a 404, not a 400 -- the same "route checks existence, 404s; lib throws
  // ValidationError for everything else" split used by the wrestler PATCH route.
  const existing = await getMatchupRunById(db, runId);
  if (!existing) return NextResponse.json({ error: "Matchup run not found." }, { status: 404 });

  const body = await request.json().catch(() => null);

  try {
    const run = await setMatchupRunThresholds(db, runId, body ?? {});
    return NextResponse.json({ run });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
