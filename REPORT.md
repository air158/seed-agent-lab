# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **24** cycles · Accepted **8** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 715.70 |
| Initial policy baseline | 686.10 |
| Change from baseline | +4.31% |
| Successful open-model proposals | 3 |
| Cycles today | 1 / 4 |
| Model attempts today | 1 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-28T05:36:00.739024+00:00 · github-actions

Model status: `unavailable`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 313c9f8134d0 | bounded-mutation | 695.80 | 700.60 | no |
| fcbc62c6ba76 | bounded-mutation | 712.45 | 710.25 | no |
| ba86a5a64eba | bounded-mutation | 715.70 | 714.75 | yes |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
