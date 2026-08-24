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

<!-- New entries go above this line -->
