# Wrestling Matchup Tool — Project Setup & Backlog

## Phase 0: Project Setup
- [ ] Create public repo `wrestling-matchup-tool` on GitHub
- [x] README: problem statement, current-state summary, what this replaces/improves (pull from the PRD)
- [x] `DECISIONS.md` — lightweight running log of *why*, not just *what* (this becomes your interview material later)
- [x] `.gitignore` — exclude any real roster data; nothing with a real kid's name, weight, or team ever gets committed
- [x] Synthetic/sample dataset for dev and demos — generate fake wrestlers across all age brackets, skill levels, weights
- [x] GitHub Project board: Backlog / In Progress / Done — https://github.com/users/jkzarnosky/projects/1
      (one issue per story below; this file stays the high-level roadmap, the board is the day-to-day tracker)
- [x] GitHub Actions CI skeleton — runs tests on every PR from day one, even before there's much to test
- [x] License (MIT is the standard default for a portfolio repo)

## Epic 1: Data Ingestion
- Import wrestler roster from CSV (matching today's Google Sheets columns: name, birthday, weight, experience/skill, team)
- Validate required fields and types on import; surface bad rows instead of failing silently
- Support importing multiple teams' data for a given week's matchup run

## Epic 2: Weekly Matchmaking Engine (the MVP core)
- Select which teams are attending this week
- Set thresholds for the run: allowable age difference, skill difference, weight difference (flat or %), mat count
- Generate matchups respecting all thresholds
- Prefer same-sex matchups when a reasonable option exists; allow cross-sex when it isn't
- Flag wrestlers with no valid match (outliers) instead of silently dropping them
- Output a printable matchup sheet

## Epic 3: On-the-Spot Adjustments (mobile)
- Mark a wrestler as scratched at the event
- Re-run matching for just the affected wrestlers, not the whole event from scratch
- Mobile-friendly view coaches can actually use ringside

## Epic 4: Exception Handling *(design deferred — revisit once we define criteria together)*
- Placeholder for rules like wider weight tolerance for heavyweights, willing-but-inexperienced kids, etc.
- Manual override so a coach can force/adjust one specific matchup

## Epic 5 — Stretch: Qualifier / Championship
- Track qualifier results per conference
- Seed top 4 into championship bracket (1v4, 2v3)
- Enforce 2 wrestlers per division per team, no tots

## Epic 6 — Stretch: Tot-o-rama
- Group by team where possible to limit coach travel between mats
- Prioritize matching statistical outliers over the grouping preference
- No results logging

## Suggested Sprint 1 (prove the engine before touching UI)
1. Repo, README, synthetic dataset, CI skeleton
2. Data model + CSV import + validation
3. Core matching algorithm (age/skill/weight/mat constraints) with unit tests
4. CLI-only output of matchups — no UI yet

Sprint 1 deliberately has no interface. The fastest way to prove the engine is right is to run it against a synthetic "week" and sanity-check the output yourself — UI is Sprint 2+, once the logic is trustworthy.
