import { DurableObject } from 'cloudflare:workers';
import { HeartbeatRuntime } from './core.mjs';
import { WorkspaceStore, workspaceApi } from './api.mjs';

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
    this.workspace = new WorkspaceStore(ctx, env);
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
        const result = { enabled: control.enabled && control.cloud_heartbeat_enabled !== false && !this.workspace.isPaused() };
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

  async workspaceStatus() {
    const snapshot = await this.snapshot();
    const { recent_ticks_ms, runtime_diagnostics, ...summary } = snapshot;
    return { ...summary, workspace_paused: this.workspace.isPaused(), experiment_url: 'https://github.com/air158/seed-agent-lab/actions/workflows/evolve.yml' };
  }

  async report() {
    const response = await fetch(`${REPOSITORY}REPORT.md`, { signal: AbortSignal.timeout(8000), headers: { Accept: 'text/plain' }, redirect: 'manual' });
    if (!response.ok) throw new Error('Report unavailable');
    const report = await response.text();
    if (report.length > 50000) throw new Error('Report too large');
    return { report, source: 'https://github.com/air158/seed-agent-lab/blob/main/REPORT.md', fetched_at: new Date().toISOString() };
  }

  // The Worker forwards private API routes; workspaceApi authenticates every
  // operation. Reconcile remains reachable only through the bound stub.
  async fetch(request) {
    if (new URL(request.url).pathname.startsWith('/api/')) return workspaceApi(request, this.workspace, {
      status: () => this.workspaceStatus(), report: () => this.report(),
      control: async action => {
        this.workspace.setMeta('heartbeat_paused', action === 'pause');
        if (action === 'pause') await this.runtime.pause('paused-from-workspace');
        else await this.runtime.reconcile();
        return this.workspaceStatus();
      },
    });
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
    if (path.startsWith('/api/')) return singleton(env).fetch(request);
    if (env.ASSETS && request.method === 'GET' && !['/health', '/evidence'].includes(path)) {
      const asset = await env.ASSETS.fetch(request);
      const response = new Response(asset.body, asset);
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('Referrer-Policy', 'no-referrer');
      response.headers.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; font-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
      response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
      return response;
    }
    if (request.method !== 'GET' || !['/', '/health', '/evidence'].includes(path)) {
      return json({ error: 'not-found' }, 404);
    }
    const snapshot = await singleton(env).snapshot();
    return json(snapshot, path === '/health' && !snapshot.healthy ? 503 : 200);
  },
};
