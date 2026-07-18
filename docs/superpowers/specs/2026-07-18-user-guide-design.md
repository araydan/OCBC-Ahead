# In-App User Guide (Spotlight Tour) — Design

**Date:** 2026-07-18
**Status:** Approved (brainstormed with user; approach A chosen)

## Goal

A first-run user guide inside the OCBC Ahead phone app that walks the user through
every customer-facing function, is skippable at any moment, never touches the demo
controller panel, and can be replayed from an icon in the app's top bar.

## Decisions (agreed with user)

- **Style:** spotlight tour — dim the app, cut a spotlight around the real UI element
  for each step, switching tabs automatically as the tour progresses.
- **Auto-show:** first visit only (`localStorage`), afterwards only via the restart icon.
- **Approach:** hand-rolled overlay rendered *inside* the phone frame (approach A).
  No new dependencies. Tour libraries portal to `document.body` and dim the whole
  viewport — that would cover the demo controller, which must stay untouched and usable.

## Scope

Covers only what a customer sees in the app: overnight digest, agent team, proposal
feed (approve / decline / Ask / book RM), notification bell, Control tab (autonomy +
limits), Money tab, Log tab (audit + undo), and the new restart icon.
Excluded: demo panel functions (personas, scenario triggers, reasoning mode) and the
RM console.

## Tour script

Steps 1–11 show "Step x of 11" with progress dots. Step 0 is a centered welcome card.

| # | Tab | Target (`data-guide`) | Title | Teaches |
|---|-----|----------------------|-------|---------|
| 0 | home | — (centered) | Welcome to OCBC Ahead | Six agents act for you within your limits; **Take the tour** / **Skip for now** |
| 1 | home | `away` | While you were away | Overnight digest of agent moves; tap items for detail |
| 2 | home | `team` | Meet your agent team | Yield, Cashflow, FX & Travel, Protection, Debt & Credit, Life-Event |
| 3 | home | `feed` | Your agent feed | Proposal cards: approve/decline one-tap, Ask for plain-language reasoning, book a human RM |
| 4 | home | `bell` | Never miss a decision | Badge = pending decisions; tap jumps to the first one |
| 5 | control | `control-hub` | You set the autonomy | Intro to the autonomy dial; Protection never below Suggest |
| 6 | control | `mode-observe` | Observe — it just watches | Flags and logs only; never acts or asks (first agent card's button) |
| 7 | control | `mode-suggest` | Suggest — it asks first | One-tap yes within the limit; bigger calls always come to you |
| 8 | control | `mode-auto` | Auto — it acts within limits | Acts up to the dollar limit, then tells you; logged and reversible |
| 9 | activity | `money-hub` | Your money, the classic view | Accounts & balances plus the 3-week forward view of upcoming payments |
| 10 | log | `log-hub` | Everything on the record | Every action logged with reasoning; reversible moves have Undo |
| 11 | home | `restart` | Replay anytime | Points at the new top-bar icon; **Done** |

The three `mode-*` anchors live on the first agent card's (Yield) mode buttons only,
via `data-guide={agentIdx === 0 ? `mode-${m.id}` : undefined}` in `ControlCenter.tsx`.

Final copy lives in `guideSteps.ts`; the table above is the authoritative outline.

## Interaction

- **Skip** on every step; **Back / Next**; step 8 shows **Done**.
- Escape closes the tour (reuse `src/lib/useEscape.ts`). Clicking the dim does nothing.
- The tour calls `setTab` for each step and returns to `home` when it ends.
- Skip, Done, and Escape all mark the guide as seen.
- The overlay blocks all interaction with the app beneath it (the demo panel, outside
  the phone frame, stays fully interactive).
- Starting the tour closes any open sheets (`closeAsk`, `closeAway`).
- Animations honor `useReducedMotion`.

## Restart icon

`info` icon button in `TopBar` between the bell and the avatar, same frosted style as
the bell (`h-9 w-9 rounded-full bg-white/12 ring-1 ring-white/15`),
`aria-label="Replay the app tour"`. Tapping starts the tour at **step 1** (no welcome
gate). Carries `data-guide="restart"` for step 8.

## Auto-show & persistence

- Key: `localStorage["ocbc-ahead-guide-seen"] = "1"`, set whenever the tour ends
  (skip, done, or escape).
- On `PhoneFrame` mount (customer mode only): if the key is absent, open at step 0.
- RM mode: the overlay is rendered only in the customer branch of `PhoneFrame`; if RM
  mode is switched on mid-tour, the tour closes (without marking seen).

## Architecture

**New files**

- `src/components/guide/guideSteps.ts` — declarative step list:
  `{ tab: Tab; target: string | null; title: string; body: string }[]`.
- `src/components/guide/GuideOverlay.tsx` — the overlay. Absolutely positioned
  `inset-0 z-[60]` inside the phone container (above TopBar z-20, sheets z-30–50,
  toasts z-50; toasts appearing under the dim during a tour is acceptable).

**Spotlight mechanics**

- Each step's target is found via `container.querySelector('[data-guide="…"]')`
  where `container` is the phone frame's inner div (ref passed from `PhoneFrame`).
- On step entry: switch tab if needed, scroll the phone's inner
  `[data-guide-scroller]` once to center the target (never the page), then track
  the target's rect over a short settle window (a rAF loop, ~45 frames, stopping
  after 3 stable readings at 0.5 px tolerance) so entrance animations end in an
  accurate spotlight rather than a mid-flight snapshot.
- Rects are measured relative to the **overlay's own box**, not the phone frame's
  border-box — the frame has a 10 px border, and measuring against it offset every
  spotlight by exactly that border.
- The spotlight is a rounded div at the target rect (~6 px padding) with
  `box-shadow: 0 0 0 2000px rgba(15,23,42,0.55)` — the phone frame's
  `overflow-hidden` clips the dim, so it cannot reach the demo panel.
- The tooltip card renders below the target when the target sits in the top half of
  the phone, above it otherwise. Step 0 (and any missing target) → centered card
  with an even full-dim, no cutout.
- Re-measure on window resize and on every step change. `framer-motion` springs
  animate the cutout and card between steps.

**Store (`src/store/useUI.ts`)**

- `guideStep: number | null` (null = closed)
- `startGuide(fromWelcome: boolean)` — 0 for auto-show, 1 for the restart icon;
  closes sheets.
- `guideNext()` / `guideBack()`
- `endGuide(markSeen = true)` — null step, write localStorage, return to home tab.

**Edited files**

`PhoneFrame.tsx` (render overlay + auto-start effect + container ref),
`TopBar.tsx` (restart button, `data-guide` on bell), `HomeFeed.tsx` (`feed`),
`WhileYouWereAway.tsx` (`away`), `AgentTeamStrip.tsx` (`team`),
`ControlCenter.tsx` (`control-hub`), `ActivityView.tsx` (`money-hub`),
`AuditLog.tsx` (`log-hub`), `useUI.ts`.

## Edge handling

- Missing target (e.g. empty away digest after a demo reset) → centered card, copy
  still teaches the feature. Never crash or auto-skip silently.
- Demo panel actions fired mid-tour may change layout; the next step re-measures.
- `WhileYouWereAway` returns nothing when the digest is empty — covered by the
  missing-target fallback.

## Verification

- `npm run build` passes (tsc + vite).
- Manual: fresh profile (or cleared localStorage) auto-starts the tour at step 0;
  Skip marks seen and a reload does not re-open it; restart icon reopens at step 1;
  each step spotlights its element on the right tab; demo panel remains clickable
  and undimmed at every step; Escape closes; RM mode never shows the tour;
  reduced-motion shows no glide animation.
