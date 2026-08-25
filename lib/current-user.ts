import { cookies } from "next/headers";
import { db } from "@/db";
import { getSessionUser } from "./auth";
import { SESSION_COOKIE_NAME } from "./session-cookie";

/** Server-side helper for pages/route handlers: resolves the logged-in user from the request's
 * session cookie, or null if not logged in / session invalid or expired. */
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const cookieValue = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return getSessionUser(db, cookieValue);
}
