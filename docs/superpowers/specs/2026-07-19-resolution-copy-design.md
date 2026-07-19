# Agent-Voice Resolution Statements — Design

**Date:** 2026-07-19
**Status:** Approved (design + copy table approved in chat)

## Goal

When the customer acts on a proposal — approve, dismiss, undo, block, release, or
book an RM — the agent answers in words, in first person, saying exactly what it
just did (or deliberately didn't do), with the real amounts. Today the resolved
card shows only a generic chip and the toast is generic; the specific text hides
in the Log tab.

## Mechanism

- `ProposalDraft` gains `resolutionCopy?: Partial<Record<ProposalStatus, string>>`
  — first-person statements authored at draft time (amounts already known there),
  keyed by the FINAL status the resolution produces (`approved`, `rejected`,
  `reverted`, `escalated`, `blocked`, `confirmed`).
- `ProposalChoice` gains `resolvedText?: string` — a per-choice override for
  choices that share a status but need distinct wording (the shortfall's two
  approve options: top-up vs instalments).
- `AgentProposal` gains `resolutionNote?: string`. In `resolveProposal`, after the
  final status is known: `note = choice.resolvedText ?? p.resolutionCopy?.[status]`.
  If present, store it on the proposal and use it as the toast text; if absent,
  today's generic toast stands and no note is stored.
- The same choice can end in different statuses (Undo on an executed card →
  `reverted`; Undo on a still-pending Suggest card → `rejected` dismiss). Keying
  by final status makes both truthful; `resolvedText` (keyed to the choice) is
  therefore only used where the status alone is ambiguous (`instalment`).
- `revertAudit` (Undo from the Log tab or the overnight sheet): look up the
  proposal by `entry.proposalId`; if it carries `resolutionCopy.reverted`, use it
  for the toast and store it as the proposal's `resolutionNote`; else keep the
  generic toast.
- **Card rendering:** resolved cards (`ProposalCard`) show the `resolutionNote`
  as one quiet first-person line directly beneath the status chip (12px,
  `text-ocbc-slate`, left-aligned). No note → chip only, as today.

## The copy (authoritative; interpolations shown as `${…}`)

**Yield — idle-cash** (in the draft's returned object):
- approved: `Done — ${money(amount)} is now in the 6-month Fixed Deposit at ${pct(targetApy)}. Your buffer never moved.`
- reverted: `I closed the Fixed Deposit and put ${money(amount)} back in ${from.name} — balances exactly as before.`
- rejected: `Okay — I left it as cash. ${money(amount)} stays liquid in ${from.name}.`

**Cashflow — salary-allocation:**
- approved: `` `Done — ${money(movedNow)} is in your goals${deferred > 0 ? `, and I’ll move the ${money(deferred)} after IRAS clears` : ''}.` ``
- reverted: `I took the ${money(movedNow)} back out of your goals — your Everyday Account is exactly as before.`
- rejected: `Okay — this month’s pay stays put. Your allocation rule is untouched for next time.`

**Cashflow — shortfall** (choices: topup / instalment / dismiss):
- approved (used by `topup`): `Done — I moved ${money(topUp)} from your 360 to Everyday. You’ll stay above your buffer through the pinch.`
- reverted (Log-tab undo of the executed top-up): `I moved the ${money(topUp)} back to your 360 — the top-up is undone, balances exactly as before.`
- `instalment` choice gets `resolvedText`: `IRAS is now split into 12 GIRO instalments — no lump sum, and your buffer holds.`
- rejected: `Okay — I’ll stay out of it, and I’ll warn you again closer to the dip.`

**FX & Travel — fx-travel:**
- approved: `Locked — ${p.pair} at ${p.lockRate} on ${money(p.sgdLock)}. Your Japan budget is set.`
- reverted: `I unwound the lock — ${money(p.sgdLock)} is back in SGD at market rate.`
- rejected: `No lock — you’ll ride the market rate; I’ll flag it if the window improves.`

**Protection — suspicious transfer:**
- blocked: `Blocked and reported — ${money(t.amount)} never left your account. Money Lock stays on.`
- confirmed: `Released — ${money(t.amount)} sent to ${t.payee}, since you confirmed it was you.`
- No `reverted` copy by design: the protective hold is `reversible: false` (its
  revert was a silent no-op) — a hold resolves only through Block / It-was-me.

**Debt — refinance handoff:**
- escalated: `Booked — your RM has the full refinancing pack and will call within a day.`
- rejected: `Parked — I’ll keep watching rates and flag it again if the saving grows.`

Copy uses typographic apostrophes (’) as shown. Statements are ≤ ~110 chars so
the toast stays one comfortable line.

## Edge handling

- "Looks good"/"Keep it" on an already auto-executed card resolves `approved`
  without re-executing; the approved copy ("Done — … is in …") remains true.
- Escalated three-option cards (above the comfort line) reuse the same lookup —
  `approve` → approved copy, `book` → escalated copy (debt has one authored;
  other agents fall back to the generic toast), `notnow` → rejected copy.
- Missing copy anywhere → exactly today's behavior. No scenario is required to
  author all statuses.

## Files touched

`shared/types.ts` (three additions), `shared/agents/{yield,cashflow,fxTravel,protection,debt}.agent.ts`
(copy), `src/store/useSimulation.ts` (`resolveProposal` + `revertAudit` compose,
store, toast), `src/components/feed/ProposalCard.tsx` (render the note),
`scripts/voice-check.ts` (extended assertion).

## Verification

- `npm run typecheck` exits 0; `npm run smoke` unchanged (resolution copy is
  inert until a choice is tapped — smoke taps nothing).
- `scripts/voice-check.ts` gains a section asserting that for the default persona
  events, every actionable proposal (yield idle-cash, cashflow salary-allocation
  and shortfall, fx-travel, protection transfer, debt handoff) carries
  `resolutionCopy` with at least the statuses its choices can produce, and that
  `resolvedText` exists on the shortfall's `instalment` choice.
- Manual: approve / undo / dismiss each scenario in the browser — card shows the
  agent's statement under the chip, toast says the same words; Undo from the Log
  tab shows the reverted statement.
