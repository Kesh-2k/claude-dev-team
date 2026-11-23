# Changelog

## [1.1.0] - 2026-11-22

- **Enforced file ownership**: `PreToolUse` hook blocks role agents from editing files outside `.dev-team/ownership.json` (written by the Tech Lead); document roles only write in `.dev-team/`.
- **Model per role + cost report**: Opus for Architect and Tech Lead, Sonnet for the rest; `SubagentStop` hook logs tokens and estimated cost per agent to `.dev-team/costs.jsonl`, summarized at hand-off.
- **Single-role commands**: `/dev-team:plan`, `/dev-team:review`, `/dev-team:qa`, `/dev-team:standup`, `/dev-team:pr`.
- **Pull request hand-off**: `/dev-team:pr` opens a PR with the PM summary, QA report, review verdict, release notes and team cost.
- **Team memory**: `.dev-team/memory/` (project, decisions, backlog, lessons) read at kick-off and updated at hand-off; finished runs archived to `.dev-team/history/`.

## [1.0.0] - 2026-11-22

- First release: 10 role agents (Product Manager, Tech Lead, Software Architect, UI/UX Designer, Backend, Frontend, Mobile, Data Engineer/DBA, QA, DevOps/SRE) and the `dev-team` orchestration skill with Lite / Standard / Full modes.
