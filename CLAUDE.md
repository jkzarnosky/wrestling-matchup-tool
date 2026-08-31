# Project Instructions for Claude Code

## Maintaining PROJECT-LOG.md
Append a new entry to the top of PROJECT-LOG.md (just below the header/legend, above the most recent
existing entry) in either of these cases:

- After completing any epic or story from the backlog (BACKLOG.md).
- After a substantive decision-making session that ships no story but produces real decisions worth
  keeping on record — an AC review, an architecture/tooling choice, a scoping change. If a session
  would earn an entry in DECISIONS.md, it earns a PROJECT-LOG entry too, even with nothing shipped.

Follow the existing format exactly:

- Use today's date, and place the entry in correct chronological order (newest at top) relative to
  every existing entry — not just appended after whatever currently sits last. If multiple entries
  share a date, order them by when the work actually happened that day.
- `[MILESTONE]` line: one or two plain-language sentences on what now works (or, for a decision-only
  entry, what was decided). Write for a reader who isn't in this codebase day to day — no unexplained
  jargon.
- `[DECISION]` bullets: only include real decisions — a choice made between two or more real
  alternatives. Skip this section if nothing decision-worthy came up. Each bullet should name the
  alternative(s) not chosen and why.
- `Next up`: pull directly from the next unstarted item in BACKLOG.md.

Do not rewrite or reorder existing entries beyond fixing a genuine misplacement. Do not add an entry
for routine work (formatting, minor fixes, dependency bumps) — only for backlog items actually
completed or sessions with real decisions in them.

If unsure whether something is log-worthy, ask before adding an entry rather than guessing.

## Syncing BACKLOG.md AC into GitHub Issues
BACKLOG.md is the single source of truth for scope and acceptance criteria. Each `### Story` heading
in it is meant to match an existing GitHub issue title exactly (issues were originally created from
this file).

When JZ says something like "sync the backlog" or "update issues from the backlog":
1. Run `gh issue list --state all --limit 100` to get current issues.
2. For each `### Story` section in BACKLOG.md, find the issue whose title matches the story heading.
   - Exact match → update it.
   - No exact match (renamed story, or a genuinely new story) → list it separately and ask JZ before
     creating a new issue or guessing at a rename.
3. For each matched issue, run `gh issue edit <number> --body-file <tmpfile>` where the temp file
   contains that story's Epic + AC content, formatted the same way as
   `.github/ISSUE_TEMPLATE/story.md`.
4. Skip any story still marked `AC: TBD` — don't overwrite an issue with a placeholder.
5. Report back a short summary: issues updated (with numbers/links), stories skipped as TBD, and any
   unmatched stories that need JZ's input.

Never delete or close an issue as part of a sync. Never create a new issue during a sync without
flagging it first — new issues only get created when JZ explicitly asks for one. This also applies
outside of a sync — closing or deleting an issue during any other kind of review (e.g. an AC review)
should be confirmed with JZ in the moment, not just logged after the fact.

When a new story issue is created, set its **Milestone** to the matching epic (e.g. "Epic 1: Data
Management") — not a label. Milestones group cleanly on the Project board's board view (labels are
many-to-many and can't be grouped on); epic labels were removed for this reason on 2026-08-25.

## Git workflow: no direct pushes to main
`main` is branch-protected (PR + passing CI required, no direct pushes, no force-push, enforced even for
the repo owner). For any code or doc change:

1. Create a branch (e.g. `21-user-data-model`, or `process/...` for non-issue work).
2. Commit and push the branch, open a PR. Reference the issue with `Closes #N` when there is one.
3. Wait for CI to pass, then tell JZ the PR is ready for review — do not merge it.
4. JZ reviews and merges (or tells Claude Code to merge after saying "approved").

This applies to every change, including PROJECT-LOG.md/BACKLOG.md updates and Claude Code's own doc
edits — there is no "small enough to skip the PR" exception.

## Review conversation belongs on the PR, not just in chat
On a team, PR review discussion happens as comments on the PR itself, so it's part of the permanent,
browsable record. Our review conversation happens in chat instead, which isn't part of the repo — if it
never gets written down anywhere else, a future reader of a PR (JZ later, a collaborator, an
interviewer) sees none of the reasoning behind it.

DECISIONS.md/PROJECT-LOG.md/commit messages already carry the distilled "why" for real decisions. The
piece that was missing: when a chat exchange is substantively *about a specific open PR* (JZ asks why
something was built a certain way, a tradeoff gets discussed, an adjustment gets made), post that
exchange -- or a distilled version of it -- as an actual `gh pr comment` on that PR. That's the closest
match to what a team's review thread would actually look like, and where a future reader would go
looking for it. Applies going forward from 2026-08-25; earlier PRs weren't backfilled.

## Stacked PRs
When a story depends on one not yet merged, branch off that PR's branch instead of `main` (stack it),
rather than waiting. Say so explicitly in the new PR's description (which PR it stacks on, the actual
merge order).

Branch protection requires `required_linear_history` (squash merges only) for a clean one-commit-per-PR
audit trail. Squash merges break stacking: a squashed commit has no shared history with the original
commits still sitting on a stacked branch, so the next branch in the stack shows a conflict even though
the content is identical (hit repeatedly on 2026-08-25/26). This is expected, not a sign something went
wrong -- resolve it every time, don't try to avoid it by switching merge strategy (that would cost the
audit trail for a problem that's cheap to fix per-occurrence).

The routine, once JZ merges a PR that has stacked descendants:
1. Immediately (don't wait to be asked) checkout the next branch in the stack and `git merge main`.
2. Resolve any conflict -- so far always PROJECT-LOG.md (two entries inserted at the same point;
   combine, correct chronological order, drop duplicates) or a shared new file both branches created
   independently (combine the content, e.g. two functions landing in the same new lib file).
3. Run `npm test` and `npm run lint`, then push.
4. Repeat for every remaining branch in the stack, in order, before reporting back.
5. Check whether the merged PR's linked issues actually closed -- a PR merging into a non-`main` base
   (the normal case mid-stack, since the next PR up hasn't merged yet) does NOT trigger GitHub's
   `Closes #N` auto-close, even if the PR text says it. Close them manually once that content actually
   reaches `main`, or flag it if unsure they're ready to close.

Prefer merging a stack bottom-up (earliest branch first). Merging out of order (e.g. the top of the
stack before its own base) isn't broken -- GitHub just merges into whatever the base branch is at the
time -- but it leaves finished work invisible on a feature branch instead of `main`, and its issues
stay open with no auto-close ever coming. Bottom-up keeps `main`, the board, and issue state honest at
every step.

## Moving issues to "In Progress" when a PR opens
GitHub's own Project workflow ("Pull request opened" trigger, in the board's Workflows settings) covers
this for PRs opened against `main`, but does not reliably fire for stacked PRs (a PR whose base is
another feature branch, not `main`) -- confirmed 2026-08-25 when four stacked PRs only left one issue
auto-moved. So: after opening a PR (any base branch), move its linked issue(s) to "In Progress"
directly, rather than relying on the board automation to catch every case.

```bash
gh project item-edit --project-id PVT_kwHOEJ1UKs4BhVKq --id <ITEM_ID> \
  --field-id PVTSSF_lAHOEJ1UKs4BhVKqzhgRRqM --single-select-option-id 47fc9ee4
```

`<ITEM_ID>` is the project item's node id (not the issue number) -- find it with:
```bash
gh project item-list 1 --owner jkzarnosky --format json --jq '.items[] | select(.content.number == <ISSUE_NUMBER>) | .id'
```
