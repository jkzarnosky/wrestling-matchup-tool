"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";

interface Team {
  id: number;
  name: string;
  conference: string;
}

const MIN_TEAMS = 2;
const MAX_TEAMS = 4;

export function SelectAttendingTeams({ teams }: { teams: Team[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  function toggle(teamId: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(teamId)) {
        next.delete(teamId);
      } else {
        next.add(teamId);
      }
      return next;
    });
  }

  const count = selected.size;
  const inRange = count >= MIN_TEAMS && count <= MAX_TEAMS;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!inRange) return;

    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/matchup-runs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teamIds: [...selected] }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create matchup run.");
      }
      const body = await res.json();
      router.push(`/matchups/${body.run.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create matchup run.");
      setSubmitting(false);
    }
  }

  if (teams.length === 0) {
    return <p>No teams exist yet. Create some on the Teams page first.</p>;
  }

  return (
    <form onSubmit={handleSubmit}>
      {error && <p role="alert">{error}</p>}

      <fieldset>
        <legend>Attending teams ({count} selected)</legend>
        {teams.map((team) => (
          <label key={team.id} style={{ display: "block" }}>
            <input type="checkbox" checked={selected.has(team.id)} onChange={() => toggle(team.id)} />
            {team.name} ({team.conference})
          </label>
        ))}
      </fieldset>

      {!inRange && count > 0 && <p>Select between {MIN_TEAMS} and {MAX_TEAMS} teams.</p>}

      <button type="submit" disabled={!inRange || submitting}>
        {submitting ? "Creating…" : "Continue"}
      </button>
    </form>
  );
}
