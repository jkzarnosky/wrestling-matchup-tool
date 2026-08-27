"use client";

import { useEffect, useState, type FormEvent } from "react";

interface Wrestler {
  id: number;
  firstName: string;
  lastName: string;
  birthday: string;
  weightLbs: number;
  skillLevel: number;
  sex: "M" | "F";
}

interface RowOutcome {
  row: number;
  status: "created" | "duplicate" | "invalid";
  reason?: string;
}

interface ImportSummary {
  createdCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: RowOutcome[];
}

const BLANK_FORM = { first_name: "", last_name: "", birthday: "", weight: "", skill_level: "", sex: "M" };

export function WrestlerManager({ teamId }: { teamId: number }) {
  const [roster, setRoster] = useState<Wrestler[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [newWrestler, setNewWrestler] = useState(BLANK_FORM);
  const [editing, setEditing] = useState<Record<number, typeof BLANK_FORM>>({});

  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importSummary, setImportSummary] = useState<ImportSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function loadRoster() {
    try {
      const res = await fetch(`/api/teams/${teamId}/wrestlers`);
      if (!res.ok) throw new Error("Failed to load roster.");
      setRoster((await res.json()).wrestlers);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load roster.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Plain fetch-on-mount (re-running if teamId changes); not the cascading-render pattern
    // this rule is meant to catch.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [teamId]);

  function toFormValues(w: Wrestler) {
    return {
      first_name: w.firstName,
      last_name: w.lastName,
      birthday: w.birthday,
      weight: String(w.weightLbs),
      skill_level: String(w.skillLevel),
      sex: w.sex,
    };
  }

  async function handleAdd(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/teams/${teamId}/wrestlers`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newWrestler),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to add wrestler.");
      setNewWrestler(BLANK_FORM);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to add wrestler.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleUpdate(wrestlerId: number) {
    const edits = editing[wrestlerId];
    if (!edits) return;
    setError(null);
    try {
      const res = await fetch(`/api/teams/${teamId}/wrestlers/${wrestlerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(edits),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Failed to update wrestler.");
      setEditing((prev) => {
        const next = { ...prev };
        delete next[wrestlerId];
        return next;
      });
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update wrestler.");
    }
  }

  async function handleImport(event: FormEvent) {
    event.preventDefault();
    if (!csvFile) return;
    setError(null);
    setImportSummary(null);
    setSubmitting(true);
    try {
      const csv = await csvFile.text();
      const res = await fetch(`/api/teams/${teamId}/wrestlers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Import failed.");
      setImportSummary(body);
      await loadRoster();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) return <p>Loading roster…</p>;

  return (
    <div>
      {error && <p role="alert">{error}</p>}

      <section>
        <h2>Roster ({roster.length})</h2>
        {roster.length === 0 ? (
          <p>No wrestlers yet.</p>
        ) : (
          <ul>
            {roster.map((w) => {
              const edits = editing[w.id] ?? toFormValues(w);
              const isEditing = w.id in editing;
              return (
                <li key={w.id}>
                  {isEditing ? (
                    <>
                      <input
                        aria-label={`First name for ${w.firstName} ${w.lastName}`}
                        value={edits.first_name}
                        onChange={(e) => setEditing((p) => ({ ...p, [w.id]: { ...edits, first_name: e.target.value } }))}
                      />
                      <input
                        aria-label={`Last name for ${w.firstName} ${w.lastName}`}
                        value={edits.last_name}
                        onChange={(e) => setEditing((p) => ({ ...p, [w.id]: { ...edits, last_name: e.target.value } }))}
                      />
                      <input
                        aria-label={`Birthday for ${w.firstName} ${w.lastName}`}
                        value={edits.birthday}
                        onChange={(e) => setEditing((p) => ({ ...p, [w.id]: { ...edits, birthday: e.target.value } }))}
                      />
                      <input
                        aria-label={`Weight for ${w.firstName} ${w.lastName}`}
                        value={edits.weight}
                        onChange={(e) => setEditing((p) => ({ ...p, [w.id]: { ...edits, weight: e.target.value } }))}
                      />
                      <select
                        aria-label={`Skill level for ${w.firstName} ${w.lastName}`}
                        value={edits.skill_level}
                        onChange={(e) => setEditing((p) => ({ ...p, [w.id]: { ...edits, skill_level: e.target.value } }))}
                      >
                        {[1, 2, 3, 4].map((n) => (
                          <option key={n} value={n}>
                            {n}
                          </option>
                        ))}
                      </select>
                      <select
                        aria-label={`Sex for ${w.firstName} ${w.lastName}`}
                        value={edits.sex}
                        onChange={(e) => setEditing((p) => ({ ...p, [w.id]: { ...edits, sex: e.target.value } }))}
                      >
                        <option value="M">M</option>
                        <option value="F">F</option>
                      </select>
                      <button type="button" onClick={() => handleUpdate(w.id)}>
                        Save
                      </button>
                      <button type="button" onClick={() => setEditing((p) => { const n = { ...p }; delete n[w.id]; return n; })}>
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      {w.firstName} {w.lastName} -- {w.sex}, {w.weightLbs} lbs, skill {w.skillLevel}{" "}
                      <button type="button" onClick={() => setEditing((p) => ({ ...p, [w.id]: toFormValues(w) }))}>
                        Edit
                      </button>
                    </>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section>
        <h2>Add a wrestler</h2>
        <form onSubmit={handleAdd}>
          <label htmlFor="new-first-name">First name</label>
          <input
            id="new-first-name"
            required
            value={newWrestler.first_name}
            onChange={(e) => setNewWrestler((p) => ({ ...p, first_name: e.target.value }))}
          />
          <label htmlFor="new-last-name">Last name</label>
          <input
            id="new-last-name"
            required
            value={newWrestler.last_name}
            onChange={(e) => setNewWrestler((p) => ({ ...p, last_name: e.target.value }))}
          />
          <label htmlFor="new-birthday">Birthday</label>
          <input
            id="new-birthday"
            type="date"
            required
            value={newWrestler.birthday}
            onChange={(e) => setNewWrestler((p) => ({ ...p, birthday: e.target.value }))}
          />
          <label htmlFor="new-weight">Weight (lbs)</label>
          <input
            id="new-weight"
            type="number"
            required
            value={newWrestler.weight}
            onChange={(e) => setNewWrestler((p) => ({ ...p, weight: e.target.value }))}
          />
          <label htmlFor="new-skill-level">Skill level (1 = expert ... 4 = first-year)</label>
          <select
            id="new-skill-level"
            value={newWrestler.skill_level}
            onChange={(e) => setNewWrestler((p) => ({ ...p, skill_level: e.target.value }))}
          >
            <option value="">Select</option>
            {[1, 2, 3, 4].map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
          <label htmlFor="new-sex">Sex</label>
          <select id="new-sex" value={newWrestler.sex} onChange={(e) => setNewWrestler((p) => ({ ...p, sex: e.target.value }))}>
            <option value="M">M</option>
            <option value="F">F</option>
          </select>
          <button type="submit" disabled={submitting}>
            Add wrestler
          </button>
        </form>
      </section>

      <section>
        <h2>Import roster from CSV</h2>
        <form onSubmit={handleImport}>
          <label htmlFor="csv-file">CSV file (columns: team, first_name, last_name, birthday, weight, skill_level, sex)</label>
          <input id="csv-file" type="file" accept=".csv,text/csv" onChange={(e) => setCsvFile(e.target.files?.[0] ?? null)} />
          <button type="submit" disabled={!csvFile || submitting}>
            Import
          </button>
        </form>
        {importSummary && (
          <div>
            <p>
              Created {importSummary.createdCount}, skipped {importSummary.duplicateCount} duplicate(s), rejected{" "}
              {importSummary.invalidCount} invalid row(s).
            </p>
            {importSummary.rows
              .filter((r) => r.status !== "created")
              .map((r) => (
                <p key={r.row}>
                  Row {r.row} ({r.status}): {r.reason}
                </p>
              ))}
          </div>
        )}
      </section>
    </div>
  );
}
