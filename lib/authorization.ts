interface AuthorizableUser {
  role: "admin" | "team_rep";
  teamId: number | null;
}

/** Admin can view any team; Team Rep only their own. Also the write-scoping rule for that team's
 * data (wrestlers, CSV import) -- the AC for viewing and editing a team's roster is the same
 * "Admin any team, Team Rep own team only" rule, so this gates both rather than duplicating it. */
export function canViewTeam(user: AuthorizableUser, teamId: number): boolean {
  return user.role === "admin" || user.teamId === teamId;
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
