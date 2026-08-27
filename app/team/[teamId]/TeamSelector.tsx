"use client";

import { useRouter } from "next/navigation";

interface Team {
  id: number;
  name: string;
}

export function TeamSelector({ teams, currentTeamId }: { teams: Team[]; currentTeamId: number }) {
  const router = useRouter();

  return (
    <label>
      Viewing team:{" "}
      <select value={currentTeamId} onChange={(event) => router.push(`/team/${event.target.value}`)}>
        {teams.map((team) => (
          <option key={team.id} value={team.id}>
            {team.name}
          </option>
        ))}
      </select>
    </label>
  );
}
