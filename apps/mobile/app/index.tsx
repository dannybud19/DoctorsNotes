import { useRouter } from "expo-router";
import { ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { DottedPath } from "../components/home/DottedPath";
import { ChatIcon, ClipboardIcon, FolderIcon, MicIcon } from "../components/home/icons";
import { home } from "../components/home/palette";
import { ActionButton, Greeting } from "../components/ui";
import { patientName } from "./lib/data";
import { space } from "./lib/theme";

// Screen 1 — Home. A warm greeting, then four large word-labelled actions over a decorative dotted
// path. All presentation lives in components/ui.tsx (Greeting, ActionButton) and components/home/*
// so styling stays separable.
//
// This screen uses its own shell rather than the shared `Screen` component: `Screen`'s white
// background is used by nine other screens, and the home is the only one on the warm cream. Nothing
// here changes where the four actions navigate.
export default function Home() {
  const router = useRouter();
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <DottedPath />
      <ScrollView contentContainerStyle={styles.content}>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: home.cream },
  content: { padding: space.lg, paddingTop: space.xl, gap: space.md },
  actions: { gap: space.md },
});
