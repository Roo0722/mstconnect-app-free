import { Platform, Share } from "react-native";
import * as FileSystem from "expo-file-system/legacy";
import * as IntentLauncher from "expo-intent-launcher";

// Adds an event to the phone's calendar in a way that works with many calendar apps:
//  1. a standard calendar file (.ics): Android lists every app that can open it (Google, Samsung, Outlook, Xiaomi...)
//  2. the system "new event" screen
//  3. share the .ics file to any app
export type CalEvent = { title: string; startsAt: string; durationMin?: number | null; location?: string | null; notes?: string };

const utc = (ms: number) => new Date(ms).toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const esc = (t: string) => t.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

export function buildIcs(ev: CalEvent, now = Date.now()): string {
  const start = Date.parse(ev.startsAt);
  const end = start + (ev.durationMin && ev.durationMin > 0 ? ev.durationMin : 120) * 60_000;
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//MSTConnect//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:${start}-${esc(ev.title).length}@mstconnect`,
    `DTSTAMP:${utc(now)}`,
    `DTSTART:${utc(start)}`,
    `DTEND:${utc(end)}`,
    `SUMMARY:${esc(ev.title)}`,
    ...(ev.location ? [`LOCATION:${esc(ev.location)}`] : []),
    ...(ev.notes ? [`DESCRIPTION:${esc(ev.notes)}`] : []),
    "BEGIN:VALARM",
    "TRIGGER:-PT60M",
    "ACTION:DISPLAY",
    "DESCRIPTION:Starts in 1 hour",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}

export async function addToCalendar(ev: CalEvent): Promise<boolean> {
  if (Number.isNaN(Date.parse(ev.startsAt))) return false;
  const path = `${FileSystem.cacheDirectory}mstc-event.ics`;
  let written = false;
  try {
    await FileSystem.writeAsStringAsync(path, buildIcs(ev), { encoding: FileSystem.EncodingType.UTF8 });
    written = true;
  } catch {}

  if (Platform.OS === "android" && written) {
    try {
      const uri = await FileSystem.getContentUriAsync(path);
      await IntentLauncher.startActivityAsync("android.intent.action.VIEW", { data: uri, type: "text/calendar", flags: 1 | 0x10000000 });
      return true;
    } catch {}
  }
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Cal = require("expo-calendar");
    const start = new Date(ev.startsAt);
    await Cal.createEventInCalendarAsync({
      title: ev.title,
      startDate: start,
      endDate: new Date(start.getTime() + (ev.durationMin ?? 120) * 60_000),
      location: ev.location ?? undefined,
      notes: ev.notes,
      alarms: [{ relativeOffset: -60 }],
    });
    return true;
  } catch {}
  try {
    const when = new Date(ev.startsAt).toLocaleString();
    await Share.share({ message: `${ev.title}\n${when}${ev.location ? `\n${ev.location}` : ""}${ev.notes ? `\n${ev.notes}` : ""}` });
    return true;
  } catch {
    return false;
  }
}
