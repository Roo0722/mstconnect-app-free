// What's new in MSTConnect. Newest first. Add a new entry at the top for every release.
// `id` must be unique and never reused: the "NEW" dot on the More tab compares it with the last one you opened.
export type Change = { id: string; date: string; title: string; tag?: "New" | "Beta"; items: string[] };

export const CHANGELOG: Change[] = [
  {
    id: "2026-10-28-home-dashboard",
    date: "28 Oct 2026",
    title: "Home is now a fixed dashboard",
    tag: "Beta",
    items: [
      "Home no longer scrolls. It measures your screen and tightens up on smaller phones or larger text so nothing is hidden behind the bottom bar.",
      "Tap the rank emblem to open your rank and plan. The weekly activity strip and a live event countdown sit right under it.",
      "The four big shortcut tiles are gone; only Enquiry stays. News and Tools are one tap away in the bottom bar.",
      "Add to calendar now works with many more calendar apps (Google, Samsung, Outlook and others), and falls back to sharing the event.",
    ],
  },
  {
    id: "2026-10-27-cancelled-events",
    date: "27 Oct 2026",
    title: "Cancelled events",
    tag: "Beta",
    items: [
      "Cancelled events are marked Cancelled in the app, with the reason, until the day they were due to start, just like on the website.",
      "Home shows a red notice for a cancelled event. A cancelled event is never shown as the next event or counted down.",
      "Cancelled events leave your weekly plan and get no reminders. If you had reminders for it, you get one message that it was cancelled.",
    ],
  },
  {
    id: "2026-10-26-cache-cleanup",
    date: "26 Oct 2026",
    title: "Frees up storage",
    tag: "Beta",
    items: [
      "Old downloaded update files left by earlier versions are removed automatically, which can free 100 MB or more.",
      "The app file is smaller (the unused emulator parts were left out), so updates download faster.",
    ],
  },
  {
    id: "2026-10-25-tidy-up",
    date: "25 Oct 2026",
    title: "Tidy-up and smaller app",
    tag: "Beta",
    items: [
      "Removed unused parts, so the app and its updates are a little smaller.",
      "Cleaner builds behind the scenes: fixed versions and correct release labels.",
    ],
  },
  {
    id: "2026-10-24-offline-download",
    date: "24 Oct 2026",
    title: "Offline copy and background update download",
    tag: "Beta",
    items: [
      "Events, announcements and the posts you open are now saved on your phone. With no signal you still see the last copy, with a small Offline note you can tap to retry.",
      "Updates now download in the background with a progress notification, so you can leave the app or lock the screen while it downloads.",
      "The downloaded update stays on your phone until it is installed. If you close the pop-up, you will see Install now next time instead of downloading again.",
    ],
  },
  {
    id: "2026-10-23-home-redesign",
    date: "23 Oct 2026",
    title: "Cleaner Home screen",
    tag: "Beta",
    items: [
      "The rank card is more compact: emblem beside your rank, progress bar and RP together, streak and weekly minutes as two small tiles, and a clear Open Rank & Plan button.",
      "Weekly activity now shows missed training days in grey, so red only means a day you still have planned. A small legend explains the colours.",
      "Shorter header with an outlined Always Free pill, a one-line card when there is no upcoming event, a tighter announcement preview, and quick actions as a tidy 2 by 2 grid.",
    ],
  },
  {
    id: "2026-10-22-warmup-length",
    date: "22 Oct 2026",
    title: "Warm-up length: Short, Standard or Long",
    tag: "Beta",
    items: [
      "Pick your warm-up on the Warm-Up Guide screen. Short is about 8 minutes (the essentials), Standard is about 14 (the everyday one), Long is about 17.",
      "Long adds squats, single-leg balance, standing hip abduction and shadow inside and outside kicks (no ball) before ball work.",
      "The app remembers your choice, and your training log notes which length you did.",
      "Beta only: About has a Preview promotion screen button so you can see the celebration without ranking up. It changes nothing.",
    ],
  },
  {
    id: "2026-10-21-promotion",
    date: "21 Oct 2026",
    title: "Promotion screen and a shorter warm-up",
    tag: "Beta",
    items: [
      "When you move up a rank, a full-screen celebration shows your new emblem, with a button to share it. It waits until you leave the timer screens.",
      "The Warm-Up Guide is about a minute shorter, around 14 minutes with the Get ready counts. Rep counts match the new times.",
    ],
  },
  {
    id: "2026-10-20-rank-plan",
    date: "20 Oct 2026",
    title: "Rank on Home, weekly plan and reminders",
    tag: "Beta",
    items: [
      "Your rank, progress and this week now show on the Home tab. Tap the card to open Rank & Plan.",
      "New weekly plan: choose your Train, Rest and Club days and the session for each, then get a training reminder at your time.",
      "MSTC events are added to your plan automatically, with a reminder the evening before and one hour ahead. Cancelled events are removed.",
      "Share your rank as a picture instead of text.",
      "Training Log & Rank is now called Rank & Plan in the Tools tab.",
    ],
  },
  {
    id: "2026-10-19-timer-polish",
    date: "19 Oct 2026",
    title: "HIIT timer polish, rank sharing and emblems",
    tag: "Beta",
    items: [
      "Each of the eight ranks now has its own emblem, on your rank card and in the rank ladder.",
      "New 30-minute and 60-minute HIIT presets.",
      "New option: end after the last work round, with no final rest.",
      "The HIIT timer shows the total time for the chosen preset.",
      "Custom preset buttons now repeat when you hold + or -.",
      "Share your rank from the Rank & Plan screen.",
    ],
  },
  {
    id: "2026-10-18-in-app-update",
    date: "18 Oct 2026",
    title: "Update inside the app",
    tag: "Beta",
    items: [
      "Updates now download inside the app with a progress percentage. No browser needed.",
      "Android shows its own install screen to confirm. The first time, allow installs from MSTConnect.",
      "Fixed the exercise name Standing Straight-Leg Raises, plus clearer wording in the warm-up (Toes-In and Toes-Out Calf Raises).",
    ],
  },
  {
    id: "2026-10-18-training-log",
    date: "18 Oct 2026",
    title: "Training log and ranks",
    tag: "Beta",
    items: [
      "New Training Log & Rank screen: every minute you train with the Warm-Up, HIIT timer or Flexibility tools is saved on your phone.",
      "Earn rank points (1 per minute, up to 90 per session) and climb eight ranks, from Novice Touch to Sovereign of Takraw.",
      "Weekly quests, streak weeks and a promotion series for each new level.",
      "You can also log a session by hand. Your log stays on this phone and you can clear it any time.",
      "New What's New page in the More tab.",
    ],
  },
  {
    id: "2026-10-17-training-tools",
    date: "17 Oct 2026",
    title: "Training tools, redone",
    tag: "New",
    items: [
      "Warm-Up Guide: 24 steps in four phases, about 14 minutes, with a 5-second Get ready before every exercise.",
      "A pause when you switch sides. The screen is green for right, red for left and amber for rest.",
      "Neck movements alternate right and left (and down and up) on screen. Direction colours for forward, back and sideways.",
      "Leg swings split into forward, back and sideways. Controlled kicks go low, middle, high on each leg.",
      "Flexibility & Kicking: 7 exercises with sets, rests, a progression plan and safety rules.",
      "HIIT Interval Timer (was Training Timer) now counts you in for 5 seconds.",
      "Tools tab sorted into Training, Match and Reference.",
      "Smoother and lighter: fewer screen redraws, a cheaper background and quicker first beep.",
    ],
  },
  {
    id: "2026-10-11-share-calendar",
    date: "11 Oct 2026",
    title: "Share, calendar and your own presets",
    items: [
      "Share an event or announcement with friends.",
      "Add an event to your phone's calendar with a 1-hour reminder.",
      "Save your own HIIT timer presets (press and hold to delete).",
      "Fixed stray symbols such as \"&larr;\" showing in headings.",
    ],
  },
  {
    id: "2026-10-10-fullscreen",
    date: "10 Oct 2026",
    title: "Full-screen timers and Score Counter landscape",
    items: [
      "Full-screen timer and warm-up with a NEXT card shortly before each change.",
      "Score Counter has a manual landscape button and hides the system bars.",
      "Advanced stretches with hold timers.",
    ],
  },
  {
    id: "2026-10-09-updates",
    date: "9 Oct 2026",
    title: "Update notices, sound and push",
    items: [
      "The app tells you when a newer version is available.",
      "Timer beeps, a soft rhythm tick and the screen staying awake in the tools.",
      "Optional push notifications for new posts and events.",
      "Tappable links, in-app post reader and pull to refresh.",
    ],
  },
];

export const LATEST_CHANGE_ID = CHANGELOG[0].id;
