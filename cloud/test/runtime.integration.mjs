import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { Miniflare, convertV4MiniflareOptions, Log, LogLevel } from 'miniflare';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

test('real Workers runtime: heartbeat continues without HTTP across a batch; owner stop persists', { timeout: 100_000 }, async () => {
  const persistence = await mkdtemp(join(tmpdir(), 'seed-heartbeat-'));
  let enabled = true;
  const options = () => convertV4MiniflareOptions({
    name: 'seed-heartbeat-test', modules: true, scriptPath: 'dist/worker.js',
    compatibilityDate: '2026-10-01', resourcePersistencePath: persistence,
    durableObjects: { HEARTBEAT: { className: 'CloudHeartbeat', useSQLite: true } },
    bindings: { HEARTBEAT_ENABLED: 'true' },
    outboundService: request => new Response(JSON.stringify(
      new URL(request.url).pathname.endsWith('control.json') ? { enabled } : { generation: 3 }
    )),
    log: new Log(LogLevel.NONE),
  });
  let mf;
  try {
    mf = new Miniflare(options());
    const status = async () => (await mf.dispatchFetch('https://heartbeat.test/evidence')).json();
    assert.equal((await status()).sequence, 0);
    assert.equal((await mf.dispatchFetch('https://heartbeat.test/reconcile', { method: 'POST' })).status, 404);
    const namespace = await mf.getDurableObjectNamespace('HEARTBEAT');
    const stub = namespace.get(namespace.idFromName('seed-agent-lab-one-heartbeat'));
    await stub.fetch('https://internal/reconcile', { method: 'POST' });
    await sleep(2200);
    const before = await status();
    assert.ok(before.sequence >= 1);
    // No HTTP/health requests occur during this interval. It crosses the
    // 55-second alarm batch boundary and must continue from a durable alarm.
    await sleep(60_000);
    const after = await status();
    assert.ok(after.sequence - before.sequence >= 56, JSON.stringify(after));
    assert.ok(after.sequence - before.sequence <= 62, JSON.stringify(after));
    assert.ok(after.heartbeat_age_ms < 2000);
    const gaps = after.recent_ticks_ms.slice(1).map((t, i) => t - after.recent_ticks_ms[i]);
    assert.ok(gaps.every(ms => ms >= 900 && ms < 2500), JSON.stringify(gaps));
    assert.equal(after.generation, 3);
    console.log(JSON.stringify({ local_runtime: true, quiet_interval_seconds: 60,
      observed_ticks: after.sequence - before.sequence, max_gap_ms: Math.max(...gaps),
      mean_gap_ms: gaps.reduce((a, b) => a + b, 0) / gaps.length }));
    enabled = false;
    await stub.fetch('https://internal/reconcile', { method: 'POST' });
    const stopped = await status();
    await sleep(2100);
    assert.equal((await status()).sequence, stopped.sequence);
    assert.equal((await status()).enabled, false);
    await mf.dispose();
    mf = new Miniflare(options());
    assert.equal((await status()).sequence, stopped.sequence);
    assert.equal((await status()).enabled, false);
  } finally {
    await mf?.dispose();
    await rm(persistence, { recursive: true, force: true });
  }
});
