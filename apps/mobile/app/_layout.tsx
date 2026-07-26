import { Stack } from "expo-router";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { warm } from "../components/warm";

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <Stack
        screenOptions={{
          headerShown: false,
          // Cream, matching the screens. This shows during transitions and overscroll; leaving it
          // white made a pale flash between two cream screens. Screens that still set their own
          // background (via `Screen` in components/ui.tsx) are unaffected.
          contentStyle: { backgroundColor: warm.cream },
        }}
      />
    </SafeAreaProvider>
  );
}
