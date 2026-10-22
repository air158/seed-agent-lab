# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **4** cycles · Accepted **2** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 699.85 |
| Initial policy baseline | 686.10 |
| Change from baseline | +2.00% |
| Successful open-model proposals | 2 |
| Cycles today | 4 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-22T21:32:38.217141+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| c974f0ba2d88 | bounded-mutation | 689.30 | 688.05 | no |
| 6612ef08ed3b | bounded-mutation | 699.85 | 701.30 | yes |
| ac3f6397c2ab | bounded-mutation | 699.40 | 700.70 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
