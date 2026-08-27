# Decisions Log

Running log of choices made and why. Lightweight — one entry per real decision (a choice between two
or more real alternatives), newest at the top.

---

## 2026-08-25 — Pending invites: separate table, not nullable columns on users

**Chosen:** a standalone `invites` table (email, role, team_id, token, expires_at, accepted_at). A
`users` row is only ever created once an invite is accepted with a real name.

**Alternatives considered:** reuse `users` with `first_name`/`last_name` made nullable, treating a
null name as "pending." Simpler schema (one table instead of two), but it would loosen a NOT NULL
constraint the "User data model" story already shipped, and "pending" becomes an implicit state
(inferred from a null column) instead of an explicit one — the AC explicitly asks to distinguish
pending vs. active invites, which an explicit table gives for free (which table the row is in) instead
of encoding it as "name is null."

**Why the table:** keeps `users` as "every row is a real, complete account" — an invariant other code
(and future stories) can rely on without special-casing partially-set-up users.

**Invite link expiry:** 7 days, picked as a default since BACKLOG.md marks the exact window TBD.
Revisit if that's wrong in practice.

---

## 2026-08-25 — Login OTP implementation: thresholds and email enumeration

**Chosen (numbers not specified anywhere in BACKLOG.md, picked as reasonable defaults):**
- Code expiry: 10 minutes (BACKLOG.md's own example)
- Session lifetime: 30 days — favors convenience for a low-stakes volunteer app over frequent
  re-login; sessions are still revocable (DB-backed, see the earlier full-stack decision) if that
  turns out to be wrong
- Rate limit: 5 code requests per email per 15-minute window

**Also decided:** `requestLoginCode` always returns success, whether or not the email belongs to a
real user — it just silently does nothing for an unknown email instead of erroring. Prevents the
endpoint being used to enumerate which emails have accounts. Not called out in the AC, but a standard
enough practice that it didn't seem worth a design conversation to add.

**Why call these out:** these are judgment calls, not requirements — flagging them so they're easy to
challenge/adjust rather than silently baked in. Revisit the specific numbers if they prove wrong in
practice.

---

## 2026-08-25 — Epic grouping: Milestones, not labels

**Chosen:** each epic is a GitHub Milestone (e.g. "Epic 1: Data Management"); all 30 story issues were
reassigned from their epic label to the matching milestone, and the 7 epic labels were deleted.

**Alternatives considered:**
- *Keep the epic labels.* Rejected: labels are many-to-many (an issue can carry several), so the
  Project board's board view can't group by them — a card would need to appear in multiple columns at
  once. JZ hit this directly trying to group the board by epic.
- *Parent issue / sub-issues* — create a tracking issue per epic, link stories as sub-issues. More
  "correct" hierarchically and gets an automatic progress rollup like Milestones do, but it puts each
  epic's description in a second place (the parent issue body) alongside BACKLOG.md's epic section —
  the same two-sources-of-truth drift the BACKLOG-sync workflow already exists to avoid. Also less
  scriptable: sub-issues isn't fully covered by the `gh` CLI, so linking 30 issues would mean raw
  GraphQL calls instead of `gh issue edit`.

**Why Milestones:** single-valued per issue (so board grouping works), a straight `gh issue edit
--milestone` away, and a free bonus — GitHub auto-tracks "X of Y closed" progress per milestone, which
is a real epic-completion view we didn't have before.

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
