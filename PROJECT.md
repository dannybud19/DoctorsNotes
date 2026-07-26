# MedThread — Living Project Doc

> **This is the single source of alignment.** It states what the product is, its features, the
> decisions we've made (and *why*), and how we work. It is written first and **updated as work
> proceeds** — every non-obvious decision gets appended here with its rationale, so context survives
> across sessions and handoffs. If something here is stale, fixing it is the priority before code.

> **Naming:** the product/app display name is **MedThread** (formerly "DoctorsNotes"). Workspace
> packages are `@medthread/*`. The git repo/directory is still `DoctorsNotes` and the
> `DoctorsNotesError` type name is unchanged — the rename (D16) was display strings + package names
> only, deliberately not a repo move or a type refactor.

Last updated: 2026-07-26

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
| D12 | **`reconcile()` validates `observedAt` for every claim, not just via the sort comparator.** | An independent test agent found a single-claim group could silently accept a bad timestamp (the comparator never runs for one element) — violating fail-loudly (§1.6). Hardened + locked with a regression test. |
| D13 | **A turn with `roleConfidence: "unknown"` MUST NEVER mint a Claim.** `SpeakerRef.roleConfidence` (`confirmed \| inferred \| unknown`) is required on every claim's audio provenance. | Attributing words to a clinician who may not have said them breaks provenance — the core trust of the product. Unknown-role turns are held as *pending turns*, never converted to Claims. Enforced in Agent X's extractor and reviewed on every change. |
| D14 | **Single React version workspace-wide (18.3.1) via `pnpm.overrides`; reconcile comparator locale pinned to `"en-US"`.** | Removes the react-dom@19/react@18 peer split; makes reconcile output ordering byte-identical across server and device. |
| D15 | **Domain frozen for Wave 1 with `AdmissionPhase`, `AskResponse`, and supporting state types (`SavedQuestion`, `DueMedication`, `Encounter`, `PatientContext`).** | Agents consume these; freezing them up front prevents mid-wave shared-file churn. `DueMedication` is verbatim from a *confirmed* claim (D5); `AskResponse` empty `claimIds` can only be `no_source`. |
| D16 | **Renamed the product to MedThread** — display strings (mobile UI "Chat with MedThread", web title), `app.json` (`name`/`slug`/`scheme`), and the workspace packages `@doctorsnotes/* → @medthread/*` (names, imports, CI filters, lockfile). Repo/dir name and the `DoctorsNotesError` type name were deliberately left unchanged. | Product branding. Kept surgical (display + package names) to avoid a risky repo move / type refactor. |
| D17 | **Live AI pipeline shipped**, all server-side in `packages/ai` behind `apps/web` Route Handlers: Scribe transcriber + Claude claim extractor (`/api/extract`, audio), Claude **Asker** (`/api/ask`, Q&A), Claude **vision** document extractor (`/api/extract-document`). Mobile calls them via `EXPO_PUBLIC_API_URL` and **always keeps a fixture fallback** on failure. | The demo must work live, but a network/provider failure must never leave a blank screen. Keeps AI out of the client (D6). |
| D18 | **Ask/Chat is retrieval-only with a hard `no_source` guard.** A response with empty or irrelevant `claimIds` can only be `no_source` — never `answered`/`partial`; the model selects existing claims and never generates a medical fact. Enforced by the pure `resolveAskResponse` (packages/ai) + `AskResponse.parse` at the route, locked by network-free tests. | This is the product's core trust guarantee — the app surfaces what was said, it never invents an answer (invariant §1.1). |

**Open design decisions (for Schmidt / design):**
- **Uncorroborated → question volume.** Every single-source claim currently becomes a "question to
  ask tomorrow," so most questions read "only one person mentioned this." Keep as-is for the MVP;
  design may split these into a gentler section, separate from real "these disagree" questions.

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

_Working branch: `feat/mvp-patient-slice` (tip `e5c0f29`). `main` is PR-based — landing there needs a
PR merge, not a direct push._

- **Foundation:** docs, monorepo, typed stubs, Supabase schema + RLS + seed, CI. **Done.**
- **MVP patient slice — interactive end-to-end (fixture + live):**
  - Reconciler implemented + tested (34 tests: grouping/classification/ordering, confirmation
    attachment, the fail-loudly `observedAt` guard, and the negative "never emits winner/severity/
    advice" assertion). Fixtures aligned to Schmidt's real source — spoken aspirin **75mg** vs
    discharge-letter **150mg** reconciles to **`worth_confirming`**.
  - Expo screens all built: **home** (greeting + 4 large actions, "Chat with MedThread" primary),
    recording, session/running-picture, verbatim/provenance drill-down, questions, consultation
    history, recovery, reminder, **Chat/Ask**, **Update Medical Files** (photo/upload).
  - **Live AI pipeline** wired (D17): `/api/extract` (audio→claims), `/api/ask` (retrieval Q&A with the
    `no_source` guard, D18), `/api/extract-document` (Claude vision→document claims). Every mobile
    network call keeps a fixture fallback. Tests: reconciler 34, ai 8, supabase 8; typecheck + depcruise
    green across `@medthread/*`.
- **Next:** open the PR `feat/mvp-patient-slice → main`; deploy `apps/web` to Vercel (needs
  `ANTHROPIC_API_KEY` + `ELEVENLABS_API_KEY` set in Vercel), then point mobile `EXPO_PUBLIC_API_URL` at
  the deployed URL; real capture polish, the EAS dev-build reminder, and post-discharge persistence.

### Known gaps / gotchas (carry forward)

- **Live AI paths are unexercised in CI** — extractor/asker/vision have no network-free coverage of the
  provider call itself (the `resolveAskResponse` guard is unit-tested; the SDK calls are not mocked).
  They've only been proven via typecheck + one manual E2E earlier in the build.
- **Mobile `jest` is broken and deferred** — `apps/mobile/jest.config.js` references a missing
  `jest.setup.js` and there are no mobile test files. Left as-is intentionally.
- **`packages/reconciler/src/reconcile.ts` is classified as binary** by `file`/`grep` (a stray
  non-text byte, pre-existing). It compiles/tests fine, but `grep -I` sweeps silently skip it — use
  `grep -a` when searching. Worth cleaning up.
- **Runtime RLS denial** — proven only by the static "RLS is enabled" test; the pgTAP cross-patient
  denial test still needs a live Postgres (W3).
- **Reconcile network-free is convention, not enforced** — nothing structurally blocks a future test
  adding `fetch`; consider a lint/guard.
