/* =====================================================================
   DEEPBYTO Analytics Backend (password-free version)
   Environment variables required:
     GOOGLE_SERVICE_ACCOUNT_JSON – full service account JSON
     GA4_PROPERTY_ID             – 545458430
     ALLOWED_ORIGINS             – https://deepbyto.github.io
   ===================================================================== */

'use strict';

const express = require('express');
const cors = require('cors');
const { BetaAnalyticsDataClient } = require('@google-analytics/data');

const PORT = process.env.PORT || 8080;
const GA4_PROPERTY_ID = String(process.env.GA4_PROPERTY_ID || '').trim();
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || 'https://deepbyto.github.io')
  .split(',').map(s => s.trim()).filter(Boolean);

let credentials = null;
try {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON || '';
  if (raw) credentials = JSON.parse(raw.replace(/\\n/g, '\n'));
} catch (e) {
  console.error('FATAL: GOOGLE_SERVICE_ACCOUNT_JSON invalid JSON:', e.message);
  process.exit(1);
}
if (!credentials) { console.error('FATAL: GOOGLE_SERVICE_ACCOUNT_JSON missing.'); process.exit(1); }
if (!GA4_PROPERTY_ID) { console.error('FATAL: GA4_PROPERTY_ID missing.'); process.exit(1); }

const analyticsClient = new BetaAnalyticsDataClient({ credentials });
const propertyPath = `properties/${GA4_PROPERTY_ID}`;

const app = express();
app.disable('x-powered-by');

app.use(cors({
  origin: (origin, cb) => {
    if (!origin || ALLOWED_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error('CORS: origin not allowed: ' + origin));
  },
  methods: ['GET','OPTIONS'],
  allowedHeaders: ['Content-Type'],
  maxAge: 86400
}));

const cache = new Map();
const TTL = 5 * 60 * 1000;
const cGet = k => { const h = cache.get(k); if (!h) return null; if (Date.now() > h.e) { cache.delete(k); return null; } return h.v; };
const cSet = (k, v) => cache.set(k, { v, e: Date.now() + TTL });

const ISO = /^\d{4}-\d{2}-\d{2}$/;
function validateDates(req, res) {
  const start = String(req.query.start || '').trim();
  const end = String(req.query.end || '').trim();
  if (!ISO.test(start) || !ISO.test(end)) { res.status(400).json({ error: 'start/end must be YYYY-MM-DD' }); return null; }
  const s = new Date(start + 'T00:00:00Z'), e = new Date(end + 'T00:00:00Z');
  if (isNaN(s) || isNaN(e) || s > e) { res.status(400).json({ error: 'Invalid date range' }); return null; }
  if ((e - s) / 86400000 > 400) { res.status(400).json({ error: 'Range too large (max 400 days)' }); return null; }
  return { start, end };
}
function num(m) { if (!m) return null; const n = Number(m.value); return Number.isFinite(n) ? n : null; }
function userErr(err) {
  const code = err && err.code;
  if (code === 7 || /permission|PERMISSION_DENIED/i.test(err.message || '')) return { s: 403, e: 'Permission denied. Service account needs Viewer access to GA4 property ' + GA4_PROPERTY_ID + '.' };
  if (code === 8 || /quota|RESOURCE_EXHAUSTED/i.test(err.message || '')) return { s: 429, e: 'GA4 quota exhausted. Please retry in a few minutes.' };
  if (code === 3 || /invalid|INVALID_ARGUMENT/i.test(err.message || '')) return { s: 400, e: 'Invalid GA4 request: ' + err.message };
  return { s: 500, e: 'GA4 request failed: ' + (err.message || 'unknown') };
}
const h = fn => async (req, res) => {
  try { await fn(req, res); }
  catch (err) { console.error(err.message); const u = userErr(err); res.status(u.s).json({ error: u.e }); }
};

app.get('/', (req, res) => res.json({ status: 'ok', service: 'DEEPBYTO Analytics Backend', propertyId: GA4_PROPERTY_ID, time: new Date().toISOString() }));

app.get('/api/overview', h(async (req, res) => {
  const r = validateDates(req, res); if (!r) return;
  const k = 'ov:' + r.start + ':' + r.end;
  const c = cGet(k); if (c) return res.json(c);
  const [resp] = await analyticsClient.runReport({
    property: propertyPath,
    dateRanges: [{ startDate: r.start, endDate: r.end }],
    metrics: [{ name: 'activeUsers' }, { name: 'totalUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }, { name: 'engagementRate' }, { name: 'averageSessionDuration' }]
  });
  const row = (resp.rows && resp.rows[0]) || null;
  const v = row ? row.metricValues.map(num) : [null,null,null,null,null,null];
  const out = { activeUsers: v[0], totalUsers: v[1], pageViews: v[2], sessions: v[3], engagementRate: v[4], averageEngagementTime: v[5], range: r };
  cSet(k, out); res.json(out);
}));

app.get('/api/timeseries', h(async (req, res) => {
  const r = validateDates(req, res); if (!r) return;
  const k = 'ts:' + r.start + ':' + r.end;
  const c = cGet(k); if (c) return res.json(c);
  const [resp] = await analyticsClient.runReport({
    property: propertyPath,
    dateRanges: [{ startDate: r.start, endDate: r.end }],
    dimensions: [{ name: 'date' }],
    metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }, { name: 'sessions' }],
    orderBys: [{ dimension: { dimensionName: 'date' } }],
    limit: 400
  });
  const rows = (resp.rows || []).map(row => {
    const raw = row.dimensionValues[0].value;
    const iso = raw.slice(0,4) + '-' + raw.slice(4,6) + '-' + raw.slice(6,8);
    const m = row.metricValues.map(num);
    return { date: iso, activeUsers: m[0], pageViews: m[1], sessions: m[2] };
  });
  cSet(k, rows); res.json(rows);
}));

app.get('/api/pages', h(async (req, res) => {
  const r = validateDates(req, res); if (!r) return;
  const k = 'pg:' + r.start + ':' + r.end;
  const c = cGet(k); if (c) return res.json(c);
  const [resp] = await analyticsClient.runReport({
    property: propertyPath,
    dateRanges: [{ startDate: r.start, endDate: r.end }],
    dimensions: [{ name: 'pagePath' }, { name: 'pageTitle' }],
    metrics: [{ name: 'screenPageViews' }, { name: 'activeUsers' }, { name: 'sessions' }, { name: 'userEngagementDuration' }],
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
    limit: 250
  });
  const rows = (resp.rows || []).map(row => {
    const views = num(row.metricValues[0]) || 0;
    const sessions = num(row.metricValues[2]) || 0;
    const eng = num(row.metricValues[3]) || 0;
    return {
      path: row.dimensionValues[0].value || '/',
      title: row.dimensionValues[1].value || '',
      views,
      activeUsers: num(row.metricValues[1]),
      sessions,
      avgEngagementTime: sessions > 0 ? (eng / sessions) : null
    };
  });
  cSet(k, rows); res.json(rows);
}));

app.get('/api/sources', h(async (req, res) => {
  const r = validateDates(req, res); if (!r) return;
  const k = 'sc:' + r.start + ':' + r.end;
  const c = cGet(k); if (c) return res.json(c);
  const [resp] = await analyticsClient.runReport({
    property: propertyPath,
    dateRanges: [{ startDate: r.start, endDate: r.end }],
    dimensions: [{ name: 'sessionSource' }, { name: 'sessionMedium' }],
    metrics: [{ name: 'sessions' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
    limit: 40
  });
  const rows = (resp.rows || []).map(row => ({
    source: row.dimensionValues[0].value || '(direct)',
    medium: row.dimensionValues[1].value || '(none)',
    sessions: num(row.metricValues[0]) || 0,
    users: num(row.metricValues[1]) || 0
  }));
  cSet(k, rows); res.json(rows);
}));

app.get('/api/audience', h(async (req, res) => {
  const r = validateDates(req, res); if (!r) return;
  const k = 'au:' + r.start + ':' + r.end;
  const c = cGet(k); if (c) return res.json(c);
  async function bd(dim, metric, limit) {
    const [resp] = await analyticsClient.runReport({
      property: propertyPath,
      dateRanges: [{ startDate: r.start, endDate: r.end }],
      dimensions: [{ name: dim }],
      metrics: [{ name: metric }],
      orderBys: [{ metric: { metricName: metric }, desc: true }],
      limit: limit || 15
    });
    return (resp.rows || []).map(row => ({ label: row.dimensionValues[0].value || '(not set)', [metric]: num(row.metricValues[0]) || 0 }));
  }
  const [dv, co, br, os, nv] = await Promise.all([
    bd('deviceCategory','sessions',10),
    bd('country','totalUsers',15),
    bd('browser','totalUsers',10),
    bd('operatingSystem','totalUsers',10),
    bd('newVsReturning','totalUsers',5)
  ]);
  const out = {
    devices: dv.map(d => ({ label: d.label, sessions: d.sessions })),
    countries: co.map(c => ({ label: c.label, users: c.totalUsers })),
    browsers: br.map(b => ({ label: b.label, users: b.totalUsers })),
    os: os.map(o => ({ label: o.label, users: o.totalUsers })),
    newVsReturning: nv.map(n => ({ label: n.label === 'new' ? 'New visitors' : n.label === 'returning' ? 'Returning visitors' : n.label, users: n.totalUsers }))
  };
  cSet(k, out); res.json(out);
}));

app.get('/api/events', h(async (req, res) => {
  const r = validateDates(req, res); if (!r) return;
  const k = 'ev:' + r.start + ':' + r.end;
  const c = cGet(k); if (c) return res.json(c);
  const [resp] = await analyticsClient.runReport({
    property: propertyPath,
    dateRanges: [{ startDate: r.start, endDate: r.end }],
    dimensions: [{ name: 'eventName' }],
    metrics: [{ name: 'eventCount' }, { name: 'totalUsers' }],
    orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
    limit: 60
  });
  let keyEvents = new Set();
  try {
    const [kResp] = await analyticsClient.runReport({
      property: propertyPath,
      dateRanges: [{ startDate: r.start, endDate: r.end }],
      dimensions: [{ name: 'eventName' }],
      metrics: [{ name: 'eventCount' }],
      dimensionFilter: { filter: { fieldName: 'isKeyEvent', stringFilter: { value: 'true' } } },
      limit: 60
    });
    (kResp.rows || []).forEach(row => keyEvents.add(row.dimensionValues[0].value));
  } catch (_) {}
  const rows = (resp.rows || []).map(row => ({
    name: row.dimensionValues[0].value,
    count: num(row.metricValues[0]),
    users: num(row.metricValues[1]),
    isKeyEvent: keyEvents.has(row.dimensionValues[0].value)
  }));
  cSet(k, rows); res.json(rows);
}));

app.use((req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, req, res, next) => {
  console.error(err);
  if (res.headersSent) return next(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log('DEEPBYTO analytics backend on port ' + PORT);
  console.log('Allowed origins:', ALLOWED_ORIGINS.join(', '));
  console.log('GA4 property:', GA4_PROPERTY_ID);
});
