# Continuous cloud heartbeat

**Deployed to Cloudflare Workers Free on October 22, 2026 (UTC).** [Public status](https://seed-agent-lab-heartbeat.johnmeng117.workers.dev) · [Raw execution evidence](https://seed-agent-lab-heartbeat.johnmeng117.workers.dev/evidence) · [Independent observations](https://github.com/air158/seed-agent-lab/actions/workflows/heartbeat-check.yml). Deployment alone does not prove sustained operation; inspect the live timestamps and observation results. Post-chat continuity is established only by an observation completed after the chat ends.

This is the continuously running supervisor for Seed Agent Lab. It records a real timer execution every second and observes the owner's stop switch and latest experiment generation. Bounded Qwen experiments remain in GitHub Actions every six hours; a heartbeat is not an LLM call.

The runtime uses one SQLite Durable Object. It records each beat before exposing it, retains the latest 120 timestamps, and resumes from the persisted count after a platform restart. It does not calculate a counter from elapsed wall time or fill in missing beats. `/health` returns 503 when the last executed beat is stale. `/evidence` exposes timestamps, observed gaps, and the runtime boot identifier. Reading either endpoint never starts the heartbeat.

Durable alarms start approximately 55-second batches. A real one-second timer runs within each batch. Another durable alarm is set before the batch begins, and a minute cron checks the owner switch and recovers interrupted batches. Platform interruptions can cause gaps; those gaps are reported. This is a one-second target interval, not a hard real-time or uninterrupted-uptime guarantee.

## Free-tier budget

Use a **Workers Free** account with no paid upgrade. Cloudflare's documented free limits include 100,000 Durable Object requests/day, 13,000 GB-seconds/day, and 100,000 SQLite rows written/day. Free-plan excess operations fail instead of creating usage charges.

For this single instance, planned usage is approximately:

| Resource | Daily usage |
| --- | --- |
| Executed heartbeat writes | Up to about 86,400 |
| Alarm scheduling plus owner-control writes | About 4,600 |
| Alarm invocations plus minute control checks | About 3,000, plus status reads |
| Active memory duration | About 10,800–11,060 GB-seconds |
| Retained state | One row with the latest 120 tick timestamps |

These are planning estimates, not measured cloud usage. The deployed account's Workers Free plan was verified in the dashboard; no paid upgrade was made. The allowance is shared with other workloads in the account. Do not create additional instances or rotate accounts to evade quotas. Do not use a temporary preview account for continuous operation: unclaimed previews expire after 60 minutes.

## Deploy

```sh
cd cloud
npm ci
npm test
npm run build
npm run test:runtime
npx wrangler whoami
npm run deploy
```

Authentication and a verified Free account are required before deployment. No card, paid plan, inference API key, or public mutation endpoint is required by this implementation. The first minute cron reads the repository control document and starts the alarm. Cron changes can take time to propagate.

Set `cloud_heartbeat_enabled` to `false` in the repository's `control.json` to pause only the cloud heartbeat, or set its existing `enabled` field to `false` to pause the project. The next control check stops it. For an immediate deployment-level stop, set `HEARTBEAT_ENABLED` to `false` and deploy, or disable/delete the Worker in Cloudflare. A missing valid owner-control response for three minutes also stops the heartbeat.

## Verify independently of this chat

After deployment, run:

```sh
python cloud/verify.py https://seed-agent-lab-heartbeat.johnmeng117.workers.dev --output heartbeat-verification.json
```

The observer reads once, sends **zero requests for 90 seconds**, then reads again. It verifies the persisted count and individual timestamps, a one-second p95 interval, no gap over three seconds, and a consistent runtime boot. This tests independence from polling; it does not claim future uptime.

The repository variable `CLOUD_HEARTBEAT_URL` is configured with the deployed origin. The `Cloud heartbeat observation` GitHub workflow performs independent hourly observations and retains timestamped results for seven days. It observes the service; it never starts it or sends keep-alive requests during the observation interval. A successful run that finishes after the chat ends is the required post-chat evidence. Until that run exists, post-chat continuity remains unverified.

## References

- [Durable Objects pricing](https://developers.cloudflare.com/durable-objects/platform/pricing/)
- [Durable Object lifecycle](https://developers.cloudflare.com/durable-objects/concepts/durable-object-lifecycle/)
- [Durable alarms](https://developers.cloudflare.com/durable-objects/api/alarms/)
- [Temporary accounts expire unless claimed](https://developers.cloudflare.com/workers/platform/claim-deployments/)
