import { NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/current-user";
import { generateMatchupRunPairings } from "@/lib/matchup-generation";
import { ValidationError, getMatchupRunById } from "@/lib/matchup-runs";

// Same "no team-scoping gate beyond logged in" call as the other matchup-run routes -- see DECISIONS.md.
export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { id } = await params;
  const runId = Number(id);

  const existing = await getMatchupRunById(db, runId);
  if (!existing) return NextResponse.json({ error: "Matchup run not found." }, { status: 404 });

  try {
    const sheet = await generateMatchupRunPairings(db, runId);
    return NextResponse.json(sheet);
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
