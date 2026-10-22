# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy** · Completed **2** cycles · Accepted **1** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 699.65 |
| Initial policy baseline | 686.10 |
| Change from baseline | +1.97% |
| Successful open-model proposals | 2 |
| Cycles today | 2 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-22T17:34:57.611769+00:00 · github-actions

Model status: `ok`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 4423d018a0b5 | bounded-mutation | 682.65 | 691.55 | no |
| 4667e735f40b | bounded-mutation | 685.10 | 698.35 | no |
| bbe2a9a4981f | qwen-local-cpu | 699.65 | 701.75 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
