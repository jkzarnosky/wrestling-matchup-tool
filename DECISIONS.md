# Decisions Log

Running log of choices made and why. Lightweight — one entry per real decision (a choice between two
or more real alternatives), newest at the top.

---

## 2026-08-25 — Branch protection on main: PR + CI required, no direct pushes

**Chosen:** `main` requires a pull request with a passing `test` CI check to merge; no direct pushes or
force-pushes, enforced for admins too (`enforce_admins: true`). Required approving review count is 0.

**Alternatives considered:**
- *Keep pushing straight to main* (what had been happening through Epic .5's first story) — no review
  checkpoint before code reaches the public repo. Rejected once flagged: this project is explicitly
  meant to demonstrate professional process, and "no review before it's live" isn't that.
- *Required approving review count of 1* — the standard four-eyes control. Rejected for now because
  JZ and Claude Code's `gh` session are the same GitHub account; GitHub won't let an account approve its
  own PR, which would deadlock every merge. Human review still happens — JZ reads the diff and merges —
  it's just not captured as a formal "Approve" click. Revisit if a second reviewer (human or bot) is
  ever added.

**Why enforce_admins: true:** without it, the repo owner could still push directly and silently bypass
the whole point of the control. Enforcing it for everyone means the only way to change main is through
the PR flow, even by accident.

---

## 2026-08-24 — Language/runtime: TypeScript on Node.js

**Chosen:** TypeScript/Node for the matching engine and Sprint 1 CLI.

**Alternatives considered:** Python — arguably a faster path for the CSV wrangling and matching-algorithm
work itself (pandas, pytest), and simpler for one-off synthetic data generation.

**Why TypeScript/Node:** The PRD's Epic 3 (mobile-friendly, on-the-spot adjustments) and the broader
goal of hosting matchups on a website mean this needs a web frontend eventually. Sharing one language
across the matching engine and that future UI avoids a second stack and a serialization boundary
between them.

---

## 2026-08-24 — Priority tracking: BACKLOG.md order, not the GitHub Project board

**Chosen:** story order in BACKLOG.md (top to bottom, epic by epic) is the source of truth for priority.

**Alternatives considered:** a Priority field on the GitHub Project board, or the board's drag-to-reorder
position within a column.

**Why the file, not the board:** manual card position in a Projects (v2) board view isn't exposed by the
GraphQL API or `gh project item-list` — there's no way to read it back programmatically, so it can't
drive anything automated. A Priority field would be readable but is one more place to keep in sync. The
board still owns status (Todo/In Progress/Done); the file owns order.

---

## 2026-08-24 — Full stack: Next.js + Vercel + Neon Postgres + hand-rolled auth

**Chosen:** Next.js (API routes + React UI in one codebase) on Vercel, Neon (serverless Postgres) with
Drizzle as the ORM, Resend for transactional email, and a hand-rolled email-OTP auth flow against our
own `users`/`sessions` tables.

**Alternatives considered:**
- *Separate Express API + React SPA, hosted on Railway/Fly.io.* Cleaner frontend/backend separation,
  but two deploys to run and CORS/session wiring to build by hand, for no functional benefit at this
  scale — solo-maintained volunteer-league app, not a team needing that boundary.
- *Supabase (Postgres + built-in email-OTP auth + Row-Level Security)* instead of Neon + hand-rolled
  auth. Would let Postgres RLS enforce "Team Rep can only see their own team" at the DB layer instead
  of in application code, and ships faster. Not chosen because this project is explicitly meant to be
  interview material (see BACKLOG.md), and hand-writing the OTP/session flow is the more defensible
  story than an outsourced auth provider. Revisit if the hand-rolled team-scoping checks prove error-prone.
- *JWT/stateless sessions* instead of a DB-backed `sessions` table. Rejected because a session needs to
  be revocable — this handles minors' data, and there's no way to invalidate a JWT before it expires.

**Why Postgres specifically (not SQLite/NoSQL):** the data is genuinely relational — Wrestlers and
Users reference Teams by foreign key, matchups reference wrestlers, change-history rows reference edits.
Needs real FK integrity and will have concurrent writes from multiple teams once deployed live.

---

<!-- New entries go above this line -->
