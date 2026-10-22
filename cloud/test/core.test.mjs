import test from 'node:test';
import assert from 'node:assert/strict';
import { HeartbeatRuntime, CONTROL_LEASE_MS } from '../core.mjs';

function fixture(overrides = {}) {
  let time = 100_000, stored = null, alarm = null, control = { enabled: true, generation: 3 };
  let writes = 0;
  const config = {
    load: () => structuredClone(stored),
    save: value => { stored = structuredClone(value); writes++; },
    setAlarm: value => { alarm = value; }, getAlarm: () => alarm,
    deleteAlarm: () => { alarm = null; }, readControl: async () => control,
    now: () => time, sleep: async ms => { time += ms; }, bootId: 'test-boot',
    batchMs: 4000, ...overrides,
  };
  return { runtime: new HeartbeatRuntime(config), config,
    time: value => { time = value; }, control: value => { control = value; },
    stored: () => stored, alarm: () => alarm, writes: () => writes };
}

test('status reads neither start the service nor manufacture ticks', async () => {
  const f = fixture();
  assert.equal((await f.runtime.snapshot()).sequence, 0);
  f.time(9_000_000);
  assert.equal((await f.runtime.snapshot()).sequence, 0);
  assert.equal(f.writes(), 0);
  assert.equal(f.alarm(), null);
});

test('alarm executes and persists individual one-second ticks across batches', async () => {
  const f = fixture();
  await f.runtime.reconcile();
  await f.runtime.alarm();
  await f.runtime.alarm();
  const state = f.stored();
  assert.equal(state.sequence, 7);
  assert.deepEqual(state.recent_ticks_ms, [100000, 101000, 102000, 103000, 104000, 105000, 106000]);
  assert.equal(state.generation, 3);
  assert.equal(f.alarm(), 107000);
});

test('next batch is armed at its deadline before any ticks, without a late reschedule', async () => {
  const scheduled = [];
  const f = fixture({ setAlarm: at => { scheduled.push(at); } });
  await f.runtime.reconcile();
  scheduled.length = 0;
  await f.runtime.alarm();
  assert.deepEqual(scheduled, [104000]);
  assert.equal(f.stored().next_tick_ms, 104000);
});

test('owner pause cancels pending alarms and prevents all later ticks', async () => {
  const f = fixture();
  await f.runtime.reconcile();
  await f.runtime.alarm();
  const sequence = f.stored().sequence;
  f.control({ enabled: false });
  await f.runtime.reconcile();
  await f.runtime.alarm();
  assert.equal(f.stored().sequence, sequence);
  assert.equal(f.stored().enabled, false);
  assert.equal(f.alarm(), null);
});

test('missing or stale owner control fails closed', async () => {
  const f = fixture();
  f.control({ enabled: 'true' });
  await f.runtime.reconcile();
  assert.equal(f.stored().status, 'control-unavailable');
  assert.equal(f.alarm(), null);
  f.control({ enabled: true });
  await f.runtime.reconcile();
  f.time(100_000 + CONTROL_LEASE_MS + 1);
  await f.runtime.alarm();
  assert.equal(f.stored().sequence, 0);
  assert.equal(f.stored().enabled, false);
});

test('restart preserves counter and records a real gap without backfilling', async () => {
  const f = fixture();
  await f.runtime.reconcile();
  await f.runtime.alarm();
  const old = f.stored().sequence;
  f.time(120_000);
  const restarted = new HeartbeatRuntime({ ...f.config, bootId: 'new-boot', batchMs: 1000 });
  await restarted.alarm();
  assert.equal(f.stored().sequence, old + 1);
  assert.equal(f.stored().boot_id, 'new-boot');
  assert.equal(f.stored().max_gap_ms, 17_000);
  assert.equal(f.stored().gaps_over_1500ms, 1);
});

test('deployment switch prevents start even if remote control is enabled', async () => {
  const f = fixture({ environmentEnabled: false });
  await f.runtime.reconcile();
  assert.equal(f.stored().status, 'disabled-by-deployment');
  assert.equal(f.stored().enabled, false);
  assert.equal(f.alarm(), null);
});
