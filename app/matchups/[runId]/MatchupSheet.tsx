"use client";

import { useState } from "react";

interface WrestlerSummary {
  id: number;
  firstName: string;
  lastName: string;
  teamName: string;
  weightLbs: number;
  skillLevel: number;
  sex: "M" | "F";
}

interface MatchupSheetPairing {
  matNumber: number;
  wrestlerOne: WrestlerSummary;
  wrestlerTwo: WrestlerSummary;
}

interface Sheet {
  pairings: MatchupSheetPairing[];
  outliers: WrestlerSummary[];
}

interface Props {
  runId: number;
  thresholdsSet: boolean;
  initialSheet: Sheet;
}

function wrestlerLabel(w: WrestlerSummary): string {
  return `${w.firstName} ${w.lastName} (${w.teamName}, ${w.weightLbs} lbs, skill ${w.skillLevel})`;
}

export function MatchupSheet({ runId, thresholdsSet, initialSheet }: Props) {
  const [sheet, setSheet] = useState(initialSheet);
  const [error, setError] = useState<string | null>(null);
  const [generating, setGenerating] = useState(false);

  const hasResults = sheet.pairings.length > 0 || sheet.outliers.length > 0;

  async function handleGenerate() {
    setError(null);
    setGenerating(true);
    try {
      const res = await fetch(`/api/matchup-runs/${runId}/generate`, { method: "POST" });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to generate matchups.");
      }
      setSheet(await res.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to generate matchups.");
    } finally {
      setGenerating(false);
    }
  }

  const matNumbers = [...new Set(sheet.pairings.map((p) => p.matNumber))].sort((a, b) => a - b);

  return (
    <section>
      <div className="no-print">
        <h2>Matchups</h2>
        {error && <p role="alert">{error}</p>}
        {!thresholdsSet && <p>Set thresholds above before generating matchups.</p>}
        <button type="button" onClick={handleGenerate} disabled={!thresholdsSet || generating}>
          {generating ? "Generating…" : hasResults ? "Re-generate matchups" : "Generate matchups"}
        </button>
        {hasResults && (
          <button type="button" onClick={() => window.print()}>
            Print matchup sheet
          </button>
        )}
      </div>

      {hasResults && (
        <div>
          {matNumbers.map((mat) => (
            <div key={mat}>
              <h3>Mat {mat}</h3>
              <ul>
                {sheet.pairings
                  .filter((p) => p.matNumber === mat)
                  .map((p) => (
                    <li key={`${p.wrestlerOne.id}-${p.wrestlerTwo.id}`}>
                      {wrestlerLabel(p.wrestlerOne)} vs {wrestlerLabel(p.wrestlerTwo)}
                    </li>
                  ))}
              </ul>
            </div>
          ))}

          {sheet.outliers.length > 0 && (
            <div>
              <h3>No match found</h3>
              <ul>
                {sheet.outliers.map((w) => (
                  <li key={w.id}>{wrestlerLabel(w)}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </section>
  );
}
