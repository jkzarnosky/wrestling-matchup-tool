import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/db";
import { destroySession } from "@/lib/auth";
import { SESSION_COOKIE_NAME } from "@/lib/session-cookie";

export async function POST() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  await destroySession(db, cookieValue);
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
