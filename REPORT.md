# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **19** cycles · Accepted **6** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 713.25 |
| Initial policy baseline | 686.10 |
| Change from baseline | +3.96% |
| Successful open-model proposals | 3 |
| Cycles today | 3 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-26T22:37:49.864868+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 24e43b6eb19f | bounded-mutation | 705.40 | 689.45 | no |
| 2c96fd5828c8 | bounded-mutation | 695.25 | 678.25 | no |
| 7dd77d74700b | bounded-mutation | 694.10 | 676.90 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
