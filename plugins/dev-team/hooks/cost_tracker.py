#!/usr/bin/env python3
"""dev-team cost tracker (SubagentStop).

When a dev-team role agent finishes, sums the token usage in its transcript and appends one line to
`.dev-team/costs.jsonl`: role, model, tokens and an *estimated* cost at Claude API list prices.
On a Claude subscription you are not billed per token; the estimate shows the API-equivalent cost.
Edit PRICES (USD per million tokens) if prices change. Fails silently on any error.
"""
import json
import os
import sys
import time

# input, output, cache write (5 min), cache read - USD per 1M tokens (Claude API list prices, Nov 2026)
PRICES = {
    "claude-fable-5-2": (8.00, 40.00, 10.00, 0.20),
    "claude-opus-5-5": (4.00, 20.00, 5.00, 0.20),
    "claude-sonnet-5-5": (2.00, 10.00, 2.50, 0.10),
    "claude-haiku-5-5": (0.10, 0.50, 0.125, 0.01),
}


def price_for(model: str):
    for key, value in PRICES.items():
        if model and model.startswith(key):
            return value
    return None


def main() -> None:
    data = json.load(sys.stdin)
    agent = data.get("agent_type") or ""
    if not agent.startswith("dev-team:") and agent.split(":")[-1] not in {
        "product-manager", "tech-lead", "software-architect", "ux-designer", "backend-developer",
        "frontend-developer", "mobile-developer", "data-engineer", "qa-engineer", "devops-sre",
    }:
        return
    path = data.get("agent_transcript_path")
    if not path or not os.path.isfile(path):
        return
    usage = {"input_tokens": 0, "output_tokens": 0, "cache_creation_input_tokens": 0, "cache_read_input_tokens": 0}
    model, seen = None, set()
    with open(path, encoding="utf-8") as fh:
        for line in fh:
            try:
                entry = json.loads(line)
            except ValueError:
                continue
            msg = entry.get("message")
            if not isinstance(msg, dict) or not isinstance(msg.get("usage"), dict):
                continue
            mid = msg.get("id")
            if mid in seen:  # one API response can be split over several transcript lines
                continue
            seen.add(mid)
            model = msg.get("model") or model
            for k in usage:
                v = msg["usage"].get(k)
                if isinstance(v, int):
                    usage[k] += v
    price = price_for(model or "")
    cost = None
    if price:
        cost = round((usage["input_tokens"] * price[0] + usage["output_tokens"] * price[1]
                      + usage["cache_creation_input_tokens"] * price[2]
                      + usage["cache_read_input_tokens"] * price[3]) / 1_000_000, 4)
    root = os.environ.get("CLAUDE_PROJECT_DIR") or data.get("cwd") or os.getcwd()
    out_dir = os.path.join(root, ".dev-team")
    os.makedirs(out_dir, exist_ok=True)
    with open(os.path.join(out_dir, "costs.jsonl"), "a", encoding="utf-8") as fh:
        fh.write(json.dumps({
            "at": time.strftime("%Y-%m-%dT%H:%M:%S"), "role": agent.split(":")[-1], "agent_id": data.get("agent_id"),
            "model": model, **usage, "estimated_usd": cost,
        }) + "\n")


if __name__ == "__main__":
    try:
        main()
    except Exception:
        pass
