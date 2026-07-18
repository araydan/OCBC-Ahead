# In-App User Guide (Spotlight Tour) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A skippable, replayable spotlight tour inside the OCBC Ahead phone frame that walks the user through every customer-facing function, without ever dimming or blocking the demo controller panel.

**Architecture:** A `GuideOverlay` component rendered inside the phone frame's `overflow-hidden` container dims the app with a box-shadow cutout around `data-guide`-tagged elements, switching tabs per step. Guide state (current step, start/next/back/end) lives in the existing `useUI` zustand store; step definitions (tab, target, copy) are a declarative list in `guideSteps.ts`. First-visit auto-show is a `localStorage` flag; an `info` icon in the TopBar replays the tour.

**Tech Stack:** React 18 + TypeScript, zustand 5, framer-motion 11, Tailwind. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-07-18-user-guide-design.md`

## Global Constraints

- No new npm dependencies.
- localStorage key: `ocbc-ahead-guide-seen`, value `"1"`.
- Overlay: `absolute inset-0 z-[60]` inside the phone clip container (above sheets z-50 / toasts z-50).
- Dim color: `rgba(15,23,42,0.55)`; spotlight padding 6 px; cutout via `box-shadow: 0 0 0 2000px rgba(15,23,42,0.55)`.
- Restart button: `Icon name="info"`, `aria-label="Replay the app tour"`, frosted style `grid h-9 w-9 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 transition hover:bg-white/20`, placed between bell and avatar, carries `data-guide="restart"`.
- Skip, Done, and Escape all mark the guide seen; closing because RM mode activated does NOT mark it seen.
- Animations honor `useReducedMotion`.
- **This repo has no test harness** (no vitest/jest). The per-task gate is `npm run typecheck` (tsc --noEmit); the final task is a scripted manual verification in the browser via `npm run dev`. Do not add a test framework.
- All work happens on branch `feature/user-guide-tour` (already created).

---

### Task 1: Guide state in the `useUI` store

**Files:**
- Modify: `src/store/useUI.ts` (full-file replacement below)

**Interfaces:**
- Consumes: `useSimulation` from `src/store/useSimulation.ts` (`setTab(t: Tab)`); safe to import — `useSimulation.ts` does not import `useUI`.
- Produces (later tasks rely on these exact names):
  - `guideStep: number | null` (index into `GUIDE_STEPS`, null = closed)
  - `startGuide(fromWelcome: boolean): void` — step 0 when true, step 1 when false; closes any open sheets
  - `guideNext(): void` / `guideBack(): void`
  - `endGuide(markSeen?: boolean): void` — default true; writes localStorage, closes tour, returns to home tab
  - exported helper `guideSeen(): boolean`

- [ ] **Step 1: Replace `src/store/useUI.ts` with:**

```ts
import { create } from 'zustand';
import { useSimulation } from './useSimulation';

const GUIDE_SEEN_KEY = 'ocbc-ahead-guide-seen';

/** localStorage can throw when storage is blocked (private mode) — treat as "not seen". */
export function guideSeen(): boolean {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markGuideSeen() {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, '1');
  } catch {
    /* non-fatal */
  }
}

// Ephemeral UI state, kept separate from the domain simulation store.
interface UIStore {
  askProposalId: string | null;
  awayProposalId: string | null; // a single "while you were away" move being inspected
  awayAll: boolean; // the full overnight breakdown (all moves) is open
  highlightId: string | null; // proposal briefly spotlighted (e.g. from the bell)
  showDemoPanel: boolean;
  guideStep: number | null; // index into GUIDE_STEPS; null = tour closed
  openAsk: (id: string) => void;
  closeAsk: () => void;
  openAway: (id: string) => void;
  openAwayAll: () => void;
  closeAway: () => void;
  highlight: (id: string) => void;
  clearHighlight: () => void;
  toggleDemoPanel: () => void;
  startGuide: (fromWelcome: boolean) => void;
  guideNext: () => void;
  guideBack: () => void;
  endGuide: (markSeen?: boolean) => void;
}

export const useUI = create<UIStore>((set, get) => ({
  askProposalId: null,
  awayProposalId: null,
  awayAll: false,
  highlightId: null,
  showDemoPanel: true,
  guideStep: null,
  openAsk: (id) => set({ askProposalId: id }),
  closeAsk: () => set({ askProposalId: null }),
  openAway: (id) => set({ awayProposalId: id, awayAll: false }),
  openAwayAll: () => set({ awayAll: true, awayProposalId: null }),
  closeAway: () => set({ awayProposalId: null, awayAll: false }),
  highlight: (id) => set({ highlightId: id }),
  clearHighlight: () => set({ highlightId: null }),
  toggleDemoPanel: () => set({ showDemoPanel: !get().showDemoPanel }),
  // The tour owns the screen: starting it closes any open sheets.
  startGuide: (fromWelcome) =>
    set({ guideStep: fromWelcome ? 0 : 1, askProposalId: null, awayProposalId: null, awayAll: false }),
  guideNext: () => set({ guideStep: (get().guideStep ?? 0) + 1 }),
  guideBack: () => set({ guideStep: Math.max(0, (get().guideStep ?? 1) - 1) }),
  endGuide: (markSeen = true) => {
    if (markSeen) markGuideSeen();
    set({ guideStep: null });
    useSimulation.getState().setTab('home');
  },
}));
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: exits 0, no output.

- [ ] **Step 3: Commit**

```bash
git add src/store/useUI.ts
git commit -m "feat(guide): tour state in useUI store"
```

---

### Task 2: Step definitions with final copy

**Files:**
- Create: `src/components/guide/guideSteps.ts`

**Interfaces:**
- Consumes: `Tab` type from `src/store/useSimulation.ts` (`'home' | 'control' | 'activity' | 'log'`).
- Produces: `GuideStep` interface and `GUIDE_STEPS: GuideStep[]` (length 9; index 0 = welcome). `target` values must match the `data-guide` attributes added in Task 3 (`away`, `team`, `feed`, `bell`, `control-hub`, `money-hub`, `log-hub`, `restart`).

- [ ] **Step 1: Create `src/components/guide/guideSteps.ts`:**

```ts
import type { Tab } from '@/store/useSimulation';

export interface GuideStep {
  tab: Tab;
  /** data-guide attribute of the element to spotlight; null = centered card, even dim. */
  target: string | null;
  title: string;
  body: string;
}

// Index 0 is the welcome card (auto-show entry); the restart icon starts at index 1.
export const GUIDE_STEPS: GuideStep[] = [
  {
    tab: 'home',
    target: null,
    title: 'Welcome to OCBC Ahead',
    body:
      'A team of six banking agents watches your money and acts for you — always within limits you set. Take a one-minute tour of how it works.',
  },
  {
    tab: 'home',
    target: 'away',
    title: 'While you were away',
    body:
      'Overnight, your agents kept working. This digest gathers every move they made while you were gone — tap it to review each one and undo anything you don’t like.',
  },
  {
    tab: 'home',
    target: 'team',
    title: 'Meet your agent team',
    body:
      'Six specialists on duty: Yield puts idle cash to work, Cashflow looks ahead so you’re never caught short, FX & Travel handles trips and currencies, Protection guards every dollar leaving your account, Debt & Credit watches loans and rates, and Life-Event keeps your profile current.',
  },
  {
    tab: 'home',
    target: 'feed',
    title: 'Your agent feed',
    body:
      'When an agent needs your call, it posts a card here. Approve or decline in one tap, ask it to explain its reasoning in plain language, or book a human relationship manager for the big decisions.',
  },
  {
    tab: 'home',
    target: 'bell',
    title: 'Never miss a decision',
    body:
      'The bell counts the decisions waiting on you and jumps straight to the first one. If it’s quiet, your agents are on it.',
  },
  {
    tab: 'control',
    target: 'control-hub',
    title: 'You set the autonomy',
    body:
      'For each agent choose Observe (just watches), Suggest (asks first) or Auto (acts within a dollar limit you set). Protection never drops below Suggest — safety can’t be switched off.',
  },
  {
    tab: 'activity',
    target: 'money-hub',
    title: 'Your money, the classic view',
    body:
      'Accounts and balances live here, plus the forward view: the payments about to hit over the next three weeks and where they leave you — the same picture your Cashflow Agent reasons over.',
  },
  {
    tab: 'log',
    target: 'log-hub',
    title: 'Everything on the record',
    body:
      'Every action an agent takes lands here in plain English — who, what, why, and when. Anything reversible can be undone with one tap.',
  },
  {
    tab: 'home',
    target: 'restart',
    title: 'Replay anytime',
    body:
      'That’s the tour. Tap this icon whenever you want a refresher — now go see what your agents have been up to.',
  },
];
```

- [ ] **Step 2: Verify**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 3: Commit**

```bash
git add src/components/guide/guideSteps.ts
git commit -m "feat(guide): declarative tour steps with copy"
```

---

### Task 3: `data-guide` anchors on existing elements

**Files:**
- Modify: `src/components/layout/TopBar.tsx` (bell)
- Modify: `src/components/feed/WhileYouWereAway.tsx`
- Modify: `src/components/feed/AgentTeamStrip.tsx`
- Modify: `src/components/feed/HomeFeed.tsx`
- Modify: `src/components/control/ControlCenter.tsx`
- Modify: `src/components/activity/ActivityView.tsx`
- Modify: `src/components/audit/AuditLog.tsx`
- Modify: `src/components/layout/PhoneFrame.tsx` (scroller marker)

**Interfaces:**
- Produces: DOM attributes `data-guide="bell" | away | team | feed | control-hub | money-hub | log-hub` and `data-guide-scroller` on the tab scroll container. `GuideOverlay` (Task 4) locates targets with `frame.querySelector('[data-guide="…"]')` and scrolls `[data-guide-scroller]`. (`data-guide="restart"` is added with the button in Task 5.)

- [ ] **Step 1: TopBar bell.** In `src/components/layout/TopBar.tsx`, the bell button currently opens:

```tsx
          <button
            onClick={onBell}
            aria-label={pending.length > 0 ? `${pending.length} decisions waiting — jump to the first` : 'Notifications'}
```

Add the attribute:

```tsx
          <button
            onClick={onBell}
            data-guide="bell"
            aria-label={pending.length > 0 ? `${pending.length} decisions waiting — jump to the first` : 'Notifications'}
```

- [ ] **Step 2: Away digest.** In `src/components/feed/WhileYouWereAway.tsx`, the root element is:

```tsx
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-glow"
```

Add the attribute:

```tsx
    <motion.div
      data-guide="away"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-glow"
```

- [ ] **Step 3: Team strip.** In `src/components/feed/AgentTeamStrip.tsx`:

```tsx
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setTab('control')}
```

becomes

```tsx
    <motion.button
      data-guide="team"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setTab('control')}
```

- [ ] **Step 4: Feed header.** In `src/components/feed/HomeFeed.tsx`:

```tsx
      <div className="flex items-center justify-between px-1 pt-1">
```

becomes

```tsx
      <div data-guide="feed" className="flex items-center justify-between px-1 pt-1">
```

- [ ] **Step 5: Control hub card.** In `src/components/control/ControlCenter.tsx`:

```tsx
      <div className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
          <Icon name="sliders" size={18} strokeWidth={2} /> You're in control
```

becomes

```tsx
      <div data-guide="control-hub" className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
          <Icon name="sliders" size={18} strokeWidth={2} /> You're in control
```

- [ ] **Step 6: Money hub card.** In `src/components/activity/ActivityView.tsx`:

```tsx
      <div className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-white/60">
          <Icon name="wallet" size={15} strokeWidth={2} /> Cash & savings · SGD
```

becomes

```tsx
      <div data-guide="money-hub" className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[12px] font-bold uppercase tracking-wide text-white/60">
          <Icon name="wallet" size={15} strokeWidth={2} /> Cash & savings · SGD
```

- [ ] **Step 7: Log hub card.** In `src/components/audit/AuditLog.tsx`:

```tsx
      <div className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
          <Icon name="receipt" size={18} strokeWidth={2} /> Decision Log
```

becomes

```tsx
      <div data-guide="log-hub" className="rounded-2xl bg-ocbc-ink p-4 text-white">
        <h2 className="flex items-center gap-2 text-[17px] font-extrabold">
          <Icon name="receipt" size={18} strokeWidth={2} /> Decision Log
```

- [ ] **Step 8: Scroller marker.** In `src/components/layout/PhoneFrame.tsx`:

```tsx
            <div className="no-scrollbar flex-1 overflow-y-auto">
```

becomes

```tsx
            <div data-guide-scroller className="no-scrollbar flex-1 overflow-y-auto">
```

- [ ] **Step 9: Verify**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 10: Commit**

```bash
git add src/components/layout/TopBar.tsx src/components/feed/WhileYouWereAway.tsx src/components/feed/AgentTeamStrip.tsx src/components/feed/HomeFeed.tsx src/components/control/ControlCenter.tsx src/components/activity/ActivityView.tsx src/components/audit/AuditLog.tsx src/components/layout/PhoneFrame.tsx
git commit -m "feat(guide): data-guide anchors for tour targets"
```

---

### Task 4: `GuideOverlay` component + PhoneFrame wiring

**Files:**
- Create: `src/components/guide/GuideOverlay.tsx`
- Modify: `src/components/layout/PhoneFrame.tsx`

**Interfaces:**
- Consumes: `GUIDE_STEPS` (Task 2); `useUI` guide actions (Task 1); `useSimulation.setTab`; `useEscape(onClose, active)` from `src/lib/useEscape.ts`; `data-guide` anchors (Task 3).
- Produces: `GuideOverlay({ container }: { container: React.RefObject<HTMLDivElement | null> })` — rendered by `PhoneFrame` in customer mode only.

- [ ] **Step 1: Create `src/components/guide/GuideOverlay.tsx`:**

```tsx
import { useCallback, useEffect, useState } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSimulation } from '@/store/useSimulation';
import { useUI } from '@/store/useUI';
import { useEscape } from '@/lib/useEscape';
import { GUIDE_STEPS } from './guideSteps';

const SPOT_PAD = 6; // breathing room around the spotlighted element
const DIM = 'rgba(15,23,42,0.55)';

interface SpotRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/**
 * The spotlight tour. Lives INSIDE the phone frame's overflow-hidden container so
 * the dim (a giant box-shadow around the cutout) is clipped by the phone — the
 * demo panel outside stays untouched and fully interactive.
 */
export function GuideOverlay({ container }: { container: React.RefObject<HTMLDivElement | null> }) {
  const step = useUI((s) => s.guideStep);
  const guideNext = useUI((s) => s.guideNext);
  const guideBack = useUI((s) => s.guideBack);
  const endGuide = useUI((s) => s.endGuide);
  const setTab = useSimulation((s) => s.setTab);
  const reduced = useReducedMotion();

  const [rect, setRect] = useState<SpotRect | null>(null);
  const [frameH, setFrameH] = useState(0);

  const def = step !== null ? GUIDE_STEPS[step] : null;
  const open = def !== null;

  useEscape(() => endGuide(), open);

  const measure = useCallback(() => {
    const frame = container.current;
    if (!frame || !def) return;
    const frameRect = frame.getBoundingClientRect();
    setFrameH(frameRect.height);
    if (!def.target) {
      setRect(null);
      return;
    }
    const el = frame.querySelector<HTMLElement>(`[data-guide="${def.target}"]`);
    // Missing target (e.g. empty away digest after a reset) → centered card, even dim.
    if (!el) {
      setRect(null);
      return;
    }
    // Scroll only the tab's own scroller — scrollIntoView would also scroll the page.
    const scroller = frame.querySelector<HTMLElement>('[data-guide-scroller]');
    if (scroller && scroller.contains(el)) {
      const sr = scroller.getBoundingClientRect();
      const er = el.getBoundingClientRect();
      scroller.scrollTop += er.top - sr.top - (sr.height - er.height) / 2;
    }
    const r = el.getBoundingClientRect();
    setRect({
      top: r.top - frameRect.top - SPOT_PAD,
      left: r.left - frameRect.left - SPOT_PAD,
      width: r.width + SPOT_PAD * 2,
      height: r.height + SPOT_PAD * 2,
    });
  }, [container, def]);

  // On step entry: switch to the step's tab, wait two frames for it to render, measure.
  useEffect(() => {
    if (!def) return;
    setTab(def.tab);
    let raf2 = 0;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(measure);
    });
    return () => {
      cancelAnimationFrame(raf1);
      cancelAnimationFrame(raf2);
    };
  }, [def, setTab, measure]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [open, measure]);

  if (!open || !def || step === null) return null;

  const last = step === GUIDE_STEPS.length - 1;
  const dots = GUIDE_STEPS.length - 1; // tour steps, excluding the welcome card
  const spring = reduced
    ? { duration: 0 }
    : { type: 'spring' as const, stiffness: 380, damping: 34 };
  const cardBelow = rect ? rect.top + rect.height / 2 < frameH / 2 : false;

  return (
    <div className="absolute inset-0 z-[60] overflow-hidden">
      {/* Dim layer: a cutout framed by a huge shadow, or an even wash when centered. */}
      {rect ? (
        <motion.div
          initial={false}
          animate={{ top: rect.top, left: rect.left, width: rect.width, height: rect.height }}
          transition={spring}
          className="absolute rounded-2xl"
          style={{ boxShadow: `0 0 0 2000px ${DIM}` }}
        />
      ) : (
        <div className="absolute inset-0" style={{ background: DIM }} />
      )}

      <motion.div
        key={step}
        initial={reduced ? false : { opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.18 }}
        className={`absolute inset-x-4 rounded-2xl bg-white p-4 shadow-lift ${
          rect ? '' : 'top-1/2 -translate-y-1/2'
        }`}
        style={rect ? (cardBelow ? { top: rect.top + rect.height + 12 } : { bottom: frameH - rect.top + 12 }) : undefined}
      >
        <div className="flex items-start justify-between gap-3">
          <h3 className="text-[15px] font-extrabold text-ocbc-ink">{def.title}</h3>
          {step > 0 && (
            <button
              onClick={() => endGuide()}
              className="shrink-0 text-[11px] font-bold text-ocbc-slate transition hover:text-ocbc-ink"
            >
              Skip tour
            </button>
          )}
        </div>
        <p className="mt-1.5 text-[12.5px] leading-relaxed text-ocbc-slate">{def.body}</p>

        {step === 0 ? (
          <div className="mt-4 flex items-center gap-2">
            <button
              onClick={guideNext}
              className="flex-1 rounded-full bg-ocbc-red px-4 py-2.5 text-[13px] font-bold text-white transition hover:brightness-110"
            >
              Take the tour
            </button>
            <button
              onClick={() => endGuide()}
              className="rounded-full border border-ocbc-line px-4 py-2.5 text-[13px] font-bold text-ocbc-ink transition hover:bg-ocbc-mist"
            >
              Skip for now
            </button>
          </div>
        ) : (
          <div className="mt-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              {Array.from({ length: dots }, (_, i) => (
                <span
                  key={i}
                  className={`h-1.5 rounded-full transition-all ${
                    i + 1 === step ? 'w-4 bg-ocbc-red' : 'w-1.5 bg-ocbc-line'
                  }`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-semibold text-ocbc-slate">
                Step {step} of {dots}
              </span>
              {step > 1 && (
                <button
                  onClick={guideBack}
                  className="rounded-full border border-ocbc-line px-3 py-1.5 text-[12px] font-bold text-ocbc-ink transition hover:bg-ocbc-mist"
                >
                  Back
                </button>
              )}
              <button
                onClick={last ? () => endGuide() : guideNext}
                className="rounded-full bg-ocbc-red px-4 py-1.5 text-[12px] font-bold text-white transition hover:brightness-110"
              >
                {last ? 'Done' : 'Next'}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
```

- [ ] **Step 2: Wire into `src/components/layout/PhoneFrame.tsx`.** Replace the whole file with:

```tsx
import { useEffect, useRef } from 'react';
import { useSimulation } from '@/store/useSimulation';
import { useUI, guideSeen } from '@/store/useUI';
import { TopBar } from './TopBar';
import { BottomNav } from './BottomNav';
import { HomeFeed } from '@/components/feed/HomeFeed';
import { ControlCenter } from '@/components/control/ControlCenter';
import { ActivityView } from '@/components/activity/ActivityView';
import { AuditLog } from '@/components/audit/AuditLog';
import { RMConsole } from '@/components/rm/RMConsole';
import { AskSheet } from '@/components/ask/AskSheet';
import { WhileYouWereAwayDetail } from '@/components/feed/WhileYouWereAwayDetail';
import { Toaster } from '@/components/ui/Toaster';
import { GuideOverlay } from '@/components/guide/GuideOverlay';

export function PhoneFrame() {
  const tab = useSimulation((s) => s.activeTab);
  const rmMode = useSimulation((s) => s.rmMode);
  const guideStep = useUI((s) => s.guideStep);
  const startGuide = useUI((s) => s.startGuide);
  const endGuide = useUI((s) => s.endGuide);
  const frameRef = useRef<HTMLDivElement>(null);

  // First visit only: open the tour at the welcome card.
  useEffect(() => {
    if (!guideSeen()) startGuide(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // The customer app disappears in RM mode — close the tour without marking it seen.
  useEffect(() => {
    if (rmMode && guideStep !== null) endGuide(false);
  }, [rmMode, guideStep, endGuide]);

  return (
    <div className="relative w-full max-w-[400px]">
      <div
        ref={frameRef}
        className="relative h-[820px] max-h-[86vh] overflow-hidden rounded-[2.4rem] border-[10px] border-black bg-[#eef0f5] shadow-lift"
      >
        <div className="absolute left-1/2 top-0 z-30 h-6 w-36 -translate-x-1/2 rounded-b-2xl bg-black" />

        {rmMode ? (
          <RMConsole />
        ) : (
          <div className="flex h-full flex-col">
            <TopBar />
            <div data-guide-scroller className="no-scrollbar flex-1 overflow-y-auto">
              {tab === 'home' && <HomeFeed />}
              {tab === 'control' && <ControlCenter />}
              {tab === 'activity' && <ActivityView />}
              {tab === 'log' && <AuditLog />}
            </div>
            <BottomNav />
          </div>
        )}

        <Toaster />
        <WhileYouWereAwayDetail />
        <AskSheet />
        {!rmMode && <GuideOverlay container={frameRef} />}
      </div>
    </div>
  );
}
```

(Note: the `data-guide-scroller` attribute was already added in Task 3 — keep it.)

- [ ] **Step 3: Verify types**

Run: `npm run typecheck`
Expected: exits 0.

- [ ] **Step 4: Smoke-check in the browser**

Run: `npm run dev` and open the printed URL (default `http://localhost:5173`).
Expected: welcome card appears centered over a dimmed phone; "Take the tour" advances to step 1 with the red overnight digest spotlighted; the demo panel on the right is NOT dimmed and its buttons still respond; Escape closes the tour; reloading does NOT re-open it (localStorage now set). Clear with DevTools → `localStorage.removeItem('ocbc-ahead-guide-seen')` for re-testing.

- [ ] **Step 5: Commit**

```bash
git add src/components/guide/GuideOverlay.tsx src/components/layout/PhoneFrame.tsx
git commit -m "feat(guide): spotlight tour overlay inside the phone frame"
```

---

### Task 5: Restart icon in the TopBar

**Files:**
- Modify: `src/components/layout/TopBar.tsx`

**Interfaces:**
- Consumes: `startGuide(false)` from `useUI` (Task 1) — opens at step 1, no welcome gate.
- Produces: `data-guide="restart"` anchor used by step 8 (Task 2).

- [ ] **Step 1: Add the selector.** In `src/components/layout/TopBar.tsx`, after the existing `openAwayAll` selector line:

```tsx
  const openAwayAll = useUI((s) => s.openAwayAll);
```

add:

```tsx
  const startGuide = useUI((s) => s.startGuide);
```

- [ ] **Step 2: Add the button** between the bell button and the avatar. The current markup ends the bell button and starts the avatar like this:

```tsx
          </button>
          <div
            aria-label={persona.name}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-[12px] font-extrabold text-ocbc-red ring-2 ring-white/40"
          >
```

Insert the guide button between them:

```tsx
          </button>
          <button
            onClick={() => startGuide(false)}
            data-guide="restart"
            aria-label="Replay the app tour"
            className="grid h-9 w-9 place-items-center rounded-full bg-white/12 text-white ring-1 ring-white/15 transition hover:bg-white/20"
          >
            <Icon name="info" size={18} />
          </button>
          <div
            aria-label={persona.name}
            className="grid h-9 w-9 place-items-center rounded-full bg-white text-[12px] font-extrabold text-ocbc-red ring-2 ring-white/40"
          >
```

- [ ] **Step 3: Verify**

Run: `npm run typecheck`
Expected: exits 0. In the running dev server: an info icon now sits between the bell and the avatar; tapping it opens the tour at "While you were away" (Step 1 of 8); the final step spotlights this very icon and shows **Done**.

- [ ] **Step 4: Commit**

```bash
git add src/components/layout/TopBar.tsx
git commit -m "feat(guide): replay-tour icon in the top bar"
```

---

### Task 6: Full verification pass

**Files:** none new — fixes only if checks fail.

- [ ] **Step 1: Static gates**

Run: `npm run typecheck && npm run build`
Expected: both exit 0; vite build completes.

- [ ] **Step 2: Manual checklist** (dev server, DevTools console open):

1. `localStorage.removeItem('ocbc-ahead-guide-seen')` + reload → welcome card auto-opens (step 0, centered, even dim).
2. "Skip for now" → tour closes; reload → does NOT auto-open.
3. Restart icon → opens at Step 1 of 8; spotlight on the red digest; card readable.
4. Next through all steps: 2 team strip, 3 feed header, 4 bell (card below it), 5 Control tab ink card, 6 Money tab ink card, 7 Log tab ink card, 8 restart icon — the tour switches tabs itself each time.
5. Back works from step 2 onward; Done on step 8 closes and returns to Home.
6. During any step: demo panel buttons (persona switch, scenario triggers, Hide demo controls) are undimmed and clickable.
7. Escape mid-tour closes it and counts as seen (reload → no auto-open).
8. Demo panel → reset the demo so the away digest is empty, restart tour → step 1 falls back to a centered card (no crash).
9. Demo panel → enter RM mode mid-tour → tour closes; leaving RM mode does not resurrect it mid-step.
10. OS reduced-motion on (or DevTools emulation) → no glide animation; steps still position correctly.
11. Clicking the dimmed app area during a step does nothing (no approvals fire).

- [ ] **Step 3: Fix anything that failed**, re-run the affected checks, and commit fixes as `fix(guide): <what>`.

- [ ] **Step 4: Final commit check**

Run: `git status`
Expected: clean tree on `feature/user-guide-tour`.
