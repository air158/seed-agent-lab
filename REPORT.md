# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy** · Completed **68** cycles · Accepted **8** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 715.70 |
| Initial policy baseline | 686.10 |
| Change from baseline | +4.31% |
| Successful open-model proposals | 11 |
| Cycles today | 1 / 4 |
| Model attempts today | 1 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-11-14T06:14:52.369428+00:00 · github-actions

Model status: `ok`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 637ba94279cf | bounded-mutation | 711.45 | 704.05 | no |
| b88cb9f992c4 | bounded-mutation | 713.15 | 704.20 | no |
| 931038f5b742 | qwen-local-cpu | 692.35 | 692.10 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
