# Decisions Log

Running log of choices made and why. Lightweight — one entry per real decision (a choice between two
or more real alternatives), newest at the top.

---

## 2026-09-11 — Disabled Next.js's auto-injected `CLAUDE.md` agent-rules block

`next dev` (Next.js 16) auto-writes a generic "read `node_modules/next/dist/docs/` before writing any
code" block into `CLAUDE.md` whenever it detects an AI coding agent and the block is missing, re-adding
it on every run (confirmed from source: `next/dist/server/lib/generate-agent-files.js` and
`app-info-log.js`, gated on `config.agentRules`, default `true`).

**Alternatives considered:** (1) commit the block as-is — harmless in isolation, but Next.js re-touches
it on future version bumps and it's boilerplate bolted onto a hand-maintained file, not something
curated for this project; (2) create an `AGENTS.md` file so `writeAgentFiles` redirects there instead
of `CLAUDE.md` (it prefers `AGENTS.md` when present) — avoids touching `CLAUDE.md`, but keeps a
generic reminder file around for no observed benefit.

**Chosen: `agentRules: false` in `next.config.ts`.** The block's entire value is prompting a check of
version-pinned docs before writing Next.js-specific code, guarding against stale training-data APIs —
a real problem in general, given Next's history of breaking changes (async `params`/`cookies()`, App
vs Pages Router). But in this project's actual working pattern, new code is written by mirroring
already-established conventions in the codebase, and genuinely unfamiliar APIs get checked against
installed source directly as a matter of practice — so the generic reminder wasn't preventing anything
in practice, while the recurring rewrite of a hand-maintained instructions file was real, avoidable
noise. Verified: `agentRules: false` stops the write (confirmed via a `next dev` run — no log line, no
`CLAUDE.md` diff) without needing a redirect file.

---

## 2026-09-10 — Playwright e2e: DB driver made pluggable, and how the test drives the OTP login

Adding Tier 4 (Playwright) forced two supporting decisions.

**`db/index.ts` picks its driver from the URL now.** It was hardwired to `@neondatabase/serverless`
(HTTP), which only talks to Neon/Vercel/Supabase endpoints — so the e2e job couldn't run the real app
against a plain Postgres service container. Alternatives: (1) give CI a secret pointing at a real Neon
e2e database — most faithful, but needs JZ to provision one and the PR's CI stays red until then; (2)
run a Neon websocket proxy in the container — extra moving part for no real gain. Chose to make the
driver pluggable: node-postgres for a non-Neon URL, Neon serverless for a `*.neon.tech` URL, override
with `DB_DRIVER`. Prod on Vercel is unchanged; local dev against Docker Postgres now works too, no Neon
account needed. `pg` moves from a dev-only dep (it was already pulled in for the migration CI check) to
a real dependency.

**The e2e login uses a test seam, not a bypass.** The one-time code is SHA-256 hashed in the DB and
never stored plaintext, so the suite can't read it back. Options weighed: (a) a test-only "just make me
a session" route — fast, but then the real login UI is never exercised; (b) brute-force the 6-digit code
against the stored hash — works (SHA-256, 1M candidates, sub-second) but too cute for a codebase modeled
on a regulated shop, and couples the test to the hash impl; (c) a deterministic code in test mode —
one env var away from every production login code being `000000`. Chose (d): when `E2E_TEST_MODE=1`,
the app appends each issued code to a local file (`e2e/.artifacts/login-codes.log`) and the test reads
the latest line. Single gate on an explicit opt-in env var never set in a real deployment; even if it
were, all it does is write a meaningless local file. The real email → code → session UI runs end to end.

**Playwright over Cypress; video kept as a CI artifact.** Playwright for the built-in multi-browser
support, trace viewer, and no-flake auto-waiting. `video: "on"` records every journey; the
`playwright-report` artifact (HTML + videos + traces) uploads on every CI run — that's the "watch the
critical paths actually run" output, downloadable from the PR checks. Not published to a always-on URL
(GitHub Pages) yet — possible follow-up.

---

## 2026-09-09 — Generate weekly matchups: algorithm, mat assignment, cross-team scope

The last Epic 2 story. Two real forks discussed with JZ before building, plus two smaller calls made
along the way.

**Matching algorithm: greedy nearest-weight, then a bounded local-repair pass.** Alternatives
discussed: (1) plain greedy alone -- simplest, but a known failure mode (no backtracking, an early
"good enough" pick can strand someone who could've been matched with a different arrangement); (2) a
full optimal weighted-matching algorithm (Edmonds' Blossom, since 3-4 attending teams makes this a
general, non-bipartite graph, not solvable by the simpler bipartite algorithms) -- provably best, but a
genuinely different algorithm family, not an extension of greedy, and a multi-day implementation with
real correctness risk hand-rolling Blossom's odd-cycle contraction for a benefit that's probably modest
at this league's actual scale (dozens of kids, not hundreds). Chose the middle ground: plain greedy
first, then a bounded search that tries rescuing exactly two remaining outliers by splitting one
existing pair between them (the minimal repair actually possible post-greedy -- there's no third free
wrestler to complete a single-outlier repair with). Verified against a real, hand-traced adversarial
5-wrestler case (found by brute-force search, not constructed by guesswork) where plain greedy leaves 3
outliers and repair rescues 2 of them, the 3rd being genuinely unmatchable -- see
`__tests__/lib/matchup-generation.test.ts`.

**Mat assignment: round-robin across the configured mat count, sheet grouped by mat.** Alternative:
leave `matCount` as a pure capacity/record-keeping input with no effect on the output. Chose assignment
-- a real printed matchup sheet at an event is virtually always organized by mat so coaches/refs know
where to send each pair; leaving `matCount` unused in the output would make that threshold field
decorative. Assignment order follows the order `generatePairings` produced pairs in (not otherwise
optimized) -- even spread across mats, nothing fancier.

**Cross-team only, never a teammate.** Not spelled out as explicitly in the AC as the other rules, but
"matches wrestlers *across* selected teams" is the strongest reading, and matches how a real weekly
dual actually works (against other clubs, not your own team). Enforced as a hard eligibility rule.

**Weight percent mode is relative to the lighter wrestler, not the heavier or an average.** The
standard convention real weight-class allowances use. Test coverage specifically distinguishes this
from the (wrong) alternative of using the heavier wrestler as the denominator, since the two can
disagree right at a threshold boundary.

**Printable sheet: plain browser print (`window.print()` + `@media print` CSS), not a PDF-generation
dependency.** AC just says "printable" -- a `Ctrl+P` of the matchup-run page, with the interactive
chrome (forms, buttons) hidden via a `.no-print` utility class, satisfies that without adding a new
dependency for a first pass. Revisit if a more polished export is actually wanted later.

---

## 2026-09-09 — Thresholds are a separate step on the same run, not folded into creation

"Configure weekly matching thresholds" adds `PATCH /api/matchup-runs/[id]` rather than accepting
thresholds as part of `POST /api/matchup-runs` at creation time. Keeps each Epic 2 story owning a
distinct step of the same run (select teams → configure thresholds → generate), matching the
incremental-persistence decision from 2026-09-03, rather than one story's endpoint growing to cover the
next one's scope. Callable more than once -- a Rep realizing they need to widen a threshold after
seeing the roster shouldn't need to abandon the run and start over.

Threshold columns on `matchup_runs` are nullable, not DB-defaulted. The AC's "pre-fill with sensible
defaults" is a UI-level suggestion (`DEFAULT_AGE_DIFF_YEARS` etc., exported from `lib/matchup-runs.ts`
as the single source of truth the form imports) the Rep can change before saving -- not a value the DB
would silently apply if they somehow skipped the step. Mat count has no default at all, per the AC
("varies too much week to week for one to mean anything") and the earlier threshold-defaults decision.

---

## 2026-09-03 — Matchup run persistence starts now, built incrementally

JZ's call after I flagged this mid-implementation rather than during the Epic 2 AC review (should have
caught it then — the review already identified persistence as a hard blocker for #6/#28, just didn't
realize #4 was where the decision actually had to be made first): `matchup_runs` + a `matchup_run_teams`
join table are added now, with just `id`/`created_by`/`created_at` and the selected teams. "Configure
weekly matching thresholds" (#5) and "Generate weekly matchups" (#6) will add their own columns/tables
to this run as they ship, rather than each story inventing its own storage or #4 shipping ephemeral and
needing a rework later. Same incremental-schema pattern Epic 1 used for `wrestlers`/`wrestler_history`.

**Team count (2-4) is application-level validation, not a DB constraint.** Postgres can't cheaply
express "between 2 and 4 related rows exist" as a `CHECK` the way `wrestlers_skill_level_range` checks
a single column — would need a trigger, which is more machinery than this warrants. Enforced in
`lib/matchup-runs.ts` instead, matching how CSV/wrestler field validation is already application-level.

**No team-scoping authorization gate on matchup-run routes.** Follows directly from the Epic 2 AC
review's cross-team read-access decision: any logged-in user (Admin or Team Rep) can select any team in
the league to attend, not just their own. `POST /api/matchup-runs` only checks "logged in," the same as
`GET /api/teams` already did before this story.

---

## 2026-09-03 — Weekly matching threshold defaults: ±1 year age, ±1 skill level, ±10% weight

Closes the one real blocker the Epic 2 AC review flagged: "Configure weekly matching thresholds" (issue
#5) called for "the current tool's existing values" as defaults but didn't say what they were. JZ
supplied real numbers rather than the alternative discussed — shipping the fields blank/required with
validation-only and no defaults at all (which would have been a legitimate, simpler option; mat count
already works that way since it varies too much week to week for a default to mean anything). Defaults
still apply per-run, not system-wide — the Hosting Team Rep can always override them for a given week;
they exist purely to give a new/less experienced Rep a sensible starting point instead of a blank guess.

**Chosen:** ±1 year age difference, ±1 skill-level difference, ±10% weight difference (the weight
field's flat-lbs-vs-percentage toggle — see the Epic 2 AC review entry below — defaults to percentage
mode to match).

---

## 2026-09-02 — Epic 2 AC review: closed 3 stale issues, resolved 2 ambiguities, flagged the real blocker

Reviewed all Epic 2 GitHub issues against BACKLOG.md before starting implementation (same pass as the
Epic 1 AC review). BACKLOG.md defines only 3 real Epic 2 stories; GitHub had 7 issues under the
milestone.

**Closed #7, #8, and #9 as superseded.** Each was a pre-restructure fragment (same-sex preference,
outlier flagging, printable sheet, respectively) whose scope is now fully covered by #6's consolidated
"Generate weekly matchups" AC. Same pattern as closing #2/#3 in Epic 1.

**Fixed #28's stale Epic label.** Its body said `Epic: Epic .5: User Management` while its milestone
said Epic 2; left the milestone as Epic 2 (it can't actually be built until Epic 2 produces a matchup to
display, so grouping it there matches real dependency order) and corrected the body text to match.

**Weight-difference mode is a per-run choice, not a fixed system-wide setting.** The Hosting Team Rep
picks flat lbs or percentage each time they configure a run, consistent with every other threshold on
that story being set "per run." BACKLOG.md's AC for "Configure weekly matching thresholds" now says so
explicitly instead of leaving `(flat lbs or %)` ambiguous about who chooses and when.

**Cross-team read access: any Team Rep gets full read access to any team's roster, not just their own.**
"Select attending teams for the week" requires a "Hosting Team Rep" to see and pick from other teams'
rosters, but `canViewTeam` (lib/authorization.ts) currently only allows Admin-any-team / Rep-own-team-
only — a Team Rep has zero visibility into any other team today. Two narrower alternatives were
considered and rejected: (1) Admin-only for weekly matchup runs, dropping the "Hosting Team Rep"
language entirely — rejected because BACKLOG.md's AC explicitly names the Team Rep as the actor running
this, not the Admin; (2) a contextual grant scoped to just the teams a Rep has selected as attending —
rejected as real extra implementation complexity (a new authorization concept, not just reusing
`canViewTeam`) for a case where the league is small enough that any-team read access isn't a meaningful
exposure. **Not yet implemented** — `canViewTeam` still reflects the Epic 1 rule; this decision just
unblocks scoping the story, the actual authorization change lands with the story's implementation.

**Still open, deliberately not resolved in this pass:**
- Threshold defaults ("current tool's existing values") — real numbers only JZ has, not something to
  guess at.
- Whether "number of mats" implies the printable sheet assigns each match to a specific mat, or is
  purely a capacity input with no output mapping.
- Whether a matchup run (thresholds used + results) gets persisted anywhere — same shape as the
  CSV-import-history Parking Lot gap from Epic 1, and a hard blocker for #28 (the public page needs
  something to read).

---

## 2026-09-02 — CSV/add-wrestler validation hardening: age ceiling, non-CSV upload, sentinel strings

JZ asked for a review of CSV field validation against a specific list of edge cases (whitespace, nulls,
old birthdays, non-numeric weight, malformed rows, non-CSV upload). Verified empirically (Papa.parse +
`Date`/`Number` coercion behavior) rather than guessed. Most cases were already correctly handled and
only needed test coverage added; three were real decisions:

**Birthday upper bound: rejects any age over the league's oldest bracket (Intermediate, 13).** Not an
arbitrary round number like "100 years" — reuses `MAX_LEAGUE_AGE` from `lib/age-bracket.ts` (now
exported as the single source of truth for both the bracket table and this check) so a birthday that
couldn't belong to *any* bracket is rejected outright rather than silently importing an age the app has
no way to place. No lower bound was added — a newborn isn't invalid data, just not old enough for a
bracket yet, and JZ's ask was specifically about *old* birthdays.

**Non-CSV file upload: added an upfront check, not left to per-row rejection.** Feeding a non-CSV file
(image, PDF, etc.) through `Papa.parse` doesn't throw — it produces garbage rows that *would* eventually
fail per-row validation anyway, so data integrity was never actually at risk. The gap was UX: the user
would see a wall of confusing "missing required field" rejections instead of one clear message. Fixed by
checking upfront for zero data rows or zero recognizable expected-column headers, and failing the whole
import with one message. Chose "no recognizable headers at all" over stricter checks (e.g. requiring
*every* expected header, or sniffing file content/MIME type) — cheap to compute from what `Papa.parse`
already returns, and doesn't reject a legitimately reordered or superset CSV.

**Sentinel-like strings ("null", "N/A") in text fields: left unhandled, on purpose.** Considered a
blocklist check on `first_name`/`last_name`, but JZ chose to leave it — not worth the false-positive risk
(a real name coinciding with a blocklist entry) for a case that hasn't actually shown up.

---

## 2026-08-27 — CSV import: scoped to one target team, not free-form across the league

**Chosen:** import always happens in the context of one team (whichever team page you're on); a CSV
row's `team` column must match *that* team or the row is rejected, even if it names a real team
elsewhere in the league.

**Alternative considered:** treat the CSV as league-wide, with each row's `team` column picking its own
destination team, letting one file cover multiple teams at once. This is what the pre-restructure #3
issue implied. Rejected: it doesn't fit the already-shipped base-page model, where a Team Rep is
hard-scoped to their own team and an Admin explicitly *selects* one team to act on — a free-form
multi-team CSV would need its own, different authorization story. Scoped-to-one-team also makes the
`team` column mostly a confirmation/typo-catcher rather than a real routing field, which matches how a
real coach would fill out their own team's roster sheet.

**Age bracket: computed live from `birthday`, using current date, not persisted.** Not stored as a
column -- a snapshot would go stale as kids have birthdays mid-season. Uses today's date as the
reference point, not a fixed season-cutoff date (e.g. "age as of Jan 1"), which is how many real youth
leagues actually run age brackets specifically to avoid kids hopping brackets mid-season. BACKLOG.md's
AC never specifies a cutoff rule, so this is a placeholder, not a considered choice -- flagged to
revisit before Epic 2 (matchmaking) leans on brackets for real, since getting this wrong there has much
more consequence than it does for Epic 1's CSV validation.

**CSV parsing: `papaparse` dependency, not hand-rolled.** Quoted fields and embedded commas are real
edge cases a real coach's spreadsheet export could hit; a well-tested library is safer than a parser
written for this one story.

---

## 2026-08-27 — Epic 1 AC review: closed 2 stale issues, resolved 3 ambiguities

Reviewed all Epic 1 issues against BACKLOG.md before starting implementation. Four things resolved:

**Closed #2 and #3 as superseded.** #2's scope ("surface bad rows instead of failing silently") is
fully covered by #1's current AC (missing-field rejection, type/range validation, invalid-row report).
#3 never had AC, and its title ("weekly matchup run") is Epic 2 scope, not Epic 1 — #1's `team` column
being per-row already means one CSV can span multiple teams. Both predate the BACKLOG.md restructure
and were never updated to match.

**CSV team-name matching: trimmed + case-insensitive**, not byte-exact. Alternative (exact match) would
reject a real coach's spreadsheet over a trailing space or capitalization difference — a false rejection
serves no one, since the intent (which team) is unambiguous either way.

**Admin can do CSV import and add/edit wrestlers for any team**, not just Team Rep for their own team —
consistent with the team-selector pattern already shipped on the Admin base page for viewing. Wasn't
stated in either story's AC, only inferable from the base-page stories; made explicit now rather than
left as an assumption to rediscover during implementation.

**Wrestler creation gets a marker only, not full field history, on both creation paths.** CSV import
already said so explicitly; "Add/edit wrestler via UI" only said "every save writes a history record"
without distinguishing create from edit. Made UI-creation match CSV-creation rather than leaving two
creation paths with silently different history behavior.

**Still open:** "Wrestler change history view" story remains `AC: TBD` — who can view history (Admin
only vs. Team Rep for their own team too) and full audit log vs. simplified view are both still
unresolved. No GitHub issue exists for it yet.

---

## 2026-08-27 — Demo: local-only for now, decisions pre-made for hosting later

**Chosen:** no hosted demo yet — `npm run demo:reset` covers local/portfolio needs. Two follow-on
questions were decided in advance anyway, so they don't need re-litigating whenever hosting happens:
- **Demo auth:** show the OTP code on-screen instead of wiring real Resend for the demo. Insecure by
  design (anyone "logging in" sees their own code immediately) but zero email-infrastructure cost, and
  it's clearly a demo, never how production would behave. Real Resend is the alternative if a more
  production-faithful demo is wanted later.
- **Data refresh (once hosted):** scheduled reset (cron), not manual-only — self-healing, so the demo
  never sits messy for long between whoever last poked at it and the next visitor.

**Why local-only now:** Vercel hosting is free-tier-viable and not much setup, but there's no actual
audience for a public demo yet — premature to stand up and maintain infrastructure (even low-effort
infrastructure) for that.

---

## 2026-08-27 — Testing: four tiers, Tier 3 (route-level) added as a new requirement

**Chosen:** unit (pure functions) / integration (pglite-backed lib tests, the primary suite today) /
route (Next.js route handlers, lib functions mocked out, testing auth gating + response shape) / e2e
(none automated yet, small set planned for critical paths only). Documented in README.md.

**Why Tier 3 specifically, now:** the "Admin manages teams" PR shipped with an untested 403 check — a
plain `if` in the route handler that no test touched, caught only because JZ noticed an inconsistent
checkbox in the PR description, not because anything failed. Route-level tests (mocking the lib layer,
so they don't re-prove business logic Tier 2 already covers) close exactly that gap. Added to BACKLOG.md's
Definition of Done for new routes going forward; only one route (`teams`) has one so far, the rest are
tracked in the Parking Lot.

**Why not full E2E coverage:** Playwright is real setup and CI runtime cost, and most of what it'd catch
is already caught cheaper at Tier 2/3. A small number of true cross-page flows (login, invite-accept)
justify it; comprehensive coverage doesn't yet.

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
