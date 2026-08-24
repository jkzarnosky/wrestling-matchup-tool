// Generates a fake wrestler roster for dev/demo use. No real names, weights, or teams ever
// go in this repo — see .gitignore and README > Data privacy.
import { writeFileSync } from "node:fs";
import { mkdirSync } from "node:fs";

type AgeBracket = "Tots" | "Bantams" | "Midget" | "Junior" | "Intermediate";

const AGE_BRACKETS: { name: AgeBracket; minAge: number; maxAge: number }[] = [
  { name: "Tots", minAge: 4, maxAge: 6 },
  { name: "Bantams", minAge: 7, maxAge: 8 },
  { name: "Midget", minAge: 9, maxAge: 10 },
  { name: "Junior", minAge: 11, maxAge: 12 },
  { name: "Intermediate", minAge: 13, maxAge: 13 },
];

const TEAMS = [
  "Ironclad Wrestling Club",
  "Northgate Grapplers",
  "River Valley Wrestling",
  "Summit Youth Wrestling",
  "Eastside Takedown Club",
  "Prairie Wolves Wrestling",
];

const FIRST_NAMES = [
  "Alex", "Jordan", "Casey", "Riley", "Morgan", "Taylor", "Sam", "Jamie", "Avery", "Quinn",
  "Drew", "Reese", "Skyler", "Rowan", "Emerson", "Hayden", "Finley", "Parker", "Blake", "Cameron",
];
const LAST_NAMES = [
  "Nguyen", "Smith", "Garcia", "Johnson", "Patel", "Williams", "Brown", "Kowalski", "Reyes", "Kim",
  "Anderson", "Torres", "Mitchell", "Novak", "Sullivan", "Ramirez", "Fischer", "Coleman", "Diaz", "Bennett",
];

function randInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pick<T>(arr: readonly T[]): T {
  return arr[randInt(0, arr.length - 1)];
}

function randomBirthday(age: number, asOf: Date): string {
  // Pick a birthday consistent with `age` as of `asOf`.
  const year = asOf.getFullYear() - age;
  const month = randInt(1, 12);
  const day = randInt(1, 28);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function weightForAge(age: number): number {
  // Rough, made-up youth wrestling weight curve — good enough for synthetic demo data.
  const base = 35 + (age - 4) * 6;
  return base + randInt(-8, 12);
}

interface SyntheticWrestler {
  team: string;
  name: string;
  sex: "M" | "F";
  birthday: string;
  weightLbs: number;
  skillLevel: 1 | 2 | 3 | 4;
  ageBracket: AgeBracket;
}

function generateWrestler(asOf: Date): SyntheticWrestler {
  const bracket = pick(AGE_BRACKETS);
  const age = randInt(bracket.minAge, bracket.maxAge);
  return {
    team: pick(TEAMS),
    name: `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`,
    sex: pick(["M", "F"]),
    birthday: randomBirthday(age, asOf),
    weightLbs: weightForAge(age),
    skillLevel: pick([1, 2, 3, 4]),
    ageBracket: bracket.name,
  };
}

function toCsv(wrestlers: SyntheticWrestler[]): string {
  const header = "team,name,sex,birthday,weight_lbs,skill_level,age_bracket";
  const rows = wrestlers.map((w) =>
    [w.team, w.name, w.sex, w.birthday, w.weightLbs, w.skillLevel, w.ageBracket]
      .map((v) => (typeof v === "string" && v.includes(",") ? `"${v}"` : v))
      .join(",")
  );
  return [header, ...rows].join("\n") + "\n";
}

function main() {
  const countArg = process.argv[2];
  const count = countArg ? parseInt(countArg, 10) : 120;
  const asOf = new Date();

  const wrestlers = Array.from({ length: count }, () => generateWrestler(asOf));
  const csv = toCsv(wrestlers);

  mkdirSync("data/synthetic", { recursive: true });
  const outPath = "data/synthetic/wrestlers.csv";
  writeFileSync(outPath, csv, "utf8");
  console.log(`Wrote ${count} synthetic wrestlers to ${outPath}`);
}

main();
