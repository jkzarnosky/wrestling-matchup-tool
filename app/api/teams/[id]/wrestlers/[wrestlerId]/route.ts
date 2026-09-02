import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { canViewTeam } from "@/lib/authorization";
import { getCurrentUser } from "@/lib/current-user";
import { ValidationError, getWrestlerById, updateWrestler } from "@/lib/wrestlers";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string; wrestlerId: string }> }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });

  const { id, wrestlerId } = await params;
  const teamId = Number(id);
  if (!canViewTeam(user, teamId)) {
    return NextResponse.json({ error: "You can only edit wrestlers on your own team." }, { status: 403 });
  }

  // Defense in depth: confirm the wrestler actually belongs to the team in the URL, not just
  // that the caller has access to *some* team by that id.
  const existing = await getWrestlerById(db, Number(wrestlerId));
  if (!existing || existing.teamId !== teamId) {
    return NextResponse.json({ error: "Wrestler not found." }, { status: 404 });
  }

  const body = await request.json().catch(() => null);
  try {
    const wrestler = await updateWrestler(db, Number(wrestlerId), body ?? {}, user.id);
    return NextResponse.json({ wrestler });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
