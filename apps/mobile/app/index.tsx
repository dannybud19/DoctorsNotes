import { useRouter } from "expo-router";
import { ActionButton, Greeting, Screen } from "../components/ui";
import { patientName } from "./lib/data";

// Screen 1 — Home. A warm greeting, then four large word-labelled actions. "Chat with BeSide" is the
// single visually-primary action. All presentation lives in components/ui.tsx so styling stays separable.
export default function Home() {
  const router = useRouter();
  return (
    <Screen scroll>
      <Greeting name={patientName} />

      <ActionButton label="Consultation History" onPress={() => router.push("/history")} />
      <ActionButton label="Record a Consultation" onPress={() => router.push("/recording")} />
      <ActionButton label="Chat with BeSide" primary onPress={() => router.push("/ask")} />
      <ActionButton label="Update Medical Files" onPress={() => router.push("/upload")} />
    </Screen>
  );
}
