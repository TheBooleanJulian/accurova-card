// node --test   worker.js with a fake tagged-template SQL client (env.SQL, as thebooleanjulian-bot-core/db allows).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import worker, { getStats, statsPage } from './worker.js';

function fakeSql(events) {
  const calls = [];
  const sql = async (strings, ...values) => {
    const text = strings.join('?');
    calls.push({ text, values });
    if (text.startsWith('insert')) { events.push({ event: values[0], age: 0 }); return []; }
    if (text.startsWith('select 1')) return [{ '?column?': 1 }];
    const days = text.includes('interval') ? parseInt(values[0], 10) : Infinity;
    const counts = {};
    for (const e of events) if (e.age < days) counts[e.event] = (counts[e.event] || 0) + 1;
    return Object.entries(counts).map(([event, n]) => ({ event, n }));
  };
  sql.calls = calls;
  return sql;
}

const ENV = (events = []) => ({
  SQL: fakeSql(events),
  STATS_USERNAME: 'julian',
  STATS_PASSWORD: 's3cret',
  ASSETS: { fetch: async () => new Response('card') }
});
const call = (env, path, init) => worker.fetch(new Request('https://card.accurova.com' + path, init), env, { waitUntil() {} });
const basic = (u, p) => ({ Authorization: 'Basic ' + btoa(`${u}:${p}`) });

test('track records allowed events only', async () => {
  const events = [];
  const env = ENV(events);
  const ok = await call(env, '/api/track', { method: 'POST', body: '{"event":"whatsapp_click"}' });
  assert.deepEqual(await ok.json(), { ok: true });
  assert.equal(ok.headers.get('Cache-Control'), 'no-store, no-cache, must-revalidate');
  assert.deepEqual(events.map((e) => e.event), ['whatsapp_click']);
  const bad = await call(env, '/api/track', { method: 'POST', body: '{"event":"drop table"}' });
  assert.equal(bad.status, 400);
  assert.deepEqual(await bad.json(), { detail: 'Unknown event' });
  assert.equal(events.length, 1);
});

test('stats needs Basic Auth and has no default credentials', async () => {
  const env = ENV();
  const res = await call(env, '/stats');
  assert.equal(res.status, 401);
  assert.equal(res.headers.get('WWW-Authenticate'), 'Basic');
  assert.equal((await call(env, '/stats', { headers: basic('julian', 'nope') })).status, 401);
  const noCreds = { ...env, STATS_USERNAME: undefined, STATS_PASSWORD: undefined };
  assert.equal((await call(noCreds, '/stats', { headers: basic('julian', 'changeme') })).status, 401);
});

test('stats page shows the windows and click-through rate', async () => {
  const events = [
    { event: 'pageview', age: 1 }, { event: 'pageview', age: 10 }, { event: 'pageview', age: 40 }, { event: 'pageview', age: 2 },
    { event: 'whatsapp_click', age: 1 }
  ];
  const html = await (await call(ENV(events), '/stats', { headers: basic('julian', 's3cret') })).text();
  assert.match(html, /<tr><td>pageview<\/td><td>4<\/td><td>2<\/td><td>3<\/td><\/tr>/);
  assert.match(html, /<tr><td>whatsapp_click<\/td><td>1<\/td><td>1<\/td><td>1<\/td><\/tr>/);
  assert.match(html, /click-through rate \(all time\): 25\.0%/);
});

test('stats page with no data shows zeros, like the FastAPI version', () => {
  const html = statsPage({ all_time: {}, last_7d: {}, last_30d: {} });
  assert.match(html, /<td>pageview<\/td><td>0<\/td>/);
  assert.match(html, /: 0\.0%/);
});

test('queries are scoped to the accurova_card schema', async () => {
  const sql = fakeSql([]);
  await getStats(sql);
  assert.ok(sql.calls.every((c) => c.text.includes('accurova_card.pageview_events')));
});

test('healthz reports the DB; other paths serve the card', async () => {
  assert.deepEqual(await (await call(ENV(), '/healthz')).json(), { status: 'pass', db: 'ok' });
  assert.equal(await (await call(ENV(), '/')).text(), 'card');
});
