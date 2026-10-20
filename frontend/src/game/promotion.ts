import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useGame } from "./store";

const KEY = "mstc:rank-level"; // the highest level the player has been shown, so a promotion is celebrated once

// What to do when the level is known: nothing, remember the new level quietly, or celebrate.
export function promotionDecision(seen: number | null, level: number): "none" | "remember" | "celebrate" {
  if (seen === null) return "remember"; // first launch with this feature: no retroactive party
  if (level < seen) return "remember"; // a new season or cleared data brought the level down
  if (level > seen) return "celebrate";
  return "none";
}

// Beta-only "Preview promotion" button (About screen): shows the screen with your current rank, changes nothing.
const previewListeners = new Set<() => void>();
export function previewPromotion() {
  previewListeners.forEach((f) => f());
}

export function usePromotion() {
  const { game, loaded } = useGame();
  const [pending, setPending] = useState<number | null>(null);
  const [preview, setPreview] = useState(false);
  useEffect(() => {
    const f = () => setPreview(true);
    previewListeners.add(f);
    return () => {
      previewListeners.delete(f);
    };
  }, []);

  useEffect(() => {
    if (!loaded) return;
    let alive = true;
    (async () => {
      const raw = await AsyncStorage.getItem(KEY).catch(() => null);
      const seen = raw === null ? null : Number(raw);
      const what = promotionDecision(Number.isFinite(seen as number) ? seen : null, game.level);
      if (!alive) return;
      if (what === "remember") AsyncStorage.setItem(KEY, String(game.level)).catch(() => {});
      else if (what === "celebrate") setPending(game.level);
    })();
    return () => {
      alive = false;
    };
  }, [loaded, game.level]);

  const dismiss = useCallback(() => {
    if (preview) {
      setPreview(false);
      return;
    }
    if (pending !== null) AsyncStorage.setItem(KEY, String(pending)).catch(() => {});
    setPending(null);
  }, [pending, preview]);

  return { game, level: preview ? game.level : pending, dismiss };
}
