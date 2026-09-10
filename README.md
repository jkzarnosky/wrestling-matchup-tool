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

Epic .5 (user management), Epic 1 (wrestler data), and Epic 2 (weekly matchmaking: select attending
teams, configure thresholds, generate matchups) are all shipped. Epic 3 (on-the-spot event
adjustments) is deferred until Epic 2 is proven in real use, per BACKLOG.md. See
[PROJECT-LOG.md](PROJECT-LOG.md) for what's shipped so far and [DECISIONS.md](DECISIONS.md) for why
things were built the way they were.

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
| 4. End-to-end | A few critical journeys through the real built app in a real browser | [Playwright](https://playwright.dev) — production build, real Postgres, `npm run test:e2e` | Login, CSV import, the full matchmaking flow. Deliberately small; [MANUAL-TEST-CASES.md](MANUAL-TEST-CASES.md) still covers the wider surface |

Why pglite instead of hitting the real Neon database in Tier 1–3 tests: real Postgres semantics
(enums, CHECK constraints, unique indexes) without needing database credentials in CI, and every test
starts from a guaranteed-empty, freshly-migrated database — no cross-test pollution, no cleanup step.
See DECISIONS.md for the tradeoffs (and the known one: a fresh pglite instance per test is simple but
not free — watch this if the suite's runtime becomes a problem as it grows).

The CI e2e job records video of every journey; the `playwright-report` artifact on each run bundles
those plus traces. To run e2e locally: `npm run e2e:seed` then `npm run test:e2e` (needs `DATABASE_URL`
— it wipes and reseeds that database).

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

## Routes

Kept current here as pages/routes ship — update this table in the same PR that adds or changes one.

### Pages

| Path | Access | What it does |
|---|---|---|
| `/` | Public | Placeholder landing page |
| `/login` | Public | Email → one-time code → session |
| `/team` | Logged in | Redirects to your own team (`/team/[teamId]`), or the first team if Admin |
| `/team/[teamId]` | Own team (Rep) / any team (Admin) | Roster: list, add/edit wrestler, CSV import |
| `/admin/teams` | Admin only | Create/edit teams |
| `/admin/invites` | Admin only | Send invites, see pending vs. accepted |
| `/invite/[token]` | Public (needs the token) | New user sets their name, accepts the invite, gets logged in |
| `/matchups/new` | Logged in | Start a weekly matchup run: pick 2–4 attending teams from the whole league, not just your own |
| `/matchups/[runId]` | Logged in | A matchup run's attending teams, threshold form, and (once generated) the printable matchup sheet — `window.print()` for a physical copy |

### API routes

| Method + Path | Access | What it does |
|---|---|---|
| `POST /api/auth/request-code` | Public | Emails (or dev-console-logs) a login code |
| `POST /api/auth/verify-code` | Public | Verifies the code, creates a session |
| `POST /api/auth/logout` | Logged in | Destroys the session |
| `GET /api/teams` | Logged in | List teams |
| `POST /api/teams` | Admin | Create a team |
| `PATCH /api/teams/[id]` | Admin | Edit a team |
| `GET /api/invites` | Admin | List invites |
| `POST /api/invites` | Admin | Send an invite |
| `POST /api/invites/accept` | Public (needs token) | Accept an invite |
| `GET /api/teams/[id]/wrestlers` | Own team / Admin | List a team's roster |
| `POST /api/teams/[id]/wrestlers` | Own team / Admin | Add a wrestler |
| `PATCH /api/teams/[id]/wrestlers/[wrestlerId]` | Own team / Admin | Edit a wrestler |
| `POST /api/teams/[id]/wrestlers/import` | Own team / Admin | CSV import |
| `POST /api/matchup-runs` | Logged in | Create a matchup run for 2–4 selected teams — no team-scoping gate, since picking teams other than your own is the point (see DECISIONS.md) |
| `PATCH /api/matchup-runs/[id]` | Logged in | Set/update a run's matching thresholds |
| `POST /api/matchup-runs/[id]/generate` | Logged in | Run the matching algorithm for a run's attending teams, persist the result (clearing any previous one) |

## Local demo

No hosted demo yet (parking-lot item — see BACKLOG.md). To show this locally instead of just running
it against your own dev data:

```bash
npm run demo:reset
```

Wipes teams/users/invites/sessions/wrestlers/matchup-runs back to empty and reseeds a handful of
synthetic teams plus the Admin account from `.env.local` — safe to re-run any time the data gets messy
from clicking around. Wrestlers and matchup runs are cleared but not reseeded with synthetic data by
this script (add some yourself via CSV import/the UI once teams exist).

Since there's no real email delivery configured, login/invite codes print to the terminal running
`npm run dev` (`[dev email fallback] ...`) — that's how you get the code to actually log in during a
local demo.
