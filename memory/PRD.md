# MSTConnect — Product Requirements

## Overview
MSTConnect is a mobile companion app (Expo React Native) for the Malitbog Sepak Takraw Community (MSTC). It is a lightweight companion, not a replacement for the main MSTC website (https://mstc.pages.dev/). Brand message: **ALWAYS FREE**.

## Audience
Beginners, school athletes, former players, veterans, parents, teachers — anyone in or near Malitbog, Southern Leyte interested in Sepak Takraw.

## Tech Stack
- **Frontend:** Expo (SDK 57), expo-router, React Native 0.86, TanStack Query, @react-native-vector-icons/ionicons, expo-web-browser
- **Backend:** Cloudflare Worker + D1 (SQLite)
- **Auth:** Admin-only mutations gated by a Worker `ADMIN_TOKEN` secret sent in the `X-Admin-Token` header. No user-facing login.

## Navigation (4 bottom tabs, max 4 per guidelines)
1. **Home** — Next MSTC event countdown card + latest announcement + quick actions
2. **News** — Announcements feed (newest first)
3. **Tools** — 2×2 grid: Training Timer, Warm-Up Guide, Score Counter, Rules & Court
4. **More** — Notifications, Enquiry, MSTC Website, About

Notifications bell with unread badge is in the Home header for quick access.

## Core Screens
### Home
- Hero card "NEXT MSTC EVENT" with 4 states: `counting` (DD:HH:MM:SS), `live` ("Event in Progress"), `tbd` ("Date & time to be announced"), `none` ("No upcoming event yet")
- Status pill (LIVE / UPCOMING / NONE)
- Event meta (date / time / location) — all default to "TBD" when unknown
- Latest announcement card linking to News
- Quick actions grid

### News (Announcements)
- Server-sorted newest first
- Category tag (EVENT / RECRUITMENT / TRAINING / COMMUNITY) + optional PINNED badge
- Pull-to-refresh

### Notifications (stack route `/notifications`)
- In-app history, unread rows highlighted with yellow left bar
- Mark single read on tap, "Mark all read" button
- Empty state illustration

### Enquiry (stack route `/enquiry`)
- Posts to existing Formspree endpoint `https://formspree.io/f/xgavddoo` (JSON POST)
- Fields: name, email, subject (optional), message
- Success & error alerts
- Sticky Submit Enquiry button; KeyboardAvoidingView

### MSTC Website (stack route `/website`)
- Opens `https://mstc.pages.dev/` via expo-web-browser auto on mount + manual CTA

### About (stack route `/about`)
- Mission + who-can-join + community principles

### Rules & Court accuracy
- Court diagram and quick-reference copy were checked against the ISTAF *Law of the Game 2024 (Regu)*.
- The diagram shows the 13.4 m × 6.1 m landscape court, a centre line, 0.3 m-radius service circles, and 0.9 m-radius quarter circles in their official positions.
- The score summary reflects current ISTAF 15-point sets, with 14–14 set up to 17 points.

### Warm-Up Guide
- An 18-step progressive routine begins with gentle heat-building, then follows a head-to-toe sequence through shoulders, trunk, hips, legs, feet, and sepak-takraw-specific preparation.
- Every unilateral exercise is split into a distinct right-side or left-side step. The active movement uses a clear icon, side cue, and safety-focused directions.

## Tools
- **Training Timer** — work/rest intervals, 3 presets, play/pause/reset, round counter
- **Warm-Up Guide** — 18-step head-to-toe routine with distinct right/left movements, per-step timer, prev/next, and side cues
- **Score Counter** — two large tap-to-score panels, decrement, rename, reset
- **Rules & Court** — court diagram, scoring, serving, fouls

## Cloudflare API
- `GET /api/announcements`
- `POST /api/announcements` (admin)
- `DELETE /api/announcements/{id}` (admin)
- `GET /api/events`
- `GET /api/events/next` — picks earliest upcoming / in-progress event, honors `starts_at + duration_minutes`
- `POST /api/events` (admin)
- `PUT /api/events/{id}` (admin)
- `DELETE /api/events/{id}` (admin)
- `GET /api/notifications`
- `POST /api/notifications` (admin)
- `POST /api/notifications/{id}/read`
- `POST /api/notifications/read-all`

The Worker preserves the existing `/api` contract and is deployed at `https://mstconnect-api.thereal-jnjnbnd.workers.dev`. A migration imported the existing MongoDB records plus approved published announcements from `mstc-db` into the dedicated `MSTConnect` D1 database. The verified migrated state is 9 announcements, 1 event, and 1 Welcome notification.

## Content Safety
No MSTC members, coaches, statistics, or achievements are invented. MSTC is described as "currently recruiting" per the public site, and the free/no-fee identity is preserved throughout the UI.

## Deferred vs Problem Statement
- Push notifications (VAPID / Web Push) are **not** applicable in native Expo and were skipped per user choice. In-app Notifications tab provides history.
- The Expo app remains native-first; its API is now a Cloudflare Worker backed by D1, with the established `/api` routes retained for compatibility.

## Admin Credentials
The shared admin token is stored as the Cloudflare Worker `ADMIN_TOKEN` secret. The legacy FastAPI environment is retained only as a local migration reference.
