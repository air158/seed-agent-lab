# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **22** cycles · Accepted **6** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 713.25 |
| Initial policy baseline | 686.10 |
| Change from baseline | +3.96% |
| Successful open-model proposals | 3 |
| Cycles today | 3 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-27T17:58:04.467936+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| 81b091a2a2bf | bounded-mutation | 695.25 | 693.90 | no |
| 16fc6d4de556 | bounded-mutation | 711.90 | 711.05 | no |
| e08aeb677bee | bounded-mutation | 715.15 | 711.65 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
