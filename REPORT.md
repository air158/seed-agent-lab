# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **17** cycles · Accepted **6** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 713.25 |
| Initial policy baseline | 686.10 |
| Change from baseline | +3.96% |
| Successful open-model proposals | 3 |
| Cycles today | 1 / 4 |
| Model attempts today | 1 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-26T04:41:55.750439+00:00 · github-actions

Model status: `unavailable`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 26ff34e90986 | bounded-mutation | 713.25 | 715.70 | no |
| 0cc7e6295d15 | bounded-mutation | 614.40 | 625.55 | no |
| 57d61f8ee68e | bounded-mutation | 713.00 | 715.85 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
