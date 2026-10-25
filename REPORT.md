# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **14** cycles · Accepted **6** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 713.25 |
| Initial policy baseline | 686.10 |
| Change from baseline | +3.96% |
| Successful open-model proposals | 3 |
| Cycles today | 2 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-25T11:20:48.629515+00:00 · github-actions

Model status: `unavailable`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| c2628e896272 | bounded-mutation | 696.10 | 688.60 | no |
| 26ff34e90986 | bounded-mutation | 713.25 | 703.75 | yes |
| 86e4f447c11e | bounded-mutation | 684.00 | 677.50 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
