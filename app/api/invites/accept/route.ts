import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { ValidationError, acceptInvite } from "@/lib/invites";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const token = body?.token;
  if (!token || typeof token !== "string") {
    return NextResponse.json({ error: "Invite token is required." }, { status: 400 });
  }

  let cookieValue: string | null;
  try {
    cookieValue = await acceptInvite(db, token, { firstName: body?.firstName, lastName: body?.lastName });
  } catch (error) {
    if (error instanceof ValidationError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    throw error;
  }

  if (!cookieValue) {
    return NextResponse.json({ error: "This invite link is invalid, already used, or expired." }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, cookieValue, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });

  return NextResponse.json({ ok: true });
}
