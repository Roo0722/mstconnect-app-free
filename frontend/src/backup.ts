import { Platform } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import { computeGame, type Activity } from "./game/engine";
import { getActivities, mergeActivities } from "./game/store";
import { cleanPlan } from "./plan/engine";
import { savePlan } from "./plan/store";

// Back up and restore what lives on this phone: the training log (rank is worked out from it), the weekly plan,
// your HIIT presets and a few settings. Moves your progress to a new phone or from the Beta app to the normal app.
// Free and private: the file only goes where you send it.
export const BACKUP_KEYS = ["mstc:game:v1", "mstc:plan:v1", "mstc:presets", "mstc:warmup-length", "mstc:hiit-skip-last-rest"] as const;
const RANK_SEEN_KEY = "mstc:rank-level";
const MAX_BYTES = 5_000_000;

export type BackupFile = { app: "mstconnect"; format: 1; createdAt: string; data: Record<string, string> };
export type BackupSummary = { sessions: number; minutes: number; first: number | null; last: number | null; hasPlan: boolean };

export function summarise(acts: Activity[]): Omit<BackupSummary, "hasPlan"> {
  const ok = acts.filter((a) => a && typeof a.start === "number" && typeof a.minutes === "number");
  return {
    sessions: ok.length,
    minutes: Math.round(ok.reduce((n, a) => n + a.minutes, 0)),
    first: ok.length ? Math.min(...ok.map((a) => a.start)) : null,
    last: ok.length ? Math.max(...ok.map((a) => a.start)) : null,
  };
}

// Pure: check that a file really is an MSTConnect backup, and say what is in it. Never throws.
export function parseBackup(text: string): { ok: true; file: BackupFile; summary: BackupSummary; activities: unknown[] } | { ok: false; reason: string } {
  if (text.length > MAX_BYTES) return { ok: false, reason: "That file is too large to be an MSTConnect backup." };
  let j: any;
  try {
    j = JSON.parse(text);
  } catch {
    return { ok: false, reason: "That file isn't a backup. Choose the file that was made by Back up my data." };
  }
  if (!j || j.app !== "mstconnect" || j.format !== 1 || typeof j.data !== "object" || j.data === null) {
    return { ok: false, reason: "That file isn't an MSTConnect backup." };
  }
  const data: Record<string, string> = {};
  for (const k of BACKUP_KEYS) if (typeof j.data[k] === "string") data[k] = j.data[k];
  let activities: unknown[] = [];
  try {
    const g = data["mstc:game:v1"] ? JSON.parse(data["mstc:game:v1"]) : null;
    if (g && Array.isArray(g.activities)) activities = g.activities;
  } catch {
    return { ok: false, reason: "The training log inside that backup is damaged." };
  }
  const s = summarise(activities as Activity[]);
  if (!Object.keys(data).length) return { ok: false, reason: "That backup has nothing in it." };
  return { ok: true, file: { app: "mstconnect", format: 1, createdAt: String(j.createdAt ?? ""), data }, summary: { ...s, hasPlan: !!data["mstc:plan:v1"] }, activities };
}

export async function makeBackupText(): Promise<string> {
  const pairs = await AsyncStorage.multiGet([...BACKUP_KEYS]);
  const data: Record<string, string> = {};
  for (const [k, v] of pairs) if (typeof v === "string") data[k] = v;
  const file: BackupFile = { app: "mstconnect", format: 1, createdAt: new Date().toISOString(), data };
  return JSON.stringify(file);
}

// Make the file and open Android's share sheet so you can send it to yourself (Messenger, email, Drive...).
export async function exportBackup(): Promise<"shared" | "unavailable"> {
  const day = new Date().toISOString().slice(0, 10);
  const uri = `${FileSystem.cacheDirectory}mstconnect-backup-${day}.json`;
  await FileSystem.writeAsStringAsync(uri, await makeBackupText(), { encoding: FileSystem.EncodingType.UTF8 });
  if (Platform.OS === "web" || !(await Sharing.isAvailableAsync())) return "unavailable";
  await Sharing.shareAsync(uri, { mimeType: "application/json", dialogTitle: "Save your MSTConnect backup", UTI: "public.json" });
  return "shared";
}

// Let the player pick a backup file, and check it. Returns null when they cancel.
export async function pickBackup() {
  const r = await DocumentPicker.getDocumentAsync({ type: "*/*", copyToCacheDirectory: true, multiple: false });
  if (r.canceled || !r.assets?.[0]) return null;
  const text = await FileSystem.readAsStringAsync(r.assets[0].uri, { encoding: FileSystem.EncodingType.UTF8 });
  return parseBackup(text);
}

// Add the backup to this phone. Sessions are merged (nothing here is deleted); plan, presets and settings come from the backup.
export async function applyBackup(b: Extract<ReturnType<typeof parseBackup>, { ok: true }>) {
  // set the "rank already seen" marker first, so restoring a higher rank doesn't throw a promotion party
  const merged = [...(await getActivities())];
  const ids = new Set(merged.map((a) => a.id));
  for (const a of b.activities as Activity[]) if (a && !ids.has(a.id)) merged.push(a);
  try {
    const level = computeGame(merged.filter((a) => a && typeof a.start === "number" && typeof a.end === "number" && typeof a.minutes === "number" && a.minutes > 0), Date.now()).level;
    const seen = Number(await AsyncStorage.getItem(RANK_SEEN_KEY));
    await AsyncStorage.setItem(RANK_SEEN_KEY, String(Math.max(level, Number.isFinite(seen) ? seen : 0)));
  } catch {}

  const res = await mergeActivities(b.activities);
  const d = b.file.data;
  if (d["mstc:plan:v1"]) {
    try {
      await savePlan(cleanPlan(JSON.parse(d["mstc:plan:v1"])));
    } catch {}
  }
  for (const k of ["mstc:presets", "mstc:warmup-length", "mstc:hiit-skip-last-rest"] as const) {
    if (d[k]) await AsyncStorage.setItem(k, d[k]).catch(() => {});
  }
  return res;
}
