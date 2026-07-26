# Design — Data-backed discharge/recovery dashboard

**Date:** 2026-07-26
**Status:** Design (awaiting user review before implementation planning)
**Scope:** The post-discharge recovery dashboard and the screens it leads to. Make every component
either backed by real data or removed; build medication reminders that come from real data, fire
real iOS notifications, and open a full-screen hold-to-confirm; give patients attributed NHS
information about their medicines; and a meds recap. Mood becomes a real self-report check-in.

---

## Context / problem

The recovery dashboard (Schmidt's `feat/recovery-design` branch) has several components that are not
backed by real data:

- **Reminder times are fake.** `apps/mobile/app/lib/fixtures/recovery.json` hardcodes `"8:00 am"`.
  Clinicians in the source data say *"once a day"* / *"morning and evening"* — never a clock time. The
  domain (`packages/domain/src/types.ts`, `Claim` is `.strict()`) has **no** structured field for
  dose/frequency/time-of-day; frequency lives only as prose inside `Claim.value` / `verbatimText`.
- **"What does this mean?"** (`apps/mobile/app/subject/[id].tsx`) shows ~8 canned strings from
  `apps/mobile/app/lib/explain.ts` — it does not really explain each medicine.
- **The mood row** on the dashboard is marked *"DELIBERATELY INERT"* — no storage, no effect.
- **`/reminder`** (`apps/mobile/app/reminder.tsx`) is a skeleton: it shows `dueMedications[0]` with the
  fake time and its "hold to confirm" just calls `router.back()` — no notification, no record.
- The app has **no notification library** and runs in **Expo Go** (no dev/EAS build).

The user wants every component fitted to a real backend ("nothing that just doesn't work"),
data-backed reminders that fire real notifications and open a full-screen confirm, genuine medicine
explanations, and a meds recap.

**Hard invariant (must not regress):** MedThread *surfaces, never assesses/triages/diagnoses/advises*.
Every shown medical statement traces to a verbatim `Claim` + resolvable `ClaimSource`. No paraphrase
is stored as a Claim. `/api/ask` stays retrieval-only. This design must honor that.

---

## The through-line principle

Every element on screen is exactly one of three clearly-distinguished kinds — nothing else may exist:

1. **Care-team words** — verbatim `Claim` + provenance. Primary, as today.
2. **General info — NHS** — attributed, visually separated, never blended with (1). Labelled
   *"General information from NHS — not from your care team."*
3. **Yours** — data the patient generates: reminder times they set, "I took it" intake
   confirmations, and mood check-ins.

**Knowledge-gap rule (user's, applied everywhere):** if a fact the UI would need is not present in
the clinician's words, it is a *gap* → surface it as a **question** (reusing the existing
`worth_confirming` / `Question` machinery), **never** invent or pad it. Specifically: a medicine with
no stated frequency gets **no reminder**; instead a question ("How often should I take X?").

### Invariant guardrails (explicit)

- The app never authors a medical fact. NHS content is fetched, attributed, and shown as its own
  clearly-marked block; it never merges into the verbatim quote.
- Clock times are **only ever patient-set**. The app never proposes or infers "8am".
- Frequency is **parsed, not generated** — read out of existing verbatim `value` text; if absent →
  question, not a guess.
- Mood check-ins are a **neutral self-report log**: stored and shown back to the patient, **never
  interpreted** — no wellbeing assessment, no urgency styling by value, no "see a doctor" prompts,
  no triage. (This is the guardrail that keeps a mood feature inside "surface, never assess".)
- Intake confirmations ("I took it") are an **adherence log**, distinct from a domain `Confirmation`
  (which confirms a dose *value*). They never change or endorse a dose.

---

## Architecture

- **Base branch:** build on `feat/recovery-design` (has these sections). **P0 prerequisite:** merge
  `recovery-design` → `feat/mvp-patient-slice` (clean; only `recovery.tsx` + 2 new components differ).
  ⚠️ Coordinate: another agent was planning work that may also touch `recovery.tsx`.
- **Mobile stays thin** (zero AI/external deps — enforced by dependency-cruiser). NHS lookups go
  through a **new web route** `apps/web/app/api/drug-info/route.ts`, called like `/api/ask`, with a
  fixture fallback (mirrors the app's existing pattern).
- **Local persistence** (new dep `@react-native-async-storage/async-storage`) for the "Yours" data:
  reminder times, intake log, mood check-ins. Demo-appropriate; a later phase can move these to
  Supabase (`patient_id` + RLS) without changing the UI.
- **Native capability:** new dep `expo-notifications`; requires an **iOS dev/EAS build** (leaving
  Expo Go). Notifications are **Time-Sensitive** (no special Apple entitlement). Critical alerts
  (override silent mode) are a non-goal for this pass (needs Apple entitlement).

---

## Component audit — the discharge page and screens it links to

| Component | Backed by today | Verdict |
|---|---|---|
| "Hi, {name}" greeting | patient data | **Keep** |
| Mood row ("How are you feeling") | ❌ inert | **Rewire → real self-report check-in** (see Subsystem 6; guardrails above) |
| "Worth asking about" banner → `/questions` | ✅ reconciler `worth_confirming` | **Keep** — now also carries knowledge-gap med questions |
| "Today's reminders" med cards | ⚠️ fake fixture times | **Rewire** — only meds with a *stated frequency*; patient-set clock times; verbatim body; confirm/intake status |
| Tile "More on your meds" | ⚠️ routes to one subject | **Rewire → new meds-recap screen** (all meds) |
| Tile "Consultation history" → `/history` | ✅ encounters | **Keep** (verify data-backed) |
| Tile "Ask again" → `/ask` | ✅ retrieval Q&A | **Keep** |
| "Begin a hospital stay" → `/` | ✅ navigation | **Keep** |
| `/reminder` screen | ❌ fake `med[0]`, no effect | **Rebuild** — real full-screen hold-to-confirm + intake log |
| `/subject` "What does this mean?" | ⚠️ ~8 canned strings | **Augment** — live NHS "what it is/does", attributed; verbatim trail stays primary |
| `/questions` | ✅ reconciler questions | **Keep** — receives knowledge-gap questions |

---

## Subsystems

### 1. Reminder derivation (pure, testable)
Input: reconciled medication claim groups (`category ∈ {medication-dose, medication-change}`) that
have a patient `Confirmation` (reminders fire only from confirmed values — existing D5 gate; an
unconfirmed value is itself a gap → needs-confirming, not a reminder). Parse **frequency only** from
the verbatim `value` string into **N dose slots**. A slot carries a time-of-day label **only when the
clinician actually stated one** — "twice a day, morning and evening" → 2 slots labelled [morning,
evening] (labels are verbatim-sourced); "once daily" → 1 **unlabelled** slot (the app must NOT invent
"morning"). Unrecognized/absent frequency → **no reminder**, emit a knowledge-gap `Question`. Pure
function living with the other derived-view builders in `packages/reconciler` (kept pure, no
AI/network); network-free vitest tests alongside the existing reconciler tests. No clock times here —
only dose slots.

### 2. Patient-set times + persistence
Patient assigns a clock time to each derived dose slot (the ONLY source of clock times). Persist
locally (AsyncStorage) keyed by `(subject, slot)`. Editing reschedules notifications.

### 3. iOS local notifications
`expo-notifications`: schedule repeating Time-Sensitive local notifications from (dose slots ×
patient times). Reschedule on any change; cancel when a med is removed/unconfirmed. Tapping a
notification deep-links to `/reminder?med=<id>&slot=<slot>`.

### 4. Full-screen hold-to-confirm + intake log
Rebuild `/reminder`: full-screen, shows the med name + **verbatim** instruction (primary), a
collapsible "General info — NHS" block, `HoldToConfirm` (primitive already exists in
`components/ui`), and a visible "Not now" escape. Hold-complete writes a local **intake record**
`{ id, subject, slot, takenAt }` (a new "Yours" type, distinct from `Confirmation`). Dashboard med
cards reflect today's intake state. Reachable from the notification or the dashboard.

### 5. NHS drug-info + meds recap
- **Web route** `apps/web/app/api/drug-info/route.ts`: `GET ?name=<subject>` → queries NHS medicines
  content (needs `NHS_API_KEY`) → returns `{ name, whatItIs, whatItDoes, sourceUrl, attribution }`,
  plain-language. Fixture fallback for offline/no-key (mirrors app pattern), and a `no_info` empty
  state (never invents).
- **`/subject` "What does this mean?"**: for medication subjects, fetch NHS info via the route and
  render it as an attributed block; keep the canned `explain.ts` map for non-medication jargon;
  verbatim trail remains the primary text.
- **New meds-recap screen** (`/meds`): lists every medication claim group — name, verbatim
  dose/how-often/how-many, confirm status, the patient's set times, and the attributed NHS "what it
  is". "More on your meds" tile points here.

### 6. Mood self-report check-in
Add a patient-generated `MoodCheckIn { id, mood: "very-good"|"good"|"okay"|"not-great"|"poor",
notedAt }`, persisted locally. The dashboard row records a check-in; a simple "Your check-ins"
history shows them back **neutrally**. No interpretation, no styling-by-severity, no triage (per
guardrails). Later can surface verbatim to clinicians; the app never assesses it.

---

## Phasing (each phase → its own implementation plan)

- **P0 — setup/prereq:** merge `recovery-design`; add deps (`expo-notifications`,
  `@react-native-async-storage/async-storage`); stand up iOS dev/EAS build; add `NHS_API_KEY` to web
  backend; confirm `EXPO_PUBLIC_API_URL` points at the deployed backend.
- **P1 — data-backed reminders + cleanup:** Subsystem 1 (derivation + knowledge-gap questions) and
  the component-audit rewiring/removal that needs no native (med cards from real data, tiles,
  drop fake times). Pure logic + UI; unit-tested.
- **P2 — patient data + persistence:** Subsystems 2 and 6 (patient-set times, mood check-in) on
  AsyncStorage.
- **P3 — notifications + confirm:** Subsystems 3 and 4 (iOS notifications + full-screen hold-to-confirm
  + intake log). Needs the dev build.
- **P4 — NHS info + recap:** Subsystem 5 (`/api/drug-info`, "what does this mean", meds-recap screen).

---

## Testing / verification

- **Pure logic:** vitest unit tests for frequency parsing and knowledge-gap emission (network-free),
  alongside the reconciler tests. `pnpm --filter @medthread/reconciler run test` etc.
- **Boundaries:** `pnpm run depcruise` — 0 violations (mobile stays zero-AI; NHS only via web route).
- **Types:** `pnpm -r run typecheck`.
- **Web route:** unit test the `/api/drug-info` handler with a mocked NHS response + the `no_info`
  and fallback paths.
- **Device (dev build):** notification fires at a patient-set time → opens `/reminder` → hold-to-confirm
  writes an intake record → dashboard reflects it. Manual on an iOS dev build.
- **Manual UI:** every dashboard component shows real data or is gone; a med with no stated frequency
  appears as a question, not a reminder.

---

## Non-goals / deferred

- Android lock-screen takeover (full-screen intent) — deferred (iOS-first).
- Critical alerts overriding silent mode — needs Apple entitlement; not this pass.
- Moving "Yours" data to Supabase — later; local persistence first.
- Any app interpretation of mood, any generated medical fact, any inferred clock time — **never**
  (invariant).

---

## Prerequisites the user must supply

- Willingness to move from Expo Go to an **iOS dev/EAS build** (required for notifications).
- A free **`NHS_API_KEY`** for the drug-info route.
- The **deployed backend URL** for `EXPO_PUBLIC_API_URL` (from the earlier upload fix).
- Coordination so the **other agent** and this work don't both edit `recovery.tsx`.
