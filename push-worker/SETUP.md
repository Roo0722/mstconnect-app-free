# Free push notifications for MSTConnect

Everything here is free: Firebase Cloud Messaging has no sending limit, and the Worker fits Cloudflare's free plan.
You do **not** touch the live `mstc-platform` Worker. A small separate Worker called `mstc-push` reads the same
database and sends the notifications.

**What members get**

| When | Notification |
|---|---|
| A new announcement is published (or its scheduled time arrives) | **MSTC announcement** — the title |
| A new event is published | **New event: …** — date, time, location |
| 1 hour before an event starts | **Starts in 1 hour: …** |

Tapping a notification opens that post or event inside the app. Checks run every 5 minutes, so alerts arrive within about 5 minutes of publishing (the 1-hour reminder lands 55–60 minutes before the start). This keeps usage tiny on Cloudflare's free plan.
Posts that already exist when you switch this on are **not** announced again.

---

## Part 1 — Firebase (about 10 minutes)

1. Go to <https://console.firebase.google.com> and sign in with a Google account.
2. **Create a project** (name it `mstconnect`). You can turn Google Analytics **off**.
3. On the project home page click the **Android** icon (**Add app**).
   - **Android package name:** `com.mstc.mstconnect` (must be exactly this)
   - Click **Register app**, then **Download google-services.json**. Keep this file. You can click through the remaining steps.
4. Click the gear icon → **Project settings** → **Service accounts** tab → **Generate new private key** → **Generate key**.
   A `.json` file downloads. Keep it private. It is the Worker's password to Firebase.

> Never upload either file to GitHub or paste them in chat. Treat them like passwords.

## Part 2 — Cloudflare Worker (about 10 minutes)

1. Cloudflare dashboard → **Workers & Pages** → **Create** → **Create Worker**.
2. Name it exactly **`mstc-push`** and click **Deploy**.
3. Click **Edit code**, delete everything in the editor, paste the whole contents of `push-worker/worker.js`, then click **Deploy**.
4. Open the Worker's **Settings** tab:
   - **Bindings** → **Add** → **D1 database** → variable name **`DB`** → choose **`mstc-db`** (the database `mstc-platform` uses) → **Deploy**.
   - **Variables and Secrets** → **Add**:
     - Type **Secret**, name **`FCM_SERVICE_ACCOUNT`**, value: open the service-account `.json` file from Part 1 step 4 in Notepad, select all, copy, paste.
     - Type **Secret**, name **`ADMIN_KEY`**, value: any long random text you make up (used only to send a test notification).
   - **Trigger Events** (or **Triggers**) → **Cron Triggers** → **Add** → `*/5 * * * *` (every 5 minutes).
5. Open `https://mstc-push.thereal-jnjnbnd.workers.dev/` in a browser. You should see `{"ok":true,"service":"mstc-push"}`.

> If your Worker address is different (check the Worker's page for its URL), tell me, or edit `EXPO_PUBLIC_PUSH_URL` in `.github/workflows/build-apk.yml` to match.

## Part 3 — Build the app with push turned on

1. GitHub repo → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
   - Name: **`GOOGLE_SERVICES_JSON`**
   - Value: open `google-services.json` in Notepad, select all, copy, paste.
2. Upload this update to the repo (the new `build-apk.yml`, `frontend/`, `push-worker/`) and let **Actions** build the APK.
3. Install the new APK on a phone and **allow notifications** when asked.

## Part 4 — Test it

1. In a browser open (use your own key):
   `https://mstc-push.thereal-jnjnbnd.workers.dev/test?key=YOUR_ADMIN_KEY`
   The phone should show **MSTConnect test** within a few seconds.
2. Publish a real announcement on the website. A notification should arrive within about 5 minutes.

---

## If something doesn't work

| Problem | Check |
|---|---|
| `/test` says `forbidden` | The `key=` doesn't match the `ADMIN_KEY` secret. |
| `/test` says `google auth failed` | `FCM_SERVICE_ACCOUNT` wasn't pasted as the full, unchanged JSON file. |
| `/test` says `fcm 403/404` | In Firebase → Project settings → **Cloud Messaging**, make sure *Firebase Cloud Messaging API (V1)* is enabled. |
| `/test` says OK but nothing on the phone | The APK was built before you added `GOOGLE_SERVICES_JSON`. Rebuild. Also check notification permission for MSTConnect in Android settings. |
| Test works, real posts don't | Cloudflare → `mstc-push` → **Logs** shows cron errors. Also confirm the Cron Trigger and the `DB` binding exist. |
| Phone never registers | Open the app once with internet on, and accept the notification permission. |

Some phone brands (Xiaomi, Oppo, Vivo, Realme) aggressively stop apps in the background. If notifications are late, set MSTConnect to **no battery restrictions** / **autostart** in the phone's settings.

## Good to know

- **Free-plan usage:** about 288 Worker runs a day, a few hundred database rows read per run, and almost no writes. That is a small fraction of Cloudflare's free daily limits, which are shared with your website. Watch *Workers & Pages → Metrics* if your traffic grows.

- Everyone who installs the app receives the same notifications (one topic). There are no per-category switches.
- Nothing personal is stored. Devices subscribe to a Firebase topic. The Worker keeps only a list of which posts it already announced (`push_sent`).
- The Worker only **reads** `announcements` and `events`. It adds two small tables (`push_sent`, `push_state`) to `mstc-db`. Removing the Worker later leaves your data untouched.
- Android only (the app is an APK).
