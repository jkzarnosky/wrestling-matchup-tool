"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import {
  DEFAULT_AGE_DIFF_YEARS,
  DEFAULT_SKILL_DIFF_LEVELS,
  DEFAULT_WEIGHT_DIFF_MODE,
  DEFAULT_WEIGHT_DIFF_VALUE,
  type WeightDiffMode,
} from "@/lib/matchup-runs";

interface Props {
  runId: number;
  ageDiffYears: number | null;
  skillDiffLevels: number | null;
  weightDiffMode: WeightDiffMode | null;
  weightDiffValue: number | null;
  matCount: number | null;
}

export function ConfigureThresholds({
  runId,
  ageDiffYears,
  skillDiffLevels,
  weightDiffMode,
  weightDiffValue,
  matCount,
}: Props) {
  const router = useRouter();
  const [ageDiff, setAgeDiff] = useState(String(ageDiffYears ?? DEFAULT_AGE_DIFF_YEARS));
  const [skillDiff, setSkillDiff] = useState(String(skillDiffLevels ?? DEFAULT_SKILL_DIFF_LEVELS));
  const [weightMode, setWeightMode] = useState<WeightDiffMode>(weightDiffMode ?? DEFAULT_WEIGHT_DIFF_MODE);
  const [weightDiff, setWeightDiff] = useState(String(weightDiffValue ?? DEFAULT_WEIGHT_DIFF_VALUE));
  const [mats, setMats] = useState(matCount === null ? "" : String(matCount));
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isSet = ageDiffYears !== null;

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch(`/api/matchup-runs/${runId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ageDiffYears: Number(ageDiff),
          skillDiffLevels: Number(skillDiff),
          weightDiffMode: weightMode,
          weightDiffValue: Number(weightDiff),
          matCount: Number(mats),
        }),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Failed to save thresholds.");
      }
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save thresholds.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <h2>Matching thresholds</h2>
      {error && <p role="alert">{error}</p>}
      {!isSet && <p>Pre-filled with sensible defaults -- change anything before saving.</p>}

      <label htmlFor="age-diff">Allowable age difference (years)</label>
      <input id="age-diff" type="number" min={0} step={1} value={ageDiff} onChange={(e) => setAgeDiff(e.target.value)} />

      <label htmlFor="skill-diff">Allowable skill-level difference</label>
      <input
        id="skill-diff"
        type="number"
        min={0}
        step={1}
        value={skillDiff}
        onChange={(e) => setSkillDiff(e.target.value)}
      />

      <label htmlFor="weight-mode">Weight difference mode</label>
      <select id="weight-mode" value={weightMode} onChange={(e) => setWeightMode(e.target.value as WeightDiffMode)}>
        <option value="percent">Percent</option>
        <option value="flat">Flat lbs</option>
      </select>

      <label htmlFor="weight-diff">
        Allowable weight difference ({weightMode === "percent" ? "%" : "lbs"})
      </label>
      <input
        id="weight-diff"
        type="number"
        min={0}
        step="any"
        value={weightDiff}
        onChange={(e) => setWeightDiff(e.target.value)}
      />

      <label htmlFor="mat-count">Number of mats</label>
      <input
        id="mat-count"
        type="number"
        min={1}
        step={1}
        placeholder="e.g. 3"
        value={mats}
        onChange={(e) => setMats(e.target.value)}
      />

      <button type="submit" disabled={submitting}>
        {submitting ? "Saving…" : isSet ? "Update thresholds" : "Save thresholds"}
      </button>
    </form>
  );
}
