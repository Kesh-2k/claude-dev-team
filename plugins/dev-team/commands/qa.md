---
description: QA Engineer verifies a feature or the current changes - runs suites, adds missing tests, reports defects and a READY / NOT READY verdict
argument-hint: "[what to verify - default: the uncommitted changes]"
---

Run only the **QA Engineer** of the dev-team on: "$ARGUMENTS" (if empty: the uncommitted changes).

1. If `.dev-team/brief.md` or `.dev-team/test-plan.md` exist, point the agent to them; otherwise give it the user's description as the acceptance criteria.
2. Spawn `dev-team:qa-engineer` (bare name `qa-engineer` as fallback) in *Verify* mode with the build/test commands. It may only add or change test files.
3. Report the verdict, failed criteria and the top defects with reproduction steps, in the user's language.
