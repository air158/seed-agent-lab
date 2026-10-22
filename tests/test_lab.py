from dataclasses import asdict
from datetime import datetime, timezone
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

from seedlab.core import Policy, evaluate, parse_model_output, select, simulate
from seedlab.run import atomic_write, cycle, exclusive, initial_state, load_state, read_control

ROOT = Path(__file__).resolve().parents[1]
NOW = datetime(2026, 10, 23, 0, 0, tzinfo=timezone.utc).timestamp()


class PolicyTests(unittest.TestCase):
    def test_reproducible_and_budget_limited(self):
        self.assertEqual(simulate(Policy(), 42), simulate(Policy(), 42))
        self.assertLessEqual(simulate(Policy(), 42)["budget_used"], 24 * 8)

    def test_output_cannot_add_commands_or_change_limits(self):
        for extra in ("command", "max_children", "enabled", "api_key"):
            with self.assertRaises(ValueError):
                Policy.parse({**asdict(Policy()), extra: "anything"})

    def test_invalid_numbers_rejected(self):
        for value in (True, float("inf"), float("nan"), -1, 9, "1"):
            with self.assertRaises(ValueError):
                Policy.parse({**asdict(Policy()), "value_weight": value})

    def test_model_output_is_data_only(self):
        self.assertEqual(parse_model_output('```json\n' + json.dumps(asdict(Policy())) + '\n```'), Policy())
        with self.assertRaises(ValueError):
            parse_model_output("__import__('os').system('anything')")

    def test_acceptance_requires_both_train_and_holdout(self):
        parent = Policy()
        child = Policy(effort_power=1)
        with patch("seedlab.core.evaluate", side_effect=[{"value": 100}, {"value": 100}, {"value": 150}, {"value": 99}]):
            result = select(parent, [(child, "test")], 1)
        self.assertIsNone(result["winner"])

    def test_child_population_cannot_expand(self):
        result = select(Policy(), [(Policy(effort_power=1), "test")] * 100, 1)
        self.assertEqual(len(result["candidates"]), 3)

    def test_benchmark_has_measurable_headroom(self):
        before = evaluate(Policy(), list(range(100, 120)))["value"]
        after = evaluate(Policy(urgency_weight=1), list(range(100, 120)))["value"]
        self.assertGreater(after, before)


class RuntimeTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.root = Path(self.temp.name)
        (self.root / "control.json").write_text((ROOT / "control.json").read_text())

    def tearDown(self):
        self.temp.cleanup()

    def set_control(self, **changes):
        path = self.root / "control.json"
        value = json.loads(path.read_text())
        path.write_text(json.dumps({**value, **changes}))

    def test_stop_does_not_run_model_or_create_checkpoint(self):
        self.set_control(enabled=False)
        with patch("seedlab.run.model_candidate") as model:
            self.assertEqual(cycle(self.root, True, NOW)["status"], "paused")
            model.assert_not_called()
        self.assertFalse((self.root / "state/current.json").exists())

    def test_duplicate_run_is_idempotent(self):
        first = cycle(self.root, False, NOW)
        self.assertEqual(cycle(self.root, False, NOW + 1)["status"], "cooldown")
        state, _ = load_state(self.root / "state")
        self.assertEqual(state["generation"], first["generation"])

    def test_daily_budget_counts_failed_model_calls(self):
        with patch("seedlab.run.model_candidate", return_value=(None, {"status": "timeout"})) as model:
            for i in range(5):
                last = cycle(self.root, True, NOW + i * 3600)
            self.assertEqual(model.call_count, 2)
        self.assertEqual(last["status"], "daily_budget_reached")
        state, _ = load_state(self.root / "state")
        self.assertEqual(state["generation"], 4)
        self.assertEqual(state["model_calls_today"], 2)

    def test_new_day_resets_budget(self):
        for i in range(4):
            cycle(self.root, False, NOW + i * 3600)
        result = cycle(self.root, False, NOW + 86400)
        self.assertEqual(result["cycles_today"], 1)
        self.assertEqual(result["generation"], 5)

    def test_corrupt_checkpoint_recovers_and_pauses(self):
        cycle(self.root, False, NOW)
        cycle(self.root, False, NOW + 3600)
        (self.root / "state/current.json").write_text("broken")
        result = cycle(self.root, False, NOW + 7200)
        self.assertEqual(result["status"], "checkpoint_recovered_paused_for_day")
        self.assertEqual(result["generation"], 1)
        self.assertEqual(result["model_calls_today"], 2)

    def test_both_checkpoints_corrupt_fails_closed(self):
        folder = self.root / "state"
        folder.mkdir()
        for name in ("current.json", "previous.json"):
            (folder / name).write_text("broken")
        with self.assertRaises(ValueError):
            cycle(self.root, True, NOW)

    def test_hard_limits_cannot_be_raised(self):
        self.set_control(max_children=100)
        with self.assertRaises(ValueError):
            cycle(self.root, False, NOW)

    def test_concurrent_local_runs_are_blocked(self):
        with exclusive(self.root / "work"):
            with self.assertRaises(RuntimeError):
                cycle(self.root, False, NOW)

    def test_successful_model_candidate_is_evaluated(self):
        with patch("seedlab.run.model_candidate", return_value=(Policy(effort_power=1), {"status": "ok"})):
            state = cycle(self.root, True, NOW)
        self.assertEqual(state["total_model_successes"], 1)
        self.assertIn("qwen-local-cpu", [c["origin"] for c in state["history"][-1]["evaluation"]["candidates"]])
        self.assertEqual(len(state["history"][-1]["evaluation"]["candidates"]), 3)
        self.assertTrue((self.root / "REPORT.md").exists())

    def test_pause_during_inference_prevents_promotion(self):
        def pause(*args):
            self.set_control(enabled=False)
            return Policy(effort_power=1), {"status": "ok"}
        with patch("seedlab.run.model_candidate", side_effect=pause):
            state = cycle(self.root, True, NOW)
        self.assertEqual(state["status"], "paused")
        self.assertEqual(state["generation"], 0)


if __name__ == "__main__":
    unittest.main()
