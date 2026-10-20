import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import { useEffect } from "react";
import { LogBox } from "react-native";
import { KeyboardProvider } from "react-native-keyboard-controller";

import { ErrorBoundary } from "@/src/components/error-boundary";
import { queryClient } from "@/src/query-client";
import { hydrateFromSaved, retryWhenBack } from "@/src/offline";
import { pickNextEvent } from "@/src/api";
import { usePushSetup } from "@/src/push";
import { UpdatePrompt } from "@/src/UpdatePrompt";
import { useReminderSync } from "@/src/plan/useReminderSync";
import { PromotionModal } from "@/src/plan/PromotionModal";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true)

export default function RootLayout() {
  useReminderSync(); // keeps training and event reminders in step with the weekly plan
  useEffect(() => {
    hydrateFromSaved(pickNextEvent).catch(() => {}); // show the saved copy right away, refresh from the website behind it
    return retryWhenBack();
  }, []);
  usePushSetup(); // registers for push notifications (does nothing if push isn't configured)

  // One app level ErrorBoundary; a render crash shows a reload screen
  // instead of a blank app.
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <KeyboardProvider>
          <Stack screenOptions={{ headerShown: false }} />
          <UpdatePrompt />
          <PromotionModal />
        </KeyboardProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
