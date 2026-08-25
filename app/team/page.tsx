import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/current-user";
import { listTeams } from "@/lib/teams";

// Entry point for "the team base page" -- resolves to the right /team/[teamId] for whoever's
// logged in: a Team Rep always lands on their own team, an Admin lands on the first team (or a
// pick-a-team message if none exist yet).
export default async function TeamIndexPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  if (user.role === "team_rep") {
    redirect(`/team/${user.teamId}`);
  }

  const teams = await listTeams(db);
  if (teams.length === 0) {
    return (
      <main>
        <h1>No teams yet</h1>
        <p>
          Create one on the <a href="/admin/teams">Teams</a> page first.
        </p>
      </main>
    );
  }

  redirect(`/team/${teams[0].id}`);
}
