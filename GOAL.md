# Continuous improvement goal

Created: October 23, 2026, Asia/Shanghai.

The project aims to complete bounded experiments reliably, increase the fraction of valid model proposals, and verify gains against separate evaluation workloads. Runtime supports that task and always remains under the owner's control. The project does not re-enable disabled workflows, create new accounts or hosting, or replicate deployments.

## Verified starting point

At 00:52 on October 23, 2026 (Asia/Shanghai), the first cloud experiment completed. Qwen2.5-Coder-0.5B-Instruct ran on CPU on a standard GitHub Linux runner. Three candidates were evaluated; the Qwen proposal was selected. Fixed training value increased from 686.10 to 699.65, and that generation's evaluation value increased from 686.10 to 701.85. Generation 1 was checkpointed. The initial 17 lifecycle and policy tests passed.

[First cloud run](https://github.com/air158/seed-agent-lab/actions/runs/39817612386)

These are synthetic scheduling results. They do not establish real-world task performance, general capability gains, or long-term reliability. The evaluation set participates in candidate selection; it is not an untouched final test set.

## Current milestone

Collect at least 20 real model attempts, reach a 90% valid-proposal rate, and record at least three accepted policy improvements. Changing the benchmark, removing the stop switch or increasing the budget does not count as meeting this milestone.

An attempt has model status `ok`, `unavailable`, `timeout`, or `invalid_output` in history. `not_requested` and `daily_budget_reached` are not attempts. A successful proposal must contain a valid policy that was actually evaluated. Mocked test proposals do not count.

## Execution and maintenance

The repository schedules one experiment every six hours. A separate ChatGPT maintenance task is described in the project setup; it is external to this repository and subject to the account's plan and task limits. That task is intended to read reports and failure logs, make one evidence-based fix, and use a separate branch, draft pull request and read-only CI before merging. Its stated modification scope is the proposal module, related documentation and regression tests, with at most one open repair PR.

That external task is not unlimited free inference. The repository's experiments do not call paid model APIs. At the milestone, the maintenance task should report its results and stop itself; experiment scheduling continues according to `control.json`.

The optional `seedlab.live` process provides a one-second heartbeat on an owner-controlled host. It preserves the existing experiment budget and checks the stop switch on every tick. It has been tested locally; a continuously running cloud host has not been configured.

Stopping either component does not trigger migration, replacement hosting, redeployment or a substitute schedule. Service or permission limits are reported rather than bypassed.
