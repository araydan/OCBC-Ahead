# Product

## Register

product

## Users

Two audiences, one artifact:

1. **Hackathon judges and OCBC stakeholders** watching a 3–5 minute live pitch. They evaluate differentiation, feasibility, business impact, and responsible-AI posture. They see the app through a desktop browser showing a phone frame plus presenter controls.
2. **The simulated OCBC customer** (personas: Marcus Tan, salaried engineer; Priya Menon, freelancer) whose phone the judges are looking at. Their job-to-be-done: keep their money safe and working without doing the work themselves.

## Product Purpose

OCBC Ahead is an agentic banking demo: a team of six specialist AI agents (Yield, Cashflow, Protection, FX & Travel, Life-Event, Debt & Credit) that watch a customer's finances and act proactively — always explainable, bounded by per-agent autonomy dials and dollar limits, logged in an append-only decision log, and reversible in one tap. Hard decisions escalate to a human RM with full context. Success = the judges believe this is shippable, trustworthy, and categorically different from a reactive banking app.

## Brand Personality

Confident, calm, trustworthy. "Premium Singaporean bank, not sci-fi." The interface should feel like OCBC shipped it: brand red used with restraint and authority, sober typography, banking-grade density and clarity. Motion conveys state (something happened for you), never spectacle.

## Anti-references

- Generic fintech-startup gradients, glassmorphism, neon "AI" purple everywhere.
- Chatbot-first banking UIs — the agent feed leads, chat is a support surface ("Ask why").
- Dashboard-tile grids of raw balances as the home screen (that's the "old way" this product exists to invert).
- Anything that reads as a mockup: dead buttons, lorem states, unexplained numbers.

## Design Principles

1. **Lead with what the agents did, not with data.** Home is a feed of actions and decisions; raw balances are a secondary tab.
2. **Trust is the product.** Every action shows reasoning, confidence, data used, policy line, projected outcome — and an exit (undo, dismiss, human RM).
3. **Control is visible, not buried.** Autonomy dials and limits are a first-class tab; protection can never be silenced.
4. **Earned familiarity.** Standard banking affordances, tabular numerals for money, consistent component vocabulary — the tool disappears into the task.
5. **Demo-honest.** Simulated time is labeled, projections say "projected", figures never sum misleadingly, and every control actually works.

## Accessibility & Inclusion

- WCAG AA contrast for text; visible on-brand focus rings for keyboard users.
- `prefers-reduced-motion` respected across CSS and framer-motion.
- Sheets behave as dialogs (backdrop tap, Escape, labels); icon-only buttons carry `aria-label`.
- Money framed in plain English; no jargon without explanation.
