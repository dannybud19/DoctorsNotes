import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AskResponse } from "@medthread/domain";
import { BackButton, ClaimCard } from "../components/ui";
import { MessageBubble } from "../components/chat/MessageBubble";
import { SuggestionChips, type Chip } from "../components/chat/SuggestionChips";
import { Composer } from "../components/chat/Composer";
import { GapList } from "../components/chat/GapList";
import { home } from "../components/home/palette";
import { askResponses, claimGroups, entryId, getClaim, patientName, questions } from "./lib/data";
import { colors, font, space } from "./lib/theme";

// Screen 6 — Chat with MedThread (LIVE, chatbot layout). A scrollable message thread + bottom composer.
// Each factual question POSTs to /api/ask (RETRIEVAL only — never a generated fact); the no_source guard
// is intact. "Questions to ask your doctor" are DERIVED from buildQuestions() (data-driven, never advice).
// On any /api/ask failure the labelled fixture fallback keeps the thread from blanking.

type ChatMessage =
  | { id: string; role: "user"; text: string }
  | { id: string; role: "assistant"; kind: "text"; text: string }
  | { id: string; role: "assistant"; kind: "answer"; response: AskResponse; offline: boolean }
  | { id: string; role: "assistant"; kind: "gaps" };

const CHIPS: Chip[] = [
  { key: "meds", label: "What medicines should I take?" },
  { key: "appts", label: "What are my appointments?" },
  { key: "doctor", label: "What should I ask my doctor?" },
];

const FALLBACK_ORDER = ["answered", "partial", "no_source"] as const;

export default function Ask() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const idRef = useRef(0);
  const fbRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  const nextId = () => `m${idRef.current++}`;
  const add = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
  const openClaim = (category: string, subject: string) =>
    router.push(`/subject/${entryId(category, subject)}`);

  // Intro + a gentle, opt-in nudge toward the knowledge-gap questions (only if any exist).
  useEffect(() => {
    const seed: ChatMessage[] = [
      {
        id: nextId(),
        role: "assistant",
        kind: "text",
        text: `Hi ${patientName}. Ask me about what you were told at the hospital — your medicines, your appointments, your results. I only tell you what your clinicians actually said.`,
      },
    ];
    if (questions.length > 0) {
      seed.push({
        id: nextId(),
        role: "assistant",
        kind: "text",
        text: `I've also spotted a few things that might be worth checking with your doctor. Tap “What should I ask my doctor?” below whenever you're ready.`,
      });
    }
    setMessages(seed);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const t = setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 60);
    return () => clearTimeout(t);
  }, [messages, pending]);

  function fixtureFallback(): AskResponse {
    const kind = FALLBACK_ORDER[fbRef.current % FALLBACK_ORDER.length]!;
    fbRef.current += 1;
    return askResponses[kind] as AskResponse;
  }

  async function sendQuestion(raw: string) {
    const question = raw.trim();
    if (!question || pending) return;
    add({ id: nextId(), role: "user", text: question });
    setInput("");
    setPending(true);
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL;
      if (!apiBase) throw new Error("EXPO_PUBLIC_API_URL is not set.");
      const res = await fetch(`${apiBase}/api/ask`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, groups: claimGroups }),
      });
      const data = (await res.json()) as AskResponse & { message?: string; error?: string };
      if (!res.ok) throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
      add({ id: nextId(), role: "assistant", kind: "answer", response: data, offline: false });
      // If nothing answered it, gently surface what's worth asking the doctor instead.
      if (data.kind === "no_source") add({ id: nextId(), role: "assistant", kind: "gaps" });
    } catch {
      const fb = fixtureFallback();
      add({ id: nextId(), role: "assistant", kind: "answer", response: fb, offline: true });
      if (fb.kind === "no_source") add({ id: nextId(), role: "assistant", kind: "gaps" });
    } finally {
      setPending(false);
    }
  }

  function onPickChip(chip: Chip) {
    if (chip.key === "doctor") {
      add({ id: nextId(), role: "user", text: chip.label });
      add({ id: nextId(), role: "assistant", kind: "gaps" });
      return;
    }
    void sendQuestion(chip.label);
  }

  const cards = (ids: readonly string[]) =>
    ids.map((id) => {
      const c = getClaim(id);
      return c ? <ClaimCard key={id} claim={c} onPress={() => openClaim(c.category, c.subject)} /> : null;
    });

  function AnswerBody({ r }: { r: AskResponse }) {
    if (r.kind === "answered") {
      return (
        <>
          <Text style={styles.answerHead}>Here's what you were told</Text>
          {cards(r.claimIds)}
        </>
      );
    }
    if (r.kind === "partial") {
      return (
        <>
          <Text style={styles.answerHead}>Part of the answer</Text>
          {cards(r.claimIds)}
          <Text style={styles.body}>Still unclear — {r.gap}</Text>
        </>
      );
    }
    return (
      <>
        <Text style={styles.answerHead}>Nobody has told you this yet, and I won't guess.</Text>
        <Text style={styles.body}>{r.suggestedQuestion}</Text>
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <BackButton onPress={() => router.back()} />
        <Text style={styles.title} accessibilityRole="header">
          Chat with MedThread
        </Text>
      </View>

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={8}
      >
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={styles.thread}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((m) => {
            if (m.role === "user") {
              return (
                <MessageBubble key={m.id} role="user">
                  <Text style={styles.body}>{m.text}</Text>
                </MessageBubble>
              );
            }
            if (m.kind === "text") {
              return (
                <MessageBubble key={m.id} role="assistant">
                  <Text style={styles.body}>{m.text}</Text>
                </MessageBubble>
              );
            }
            if (m.kind === "gaps") {
              return (
                <MessageBubble key={m.id} role="assistant">
                  <GapList questions={questions} onOpenClaim={(c) => openClaim(c.category, c.subject)} />
                </MessageBubble>
              );
            }
            return (
              <MessageBubble key={m.id} role="assistant">
                {m.offline ? <Text style={styles.offline}>Showing a sample answer — offline.</Text> : null}
                <AnswerBody r={m.response} />
              </MessageBubble>
            );
          })}
          {pending ? (
            <MessageBubble role="assistant">
              <Text style={styles.body}>Looking through what you've been told…</Text>
            </MessageBubble>
          ) : null}
        </ScrollView>

        <SuggestionChips chips={CHIPS} onPick={onPickChip} />
        <Composer
          value={input}
          onChangeText={setInput}
          onSend={() => void sendQuestion(input)}
          disabled={pending}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: home.cream },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  title: { fontSize: font.heading, fontWeight: "800", color: colors.text },
  thread: { padding: space.lg, gap: space.md },
  answerHead: { fontSize: font.heading, fontWeight: "800", color: colors.text, lineHeight: 32 },
  body: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  offline: { fontSize: font.label, fontWeight: "700", color: colors.textMuted },
});
