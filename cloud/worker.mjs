import { DurableObject } from 'cloudflare:workers';
import { HeartbeatRuntime } from './core.mjs';

const REPOSITORY = 'https://raw.githubusercontent.com/air158/seed-agent-lab/main/';
const json = (value, status = 200) => Response.json(value, {
  status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' },
});

async function repositoryJson(path) {
  const response = await fetch(`${REPOSITORY}${path}?heartbeat_check=${Date.now()}`, {
    cache: 'no-store', signal: AbortSignal.timeout(8000),
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) throw new Error(`Repository returned HTTP ${response.status}`);
  const body = await response.text();
  if (body.length > 200_000) throw new Error('Repository response too large');
  return JSON.parse(body);
}

export class CloudHeartbeat extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    ctx.storage.sql.exec('CREATE TABLE IF NOT EXISTS heartbeat (id INTEGER PRIMARY KEY, snapshot TEXT NOT NULL)');
    const load = () => {
      const row = ctx.storage.sql.exec('SELECT snapshot FROM heartbeat WHERE id = 1').toArray()[0];
      return row ? JSON.parse(row.snapshot) : null;
    };
    this.runtime = new HeartbeatRuntime({
      load,
      save: state => {
        ctx.storage.sql.exec('INSERT INTO heartbeat (id, snapshot) VALUES (1, ?) ON CONFLICT(id) DO UPDATE SET snapshot = excluded.snapshot', JSON.stringify(state));
      },
      setAlarm: when => ctx.storage.setAlarm(when),
      getAlarm: () => ctx.storage.getAlarm(),
      deleteAlarm: () => ctx.storage.deleteAlarm(),
      environmentEnabled: env.HEARTBEAT_ENABLED === 'true',
      readControl: async () => {
        const control = await repositoryJson('control.json');
        if (typeof control.enabled !== 'boolean') throw new Error('Invalid owner control');
        const result = { enabled: control.enabled && control.cloud_heartbeat_enabled !== false };
        // A checkpoint-read failure does not hide a valid owner stop instruction.
        if (result.enabled) {
          try { result.generation = (await repositoryJson('state/current.json')).generation; }
          catch { /* Heartbeat status remains distinct from experiment progress. */ }
        }
        return result;
      },
    });
  }

  async alarm() { await this.runtime.alarm(); }
  async reconcile() { return this.runtime.reconcile(); }
  async snapshot() { return this.runtime.snapshot(); }

  // These routes are reachable only through the bound Durable Object stub.
  // The public Worker deliberately exposes no mutation/start/pause route.
  async fetch(request) {
    if (request.method === 'POST' && new URL(request.url).pathname === '/reconcile') {
      return json(await this.reconcile());
    }
    if (request.method === 'GET') return json(await this.snapshot());
    return json({ error: 'not-found' }, 404);
  }
}

const singleton = env => env.HEARTBEAT.get(env.HEARTBEAT.idFromName('seed-agent-lab-one-heartbeat'));

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(singleton(env).reconcile());
  },
  async fetch(request, env) {
    const path = new URL(request.url).pathname;
    if (request.method !== 'GET' || !['/', '/health', '/evidence'].includes(path)) {
      return json({ error: 'not-found' }, 404);
    }
    const snapshot = await singleton(env).snapshot();
    return json(snapshot, path === '/health' && !snapshot.healthy ? 503 : 200);
  },
};
