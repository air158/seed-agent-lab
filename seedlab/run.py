"""One bounded observe/propose/evaluate/checkpoint cycle."""
from __future__ import annotations

import argparse
from contextlib import contextmanager
from dataclasses import asdict
from datetime import datetime, timezone
import fcntl
import json
import os
from pathlib import Path
import subprocess
import sys
import tempfile
import time

from seedlab.core import Policy, evaluate, mutate, select

ROOT = Path(__file__).resolve().parents[1]
HARD_LIMITS = {"max_children": 3, "max_cycles_per_day": 4,
               "max_model_calls_per_day": 2, "model_timeout_seconds": 180}


def atomic_write(path: Path, value: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    with temporary.open("w", encoding="utf-8") as out:
        json.dump(value, out, ensure_ascii=False, indent=2, allow_nan=False)
        out.write("\n")
        out.flush()
        os.fsync(out.fileno())
    os.replace(temporary, path)


def validate_state(value: dict) -> dict:
    if value.get("version") != 1 or type(value.get("generation")) is not int or value["generation"] < 0:
        raise ValueError("Invalid checkpoint")
    Policy.parse(value["policy"])
    for key in ("cycles_today", "model_calls_today"):
        if type(value.get(key)) is not int or value[key] < 0:
            raise ValueError("Invalid budget ledger")
    if type(value.get("last_cycle_epoch")) not in (float, int):
        raise ValueError("Invalid timestamp")
    if not isinstance(value.get("history"), list) or not isinstance(value.get("lineage"), list):
        raise ValueError("Invalid history")
    return value


def initial_state() -> dict:
    return dict(version=1, generation=0, policy=asdict(Policy()), status="ready",
                day="", cycles_today=0, model_calls_today=0, last_cycle_epoch=0,
                history=[], lineage=[], total_model_successes=0, total_promotions=0)


def load_state(directory: Path) -> tuple[dict, bool]:
    main, backup = directory / "current.json", directory / "previous.json"
    if not main.exists() and not backup.exists():
        return initial_state(), False
    for path in (main, backup):
        try:
            return validate_state(json.loads(path.read_text())), path == backup
        except (OSError, ValueError, KeyError, TypeError):
            continue
    raise ValueError("Both checkpoints invalid; refusing to silently reset budgets")


def read_control(root: Path) -> dict:
    raw = json.loads((root / "control.json").read_text())
    if type(raw.get("enabled")) is not bool:
        raise ValueError("enabled must be boolean")
    for key, ceiling in HARD_LIMITS.items():
        if type(raw.get(key)) is not int or not 1 <= raw[key] <= ceiling:
            raise ValueError(f"{key} must be an integer in 1..{ceiling}")
    interval = raw.get("minimum_cycle_interval_seconds")
    if type(interval) is not int or not 1800 <= interval <= 86400:
        raise ValueError("Interval must be 1800..86400 seconds")
    return raw


@contextmanager
def exclusive(directory: Path):
    directory.mkdir(parents=True, exist_ok=True)
    with (directory / "cycle.lock").open("a") as lock:
        try:
            fcntl.flock(lock, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except BlockingIOError:
            raise RuntimeError("Another cycle is already running") from None
        try:
            yield
        finally:
            fcntl.flock(lock, fcntl.LOCK_UN)


def model_candidate(parent: Policy, generation: int, timeout: int) -> tuple[Policy | None, dict]:
    # No GitHub token, cloud keys or unrelated user environment reaches inference.
    with tempfile.TemporaryDirectory(prefix="seedlab-") as folder:
        work = Path(folder)
        request, response = work / "input.json", work / "output.json"
        request.write_text(json.dumps({"policy": asdict(parent), "generation": generation}))
        allowed = ("PATH", "LANG", "SYSTEMROOT", "SSL_CERT_FILE", "SSL_CERT_DIR")
        env = {k: os.environ[k] for k in allowed if k in os.environ}
        env.update(HF_HOME=str(ROOT / ".cache" / "huggingface"), HF_HUB_DISABLE_TELEMETRY="1",
                   HF_HUB_DISABLE_IMPLICIT_TOKEN="1", TOKENIZERS_PARALLELISM="false",
                   PYTHONPATH=str(ROOT), OMP_NUM_THREADS="2")
        if os.environ.get("SEED_MODEL_REVISION"):
            env["SEED_MODEL_REVISION"] = os.environ["SEED_MODEL_REVISION"]
        try:
            result = subprocess.run([sys.executable, "-m", "seedlab.model", str(request), str(response)],
                                    cwd=ROOT, env=env, stdout=subprocess.DEVNULL,
                                    stderr=subprocess.PIPE, timeout=timeout, text=True)
            if result.returncode != 0:
                # Store only the error class/last line, never an environment dump.
                last = result.stderr.strip().splitlines()[-1:] or ["Inference process failed"]
                return None, {"status": "unavailable", "detail": last[0][:300]}
            data = json.loads(response.read_text())
            return Policy.parse(data["policy"]), {"status": "ok", "model": data["model"], "revision": data["revision"]}
        except subprocess.TimeoutExpired:
            return None, {"status": "timeout", "detail": f"Stopped after {timeout}s"}
        except (OSError, ValueError, KeyError, TypeError) as exc:
            return None, {"status": "invalid_output", "detail": type(exc).__name__}


def write_report(root: Path, state: dict) -> None:
    history = state.get("history", [])
    recent = history[-1] if history else None
    baseline = evaluate(Policy(), list(range(100, 120)))["value"]
    champion = evaluate(Policy.parse(state["policy"]), list(range(100, 120)))["value"]
    lines = ["# Seed Agent Lab", "", "> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.", "",
             f"Status: **{state['status']}** · Completed **{state['generation']}** cycles · Accepted **{state['total_promotions']}** improvements", "",
             "| Metric | Current result |", "|---|---|",
             f"| Fixed training-set task value | {champion:.2f} |", f"| Initial policy baseline | {baseline:.2f} |",
             f"| Change from baseline | {(champion / baseline - 1) * 100:+.2f}% |",
             f"| Successful open-model proposals | {state['total_model_successes']} |",
             f"| Cycles today | {state['cycles_today']} / 4 |",
             f"| Model attempts today | {state['model_calls_today']} / 2 |", "",
             "At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.", ""]
    if recent:
        lines += [f"Latest experiment: {recent['time']} · {recent['environment']}", "",
                  f"Model status: `{recent['model']['status']}`", "",
                  "| Candidate | Origin | Training score | Evaluation score | Accepted |", "|---|---|---:|---:|---|"]
        for child in recent["evaluation"]["candidates"]:
            picked = child["id"] == recent.get("winner_id")
            lines.append(f"| {child['id']} | {child['origin']} | {child['train']['value']:.2f} | {child['holdout']['value']:.2f} | {'yes' if picked else 'no'} |")
        lines += ["", "The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.", ""]
    lines += ["Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.",
              "The experiment will not re-enable itself; resuming requires the project owner.", ""]
    (root / "REPORT.md").write_text("\n".join(lines), encoding="utf-8")


def cycle(root: Path, use_model: bool = False, now: float | None = None) -> dict:
    now = time.time() if now is None else now
    control = read_control(root)
    with exclusive(root / "work"):
        state_dir = root / "state"
        state, recovered = load_state(state_dir)
        if not control["enabled"]:
            return {"status": "paused", "generation": state["generation"]}
        date = datetime.fromtimestamp(now, timezone.utc)
        day = date.strftime("%Y-%m-%d")
        if state["day"] != day:
            state.update(day=day, cycles_today=0, model_calls_today=0)
        if recovered:
            # An older backup could undercount usage. Pause the recovered day.
            state.update(status="checkpoint_recovered_paused_for_day", day=day,
                         cycles_today=4, model_calls_today=2)
            atomic_write(state_dir / "current.json", state)
            write_report(root, state)
            return state
        if state["cycles_today"] >= control["max_cycles_per_day"]:
            return {"status": "daily_budget_reached", "generation": state["generation"]}
        if now - state["last_cycle_epoch"] < control["minimum_cycle_interval_seconds"]:
            return {"status": "cooldown", "generation": state["generation"]}
        atomic_write(state_dir / "previous.json", state)
        state.update(cycles_today=state["cycles_today"] + 1, last_cycle_epoch=now, status="running")
        parent = Policy.parse(state["policy"])
        generation = state["generation"] + 1
        requested = use_model and state["model_calls_today"] < control["max_model_calls_per_day"]
        if requested:
            state["model_calls_today"] += 1
        # Debit before inference. Even errors consume the attempt budget.
        atomic_write(state_dir / "current.json", state)
        children = [(mutate(parent, generation, i), "bounded-mutation") for i in range(1, control["max_children"] + 1)]
        model_result = {"status": "not_requested" if not use_model else "daily_budget_reached"}
        if requested:
            child, model_result = model_candidate(parent, generation, control["model_timeout_seconds"])
            if child is not None:
                children[-1] = (child, "qwen-local-cpu")
                state["total_model_successes"] += 1
        if not read_control(root)["enabled"]:
            state["status"] = "paused"
            atomic_write(state_dir / "current.json", state)
            write_report(root, state)
            return state
        evaluation = select(parent, children, generation)
        winner = evaluation["winner"]
        if winner:
            state["policy"] = winner["policy"]
            state["total_promotions"] += 1
            state["lineage"].append({"generation": generation, "parent": parent.identity,
                                      "child": winner["id"], "origin": winner["origin"]})
        event = dict(generation=generation, time=date.isoformat(), model=model_result,
                     environment="github-actions" if os.getenv("GITHUB_ACTIONS") == "true" else "local",
                     evaluation=evaluation, winner_id=winner["id"] if winner else None)
        state.update(generation=generation, status="healthy" if model_result["status"] == "ok" else "healthy_without_llm")
        state["history"] = (state["history"] + [event])[-120:]
        state["lineage"] = state["lineage"][-120:]
        atomic_write(state_dir / "current.json", state)
        write_report(root, state)
        return state


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--model", action="store_true", help="Try the local open-weight model")
    args = parser.parse_args()
    result = cycle(ROOT, args.model)
    print(json.dumps({k: result.get(k) for k in ("status", "generation", "total_promotions", "total_model_successes")}, ensure_ascii=False))
