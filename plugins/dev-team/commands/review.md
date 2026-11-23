---
description: Tech Lead code review of the current changes (or a branch/PR) - bugs, standards, security, missing tests
argument-hint: "[branch, PR number or path - default: uncommitted changes]"
---

Run only the **Tech Lead** of the dev-team, in *Review* mode, on: "$ARGUMENTS" (if empty: the uncommitted changes (git diff + untracked files)).

1. Work out the diff to review (for a PR number use `gh pr diff <n>`; for a branch `git diff <base>...<branch>`).
2. Spawn the `dev-team:tech-lead` agent (bare name `tech-lead` if the plugin prefix is unavailable) with: the diff scope, the repo's build/lint/test commands, and the instruction to write `.dev-team/review.md` and fix only trivial issues.
3. Reply to the user with the verdict and the blocker/major findings (file:line + fix), in the user's language.
