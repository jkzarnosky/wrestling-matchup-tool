import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/current-user";
import { getMatchupRunById } from "@/lib/matchup-runs";

export default async function MatchupRunPage({ params }: { params: Promise<{ runId: string }> }) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const { runId } = await params;
  const run = await getMatchupRunById(db, Number(runId));
  if (!run) {
    return (
      <main>
        <h1>Matchup run not found</h1>
      </main>
    );
  }

  return (
    <main>
      <h1>Weekly matchup run #{run.id}</h1>
      <h2>Attending teams</h2>
      <ul>
        {run.teams.map((team) => (
          <li key={team.id}>
            {team.name} ({team.conference})
          </li>
        ))}
      </ul>
      <p>Thresholds and generated matchups are coming in a future story.</p>
    </main>
  );
}
