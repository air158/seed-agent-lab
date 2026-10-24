# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **10** cycles · Accepted **4** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 708.05 |
| Initial policy baseline | 686.10 |
| Change from baseline | +3.20% |
| Successful open-model proposals | 3 |
| Cycles today | 2 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-24T10:54:18.125488+00:00 · github-actions

Model status: `unavailable`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 5f6b73b02fc8 | bounded-mutation | 708.05 | 714.80 | yes |
| 0f67fd6f8683 | bounded-mutation | 704.40 | 711.95 | no |
| b8c65048a33f | bounded-mutation | 692.50 | 701.30 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
