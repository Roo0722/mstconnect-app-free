import { useEffect, useMemo } from "react";
import { AppState } from "react-native";
import { useActivities } from "../game/store";
import { dayStart } from "./engine";
import { usePlan } from "./store";
import { syncReminders } from "./notify";

// Keeps the phone's reminders in step with the plan, the training log and MSTC events.
export function useReminderSync() {
  const { plan, loaded } = usePlan();
  const { activities, loaded: logLoaded } = useActivities();
  const planKey = JSON.stringify(plan);
  const trainedToday = useMemo(() => {
    const today = dayStart(Date.now());
    return activities.some((a) => dayStart(a.end) === today);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activities]);

  useEffect(() => {
    if (!loaded || !logLoaded) return;
    const t = setTimeout(() => syncReminders(trainedToday), 2500); // let the app finish loading first
    const sub = AppState.addEventListener("change", (s) => {
      if (s === "active") syncReminders(trainedToday);
    });
    return () => {
      clearTimeout(t);
      sub.remove();
    };
  }, [planKey, trainedToday, loaded, logLoaded]);
}
