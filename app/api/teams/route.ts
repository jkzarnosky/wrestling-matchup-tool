import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/authorization";
import { getCurrentUser } from "@/lib/current-user";
import { ValidationError, createTeam, listTeams } from "@/lib/teams";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const teams = await listTeams(db);
  return NextResponse.json({ teams });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const auth = requireAdmin(user);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  try {
    const team = await createTeam(db, { name: body?.name, conference: body?.conference });
    return NextResponse.json({ team }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
