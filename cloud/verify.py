"""Observe a cloud heartbeat without sending any requests during a quiet interval."""
from __future__ import annotations
import argparse
from datetime import datetime, timezone
import json
import math
from pathlib import Path
import time
from urllib.parse import urlsplit
from urllib.request import Request, urlopen


def compare(first: dict, second: dict, elapsed: float) -> dict:
    delta = second["sequence"] - first["sequence"]
    baseline = first.get("last_tick_ms")
    timestamps = [t for t in second["recent_ticks_ms"] if baseline is not None and t > baseline]
    gaps = [b - a for a, b in zip([baseline] + timestamps, timestamps)]
    ordered = sorted(gaps)
    p95 = ordered[max(0, math.ceil(len(ordered) * .95) - 1)] if ordered else None
    checks = {
        "initially_healthy": first.get("healthy") is True,
        "finally_healthy": second.get("healthy") is True,
        "same_runtime_boot": bool(first.get("boot_id")) and first.get("boot_id") == second.get("boot_id"),
        "count_matches_elapsed_time": abs(delta - elapsed) <= max(3, elapsed * .04),
        "timestamps_match_count": len(timestamps) == delta,
        "one_second_p95": p95 is not None and 900 <= p95 <= 1300,
        "no_gap_over_three_seconds": bool(gaps) and min(gaps) >= 900 and max(gaps) <= 3000,
    }
    return {"observed_ticks": delta, "p95_interval_ms": p95,
            "max_interval_ms": max(gaps) if gaps else None,
            "checks": checks, "passed": all(checks.values())}


def observe(url: str, quiet_seconds: int = 90) -> dict:
    parsed = urlsplit(url)
    if parsed.scheme != "https" or parsed.username or parsed.password or parsed.query or parsed.fragment:
        raise ValueError("Use a public HTTPS origin without credentials, query, or fragment")
    if not 30 <= quiet_seconds <= 100:
        raise ValueError("quiet_seconds must be between 30 and 100")
    endpoint = url.rstrip("/") + "/evidence"

    def read():
        req = Request(endpoint, headers={"Accept": "application/json", "Cache-Control": "no-cache"})
        with urlopen(req, timeout=15) as response:
            if response.status != 200:
                raise RuntimeError(f"HTTP {response.status}")
            return json.loads(response.read(100_000))

    started = datetime.now(timezone.utc).isoformat()
    first = read()
    clock = time.monotonic()
    time.sleep(quiet_seconds)
    second = read()
    elapsed = time.monotonic() - clock
    return {
        "started_at_utc": started, "finished_at_utc": datetime.now(timezone.utc).isoformat(),
        "endpoint": endpoint, "quiet_seconds": quiet_seconds,
        "http_requests_during_quiet_interval": 0, "elapsed_seconds": elapsed,
        "sequence_before": first["sequence"], "sequence_after": second["sequence"],
        **compare(first, second, elapsed),
        "first": first, "second": second,
    }


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("url")
    parser.add_argument("--quiet-seconds", type=int, default=90)
    parser.add_argument("--output", type=Path, default=Path("heartbeat-verification.json"))
    args = parser.parse_args()
    result = observe(args.url, args.quiet_seconds)
    args.output.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps({key: value for key, value in result.items() if key not in {"first", "second"}}, indent=2))
    raise SystemExit(0 if result["passed"] else 1)
