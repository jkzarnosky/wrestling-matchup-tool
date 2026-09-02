export type AgeBracket = "Tots" | "Bantams" | "Midget" | "Junior" | "Intermediate";

const BRACKETS: { name: AgeBracket; minAge: number; maxAge: number }[] = [
  { name: "Tots", minAge: 4, maxAge: 6 },
  { name: "Bantams", minAge: 7, maxAge: 8 },
  { name: "Midget", minAge: 9, maxAge: 10 },
  { name: "Junior", minAge: 11, maxAge: 12 },
  { name: "Intermediate", minAge: 13, maxAge: 13 },
];

/** Whole years old as of `asOf` (defaults to now). Not stored anywhere -- always derived from
 * `birthday` at read time, since a persisted snapshot would go stale as kids have birthdays
 * mid-season. Judgment call: uses live current age, not a fixed season-cutoff date (e.g. "age as
 * of Jan 1") the way many real youth leagues do it -- BACKLOG.md's AC never specifies a cutoff
 * rule. Flagged in DECISIONS.md as worth revisiting before Epic 2 depends on brackets more. */
export function calculateAge(birthday: Date, asOf: Date = new Date()): number {
  let age = asOf.getFullYear() - birthday.getFullYear();
  const hasHadBirthdayThisYear =
    asOf.getMonth() > birthday.getMonth() ||
    (asOf.getMonth() === birthday.getMonth() && asOf.getDate() >= birthday.getDate());
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}

/** Null if the age doesn't fall into any bracket (outside the 4-13 range this league covers) --
 * not an error, just an outlier the AC doesn't ask CSV import to reject. */
export function calculateAgeBracket(birthday: Date, asOf: Date = new Date()): AgeBracket | null {
  const age = calculateAge(birthday, asOf);
  return BRACKETS.find((b) => age >= b.minAge && age <= b.maxAge)?.name ?? null;
}
