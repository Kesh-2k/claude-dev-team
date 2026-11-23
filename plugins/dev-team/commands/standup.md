---
description: Daily stand-up of the dev-team - what is done, in progress and blocked, plus cost so far, read from .dev-team/
---

Give a stand-up report of the current dev-team work **without spawning any agent**. Read whatever exists in `.dev-team/` (`brief.md`, `plan.md`, `test-plan.md`, `qa-report.md`, `review.md`, `release.md`, `costs.jsonl`, `memory/backlog.md`) and `git status`.

Reply in the user's language, under 20 lines:
- **Done** - stories/tasks finished and verified.
- **In progress** - tasks started (files changed but not yet verified).
- **Blocked / at risk** - failed QA criteria, review blockers, open BLOCKING questions.
- **Cost so far** - sum of `estimated_usd` per role from `costs.jsonl` (say it is an API-price estimate).
- **Next step** - the single most useful next command.
