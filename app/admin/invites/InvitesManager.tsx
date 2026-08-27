"use client";

import { useEffect, useState, type FormEvent } from "react";

interface Team {
  id: number;
  name: string;
}

interface Invite {
  id: number;
  email: string;
  role: "admin" | "team_rep";
  teamId: number | null;
  expiresAt: string;
  acceptedAt: string | null;
}

export function InvitesManager() {
  const [invites, setInvites] = useState<Invite[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "team_rep">("team_rep");
  const [teamId, setTeamId] = useState<string>("");

  async function loadAll() {
    try {
      const [invitesRes, teamsRes] = await Promise.all([fetch("/api/invites"), fetch("/api/teams")]);
      if (!invitesRes.ok || !teamsRes.ok) throw new Error("Failed to load invites.");
      setInvites((await invitesRes.json()).invites);
      setTeams((await teamsRes.json()).teams);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load invites.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Plain fetch-on-mount; not the cascading-render pattern this rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAll();
  }, []);

  async function handleInvite(event: FormEvent) {
    event.preventDefault();
    setError(null);
    try {
      const res = await fetch("/api/invites", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, role, teamId: role === "team_rep" ? Number(teamId) : null }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to send invite.");
      }
      setEmail("");
      setTeamId("");
      await loadAll();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to send invite.");
    }
  }

  if (loading) return <p>Loading invites…</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <form onSubmit={handleInvite}>
        <h2>Invite someone</h2>
        <label htmlFor="invite-email">Email</label>
        <input id="invite-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} />

        <label htmlFor="invite-role">Role</label>
        <select
          id="invite-role"
          value={role}
          onChange={(event) => setRole(event.target.value as "admin" | "team_rep")}
        >
          <option value="team_rep">Team Rep</option>
          <option value="admin">Admin</option>
        </select>

        {role === "team_rep" && (
          <>
            <label htmlFor="invite-team">Team</label>
            <select id="invite-team" required value={teamId} onChange={(event) => setTeamId(event.target.value)}>
              <option value="" disabled>
                Select a team
              </option>
              {teams.map((team) => (
                <option key={team.id} value={team.id}>
                  {team.name}
                </option>
              ))}
            </select>
          </>
        )}

        <button type="submit">Send invite</button>
      </form>

      <h2>Sent invites</h2>
      <ul>
        {invites.map((invite) => {
          // Client-only display label, not SSR'd -- a stale "now" on re-render has no
          // correctness impact here, just a label that updates next fetch.
          // eslint-disable-next-line react-hooks/purity
          const isExpired = !invite.acceptedAt && new Date(invite.expiresAt).getTime() <= Date.now();
          const status = invite.acceptedAt ? "Accepted" : isExpired ? "Expired" : "Pending";
          return (
            <li key={invite.id}>
              {invite.email} — {invite.role} — {status}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
