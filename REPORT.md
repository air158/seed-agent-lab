# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **12** cycles · Accepted **5** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 712.25 |
| Initial policy baseline | 686.10 |
| Change from baseline | +3.81% |
| Successful open-model proposals | 3 |
| Cycles today | 4 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-24T20:44:44.133614+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| a5999876f43f | bounded-mutation | 712.25 | 713.20 | yes |
| 4f3040500b22 | bounded-mutation | 697.30 | 695.25 | no |
| 1562f04f80cd | bounded-mutation | 706.20 | 706.35 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
