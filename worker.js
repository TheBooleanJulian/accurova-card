// Accurova Card on Cloudflare Workers (port of app/main.py, FastAPI + Postgres).
//   POST /api/track   {"event": "pageview" | "whatsapp_click"}  → {"ok": true}
//   GET  /stats       Basic Auth (STATS_USERNAME / STATS_PASSWORD) → HTML counts: all time, 7 d, 30 d
//   GET  /healthz     DB check
//   everything else   public/ (static assets; public/_headers sets no-store like the old middleware)
//
// Data: schema accurova_card in the shared Supabase project (thebooleanjulian-db), reached through the Hyperdrive
// config "accurova-card-db" as role accurova_card_app (insert + select only).
// Secrets: STATS_USERNAME, STATS_PASSWORD. Unlike app/config.py there are no default credentials: unset = /stats locked.
import { withDb, dbCheck } from 'thebooleanjulian-bot-core/db';

const ALLOWED_EVENTS = new Set(['pageview', 'whatsapp_click']);
const NO_STORE = { 'Cache-Control': 'no-store, no-cache, must-revalidate' };

const json = (body, status = 200, headers = {}) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...NO_STORE, ...headers } });

function timingSafeEqual(a, b) {
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let diff = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) diff |= (x[i] || 0) ^ (y[i] || 0);
  return diff === 0;
}

export function statsAuthorized(request, env) {
  if (!env.STATS_USERNAME || !env.STATS_PASSWORD) return false;
  const auth = request.headers.get('Authorization') || '';
  if (!auth.startsWith('Basic ')) return false;
  let decoded;
  try { decoded = atob(auth.slice(6)); } catch { return false; }
  const i = decoded.indexOf(':');
  if (i === -1) return false;
  const userOk = timingSafeEqual(decoded.slice(0, i), env.STATS_USERNAME);
  const passOk = timingSafeEqual(decoded.slice(i + 1), env.STATS_PASSWORD);
  return userOk && passOk;
}

export async function getStats(sql) {
  const windows = { all_time: null, last_7d: '7 days', last_30d: '30 days' };
  const result = {};
  for (const [key, interval] of Object.entries(windows)) {
    const rows = interval === null
      ? await sql`select event, count(*)::int as n from accurova_card.pageview_events group by event`
      : await sql`select event, count(*)::int as n from accurova_card.pageview_events where created_at > now() - ${interval}::interval group by event`;
    result[key] = Object.fromEntries(rows.map((r) => [r.event, Number(r.n)]));
  }
  return result;
}

export function statsPage(data) {
  const row = (label) =>
    `<tr><td>${label}</td><td>${data.all_time[label] || 0}</td><td>${data.last_7d[label] || 0}</td><td>${data.last_30d[label] || 0}</td></tr>`;
  const pageviews = data.all_time.pageview || 0;
  const clicks = data.all_time.whatsapp_click || 0;
  const ctr = pageviews ? (clicks / pageviews) * 100 : 0;
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<title>accurova-card stats</title>
<style>
body { font-family: -apple-system, sans-serif; max-width: 560px; margin: 40px auto; padding: 0 16px; color: #0b0d12; }
table { width: 100%; border-collapse: collapse; margin: 16px 0; }
th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; }
h1 { font-size: 18px; }
.ctr { font-size: 13px; color: #4b5563; }
</style>
</head>
<body>
<h1>card.accurova.com — stats</h1>
<table>
<tr><th>Event</th><th>All time</th><th>Last 7d</th><th>Last 30d</th></tr>
${row('pageview')}
${row('whatsapp_click')}
</table>
<p class="ctr">WhatsApp click-through rate (all time): ${ctr.toFixed(1)}%</p>
</body>
</html>`;
}

export default {
  async fetch(request, env, ctx) {
    const { pathname } = new URL(request.url);

    if (pathname === '/api/track' && request.method === 'POST') {
      const payload = await request.json().catch(() => null);
      const event = payload && payload.event;
      if (!ALLOWED_EVENTS.has(event)) return json({ detail: 'Unknown event' }, 400);
      await withDb(env, ctx, (sql) => sql`insert into accurova_card.pageview_events (event) values (${event})`);
      return json({ ok: true });
    }

    if (pathname === '/stats' && request.method === 'GET') {
      if (!statsAuthorized(request, env)) return json({ detail: 'Unauthorized' }, 401, { 'WWW-Authenticate': 'Basic' });
      const data = await withDb(env, ctx, getStats);
      return new Response(statsPage(data), { headers: { 'Content-Type': 'text/html; charset=utf-8', ...NO_STORE } });
    }

    if (pathname === '/healthz') {
      const db = await dbCheck(env, ctx);
      return json({ status: db === 'ok' ? 'pass' : 'fail', db }, db === 'ok' ? 200 : 503);
    }

    if (pathname.startsWith('/api/')) return json({ detail: 'Not Found' }, 404);
    return env.ASSETS.fetch(request);
  }
};
