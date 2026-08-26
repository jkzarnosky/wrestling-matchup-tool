interface AuthorizableUser {
  role: "admin" | "team_rep";
}

type AuthResult = { ok: true } | { ok: false; status: 401 | 403; error: string };

/** Route-level admin gate: null user -> 401, logged in but not Admin -> 403. Pulled out of the
 * route handlers so the actual authorization decision is unit-tested directly, not just implied
 * by "the route returned a status code" in a manual browser check. */
export function requireAdmin(user: AuthorizableUser | null): AuthResult {
  if (!user) return { ok: false, status: 401, error: "Not logged in." };
  if (user.role !== "admin") return { ok: false, status: 403, error: "Admins only." };
  return { ok: true };
}
