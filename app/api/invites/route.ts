import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/current-user";
import { ValidationError, createInvite, listInvites } from "@/lib/invites";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

  const invites = await listInvites(db);
  return NextResponse.json({ invites });
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Not logged in." }, { status: 401 });
  if (user.role !== "admin") return NextResponse.json({ error: "Admins only." }, { status: 403 });

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
