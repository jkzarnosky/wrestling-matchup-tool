interface AuthorizableUser {
  role: "admin" | "team_rep";
  teamId: number | null;
}

/** Admin can view any team; Team Rep only their own. */
export function canViewTeam(user: AuthorizableUser, teamId: number): boolean {
  return user.role === "admin" || user.teamId === teamId;
}
