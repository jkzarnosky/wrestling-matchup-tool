# Wrestling Matchup Tool — Backlog

Single source of truth for scope and acceptance criteria. Each `### Story` heading below matches the
title of an existing GitHub issue. When AC changes here, Claude Code syncs it to the matching issue
body — see CLAUDE.md for the sync instructions. Don't rename story headings without updating the
matching issue title, or the sync will lose the match.

## Phase 0: Project Setup — DONE
- [x] Repo: https://github.com/jkzarnosky/wrestling-matchup-tool
- [x] README, DECISIONS.md, PROJECT-LOG.md, .gitignore
- [x] Synthetic dataset (clean + dirty)
- [x] GitHub Project board: https://github.com/users/jkzarnosky/projects/1
- [x] CI skeleton
- [x] MIT License

## Epic .5: User Management

**Decision:** passwordless auth — email + one-time code (or magic link). Rationale: infrequent
low-stakes logins for volunteer coaches; avoids owning password storage/reset support entirely.
Simplifies the invite flow too — accepting an invite just confirms identity, no password step.

### Story: User data model
**AC:**
- `users` table: `email` (unique), `role` (Admin | Team Rep), `first_name`, `last_name`, `team_id` (required for Team Rep, null for Admin)
- **Note:** the first Admin (JZ) is seeded directly via script/env var, not created through the invite flow — invite flow requires an existing Admin to send it

### Story: Admin manages teams
**AC:**
- Admin can create a new team (name, conference)
- Admin can edit an existing team's name/conference
- Conference is a required field on every team (league has two conferences)
- No CSV import for teams — manual entry only
- **Dependency note:** a team must exist before a Team Rep can be invited to it (Admin invites a user) or a roster imported for it (Epic 1) — this story should be built/ordered ahead of those

### Story: Admin invites a user
**AC:**
- Admin enters an email and, for a Team Rep, selects their team
- System creates a pending user record and emails a unique, expiring invite link
- Admin can see pending vs. active invites

### Story: New user accepts invite
**AC:**
- Invite link lets the user set first/last name
- No password step — confirming the invite completes setup and logs them in
- Invite link expires after use or after N days (TBD exact window)

### Story: Login via emailed one-time code
**AC:**
- User enters email, requests a code
- Code emailed, short expiry window (e.g. 10 min), single use
- Valid code creates a session; no password ever stored

### Story: Team Rep base page
**AC:**
- Shows only the logged-in Team Rep's own team — enforced server-side, not just hidden in the UI
- Available actions: CSV import, view team roster, edit wrestler
- Attempting to access another team's data directly (e.g. via URL) is blocked, not just hidden

### Story: Admin base page
**AC:**
- Same actions as the Team Rep base page (CSV import, view team roster, edit wrestler)
- Adds a team-selector dropdown, since Admin isn't scoped to a single team
- Server-side access allows any team, unlike Team Rep's single-team restriction

### Story: Public read-only matchup page (no login)
**AC:**
- Matchup pages are viewable without authentication
- No write actions are exposed on this page — display only
- *(See Parking Lot — this story's full AC still needs a pass on what exactly it displays)*

## Epic 1: Data Management

### Story: Import wrestler roster from CSV
**AC:**
- Given a CSV with columns `team, first_name, last_name, birthday, weight, skill_level, sex`, all valid rows create wrestler records with correct field values
- `team` must match an existing Team record — reference, not free text. Matching is trimmed and
  case-insensitive (a coach's spreadsheet having "ironclad wrestling club " shouldn't reject against
  "Ironclad Wrestling Club"); a row whose team still doesn't match any existing team is rejected with
  that reason, never used to silently create a new team
- `age_bracket` is calculated from `birthday` — never accepted as a CSV column; ignore it if present
- Missing required field (any column above) → row rejected, not silently skipped
- Type/range validation: `birthday` valid past date; `weight` positive number; `skill_level` integer 1–4 (1 = expert, 4 = first-year — do not invert); `sex` is M/F
- Invalid rows collected into an import report (row number + reason), not dropped
- Duplicate = same `team + first_name + last_name + birthday`; rejected with reason, not merged
- Successful import returns summary: count created, count rejected, rejected rows with reasons
- No per-field history on initial import — just a "created via import" marker; history starts at first UI edit
- Admin can import for any team (via the team selector already on the Admin base page), same as a
  Team Rep can for their own team
- **Out of scope:** ongoing re-import/sync (this is initial bulk-load only)

### Story: Add/edit wrestler via UI
**AC:**
- Team Rep can add a new wrestler through a form (same required fields as CSV import, same validation rules)
- Team Rep can edit an existing wrestler on their own team only
- Admin can add/edit a wrestler on any team (via the team selector), same as Team Rep can for their own team
- `age_bracket` is always calculated/displayed, never directly editable
- Creating a wrestler writes only a "created via UI" marker, not a full field-by-field history entry —
  consistent with CSV import; history proper starts at the first edit, regardless of how the wrestler
  was created
- Every edit (after creation) writes a history record: field, old value, new value, who, when

### Story: Wrestler change history view
**AC:** TBD — needs a decision on who can view history (Admin only, or Team Rep for their own team too) and whether it's a full audit log or a simplified "last changed" view.

### Story: Re-attempting a CSV import
**AC:**
- Given a team already has wrestlers on file, a second CSV import runs the same validation/duplicate logic as the initial import (see duplicate rule above)
- Existing wrestlers (matched by `team + first_name + last_name + birthday`) are skipped, never overwritten by a re-import — data changes to an existing wrestler only happen via UI edit, to preserve history integrity
- New rows not matching an existing wrestler are added normally
- Import summary distinguishes: created / skipped-as-duplicate (naming the existing match) / rejected-invalid
- **Out of scope:** bulk-updating existing wrestlers via re-import
- **Priority note:** lower priority than the rest of Epic 1/2, but ranks above Epic 5/6 (championship, Tot-o-rama)

## Epic 2: Weekly Matchmaking Engine

### Story: Select attending teams for the week
**AC:**
- Hosting Team Rep selects which 2–4 teams are participating in a given week's matchups
- Only wrestlers from selected teams are eligible for that week's matching run

### Story: Configure weekly matching thresholds
**AC:**
- Hosting Team Rep sets, per run: allowable age difference, allowable skill-level difference, allowable weight difference (flat lbs or %), number of mats (varies week to week, entered each time)
- Current tool's existing values should be used as sensible defaults — confirm exact numbers before building (open item)

### Story: Generate weekly matchups
**AC:**
- Matches wrestlers across selected teams within configured age/skill/weight thresholds
- Age matching uses allowable *difference*, not bracket equality — bracket is reference-only for weekly matches (an older kid from one bracket may wrestle a younger kid from the bracket above)
- Same-sex matchups preferred when a reasonable option exists; cross-sex allowed when it isn't
- Wrestlers with no valid match are flagged as outliers, not silently dropped
- Output is a printable matchup sheet

### Story: On-the-spot event adjustments (mobile)
**AC:** TBD — Epic 3, revisit once Epic 2 is proven.

## Epic 3: On-the-Spot Adjustments (mobile)
*(Stories to be broken out once Epic 2 ships — placeholder epic for now)*
- Mark a wrestler scratched at the event
- Re-run matching for just the affected wrestlers
- Mobile-friendly view for ringside use

## Epic 4: Exception Handling
*(Design deferred — revisit criteria together before writing stories)*
- Wider weight tolerance for heavyweights, willing-but-inexperienced kids, etc.
- Manual override for a coach to force/adjust one matchup

## Epic 5 — Stretch: Qualifier / Championship
*(Not yet broken into stories)*
- Track qualifier results per conference
- Seed top 4 into championship bracket (1v4, 2v3)
- 2 wrestlers per division per team, no tots
- **Bracket is strict here** — unlike Epic 2, no crossing age brackets

## Epic 6 — Stretch: Tot-o-rama
*(Not yet broken into stories)*
- Group by team where possible to limit coach travel between mats
- Prioritize matching statistical outliers over the grouping preference
- No results logging

## Architecture / Infrastructure — Open Decisions
**Decided:** this will be deployed live for the league to actually use — not repo/local-only. That
settles the rest of this list as real decisions, not hypotheticals.

| Decision | Status | Notes |
|---|---|---|
| Framework | **Decided: Next.js** | Single TS codebase for API routes + React UI |
| Hosting platform | **Decided: Vercel** | First-class Next.js support, free tier covers this scale |
| Database | **Decided: Neon (Postgres) + Drizzle ORM** | Relational data (Users/Teams/Wrestlers/history) needs real FK integrity |
| Auth approach | **Decided: hand-rolled OTP** | Own `users`/`sessions` tables — not an outsourced auth provider |
| Email delivery (invites + one-time login codes) | **Decided: Resend** | Transactional email API, free tier covers this volume |
| Session handling for passwordless login | **Decided:** `sessions` table (id, user_id, expires_at) + signed httpOnly cookie | DB-backed so a session can be revoked — matters more since this handles minors' data |
| Rate limiting on the login-code endpoint | **Decided:** DB-backed counter (attempts per email+IP per window) | No Redis needed at this traffic level |

## Definition of Done
- Core business logic (matching engine, import validation, and similar) requires meaningful test
  coverage before a story is considered done — not just "CI passes because there's nothing to fail"
- New API routes need a Tier 3 (route-level) test covering auth gating and response status codes,
  not just Tier 2 coverage of the lib function they call — see README.md's Testing section for the
  pattern (`__tests__/api/teams.test.ts`) and DECISIONS.md for why (a real untested-403 bug shipped
  in the "Admin manages teams" story before this was a rule)
- (Add to as it comes up — this is the standing bar for every story, not a one-time checklist)

## Parking Lot / To Do
Items flagged for later product discussion — not yet enough detail to be a real story, or pulled out
of an epic because it needs its own conversation. Move a row into its epic once it's resolved.

| Item | Open Question / Why Tabled | Added |
|---|---|---|
| Read-only matchup page | Needs its own AC pass — what exactly does it show (which week, which teams, how a parent finds it), does it need to reflect on-the-spot changes made at the event in real time? | This session |
| Test suite spins up a fresh pglite instance per test (`beforeEach`) | Cheap now, but watch as the DB test suite grows — may need a shared instance + per-test transaction rollback instead of a fresh instance each time, for speed | 2026-08-25 |
| Host a public demo on Vercel | Deferred until there's an actual audience to show it to (local `npm run demo:reset` covers dev/portfolio needs for now). Two follow-on decisions already made for whenever this happens: (1) demo login shows the OTP code on-screen rather than wiring real Resend — revisit real Resend if a more production-like demo is wanted later; (2) data resets on a schedule (cron) once there's something persistent to reset | 2026-08-27 |
| Add Tier 3 (route-level) tests for the remaining routes | `app/api/teams` and `app/api/teams/[id]/wrestlers*` have them now — `app/api/invites` and `app/api/auth` still rely on Tier 2 + manual verification only | 2026-08-27 |
| Age bracket cutoff date | Currently computed from live current age (see DECISIONS.md), not a fixed season cutoff. Real youth leagues typically use a cutoff (e.g. "age as of Jan 1") specifically so kids don't change brackets mid-season — needs a real answer before Epic 2 (matchmaking) depends on brackets for real | 2026-08-27 |
| CSV import history | Import results (created/duplicate/invalid counts + per-row reasons) are only ever shown once, in the browser, right after the upload — nothing is persisted. Navigate away or refresh and it's gone; no way to look up what happened on a past import. Possibly folds into "Wrestler change history view" once that story gets scoped, rather than being its own thing | 2026-08-27 |

## Priority / Ordering
Story order in this file **is** the priority order — top to bottom, epic by epic. The GitHub Project
board (https://github.com/users/jkzarnosky/projects/1) tracks status (Todo/In Progress/Done), not
priority; board card position/drag-order isn't exposed via the API, so it can't be read back
programmatically. When priority changes, reorder the stories here.
