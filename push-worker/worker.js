// mstc-push — free push notifications for the MSTConnect app.
//
// A tiny, separate Cloudflare Worker. It never changes the live mstc-platform Worker:
// it only READS the announcements / events tables of the same D1 database (mstc-db)
// and keeps its own bookkeeping in three small push_* tables (created automatically).
//
//   - POST /register   the app sends its device token; we subscribe it to one FCM topic
//   - cron (every 5 min) new published announcement / new event / "starts in 1 hour" reminder
//                      -> ONE message to the topic -> every installed app gets it
//   - GET|POST /test   (needs ADMIN_KEY) sends a test notification
//
// Needs: D1 binding  DB            (the mstc-db database)
//        Secret      FCM_SERVICE_ACCOUNT   (Firebase service-account JSON, whole file)
//        Secret      ADMIN_KEY             (any long random string, for /test)
//        Variable    SITE_URL      (optional, default below)

const TOPIC = "mstc-all";
const CHANNEL = "mstc";
const DEFAULT_SITE = "https://mstc-platform.thereal-jnjnbnd.workers.dev";
const MAX_SENDS_PER_RUN = 8;

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    try {
      if (url.pathname === "/register" && req.method === "POST") return await register(req, env);
      if (url.pathname === "/test") return await test(req, env, url);
      if (url.pathname === "/") return json({ ok: true, service: "mstc-push" });
      return json({ ok: false, error: "not found" }, 404);
    } catch (e) {
      return json({ ok: false, error: String((e && e.message) || e) }, 500);
    }
  },

  async scheduled(_event, env, ctx) {
    ctx.waitUntil(
      runCron(env).catch((e) => console.error("cron failed:", (e && e.message) || e)),
    );
  },
};

// ---------------------------------------------------------------- HTTP handlers

async function register(req, env) {
  const body = await req.json().catch(() => null);
  const token = body && typeof body.token === "string" ? body.token.trim() : "";
  if (!/^[A-Za-z0-9_:.\-]{50,4096}$/.test(token)) return json({ ok: false, error: "bad token" }, 400);

  const access = await accessToken(env);
  const r = await fetch("https://iid.googleapis.com/iid/v1:batchAdd", {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, access_token_auth: "true", "Content-Type": "application/json" },
    body: JSON.stringify({ to: `/topics/${TOPIC}`, registration_tokens: [token] }),
  });
  const data = await r.json().catch(() => ({}));
  const err = data && data.results && data.results[0] && data.results[0].error;
  if (!r.ok || err) return json({ ok: false, error: err || `iid ${r.status}` }, 502);
  return json({ ok: true });
}

async function test(req, env, url) {
  const key = req.headers.get("x-admin-key") || url.searchParams.get("key") || "";
  if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return json({ ok: false, error: "forbidden" }, 403);
  await sendTopic(env, {
    title: "MSTConnect test",
    body: "Push notifications are working.",
    data: { kind: "test" },
  });
  return json({ ok: true, sent: "test" });
}

// ---------------------------------------------------------------- the schedule

let tablesReady = false;
async function ensureTables(env) {
  if (tablesReady) return;
  await env.DB.batch([
    env.DB.prepare("CREATE TABLE IF NOT EXISTS push_sent (kind TEXT NOT NULL, ref_id INTEGER NOT NULL, sent_at TEXT NOT NULL, PRIMARY KEY (kind, ref_id))"),
    env.DB.prepare("CREATE TABLE IF NOT EXISTS push_state (key TEXT PRIMARY KEY, value TEXT NOT NULL)"),
  ]);
  tablesReady = true;
}

async function runCron(env) {
  await ensureTables(env);
  const nowMs = Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const site = (env.SITE_URL || DEFAULT_SITE).replace(/\/$/, "");

  // First run ever: remember everything that already exists so old posts are not announced again.
  if (!(await getState(env, "initialized"))) {
    await env.DB.batch([
      env.DB.prepare("INSERT OR IGNORE INTO push_sent (kind, ref_id, sent_at) SELECT 'announcement', id, ? FROM announcements WHERE status = 'published'").bind(nowIso),
      env.DB.prepare("INSERT OR IGNORE INTO push_sent (kind, ref_id, sent_at) SELECT 'event', id, ? FROM events").bind(nowIso),
      env.DB.prepare("INSERT OR REPLACE INTO push_state (key, value) VALUES ('initialized', ?)").bind(nowIso),
    ]);
    return;
  }

  let sends = 0;
  const mark = (kind, id) =>
    env.DB.prepare("INSERT OR IGNORE INTO push_sent (kind, ref_id, sent_at) VALUES (?, ?, ?)").bind(kind, id, nowIso).run();

  // 1) new announcements
  const anns = (
    await env.DB.prepare(
      "SELECT id, slug, title, scheduled_at FROM announcements WHERE status = 'published' AND id NOT IN (SELECT ref_id FROM push_sent WHERE kind = 'announcement') ORDER BY id ASC LIMIT 10",
    ).all()
  ).results;
  for (const a of anns) {
    if (a.scheduled_at) {
      const t = Date.parse(a.scheduled_at);
      if (!Number.isNaN(t) && t > nowMs) continue; // scheduled for later: visible (and announced) then
    }
    if (sends >= MAX_SENDS_PER_RUN) break;
    await sendTopic(env, {
      title: "MSTC announcement",
      body: a.title,
      data: { kind: "announcement", id: String(a.id), url: `${site}/announcements/${a.slug}`, title: a.title },
    });
    await mark("announcement", a.id);
    sends++;
  }

  // 2) new events
  const events = (
    await env.DB.prepare(
      "SELECT id, title, event_date, start_time, end_date, location FROM events WHERE status = 'published' AND id NOT IN (SELECT ref_id FROM push_sent WHERE kind = 'event') ORDER BY id ASC LIMIT 10",
    ).all()
  ).results;
  for (const e of events) {
    const last = Date.parse(`${e.end_date || e.event_date}T23:59:59+08:00`);
    if (!Number.isNaN(last) && last < nowMs) {
      await mark("event", e.id); // already over: record it, don't announce it
      continue;
    }
    if (sends >= MAX_SENDS_PER_RUN) break;
    await sendTopic(env, {
      title: `New event: ${e.title}`,
      body: eventLine(e),
      data: { kind: "event", id: String(e.id), title: e.title },
    });
    await mark("event", e.id);
    sends++;
  }

  // 3) "starts in 1 hour" reminders
  const today = phDate(nowMs);
  const soon = phDate(nowMs + 61 * 60000);
  const upcoming = (
    await env.DB.prepare(
      "SELECT id, title, event_date, start_time, location FROM events WHERE status = 'published' AND start_time != '' AND event_date >= ? AND event_date <= ? AND id NOT IN (SELECT ref_id FROM push_sent WHERE kind = 'reminder') ORDER BY event_date ASC, start_time ASC LIMIT 10",
    )
      .bind(today, soon)
      .all()
  ).results;
  for (const e of upcoming) {
    const start = Date.parse(`${e.event_date}T${e.start_time}:00+08:00`);
    if (Number.isNaN(start)) continue;
    if (nowMs >= start) {
      await mark("reminder", e.id); // missed the window; don't keep checking it
      continue;
    }
    if (nowMs >= start - 60 * 60000) {
      if (sends >= MAX_SENDS_PER_RUN) break;
      await sendTopic(env, {
        title: `Starts in 1 hour: ${e.title}`,
        body: eventLine(e),
        data: { kind: "reminder", id: String(e.id), title: e.title },
      });
      await mark("reminder", e.id);
      sends++;
    }
  }
}

// ---------------------------------------------------------------- Firebase Cloud Messaging

async function sendTopic(env, msg) {
  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const access = await accessToken(env);
  const r = await fetch(`https://fcm.googleapis.com/v1/projects/${sa.project_id}/messages:send`, {
    method: "POST",
    headers: { Authorization: `Bearer ${access}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      message: {
        topic: TOPIC,
        notification: { title: msg.title, body: msg.body },
        data: msg.data || {},
        android: { priority: "HIGH", notification: { channel_id: CHANNEL } },
      },
    }),
  });
  if (!r.ok) throw new Error(`fcm ${r.status}: ${(await r.text()).slice(0, 300)}`);
}

// Google OAuth token from the service account. Cached in D1 for ~1 hour so the
// (comparatively heavy) RSA signing happens only about once an hour.
async function accessToken(env) {
  await ensureTables(env);
  const cached = await getState(env, "fcm_token");
  if (cached) {
    try {
      const c = JSON.parse(cached);
      if (c.exp > Date.now() + 120000) return c.t;
    } catch (_) {}
  }
  const sa = JSON.parse(env.FCM_SERVICE_ACCOUNT);
  const aud = sa.token_uri || "https://oauth2.googleapis.com/token";
  const iat = Math.floor(Date.now() / 1000);
  const claim = {
    iss: sa.client_email,
    scope: "https://www.googleapis.com/auth/firebase.messaging https://www.googleapis.com/auth/cloud-platform",
    aud,
    iat,
    exp: iat + 3600,
  };
  const input = `${b64uText(JSON.stringify({ alg: "RS256", typ: "JWT" }))}.${b64uText(JSON.stringify(claim))}`;
  const key = await crypto.subtle.importKey(
    "pkcs8",
    pemToDer(sa.private_key),
    { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", key, new TextEncoder().encode(input));
  const jwt = `${input}.${b64uBytes(new Uint8Array(sig))}`;

  const r = await fetch(aud, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion: jwt }),
  });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.access_token) throw new Error(`google auth failed: ${d.error_description || d.error || r.status}`);
  await setState(env, "fcm_token", JSON.stringify({ t: d.access_token, exp: Date.now() + (d.expires_in || 3600) * 1000 }));
  return d.access_token;
}

// ---------------------------------------------------------------- helpers

async function getState(env, key) {
  const row = await env.DB.prepare("SELECT value FROM push_state WHERE key = ?").bind(key).first();
  return row ? row.value : null;
}
function setState(env, key, value) {
  return env.DB.prepare("INSERT OR REPLACE INTO push_state (key, value) VALUES (?, ?)").bind(key, value).run();
}

function json(data, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "Content-Type": "application/json" } });
}

function b64uText(s) {
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function b64uBytes(bytes) {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function pemToDer(pem) {
  const raw = atob(pem.replace(/-----[A-Z ]+-----/g, "").replace(/\s+/g, ""));
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out.buffer;
}

// Philippine time (UTC+8) date as YYYY-MM-DD
function phDate(ms) {
  return new Date(ms + 8 * 3600000).toISOString().slice(0, 10);
}
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
function prettyDate(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || "");
  return m ? `${MONTHS[Number(m[2]) - 1]} ${Number(m[3])}, ${m[1]}` : "";
}
function prettyClock(hhmm) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(hhmm || "");
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h >= 12 ? "PM" : "AM"}`;
}
function eventLine(e) {
  return [prettyDate(e.event_date), prettyClock(e.start_time), e.location].filter(Boolean).join(" · ");
}
