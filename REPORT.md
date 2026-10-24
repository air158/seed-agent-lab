# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy** · Completed **9** cycles · Accepted **3** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 705.55 |
| Initial policy baseline | 686.10 |
| Change from baseline | +2.83% |
| Successful open-model proposals | 3 |
| Cycles today | 1 / 4 |
| Model attempts today | 1 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-24T04:32:16.834723+00:00 · github-actions

Model status: `ok`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| d32cb0bb2f09 | bounded-mutation | 688.20 | 682.85 | no |
| 08d0600d165a | bounded-mutation | 706.65 | 697.95 | no |
| 35311fcd01d3 | qwen-local-cpu | 704.65 | 698.80 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
