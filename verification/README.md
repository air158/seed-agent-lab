# Cloud heartbeat verification

**The corrected runtime is running on Cloudflare Workers Free ($0 plan).**

[Live status](https://seed-agent-lab-heartbeat.johnmeng117.workers.dev/evidence) · [Independent GitHub run](https://github.com/air158/seed-agent-lab/actions/runs/39829412021) · [Extended measurement](cloud-soak-v2/summary.json)

| Observation | Result |
| --- | --- |
| Runtime revision | `prearmed-batch-v2` |
| Extended observation, October 22, 2026 | 18:04:29–18:09:19 UTC |
| Individually verified beats | 285 over 285.002 seconds of execution timestamps |
| Quiet intervals | Three separate 90-second intervals, with zero observer requests inside each |
| 95th percentile interval | 1,000 ms |
| Maximum interval in the extended sample | 1,001 ms |
| Runtime restart or new long gap | None |
| Later independent GitHub observation | 18:13:23–18:14:54 UTC; 90 beats; 1,000 ms p95; 1,001 ms maximum |
| Health before and after each sample | Healthy |

The six snapshots in the extended observation overlap, so their individual timestamps account for all 285 beats, including those between the quiet intervals. See [sample 1](cloud-soak-v2/sample-1.json), [sample 2](cloud-soak-v2/sample-2.json), [sample 3](cloud-soak-v2/sample-3.json), and the [GitHub observation](cloud-soak-v2/github-observation.json). The independent GitHub job ran against the deployed public service from a hosted Linux runner.

The public endpoints cannot start the heartbeat. Cloudflare's scheduled control check and durable alarms drive it. The service does not depend on this chat, a browser tab, or a local terminal staying open.

## Fault found and corrected

The first version passed a [short sample](cloud-heartbeat-2026-10-22.json), but later developed six-second batch-handoff gaps. Deployment changes also caused longer interruptions. The maximum historical gap reached 46.013 seconds. These failures remain visible in the lifetime counters; they have not been reset or hidden.

The corrected version schedules each next batch at its deadline in advance, instead of moving a later alarm forward just before it is due. Owner code deployments now activate immediately. The corrected observations above recorded no new long gaps or restarts. They establish the measured periods, not a future uninterrupted-uptime guarantee.

## After the chat

**Post-chat operation verified.** A new [independent GitHub run](https://github.com/air158/seed-agent-lab/actions/runs/39830483552), created at 18:20:40 UTC after the 18:17:13 UTC handoff, observed the deployed service from 18:20:49 to 18:22:20 UTC on October 22, 2026.

The counter advanced from 1,571 at handoff to 1,877: 306 executed beats across 306.006 seconds of heartbeat timestamps. The independent 90-second quiet interval contained 90 individually verified beats, with a 1,000 ms p95 and 1,001 ms maximum interval. The runtime boot identifier was unchanged, health passed before and after, and no new long gaps occurred. Earlier historical gaps remain recorded.

See the [post-chat validation](post-chat-2026-10-22.json) and [original observation](post-chat-observation.json). The one-time follow-up is now paused after successful verification. The cloud heartbeat and hourly independent GitHub observations remain enabled.

The one-second heartbeat is a persisted runtime check. Model experiments remain bounded and run separately every six hours.

To stop only the cloud heartbeat, set `cloud_heartbeat_enabled` to `false` in the repository's `control.json`. The next minute-level control check stops it.
