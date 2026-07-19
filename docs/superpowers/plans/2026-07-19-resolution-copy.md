# Agent-Voice Resolution Statements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** When the customer taps any proposal choice (approve / dismiss / undo / block / release / book RM), the agent states in first person exactly what it just did, on the resolved card and in the toast.

**Architecture:** Drafts author status-keyed `resolutionCopy` (amounts interpolated at draft time) plus per-choice `resolvedText` overrides; `resolveProposal`/`revertAudit` store the matching statement as `resolutionNote` and use it as the toast; `ProposalCard`'s resolved banner renders it. Missing copy → today's generic behavior, unchanged.

**Tech Stack:** Shared TS simulation layer + zustand + React. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-19-resolution-copy-design.md`

## Global Constraints

- Copy strings verbatim from this plan (typographic apostrophes ’ as written); each ≤ ~110 chars.
- Only these files change: `shared/types.ts`, `scripts/voice-check.ts`, `shared/agents/{yield,cashflow,fxTravel,protection,debt}.agent.ts`, `src/store/useSimulation.ts`, `src/components/feed/ProposalCard.tsx`.
- Fallback preserved: any proposal without copy behaves exactly as today (generic toast, chip only).
- No test framework exists; gates are `npm run typecheck`, `npm run voice-check`, `npm run smoke`.
- Branch: `feature/resolution-copy` (already created; spec committed on it).

---

### Task 1: Author side — types, failing check, agent copy (3 commits)

**Files:**
- Modify: `shared/types.ts`
- Modify: `scripts/voice-check.ts`
- Modify: `shared/agents/yield.agent.ts`, `shared/agents/cashflow.agent.ts`, `shared/agents/fxTravel.agent.ts`, `shared/agents/protection.agent.ts`, `shared/agents/debt.agent.ts`

**Interfaces produced (Task 2 relies on these exact names):**
- `ProposalChoice.resolvedText?: string`
- `ProposalDraft.resolutionCopy?: Partial<Record<ProposalStatus, string>>`
- `AgentProposal.resolutionNote?: string`

- [ ] **Step 1 (commit 1 of 3): types.** In `shared/types.ts`:

(a) In `ProposalChoice`, after `resolvesTo: ProposalStatus;` add:

```ts
  /** First-person statement for this choice when its status-keyed copy would be
   * ambiguous (e.g. two approve options with different effects). */
  resolvedText?: string;
```

(b) In `ProposalDraft`, after the closing `};` of the `voices?: { … }` field, add:

```ts
  /** First-person statements the agent gives AFTER the customer resolves the
   * card, keyed by the final status. Amounts are interpolated at draft time. */
  resolutionCopy?: Partial<Record<ProposalStatus, string>>;
```

(c) In `AgentProposal`, after `policy: PolicyDecision; // the WHY behind auto vs ask vs observe` add:

```ts
  resolutionNote?: string; // the agent's in-words statement once resolved
```

Run `npm run typecheck` (exit 0), then:

```bash
git add shared/types.ts
git commit -m "feat(agents): resolution-copy fields on drafts, choices and proposals"
```

- [ ] **Step 2 (commit 2 of 3): failing check.** In `scripts/voice-check.ts`, immediately BEFORE the final block that starts `if (failures > 0) {`, insert:

```ts
console.log(`\n— RESOLUTION copy: every actionable card must answer in words`);
{
  const configs = structuredClone(DEFAULT_CONFIGS);
  const actionable = persona.events.filter((e) =>
    ['salary', 'idle-cash', 'travel-signal', 'bill-forecast', 'outgoing-transfer', 'refinance-signal'].includes(e.type),
  );
  for (const event of actionable) {
    const res = dispatch(event, structuredClone(persona.initialState), configs);
    for (const p of res.proposals) {
      if (!p.choices || p.choices.length === 0) continue;
      for (const c of p.choices) {
        const note = c.resolvedText ?? p.resolutionCopy?.[c.resolvesTo];
        if (!note) fail(`[${event.type}] "${p.title}" choice "${c.id}" has no resolution statement for ${c.resolvesTo}`);
        // Undo on a still-pending card resolves as a dismiss — that path needs words too.
        if (c.resolvesTo === 'reverted' && !p.resolutionCopy?.rejected) {
          fail(`[${event.type}] "${p.title}" has an undo choice but no 'rejected' copy for the pending-dismiss path`);
        }
      }
      const instalment = p.choices.find((c) => c.id === 'instalment');
      if (instalment && !instalment.resolvedText) {
        fail(`[${event.type}] instalment choice must carry resolvedText (shares 'approved' with top-up)`);
      }
    }
  }
}
```

Run `npm run typecheck` (exit 0) and `npm run voice-check` — MUST exit 1 (no copy authored yet; capture the failing output). Then:

```bash
git add scripts/voice-check.ts
git commit -m "test(agents): voice-check asserts resolution statements exist"
```

- [ ] **Step 3 (commit 3 of 3): agent copy.** All additions go inside the returned draft object, immediately AFTER the `choices: [ … ],` block (same indentation as `choices`), except the shortfall `instalment` edit which modifies its choice line.

(a) `shared/agents/yield.agent.ts`:

```ts
      resolutionCopy: {
        approved: `Done — ${money(amount)} is now in the 6-month Fixed Deposit at ${pct(targetApy)}. Your buffer never moved.`,
        reverted: `I closed the Fixed Deposit and put ${money(amount)} back in ${from.name} — balances exactly as before.`,
        rejected: `Okay — I left it as cash. ${money(amount)} stays liquid in ${from.name}.`,
      },
```

(b) `shared/agents/cashflow.agent.ts`, in `allocate()`:

```ts
    resolutionCopy: {
      approved: `Done — ${money(movedNow)} is in your goals${deferred > 0 ? `, and I’ll move the ${money(deferred)} after IRAS clears` : ''}.`,
      reverted: `I took the ${money(movedNow)} back out of your goals — your Everyday Account is exactly as before.`,
      rejected: `Okay — this month’s pay stays put. Your allocation rule is untouched for next time.`,
    },
```

(c) `shared/agents/cashflow.agent.ts`, in `shortfall()`: replace the line

```ts
      { id: 'instalment', label: 'Split IRAS into GIRO instalments', kind: 'secondary', resolvesTo: 'approved' },
```

with

```ts
      { id: 'instalment', label: 'Split IRAS into GIRO instalments', kind: 'secondary', resolvesTo: 'approved', resolvedText: 'IRAS is now split into 12 GIRO instalments — no lump sum, and your buffer holds.' },
```

and after that `choices: [ … ],` block add:

```ts
    resolutionCopy: {
      approved: `Done — I moved ${money(topUp)} from your 360 to Everyday. You’ll stay above your buffer through the pinch.`,
      rejected: `Okay — I’ll stay out of it, and I’ll warn you again closer to the dip.`,
    },
```

(d) `shared/agents/fxTravel.agent.ts`:

```ts
      resolutionCopy: {
        approved: `Locked — ${p.pair} at ${p.lockRate} on ${money(p.sgdLock)}. Your Japan budget is set.`,
        reverted: `I unwound the lock — ${money(p.sgdLock)} is back in SGD at market rate.`,
        rejected: `No lock — you’ll ride the market rate; I’ll flag it if the window improves.`,
      },
```

(e) `shared/agents/protection.agent.ts`:

```ts
      resolutionCopy: {
        blocked: `Blocked and reported — ${money(t.amount)} never left your account. Money Lock stays on.`,
        confirmed: `Released — ${money(t.amount)} sent to ${t.payee}, since you confirmed it was you.`,
      },
```

(f) `shared/agents/debt.agent.ts`:

```ts
      resolutionCopy: {
        escalated: `Booked — your RM has the full refinancing pack and will call within a day.`,
        rejected: `Parked — I’ll keep watching rates and flag it again if the saving grows.`,
      },
```

Run `npm run typecheck` (exit 0), `npm run voice-check` (now exit 0 — capture output), `npm run smoke` (exit 0, unchanged). Then:

```bash
git add shared/agents/yield.agent.ts shared/agents/cashflow.agent.ts shared/agents/fxTravel.agent.ts shared/agents/protection.agent.ts shared/agents/debt.agent.ts
git commit -m "feat(agents): first-person resolution statements per scenario"
```

---

### Task 2: Consumer side — store wiring + card rendering (1 commit)

**Files:**
- Modify: `src/store/useSimulation.ts` (`resolveProposal`, `revertAudit` — full replacements below)
- Modify: `src/components/feed/ProposalCard.tsx` (`ResolvedBanner`)

**Interfaces:**
- Consumes: `resolvedText` / `resolutionCopy` / `resolutionNote` (Task 1).
- Produces: resolved proposals carry `resolutionNote`; toasts use it.

- [ ] **Step 1: replace the whole `resolveProposal` implementation** in `src/store/useSimulation.ts` (from `resolveProposal: (proposalId, choiceId) => {` to its closing `},`) with:

```ts
    resolveProposal: (proposalId, choiceId) => {
      const { proposals, state, audit } = get();
      const p = proposals.find((x) => x.id === proposalId);
      const choice = p?.choices?.find((c) => c.id === choiceId);
      if (!p || !choice) return;

      // The agent answers in words: the choice's own statement, else the copy
      // authored for the status this resolution actually lands on.
      const noteFor = (status: AgentProposal['status']) => choice.resolvedText ?? p.resolutionCopy?.[status];
      const setStatus = (status: AgentProposal['status']) => {
        const note = noteFor(status);
        set({
          proposals: get().proposals.map((x) =>
            x.id === proposalId ? { ...x, status, ...(note ? { resolutionNote: note } : {}) } : x,
          ),
        });
        return note;
      };
      const prependAudit = (detail: string) => set({ audit: [auditEntry(p, detail), ...get().audit] });

      // UNDO an already-executed action — or, if nothing actually ran yet (e.g.
      // declining a still-pending Suggest-mode proposal), treat it as a dismiss.
      if (choice.resolvesTo === 'reverted') {
        const entry = audit.find((a) => a.proposalId === proposalId && !a.reverted && a.action);
        if (entry?.action) {
          const r = revertAction(state, entry.action, entry.meta);
          if (r.ok) {
            set({
              state: r.state,
              audit: [auditEntry(p, `Reversed: ${r.detail}`), ...get().audit.map((a) => (a.id === entry.id ? { ...a, reverted: true } : a))],
            });
          }
          const note = setStatus('reverted');
          get().pushToast(note ?? 'Reversed — funds restored exactly', 'good');
        } else {
          // Nothing ran yet, so this "undo" is a decline — use the rejected copy.
          const note = p.resolutionCopy?.rejected;
          set({
            proposals: get().proposals.map((x) =>
              x.id === proposalId ? { ...x, status: 'rejected', ...(note ? { resolutionNote: note } : {}) } : x,
            ),
          });
          get().pushToast(note ?? 'Dismissed — nothing changed', 'info');
        }
        return;
      }

      // PROTECTION: block & report.
      if (choice.id === 'block') {
        const r = blockTransfer(state, { transferId: p.action?.params?.transferId });
        set({ state: r.state, audit: [auditEntry(p, r.detail), ...get().audit] });
        const note = setStatus('blocked');
        get().pushToast(note ?? 'Blocked & reported — your money is safe', 'good');
        return;
      }

      // PROTECTION: customer confirms it was them.
      if (choice.id === 'release') {
        const r = releaseTransfer(state, { transferId: p.action?.params?.transferId });
        set({ state: r.state, audit: [auditEntry(p, r.detail), ...get().audit] });
        const note = setStatus('confirmed');
        get().pushToast(note ?? 'Released — transfer sent', 'info');
        return;
      }

      // Book a human RM.
      if (choice.resolvesTo === 'escalated') {
        set({ rmBookings: [...get().rmBookings, proposalId] });
        const note = setStatus('escalated');
        get().pushToast(note ?? 'Booked — your RM already has the full context', 'info');
        return;
      }

      // Approve a pending action (or alternative option).
      if (choice.resolvesTo === 'approved') {
        if (choice.id === 'instalment') {
          prependAudit('Set up an IRAS GIRO instalment plan (12 months) — no lump sum needed.');
          const note = setStatus('approved');
          get().pushToast(note ?? 'IRAS instalment plan set up', 'good');
          return;
        }
        // Execute now only if it wasn't already auto-executed.
        if (p.kind === 'needs-approval' && p.action) {
          const r = applyAction(state, p.action);
          if (r.ok) {
            set({
              state: r.state,
              audit: [{ ...auditEntry(p, r.detail), reversible: p.action.reversible, meta: r.meta }, ...get().audit],
            });
          }
        }
        const note = setStatus('approved');
        get().pushToast(note ?? `Done — ${p.action?.label ?? 'approved'}`, 'good');
        return;
      }

      // Reject / dismiss / not now.
      if (choice.resolvesTo === 'rejected') {
        const note = setStatus('rejected');
        get().pushToast(note ?? 'Dismissed — nothing changed', 'info');
      }
    },
```

- [ ] **Step 2: replace the whole `revertAudit` implementation** (from `revertAudit: (auditId) => {` to its closing `},`) with:

```ts
    revertAudit: (auditId) => {
      const { audit, state } = get();
      const entry = audit.find((a) => a.id === auditId);
      if (!entry?.action || entry.reverted || !entry.reversible) return;
      const r = revertAction(state, entry.action, entry.meta);
      if (!r.ok) return;
      // Same words whether the undo came from the card or the Decision Log.
      const note = get().proposals.find((p) => p.id === entry.proposalId)?.resolutionCopy?.reverted;
      set({
        state: r.state,
        audit: [
          auditEntry({ ...(get().proposals.find((p) => p.id === entry.proposalId) ?? ({} as AgentProposal)), id: entry.proposalId, agentId: entry.agentId, title: entry.title, createdAt: entry.at, confidence: entry.confidence, action: entry.action } as AgentProposal, `Reversed: ${r.detail}`),
          ...get().audit.map((a) => (a.id === auditId ? { ...a, reverted: true } : a)),
        ],
        proposals: get().proposals.map((p) => (p.id === entry.proposalId ? { ...p, status: 'reverted', ...(note ? { resolutionNote: note } : {}) } : p)),
      });
      get().pushToast(note ?? 'Reversed from the Decision Log', 'good');
    },
```

- [ ] **Step 3: render the note.** In `src/components/feed/ProposalCard.tsx`, inside `ResolvedBanner`, replace:

```tsx
  const r = map[proposal.status] ?? { text: 'Resolved', color: '#5B5B6B' };
  return (
    <div
      className="flex flex-1 items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-center text-sm font-bold"
      style={{ background: tint(r.color, 0.12), color: r.color }}
    >
      {r.icon && <Icon name={r.icon} size={15} strokeWidth={2.2} />}
      {r.text}
    </div>
  );
```

with:

```tsx
  const r = map[proposal.status] ?? { text: 'Resolved', color: '#5B5B6B' };
  return (
    <div className="flex-1">
      <div
        className="flex items-center justify-center gap-1.5 rounded-full px-3 py-2.5 text-center text-sm font-bold"
        style={{ background: tint(r.color, 0.12), color: r.color }}
      >
        {r.icon && <Icon name={r.icon} size={15} strokeWidth={2.2} />}
        {r.text}
      </div>
      {proposal.resolutionNote && (
        <p className="mt-2 px-1 text-left text-[12px] leading-relaxed text-ocbc-slate">{proposal.resolutionNote}</p>
      )}
    </div>
  );
```

- [ ] **Step 4: Verify and commit**

Run: `npm run typecheck && npm run voice-check && npm run smoke` — all exit 0.

```bash
git add src/store/useSimulation.ts src/components/feed/ProposalCard.tsx
git commit -m "feat(app): agents answer in words when you resolve a card"
```

---

### Task 3: Verification pass (controller-led)

- [ ] `npm run typecheck && npm run build && npm run voice-check && npm run smoke` all exit 0.
- [ ] Manual (dev server): for each scenario — approve, then reset and undo, then reset and dismiss — the resolved card shows the agent's statement beneath the chip and the toast says the same words; Undo from the Log tab shows the reverted statement and updates the card; a scenario resolved in Observe mode (noted, no choices) is unchanged.
