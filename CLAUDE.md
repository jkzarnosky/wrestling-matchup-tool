# Project Instructions for Claude Code

## Maintaining PROJECT-LOG.md
After completing any epic or story from the backlog (BACKLOG.md), append a new entry to the top of
PROJECT-LOG.md (just below the header/legend, above the most recent existing entry), following the
existing format exactly:

- Use today's date.
- `[MILESTONE]` line: one or two plain-language sentences on what now works. Write for a reader who
  isn't in this codebase day to day — no unexplained jargon.
- `[DECISION]` bullets: only include real decisions — a choice made between two or more real
  alternatives. Skip this section if nothing decision-worthy came up. Each bullet should name the
  alternative(s) not chosen and why.
- `Next up`: pull directly from the next unstarted item in BACKLOG.md.

Do not rewrite or reorder existing entries. Do not add an entry for routine work (formatting, minor
fixes, dependency bumps) — only for backlog items actually completed.

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
flagging it first — new issues only get created when JZ explicitly asks for one.

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
