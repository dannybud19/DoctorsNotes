import { AudioModule, RecordingPresets, setAudioModeAsync, useAudioRecorder } from "expo-audio";
import { useRouter } from "expo-router";
import { useEffect, useRef, useState } from "react";
import { ActivityIndicator, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { PulseHalo } from "../components/recording/PulseHalo";
import { WaveformBars } from "../components/recording/WaveformBars";
import { PauseButton, StopButton } from "../components/recording/controls";
import { useAmplitude } from "../components/recording/useAmplitude";
import { warm } from "../components/warm";
import { todayLabel } from "./lib/data";
import { clearLiveClaims, setLiveClaims } from "./lib/liveSession";
import { colors, font, HIT_SLOP, MIN_TOUCH, space } from "./lib/theme";

type Phase = "starting" | "recording" | "uploading" | "error";

// Screen 2 — Recording (LIVE). Records real audio, uploads to /api/extract on hold-to-stop, then
// navigates to the session screen which renders the returned claims. On failure, a sample fallback
// keeps the demo working with no network.
//
// The capture pipeline below is unchanged from the original screen; this revision adds pause/resume
// and the warm visual treatment. Two functional notes:
//   - `isMeteringEnabled` is added to the recorder options so the halo can follow the speaker's
//     voice. It does not change the audio format, the file written, or the upload payload.
//   - Elapsed time is an ACCUMULATED total rather than `now - start`, because pause has to stop the
//     clock as well as the microphone.
export default function Recording() {
  const router = useRouter();
  const recorder = useAudioRecorder({ ...RecordingPresets.HIGH_QUALITY!, isMeteringEnabled: true });
  const [phase, setPhase] = useState<Phase>("starting");
  const [errorMsg, setErrorMsg] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [holdProgress, setHoldProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  /** Time banked by earlier run segments; the current segment is added on top while running. */
  const bankedRef = useRef(0);
  const segmentStartRef = useRef(0);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const holdRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Two signals from one microphone: `level` is fast (bars), `envelope` is lazy (halo).
  const { level, envelope } = useAmplitude(recorder, phase === "recording" && !paused);

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
        bankedRef.current = 0;
        segmentStartRef.current = Date.now();
        setPhase("recording");
        startTicking();
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

  function startTicking() {
    if (tickRef.current) return;
    tickRef.current = setInterval(
      () => setElapsedMs(bankedRef.current + (Date.now() - segmentStartRef.current)),
      100,
    );
  }
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

  /** Pause/resume both the microphone and the clock, so the timer never counts silence. */
  function togglePause() {
    if (phase !== "recording") return;
    if (paused) {
      recorder.record();
      segmentStartRef.current = Date.now();
      setPaused(false);
      startTicking();
    } else {
      recorder.pause();
      bankedRef.current += Date.now() - segmentStartRef.current;
      if (tickRef.current) clearInterval(tickRef.current);
      tickRef.current = null;
      setElapsedMs(bankedRef.current);
      setPaused(true);
    }
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
      <Shell>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={warm.terracotta} />
          <Text style={styles.big}>Transcribing…</Text>
          <Text style={styles.sub}>This takes a few seconds.</Text>
        </View>
      </Shell>
    );
  }

  if (phase === "error") {
    return (
      <Shell>
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
      </Shell>
    );
  }

  // starting | recording
  return (
    <Shell>
      <Text style={styles.date} accessibilityRole="header">
        {todayLabel}
      </Text>

      <View style={styles.stage}>
        <PulseHalo amplitude={envelope} />
        <View style={styles.controls}>
          <PauseButton paused={paused} onPress={togglePause} />
          <View style={styles.capsule}>
            <WaveformBars amplitude={level} />
          </View>
          <StopButton progress={holdProgress} onPressIn={startHold} onPressOut={endHold} />
        </View>
      </View>

      <Text
        style={styles.elapsed}
        accessibilityLabel={`${paused ? "Paused" : "Recording"}, ${formatClock(elapsedMs)} elapsed`}
      >
        {formatClock(elapsedMs)}
      </Text>
      <Text style={styles.status}>
        {phase === "starting" ? "Starting the microphone…" : paused ? "Paused" : "Listening"}
      </Text>

      <View style={styles.divider} />

      {/*
        Live transcript area — intentionally empty.
        Owned by the backend work: this is where streamed turns will render. Leaving it blank rather
        than filling it with placeholder text, so nothing here can be mistaken for something a
        clinician actually said.
      */}
      <View style={styles.transcript} />

      <Pressable
        onPress={useSample}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Use a sample session instead"
        style={styles.link}
      >
        <Text style={styles.linkText}>Use sample session</Text>
      </Pressable>
    </Shell>
  );
}

/** Warm screen shell. Not the shared `Screen`, whose white background nine other screens rely on. */
function Shell({ children }: { children: React.ReactNode }) {
  return (
    <SafeAreaView style={styles.safe} edges={["top", "bottom"]}>
      <ScrollView contentContainerStyle={styles.content}>{children}</ScrollView>
    </SafeAreaView>
  );
}

/** hh:mm:ss — matches the design's 00:00:00 readout. */
function formatClock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: warm.cream },
  // Tight vertical rhythm: the capture cluster is one compact unit so the transcript below it gets
  // the remaining screen. Horizontal padding stays generous.
  content: { paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.lg, gap: 2 },
  date: { fontSize: font.label, fontWeight: "700", color: warm.inkMuted, textAlign: "center" },

  /** Just tall enough for the halo's widest swell; keeps the layout below from shifting. */
  stage: { height: 208, alignItems: "center", justifyContent: "center" },
  controls: { flexDirection: "row", alignItems: "center", gap: space.sm },
  capsule: {
    minHeight: 64,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: warm.hairline,
    backgroundColor: warm.card,
    paddingHorizontal: space.md,
    alignItems: "center",
    justifyContent: "center",
  },

  elapsed: {
    fontSize: font.title,
    fontWeight: "800",
    color: warm.ink,
    textAlign: "center",
    fontVariant: ["tabular-nums"],
  },
  status: { fontSize: 15, color: warm.inkMuted, textAlign: "center" },

  divider: { height: 1, backgroundColor: warm.hairline, marginTop: space.md, marginBottom: space.sm },
  /** Reserved for the live transcript — the tall region the compact header above frees up. */
  transcript: { minHeight: 260 },

  center: { alignItems: "center", gap: space.md, paddingVertical: space.xl },
  big: { fontSize: font.heading, fontWeight: "800", color: warm.ink },
  sub: { fontSize: font.body, color: warm.inkMuted, textAlign: "center" },
  errorTitle: { fontSize: font.heading, fontWeight: "800", color: warm.ink, textAlign: "center" },
  errorMsg: { fontSize: font.body, color: warm.inkMuted, textAlign: "center", lineHeight: 30 },
  primaryBtn: {
    minHeight: MIN_TOUCH,
    borderRadius: 999,
    backgroundColor: warm.terracotta,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: space.xl,
  },
  primaryBtnText: { fontSize: font.label, fontWeight: "700", color: colors.onPrimary },
  secondaryBtn: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center" },
  secondaryBtnText: { fontSize: font.label, fontWeight: "700", color: warm.terracotta },
  link: { minHeight: MIN_TOUCH, alignItems: "center", justifyContent: "center", marginTop: space.sm },
  linkText: { fontSize: font.label, fontWeight: "700", color: warm.terracotta },
});
