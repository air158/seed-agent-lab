# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **23** cycles · Accepted **7** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 714.20 |
| Initial policy baseline | 686.10 |
| Change from baseline | +4.10% |
| Successful open-model proposals | 3 |
| Cycles today | 4 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-27T22:09:40.488872+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 1b00148429eb | bounded-mutation | 714.20 | 704.70 | yes |
| 2c663996d381 | bounded-mutation | 711.65 | 702.55 | no |
| 0cc7e6295d15 | bounded-mutation | 614.40 | 602.45 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
