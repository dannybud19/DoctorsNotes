import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BackButton, PlainButton, Screen, SectionTitle } from "../components/ui";
import { colors, font, space } from "./lib/theme";

// Screen 4 — Discharge upload (skeleton). No real picker/camera; each button stages a fake document.
export default function Upload() {
  const router = useRouter();
  const [docs, setDocs] = useState<string[]>([]);
  const [pending, setPending] = useState<string | null>(null);

  function stage(kind: string) {
    setPending(`${kind}: discharge note #${docs.length + 1}`);
  }
  function confirm() {
    if (!pending) return;
    setDocs((d) => [pending, ...d]);
    setPending(null);
  }

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.h1}>Add your discharge note</Text>
      <Text style={styles.body}>We'll remind you and help you stay connected to your doctor.</Text>

      <PlainButton label="Choose a file" onPress={() => stage("File")} />
      <PlainButton label="Use camera" onPress={() => stage("Photo")} />

      {pending ? (
        <View style={styles.pending}>
          <Text style={styles.body}>Ready to add — {pending}</Text>
          <PlainButton label="Confirm" onPress={confirm} />
        </View>
      ) : null}

      <SectionTitle>Documents added</SectionTitle>
      {docs.length === 0 ? (
        <Text style={styles.body}>No documents yet.</Text>
      ) : (
        docs.map((d, i) => (
          <Text key={i} style={styles.doc}>
            Document added — {d}
          </Text>
        ))
      )}

      {docs.length > 0 ? (
        <PlainButton label="Continue to recovery" onPress={() => router.push("/recovery")} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  pending: {
    gap: space.sm,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.md,
  },
  doc: { fontSize: font.body, color: colors.text },
});
