# MedThread

**Your hospital stay, in your own words — what the doctors actually said, kept for you.**

MedThread is a patient‑facing mobile app for elderly hospital inpatients. It surfaces **what
clinicians said — verbatim, with provenance** — so a patient can follow what's happening to them
across a multi‑day admission and after discharge. It **surfaces; it never diagnoses, triages, or
advises.**

---

## The problem

An 82‑year‑old is admitted, usually alone. Over five days, decisions are made about their body all
day long — by a consultant on the ward round, a registrar, a nurse at handover, a pharmacist, a
physio — each appearing for a few minutes, in language the patient can't follow, and **writing
nothing down _for the patient_.** They nod along and agree to things they don't understand. Then a
discharge letter says one thing while the doctor said another, and nobody catches it.

They are a passenger in their own treatment. MedThread lets them stop being one.

## What it does

Two one‑tap inputs, both survivable by a shaky hand:

- 🎙️ **Record** the bedside conversation when someone comes to the bed.
- 📄 **Photograph or upload** the paper they're handed (discharge letters, medication charts — photo _or_ PDF).

From those, MedThread:

- Extracts each discrete thing a clinician said or wrote as a **verbatim `Claim`**, tagged with its
  **source** (which recording + timestamp + speaker, or which document + page + region).
- Reconciles claims about the same thing into a time‑ordered **"what's happening to me now"**, and
  flags genuine disagreements as **questions worth asking tomorrow** — e.g. _"For my aspirin, one
  source says 75 mg once daily and another says 150 mg once daily — which one is current for me now?"_
- Lets the patient **chat** with their own record ("what medicines should I take?", "what should I
  ask my doctor?") — answered **only** from what they were actually told.
- **Persists after discharge**: a recovery dashboard with today's medications (each shown as the
  clinician's exact words), and a full‑screen, hold‑to‑dismiss reminder.

## Why you can trust it — the one hard rule

> **MedThread surfaces what a clinician said, verbatim, with provenance. It never assesses, triages,
> diagnoses, or advises, and never implies who is "right." A discrepancy is _"worth asking about,"_
> never _"an error."_**

This isn't a footnote — it's enforced in code and in every code review:

- **Every shown statement traces to a verbatim `Claim` + a resolvable source.** No paraphrase is
  ever stored as truth; the `Claim` type has no field to put one in.
- **The AI never invents a medical fact.** Chat is _retrieval‑only_: the model may only select the
  ids of claims the patient was actually told. A response that cites nothing collapses to
  **`no_source`** ("no one has told you this yet — worth asking your care team"), enforced by a pure
  function locked with network‑free tests.
- **Reminders fire only on a value the patient explicitly confirmed** — never "latest wins," never
  inferred.

That constraint is _why the product is trustworthy at all_.

## Demo (2 minutes)

1. **Record a consultation** → the bedside conversation appears as a clean two‑speaker transcript
   (User 1 / User 2), and the reconciled picture below it.
2. **Update medical files** → add the discharge letter (photo or PDF). MedThread reads it and the
   patient moves into their **recovery** dashboard.
3. The discharge letter says **aspirin 150 mg**; the doctor said **75 mg**. MedThread doesn't pick a
   winner — it surfaces it as **_"worth asking about,"_** with both sources one tap away, and turns
   it into a question to raise. Metformin, which everyone agreed on and the patient confirmed, shows
   as **Confirmed**.
4. Slide between **Hospital stay ⇄ Recovery** at any time.

## How it's built (and why that matters)

MedThread is a monorepo with hard, CI‑enforced boundaries:

```
apps/mobile   Expo (React Native, iOS/Android). ZERO AI dependencies, no secrets.
              Captures audio/photos, renders verbatim claims, runs reconciliation on‑device.
apps/web      Next.js on Vercel. The ONLY place AI runs: /api/extract (audio→claims),
              /api/ask (retrieval Q&A), /api/extract-document (vision→claims), /api/questions.
packages/domain      Pure TypeScript + zod. The provenance contract (Claim, ClaimSource, …).
packages/reconciler  Pure, deterministic, offline. Groups claims, classifies agreement,
                     builds the running picture + questions. No network, tested against fixtures.
packages/ai          Server‑only. Claude + speech‑to‑text behind swappable interfaces.
```

- **No AI in the patient's phone, ever** — enforced by `dependency-cruiser` (a single forbidden
  import fails CI). The app works when the signal drops.
- **The core is pure and deterministic** — reconciliation runs identically on the server and
  on‑device, and its behavior (including the "never picks a winner / never gives advice" rule) is
  pinned by **network‑free tests** on synthetic fixtures.
- **AI is quarantined behind interfaces** in one server‑only package, so the safety guarantees live
  at typed boundaries, not in prompt hope.

**Stack:** Expo Router, React Native, TypeScript, zod, Next.js (Vercel), Anthropic Claude,
ElevenLabs Scribe, Supabase (RLS from day one, `patient_id` on every row).

## Run it locally

```bash
pnpm install

# Mobile (Expo) — the patient app
pnpm --filter @medthread/mobile start          # then press i for the iOS simulator

# Web (the AI API routes) — needed for live capture; the app falls back to fixtures without it
pnpm --filter @medthread/web dev
```

The mobile app reads `EXPO_PUBLIC_API_URL` (the deployed web URL) and **always keeps a fixture
fallback**, so the experience is fully demoable offline. Verify the whole workspace with:

```bash
pnpm -r run typecheck        # types across every package
pnpm run depcruise           # proves the mobile app has zero AI imports
pnpm --filter @medthread/reconciler run test    # the safety/behavior locks
```

## Status & honesty

- **Synthetic data only.** Everything ships against fixtures; real‑patient data (PHI) is gated out
  until vendor BAAs are in place. No real medical data touches this build.
- **Live AI pipeline** (Claude extraction, retrieval chat, vision document reading) is wired; it
  needs `apps/web` deployed with `ANTHROPIC_API_KEY` + `ELEVENLABS_API_KEY`.
- Full product intent, decisions (with rationale), and architecture live in
  [`PROJECT.md`](./PROJECT.md) and [`AGENTS.md`](./AGENTS.md).

> The product/app name is **MedThread**; the repository is historically named `DoctorsNotes`.
