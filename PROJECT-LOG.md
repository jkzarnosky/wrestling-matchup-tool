# Project Log — Wrestling Matchup Tool

One running log, newest entries at the top. Two entry types:
- **`[MILESTONE]`** — an epic or story shipped. Plain language, for anyone reading.
- **`[DECISION]`** — a call that was made and why. More technical, this is your interview material.

A milestone entry can include one or more decisions inline if they happened together — no need to force them apart.

---

## [2026-08-27] — [MILESTONE] Epic 1: Import wrestler roster from CSV
**Shipped:** A team's page now has a working CSV upload for its roster. Every row gets checked
(required fields, valid past birthday, positive weight, skill level 1-4, sex) and sorted into created /
skipped-as-duplicate / rejected-invalid, with a reason shown for anything that didn't get created — so
re-running the same file twice is safe (nothing gets duplicated) instead of something to be careful
about. The team page's roster section, previously a placeholder, now shows the real list.

**Decisions made:**
- **[DECISION]** A CSV import is scoped to one target team (whichever team page it's uploaded from) —
  a row naming a different team is rejected, not routed there. See DECISIONS.md for the reasoning
  against the alternative (one file spanning multiple teams).
- **[DECISION]** Age bracket is computed live from birthday, using today's date, not a fixed
  season-cutoff the way real youth leagues typically do it — a placeholder default logged as needing a
  real answer before Epic 2 depends on it (see BACKLOG.md Parking Lot).
- **[DECISION]** Wrestler creation (any path) writes one history marker row, not full field history —
  matches the "Add/edit wrestler via UI" story's AC so both creation paths behave identically.

**Next up:** Epic 1 — Add/edit wrestler via UI.

---

## [2026-08-25] — [MILESTONE] Epic .5: Team Rep base page + Admin base page
**Shipped:** Logged-in users now land on a real team page at `/team`. A Team Rep always sees their own
team; an Admin can switch between any team via a dropdown. A Team Rep who tries to view another team's
page directly by URL is blocked by the server — it never looks up or sends that team's data, not just
hides a link in the UI. Roster, CSV import, and edit-wrestler are marked "coming soon" on the page,
since that functionality is Epic 1 and doesn't exist yet.

**Decisions made:**
- **[DECISION]** Built as one shared page/route for both stories (`/team/[teamId]`, role-aware),
  rather than two separate pages — the AC for both is nearly identical (same actions, same page shape),
  just Team Rep is locked to one team and Admin gets a switcher. A second near-duplicate page would
  just be the same page with the access check removed.
- **[DECISION]** Shipped as placeholder sections instead of waiting for Epic 1 — the access-control and
  team-scoping half of these stories (the actually AC-critical, security-relevant part) doesn't depend
  on Epic 1 at all, so there was no reason to block it. The roster/CSV/edit sections will get filled in
  once those Epic 1 stories land.
- **[DECISION]** The team-scoping check (`canViewTeam`) is a small pure function, not logic embedded in
  the page component — makes it directly unit-testable without needing to render React/Next internals.

**Next up:** Epic 1 — the wrestler data model, CSV import, and add/edit-wrestler UI that these two
pages are currently placeholder-ing for.

---

## [2026-08-25] — [MILESTONE] Epic .5: Admin invites a user + New user accepts invite
**Shipped:** An Admin can invite someone by email (as Admin or, for a Team Rep, tied to a specific
team) from `/admin/invites`. The invited person gets a one-time link; opening it lets them set their
name and immediately logs them in — no password, ever. The Admin can see which invites are still
pending versus already accepted. Building the invite flow end to end covered both backlog stories at
once — the accept-invite piece is exactly what "New user accepts invite" asked for.

**Decisions made:**
- **[DECISION]** Pending invites live in their own `invites` table rather than as incomplete `users`
  rows — a `users` row always represents a real, named account. "Pending vs. accepted" is which table
  a row is in, not an inferred state from a null name. See DECISIONS.md for the alternative considered.
- **[DECISION]** Invite links expire after 7 days — not specified in the AC (marked TBD), picked as a
  reasonable default and logged as a judgment call to revisit, same as the login story's numbers.
- **[DECISION]** Re-inviting an email that already has an account is rejected outright, rather than
  silently allowed or silently ignored — avoids a confusing state where an invite link exists for
  someone who can already just log in.

**Next up:** Epic .5 — Team Rep base page.

---

## [2026-08-25] — [MILESTONE] Epic .5: Admin manages teams
**Shipped:** An Admin can now create and edit teams (name + conference) through a real page at
`/admin/teams`. Team Reps and anyone not logged in are blocked from these actions by the server, not
just by hiding the page — checked directly (not through the browser UI) and confirmed both the list
and create endpoints return "not logged in" instead of any data.

**Decisions made:**
- **[DECISION]** Conference is stored as free text, not a fixed two-value enum — the PRD/BACKLOG.md
  never names the league's actual two conferences, so hardcoding placeholder names would just be
  guessing. Free text costs nothing now and is trivial to tighten into an enum later once real names
  are known.
- **[DECISION]** Built as Next.js API routes (matching the login story's pattern) rather than Server
  Actions — Server Actions would mean less boilerplate for this one story, but introducing a second
  request pattern this early adds more inconsistency than it saves typing.

**Next up:** Epic .5 — Admin invites a user.

---

## [2026-08-25] — [MILESTONE] Epic .5: Login via emailed one-time code
**Shipped:** Anyone with an account can now actually log in — enter your email, get a 6-digit code by
email, enter the code, and you're signed in. Codes expire after 10 minutes and only work once. There's
a real login page at `/login`, and the underlying session/code logic has its own automated tests
proving the invalid-code, reused-code, expired-code, and too-many-requests cases are all correctly
rejected, not just the happy path.

**Decisions made:**
- **[DECISION]** Built this story before "Admin manages teams," even though BACKLOG.md lists it later
  — everything after it (teams, invites, base pages) needs a way to know who's logged in, so this had
  to come first regardless of the file's listed order. See CLAUDE.md's git-workflow note.
- **[DECISION]** Session/code lifetimes and the rate-limit threshold aren't specified anywhere in the
  AC — picked reasonable defaults (10-min code expiry, 30-day session, 5 requests/15 min) and logged
  them in DECISIONS.md as judgment calls to revisit, not settled requirements.
- **[DECISION]** The login-code request endpoint always responds the same way regardless of whether
  the email is registered, so it can't be used to enumerate valid accounts.

**Next up:** Epic .5 — Admin manages teams.

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
