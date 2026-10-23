"""Exercise proposal validation without downloading a model or using experiment quota."""
from contextlib import nullcontext
from dataclasses import asdict
import json
from pathlib import Path
import subprocess
from types import SimpleNamespace
import unittest
from unittest.mock import MagicMock, patch

from seedlab.core import Policy
from seedlab.model import propose
from seedlab.run import model_candidate


class ModelProposalTests(unittest.TestCase):
    def fake_runtime(self, response):
        tokenizer = MagicMock()
        tokenizer.return_value = {"input_ids": SimpleNamespace(shape=(1, 10))}
        tokenizer.decode.return_value = response
        model = MagicMock()
        model.config._commit_hash = "test-revision"
        torch = MagicMock()
        torch.inference_mode.side_effect = nullcontext
        transformers = MagicMock()
        transformers.AutoTokenizer.from_pretrained.return_value = tokenizer
        transformers.AutoModelForCausalLM.from_pretrained.return_value = model
        return {"torch": torch, "transformers": transformers}, model

    def test_echo_is_rejected_after_one_generation(self):
        parent = Policy(0.5, 0.3, 0.2, 0.4)
        modules, model = self.fake_runtime(json.dumps(asdict(parent)))
        with patch.dict("sys.modules", modules):
            with self.assertRaisesRegex(ValueError, "model_quality: unchanged_policy"):
                propose(parent, 2)
        model.generate.assert_called_once()

    def test_numeric_equivalent_echo_is_rejected(self):
        modules, model = self.fake_runtime(
            '{"value_weight":1,"urgency_weight":0,"age_weight":0,"effort_power":0}')
        with patch.dict("sys.modules", modules):
            with self.assertRaisesRegex(ValueError, "unchanged_policy"):
                propose(Policy(), 2)
        model.generate.assert_called_once()

    def test_distinct_valid_candidate_retains_provenance(self):
        child = Policy(0.5, 0.3, 0.4512, 0.4)
        modules, model = self.fake_runtime(json.dumps(asdict(child)))
        with patch.dict("sys.modules", modules):
            result = propose(Policy(0.5, 0.3, 0.2, 0.4), 4)
        self.assertEqual(result["policy"], asdict(child))
        self.assertEqual(result["revision"], "test-revision")
        model.generate.assert_called_once()

    def test_echo_error_reaches_runner_without_becoming_llm_success(self):
        parent = Policy(0.5, 0.3, 0.2, 0.4)
        modules, model = self.fake_runtime(json.dumps(asdict(parent)))

        def child_process(args, **kwargs):
            request = json.loads(Path(args[-2]).read_text())
            try:
                propose(Policy.parse(request["policy"]), request["generation"])
            except ValueError as exc:
                return subprocess.CompletedProcess(args, 1, stderr=f"ValueError: {exc}\n")
            self.fail("Echo unexpectedly passed proposal validation")

        with patch.dict("sys.modules", modules), patch("seedlab.run.subprocess.run", side_effect=child_process) as run:
            child, status = model_candidate(parent, 2, 180)
        self.assertIsNone(child)
        self.assertEqual(status["status"], "unavailable")
        self.assertEqual(status["detail"], "ValueError: model_quality: unchanged_policy")
        model.generate.assert_called_once()
        run.assert_called_once()


if __name__ == "__main__":
    unittest.main()
