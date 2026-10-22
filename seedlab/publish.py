"""Publish only bounded data and the report with an optimistic branch lease."""
import json
import os
from pathlib import Path
import urllib.error
import urllib.request

ALLOWED = ("state/current.json", "state/previous.json", "REPORT.md")


def publish() -> None:
    repo = os.environ["GITHUB_REPOSITORY"]
    token = os.environ["GITHUB_TOKEN"]
    # Event SHA can be stale after queued runs; use the actual checkout's lease.
    expected = os.environ["SEED_CHECKOUT_SHA"]
    branch = os.environ["GITHUB_REF_NAME"]
    root = Path(__file__).resolve().parents[1]

    def api(path: str, data=None, method=None):
        payload = json.dumps(data).encode() if data is not None else None
        req = urllib.request.Request(f"https://api.github.com/repos/{repo}/{path}", data=payload,
                                     method=method, headers={"Authorization": f"Bearer {token}",
                                     "Accept": "application/vnd.github+json", "User-Agent": "seed-agent-lab",
                                     "X-GitHub-Api-Version": "2022-11-28", "Content-Type": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as response:
            return json.load(response)

    head = api(f"git/ref/heads/{branch}")["object"]["sha"]
    if head != expected:
        raise RuntimeError("Branch changed during run; refusing to overwrite owner changes")
    # Since the head is unchanged, control.json at checkout is still authoritative.
    if not json.loads((root / "control.json").read_text())["enabled"]:
        print("Paused; nothing published")
        return
    commit = api(f"git/commits/{head}")
    entries = []
    for name in ALLOWED:
        path = root / name
        if not path.exists():
            continue
        if path.is_symlink() or path.stat().st_size > 2_000_000:
            raise ValueError("Invalid output file")
        entries.append({"path": name, "mode": "100644", "type": "blob", "content": path.read_text()})
    if not entries:
        return
    tree = api("git/trees", {"base_tree": commit["tree"]["sha"], "tree": entries})
    if tree["sha"] == commit["tree"]["sha"]:
        print("No changes")
        return
    new_commit = api("git/commits", {"message": "lab: record evaluated policy generation [skip ci]",
                                   "tree": tree["sha"], "parents": [head]})
    # A concurrent owner commit makes this non-fast-forward and GitHub rejects it.
    api(f"git/refs/heads/{branch}", {"sha": new_commit["sha"], "force": False}, "PATCH")
    print("Published experiment checkpoint", new_commit["sha"])


if __name__ == "__main__":
    publish()
