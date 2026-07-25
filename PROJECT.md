# DoctorsNotes — Living Project Doc

> **This is the single source of alignment.** It states what the product is, its features, the
> decisions we've made (and *why*), and how we work. It is written first and **updated as work
> proceeds** — every non-obvious decision gets appended here with its rationale, so context survives
> across sessions and handoffs. If something here is stale, fixing it is the priority before code.

Last updated: 2026-07-25

---

## 1. What the product is

**DoctorsNotes** helps a **hospital inpatient follow what is happening to them** — during a multi-day
admission and after discharge — by surfacing **what clinicians said, verbatim, with provenance**.

- **The user is the patient.** ~75–85, admitted, usually alone, not technical, often with shaky hands
  or low vision. **Not** a caregiver, **not** a clinician. Every design decision serves *them*.
- **The pain it removes:** decisions are made about the patient's body all day, in language they
  can't follow, by many people who each appear for a few minutes and write nothing down *for the
  patient*. The patient nods along and agrees to things they don't understand. DoctorsNotes lets them
  stop being a passenger in their own treatment.
- **Tone: dignity, not diagnostics.**

### The hard invariant (non-negotiable)

The app **surfaces** what a clinician said, verbatim, with provenance. It **never assesses, triages,
diagnoses, or advises**, and **never implies who is "right."** Everything shown traces to a verbatim
clinician quote. A discrepancy is shown as *"this seems worth asking about,"* **never** *"the app
found an error."* This constraint is *why the product is trustworthy at all* — it is enforced in code
and in code review, not treated as a legal footnote.

---

## 2. Features

- **Two one-tap inputs** (must work for a shaky hand):
  1. **Record** bedside audio when someone comes to the bed (consultant ward round, nurse handover,
     pharmacist, physio, registrar).
  2. **Photograph** the paper handed over (discharge letters, medication charts).
- **"What is happening to me right now"** — a living, plain-language answer that stays correct as the
  picture changes over 4–5 days.
- **Plain-language on demand** — verbatim is always the primary text; a UI disclosure explains the
  jargon then recaps; a voice *"what does this mean?"* asks the AI to explain aloud. The explanation
  is **never stored as truth** and never appears without its verbatim anchor.
- **Questions to ask tomorrow** — generated *only* from the data: each "worth confirming" thread and
  each uncorroborated claim becomes a question the patient can raise. Framed to ask, never as advice.
- **Persists after discharge** — the plan stays in plain language and nudges about medication with a
  **full-screen, hold-to-dismiss** reminder (a notification you can swipe away is one you didn't read).

---

## 3. Domain model (decided)

- **`Claim` = ground truth.** Verbatim text (never paraphrased, never stored as a summary) +
  `category` + normalized `subject` key + `value` + `source`. Immutable, provenance-anchored. The
  type has **no field** in which to store an explanation/paraphrase.
- **`ClaimSource` = discriminated union over provenance:**
  - `audio` — recording id + start/end timestamp + speaker
  - `document` — document id + page + region (bounding box)
- **Reconciler = pure, offline, deterministic.** Groups claims by `(category, subject)` into
  time-ordered threads with status `agreed | worth_confirming | uncorroborated`. It **never
  adjudicates** — no winner, no severity, no advice.
- **Time model: time-ordered, never auto-resolved.** The full chronological trail is preserved. The
  "current" value used for a medication reminder is set **only** by a source the patient explicitly
  confirms (a `Confirmation`) — never inferred, never latest-wins.
- **Questions-for-tomorrow** derive strictly from `worth_confirming` threads and `uncorroborated`
  claims.

---

## 4. Decisions log (with rationale)

Newest first. Append here whenever a non-obvious call is made.

| # | Decision | Why |
|---|---|---|
| D1 | **User is the patient**, not a caregiver/clinician. | The whole product hangs off this; UX, tone, and touch targets are elder-first. |
| D2 | **Only two inputs: record audio + photograph paper.** | Both are one-tap and survivable by a shaky hand; matches how information actually reaches a patient. |
| D3 | **`Claim` stores verbatim only; plain-language is a derived, on-demand layer.** | Provenance is the source of trust. A stored paraphrase can float free of its source; a derived one can't. |
| D4 | **Reconciler is pure/offline/deterministic and never adjudicates.** | Makes it testable now against fixtures with no network, swappable later, and keeps the app from ever implying who's right. |
| D5 | **Time-ordered, never auto-resolved; reminders fire only on a patient-confirmed value.** | "Later = correct" would be the app adjudicating, which breaks the invariant. |
| D6 | **Patient app is native mobile (Expo) with zero AI deps; all AI is server-side.** | No AI logic in components; no secrets in the client; the phone works when signal drops. |
| D7 | **Extraction & reconciliation live in pure `packages/*` functions with typed I/O.** | Testable, reviewable, and reusable identically on server and (for reconcile) on-device. |
| D8 | **Full-screen hold-to-dismiss reminder degrades per platform and is a dev-build feature.** | It is *not* natively achievable as literally stated (esp. iOS; Notifee archived Apr 2026). The hold-to-confirm gesture lives in an in-app screen the notification opens, never on the notification. |
| D9 | **Large audio/photo blobs use an `expo-sqlite` outbox + resumable upload, not a row-sync engine.** | Row-sync tools (PowerSync/WatermelonDB) sync rows, not media blobs, and add licensing/weight without solving the hard part. |
| D10 | **Synthetic fixtures only; PHI/BAA work is gated out until real data.** | Lets us build and test everything now with no real-patient risk. |
| D11 | **Maintain this `PROJECT.md` as a living doc.** | Requested during cloud-plan review; the original source files were lost once — never again. |

---

## 5. Architecture (summary)

`apps/mobile` (Expo, zero AI) → calls → `apps/web` (Next.js on Vercel) + Supabase. All AI (STT, OCR,
explanation) is server-side, behind swappable interfaces in `packages/ai`. Pure domain + reconciler
in `packages/domain` and `packages/reconciler`. Full detail, owned paths, and the enforced boundaries
live in [`AGENTS.md`](./AGENTS.md).

```
apps/mobile (Expo, zero AI)  ──►  apps/web (Next.js/Vercel)  ──►  Supabase (RLS, patient_id)
        │                              │  packages/ai (STT/OCR/Explain, server-only)
        └── caches claims ──► reconcile() (pure, offline) ◄── same fn runs server-side
                                   packages/reconciler ← packages/domain (Claim/ClaimSource)
```

---

## 6. Workflow / working agreement

- **Update this doc first.** Any decision or scope change lands in §4 before or with the code.
- **Never assess/advise** — enforced in code review of every change (checklist in `AGENTS.md`).
- **Provenance is a hard invariant** — every `Claim` carries verbatim text + a resolvable
  `ClaimSource`. No paraphrase is ever stored as a claim.
- **Reconciliation runs offline against synthetic fixtures** — no network in the pure functions.
- **No secrets in the client. No hardcoded patient identity. Synthetic data only.**
- **Fail loudly** — no swallowed exceptions, no silent fallbacks.
- **Merge to `main` only when the build is green** (`tsc --noEmit`, fixture tests, dependency-cruiser).
  `main` auto-deploys to Vercel.
- **Shared files are shared.** An agent needing a change to `packages/domain` or other shared paths
  **stops and reports** — it never edits outside its owned paths (see `AGENTS.md`).

---

## 7. Status

- **Now:** foundation scaffold — docs, monorepo skeleton, typed stubs, pure reconciler + fixtures,
  Supabase schema + RLS + seed, CI. **No feature implementation yet.**
- **Next (follow-on):** real STT/OCR/explanation, reconciler internals, real capture + screens, the
  EAS dev-build reminder, and the parallel build agents against `AGENTS.md` owned paths.

### Known test-coverage gaps (from independent verification, to close as logic lands)

- **Reconciler contract is unimplemented** — the 5 behavioural tests are `it.todo`. No executable
  coverage of grouping/classification/ordering, or of the negative "never emits winner/severity/
  advice" assertion (invariant §1.1) yet.
- **Confirmation attachment is untested and unfixtured** — the current fixture has no confirmations.
  Add a second fixture with a populated `Confirmation` + `fromClaimId`.
- **Fixture breadth is thin** — no 3+-claim group, no value-normalization case ("25mg" vs "25 mg").
- **Runtime RLS denial** — proven only by the static "RLS is enabled" test today; the pgTAP
  cross-patient denial test needs a live Postgres (W3). Static test does not prove policies are
  *restrictive*, only that they exist.
- **Network-free is convention, not enforced** — nothing structurally blocks a future test adding
  `fetch`. Consider a lint/guard when reconciler logic lands.
