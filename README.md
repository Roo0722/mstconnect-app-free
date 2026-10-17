# MSTC Platform — Malitbog Sepak Takraw Community

Official community website for the **Malitbog Sepak Takraw Community (MSTC)**,
Malitbog, Southern Leyte, Philippines.

**Play. Reconnect. Pass It On.**

A small, fast, secure announcement platform designed to run at **$0 cost** on
Cloudflare's free tier:

| Piece | Service | Cost |
|---|---|---|
| Hosting + public pages | Cloudflare Workers (Static Assets) | Free tier |
| Backend / API | Cloudflare Workers | Free tier |
| Database | Cloudflare D1 (SQLite) | Free tier |
| Photo storage | Inside Cloudflare D1 (no R2, no card needed) | Free tier |
| Bot protection (optional) | Cloudflare Turnstile | Free |
| Backups (optional, manual) | Google Drive | Free |

No public registration, no comments, no chat, no real-time features — by design.
The public experience: **VISIT → READ → LEARN → SEE EVENTS → CONNECT**.
The admin experience: **SIGN IN → CREATE → PUBLISH → MANAGE**.

---

## 1. Project structure

```
MSTC-Platform/
├── wrangler.toml            ← Cloudflare config (D1, site URL, chat link, Turnstile key)
├── schema.sql               ← D1 database schema (tables + indexes) for a brand-new database
├── schema-upgrade-*.sql     ← One-time upgrades for databases created before a feature existed (section 4)
├── package.json             ← Only dev dependency: wrangler
├── src/                     ← The Cloudflare Worker (backend + public pages)
│   ├── index.js             ← Entry: routes /api, /media, pages, static assets
│   ├── api.js               ← Admin JSON API (auth, announcements, events, media, users, audit)
│   ├── auth.js              ← Sessions, PBKDF2 hashing, lockout, Turnstile, roles, audit
│   ├── pages.js             ← Server-rendered public pages (SEO/OG) + sitemap + robots
│   └── util.js              ← Escaping, slugify, validation, hashing, Markdown, Philippine-time event helpers
├── public/                  ← Static assets (served as-is)
│   ├── assets/              ← Public site CSS/JS/icons (and watermark.png for photo uploads)
│   └── admin/               ← Admin dashboard (static HTML + admin.js)
├── scripts/
│   └── create-admin.js      ← Creates the first SUPER_ADMIN account (SQL)
└── README.md
```

## 2. Requirements

- [Node.js](https://nodejs.org) 18+ (LTS recommended; **22+** only if you want to run `npm test`)
- A free [Cloudflare](https://dash.cloudflare.com/sign-up) account (only needed for deployment,
  not for local development)
- VS Code (or any editor) — open the `MSTC-Platform` folder via **File → Open Folder…**

## 3. Local development

```bash
cd MSTC-Platform
npm install                              # or: yarn
npm run db:local                         # create local tables from schema.sql
node scripts/create-admin.js admin@mstc.local 'ChangeMe12345' 'MSTC Admin' > admin.sql
npx wrangler d1 execute mstc-db --local --file=admin.sql
rm admin.sql                             # contains a password hash — delete it
npm run dev                              # http://localhost:8787
```

- Public site: http://localhost:8787
- Admin login: http://localhost:8787/admin/login (use the account you just created)

## 4. Deployment to Cloudflare (free)

```bash
npx wrangler login                       # opens browser, free account

# 1. Database
npx wrangler d1 create mstc-db
#   → copy the printed database_id into wrangler.toml (replace the placeholder)
npm run db:remote                        # apply schema to the real database

# 2. Photos are stored inside D1 - nothing to create, no R2, no payment method.
#    A brand-new database needs nothing more: schema.sql already includes every feature.
#    If you created the database with an OLDER schema.sql, run these once, in this order, and
#    ignore a 'duplicate column name' message (it means that step was already applied):
npx wrangler d1 execute mstc-db --remote --file=schema-upgrade-photos-in-d1.sql
npx wrangler d1 execute mstc-db --remote --file=schema-upgrade-pinned.sql
npx wrangler d1 execute mstc-db --remote --file=schema-upgrade-featured-photos.sql
npx wrangler d1 execute mstc-db --remote --file=schema-upgrade-event-end-date.sql

# 3. First admin account (real email + strong password!)
node scripts/create-admin.js you@example.com 'a-long-strong-password' 'Your Name' > admin.sql
npx wrangler d1 execute mstc-db --remote --file=admin.sql
rm admin.sql

# 4. Set your real domain in wrangler.toml → SITE_URL, then:
npm run deploy
```

Your site is live at `https://mstc-platform.<your-subdomain>.workers.dev`.
Add a custom domain later: Cloudflare dashboard → Workers → your worker →
Settings → Domains & Routes (free).

### Turnstile bot protection (admin login)
1. Cloudflare dashboard → **Turnstile → Add widget** → note the **site key** (public) and the **secret key**
   (private, longer). They are different values - the secret is the one that goes in step 3.
2. Put the site key in `wrangler.toml` → `TURNSTILE_SITE_KEY`, and list your real addresses in
   `TURNSTILE_HOSTNAMES` (comma-separated). The server only accepts tokens issued for those hostnames
   and for the `login` action.
3. `npx wrangler secret put TURNSTILE_SECRET` and paste the secret.
4. Redeploy.

If a site key is set but the secret is missing, **every login is refused** (fail closed) - this prevents
a half-configured setup from silently skipping the check. To switch Turnstile off completely, clear both
values. Preview addresses from `wrangler versions upload` are not in `TURNSTILE_HOSTNAMES`, so you cannot
log in on them (by design); for local development see `.dev.vars.example`.

## 5. Environment variables / config

| Name | Where | Purpose |
|---|---|---|
| `SITE_URL` | `wrangler.toml` [vars] | Canonical URLs + social-share metadata. Empty = use the serving domain |
| `MESSENGER_URL` | `wrangler.toml` [vars] | Community chat link used by the Join buttons (must be `https://`) |
| `CONTACT_EMAIL` / `CONTACT_PHONE` | `wrangler.toml` [vars] | Contact details shown on the Contact page (phone may be empty) |
| `TURNSTILE_SITE_KEY` | `wrangler.toml` [vars] | Public Turnstile key. Setting it shows the widget and makes verification mandatory |
| `TURNSTILE_HOSTNAMES` | `wrangler.toml` [vars] | Comma-separated hostnames allowed to issue login tokens |
| `TURNSTILE_SECRET` | `wrangler secret` | Private Turnstile key. Required whenever a site key is set |
| Local secrets | `.dev.vars` (copy from `.dev.vars.example`) | Local-only overrides, gitignored |

## 6. Using the admin

- Login: `/admin/login` · Dashboard: `/admin`
- **Dashboard**: counts, recent announcements, recent activity
- **Announcements**: drafts / publish / archive / delete, categories, featured image,
  optional scheduled date. Written in **Markdown** (toolbar, live Preview and a help sheet in the
  editor). Admins can **pin** an announcement to the top of the site. Public clean URLs:
  `/announcements/your-title`
- **Events**: start date and time, optional finish date and time, location, status
  (draft/published/cancelled), optional pin. All times are **Philippine time (UTC+8)**. An event
  moves to "Past events" by itself the minute its finish passes and shows "Happening now" while it
  runs. No finish date = ends on the start date; no finish time = runs to the end of its last day.
- **Photos**: upload (auto-resized in the browser to save storage), captions, alt text.
  Each photo has two switches: **Show in gallery** and **Show on home page** (the home page shows the
  chosen photos, or the newest six if none are chosen). An optional **MSTC watermark** (small / medium /
  large, lower-right corner) can be stamped on upload; it is permanent, off by default, and meant only
  for originals. Deletion is blocked while an announcement/event uses the image.
- **Administrators** (Super Admin only): add accounts, change roles, deactivate,
  reset passwords (old sessions are signed out automatically).
- **Activity**: audit log of logins, publishes, uploads, account changes.

### Roles
| Role | Can do |
|---|---|
| SUPER_ADMIN | Everything, including managing administrator accounts |
| ADMIN | All announcements, events, photos, activity log |
| EDITOR | Create/edit/publish/archive **their own** announcements; can pick existing photos as featured images (read-only). Cannot delete, or use Events/Photos/Administrators/Activity |

## 7. Backups

**Database** (run occasionally, keep the file somewhere safe):
```bash
npx wrangler d1 export mstc-db --remote --output mstc-backup.sql
```

**Photos** are inside the database export above, so one backup file covers everything.
Keep your original photos in the optional Google Drive archive as well.

**Optional Google Drive archive** (manual, not required for the site to work):
administrators may keep originals and documents in a human-managed Drive folder:

```
MSTC Archive/
├── 2026/
│   ├── Announcements/
│   ├── Events/
│   ├── Training/
│   └── Photos/
├── 2027/
└── Documents/
```

The website never talks to Google Drive; if Drive is unavailable, nothing breaks.

## 8. Security notes

- Passwords: PBKDF2-SHA256, 100,000 iterations, per-user salt. Never plaintext.
- Sessions: random 256-bit tokens; only the SHA-256 hash is stored.
  Cookies are `HttpOnly`, `SameSite=Lax`, and `Secure` on HTTPS. 7-day expiry.
- Login lockout: 5 failed attempts per email within 15 minutes → temporary lock.
- Every admin API checks the session + role server-side. Mutations require a custom
  header (`X-MSTC-Request`) as CSRF protection.
- Uploads: type + magic-byte validation, 3 MB limit, JPG/PNG/WebP/GIF only (SVG rejected). Served with `nosniff` and a locked-down CSP.
- Request bodies are size-capped (200 KB JSON) before parsing.
- Login: per-email lockout (5 fails / 15 min) **and** per-IP throttle (20 fails / 15 min); constant-time-ish response for unknown emails; expired sessions and old attempts are pruned automatically.
- Security headers on public pages (CSP, HSTS, frame-ancestors none) and on `/admin/*` via `public/_headers`. API responses are `no-store`.
- All public page output is HTML-escaped; announcement content is plain text only.
- Turnstile (optional) adds bot protection to the login form.

## 9. Free-tier notes

- Public pages are cached for 60 s (`Cache-Control`), so a traffic spike does not multiply D1 reads.
  Photos are cached for a year (`immutable`; every upload gets a unique key).
- Photos are resized in the admin's browser (max 1600 px, JPEG, under ~900 KB) before upload, so only one
  small copy is stored inside D1. The server rejects images over 1.2 MB (D1 allows 2 MB per row). The gallery uses that single copy with `loading="lazy"`.
- Worker requests: 100,000/day free. D1: 5 M rows read/day, 100 k rows written/day. Photos live in D1 (free storage limit applies; ~0.5 MB per photo means hundreds of photos fit).
  A community site of this kind sits far below all of these. Check current limits at
  <https://developers.cloudflare.com/workers/platform/limits/>.
- **Workers vs Pages:** this project deploys as one Worker with Static Assets (Cloudflare's current
  recommended path for full-stack apps, still free). It uses the free D1 and Turnstile only.

## 10. Tests

```bash
npm test        # Node 22+, no install needed
```

Runs the real Worker code against an in-memory SQLite (D1 shim): public pages, SEO tags,
login/lockout, cookies, CSRF, role checks on every admin API, draft/scheduled/archived visibility,
XSS escaping, upload validation, path traversal, audit log. It complements — not replaces — a
manual smoke test on your real deployment (see checklist below).

**Post-deploy smoke test (5 minutes):** open `/`, log in at `/admin/login`, create a draft, publish it,
upload a photo, set it as featured image, create an event, open the public announcement and paste its
URL into the [Facebook Sharing Debugger](https://developers.facebook.com/tools/debug/) to confirm the preview.

## 11. Honest-content policy

MSTC is new and recruiting. The platform ships with **no fake content** — no
invented members, coaches, events, statistics, or testimonials. Everything the
public sees is either fixed community copy or real content entered by an
administrator. Keep it that way.
