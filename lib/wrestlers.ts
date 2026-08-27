import Papa from "papaparse";
import { eq } from "drizzle-orm";
import { teams, wrestlerHistory, wrestlers } from "../db/schema";
import type { AppDb } from "../db/types";

export class ValidationError extends Error {}

const REQUIRED_COLUMNS = ["team", "first_name", "last_name", "birthday", "weight", "skill_level", "sex"] as const;

interface ParsedRow {
  team: string;
  firstName: string;
  lastName: string;
  birthday: Date;
  weightLbs: number;
  skillLevel: number;
  sex: "M" | "F";
}

export interface RowOutcome {
  row: number;
  status: "created" | "duplicate" | "invalid";
  reason?: string;
}

export interface ImportSummary {
  createdCount: number;
  duplicateCount: number;
  invalidCount: number;
  rows: RowOutcome[];
}

function normalizeTeamName(name: string): string {
  return name.trim().toLowerCase();
}

/** Same key shape used both for "does this already exist in the DB" and "does this appear
 * twice in the same file" duplicate checks -- the AC's duplicate rule is identical either way. */
function dupeKey(firstName: string, lastName: string, birthday: Date): string {
  return [firstName.trim().toLowerCase(), lastName.trim().toLowerCase(), birthday.toISOString().slice(0, 10)].join(
    "|"
  );
}

function validateRow(raw: Record<string, string>, targetTeamName: string): ParsedRow | { reason: string } {
  for (const col of REQUIRED_COLUMNS) {
    if (!raw[col]?.trim()) {
      return { reason: `Missing required field: ${col}` };
    }
  }

  // Trimmed + case-insensitive on purpose -- see DECISIONS.md (a coach's spreadsheet having
  // "ironclad wrestling club " shouldn't reject against "Ironclad Wrestling Club").
  if (normalizeTeamName(raw.team) !== normalizeTeamName(targetTeamName)) {
    return { reason: `Team "${raw.team}" doesn't match the team you're importing into ("${targetTeamName}")` };
  }

  const birthday = new Date(raw.birthday);
  if (Number.isNaN(birthday.getTime())) {
    return { reason: `Invalid birthday: "${raw.birthday}"` };
  }
  if (birthday.getTime() >= Date.now()) {
    return { reason: `Birthday must be a past date: "${raw.birthday}"` };
  }

  const weightLbs = Number(raw.weight);
  if (!Number.isFinite(weightLbs) || weightLbs <= 0) {
    return { reason: `Invalid weight: "${raw.weight}" (must be a positive number)` };
  }

  const skillLevel = Number(raw.skill_level);
  if (!Number.isInteger(skillLevel) || skillLevel < 1 || skillLevel > 4) {
    return { reason: `Invalid skill_level: "${raw.skill_level}" (must be an integer 1-4)` };
  }

  const sex = raw.sex.trim().toUpperCase();
  if (sex !== "M" && sex !== "F") {
    return { reason: `Invalid sex: "${raw.sex}" (must be M or F)` };
  }

  return {
    team: raw.team.trim(),
    firstName: raw.first_name.trim(),
    lastName: raw.last_name.trim(),
    birthday,
    weightLbs,
    skillLevel,
    sex,
  };
}

/** Imports wrestlers from CSV text into `teamId` -- import always happens in the context of one
 * target team (whichever team page you're on); a row's `team` column must match that team, not
 * any team in the league. See DECISIONS.md for why this reading was chosen over a single CSV
 * spanning arbitrary teams.
 *
 * Categorizes every row as created / duplicate / invalid (serves both "Import wrestler roster
 * from CSV" and "Re-attempting a CSV import" AC -- a re-import is just a first import where more
 * rows land in the duplicate bucket). */
export async function importWrestlersFromCsv(
  db: AppDb,
  teamId: number,
  csvText: string,
  importedByUserId: number
): Promise<ImportSummary> {
  const [team] = await db.select().from(teams).where(eq(teams.id, teamId)).limit(1);
  if (!team) throw new ValidationError("Team not found.");

  const parsed = Papa.parse<Record<string, string>>(csvText, { header: true, skipEmptyLines: true });

  const existing = await db.select().from(wrestlers).where(eq(wrestlers.teamId, teamId));
  const existingKeys = new Set(
    existing.map((w: typeof wrestlers.$inferSelect) => dupeKey(w.firstName, w.lastName, w.birthday))
  );
  const seenInFile = new Set<string>();

  const rows: RowOutcome[] = [];
  let createdCount = 0;
  let duplicateCount = 0;
  let invalidCount = 0;

  for (let i = 0; i < parsed.data.length; i++) {
    const rowNumber = i + 1;
    const result = validateRow(parsed.data[i], team.name);

    if ("reason" in result) {
      rows.push({ row: rowNumber, status: "invalid", reason: result.reason });
      invalidCount++;
      continue;
    }

    const key = dupeKey(result.firstName, result.lastName, result.birthday);
    if (existingKeys.has(key) || seenInFile.has(key)) {
      rows.push({
        row: rowNumber,
        status: "duplicate",
        reason: `Matches an existing wrestler: ${result.firstName} ${result.lastName}`,
      });
      duplicateCount++;
      continue;
    }
    seenInFile.add(key);

    const [wrestler] = await db
      .insert(wrestlers)
      .values({
        teamId,
        firstName: result.firstName,
        lastName: result.lastName,
        birthday: result.birthday,
        weightLbs: result.weightLbs,
        skillLevel: result.skillLevel,
        sex: result.sex,
      })
      .returning();

    await db.insert(wrestlerHistory).values({
      wrestlerId: wrestler.id,
      action: "created_via_import",
      changedBy: importedByUserId,
    });

    rows.push({ row: rowNumber, status: "created" });
    createdCount++;
  }

  return { createdCount, duplicateCount, invalidCount, rows };
}

export async function listWrestlers(db: AppDb, teamId: number): Promise<(typeof wrestlers.$inferSelect)[]> {
  return db.select().from(wrestlers).where(eq(wrestlers.teamId, teamId)).orderBy(wrestlers.lastName);
}
