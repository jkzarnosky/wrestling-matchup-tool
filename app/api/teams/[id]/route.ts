import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/authorization";
import { getCurrentUser } from "@/lib/current-user";
import { ValidationError, updateTeam } from "@/lib/teams";

export async function PATCH(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  const auth = requireAdmin(user);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const { id } = await params;
  const body = await request.json().catch(() => null);

  try {
    const team = await updateTeam(db, Number(id), { name: body?.name, conference: body?.conference });
    return NextResponse.json({ team });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Team not found." }, { status: 404 });
  }
}
