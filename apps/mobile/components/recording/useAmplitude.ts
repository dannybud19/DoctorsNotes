/**
 * Loudness for the recording visuals, as an `Animated.Value` in 0–1.
 *
 * PLATFORM DIFFERENCE — read before changing this.
 *
 * `expo-audio` only reports microphone amplitude on iOS and Android, and only when the recorder was
 * prepared with `isMeteringEnabled: true`. Its web implementation returns
 * `{canRecord, isRecording, durationMillis, mediaServicesDidReset, url}` from `getStatus()` — there
 * is no `metering` field at all. So on web there is nothing to react to.
 *
 * Rather than freeze the visuals in the browser (where the screen is previewed), web falls back to a
 * slow "breathing" loop. It is honest ornamentation, not fake data: nothing derived from it is ever
 * shown as information about the recording. On a real device the value follows the speaker's voice.
 */
import { useEffect, useRef } from "react";
import { Animated, Easing, Platform } from "react-native";

/** Minimal shape we need from the recorder — avoids coupling this hook to the whole expo-audio type. */
export type MeteringSource = {
  getStatus: () => { metering?: number };
};

/** How often we sample the microphone level, in ms. Fast enough to feel live, slow enough to be cheap. */
const SAMPLE_MS = 100;

/**
 * Metering is reported in dBFS. 0 dB is the loudest the mic can encode and −160 is digital silence,
 * but ordinary speech sits far above the floor, so mapping the full range would leave the halo
 * almost motionless.
 *
 * This window is deliberately NARROW — a normal speaking voice at arm's length lands around −35 to
 * −20 dBFS, so a wider window wastes most of the 0–1 range on levels a bedside conversation never
 * reaches, and the halo barely moves. Widen `DB_QUIET` if a quiet room makes it twitch.
 */
const DB_QUIET = -55;
const DB_LOUD = -18;

/** Weight of each new sample in the moving average. Higher = more responsive, but jumpier. */
const SMOOTHING = 0.55;

function normalizeDb(db: number): number {
  if (!Number.isFinite(db)) return 0;
  const t = (db - DB_QUIET) / (DB_LOUD - DB_QUIET);
  return Math.max(0, Math.min(1, t));
}

/**
 * @param recorder the active recorder, or null when there is nothing to measure
 * @param active   false while paused, starting, uploading or errored — the value settles to 0
 */
export function useAmplitude(recorder: MeteringSource | null, active: boolean): Animated.Value {
  const value = useRef(new Animated.Value(0)).current;
  const smoothed = useRef(0);

  useEffect(() => {
    if (!active) {
      smoothed.current = 0;
      Animated.timing(value, {
        toValue: 0,
        duration: 260,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }).start();
      return;
    }

    // Web: no metering exists, so breathe instead of sitting still. The range is wide and the cycle
    // brisk so the motion is clearly visible in the browser preview — this is the only feedback
    // there is on web, so a subtle version reads as "broken".
    if (Platform.OS === "web") {
      const loop = Animated.loop(
        Animated.sequence([
          Animated.timing(value, {
            toValue: 0.95,
            duration: 1150,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0.18,
            duration: 1150,
            easing: Easing.inOut(Easing.sin),
            useNativeDriver: true,
          }),
        ]),
      );
      loop.start();
      return () => loop.stop();
    }

    // Native: follow the microphone.
    if (!recorder) return;
    const id = setInterval(() => {
      const level = normalizeDb(recorder.getStatus().metering ?? Number.NEGATIVE_INFINITY);
      smoothed.current = smoothed.current + (level - smoothed.current) * SMOOTHING;
      Animated.timing(value, {
        toValue: smoothed.current,
        duration: SAMPLE_MS,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start();
    }, SAMPLE_MS);
    return () => clearInterval(id);
  }, [recorder, active, value]);

  return value;
}
