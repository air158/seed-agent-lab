# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **11** cycles · Accepted **4** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 708.05 |
| Initial policy baseline | 686.10 |
| Change from baseline | +3.20% |
| Successful open-model proposals | 3 |
| Cycles today | 3 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-24T15:53:37.111839+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 6b277d775785 | bounded-mutation | 691.00 | 701.35 | no |
| bb22ad437e6b | bounded-mutation | 631.95 | 640.45 | no |
| 50c6ef13add4 | bounded-mutation | 691.00 | 701.35 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
