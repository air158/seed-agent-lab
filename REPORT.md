# Seed Agent Lab

> Automated experiment record. Scores measure synthetic task queues, not real-world value or general intelligence.

Status: **healthy_without_llm** · Completed **16** cycles · Accepted **6** improvements

| Metric | Current result |
|---|---|
| Fixed training-set task value | 713.25 |
| Initial policy baseline | 686.10 |
| Change from baseline | +3.96% |
| Successful open-model proposals | 3 |
| Cycles today | 4 / 4 |
| Model attempts today | 2 / 2 |

At most 3 candidates per cycle. Candidates are parameter data, not new servers, accounts or schedulers.

Latest experiment: 2026-10-25T20:47:40.023670+00:00 · github-actions

Model status: `not_requested`

| Candidate | Origin | Training score | Evaluation score | Accepted |
|---|---|---:|---:|---|
| ff3f6c89134a | bounded-mutation | 705.45 | 719.50 | no |
| 7dd7994d6227 | bounded-mutation | 710.60 | 721.45 | no |
| 26ff34e90986 | bounded-mutation | 713.25 | 726.75 | no |

The evaluation set rotates each generation and participates in selection. It is not an untouched final test set; do not compare its scores across generations. The training set is fixed.

Pause: set `enabled` to `false` in `control.json`, or disable the Actions workflow.
The experiment will not re-enable itself; resuming requires the project owner.
