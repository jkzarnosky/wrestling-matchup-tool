import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { verifyLoginCode } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  const code = body?.code;
  if (!email || !code || typeof email !== "string" || typeof code !== "string") {
    return NextResponse.json({ error: "Email and code are required." }, { status: 400 });
  }

  const cookieValue = await verifyLoginCode(db, email, code);
  if (!cookieValue) {
    return NextResponse.json({ error: "Invalid or expired code." }, { status: 401 });
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
