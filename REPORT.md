# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **48** cycles · Accepted **8** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 715.70 |
| Initial policy baseline | 686.10 |
| Change from baseline | +4.31% |
| Successful open-model proposals | 7 |
| Cycles today | 2 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-11-05T19:54:37.081235+00:00 · github-actions

Model status: `unavailable`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 76326a242c77 | bounded-mutation | 712.05 | 694.75 | no |
| b3aa28a9ee1b | bounded-mutation | 616.45 | 604.45 | no |
| 8460d7dfae39 | bounded-mutation | 712.85 | 695.35 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
