/**
 * Live microphone loudness for the recording visuals, as an `Animated.Value` in 0–1.
 *
 * The visuals must MEAN something: they move when someone is speaking and hold still when nobody is.
 * That requires a real signal on both platforms, plus a noise gate so room tone doesn't animate it.
 *
 * WHERE THE SIGNAL COMES FROM
 *
 *  - Native: `recorder.getStatus().metering`, reported in dBFS.
 *  - Web: `expo-audio` reports no level at all — its `getStatus()` returns only
 *    `{canRecord, isRecording, durationMillis, mediaServicesDidReset, url}`. But its web recorder
 *    holds a `MediaRecorder`, and the standard `MediaRecorder.stream` property exposes the very
 *    microphone stream it is already capturing. Attaching a Web Audio `AnalyserNode` to that stream
 *    gives real amplitude with ONE microphone, ONE permission prompt and no competing capture.
 *
 * CAVEAT: `mediaRecorder` is an internal field of `AudioRecorderWeb`, not part of expo-audio's
 * public typed API. It works today and could change on upgrade, so it is feature-detected. If the
 * stream is ever unreachable we warn loudly and fall back to a slow breathing loop, so the screen
 * degrades visibly rather than silently freezing.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";

/** What we need from the recorder. Kept minimal so this hook isn't coupled to expo-audio's types. */
export type MeteringSource = {
  getStatus: () => { metering?: number };
};

// ---------------------------------------------------------------------------------------------
// Tuning. Every knob lives here — "too twitchy" or "not sensitive enough" is a one-line change.
// ---------------------------------------------------------------------------------------------

/** How often we sample. ~60fps on web (rAF); this interval is the native poll. */
const SAMPLE_MS = 60;

/**
 * NOISE GATE, with hysteresis.
 *
 * Below `GATE_CLOSE` the target is exactly 0, so the halo and bars hold their resting shape and do
 * not move at all. The gap between open and close is what stops the gate chattering when someone is
 * sitting right on the threshold — it must be crossed properly in each direction to flip.
 */
const GATE_OPEN = 0.12;
const GATE_CLOSE = 0.08;

/**
 * ASYMMETRIC SMOOTHING for the WAVEFORM BARS. Rising fast and falling slow is what reads as a
 * "spike" rather than a wobble: speech snaps the bars up, then lets them ease back down.
 */
const ATTACK = 0.6;
const RELEASE = 0.12;

/**
 * ENVELOPE SMOOTHING for the HALO — deliberately much lazier than the bars above.
 *
 * The bars want per-syllable detail; the halo does not. Driving a large soft glow from the same
 * fast signal makes it jitter and read as random. These rates make it follow the overall loudness of
 * a sentence instead, so it swells and settles. At ~60fps this trails the voice by roughly 150ms
 * rising and 400ms falling — a slight, intentional delay in exchange for smooth motion.
 */
const ENVELOPE_ATTACK = 0.1;
const ENVELOPE_RELEASE = 0.04;

/** Native metering window in dBFS. A bedside voice at arm's length sits around −35…−20. */
const DB_QUIET = -55;
const DB_LOUD = -18;

/**
 * Web RMS window. `getByteTimeDomainData` is 0–255 centred on 128, so RMS of the normalised signal
 * runs 0–1 in theory but ordinary speech lands roughly 0.02–0.2 in practice.
 */
const RMS_QUIET = 0.015;
const RMS_LOUD = 0.25;

/**
 * Everything here is JS-driven (`useNativeDriver: false`) on purpose. We push a fresh sample with
 * `setValue` roughly every frame, so the native driver would buy nothing — and mixing `setValue`
 * with natively-driven animations on the same `Animated.Value` throws at runtime.
 */
const USE_NATIVE_DRIVER = false;

const clamp01 = (n: number) => (n < 0 ? 0 : n > 1 ? 1 : n);

function normalize(value: number, quiet: number, loud: number): number {
  if (!Number.isFinite(value)) return 0;
  return clamp01((value - quiet) / (loud - quiet));
}

/**
 * The web recorder's internals. Deliberately narrow and optional — everything here is checked at
 * runtime before use, because none of it is part of expo-audio's public contract.
 */
type WebRecorderInternals = { mediaRecorder?: { stream?: MediaStream | null } | null };

function getRecorderStream(recorder: unknown): MediaStream | null {
  const stream = (recorder as WebRecorderInternals | null)?.mediaRecorder?.stream;
  return stream instanceof MediaStream ? stream : null;
}

/** Two views of the same microphone: a responsive one and a lazy one. */
export type Amplitude = {
  /** Fast, per-syllable detail. Drives the waveform bars. */
  level: Animated.Value;
  /** Slow overall loudness. Drives the halo, which jitters if fed the fast signal. */
  envelope: Animated.Value;
};

/**
 * @param recorder the active recorder, or null when there is nothing to measure
 * @param active   false while paused, starting, uploading or errored — both values settle to 0
 */
export function useAmplitude(recorder: MeteringSource | null, active: boolean): Amplitude {
  const level = useRef(new Animated.Value(0)).current;
  const envelope = useRef(new Animated.Value(0)).current;
  /** Smoothed values carried between samples, so attack/release survive re-renders. */
  const levelRef = useRef(0);
  const envelopeRef = useRef(0);
  /** Gate state, kept across samples so the hysteresis has something to compare against. */
  const gateOpenRef = useRef(false);

  useEffect(() => {
    if (!active) {
      levelRef.current = 0;
      envelopeRef.current = 0;
      gateOpenRef.current = false;
      const settle = (v: Animated.Value) =>
        Animated.timing(v, {
          toValue: 0,
          duration: 260,
          easing: Easing.out(Easing.quad),
          useNativeDriver: USE_NATIVE_DRIVER,
        });
      Animated.parallel([settle(level), settle(envelope)]).start();
      return;
    }

    /** Feed one raw 0–1 reading through the gate, then both smoothing curves. */
    const push = (raw: number) => {
      // Hysteresis: it takes GATE_OPEN to open and a drop below GATE_CLOSE to shut again.
      if (gateOpenRef.current ? raw < GATE_CLOSE : raw > GATE_OPEN) {
        gateOpenRef.current = !gateOpenRef.current;
      }
      const target = gateOpenRef.current ? raw : 0;

      const levelRate = target > levelRef.current ? ATTACK : RELEASE;
      levelRef.current += (target - levelRef.current) * levelRate;

      const envRate = target > envelopeRef.current ? ENVELOPE_ATTACK : ENVELOPE_RELEASE;
      envelopeRef.current += (target - envelopeRef.current) * envRate;

      // Snap fully closed rather than decaying forever towards zero — "still" must mean still.
      if (!gateOpenRef.current) {
        if (levelRef.current < 0.005) levelRef.current = 0;
        if (envelopeRef.current < 0.005) envelopeRef.current = 0;
      }

      level.setValue(levelRef.current);
      envelope.setValue(envelopeRef.current);
    };

    // -------------------------------------------------------------------------------------------
    // Web: analyse expo-audio's own microphone stream.
    // -------------------------------------------------------------------------------------------
    if (Platform.OS === "web") {
      const stream = getRecorderStream(recorder);

      if (!stream) {
        // Fail visibly, not silently: say why, then keep the screen alive with a neutral loop.
        console.warn(
          "[useAmplitude] Could not reach the recorder's MediaStream, so the recording visuals " +
            "cannot follow the microphone. Falling back to a non-reactive breathing animation. " +
            "This usually means expo-audio changed its internal `mediaRecorder` field.",
        );
        const breathe = (v: Animated.Value) =>
          Animated.loop(
            Animated.sequence([
              Animated.timing(v, {
                toValue: 0.7,
                duration: 1150,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
              Animated.timing(v, {
                toValue: 0.2,
                duration: 1150,
                easing: Easing.inOut(Easing.sin),
                useNativeDriver: USE_NATIVE_DRIVER,
              }),
            ]),
          );
        const loop = Animated.parallel([breathe(level), breathe(envelope)]);
        loop.start();
        return () => loop.stop();
      }

      const AudioCtx =
        window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) {
        console.warn("[useAmplitude] Web Audio is unavailable; recording visuals will not react.");
        return;
      }

      const ctx = new AudioCtx();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      // Small FFT keeps this cheap; we smooth ourselves above, so the node does none of its own.
      analyser.fftSize = 512;
      analyser.smoothingTimeConstant = 0;
      source.connect(analyser);

      // Browsers may hand back a suspended context even after a user gesture.
      void ctx.resume().catch(() => {});

      const buffer = new Uint8Array(analyser.fftSize);
      let frame = 0;

      const tick = () => {
        analyser.getByteTimeDomainData(buffer);
        // RMS around the 128 midpoint — loudness, not the instantaneous sample.
        let sum = 0;
        for (let i = 0; i < buffer.length; i++) {
          const centred = (buffer[i]! - 128) / 128;
          sum += centred * centred;
        }
        push(normalize(Math.sqrt(sum / buffer.length), RMS_QUIET, RMS_LOUD));
        frame = requestAnimationFrame(tick);
      };
      frame = requestAnimationFrame(tick);

      return () => {
        cancelAnimationFrame(frame);
        source.disconnect();
        // Close the graph so a remount doesn't leak another AudioContext into the tab.
        void ctx.close().catch(() => {});
      };
    }

    // -------------------------------------------------------------------------------------------
    // Native: poll the recorder's own metering.
    // -------------------------------------------------------------------------------------------
    if (!recorder) return;
    const id = setInterval(() => {
      const db = recorder.getStatus().metering ?? Number.NEGATIVE_INFINITY;
      push(normalize(db, DB_QUIET, DB_LOUD));
    }, SAMPLE_MS);
    return () => clearInterval(id);
  }, [recorder, active, level, envelope]);

  return { level, envelope };
}
