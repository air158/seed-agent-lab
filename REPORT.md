# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy** · Completed **72** cycles · Accepted **8** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 715.70 |
| Initial policy baseline | 686.10 |
| Change from baseline | +4.31% |
| Successful open-model proposals | 12 |
| Cycles today | 2 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-11-15T18:48:42.608986+00:00 · github-actions

Model status: `ok`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| b3aa28a9ee1b | bounded-mutation | 616.45 | 650.35 | no |
| 376ea748cfc5 | bounded-mutation | 691.05 | 701.65 | no |
| ebb3461a3706 | qwen-local-cpu | 705.20 | 715.05 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
