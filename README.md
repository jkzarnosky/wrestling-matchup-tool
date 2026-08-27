# Wrestling Matchup Tool

A data entry and weekly matchmaking tool for a youth recreational wrestling league (two conferences,
multiple teams, wrestlers aged 4–13).

## Problem

Team rosters live in per-team Google Sheets tabs (name, birthday, weight, experience). Weekly matchups
are produced by a separate, loosely-documented tool that reads those sheets, driven by whichever coach
is hosting that week. The process is manual end to end:

- Teams don't always keep their sheet current, and there's no way to tell.
- On-the-spot changes at the event (scratches, corrected weights) aren't easy to fold back into the
  matchup output.
- There's no first-class way to flag or handle exceptions — heavyweights who need a wider weight band,
  inexperienced-but-willing wrestlers, outliers who don't fit any bracket cleanly.

See [wrestling-matchup-tool-prd.md](wrestling-matchup-tool-prd.md) for the full requirements doc.

## What this replaces

- Manual, per-team Google Sheets data entry → structured data entry with change history.
- An opaque, separate matchup tool → an auditable matching engine with explicit, adjustable thresholds
  (age, skill, weight, mat count).
- Email/printout-only output → a system that both produces printable sheets and supports live,
  ringside adjustments.

## Scope

- **Must have:** admin functionality, per-team data input, weekly match making.
- **Nice to have:** qualifier/championship support, tot-o-rama (end-of-year, un-scored tournament for
  the youngest bracket).

Full breakdown of epics, stories, and acceptance criteria: [BACKLOG.md](BACKLOG.md).

## Status

Epic .5 (user management: login, teams, invites, base pages) is shipped. Epic 1 (wrestler data,
CSV import) is next. See [PROJECT-LOG.md](PROJECT-LOG.md) for what's shipped so far and
[DECISIONS.md](DECISIONS.md) for why things were built the way they were.

## Stack

Next.js (TypeScript, App Router) on Vercel, Drizzle ORM against Neon Postgres, Resend for email,
hand-rolled passwordless auth. Vitest for tests. See [BACKLOG.md](BACKLOG.md)'s Architecture table and
[DECISIONS.md](DECISIONS.md) for the reasoning. Work is tracked kanban-style on the
[GitHub Project board](https://github.com/users/jkzarnosky/projects/1) — priority order lives in
BACKLOG.md, not sprints/phases.

## Testing

Four tiers, from cheapest/most-numerous to most expensive/rarest:

| Tier | What | Tooling | Status |
|---|---|---|---|
| 1. Unit | Pure functions, no I/O (`canViewTeam`, `requireAdmin`, validation) | Vitest | Mostly folded into Tier 2 files today |
| 2. Integration | Business logic that touches the database | Vitest + [pglite](https://github.com/electric-sql/pglite) (embedded real Postgres, built from the real migration SQL) | Primary suite — auth, teams, invites, schema/constraints |
| 3. Route/API | Next.js route handlers — auth gating, request parsing, response shape/status codes | Vitest, importing route handlers directly with `@/db` and the relevant `lib/*` module mocked out | One reference example (`__tests__/api/teams.test.ts`); required for new routes going forward, see BACKLOG.md's Definition of Done |
| 4. End-to-end | Full user flows through a real running app in a real browser | None automated yet — [MANUAL-TEST-CASES.md](MANUAL-TEST-CASES.md) is the checklist for now | Small set of Playwright tests planned for these same critical paths eventually, not full coverage |

Why pglite instead of hitting the real Neon database in tests: real Postgres semantics (enums, CHECK
constraints, unique indexes) without needing database credentials in CI, and every test starts from a
guaranteed-empty, freshly-migrated database — no cross-test pollution, no cleanup step. See
DECISIONS.md for the tradeoffs (and the known one: a fresh pglite instance per test is simple but not
free — watch this if the suite's runtime becomes a problem as it grows).

```bash
npm test          # everything, once
npm run test:watch
```

## Data privacy

No real wrestler data (names, weights, teams) is ever committed to this repo. Development and demos
use a generated synthetic dataset — see `data/synthetic/`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, SESSION_SECRET, SEED_ADMIN_*
npm run db:migrate
npm run seed:admin           # your first Admin login
npm run dev                  # app at http://localhost:3000
npm test
```

`RESEND_API_KEY` can stay blank for local dev — login/invite codes just get logged to the console
instead of emailed (see `lib/email.ts`).

## Local demo

No hosted demo yet (parking-lot item — see BACKLOG.md). To show this locally instead of just running
it against your own dev data:

```bash
npm run demo:reset
```

Wipes teams/users/invites/sessions back to empty and reseeds a handful of synthetic teams plus the
Admin account from `.env.local` — safe to re-run any time the data gets messy from clicking around.
Wrestler data isn't seeded yet since that table doesn't exist until Epic 1 ships.

Since there's no real email delivery configured, login/invite codes print to the terminal running
`npm run dev` (`[dev email fallback] ...`) — that's how you get the code to actually log in during a
local demo.
