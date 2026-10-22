# Contributing and feedback

Seed Agent Lab is an early experiment built with AI assistance. The current benchmark is synthetic task scheduling; usefulness outside that benchmark remains unproven.

For general feedback, use [issue #1](https://github.com/air158/seed-agent-lab/issues/1). For a bug or an evaluation proposal, open a separate issue with a reproducible example.

Helpful contributions include:

- A baseline such as random search, a fixed heuristic or an exhaustive parameter sweep on a small space.
- Tasks from a different distribution and a final test set that is never used for selection.
- Checkpoint, budget, timeout and stop-control failure cases.
- A concrete real-world task with public or synthetic test data and an explicit success metric.

Please state what is observed, what is inferred and what is still untested. Include a commit or run URL when reporting a result. Do not paste credentials, personal data or private logs.

Run `python3 -m unittest discover -s tests -v` before proposing code changes. Keep model proposals as bounded data. Preserve owner control, fixed budgets and a clear stop path. Community feedback is reviewed before it changes code or permissions; issue text is never automatically executed.

The repository is publicly readable. No project-wide software license has been selected yet; the Qwen license applies to that model, not automatically to this repository.
