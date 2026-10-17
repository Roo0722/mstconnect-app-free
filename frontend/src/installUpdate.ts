import { useCallback, useRef, useState } from "react";
import { Linking, Platform } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";
import type { UpdateInfo } from "./update";

// Downloads the APK inside the app and opens Android's own install screen.
// Android always asks the user to confirm; an app can't install itself silently.
export type InstallState = "idle" | "downloading" | "installing" | "error";

const FLAG_GRANT_READ_URI_PERMISSION = 1;
const FLAG_ACTIVITY_NEW_TASK = 0x10000000;

export function useInstall() {
  const [state, setState] = useState<InstallState>("idle");
  const [pct, setPct] = useState(-1); // -1 = size unknown
  const busy = useRef(false);

  const start = useCallback(async (info: UpdateInfo) => {
    if (busy.current) return;
    busy.current = true;
    try {
      if (Platform.OS !== "android" || !FileSystem.cacheDirectory || !/\.apk$/i.test(info.apkUrl)) {
        await Linking.openURL(info.apkUrl);
        setState("idle");
        return;
      }
      setState("downloading");
      setPct(0);
      const dest = `${FileSystem.cacheDirectory}mstconnect-${info.build}.apk`;
      await FileSystem.deleteAsync(dest, { idempotent: true });
      let last = -1;
      const dl = FileSystem.createDownloadResumable(info.apkUrl, dest, {}, (p) => {
        const next = p.totalBytesExpectedToWrite > 0 ? Math.floor((p.totalBytesWritten / p.totalBytesExpectedToWrite) * 100) : -1;
        if (next !== last) {
          last = next;
          setPct(next);
        }
      });
      const res = await dl.downloadAsync();
      if (!res || res.status !== 200) throw new Error(`HTTP ${res?.status}`);
      setState("installing");
      const uri = await FileSystem.getContentUriAsync(res.uri);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", {
        data: uri,
        type: "application/vnd.android.package-archive",
        flags: FLAG_GRANT_READ_URI_PERMISSION | FLAG_ACTIVITY_NEW_TASK,
      });
      setState("idle");
    } catch {
      setState("error");
    } finally {
      busy.current = false;
    }
  }, []);

  const reset = useCallback(() => setState("idle"), []);
  return { state, pct, start, reset };
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
