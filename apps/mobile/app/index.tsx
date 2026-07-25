import { StatusBar } from "expo-status-bar";
import { StyleSheet, Text, View } from "react-native";
import type { ClaimGroupStatus } from "@doctorsnotes/domain";

// Type-only import from the shared domain proves the boundary works with NO AI and no runtime
// coupling. Plain-language labels for each reconciler status — dignity, not diagnostics.
const STATUS_LABEL: Record<ClaimGroupStatus, string> = {
  agreed: "Everyone agrees on this",
  worth_confirming: "This seems worth asking about",
  uncorroborated: "Only one person mentioned this",
};

export default function Home() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>DoctorsNotes</Text>
      <Text style={styles.body}>
        Record what's said at your bedside. Photograph the paper you're handed. See what's happening
        to you — in the clinician's exact words.
      </Text>
      <Text style={styles.status}>{STATUS_LABEL.worth_confirming}</Text>
      <StatusBar style="auto" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: "center", padding: 28, gap: 20 },
  title: { fontSize: 40, fontWeight: "700" },
  body: { fontSize: 22, lineHeight: 32 },
  status: { fontSize: 20, fontWeight: "600", marginTop: 8 },
});
