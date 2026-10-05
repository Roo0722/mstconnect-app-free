import AsyncStorage from "@react-native-async-storage/async-storage";

// Free, no Emergent, no extra backend: the app reads the public pages of the MSTC platform
// (/announcements and /events) and turns them into native cards. Nothing to host or pay for.
// Override at build time with EXPO_PUBLIC_API_URL if the platform URL changes.
const BASE = (process.env.EXPO_PUBLIC_API_URL ?? "https://mstc-platform.thereal-jnjnbnd.workers.dev").replace(/\/$/, "");

export type Announcement = {
  id: string;
  title: string;
  body: string;
  category: "event" | "recruitment" | "training" | "community";
  pinned: boolean;
  created_at: string;
  url?: string;
  image?: string;
};

export type MstcEvent = {
  id: string;
  title: string;
  date?: string | null;
  time?: string | null;
  location?: string | null;
  duration_minutes?: number | null;
  description?: string | null;
  starts_at?: string | null;
  created_at: string;
  url?: string;
};

export type Notification = {
  id: string;
  title: string;
  body: string;
  kind: "announcement" | "event_reminder" | "general";
  ref_id?: string | null;
  read: boolean;
  created_at: string;
};

export const SITE_URL = BASE;

async function getHtml(path: string): Promise<string> {
  const res = await fetch(`${BASE}${path}`, { headers: { Accept: "text/html" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return await res.text();
}

// ---------- tiny HTML helpers (no dependencies) ----------
function decode(s: string) {
  return s
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#0*39;|&apos;/g, "'")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&hellip;/g, "…").replace(/&middot;/g, "·")
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCodePoint(parseInt(h, 16)))
    .replace(/&#(\d+);/g, (_, d) => String.fromCodePoint(parseInt(d, 10)));
}
function clean(html: string) {
  return decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ")).replace(/\s+/g, " ").trim();
}
function lines(html: string): string[] {
  return decode(html.replace(/<(script|style)[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, "\n"))
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean);
}
const MONTHS: Record<string, number> = { jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12 };
const DATE_RE = /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+(\d{1,2}),?\s+(\d{4})\b/i;
const TIME_RE = /\b(\d{1,2}):(\d{2})\s*(AM|PM)\b/i;
const pad = (n: number) => String(n).padStart(2, "0");
function parseDate(text: string): { iso: string; index: number } | null {
  const m = DATE_RE.exec(text);
  if (!m) return null;
  return { iso: `${m[3]}-${pad(MONTHS[m[1].toLowerCase()])}-${pad(Number(m[2]))}`, index: m.index };
}

type Card = { slug: string; url: string; title: string; segment: string };

// Finds every link to /<section>/<slug> and slices the page into one segment per card.
function cards(html: string, section: string): Card[] {
  const end = html.search(/<footer|<\/main>/i);
  const page = end > 0 ? html.slice(0, end) : html;
  const re = new RegExp(`<a\\b[^>]*href=["']([^"']*/${section}/([a-z0-9][a-z0-9_-]*))["'][^>]*>([\\s\\S]*?)</a>`, "gi");
  const found: { slug: string; href: string; index: number; text: string }[] = [];
  let m: RegExpExecArray | null;
  while ((m = re.exec(page))) found.push({ slug: m[2], href: m[1], index: m.index, text: clean(m[3]) });

  const order: string[] = [];
  for (const f of found) if (!order.includes(f.slug)) order.push(f.slug);

  // Where each card begins: back up to the nearest <article>/<li> opening (so a date line that sits
  // above the first link is included), but never into the previous card.
  const lastEnd = (slug: string) => {
    const mine = found.filter((f) => f.slug === slug);
    const l = mine[mine.length - 1];
    return l.index + l.text.length;
  };
  const starts = order.map((slug, i) => {
    const first = found.find((f) => f.slug === slug)!.index;
    const floor = i > 0 ? lastEnd(order[i - 1]) : 0;
    const openers = [...page.slice(floor, first).matchAll(/<(?:article|li)\b/gi)];
    return openers.length ? floor + openers[openers.length - 1].index! : first;
  });

  return order.map((slug, i) => {
    const mine = found.filter((f) => f.slug === slug);
    const segment = page.slice(starts[i], i + 1 < order.length ? starts[i + 1] : page.length);
    const title =
      mine.map((f) => f.text).filter((t) => t && !/^read\b/i.test(t) && !/^view\b/i.test(t)).sort((a, b) => b.length - a.length)[0] ?? "";
    const href = mine[0].href;
    const url = absUrl(href);
    return { slug, url, title, segment };
  }).filter((c) => c.title);
}

function excerpt(card: Card): string {
  const candidates = lines(card.segment).filter(
    (l) => l !== card.title && l.length >= 30 && !/^read\b/i.test(l) && !/browse the archive/i.test(l) && !DATE_RE.test(l.slice(0, 30)),
  );
  return candidates.sort((a, b) => b.length - a.length)[0] ?? "";
}

function absUrl(href: string) {
  return /^https?:/i.test(href) ? href : `${BASE}${href.startsWith("/") ? "" : "/"}${href}`;
}
function firstImage(html: string): string | undefined {
  for (const m of html.matchAll(/<img\b[^>]*?\bsrc=["']([^"']+)["']/gi)) {
    if (!/\.svg(\?|$)/i.test(m[1]) && !m[1].startsWith("data:")) return absUrl(m[1]);
  }
  return undefined;
}

export type Block =
  | { type: "h"; text: string }
  | { type: "p"; text: string }
  | { type: "li"; text: string }
  | { type: "quote"; text: string }
  | { type: "img"; src: string };

function inline(html: string) {
  return decode(html.replace(/<br\s*\/?>/gi, "\n").replace(/<[^>]+>/g, ""))
    .split("\n").map((l) => l.replace(/\s+/g, " ").trim()).filter(Boolean).join("\n");
}

// Reads one announcement/event page and returns just its content as simple blocks,
// so the app can show it natively without the website's menus and footer.
async function getArticle(url: string): Promise<Block[]> {
  const path = url.startsWith(BASE) ? url.slice(BASE.length) : url;
  let html = await getHtml(path);
  const main = /<main\b[^>]*>([\s\S]*?)<\/main>/i.exec(html);
  html = (main ? main[1] : html)
    .replace(/<(script|style|nav|footer|form|svg|noscript)\b[\s\S]*?<\/\1>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");

  const blocks: Block[] = [];
  const seenImg = new Set<string>();
  let skippedTitle = false;
  const re = /<(h[1-4]|p|li|blockquote)\b[^>]*>([\s\S]*?)<\/\1>|<img\b[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    if (!m[1]) {
      const src = firstImage(m[0]);
      if (src && !seenImg.has(src)) { seenImg.add(src); blocks.push({ type: "img", src }); }
      continue;
    }
    const tag = m[1].toLowerCase();
    const inner = m[2];
    // images nested inside a block (e.g. <p><img></p>)
    const nested = firstImage(inner);
    if (nested && !seenImg.has(nested)) { seenImg.add(nested); blocks.push({ type: "img", src: nested }); }
    const text = inline(inner);
    if (!text) continue;
    if (/^(skip to main content|back to\b|←|share\b)/i.test(text)) continue;
    if (tag === "h1" && !skippedTitle) { skippedTitle = true; continue; }
    if (text.length < 70 && DATE_RE.test(text) && /[·•|]/.test(text)) continue; // meta line
    if (tag.startsWith("h")) {
      if (blocks.some((b) => b.type === "p") && /^(more|related|other|latest|recent|all|read more|you may)\b/i.test(text)) break;
      blocks.push({ type: "h", text });
    } else if (tag === "li") blocks.push({ type: "li", text });
    else if (tag === "blockquote") blocks.push({ type: "quote", text });
    else blocks.push({ type: "p", text });
  }
  return blocks;
}

const CATEGORIES = ["event", "recruitment", "training", "community"] as const;

async function listAnnouncements(): Promise<Announcement[]> {
  const html = await getHtml("/announcements");
  return cards(html, "announcements").map((c) => {
    const text = clean(c.segment);
    const date = parseDate(text);
    const before = date ? text.slice(Math.max(0, date.index - 60), date.index) : text.slice(0, 80);
    const cat = (/\b(community|recruitment|training|events?)\b/i.exec(before)?.[1] ?? "community").toLowerCase().replace(/^events$/, "event");
    return {
      id: c.slug,
      title: c.title,
      body: excerpt(c),
      category: (CATEGORIES as readonly string[]).includes(cat) ? (cat as Announcement["category"]) : "community",
      pinned: /\bpinned\b/i.test(before),
      created_at: date ? `${date.iso}T00:00:00+08:00` : new Date(0).toISOString(),
      url: c.url,
      image: firstImage(c.segment),
    };
  });
}

async function listEvents(): Promise<MstcEvent[]> {
  const html = await getHtml("/events");
  return cards(html, "events").map((c) => {
    const text = clean(c.segment);
    const date = parseDate(text);
    const t = TIME_RE.exec(text);
    let starts_at: string | null = null;
    let time: string | null = null;
    if (date && t) {
      let h = Number(t[1]) % 12;
      if (t[3].toUpperCase() === "PM") h += 12;
      starts_at = `${date.iso}T${pad(h)}:${t[2]}:00+08:00`;
      time = `${t[1]}:${t[2]} ${t[3].toUpperCase()}`;
    }
    const loc = lines(c.segment).map((l) => /^(?:📍\s*|(?:Location|Venue|Where)\s*:?\s*)(.+)$/i.exec(l)).find(Boolean);
    return {
      id: c.slug,
      title: c.title,
      date: date?.iso ?? null,
      time,
      location: loc?.[1]?.trim() ?? null,
      duration_minutes: 120,
      description: excerpt(c) || null,
      starts_at,
      created_at: date ? `${date.iso}T00:00:00+08:00` : new Date(0).toISOString(),
      url: c.url,
    };
  });
}

async function nextEvent(): Promise<MstcEvent | null> {
  const now = Date.now();
  const upcoming = (await listEvents()).filter((e) => {
    if (e.starts_at) return Date.parse(e.starts_at) + (e.duration_minutes ?? 120) * 60_000 >= now;
    if (e.date) return Date.parse(`${e.date}T23:59:59+08:00`) >= now;
    return true;
  });
  upcoming.sort((a, b) => (a.starts_at ? Date.parse(a.starts_at) : Infinity) - (b.starts_at ? Date.parse(b.starts_at) : Infinity));
  return upcoming[0] ?? null;
}

// ---------- notifications: built on the phone, read-state kept in AsyncStorage ----------
const READ_KEY = "mstc:read-ids";
async function readIds(): Promise<Set<string>> {
  try {
    return new Set<string>(JSON.parse((await AsyncStorage.getItem(READ_KEY)) ?? "[]"));
  } catch {
    return new Set();
  }
}
async function saveReadIds(ids: Set<string>) {
  await AsyncStorage.setItem(READ_KEY, JSON.stringify([...ids]));
}

async function listNotifications(): Promise<Notification[]> {
  const [anns, read] = await Promise.all([listAnnouncements(), readIds()]);
  return [...anns]
    .sort((a, b) => b.created_at.localeCompare(a.created_at))
    .slice(0, 30)
    .map((a) => ({
      id: a.id,
      title: `New announcement: ${a.title}`,
      body: a.body.slice(0, 140),
      kind: "announcement" as const,
      ref_id: a.id,
      read: read.has(a.id),
      created_at: a.created_at,
    }));
}

export const api = {
  getArticle,
  listAnnouncements,
  nextEvent,
  listNotifications,
  markRead: async (id: string) => {
    const ids = await readIds();
    ids.add(id);
    await saveReadIds(ids);
    return { ok: true };
  },
  markAllRead: async () => {
    const ids = await readIds();
    (await listNotifications()).forEach((n) => ids.add(n.id));
    await saveReadIds(ids);
    return { ok: true };
  },
};
