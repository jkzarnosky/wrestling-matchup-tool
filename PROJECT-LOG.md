# Project Log — Wrestling Matchup Tool

One running log, newest entries at the top. Two entry types:
- **`[MILESTONE]`** — an epic or story shipped. Plain language, for anyone reading.
- **`[DECISION]`** — a call that was made and why. More technical, this is your interview material.

A milestone entry can include one or more decisions inline if they happened together — no need to force them apart.

---

## [YYYY-MM-DD] — [MILESTONE] <Epic/story name>
**Shipped:** one or two sentences on what actually works now.

**Decisions made:**
- **[DECISION]** <the call> — <why, in a sentence or two; what was the alternative and why not>

**Next up:** what's being pulled off the backlog next.

---

## [2026-08-24] — [MILESTONE] Product planning: Epics 1, .5, and 2 fleshed out
**Shipped:** No code this session — this was product-owner work in the planning chat, turned into a
restructured BACKLOG.md with real acceptance criteria per story, ready for Claude Code to sync into
the existing GitHub issues.

**Decisions made:**
- **[DECISION]** Passwordless auth (email + one-time code) over managed passwords — infrequent,
  low-stakes logins for volunteer coaches don't justify owning password storage/reset support; also
  simplifies the invite flow to a single confirmation step.
- **[DECISION]** `age_bracket` is calculated from `birthday`, never a direct input — weekly matchups
  filter by allowable age *difference* (a kid can wrestle up one bracket), while tournament/
  championship matchups filter by bracket *equality*, strictly. Two different rules by context, not
  one shared constant.
- **[DECISION]** CSV re-import never overwrites existing wrestlers — duplicates (matched by team +
  name + birthday) are skipped, not merged, so data integrity/history stays tied to UI edits only.
- **[DECISION]** A Team entity (name + conference) was missing from scope entirely — added as its own
  story, ordered ahead of both the invite flow and CSV import, since both depend on a team already
  existing.
- **[DECISION]** Priority/ordering lives on the GitHub Project board, not duplicated as a list in
  BACKLOG.md — avoids the two drifting out of sync. BACKLOG.md owns scope/AC; the board owns sequence.
- **[DECISION]** This will be deployed live for the league to actually use, not left as a local-only/
  repo-only project — settles hosting, DB, email delivery, session handling, and rate limiting as real
  open decisions (tracked in BACKLOG.md) rather than deferred indefinitely.

**Next up:** Resolve the Architecture/Infrastructure decisions in BACKLOG.md (hosting, DB, email
service), then sync the new/updated stories from BACKLOG.md into GitHub issues before resuming Epic 1
implementation.

---

## [2026-08-24] — [MILESTONE] Phase 0: Project Setup
**Shipped:** The project now has a real repo instead of just planning docs — a TypeScript/Node codebase
with automated tests and a CI check that runs on every pull request, a README and decisions log, an MIT
license, and a generated fake wrestler roster for development and demos (no real kid's data is ever
committed). Backlog stories are now tracked as GitHub Issues on a project board instead of only as a
checklist in a file.

**Decisions made:**
- **[DECISION]** TypeScript/Node over Python for the matching engine — chosen because the roadmap
  includes a mobile-friendly web UI (Epic 3) and hosting matchups on a website, and sharing one language
  across engine and frontend avoids a second stack. See DECISIONS.md for the full write-up.
- **[DECISION]** GitHub Issues + a GitHub Project board over tracking status only in
  `wrestling-matchup-tool-backlog.md` — a markdown checklist doesn't sync with a Project board
  automatically, so keeping both as day-to-day trackers would drift out of sync. The backlog file now
  serves as the high-level epic/roadmap reference; the board (one issue per story) is the place status
  actually gets updated.

**Next up:** Epic 1 — Data Ingestion, starting with CSV import of a wrestler roster (Sprint 1 plan:
data model + CSV import/validation before touching the matching algorithm or any UI).

---

## [2026-08-25] — [MILESTONE] Epic .5: User data model
**Shipped:** The database now has real tables for teams and user accounts (Admin or Team Rep), with a
database-level rule that an Admin never has a team assigned and a Team Rep always does — that rule can't
be bypassed by a bug in the app code later. The first Admin account (JZ) is seeded directly rather than
through the not-yet-built invite flow, and re-running that seed script is safe (won't create a duplicate).

**Decisions made:**
- **[DECISION]** The Admin/Team-Rep team-assignment rule is enforced with a database CHECK constraint,
  not just application code — a bug in a future feature can't silently violate it, since Postgres itself
  rejects the bad row.
- **[DECISION]** Schema/constraint tests run against an in-memory Postgres (pglite) built from the real
  generated migration file, instead of against the live Neon database — same real Postgres behavior
  (enums, constraints, unique indexes), but deterministic in CI with no database credentials needed.

**Next up:** Epic .5 — Admin manages teams.

---

<!-- New entries go above this line -->
