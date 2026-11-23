<div align="center">

# 🧑‍💻 Claude Dev Team

**A complete software development team for [Claude Code](https://docs.claude.com/en/docs/claude-code) — 10 specialized agents, one command.**

Product Manager · Tech Lead · Architect · UI/UX · Backend · Frontend · Mobile · Data/DBA · QA · DevOps/SRE

`/dev-team Add password reset by email`

[Install](#-install) · [How it works](#-how-it-works) · [The team](#-the-team) · [Example](#-real-example) · [Português](#-em-português)

</div>

---

Claude is great at writing code. Real software also needs someone to ask **why**, someone to design **how it fits**, someone to **plan** the work, specialists to **build** it, someone to **break** it and someone to **ship** it safely.

`dev-team` turns Claude Code into that team. One skill acts as the **Engineering Manager**: it picks the right team size, spawns each role as its own agent with only the context it needs, runs independent work **in parallel**, enforces **quality gates** between phases and hands you tested, reviewed code plus the docs a real team would leave behind.

## ✨ Why this one is different

Most "agent team" collections are a folder of prompts. This plugin adds the parts that make a team actually work:

| | What it does | How |
|---|---|---|
| 🔒 **Enforced file ownership** | Parallel agents **cannot** overwrite each other. The Tech Lead assigns files to each role; a backend dev that tries to edit the frontend's file is blocked and asks for it instead. Document roles (PM, UX, Architect) can only write docs. | `PreToolUse` hook + `.dev-team/ownership.json` |
| 💰 **Right model per role + cost report** | Architect and Tech Lead think on **Opus**; PM, UX, developers, QA and DevOps run on **Sonnet**. Every agent's tokens and estimated cost are logged, and the hand-off shows **cost per role**. | `model:` per agent + `SubagentStop` hook → `.dev-team/costs.jsonl` |
| 🧩 **Use one role at a time** | `/dev-team:review`, `/dev-team:qa`, `/dev-team:plan`, `/dev-team:standup`, `/dev-team:pr` - not only for big features, but every day. | plugin commands |
| 🚀 **Ends in a real Pull Request** | `/dev-team:pr` opens a PR whose description has the PM's *why*, QA's acceptance-criteria table, the Tech Lead's verdict, release notes and the team cost. It refuses to open one while QA says NOT READY. | `gh` CLI |
| 🧠 **The team remembers your project** | Stack, conventions, architecture decisions (ADRs), backlog and lessons from past bugs live in `.dev-team/memory/`. The next feature starts where the last one ended - like a real team. | memory files read at kick-off, updated at hand-off |

## ✨ Highlights

- **10 real roles**, each with its own focused instructions and deliverables.
- **Right-sized**: *Lite* for a bug fix (4 agent runs), *Standard* for a feature, *Full* for a new product — it never spins up a Mobile dev for a repo without an app.
- **Parallel by design**: UX + Architect design together; developers and QA's test plan run at the same time with **disjoint file ownership**, so agents don't step on each other.
- **Quality gates**: QA must say `READY`, the Tech Lead must approve the review — with up to 3 automatic fix loops.
- **Paper trail**: every decision lands in `.dev-team/` (brief, UX, architecture/ADRs, plan, test plan, QA report, review, release + rollback plan).
- **Safe**: never deploys, pushes or runs destructive migrations without your explicit OK. Respects your repo's `CLAUDE.md` and conventions.
- **Cheap to keep**: ~1.3k tokens always-on; the rest loads only when the team works.
- Hooks need `python3` (present on macOS/Linux; on Windows install Python). Without it the guardrails silently switch off and everything else keeps working.

## 📦 Install

In Claude Code:

```text
/plugin marketplace add Kesh-2k/claude-dev-team
/plugin install dev-team@claude-dev-team
```

Restart Claude Code, then:

```text
/dev-team <what you want built>
```

…or just ask: *"use the dev team to add CSV export to the reports page"*.

| Command | What it does |
|---|---|
| `/dev-team <request>` | The whole team, idea → reviewed code (Lite / Standard / Full picked automatically) |
| `/dev-team:plan <idea>` | PM + UX + Architect + Tech Lead plan, **no code** |
| `/dev-team:review [branch\|PR]` | Tech Lead review of the current diff, a branch or a PR |
| `/dev-team:qa [what]` | QA verification: runs suites, adds missing tests, READY / NOT READY |
| `/dev-team:standup` | What's done, in progress, blocked, and the cost so far (no agents spawned) |
| `/dev-team:pr [base]` | Opens the pull request with the team's reports |

<details>
<summary>Manual install (without the plugin system)</summary>

Copy `plugins/dev-team/agents/*.md` to `~/.claude/agents/` (or `.claude/agents/` in a project) and `plugins/dev-team/skills/dev-team/` to `~/.claude/skills/dev-team/`. The skill automatically falls back to the bare agent names.
</details>

## 🔄 How it works

```mermaid
flowchart LR
    U([You]) --> K[Kick-off<br/>Engineering Manager]
    K --> PM[Product Manager<br/>brief.md]
    PM --> UX[UI/UX Designer<br/>ux.md]
    PM --> AR[Architect<br/>architecture.md]
    UX --> TL[Tech Lead<br/>plan.md]
    AR --> TL
    TL --> BE[Backend]
    TL --> FE[Frontend]
    TL --> MO[Mobile]
    TL --> DA[Data / DBA]
    TL --> QP[QA test plan]
    BE --> QA{QA verify}
    FE --> QA
    MO --> QA
    DA --> QA
    QP --> QA
    QA -- NOT READY --> BE
    QA -- READY --> RV{Tech Lead review}
    RV --> DO[DevOps / SRE<br/>release.md]
    DO --> U
```

| Mode | When | Team |
|---|---|---|
| **Lite** | bug fix, small endpoint, copy change | Tech Lead → 1 dev → QA → review |
| **Standard** | a normal feature | PM → Architect (+UX) → plan → devs ∥ QA plan → QA → review → release |
| **Full** | new product, new data model or infra | every role, plan approval by you |

## 👥 The team

| Role | Agent | Responsible for | Delivers |
|---|---|---|---|
| Product Manager / PO | `product-manager` | **What** and **why now**: problem, users, prioritized stories, acceptance criteria, metrics | `brief.md` |
| Tech Lead / Eng. Manager | `tech-lead` | Bridges business & tech: task breakdown with file ownership, standards, Definition of Done, final code review | `plan.md`, `review.md` |
| Software Architect | `software-architect` | Macro structure, APIs, integrations, security, scalability, tech choices as ADRs | `architecture.md` |
| UI/UX Designer | `ux-designer` | User flows, wireframes for every state, copy, accessibility, design-system consistency | `ux.md` |
| Backend Developer | `backend-developer` | Business rules, APIs, auth, async jobs, databases, external integrations + tests | code |
| Frontend Developer | `frontend-developer` | Web UI, state, API consumption, loading/empty/error states, a11y, performance + tests | code |
| Mobile Developer | `mobile-developer` | iOS/Android lifecycle, offline, push, permissions, store readiness + tests | code |
| Data Engineer / DBA | `data-engineer` | Modeling, safe migrations, indexes & query plans, pipelines, governance/PII | migrations |
| QA Engineer | `qa-engineer` | Test plan up front, automated tests, real exercising, defects with repro steps, verdict | `test-plan.md`, `qa-report.md` |
| DevOps / SRE | `devops-sre` | CI/CD, containers, observability, secrets, backups, release & rollback plan | `release.md` |

## 🧪 Real example

`/dev-team Add a slugify(text) function ... with tests. Use Lite mode.` on a tiny Node project:

- **Agents called:** `tech-lead` (plan) → `backend-developer` → `qa-engineer` → `tech-lead` (review)
- **Result:** `src/slugify.js` + 19 passing tests (accents, `ß→ss`, symbols, edge cases), QA verdict READY, review approved, nothing committed until you say so.
- **Cost:** about US$ 1 with Claude Opus.

See the artifacts the team produced in [`examples/slugify-lite`](examples/slugify-lite).

**Standard mode, backend + frontend** - *"Let users add a new todo: a POST endpoint and a form on the page"*: all 10 role runs (PM → UX ∥ Architect → plan → Backend ∥ Frontend ∥ QA plan → QA → review → DevOps), **44 tests passing**, QA READY, review APPROVED, and the frontend dev caught an XSS in the existing page. Agents cost **≈ US$ 1.62** (Opus only for Architect + Tech Lead). Full artifacts, memory and the per-role cost table in [`examples/todo-standard`](examples/todo-standard).

## 🔒 Ownership file example

Written by the Tech Lead in `.dev-team/ownership.json`:

```json
{
  "backend-developer": ["src/api/**", "migrations/"],
  "frontend-developer": ["web/src/**"],
  "qa-engineer": ["**/*.test.*", "tests/"]
}
```

`**` spans folders, `*` stays in one folder, a trailing `/` means the whole folder. The Tech Lead and the main session are never restricted. Edits made through shell commands are not covered by the hook.

## 💡 Tips

- Be specific about the outcome, not the implementation — the PM and Architect will work out the rest.
- Say *"Full mode, show me the plan first"* for big work; *"Lite"* for quick fixes.
- Re-run `/dev-team` later: the team reads `.dev-team/memory/` and resumes unfinished runs; finished runs are archived to `.dev-team/history/`.
- Want different models? Edit the `model:` line in `plugins/dev-team/agents/<role>.md` (`opus`, `sonnet`, `haiku` or `inherit`).
- Add `.dev-team/` to git if you want the design docs reviewed in PRs.

## 🤝 Contributing

Ideas for new roles (Security Engineer, Tech Writer, Data Scientist…), better prompts or real-world examples are very welcome — open an issue or a PR.

## 📄 License

[MIT](LICENSE) © Kesh-2k

---

## 🇧🇷 Em português

**Uma equipe completa de desenvolvimento para o Claude Code**: Product Manager, Tech Lead, Arquiteto, UI/UX, Backend, Frontend, Mobile, Dados/DBA, QA e DevOps/SRE — 10 agentes coordenados por uma skill.

```text
/plugin marketplace add Kesh-2k/claude-dev-team
/plugin install dev-team@claude-dev-team
/dev-team <o que você quer construir>
```

A skill escolhe o tamanho da equipe (Lite, Standard ou Full), roda em paralelo o que é independente, exige o "PRONTO" do QA e a aprovação do Tech Lead, e deixa tudo documentado em `.dev-team/`. Nunca publica, faz push ou mexe em produção sem a sua autorização. Os agentes respondem no idioma do pedido.

**Diferenciais:** cada agente só consegue editar os arquivos do seu cargo (um hook bloqueia o resto); cada cargo usa o modelo certo (Opus para Arquiteto e Tech Lead, Sonnet para os outros) e o custo de cada um aparece no final; comandos avulsos (`/dev-team:review`, `:qa`, `:plan`, `:standup`, `:pr`); termina num Pull Request com os relatórios da equipe; e a equipe **lembra do projeto** entre uma tarefa e outra (`.dev-team/memory/`).
