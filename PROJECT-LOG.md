# Project Log — Wrestling Matchup Tool

One running log, newest entries at the top. Two entry types:
- **`[MILESTONE]`** — an epic or story shipped. Plain language, for anyone reading.
- **`[DECISION]`** — a call that was made and why. More technical, this is your interview material.

A milestone entry can include one or more decisions inline if they happened together — no need to force them apart.

---

## [2026-09-03] — [MILESTONE] Epic 2: Select attending teams for the week
**Shipped:** The first real Epic 2 feature — a Hosting Team Rep (or Admin) can start a new weekly
matchup run by picking 2–4 attending teams from the full league, not just their own team. The run gets
a real page (`/matchups/[runId]`) showing who's attending; thresholds and match generation are next.

**Decisions made:**
- **[DECISION]** Added `matchup_runs` + a `matchup_run_teams` join table now, built incrementally as
  later Epic 2 stories ship, rather than shipping this story ephemeral (client-side only) and reworking
  it once persistence became unavoidable for "Generate weekly matchups" / the public read-only page.
- **[DECISION]** The 2-4 team count rule is application-level validation (`lib/matchup-runs.ts`), not a
  DB `CHECK` — Postgres can't cheaply express "this many related rows exist" as a column constraint.
- **[DECISION]** No team-scoping authorization gate on the new routes — any logged-in user can select
  any team to attend, per the Epic 2 AC review's cross-team read-access call.

**Next up:** Epic 2 — Configure weekly matching thresholds (#5), building on this run.

---

## [2026-09-03] — [MILESTONE] Weekly matching threshold defaults confirmed
**Shipped:** No app code — closed the one real blocker the Epic 2 AC review flagged. "Configure weekly
matching thresholds" (issue #5) now has actual default numbers instead of an open placeholder.

**Decisions made:**
- **[DECISION]** Defaults: ±1 year age difference, ±1 skill-level difference, ±10% weight difference —
  all editable per run, not fixed. Chosen over the alternative of shipping the fields blank/required
  with no defaults at all (a legitimate simpler option, discussed and set aside since a new/less
  experienced Hosting Rep benefits from a sensible starting point). Mat count still has no default —
  it varies too much week to week for one to mean anything.

**Next up:** Epic 2 implementation can now start for real — "Select attending teams for the week" (#4)
is the natural first story, since the other two stories depend on teams already being selected.

---

## [2026-09-02] — [MILESTONE] Epic 2 AC review: closed 3 stale issues, resolved 2 ambiguities, flagged the real blocker
**Shipped:** No new app functionality — a review pass over every Epic 2 GitHub issue against BACKLOG.md
before starting implementation, same as the Epic 1 AC review that preceded that epic's work.

**Decisions made:**
- **[DECISION]** Closed issues #7, #8, and #9 as superseded — each was a pre-restructure fragment
  (same-sex preference, outlier flagging, printable sheet) fully covered by #6's consolidated "Generate
  weekly matchups" AC. Same pattern as closing #2/#3 in Epic 1.
- **[DECISION]** Fixed issue #28's stale `Epic .5` label to `Epic 2`, keeping its milestone at Epic 2
  since it can't be built until Epic 2 produces a matchup to display.
- **[DECISION]** Weight-difference mode (flat lbs vs. percentage) is a per-run choice made by the
  Hosting Team Rep, not a fixed system-wide setting — consistent with every other threshold on that
  story. BACKLOG.md's AC updated to say so explicitly.
- **[DECISION]** Any Team Rep gets full cross-team read access for weekly matchup runs, not just their
  own team — the only way "Select attending teams" (a Team Rep action per BACKLOG.md) can work at all,
  since `canViewTeam` currently gives a Rep zero visibility into any other team. Not yet implemented —
  this decision unblocks scoping the story; the authorization change itself lands with the story. See
  DECISIONS.md for the two narrower alternatives considered and rejected.

**Next up:** Three real open items before Epic 2 implementation can start: (1) actual default numbers
for age/skill/weight thresholds and mat count — only JZ has these, (2) whether "number of mats" means
the printable sheet assigns matches to specific mats, (3) whether a matchup run gets persisted anywhere
(blocks #28, the public read-only page).

---

## [2026-08-27] — [MILESTONE] Log hygiene: broadened the PROJECT-LOG trigger rule, fixed an ordering bug
**Shipped:** No app code — a cross-check of PROJECT-LOG.md against DECISIONS.md (done in the planning
chat) found a misplaced entry and three decision-only sessions that never got logged, since CLAUDE.md's
old rule only triggered an entry after a shipped story. Fixed both, and tightened the rule itself so
this doesn't keep happening.

**Decisions made:**
- **[DECISION]** CLAUDE.md's trigger for a PROJECT-LOG entry now also covers "a substantive
  decision-making session that ships no story" (an AC review, an architecture/tooling choice, a scoping
  change) — anything that would already earn a DECISIONS.md entry earns a PROJECT-LOG one too. The old
  "only after a shipped story" rule was already being applied inconsistently (the very first "Product
  planning" entry from 2026-08-24 was decision-only and got logged anyway), and it was exactly the
  decision-only sessions — the AC review, the testing-tiers writeup, the demo-hosting call — that kept
  falling through the cracks despite being good interview material.
- **[DECISION]** "User data model" (dated 2026-08-25) was sitting at the very bottom of the log, below
  two 2026-08-24 entries — it had been appended after whatever the last entry happened to be instead of
  placed in correct chronological order. Moved to its correct position: oldest of the 2026-08-25
  entries, immediately before "Login via emailed one-time code" (which depends on the data model
  existing). CLAUDE.md now says explicitly to place new entries in true chronological order, not just
  prepend them.

**Next up:** Review and merge the three open Epic 1 PRs (#46, #47, #48); once merged, their own
PROJECT-LOG entries will need restacking into correct date order alongside this fix, per the usual
stacked-PR routine.

---

## [2026-08-27] — [MILESTONE] Epic 1: Re-attempting a CSV import
**Shipped:** Nothing new to build — this story's entire AC (re-running a CSV import skips existing
wrestlers instead of overwriting them, genuinely new rows still get added, and the summary distinguishes
why each row didn't get created) was already satisfied by the "Import wrestler roster from CSV" story's
duplicate-detection design. Added one test making that explicit for the exact scenario the AC describes
(some rows already on file, one row that isn't) rather than closing on the strength of the single-row
duplicate test alone.

**Next up:** Epic 1 is done except "Wrestler change history view," which is still `AC: TBD` with no
GitHub issue — needs a product decision (who can view history, full audit log vs. simplified) before
it can be scoped. Epic 2 (Weekly Matchmaking Engine) is next up for real work.

---

## [2026-08-27] — [MILESTONE] Epic 1: Add/edit wrestler via UI
**Shipped:** A team's roster page now has a real form for adding a wrestler by hand and editing an
existing one in place, no CSV required — same field validation either way (required fields, past
birthday, positive weight, skill 1-4, sex). Editing a wrestler now writes a real audit trail: exactly
which field changed, what it was, what it became, who did it, and when.

**Decisions made:**
- **[DECISION]** Folded the CSV-import form, the roster list, and the new add/edit form into one
  component (`WrestlerManager`) instead of three separate ones — they all need to refresh the same
  roster state after any of them succeeds, which is simpler as one shared component than coordinating
  a refresh signal across three.
- **[DECISION]** Field validation logic (required fields, birthday/weight/skill/sex rules) is shared
  between CSV import and the UI form, not duplicated — both call the same internal validator, so a
  future rule change can't accidentally apply to only one path.
- **[DECISION]** Team can't be changed via edit — no story asks for moving a wrestler between teams,
  and adding that silently would be scope no one asked for.

**Next up:** Epic 1 — Re-attempting a CSV import (likely already satisfied by the import story's
duplicate handling — needs its own review before closing).

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

## [2026-08-27] — [MILESTONE] Epic 1 AC review: closed 2 stale issues, resolved 3 ambiguities
**Shipped:** No new app functionality — a review pass over every Epic 1 GitHub issue against
BACKLOG.md before starting implementation, to catch drift between the two and settle open questions
before code gets written against them.

**Decisions made:**
- **[DECISION]** Closed issues #2 and #3 as superseded — #2's scope was already fully covered by
  issue #1's current AC (bad-row handling, validation, invalid-row report); #3's title matched Epic 2
  scope, not Epic 1, and never had AC to begin with. Both predated the BACKLOG.md restructure and were
  never updated to match it.
- **[DECISION]** CSV team-name matching is trimmed and case-insensitive, not byte-exact — an exact
  match would reject a real coach's spreadsheet over a stray space or capitalization difference, for
  no real benefit.
- **[DECISION]** Admin can CSV-import and add/edit wrestlers for any team, not just their own —
  consistent with the team-selector already shipped on the Admin base page; made explicit in the
  stories' AC rather than left as an assumption to rediscover during implementation.
- **[DECISION]** Wrestler creation (via CSV or UI) gets a "created via import/UI" marker only, not
  full field-by-field history, on both paths — CSV import already said so explicitly; UI creation is
  now made to match rather than silently differing.

**Next up:** Begin Epic 1 implementation — wrestler data model and CSV import.

---

## [2026-08-27] — [MILESTONE] Decision: no hosted demo yet
**Shipped:** No code — a decision to stay local-only for now (`npm run demo:reset` covers dev/
portfolio needs) rather than standing up hosting before there's an actual audience to show it to.

**Decisions made:**
- **[DECISION]** Whenever a hosted demo does happen, it shows the OTP code on-screen instead of
  wiring real Resend email — zero email-infrastructure cost for something that's clearly a demo; real
  Resend is the fallback if a more production-faithful demo is wanted later.
- **[DECISION]** Once hosted, demo data resets on a schedule (cron), not manual-only, so it never sits
  messy for long between whoever last poked at it and the next visitor.

**Next up:** Revisit hosting once there's a real audience; continue Epic 1 implementation meanwhile.

---

## [2026-08-27] — [MILESTONE] Testing strategy formalized into four tiers; Tier 3 added as a new requirement
**Shipped:** No new feature — the testing approach already in use (unit + pglite-backed integration
tests) was written down explicitly in README.md, alongside two additions: route-level tests (auth
gating, response codes) and a small, deliberately limited set of e2e tests for critical flows only.

**Decisions made:**
- **[DECISION]** Added Tier 3 (route-level) after the "Admin manages teams" PR shipped with an
  untested `403` check — a plain `if` in the route handler that nothing touched, caught only because
  JZ noticed a mismatched checkbox in the PR description, not because a test failed. Route-level tests
  close that specific gap without re-proving business logic Tier 2 already covers.
- **[DECISION]** Not pursuing full E2E coverage — Playwright is real setup and CI-runtime cost, and
  most of what it would catch is already caught cheaper at Tier 2/3. A small number of true cross-page
  flows (login, invite-accept) justify it; comprehensive coverage doesn't yet.

**Next up:** Add Tier 3 tests to the remaining routes (only `teams` has one so far); continue Epic 1.

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
- **[DECISION]** Priority/ordering was initially assigned to the GitHub Project board rather than
  BACKLOG.md, to avoid the two drifting out of sync. (Superseded 2026-08-24, implementation session —
  board card position turned out not to be readable via the GitHub API, so BACKLOG.md's file order
  became the actual source of truth instead. See DECISIONS.md.)
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

<!-- New entries go above this line -->
