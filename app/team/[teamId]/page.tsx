import { redirect } from "next/navigation";
import { db } from "@/db";
import { canViewTeam } from "@/lib/authorization";
import { getCurrentUser } from "@/lib/current-user";
import { getTeamById, listTeams } from "@/lib/teams";
import { TeamSelector } from "./TeamSelector";

export default async function TeamPage({ params }: { params: Promise<{ teamId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { teamId } = await params;
  const requestedId = Number(teamId);

  // Team Rep is hard-scoped to their own team -- blocked server-side, not just hidden in the UI.
  // The server never even queries the other team's data, let alone sends it to the client.
  if (!canViewTeam(user, requestedId)) {
    return (
      <main>
        <h1>Forbidden</h1>
        <p>You can only view your own team.</p>
      </main>
    );
  }

  const team = await getTeamById(db, requestedId);
  if (!team) {
    return (
      <main>
        <h1>Team not found</h1>
      </main>
    );
  }

  const allTeams = user.role === "admin" ? await listTeams(db) : null;

  return (
    <main>
      <h1>{team.name}</h1>
      <p>Conference: {team.conference}</p>

      {allTeams && <TeamSelector teams={allTeams} currentTeamId={team.id} />}

      <section>
        <h2>Roster</h2>
        <p>Coming soon -- Epic 1 (wrestler data model).</p>
      </section>

      <section>
        <h2>Import roster from CSV</h2>
        <p>Coming soon -- Epic 1.</p>
      </section>

      <section>
        <h2>Edit wrestler</h2>
        <p>Coming soon -- Epic 1.</p>
      </section>
    </main>
  );
}
