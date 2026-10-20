import { useCallback, useSyncExternalStore } from "react";
import { AppState, Linking, Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import { installedBuild, type UpdateInfo } from "./update";
import { ensureReminderPermission } from "./plan/notify";

// Downloads the APK and opens Android's own install screen (Android always asks you to confirm).
// The download keeps going when you leave the app (with a progress notification), and the finished file
// stays on the phone until that version is installed, so you can install it later without downloading again.
export type InstallState = "idle" | "downloading" | "ready" | "installing" | "error";

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 0x10000000;
const SAVED_KEY = "mstc:apk-dl"; // { info, path, done }
const MIN_APK_BYTES = 1_000_000; // anything smaller than this is not a real app file

type Saved = { info: UpdateInfo; path: string; done: boolean };

// ---------- shared state (so the update pop-up and the About screen always agree) ----------
type Snap = { state: InstallState; pct: number; info: UpdateInfo | null };
let snap: Snap = { state: "idle", pct: -1, info: null };
const subs = new Set<() => void>();
function set(patch: Partial<Snap>) {
  snap = { ...snap, ...patch };
  subs.forEach((f) => f());
}
const subscribe = (f: () => void) => {
  subs.add(f);
  return () => subs.delete(f);
};
const getSnap = () => snap;

// ---------- the background downloader (a native add-on; falls back to a normal download if it isn't there) ----------
type Bgd = typeof import("@kesha-antonov/react-native-background-downloader");
let bgdCache: Bgd | null | undefined;
function bgd(): Bgd | null {
  if (bgdCache !== undefined) return bgdCache;
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const m = require("@kesha-antonov/react-native-background-downloader") as Bgd;
    void m.directories.documents; // throws when the native part isn't in this build
    bgdCache = m;
  } catch {
    bgdCache = null;
  }
  return bgdCache;
}

const taskId = (build: number) => `mstc-apk-${build}`;
const asUri = (path: string) => (path.startsWith("file://") ? path : `file://${path}`);
const apkDir = () => {
  const b = bgd();
  const d = b ? b.directories.documents : (FileSystem.documentDirectory ?? "").replace(/^file:\/\//, "").replace(/\/$/, "");
  return d;
};
const apkPath = (build: number) => `${apkDir()}/mstconnect-${build}.apk`;

async function readSaved(): Promise<Saved | null> {
  try {
    const raw = await AsyncStorage.getItem(SAVED_KEY);
    return raw ? (JSON.parse(raw) as Saved) : null;
  } catch {
    return null;
  }
}
const writeSaved = (s: Saved | null) => (s ? AsyncStorage.setItem(SAVED_KEY, JSON.stringify(s)) : AsyncStorage.removeItem(SAVED_KEY)).catch(() => {});

async function fileOk(path: string) {
  try {
    const i = await FileSystem.getInfoAsync(asUri(path));
    return i.exists && (i as { size?: number }).size! >= MIN_APK_BYTES;
  } catch {
    return false;
  }
}
const remove = (path: string) => FileSystem.deleteAsync(asUri(path), { idempotent: true }).catch(() => {});

// ---------- the pieces ----------
function watch(task: any, info: UpdateInfo) {
  let last = -1;
  task
    .progress(({ bytesDownloaded, bytesTotal }: { bytesDownloaded: number; bytesTotal: number }) => {
      const p = bytesTotal > 0 ? Math.floor((bytesDownloaded / bytesTotal) * 100) : -1;
      if (p !== last) {
        last = p;
        set({ state: "downloading", pct: p, info });
      }
    })
    .done(async ({ bytesDownloaded, bytesTotal }: { bytesDownloaded: number; bytesTotal: number }) => {
      const path = apkPath(info.build);
      const whole = bytesTotal <= 0 || bytesDownloaded >= bytesTotal;
      if (whole && (await fileOk(path))) {
        await writeSaved({ info, path, done: true });
        try {
          bgd()?.completeHandler(taskId(info.build));
        } catch {}
        set({ state: "ready", pct: 100, info });
        if (AppState.currentState === "active") install(); // you are still here: go straight to the installer
      } else {
        await remove(path);
        await writeSaved(null);
        set({ state: "error", pct: -1, info });
      }
    })
    .error(({ errorCode }: { errorCode: number }) => {
      set(errorCode === -1 ? { state: "idle", pct: -1 } : { state: "error", pct: -1, info });
    });
}

// Call once at start-up (and again from About): cleans up, then picks an unfinished download back up.
let restoring: Promise<void> | null = null;
export function restoreInstall(): Promise<void> {
  restoring ??= (async () => {
    const saved = await readSaved();
    if (saved && installedBuild() >= saved.info.build) {
      // that version is installed now: the file is no longer needed
      await remove(saved.path);
      await writeSaved(null);
      return;
    }
    if (saved?.done) {
      if (await fileOk(saved.path)) set({ state: "ready", pct: 100, info: saved.info });
      else await writeSaved(null);
      return;
    }
    const b = bgd();
    if (!b) return;
    try {
      const tasks = await b.getExistingDownloadTasks();
      const t = tasks.find((x) => x.id.startsWith("mstc-apk-"));
      if (t && saved) {
        watch(t, saved.info);
        set({ state: "downloading", pct: t.bytesTotal > 0 ? Math.floor((t.bytesDownloaded / t.bytesTotal) * 100) : -1, info: saved.info });
        if (t.state === "PAUSED") t.resume();
      }
    } catch {}
  })();
  return restoring;
}

export async function install() {
  const saved = await readSaved();
  if (!saved || !(await fileOk(saved.path))) {
    await writeSaved(null);
    set({ state: "error", pct: -1 });
    return;
  }
  set({ state: "installing" });
  try {
    const uri = await FileSystem.getContentUriAsync(asUri(saved.path));
    await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
      data: uri,
      type: "application/vnd.android.package-archive",
      flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
    });
    set({ state: "ready" }); // keep the file and the button until the new version is really installed
  } catch {
    set({ state: "error" });
  }
}

let starting = false;
export async function startInstall(info: UpdateInfo) {
  if (starting) return;
  starting = true;
  try {
    if (Platform.OS !== "android" || !/\.apk$/i.test(info.apkUrl)) {
      await Linking.openURL(info.apkUrl);
      return;
    }
    await restoreInstall();
    if (snap.info?.build === info.build && (snap.state === "downloading" || snap.state === "installing")) return;
    const saved = await readSaved();
    if (saved?.done && saved.info.build === info.build && (await fileOk(saved.path))) {
      set({ info });
      await install();
      return;
    }

    // a different or half-finished file: clear it and start clean
    if (saved) {
      await remove(saved.path);
      await writeSaved(null);
    }
    const path = apkPath(info.build);
    await remove(path);
    await writeSaved({ info, path, done: false });
    set({ state: "downloading", pct: 0, info });

    const b = bgd();
    if (b) {
      await ensureReminderPermission(); // lets the progress notification show (Android 13+)
      b.setConfig({
        showNotificationsEnabled: true,
        showCompletionNotification: true,
        notificationsGrouping: { enabled: false, texts: { downloadTitle: "MSTConnect update", downloadFinished: "Update downloaded. Tap the app to install." } } as any,
      });
      const task = b.createDownloadTask({
        id: taskId(info.build),
        url: info.apkUrl,
        destination: path,
        metadata: { build: info.build },
        notificationTitle: "MSTConnect update",
      } as any);
      watch(task, info);
      task.start();
    } else {
      // no background downloader in this build: normal download, which only runs while the app is open
      let last = -1;
      const dl = FileSystem.createDownloadResumable(info.apkUrl, asUri(path), {}, (p) => {
        const next = p.totalBytesExpectedToWrite > 0 ? Math.floor((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100) : -1;
        if (next !== last) {
          last = next;
          set({ pct: next });
        }
      });
      const res = await dl.downloadAsync();
      if (!res || res.status !== 200 || !(await fileOk(path))) throw new Error(`HTTP ${res?.status}`);
      await writeSaved({ info, path, done: true });
      set({ state: "ready", pct: 100 });
      await install();
    }
  } catch {
    set({ state: "error", pct: -1 });
  } finally {
    starting = false;
  }
}

// What the screens use. Pass the update you are showing, so a download of another version is not mistaken for it.
export function useInstall(info?: UpdateInfo | null) {
  const s = useSyncExternalStore(subscribe, getSnap, getSnap);
  const mine = !info || s.info?.build === info.build;
  const start = useCallback((i: UpdateInfo) => startInstall(i), []);
  const reset = useCallback(() => {
    if (snap.state === "error") set({ state: "idle", pct: -1 });
  }, []);
  return { state: (mine ? s.state : "idle") as InstallState, pct: mine ? s.pct : -1, start, reset, pending: s.info, pendingState: s.state };
}

// Last resort when the in-app download fails: open the file in the browser.
export async function openInBrowser(info: UpdateInfo) {
  try {
    await Linking.openURL(info.apkUrl);
  } catch {
    try {
      await Linking.openURL(info.pageUrl);
    } catch {}
  }
}
