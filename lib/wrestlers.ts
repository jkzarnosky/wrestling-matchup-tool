import Papa from "papaparse";
import { eq } from "drizzle-orm";
import { teams, wrestlerHistory, wrestlers } from "../db/schema";
import type { AppDb } from "../db/types";

export class ValidationError extends Error {}

interface WrestlerFields {
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

/** Shared by CSV import and the add/edit-via-UI form -- "same required fields ... same validation
 * rules" per the AC. Takes raw strings either way (HTML form fields are strings too). */
function validateWrestlerFields(
  raw: Partial<Record<"first_name" | "last_name" | "birthday" | "weight" | "skill_level" | "sex", string>>
): WrestlerFields | { reason: string } {
  const REQUIRED = ["first_name", "last_name", "birthday", "weight", "skill_level", "sex"] as const;
  for (const field of REQUIRED) {
    if (!raw[field]?.trim()) {
      return { reason: `Missing required field: ${field}` };
    }
  }

  const birthday = new Date(raw.birthday!);
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

  const sex = raw.sex!.trim().toUpperCase();
  if (sex !== "M" && sex !== "F") {
    return { reason: `Invalid sex: "${raw.sex}" (must be M or F)` };
  }

  return {
    firstName: raw.first_name!.trim(),
    lastName: raw.last_name!.trim(),
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
    const raw = parsed.data[i];

    if (!raw.team?.trim()) {
      rows.push({ row: rowNumber, status: "invalid", reason: "Missing required field: team" });
      invalidCount++;
      continue;
    }
    // Trimmed + case-insensitive on purpose -- see DECISIONS.md (a coach's spreadsheet having
    // "ironclad wrestling club " shouldn't reject against "Ironclad Wrestling Club").
    if (normalizeTeamName(raw.team) !== normalizeTeamName(team.name)) {
      rows.push({
        row: rowNumber,
        status: "invalid",
        reason: `Team "${raw.team}" doesn't match the team you're importing into ("${team.name}")`,
      });
      invalidCount++;
      continue;
    }

    const result = validateWrestlerFields(raw);
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

    const [wrestler] = await db.insert(wrestlers).values({ teamId, ...result }).returning();

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

export async function getWrestlerById(db: AppDb, id: number): Promise<typeof wrestlers.$inferSelect | null> {
  const [wrestler] = await db.select().from(wrestlers).where(eq(wrestlers.id, id)).limit(1);
  return wrestler ?? null;
}

type WrestlerFormInput = Partial<Record<"first_name" | "last_name" | "birthday" | "weight" | "skill_level" | "sex", string>>;

/** Creating via UI writes a marker only, same as CSV import -- see DECISIONS.md. */
export async function createWrestler(
  db: AppDb,
  teamId: number,
  input: WrestlerFormInput,
  createdByUserId: number
): Promise<typeof wrestlers.$inferSelect> {
  const result = validateWrestlerFields(input);
  if ("reason" in result) throw new ValidationError(result.reason);

  const teamRoster = await listWrestlers(db, teamId);
  const key = dupeKey(result.firstName, result.lastName, result.birthday);
  if (teamRoster.some((w) => dupeKey(w.firstName, w.lastName, w.birthday) === key)) {
    throw new ValidationError(`A wrestler matching ${result.firstName} ${result.lastName} already exists on this team.`);
  }

  const [wrestler] = await db.insert(wrestlers).values({ teamId, ...result }).returning();
  await db.insert(wrestlerHistory).values({
    wrestlerId: wrestler.id,
    action: "created_via_ui",
    changedBy: createdByUserId,
  });
  return wrestler;
}

const EDITABLE_FIELDS = ["firstName", "lastName", "birthday", "weightLbs", "skillLevel", "sex"] as const;

function fieldToString(value: unknown): string {
  return value instanceof Date ? value.toISOString().slice(0, 10) : String(value);
}

/** Edits an existing wrestler; writes one history row per field that actually changed. Never
 * touches teamId (no story asks for transferring a wrestler between teams) or age_bracket
 * (calculated, never stored/editable). */
export async function updateWrestler(
  db: AppDb,
  wrestlerId: number,
  input: WrestlerFormInput,
  editedByUserId: number
): Promise<typeof wrestlers.$inferSelect> {
  const existing = await getWrestlerById(db, wrestlerId);
  if (!existing) throw new ValidationError("Wrestler not found.");

  const result = validateWrestlerFields(input);
  if ("reason" in result) throw new ValidationError(result.reason);

  const [updated] = await db.update(wrestlers).set(result).where(eq(wrestlers.id, wrestlerId)).returning();

  for (const field of EDITABLE_FIELDS) {
    const oldValue = fieldToString(existing[field]);
    const newValue = fieldToString(updated[field]);
    if (oldValue !== newValue) {
      await db.insert(wrestlerHistory).values({
        wrestlerId,
        action: "edited",
        field,
        oldValue,
        newValue,
        changedBy: editedByUserId,
      });
    }
  }

  return updated;
}
