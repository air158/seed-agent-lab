# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **8** cycles · Accepted **3** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 705.55 |
| Initial policy baseline | 686.10 |
| Change from baseline | +2.83% |
| Successful open-model proposals | 2 |
| Cycles today | 4 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-23T17:03:22.262105+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 8981003fa21b | bounded-mutation | 701.15 | 685.35 | no |
| 665993c93ca2 | bounded-mutation | 704.65 | 688.85 | no |
| f1d7256ed71a | bounded-mutation | 706.35 | 690.15 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
