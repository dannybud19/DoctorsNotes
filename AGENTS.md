# AGENTS.md — Orchestration & Architecture Spec

This file governs how work is divided, what each agent owns, the invariants every change must honor,
and how work integrates. It is the contract. Product intent and decisions live in
[`PROJECT.md`](./PROJECT.md); this file is *how we build it safely*.

---

## 1. Hard invariants (apply to every change, no exceptions)

1. **Surface, never assess.** The system surfaces what a clinician said, verbatim, with provenance.
   It **never assesses, triages, diagnoses, or advises**, and never implies who is right. A
   discrepancy is *"worth asking about,"* never *"an error."*
2. **Provenance is mandatory.** Every `Claim` carries **verbatim text** plus a **resolvable
   `ClaimSource`** (audio: recording + timestamp + speaker; document: document + page + region).
   **Never store a paraphrase as a claim.** The `Claim` type has no field for derived text.
3. **No AI in the client.** `apps/mobile` has **zero** AI / AI-SDK dependencies. All AI runs
   server-side (`apps/web` + `packages/ai`).
4. **Pure, testable core.** All extraction and reconciliation are pure functions in `packages/*`
   with typed inputs and outputs. Reconciliation **runs offline against fixtures with no network**.
5. **No secrets in the client. No hardcoded patient identity.** `patient_id` on every table; RLS
   from the start. **Synthetic data only.**
6. **Fail loudly.** No swallowed exceptions, no silent fallbacks. Stubs `throw` a clear error.

---

## 2. Architecture

```
apps/
  mobile/   Expo (SDK 56), Expo Router. ZERO ai deps. Captures audio/photos, displays verbatim,
            caches claims, runs reconcile() locally. Boots in Expo Go (reminder needs a dev build).
  web/      Next.js 16 App Router on Vercel. Route Handlers (Node runtime, Fluid Compute).
            The ONLY place that imports packages/ai. Extraction, explanation, ingest.
packages/
  domain/       PURE TS + zod. Claim, ClaimSource (discriminated union), ClaimGroup, Confirmation,
                category/subject. Zero runtime deps beyond zod. The provenance contract.
  reconciler/   PURE deterministic reconcile(claims, confirmations) + JSON fixtures. Depends ONLY
                on domain. No network, no node builtins, no react.
  ai/           SERVER-ONLY. Transcriber / Ocr / Explainer interfaces (swappable). Imported ONLY by web.
  supabase/     Generated DB types + typed client factories (anon vs service role).
  config/       Shared tsconfig + eslint.
```

### Enforced boundaries (dependency-cruiser, CI-failing)

- `apps/mobile` **must not** depend on `packages/ai` (or any AI SDK).
- `packages/domain` and `packages/reconciler` **must not** import AI SDKs, `react`, or node builtins.
- `packages/ai` is `private` and imported **only** by `apps/web`.

A single violating import fails CI. See `.dependency-cruiser.cjs`.

---

## 3. Owned paths (agents never edit outside their own)

| Agent | Owns | May read | Never touches |
|---|---|---|---|
| **A — Extractor** | `packages/ai/**`, `apps/web/app/api/**` (ingest/extract routes) | `packages/domain`, `packages/supabase` | `packages/domain`, `packages/reconciler`, `apps/mobile` |
| **B — Reconciler** | `packages/reconciler/**` | `packages/domain` | everything else |
| **C — Patient view** | `apps/mobile/**` | `packages/domain`, `packages/reconciler` (types only) | `packages/ai`, `apps/web`, schema |
| **Orchestrator** | `PROJECT.md`, `AGENTS.md`, root config, `packages/domain`, `packages/supabase`, `.github` | all | — |

**Shared-file rule:** any agent that needs a change to a shared path (`packages/domain`,
`packages/supabase`, root config, this file) **stops and reports to the orchestrator**. It does not
edit the shared file itself. This keeps the domain contract single-authored and conflict-free.

---

## 4. Agent brief template (use verbatim)

```
AGENT <A|B|C> — <name>

CONTEXT
  Read PROJECT.md (product + decisions) and AGENTS.md (this file) in full before writing code.
  You are one of three parallel agents. Work only in your owned paths (AGENTS.md §3).

OWNED PATHS (edit only these)
  <paths>

READ-ONLY DEPENDENCIES
  <paths you may import/read but never modify>

TASK
  <the specific, self-contained deliverable>

HARD INVARIANTS (AGENTS.md §1) — non-negotiable
  - Surface, never assess/advise. No severity, no ranking, no "correct" flag.
  - Every Claim = verbatim text + resolvable ClaimSource. Never store a paraphrase.
  - No AI in apps/mobile. Pure functions for extraction/reconciliation. Reconcile offline, no network.
  - No secrets in client. No hardcoded patient identity. Synthetic data only. Fail loudly.

IF YOU NEED A SHARED-FILE CHANGE
  STOP. Report exactly what you need in packages/domain (or other shared path) and why.
  Do NOT edit shared files. Wait for the orchestrator.

DEFINITION OF DONE
  - tsc --noEmit passes for your package(s).
  - Your tests pass and run with no network.
  - dependency-cruiser passes (no forbidden imports).
  - Output reviewed against the §5 "never assess/advise" checklist.

REPORT BACK
  - What you built, what you assumed, any shared-file change you need, and how you verified.
```

---

## 5. Code-review checklist — "never assess / advise" (run on every agent's output)

- [ ] No output ranks, scores, or flags a source as correct/incorrect.
- [ ] No severity, urgency, or risk label attached to any claim or conflict.
- [ ] No diagnosis, triage, recommendation, or instruction generated by the app.
- [ ] Every surfaced statement is verbatim and traces to a resolvable `ClaimSource`.
- [ ] No paraphrase is stored as a `Claim`; plain-language is derived and clearly marked.
- [ ] "Questions for tomorrow" are framed as questions to ask, never as advice.
- [ ] Reminders fire only on a patient-`Confirmation`, never on an inferred/latest value.
- [ ] No AI import reachable from `apps/mobile`. No secret or patient identity in client code.
- [ ] Errors throw loudly; no empty catch, no silent default.

---

## 6. Integration ("kill") schedule

Work integrates only at these windows, and **only if the build is green** (`tsc --noEmit` + fixture
tests + dependency-cruiser all pass). `main` auto-deploys to Vercel.

| Window | Gate | Merge if green |
|---|---|---|
| **W0 — Foundation** | scaffold builds; core verification passes | this branch → `main` |
| **W1 — Contracts frozen** | `packages/domain` types reviewed & stable; fixtures agreed | domain → `main` |
| **W2 — Vertical slice** | A produces claims from a fixture; B reconciles them; C renders them | agents A/B/C → `main` |
| **W3 — Hardening** | RLS cross-patient denial test green; mobile zero-AI-deps verified | → `main` |

**Merge rule:** never merge a red build. If a window arrives red, the window is skipped, not forced.
Report status against this schedule at each window.

---

## 7. Out of scope until gated

- Real STT/OCR/explanation providers on **real** audio/images (PHI) — requires vendor BAAs first.
- EAS dev build + the native reminder module.
- Any feature that would require the app to interpret, rank, or advise.
