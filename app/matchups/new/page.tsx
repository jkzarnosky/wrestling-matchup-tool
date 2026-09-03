import { redirect } from "next/navigation";
import { db } from "@/db";
import { getCurrentUser } from "@/lib/current-user";
import { listTeams } from "@/lib/teams";
import { SelectAttendingTeams } from "./SelectAttendingTeams";

// Any logged-in user (Admin or Team Rep) can host a run and select any team in the league to
// attend -- there's no team-scoping gate here the way there is on /team/[teamId], since the whole
// point of this page is picking teams other than your own. See DECISIONS.md.
export default async function NewMatchupRunPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  const teams = await listTeams(db);

  return (
    <main>
      <h1>New weekly matchup run</h1>
      <p>Select 2–4 attending teams for this week.</p>
      <SelectAttendingTeams teams={teams} />
    </main>
  );
}
