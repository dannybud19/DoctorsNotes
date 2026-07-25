import { useRouter } from "expo-router";
import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { MicButton, Screen } from "../components/ui";
import { clearLiveClaims, setLiveClaims } from "./lib/liveSession";
import { colors, font, HIT_SLOP, MIN_TOUCH, record, space } from "./lib/theme";

type Phase = "starting" | "recording" | "uploading" | "error";

// Screen 2 — Recording (LIVE). Records real audio, uploads to /api/extract on hold-to-stop, then
// navigates to the session screen which renders the returned claims. On failure, a sample fallback
// keeps the demo working with no network.
export default function Recording() {
  const router = useRouter();
  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY!);
  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const startRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const perm = await AudioModule.requestRecordingPermissionsAsync();
        if (!perm.granted) {
          if (active) fail("Microphone access is needed to record. You can still use a sample session.");
          return;
        }
        await setAudioModeAsync({ allowsRecording: true, playsInSilentMode: true });
        await recorder.prepareToRecordAsync();
        recorder.record();
        if (!active) return;
        startRef.current = Date.now();
        setPhase("recording");
        tickRef.current = setInterval(() => setElapsedMs(Date.now() - startRef.current), 100);
      } catch (e) {
        if (active) fail(e instanceof Error ? e.message : "Couldn't start recording.");
      }
    })();
    return () => {
      active = false;
      clearTimers();
      recorder.stop().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function clearTimers() {
    if (tickRef.current) clearInterval(tickRef.current);
    if (holdRef.current) clearInterval(holdRef.current);
    tickRef.current = null;
    holdRef.current = null;
  }
  function fail(message: string) {
    clearTimers();
    setErrorMsg(message);
    setPhase("error");
  }

  async function finishAndUpload() {
    clearTimers();
    setPhase("uploading");
    try {
      await recorder.stop();
      const uri = recorder.uri;
      if (!uri) throw new Error("No audio was captured.");
      const apiBase = process.env.EXPO_PUBLIC_API_URL;
      if (!apiBase) throw new Error("EXPO_PUBLIC_API_URL is not set.");

      const form = new FormData();
      if (Platform.OS === "web") {
        const blob = await (await fetch(uri)).blob();
        form.append("audio", blob, "recording.webm");
      } else {
        // React Native's FormData accepts a { uri, name, type } file descriptor.
        form.append("audio", { uri, name: "recording.m4a", type: "audio/m4a" } as unknown as Blob);
      }
      form.append("patientId", "synthetic-patient-1");
      form.append("recordingId", `rec-${Date.now()}`);

      const res = await fetch(`${apiBase}/api/extract`, { method: "POST", body: form });
      const data = (await res.json()) as { claims?: unknown; message?: string; error?: string };
      if (!res.ok) {
        throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
      }
      setLiveClaims((data.claims ?? []) as never);
      router.replace("/session");
    } catch (e) {
      fail(e instanceof Error ? e.message : "Something went wrong uploading the recording.");
    }
  }

  function startHold() {
    if (phase !== "recording") return;
    const holdStart = Date.now();
    holdRef.current = setInterval(() => {
      const p = Math.min(1, (Date.now() - holdStart) / 1500);
      setHoldProgress(p);
      if (p >= 1) {
        if (holdRef.current) clearInterval(holdRef.current);
        holdRef.current = null;
        setHoldProgress(0);
        void finishAndUpload();
      }
    }, 30);
  }
  function endHold() {
    if (holdRef.current) clearInterval(holdRef.current);
    holdRef.current = null;
    setHoldProgress(0);
  }

  function useSample() {
    clearLiveClaims();
    router.replace("/session");
  }

  if (phase === "uploading") {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.big}>Transcribing…</Text>
          <Text style={styles.sub}>This takes a few seconds.</Text>
        </View>
      </Screen>
    );
  }

  if (phase === "error") {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>We couldn't process that recording</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <Pressable
            onPress={useSample}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Use a sample session instead"
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Use sample session</Text>
          </Pressable>
          <Pressable
            onPress={() => router.replace("/recording")}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Try recording again"
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  // starting | recording
  return (
    <Screen scroll>
      <View style={styles.hero}>
        <MicButton label={phase === "recording" ? "Recording" : "Starting…"} active />
        <Text style={styles.elapsed} accessibilityLabel={`Recording, ${formatClock(elapsedMs)} elapsed`}>
          {formatClock(elapsedMs)}
        </Text>

        {phase === "recording" ? (
          <Pressable
            onPressIn={startHold}
            onPressOut={endHold}
            accessibilityRole="button"
            accessibilityLabel="Hold to stop recording"
            style={styles.holdBtn}
          >
            <View style={[styles.holdFill, { width: `${Math.round(holdProgress * 100)}%` }]} />
            <Text style={styles.holdLabel}>Hold to stop</Text>
          </Pressable>
        ) : (
          <View style={styles.center}>
            <ActivityIndicator color={colors.primary} />
            <Text style={styles.sub}>Starting the microphone…</Text>
          </View>
        )}
      </View>

      <Pressable
        onPress={useSample}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Use a sample session instead"
        style={styles.link}
      >
        <Text style={styles.linkText}>Use sample session</Text>
      </Pressable>
    </Screen>
  );
}

function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

const styles = StyleSheet.create({
  hero: { alignItems: "center", gap: space.md, marginTop: space.lg },
  center: { alignItems: "center", gap: space.md, paddingVertical: space.lg },
  elapsed: { fontSize: font.huge, fontWeight: "800", color: colors.text, fontVariant: ["tabular-nums"] },
  big: { fontSize: font.heading, fontWeight: "800", color: colors.text },
  sub: { fontSize: font.body, color: colors.textMuted, textAlign: "center" },
  holdBtn: {
    minHeight: MIN_TOUCH,
    minWidth: 220,
    borderRadius: 14,
    borderWidth: 2,
    borderColor: record.active,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.lg,
  },
  holdFill: { position: "absolute", left: 0, top: 0, bottom: 0, backgroundColor: "#f3d9d7" },
  holdLabel: { fontSize: font.label, fontWeight: "700", color: record.active },
  errorTitle: { fontSize: font.heading, fontWeight: "800", color: colors.text, textAlign: "center" },
  errorMsg: { fontSize: font.body, color: colors.textMuted, textAlign: "center", lineHeight: 30 },
  primaryBtn: {
    minHeight: MIN_TOUCH,
    borderRadius: 14,
    backgroundColor: colors.primary,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  primaryBtnText: { fontSize: font.label, fontWeight: "700", color: colors.onPrimary },
  secondaryBtn: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: font.label, fontWeight: "700", color: colors.primary },
  link: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center", marginTop: space.lg },
  linkText: { fontSize: font.label, fontWeight: "700", color: colors.primary },
});
