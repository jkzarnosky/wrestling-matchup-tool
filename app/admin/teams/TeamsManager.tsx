"use client";

import { useEffect, useState, type FormEvent } from "react";

interface Team {
  id: number;
  name: string;
  conference: string;
}

export function TeamsManager() {
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [newName, setNewName] = useState("");
  const [newConference, setNewConference] = useState("");
  const [editing, setEditing] = useState<Record<number, { name: string; conference: string }>>({});

  async function loadTeams() {
    try {
      const res = await fetch("/api/teams");
      if (!res.ok) throw new Error("Failed to load teams.");
      const body = await res.json();
      setTeams(body.teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load teams.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Plain fetch-on-mount; not the cascading-render pattern this rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTeams();
  }, []);

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/teams", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newName, conference: newConference }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to create team.");
      }
      setNewName("");
      setNewConference("");
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create team.");
    }
  }

  async function handleUpdate(id: number) {
    const edits = editing[id];
    if (!edits) return;
    setError(null);
    try {
      const res = await fetch(`/api/teams/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to update team.");
      }
      setEditing((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      await loadTeams();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update team.");
    }
  }

  if (loading) return <p>Loading teams…</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleCreate}>
        <h2>Add a team</h2>
        <label htmlFor="new-name">Name</label>
        <input id="new-name" required value={newName} onChange={(event) => setNewName(event.target.value)} />
        <label htmlFor="new-conference">Conference</label>
        <input
          id="new-conference"
          required
          value={newConference}
          onChange={(event) => setNewConference(event.target.value)}
        />
        <button type="submit">Add team</button>
      </form>

      <h2>Existing teams</h2>
      <ul>
        {teams.map((team) => {
          const edits = editing[team.id] ?? { name: team.name, conference: team.conference };
          return (
            <li key={team.id}>
              <input
                aria-label={`Name for ${team.name}`}
                value={edits.name}
                onChange={(event) =>
                  setEditing((prev) => ({ ...prev, [team.id]: { ...edits, name: event.target.value } }))
                }
              />
              <input
                aria-label={`Conference for ${team.name}`}
                value={edits.conference}
                onChange={(event) =>
                  setEditing((prev) => ({ ...prev, [team.id]: { ...edits, conference: event.target.value } }))
                }
              />
              <button type="button" onClick={() => handleUpdate(team.id)}>
                Save
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
