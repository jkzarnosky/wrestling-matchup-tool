import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { requireAdmin } from "@/lib/authorization";
import { getCurrentUser } from "@/lib/current-user";
import { ValidationError, createInvite, listInvites } from "@/lib/invites";

export async function GET() {
  const user = await getCurrentUser();
  const auth = requireAdmin(user);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const invites = await listInvites(db);
  return NextResponse.json({ invites });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  const auth = requireAdmin(user);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const body = await request.json().catch(() => null);
  try {
    const invite = await createInvite(db, { email: body?.email, role: body?.role, teamId: body?.teamId });
    return NextResponse.json({ invite }, { status: 201 });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }
}
