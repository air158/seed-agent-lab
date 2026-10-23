# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **7** cycles · Accepted **3** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 705.55 |
| Initial policy baseline | 686.10 |
| Change from baseline | +2.83% |
| Successful open-model proposals | 2 |
| Cycles today | 3 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-23T11:33:32.837189+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| a98bc4834f5e | bounded-mutation | 705.55 | 689.35 | yes |
| 4c7fcc461e96 | bounded-mutation | 700.10 | 688.45 | no |
| dd49ea3c7596 | bounded-mutation | 701.75 | 688.50 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
