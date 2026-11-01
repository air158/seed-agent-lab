# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **37** cycles · Accepted **8** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 715.70 |
| Initial policy baseline | 686.10 |
| Change from baseline | +4.31% |
| Successful open-model proposals | 6 |
| Cycles today | 2 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-11-01T13:16:20.483064+00:00 · github-actions

Model status: `unavailable`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 667d318e3040 | bounded-mutation | 697.55 | 703.10 | no |
| ba86a5a64eba | bounded-mutation | 715.70 | 719.80 | no |
| 097280cd8e5a | bounded-mutation | 712.55 | 717.30 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
