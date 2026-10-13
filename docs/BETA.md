# Beta channel

New or risky features are built on the `beta` branch first. Beta builds are a **separate app** ("MSTConnect Beta",
`com.mstc.mstconnect.beta`) that installs next to the normal app. Normal users never see them and get no update
notice, because beta builds are published as GitHub **pre-releases** and the normal app only follows the latest
stable release.

## One-time setup

1. Put `build-beta.yml` in `.github/workflows/` and this file in `docs/` on `main`, then push. This does **not**
   build a normal APK (the normal workflow only reacts to `frontend/` changes and its own file).
2. Create the branch and push it:
   ```powershell
   git checkout main
   git pull
   git checkout -b beta
   git push -u origin beta
   ```
3. Put the beta code changes in (`frontend/src/update.ts` and `frontend/app/about.tsx` from the update zip),
   commit and push on the `beta` branch:
   ```powershell
   git add -A
   git commit -m "Beta channel"
   git push
   ```
   The **Build Android BETA APK** workflow runs and publishes a pre-release `beta-1` with `MSTConnect-Beta.apk`.
   Testers download it from the Releases page (pre-releases are listed there, marked "Pre-release").

## Day to day

- Work on `beta`: `git checkout beta`, change, commit, `git push`. Each push builds a new beta pre-release.
- Bring normal fixes into beta: `git checkout beta`, `git merge main`, `git push`.
- When a beta feature is ready for everyone: `git checkout main`, `git merge beta`, `git push`. That builds a
  normal release, and normal users get the update notice as usual.

## Good to know

- The beta app checks its own channel, so testers get an "update available" notice for newer beta builds only.
  The About screen shows "(beta)" after the version.
- Beta uses the same signing key as the normal app if you have added one (same repository secrets).
- **Push notifications in beta:** the beta app id needs its own Firebase Android app. Register
  `com.mstc.mstconnect.beta` in the same Firebase project, download its `google-services.json`, and save it as the
  repository secret `GOOGLE_SERVICES_JSON_BETA`. It is free. Without the secret, the beta app builds and works but
  has no push.
- Saved data (presets and so on) belongs to each app separately; the beta app starts empty.
- Testers can keep both apps installed. Uninstalling the beta app never affects the normal one.
