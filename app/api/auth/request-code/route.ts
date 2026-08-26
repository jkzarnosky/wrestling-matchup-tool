import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db";
import { RateLimitError, requestLoginCode } from "@/lib/auth";

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  const email = body?.email;
  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required." }, { status: 400 });
  }

  const ip = request.headers.get("x-forwarded-for") ?? undefined;

  try {
    await requestLoginCode(db, email, ip);
  } catch (error) {
    if (error instanceof RateLimitError) {
      return NextResponse.json({ error: error.message }, { status: 429 });
    }
    throw error;
  }

  // Same response whether or not the email is registered -- doesn't reveal who has an account.
  return NextResponse.json({ ok: true });
}
