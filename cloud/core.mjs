export const INTERVAL_MS = 1000;
export const CONTROL_LEASE_MS = 180_000;
export const BATCH_MS = 55_000;

export function initialState() {
  return {
    version: 1, status: 'not-started', enabled: false, sequence: 0,
    last_tick_ms: null, next_tick_ms: null, started_at_ms: null,
    last_control_ms: null, last_control_error: null, generation: null,
    boot_id: null, max_gap_ms: 0, gaps_over_1500ms: 0, recent_ticks_ms: [],
  };
}

// Every sequence increment is an executed timer callback, persisted before it is
// exposed. Reads never advance time or synthesize missed ticks.
export class HeartbeatRuntime {
  constructor({ load, save, setAlarm, getAlarm, deleteAlarm, readControl,
    now = Date.now, sleep = ms => new Promise(r => setTimeout(r, ms)),
    environmentEnabled = true, bootId = crypto.randomUUID(), batchMs = BATCH_MS }) {
    Object.assign(this, { save, setAlarm, getAlarm, deleteAlarm, readControl,
      now, sleep, environmentEnabled, bootId, batchMs });
    this.running = false;
    this.reconciling = null;
    this.ready = Promise.resolve(load()).then(saved => {
      this.state = saved || initialState();
    });
  }

  async snapshot() {
    await this.ready;
    const age = this.state.last_tick_ms === null ? null : Math.max(0, this.now() - this.state.last_tick_ms);
    return { ...structuredClone(this.state), interval_ms: INTERVAL_MS,
      runtime_diagnostics: {
        alarm_active: this.running,
        batch_started_at_ms: this.batchStartedAt ?? null,
        batch_finished_at_ms: this.batchFinishedAt ?? null,
        scheduled_alarm_ms: await this.getAlarm(),
      },
      heartbeat_age_ms: age,
      healthy: this.state.enabled && this.state.status === 'running' && age !== null && age < 3000,
      observed_at_ms: this.now(),
      task_execution: 'Bounded model experiments run separately in GitHub Actions every six hours.' };
  }

  async pause(reason) {
    this.state.enabled = false;
    this.state.status = reason;
    this.state.next_tick_ms = null;
    await this.deleteAlarm();
    await this.save(this.state);
  }

  async reconcile() {
    await this.ready;
    if (this.reconciling) return this.reconciling;
    this.reconciling = this.reconcileOnce();
    try { return await this.reconciling; }
    finally { this.reconciling = null; }
  }

  async reconcileOnce() {
    if (!this.environmentEnabled) {
      await this.pause('disabled-by-deployment');
      return this.snapshot();
    }
    try {
      const control = await this.readControl();
      if (typeof control?.enabled !== 'boolean') throw new Error('Invalid control document');
      this.state.last_control_ms = this.now();
      this.state.last_control_error = null;
      if (Number.isSafeInteger(control.generation) && control.generation >= 0) {
        this.state.generation = control.generation;
      }
      if (!control.enabled) {
        await this.pause('paused-by-owner');
        return this.snapshot();
      }
      this.state.enabled = true;
      if (!this.running) {
        const alarm = await this.getAlarm();
        if (alarm === null || alarm < this.now() - 3000) {
          await this.setAlarm(this.now() + INTERVAL_MS);
        }
        this.state.status = this.state.last_tick_ms === null ? 'starting' : 'running';
      }
      await this.save(this.state);
    } catch (error) {
      this.state.last_control_error = String(error.message || error).slice(0, 180);
      if (this.state.last_control_ms === null || this.now() - this.state.last_control_ms > CONTROL_LEASE_MS) {
        await this.pause('control-unavailable');
      } else {
        await this.save(this.state);
      }
    }
    return this.snapshot();
  }

  async alarm() {
    await this.ready;
    if (this.running) return;
    if (!this.environmentEnabled || !this.state.enabled) {
      await this.pause('paused');
      return;
    }
    this.running = true;
    try {
      this.batchStartedAt = this.now();
      const end = this.now() + this.batchMs;
      // Schedule the next batch well in advance. Moving a later alarm forward
      // only one second before the desired deadline caused six-second gaps in
      // the deployed runtime. The new batch waits for next_tick_ms if needed.
      // This alarm also remains scheduled if a restart interrupts this batch.
      await this.setAlarm(end);
      let next = Math.max(this.state.next_tick_ms || this.now(), this.now());
      while (next < end && this.state.enabled) {
        await this.sleep(Math.max(0, next - this.now()));
        if (!this.state.enabled) break;
        if (this.state.last_control_ms === null || this.now() - this.state.last_control_ms > CONTROL_LEASE_MS) {
          await this.pause('control-unavailable');
          break;
        }
        const tick = this.now();
        const gap = this.state.last_tick_ms === null ? 0 : tick - this.state.last_tick_ms;
        this.state.sequence += 1;
        this.state.max_gap_ms = Math.max(this.state.max_gap_ms, gap);
        if (gap > 1500) this.state.gaps_over_1500ms += 1;
        this.state.started_at_ms ??= tick;
        this.state.last_tick_ms = tick;
        this.state.boot_id = this.bootId;
        this.state.status = 'running';
        this.state.next_tick_ms = tick + INTERVAL_MS;
        this.state.recent_ticks_ms = [...this.state.recent_ticks_ms, tick].slice(-120);
        await this.save(this.state);
        // Do not catch up by fabricating or bursting missed heartbeats.
        next = this.state.next_tick_ms;
      }
      this.batchFinishedAt = this.now();
    } finally {
      this.running = false;
    }
  }
}
