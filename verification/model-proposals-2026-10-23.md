# Model proposal audit, 2026-10-23

Scope: synthetic scheduling only. This audit does not change historical state,
benchmarks, budgets, stop controls, workflows or permissions.

## Evidence before the fix

At main commit `e72010ffaa36c2aa9843a22d1d4b734757ee8c9b`, four experiment
cycles were successfully published. Three other successful evolution workflows
skipped experiment work; they are not additional cycles.

| Real model attempt | Result | Published |
| --- | --- | --- |
| [39817612386](https://github.com/air158/seed-agent-lab/actions/runs/39817612386) | Runner reported healthy; model candidate selected | Yes, generation 1 |
| [39817965927](https://github.com/air158/seed-agent-lab/actions/runs/39817965927) | Runner reported healthy; publisher refused a changed branch | No |
| [39823848768](https://github.com/air158/seed-agent-lab/actions/runs/39823848768) | Valid JSON repeated the parent exactly | Yes, generation 2; no improvement |

Logs establish **3 real model attempts**, all reported as successful parsing by
the old runner. The checkpoint records only **2**. Thus schema-valid rate was
3/3 in those logs, but this must not be described as a 100% useful-improvement
rate. One persisted proposal is known to be unchanged. The unpublished attempt's
raw parameters are not in the checkpoint, so its novelty cannot be confirmed here.

There are **2 adopted improvements**, one from Qwen and one from bounded mutation.
Fixed training value is **699.85**, versus **686.10** initially, or **+2.00%**.
The latest adopted policy scored **701.30** versus its parent's **700.10** on that
generation's separate evaluation workloads. Evaluation participates in selection
and rotates; it is not an untouched final test and cannot be compared across generations.

All three logged model calls occurred on 2026-10-22 UTC. This exceeds the stated
two-attempt daily ceiling in historical execution, despite a checkpoint count of
two. The failed publisher correctly protected owner changes. The current checkout
logic reads main and has regression coverage for stale publication, but reservation
is still local until publication. Lost budget debits on publication failure remain
an accounting risk outside this model-only fix's authorized scope. No ledger or
budget was reset or changed by this audit.

## Small fix

`seedlab/model.py` asks for a changed parameter and rejects a numerically identical
policy after parsing, with `ValueError: model_quality: unchanged_policy`. There is
no retry, extra generation, fabricated candidate or substitution labelled as LLM.
The existing runner records status `unavailable` with that precise quality detail,
charges the attempt and retains only bounded mutations. This detail distinguishes
an echo from download failures, timeouts and malformed JSON.

A distinct valid proposal still goes through the unchanged training and evaluation
selection. It is not automatically an improvement. Existing historical success
counters are not rewritten and span the old and new acceptance behavior.

## Validation and remaining evidence

All 29 existing Python tests plus 4 new regression tests pass locally: **33/33**.
The new tests mock model inference and do not download weights or run a real model
experiment. Against the original implementation, three echo tests fail as expected
and the distinct-proposal test passes. The tests cover numeric equivalence, one
generation only, provenance, and the error crossing the runner boundary.

Prompt effectiveness on the real Qwen model is **not yet demonstrated**. Future
budgeted experiments must establish that; passing mocked tests is not model-quality
evidence. The 20-attempt / 90%-valid / 3-improvement milestone is not met.
