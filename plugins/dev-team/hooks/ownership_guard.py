#!/usr/bin/env python3
"""dev-team ownership guard (PreToolUse on Write/Edit/MultiEdit/NotebookEdit).

Only applies to dev-team role agents (hook input carries `agent_type`, e.g. "dev-team:backend-developer").
The main session and agents from other plugins are never blocked.

Rules
- Document roles (product-manager, ux-designer, software-architect) may only write inside `.dev-team/`.
- The tech-lead may edit anything (it fixes trivial review findings and owns `.dev-team/ownership.json`).
- Every other role may write inside `.dev-team/` (notes) except `ownership.json`, plus the glob patterns
  listed for it in `.dev-team/ownership.json`:  {"backend-developer": ["src/api/**", "src/server/*.ts"], ...}
- No ownership file (or no entry for the role) -> allowed, so Lite runs and ad-hoc use keep working.

Patterns are relative to the project root; `**` spans folders, `*` stays inside one folder, a trailing
`/` means "everything under this folder". Edits made through shell commands are not covered.
Fails open (allows) on any unexpected error so a hook bug never blocks your work.
"""
import json
import os
import re
import sys

DOC_ROLES = {"product-manager", "ux-designer", "software-architect"}
FREE_ROLES = {"tech-lead"}
TEAM_ROLES = DOC_ROLES | FREE_ROLES | {
    "backend-developer", "frontend-developer", "mobile-developer",
    "data-engineer", "qa-engineer", "devops-sre",
}


def glob_to_regex(pattern: str) -> re.Pattern:
    p = pattern.strip()
    if p.startswith("./"):
        p = p[2:]
    if p.endswith("/"):
        p += "**"
    out, i = "", 0
    while i < len(p):
        c = p[i]
        if p.startswith("**/", i):
            out += "(?:.*/)?"
            i += 3
        elif p.startswith("**", i):
            out += ".*"
            i += 2
        elif c == "*":
            out += "[^/]*"
            i += 1
        elif c == "?":
            out += "[^/]"
            i += 1
        else:
            out += re.escape(c)
            i += 1
    return re.compile("^" + out + "$")


def deny(reason: str) -> None:
    print(json.dumps({
        "hookSpecificOutput": {
            "hookEventName": "PreToolUse",
            "permissionDecision": "deny",
            "permissionDecisionReason": reason,
        }
    }))
    sys.exit(0)


def main() -> None:
    data = json.load(sys.stdin)
    agent = data.get("agent_type") or ""
    role = agent.split(":")[-1]
    if not agent or role not in TEAM_ROLES or role in FREE_ROLES:
        return
    if agent.count(":") and not agent.startswith("dev-team:"):
        return  # same role name from another plugin

    tool_input = data.get("tool_input") or {}
    target = tool_input.get("file_path") or tool_input.get("notebook_path")
    if not target:
        return
    root = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    rel = os.path.relpath(os.path.abspath(os.path.join(root, target)), os.path.abspath(root)).replace(os.sep, "/")

    in_team_dir = rel == ".dev-team" or rel.startswith(".dev-team/")
    if role in DOC_ROLES:
        if not in_team_dir:
            deny(f"[dev-team] The {role} only writes documents inside .dev-team/ - it must not edit '{rel}'. "
                 "Describe the change in your artifact instead; the developers will implement it.")
        return
    if in_team_dir:
        if rel == ".dev-team/ownership.json":
            deny("[dev-team] Only the tech-lead may change .dev-team/ownership.json.")
        return

    own_file = os.path.join(root, ".dev-team", "ownership.json")
    if not os.path.isfile(own_file):
        return
    with open(own_file, encoding="utf-8") as fh:
        owners = json.load(fh)
    patterns = owners.get(role)
    if not patterns:
        return
    if any(glob_to_regex(p).match(rel) for p in patterns):
        return
    holder = next((r for r, pats in owners.items() if r != role and any(glob_to_regex(p).match(rel) for p in pats)), None)
    who = f" It belongs to the {holder}." if holder else ""
    deny(f"[dev-team] '{rel}' is outside the files owned by the {role} ({', '.join(patterns)}).{who} "
         "Do not edit it: list the change you need under 'Needs' in your final reply so the orchestrator routes it.")


if __name__ == "__main__":
    try:
        main()
    except SystemExit:
        raise
    except Exception:
        pass  # fail open
