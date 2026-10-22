# Cloud heartbeat verification

**Deployed on Cloudflare Workers Free ($0 plan); sustained operation under investigation.** A later observation found a 33-second gap and a runtime restart. The successful sample below is historical and does not establish continuous operation.

[Live status](https://seed-agent-lab-heartbeat.johnmeng117.workers.dev/evidence) · [Independent GitHub run](https://github.com/air158/seed-agent-lab/actions/runs/39826104928) · [Raw measurement](cloud-heartbeat-2026-10-22.json)

| Observation | Result |
| --- | --- |
| Measurement window | October 22, 2026, 17:50:06–17:51:37 UTC |
| Quiet interval | 90 seconds, with no observer requests |
| Executed and persisted beats | 90 |
| Counter | 66 → 156 |
| 95th percentile interval | 1,000 ms |
| Maximum interval in the sample | 1,000 ms |
| Runtime restart during the sample | None |
| Health before and after | Healthy |
| Individual timestamps matched the counter | Yes |

This measurement ran on a GitHub-hosted Linux runner against the deployed public service. It passed all seven checks. The public endpoints cannot start the heartbeat; Cloudflare's scheduled control check and durable alarms drive it. The cloud runtime does not depend on this chat, a browser tab, or a local terminal staying open.

The observation establishes the measured interval, not future uninterrupted availability. Hourly independent observations are enabled, and a separate follow-up is scheduled to verify operation after the chat ends. **Post-chat continuity is pending until that later evidence exists.**

The one-second heartbeat is a persisted runtime check. Model experiments remain bounded and run separately every six hours.

To stop only the cloud heartbeat, set `cloud_heartbeat_enabled` to `false` in the repository's `control.json`. The next minute-level control check stops it.
