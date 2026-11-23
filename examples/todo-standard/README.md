# Example - Standard mode: "add a todo" (backend + frontend)

Request: `/dev-team Let users add a new todo: a POST /api/todos endpoint (title required, max 120 chars) and a small form on the page to add it. Use Standard mode.`

Starting point: a 20-line Node http server with `GET /api/todos` and a static page.

**Agents, in order:** product-manager -> ux-designer + software-architect (parallel) -> tech-lead (plan + `ownership.json`) -> backend-developer + frontend-developer + qa-engineer test plan (parallel) -> qa-engineer verify -> tech-lead review -> devops-sre.

**Result:** 44 tests passing, QA **READY**, review **APPROVED**; the frontend also fixed an XSS in the existing page (titles were inserted as HTML). Nothing committed.

**Cost per role** (from `.dev-team/costs.jsonl`, API list prices):

| Role | Model | Runs | Est. cost |
|---|---|---|---|
| product-manager | `claude-sonnet-5-5` | 1 | $0.042 |
| ux-designer | `claude-sonnet-5-5` | 1 | $0.051 |
| software-architect | `claude-opus-5-5` | 1 | $0.223 |
| tech-lead | `claude-opus-5-5` | 2 | $0.655 |
| frontend-developer | `claude-sonnet-5-5` | 1 | $0.089 |
| backend-developer | `claude-sonnet-5-5` | 1 | $0.137 |
| qa-engineer | `claude-sonnet-5-5` | 2 | $0.330 |
| devops-sre | `claude-sonnet-5-5` | 1 | $0.098 |
| **Total (agents)** | | | **$1.62** |

The orchestrator session adds about $1 on top (whole run ≈ $2.70).

Look at `.dev-team/history/2026-11-22-add-todo/` for every artifact the team wrote and `.dev-team/memory/` for what it remembers for the next feature.
