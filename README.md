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

Early setup — no working software yet. See [PROJECT-LOG.md](PROJECT-LOG.md) for what's shipped so far
and [DECISIONS.md](DECISIONS.md) for why things were built the way they were.

## Stack

Next.js (TypeScript, App Router) on Vercel, Drizzle ORM against Neon Postgres, Resend for email,
hand-rolled passwordless auth. Vitest for tests. See [BACKLOG.md](BACKLOG.md)'s Architecture table and
[DECISIONS.md](DECISIONS.md) for the reasoning. Work is tracked kanban-style on the
[GitHub Project board](https://github.com/users/jkzarnosky/projects/1) — priority order lives in
BACKLOG.md, not sprints/phases.

## Data privacy

No real wrestler data (names, weights, teams) is ever committed to this repo. Development and demos
use a generated synthetic dataset — see `data/synthetic/`.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL, RESEND_API_KEY, SESSION_SECRET
npm run dev                  # app at http://localhost:3000
npm test
```
