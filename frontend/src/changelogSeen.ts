// Remembers which "What's New" entry you last opened, so the More tab can show a NEW dot.
import { useCallback, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useFocusEffect } from "expo-router";
import { LATEST_CHANGE_ID } from "./changelog";

const KEY = "mstc:changelog:seen";

export function markChangelogSeen() {
  AsyncStorage.setItem(KEY, LATEST_CHANGE_ID).catch(() => {});
}

// true when there is an entry you have not opened yet (a first install shows it too, which is fine)
export function useChangelogUnseen() {
  const [unseen, setUnseen] = useState(false);
  useFocusEffect(
    useCallback(() => {
      AsyncStorage.getItem(KEY)
        .then((v) => setUnseen(v !== LATEST_CHANGE_ID))
        .catch(() => {});
    }, []),
  );
  return unseen;
}
