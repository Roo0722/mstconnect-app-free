import AsyncStorage from "@react-native-async-storage/async-storage";
import Constants from "expo-constants";

// "Is there a newer APK on GitHub?" — free, no server. Reads the latest release of the repo.
export const REPO = "Roo0722/mstconnect-app-free";

const LAST_CHECK = "mstc:update-checked";
const SNOOZE = "mstc:update-later";
const CHECK_EVERY = 6 * 3600 * 1000; // automatic checks at most every 6 hours
const SNOOZE_FOR = 24 * 3600 * 1000; // "Later" hides that version for a day

export type UpdateInfo = { build: number; name: string; notes: string; apkUrl: string; pageUrl: string };

export type CheckResult =
  | { status: "update"; info: UpdateInfo }
  | { status: "current"; build: number }
  | { status: "skip" }
  | { status: "error" };

// The GitHub build stamps its run number into the app (see build-apk.yml). 0 = dev build / Expo Go.
export function installedBuild(): number {
  const n = Number((Constants.expoConfig?.extra as { build?: number } | undefined)?.build);
  return Number.isFinite(n) ? n : 0;
}

export function installedVersion(): string {
  return Constants.expoConfig?.version ?? "";
}

async function fetchLatest(): Promise<UpdateInfo | null> {
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, {
    headers: { Accept: "application/vnd.github+json" },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const r = await res.json();
  const build = Number(String(r.tag_name ?? "").replace(/\D/g, ""));
  if (!build) return null;
  const apk = (r.assets ?? []).find((a: { name?: string }) => /\.apk$/i.test(a.name ?? ""));
  return {
    build,
    name: String(r.name ?? r.tag_name),
    notes: String(r.body ?? "").trim(),
    apkUrl: apk?.browser_download_url ?? r.html_url,
    pageUrl: r.html_url,
  };
}

export async function checkForUpdate(opts: { force?: boolean } = {}): Promise<CheckResult> {
  const mine = installedBuild();
  if (!mine) return { status: "skip" };
  try {
    if (!opts.force) {
      const last = Number((await AsyncStorage.getItem(LAST_CHECK)) ?? 0);
      if (Date.now() - last < CHECK_EVERY) return { status: "skip" };
    }
    const info = await fetchLatest();
    await AsyncStorage.setItem(LAST_CHECK, String(Date.now())).catch(() => {});
    if (!info || info.build <= mine) return { status: "current", build: mine };

    if (!opts.force) {
      const snoozed = JSON.parse((await AsyncStorage.getItem(SNOOZE)) ?? "null");
      if (snoozed && snoozed.build === info.build && Date.now() - snoozed.at < SNOOZE_FOR) return { status: "skip" };
    }
    return { status: "update", info };
  } catch {
    return { status: "error" }; // offline, rate-limited, etc. — never bother the user
  }
}

export function snoozeUpdate(build: number) {
  AsyncStorage.setItem(SNOOZE, JSON.stringify({ build, at: Date.now() })).catch(() => {});
}

// Release notes come from the commit message; keep them short and plain.
export function shortNotes(notes: string, max = 400) {
  const t = notes.replace(/[#*_`>]/g, "").replace(/\r/g, "").trim();
  return t.length > max ? `${t.slice(0, max).trimEnd()}…` : t;
}
