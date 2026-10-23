# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **5** cycles · Accepted **2** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 699.85 |
| Initial policy baseline | 686.10 |
| Change from baseline | +2.00% |
| Successful open-model proposals | 2 |
| Cycles today | 1 / 4 |
| Model attempts today | 1 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-23T01:21:22.370018+00:00 · github-actions

Model status: `unavailable`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 90f7265b5525 | bounded-mutation | 635.60 | 610.15 | no |
| 062840d40da0 | bounded-mutation | 700.80 | 683.10 | no |
| c4728acf6437 | bounded-mutation | 699.40 | 682.70 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
