import { useRouter } from "expo-router";
import { useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { BackButton, ClaimCard, Field, PlainButton, Screen, SectionTitle } from "../components/ui";
import { askResponses, entryId, getClaim } from "./lib/data";
import { colors, font, space } from "./lib/theme";

const VARIANTS = ["answered", "partial", "no_source"] as const;

// Screen 6 — Ask (skeleton). Cycles the three AskResponse fixture variants on each "Ask".
export default function Ask() {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [i, setI] = useState<number | null>(null);
  const open = (category: string, subject: string) => router.push(`/subject/${entryId(category, subject)}`);
  const variant = i === null ? null : VARIANTS[i];

  function ask() {
    setI((prev) => (prev === null ? 0 : (prev + 1) % VARIANTS.length));
  }

  function cards(ids: readonly string[]) {
    return ids.map((id) => {
      const c = getClaim(id);
      return c ? <ClaimCard key={id} claim={c} onPress={() => open(c.category, c.subject)} /> : null;
    });
  }

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.h1}>Ask</Text>
      <Field label="Your question" value={q} onChangeText={setQ} placeholder="e.g. What is my metoprolol dose?" />
      <PlainButton label="Ask" onPress={ask} />

      {variant === "answered" ? (
        <View style={styles.block}>
          <SectionTitle>Here's what you were told</SectionTitle>
          {cards(askResponses.answered.claimIds)}
        </View>
      ) : null}

      {variant === "partial" ? (
        <View style={styles.block}>
          <SectionTitle>Part of the answer</SectionTitle>
          {cards(askResponses.partial.claimIds)}
          <Text style={styles.gap}>Still unclear — {askResponses.partial.gap}</Text>
        </View>
      ) : null}

      {variant === "no_source" ? (
        <View style={styles.block}>
          <Text style={styles.noSource}>Nobody has told you this yet, and I won't guess.</Text>
          <Text style={styles.body}>{askResponses.no_source.suggestedQuestion}</Text>
          <Text style={styles.saved}>Saved to ask tomorrow.</Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  block: { gap: space.sm, marginTop: space.md },
  gap: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  noSource: { fontSize: font.heading, fontWeight: "800", color: colors.text, lineHeight: 32 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  saved: { fontSize: font.label, fontWeight: "700", color: colors.textMuted },
});
