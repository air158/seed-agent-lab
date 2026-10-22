"""Pure-data agents. Model output is never executed as code or commands."""
from __future__ import annotations

from dataclasses import asdict, dataclass, fields
import hashlib
import json
import math
import random


@dataclass(frozen=True)
class Policy:
    value_weight: float = 1.0
    urgency_weight: float = 0.0
    age_weight: float = 0.0
    effort_power: float = 0.0

    @classmethod
    def parse(cls, data: dict) -> "Policy":
        if not isinstance(data, dict) or set(data) != {f.name for f in fields(cls)}:
            raise ValueError("Policy must contain exactly the four allowed numeric fields")
        for key, value in data.items():
            limit = 2.0 if key == "effort_power" else 8.0
            if type(value) not in (int, float) or not math.isfinite(value) or not 0 <= value <= limit:
                raise ValueError(f"Invalid policy value: {key}")
        return cls(**data)

    @property
    def identity(self) -> str:
        return hashlib.sha256(json.dumps(asdict(self), sort_keys=True).encode()).hexdigest()[:12]


def task_score(policy: Policy, task: dict, hour: int) -> float:
    urgency = 1.0 / max(1, task["deadline"] - hour)
    age = max(0, hour - task["arrival"]) / 8.0
    return (policy.value_weight * task["value"] + policy.urgency_weight * urgency * 10
            + policy.age_weight * age) / (task["effort"] ** policy.effort_power)


def simulate(policy: Policy, seed: int) -> dict:
    """A fixed 24-hour synthetic queue. No real resources or accounts are created."""
    rng = random.Random(seed)
    tasks = []
    for task_id in range(80):
        arrival = rng.randrange(20)
        tasks.append(dict(id=task_id, arrival=arrival, deadline=arrival + rng.randrange(2, 9),
                          effort=rng.randrange(1, 7), value=rng.randrange(1, 21)))
    completed, value, consumed = set(), 0, 0
    # All policies see exactly the same input and budget.
    for hour in range(24):
        budget = 8
        pending = [t for t in tasks if t["id"] not in completed and t["arrival"] <= hour < t["deadline"]]
        pending.sort(key=lambda t: (-task_score(policy, t, hour), t["id"]))
        for task in pending:
            if task["effort"] <= budget:
                budget -= task["effort"]
                consumed += task["effort"]
                value += task["value"]
                completed.add(task["id"])
    return dict(value=value, completed=len(completed), budget_used=consumed)


def evaluate(policy: Policy, seeds: list[int]) -> dict:
    scores = [simulate(policy, seed) for seed in seeds]
    return {key: round(sum(s[key] for s in scores) / len(scores), 4) for key in scores[0]}


def mutate(parent: Policy, generation: int, child: int) -> Policy:
    rng = random.Random(generation * 1009 + child)
    data = asdict(parent)
    key = rng.choice(list(data))
    scale = 0.35 if key == "effort_power" else 1.25
    data[key] = round(min(2.0 if key == "effort_power" else 8.0,
                          max(0.0, data[key] + rng.choice([-1, 1]) * rng.uniform(0.1, scale))), 4)
    return Policy.parse(data)


def select(parent: Policy, children: list[tuple[Policy, str]], generation: int) -> dict:
    train = list(range(100, 120))
    # A separate, rotating evaluation set, not included in the model prompt.
    holdout = list(range(10000 + generation * 20, 10020 + generation * 20))
    parent_train, parent_holdout = evaluate(parent, train), evaluate(parent, holdout)
    candidates = []
    for policy, origin in children[:3]:
        fit, check = evaluate(policy, train), evaluate(policy, holdout)
        accepted = fit["value"] > parent_train["value"] and check["value"] >= parent_holdout["value"]
        candidates.append(dict(id=policy.identity, policy=asdict(policy), origin=origin,
                               train=fit, holdout=check, accepted=accepted))
    eligible = [c for c in candidates if c["accepted"]]
    winner = max(eligible, key=lambda c: (c["holdout"]["value"], c["train"]["value"])) if eligible else None
    return dict(parent_train=parent_train, parent_holdout=parent_holdout, candidates=candidates,
                winner=winner, benchmark="synthetic-task-scheduling-v1")


def parse_model_output(text: str) -> Policy:
    # Accept one JSON object, optionally fenced. Nothing is eval/exec'd.
    if len(text) > 8192:
        raise ValueError("Model response too long")
    start = text.find("{")
    if start < 0:
        raise ValueError("No JSON object")
    data, _ = json.JSONDecoder().raw_decode(text[start:])
    return Policy.parse(data)
