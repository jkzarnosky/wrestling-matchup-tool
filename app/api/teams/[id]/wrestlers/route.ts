import { NextResponse } from "next/server";
import { db } from "@/db";
import { canViewTeam } from "@/lib/authorization";
import { getCurrentUser } from "@/lib/current-user";
import { listWrestlers } from "@/lib/wrestlers";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { id } = await params;
  const teamId = Number(id);
  if (!canViewTeam(user, teamId)) {
    return NextResponse.json({ error: "You can only view your own team." }, { status: 403 });
  }

  const wrestlers = await listWrestlers(db, teamId);
  return NextResponse.json({ wrestlers });
}
