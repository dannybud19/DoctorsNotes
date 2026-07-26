import { useRouter } from "expo-router";
import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DottedPath } from "../components/home/DottedPath";
import { ChatIcon, ClipboardIcon, FolderIcon, MicIcon } from "../components/home/icons";
import { warm } from "../components/warm";
import { ActionButton, Greeting } from "../components/ui";
import { PhaseSwitch } from "../components/PhaseSwitch";
import { patientName } from "./lib/data";
import { clearDischarge, isDischarged, RECOVERY_ROUTE, setDischarged } from "./lib/dischargeState";
import { font, HIT_SLOP, space } from "./lib/theme";

// Screen 1 — Home. A warm greeting, then four large word-labelled actions over a decorative dotted
// path. All presentation lives in components/ui.tsx (Greeting, ActionButton) and components/home/*
// so styling stays separable.
//
// This screen uses its own shell rather than the shared `Screen` component: `Screen`'s white
// background is used by nine other screens, and the home is the only one on the warm cream. Nothing
// here changes where the four actions navigate.
export default function Home() {
  const router = useRouter();
  // `bump` re-renders after the demo toggle flips the (module-level) discharge flag.
  const [, bump] = useState(0);
  const discharged = isDischarged();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <DottedPath />
      <ScrollView contentContainerStyle={styles.content}>
        {/* Once discharged, let the patient move back to the recovery dashboard (and back again). */}
        {discharged ? <PhaseSwitch current="admitted" /> : null}
        <Greeting name={patientName} />

        <View style={styles.actions}>
          <ActionButton
            label="Consultation history"
            icon={<ClipboardIcon />}
            onPress={() => router.push("/history")}
          />
          <ActionButton
            label="Record a consultation"
            icon={<MicIcon />}
            onPress={() => router.push("/recording")}
          />
          <ActionButton
            label="Chat with MedThread"
            icon={<ChatIcon />}
            onPress={() => router.push("/ask")}
          />
          <ActionButton
            label="Update medical files"
            icon={<FolderIcon />}
            onPress={() => router.push("/upload")}
          />
        </View>

        {/* DEMO-ONLY: flips the discharge phase with no backend, so the Home ⇄ Recovery toggle is
            reachable in an offline demo. Remove before production. */}
        <Pressable
          onPress={() => {
            if (discharged) {
              clearDischarge();
              bump((n) => n + 1);
            } else {
              setDischarged(true);
              router.replace(RECOVERY_ROUTE);
            }
          }}
          hitSlop={HIT_SLOP}
          accessibilityRole="button"
          accessibilityLabel={discharged ? "Reset demo" : "Simulate discharge for the demo"}
          style={styles.demo}
        >
          <Text style={styles.demoText}>{discharged ? "Reset demo" : "Simulate discharge (demo)"}</Text>
        </Pressable>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: warm.cream },
  content: { padding: space.lg, paddingTop: space.xl, gap: space.md },
  actions: { gap: space.md },
  demo: { alignSelf: "center", paddingVertical: space.sm, marginTop: space.md },
  demoText: { fontSize: font.label, color: warm.inkMuted, textDecorationLine: "underline" },
});
