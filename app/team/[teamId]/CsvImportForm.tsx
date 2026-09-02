"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

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

export function CsvImportForm({ teamId }: { teamId: number }) {
  const router = useRouter();
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<ImportSummary | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    if (!file) return;
    setError(null);
    setSummary(null);
    setSubmitting(true);
    try {
      const csv = await file.text();
      const res = await fetch(`/api/teams/${teamId}/wrestlers/import`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ csv }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Import failed.");
      setSummary(body);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <form onSubmit={handleSubmit}>
        <label htmlFor="csv-file">CSV file (columns: team, first_name, last_name, birthday, weight, skill_level, sex)</label>
        <input
          id="csv-file"
          type="file"
          accept=".csv,text/csv"
          onChange={(event) => setFile(event.target.files?.[0] ?? null)}
        />
        <button type="submit" disabled={!file || submitting}>
          Import
        </button>
      </form>

      {error && <p role="alert">{error}</p>}

      {summary && (
        <div>
          <p>
            Created {summary.createdCount}, skipped {summary.duplicateCount} duplicate(s), rejected{" "}
            {summary.invalidCount} invalid row(s).
          </p>
          {summary.rows
            .filter((r) => r.status !== "created")
            .map((r) => (
              <p key={r.row}>
                Row {r.row} ({r.status}): {r.reason}
              </p>
            ))}
        </div>
      )}
    </div>
  );
}
