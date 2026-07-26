import * as DocumentPicker from "expo-document-picker";
import { useRouter } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import { useState } from "react";
import { ActivityIndicator, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { BackButton, PlainButton, Screen } from "../components/ui";
import { audioClaims, documentFixtureClaims } from "./lib/data";
import { setLiveClaims } from "./lib/liveSession";
import { colors, font, HIT_SLOP, MIN_TOUCH, space } from "./lib/theme";

type Phase = "idle" | "uploading" | "error";

// A picked document, normalized across the two pickers: expo-image-picker (camera → { fileName })
// and expo-document-picker (Files → { name }). The server accepts image/* or application/pdf.
type PickedFile = { uri: string; mimeType: string; name: string };

/** A filename for an asset that arrived without one, from its MIME. */
function fallbackName(mimeType: string): string {
  const ext = mimeType === "application/pdf" ? "pdf" : (mimeType.split("/")[1] ?? "jpg");
  return `document.${ext}`;
}

/** Best-effort MIME from a filename when the picker didn't supply one (Files app is usually reliable). */
function guessMimeFromName(name: string): string {
  switch (name.split(".").pop()?.toLowerCase()) {
    case "pdf":
      return "application/pdf";
    case "png":
      return "image/png";
    case "gif":
      return "image/gif";
    case "webp":
      return "image/webp";
    default:
      return "image/jpeg";
  }
}

// Screen 4 — Update Medical Files (LIVE). Pick or photograph a document, send it to /api/extract-document
// (Claude vision → verbatim, document-sourced claims), merge with the spoken claims, and open the
// session view where the letter's aspirin 150mg meets the spoken 75mg as "worth confirming". On any
// failure a sample document keeps the demo working with no network — same pattern as recording.
export default function Upload() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  function fail(message: string) {
    setErrorMsg(message);
    setPhase("error");
  }

  /** Merge the extracted document claims with the spoken claims and hand off to the session view. */
  function showMerged(docClaims: Awaited<ReturnType<typeof extractDocument>>) {
    setLiveClaims([...audioClaims, ...docClaims]);
    router.push("/session");
  }

  async function extractDocument(file: PickedFile) {
    const apiBase = process.env.EXPO_PUBLIC_API_URL;
    if (!apiBase) throw new Error("EXPO_PUBLIC_API_URL is not set.");

    const form = new FormData();
    if (Platform.OS === "web") {
      const blob = await (await fetch(file.uri)).blob();
      form.append("image", blob, file.name);
    } else {
      form.append("image", { uri: file.uri, name: file.name, type: file.mimeType } as unknown as Blob);
    }
    form.append("patientId", "synthetic-patient-1");
    form.append("documentId", `doc-${Date.now()}`);

    const res = await fetch(`${apiBase}/api/extract-document`, { method: "POST", body: form });
    const data = (await res.json()) as { claims?: unknown; message?: string; error?: string };
    if (!res.ok) {
      throw new Error(data.message ?? data.error ?? `Request failed (${res.status})`);
    }
    return (data.claims ?? []) as typeof audioClaims;
  }

  /** Take a photo (needs camera permission). Returns null if denied or cancelled. */
  async function pickCamera(): Promise<PickedFile | null> {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    if (!perm.granted) {
      fail("Camera access is needed to photograph the document. You can still use a sample.");
      return null;
    }
    const result = await ImagePicker.launchCameraAsync({ quality: 1 });
    if (result.canceled) return null;
    const asset = result.assets[0];
    if (!asset) return null;
    const mimeType = asset.mimeType ?? "image/jpeg";
    return { uri: asset.uri, mimeType, name: asset.fileName ?? fallbackName(mimeType) };
  }

  /** Choose a photo or PDF from the Files app (no permission prompt). Returns null if cancelled. */
  async function pickFile(): Promise<PickedFile | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf"],
      copyToCacheDirectory: true,
    });
    if (result.canceled) return null;
    const asset = result.assets?.[0];
    if (!asset) return null;
    const name = asset.name ?? "document";
    return { uri: asset.uri, mimeType: asset.mimeType ?? guessMimeFromName(name), name };
  }

  async function pick(source: "library" | "camera") {
    try {
      const file = source === "camera" ? await pickCamera() : await pickFile();
      if (!file) return;
      setPhase("uploading");
      const docClaims = await extractDocument(file);
      showMerged(docClaims);
    } catch (e) {
      fail(e instanceof Error ? e.message : "Something went wrong reading that document.");
    }
  }

  function useSample() {
    setLiveClaims([...audioClaims, ...documentFixtureClaims]);
    router.push("/session");
  }

  if (phase === "uploading") {
    return (
      <Screen>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.big}>Reading your document…</Text>
          <Text style={styles.sub}>This takes a few seconds.</Text>
        </View>
      </Screen>
    );
  }

  if (phase === "error") {
    return (
      <Screen>
        <View style={styles.center}>
          <Text style={styles.errorTitle}>We couldn't read that document</Text>
          <Text style={styles.errorMsg}>{errorMsg}</Text>
          <Pressable
            onPress={useSample}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Use a sample document instead"
            style={styles.primaryBtn}
          >
            <Text style={styles.primaryBtnText}>Use sample document</Text>
          </Pressable>
          <Pressable
            onPress={() => setPhase("idle")}
            hitSlop={HIT_SLOP}
            accessibilityRole="button"
            accessibilityLabel="Try again"
            style={styles.secondaryBtn}
          >
            <Text style={styles.secondaryBtnText}>Try again</Text>
          </Pressable>
        </View>
      </Screen>
    );
  }

  return (
    <Screen scroll>
      <BackButton onPress={() => router.back()} />
      <Text style={styles.h1}>Add your discharge note</Text>
      <Text style={styles.body}>
        Take a photo, or choose a photo or PDF of a letter or medication chart. We'll show you, word
        for word, what it says — alongside what you were told at your bedside.
      </Text>

      <PlainButton label="Use camera" onPress={() => pick("camera")} />
      <PlainButton label="Choose a file (photo or PDF)" onPress={() => pick("library")} />

      <Pressable
        onPress={useSample}
        hitSlop={HIT_SLOP}
        accessibilityRole="button"
        accessibilityLabel="Use a sample document instead"
        style={styles.link}
      >
        <Text style={styles.linkText}>Use sample document</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  h1: { fontSize: font.huge, fontWeight: "800", color: colors.text },
  body: { fontSize: font.body, color: colors.text, lineHeight: 30 },
  center: { alignItems: "center", gap: space.md, paddingVertical: space.lg },
  big: { fontSize: font.heading, fontWeight: "800", color: colors.text },
  sub: { fontSize: font.body, color: colors.textMuted, textAlign: "center" },
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
