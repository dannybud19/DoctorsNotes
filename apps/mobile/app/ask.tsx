import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { Animated, KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import type { AskResponse, GeneratedQuestion } from "@medthread/domain";
import { WarmBack } from "../components/warmUi";
import { MessageBubble } from "../components/chat/MessageBubble";
import { AnswerText } from "../components/chat/AnswerText";
import { QuestionsToAsk, type QAItem } from "../components/chat/QuestionsToAsk";
import { SuggestionChips, type Chip } from "../components/chat/SuggestionChips";
import { Composer } from "../components/chat/Composer";
import { warm } from "../components/warm";
import {
  askResponses,
  claimGroups,
  entryId,
  generatedQuestionsFallback,
  getClaim,
  patientName,
  questions,
} from "./lib/data";
import { colors, font, space } from "./lib/theme";

// Screen 6 — Chat with MedThread (LIVE, ChatGPT-style). Factual questions POST to /api/ask, which now
// returns a grounded plain-language answer (answerText) + server-derived citations — every sentence
// traces to a real claim; no source → no_source (guard intact). "What should I ask my doctor?" fetches
// deeper AI-generated, claim-grounded questions from /api/questions. Both keep a fixture fallback.

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

// Deterministic discrepancy questions (buildQuestions) → the compact "also worth clarifying" section.
const EVERYONE_QA: QAItem[] = questions.map((q) => ({
  id: q.id,
  prompt: q.prompt,
  claimIds: q.fromClaims.map((c) => c.id),
}));

export default function Ask() {
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [generated, setGenerated] = useState<GeneratedQuestion[] | null>(null);
  const [genPending, setGenPending] = useState(false);
  const idRef = useRef(0);
  const fbRef = useRef(0);
  const scrollRef = useRef<ScrollView>(null);

  const nextId = () => `m${idRef.current++}`;
  const add = (m: ChatMessage) => setMessages((prev) => [...prev, m]);
  const openClaim = (claimId: string) => {
    const c = getClaim(claimId);
    if (c) router.push(`/subject/${entryId(c.category, c.subject)}`);
  };

  useEffect(() => {
    const seed: ChatMessage[] = [
      {
        id: nextId(),
        role: "assistant",
        kind: "text",
        text: `Hi ${patientName}. Ask me about what you were told at the hospital — your medicines, your appointments, your results. I only tell you what your clinicians actually said, and I'll show you who said it.`,
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
  }, [messages, pending, genPending, generated]);

  // The suggestion pills fade away while a reply is being fetched, and fade back in once it lands.
  const [chipsMounted, setChipsMounted] = useState(true);
  const chipsOpacity = useRef(new Animated.Value(1)).current;
  const showChips = !pending && !genPending;
  useEffect(() => {
    if (showChips) {
      setChipsMounted(true);
      Animated.timing(chipsOpacity, { toValue: 1, duration: 220, useNativeDriver: false }).start();
    } else {
      Animated.timing(chipsOpacity, { toValue: 0, duration: 160, useNativeDriver: false }).start((res) => {
        if (res.finished) setChipsMounted(false);
      });
    }
  }, [showChips, chipsOpacity]);

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
      if (data.kind === "no_source") add({ id: nextId(), role: "assistant", kind: "gaps" });
    } catch {
      const fb = fixtureFallback();
      add({ id: nextId(), role: "assistant", kind: "answer", response: fb, offline: true });
      if (fb.kind === "no_source") add({ id: nextId(), role: "assistant", kind: "gaps" });
    } finally {
      setPending(false);
    }
  }

  async function fetchGenerated() {
    if (generated !== null || genPending) return;
    setGenPending(true);
    try {
      const apiBase = process.env.EXPO_PUBLIC_API_URL;
      if (!apiBase) throw new Error("EXPO_PUBLIC_API_URL is not set.");
      const res = await fetch(`${apiBase}/api/questions`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ groups: claimGroups }),
      });
      const data = (await res.json()) as { questions?: GeneratedQuestion[] };
      if (!res.ok || !Array.isArray(data.questions)) throw new Error("bad response");
      setGenerated(data.questions);
    } catch {
      setGenerated(generatedQuestionsFallback);
    } finally {
      setGenPending(false);
    }
  }

  function onPickChip(chip: Chip) {
    if (chip.key === "doctor") {
      add({ id: nextId(), role: "user", text: chip.label });
      add({ id: nextId(), role: "assistant", kind: "gaps" });
      void fetchGenerated();
      return;
    }
    void sendQuestion(chip.label);
  }

  const generatedQA: QAItem[] = (generated ?? []).map((q) => ({
    id: q.id,
    prompt: q.prompt,
    claimIds: q.fromClaimIds,
  }));

  function renderAnswer(response: AskResponse, offline: boolean) {
    return (
      <>
        {offline ? <Text style={styles.offline}>Sample answer — offline.</Text> : null}
        {response.kind === "no_source" ? (
          <>
            <Text style={styles.body}>Nobody has told you this yet, and I won't guess.</Text>
            <Text style={styles.body}>{response.suggestedQuestion}</Text>
          </>
        ) : (
          <AnswerText response={response} onOpenClaim={openClaim} />
        )}
      </>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <View style={styles.header}>
        <WarmBack onPress={() => router.back()} />
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
                  <QuestionsToAsk
                    generated={generatedQA}
                    everyone={EVERYONE_QA}
                    pending={genPending}
                    onOpenClaim={openClaim}
                  />
                </MessageBubble>
              );
            }
            return (
              <MessageBubble key={m.id} role="assistant">
                {renderAnswer(m.response, m.offline)}
              </MessageBubble>
            );
          })}
          {pending ? (
            <MessageBubble role="assistant">
              <Text style={styles.body}>Looking through what you've been told…</Text>
            </MessageBubble>
          ) : null}
        </ScrollView>

        {chipsMounted ? (
          <Animated.View style={{ opacity: chipsOpacity }}>
            <SuggestionChips chips={CHIPS} onPick={onPickChip} />
          </Animated.View>
        ) : null}
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
  safe: { flex: 1, backgroundColor: warm.cream },
  flex: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingHorizontal: space.lg,
    paddingTop: space.sm,
  },
  title: { fontSize: font.heading, fontWeight: "800", color: colors.text },
  thread: { padding: space.lg, gap: space.sm },
  body: { fontSize: font.body, color: colors.text, lineHeight: 28 },
  offline: { fontSize: font.label, fontWeight: "700", color: colors.textMuted, marginBottom: 2 },
});
