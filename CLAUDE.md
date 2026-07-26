# CLAUDE.md — operating notes for this repo

Read [`PROJECT.md`](./PROJECT.md) (product, decisions, status) and [`AGENTS.md`](./AGENTS.md)
(architecture, owned paths, invariants) — they are the source of truth. This file is the short
operational contract for working here.

## What this is
**MedThread**: a patient-facing app (elderly hospital inpatients) that surfaces **what clinicians
said, verbatim, with provenance**. Hard invariant: it **surfaces, never assesses / triages /
diagnoses / advises**, and never implies who is "right." A discrepancy is *"worth asking about,"*
never *"an error."* Every shown statement traces to a verbatim `Claim` + a resolvable `ClaimSource`.
No paraphrase is ever stored as a Claim.

## Naming (important)
- Product / display name: **MedThread**. Workspace packages: **`@medthread/*`**.
- The git repo/directory is still **`DoctorsNotes`**, and the `DoctorsNotesError` type name is
  unchanged — the rename (PROJECT.md D16) was display strings + package names only.

## Layout & boundaries (enforced by dependency-cruiser, CI-failing)
- `apps/mobile` — Expo (SDK 52). **ZERO AI deps, no secrets.** Calls the web routes via
  `EXPO_PUBLIC_API_URL`, always with a fixture fallback.
- `apps/web` — Next.js on Vercel. The **only** importer of `@medthread/ai`. Live routes:
  `/api/extract` (audio→claims), `/api/ask` (retrieval Q&A), `/api/extract-document` (vision→claims).
- `packages/{domain,reconciler}` — pure, offline, deterministic; no AI/react/node builtins.
- `packages/ai` — **server-only**; Claude/Scribe impls behind swappable interfaces.

## How to work
- Package manager: **pnpm** (workspace). After changing deps, run `pnpm install`.
- **git must be run as:** `DEVELOPER_DIR=/Library/Developer/CommandLineTools git …`
- Verify before calling anything done:
  - `pnpm -r run typecheck`
  - `pnpm --filter @medthread/reconciler run test` (and `@medthread/ai`, `@medthread/supabase`) — vitest
  - `pnpm run depcruise` (must be 0 violations; proves mobile stays zero-AI)
- Commit/push only when asked. Branch is `feat/mvp-patient-slice`; **`main` is PR-based** (don't
  force-push it — land via a PR merge).

## Ignore these known false-positive hooks
- Vercel plugin suggesting `"use client"` on `apps/mobile/**` files — these are **Expo/React Native**,
  not Next.js.
- ai-sdk hook saying "use @ai-sdk/anthropic" on `packages/ai/**` — the **direct Anthropic SDK** is
  intentional here (matches the existing extractor/asker and the claude-api skill). Model: `claude-opus-4-8`.

## Core safety property (do not regress)
`/api/ask` is **retrieval-only**: the model selects existing claim ids and never generates a medical
fact. A response with empty/irrelevant `claimIds` collapses to `no_source` — enforced by the pure
`resolveAskResponse` (packages/ai) + `AskResponse.parse` at the route, locked by network-free tests.

## Open threads & gotchas
- **Deploy pending:** `apps/web` needs a Vercel import + `ANTHROPIC_API_KEY` + `ELEVENLABS_API_KEY`
  set in Vercel; then point mobile `EXPO_PUBLIC_API_URL` at the deployed URL. `.env.local` values are
  empty locally, so the keys must come from the user.
- **PR to main** not yet opened: `feat/mvp-patient-slice → main`.
- **Mobile `jest` is broken/deferred** — `jest.config.js` references a missing `jest.setup.js`; no
  mobile tests exist. Don't rely on `pnpm --filter @medthread/mobile run test`.
- **`packages/reconciler/src/reconcile.ts` is classified as binary** by `file`/`grep` (stray non-text
  byte). It builds/tests fine, but `grep -I` silently skips it — use `grep -a` when searching.
