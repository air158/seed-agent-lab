# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **6** cycles · Accepted **2** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 699.85 |
| Initial policy baseline | 686.10 |
| Change from baseline | +2.00% |
| Successful open-model proposals | 2 |
| Cycles today | 2 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-23T04:44:58.351910+00:00 · github-actions

Model status: `unavailable`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 391d8d7d6c30 | bounded-mutation | 694.85 | 678.15 | no |
| 96c74e36f99e | bounded-mutation | 689.70 | 675.50 | no |
| 7e06eeac5fe5 | bounded-mutation | 686.00 | 678.25 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
