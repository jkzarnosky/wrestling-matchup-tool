import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/current-user";
import { ValidationError, createMatchupRun } from "@/lib/matchup-runs";

// No team-scoping gate here beyond "logged in" -- unlike wrestler/CSV routes, a matchup run's
// whole point is picking teams other than your own to attend. See DECISIONS.md's cross-team
// read-access call from the Epic 2 AC review.
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const body = await request.json().catch(() => null);
  const teamIds = Array.isArray(body?.teamIds) ? body.teamIds : null;
  if (!teamIds) {
    return NextResponse.json({ error: "teamIds (array) is required." }, { status: 400 });
  }

  try {
    const run = await createMatchupRun(db, teamIds, user.id);
    return NextResponse.json({ run }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
