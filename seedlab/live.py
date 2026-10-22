"""Owner-controlled local/server runner with a real one-second process heartbeat.

The heartbeat proves this process is responsive. It does not prove that an LLM
is thinking, and it never provisions hosting or changes the experiment budget.
"""
from __future__ import annotations

import argparse
from datetime import datetime, timezone
import math
import os
from pathlib import Path
import signal
import subprocess
import sys
import threading
import time

from seedlab.run import ROOT, atomic_write, exclusive, load_state, read_control

HEARTBEAT_SECONDS = 1.0


def stop_child(child: subprocess.Popen | None) -> None:
    if child is None or child.poll() is not None:
        return
    # Each task has its own group; the optional inference subprocess belongs to it.
    try:
        os.killpg(child.pid, signal.SIGTERM)
        child.wait(timeout=2)
    except ProcessLookupError:
        return
    except subprocess.TimeoutExpired:
        try:
            os.killpg(child.pid, signal.SIGKILL)
        except ProcessLookupError:
            pass
        child.wait(timeout=2)


def serve(root: Path = ROOT, *, duration: float | None = None,
          use_model: bool = False, stop: threading.Event | None = None,
          run_tasks: bool = True) -> dict:
    if duration is not None and (not math.isfinite(duration) or duration <= 0):
        raise ValueError("duration must be a positive finite number")
    stop = stop or threading.Event()
    heartbeat = root / "work" / "heartbeat.json"
    started = time.monotonic()
    next_tick = started
    next_task = started
    child = None
    sequence = 0
    last_task_exit = None
    reason = "stopped"
    snapshot = {}
    with exclusive(root / "work" / "live-runner"):
        try:
            while not stop.is_set():
                now = time.monotonic()
                if duration is not None and now - started >= duration:
                    reason = "duration-complete"
                    break
                control = read_control(root)
                if not control["enabled"]:
                    reason = "paused"
                    break
                state, recovered = load_state(root / "state")
                if recovered:
                    reason = "checkpoint-recovery-required"
                    break
                if child is not None and child.poll() is not None:
                    last_task_exit = child.returncode
                    child = None
                if run_tasks and child is None and now >= next_task:
                    # The existing runner still owns quota/cooldown checks. No model
                    # work is performed merely because a heartbeat tick occurred.
                    command = [sys.executable, "-m", "seedlab.run"]
                    if use_model:
                        command.append("--model")
                    child = subprocess.Popen(command, cwd=root, start_new_session=True,
                                             stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                    next_task = now + control["minimum_cycle_interval_seconds"]
                sequence += 1
                snapshot = dict(version=1, status="running", sequence=sequence,
                                updated_at=datetime.now(timezone.utc).isoformat(),
                                uptime_seconds=round(now - started, 3),
                                interval_seconds=HEARTBEAT_SECONDS,
                                task_running=child is not None,
                                last_task_exit=last_task_exit,
                                checkpoint_generation=state["generation"])
                atomic_write(heartbeat, snapshot)
                next_tick += HEARTBEAT_SECONDS
                # Skip missed ticks rather than writing a burst after a suspension.
                next_tick = max(next_tick, time.monotonic())
                wait = max(0, next_tick - time.monotonic())
                if duration is not None:
                    wait = min(wait, max(0, duration - (time.monotonic() - started)))
                stop.wait(wait)
        except Exception:
            reason = "error"
            raise
        finally:
            stop_child(child)
            snapshot.update(version=1, status=reason, sequence=sequence, task_running=False,
                            updated_at=datetime.now(timezone.utc).isoformat())
            atomic_write(heartbeat, snapshot)
    return snapshot


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--duration", type=float, help="Stop after this many seconds; otherwise run until stopped")
    parser.add_argument("--model", action="store_true", help="Allow model attempts within existing daily limits")
    parser.add_argument("--heartbeat-only", action="store_true", help="Check liveness without starting experiment tasks")
    args = parser.parse_args()
    stopped = threading.Event()
    signal.signal(signal.SIGINT, lambda *_: stopped.set())
    signal.signal(signal.SIGTERM, lambda *_: stopped.set())
    result = serve(duration=args.duration, use_model=args.model, stop=stopped, run_tasks=not args.heartbeat_only)
    print(f"Live runner ended: {result['status']}; heartbeat ticks: {result['sequence']}")
