---
description: Open a GitHub pull request for the team's work with the PM summary, QA report and Tech Lead review in the description
argument-hint: "[base branch - default: the repo's default branch]"
---

Prepare and open a pull request for the dev-team's current work. **Ask the user for confirmation before pushing or creating the PR.**

1. Check prerequisites: a git remote on GitHub and the `gh` CLI logged in (`gh auth status`). If missing, explain what to set up and stop.
2. Refuse to continue if `.dev-team/qa-report.md` says NOT READY or `.dev-team/review.md` has open blockers - tell the user what is pending.
3. Create a branch `dev-team/<short-slug>` if on the default branch, commit the changes with a clear message (do not commit `.dev-team/` unless the user versions it), and push.
4. Open the PR with `gh pr create --base <base>` (base = "$ARGUMENTS", or the default branch if empty) and this body:
   - **Why** - problem and goal from `brief.md` (2-4 lines) and the stories delivered.
   - **What changed** - files grouped by role.
   - **How it was verified** - QA verdict and the acceptance criteria table from `qa-report.md`.
   - **Review** - Tech Lead verdict from `review.md`.
   - **Release** - deploy and rollback notes from `release.md` if present.
   - **Team cost** - per-role estimate from `costs.jsonl`.
   - A footer line: `Built with [Claude Dev Team](https://github.com/Kesh-2k/claude-dev-team)`.
5. Reply with the PR URL.
