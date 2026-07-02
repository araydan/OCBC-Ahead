# OCBC Ahead

<!-- Development branch: UI/UX improvements tracked on `work`, kept separate from `main`. -->


**Agentic banking that acts for you — and keeps you in control.**

> Most banking apps wait for you to log in and do the work. OCBC Ahead is a team of specialist AI agents that watch your financial life 24/7, anticipate what's coming, and either handle it or bring you a one-tap decision — always explaining *why*, always reversible, always inside limits you set.

This is a working, demo-able prototype built for **OCBC's PolyFinTech100 Hackathon 2026**, answering the brief:
*"How can OCBC leverage autonomous, decision-making AI across customer journeys to clearly differentiate itself and emerge as the market leader?"*

---

## ⚡ Run it (one command)

```bash
npm install
npm run dev
```

Open the printed URL (default **http://localhost:5173**). That's the whole offline demo — **no API key, no network, no backend required.** Everything you see is driven by a real, in-browser agent engine.

### Optional: the real-LLM path (free Gemini, or Claude)

```bash
# FREE: put a Gemini key in .env →  GEMINI_API_KEY=...   (get one free at aistudio.google.com/apikey)
# or paid Claude →                  ANTHROPIC_API_KEY=sk-ant-...
npm run dev:full
```

This also starts a small Express LLM backend. It uses **Google Gemini** (free tier) if `GEMINI_API_KEY` is set, otherwise **Anthropic Claude**. Flip the *"Ask why" engine* to **Live (LLM)** in the presenter panel and the explanations become genuinely model-generated. If the key/back-end is ever missing or slow, the app **silently falls back to the offline engine** — the demo never breaks on stage.

| Script | What it does |
|---|---|
| `npm run dev` | Frontend only — the bulletproof offline demo |
| `npm run dev:full` | Frontend + LLM backend (free Gemini, or Claude) |
| `npm run smoke` | Runs the whole scenario timeline headless in Node (proves the engine) |
| `npm run build` | Production build |

---

## 🎬 Driving the demo (3–5 min)

The **Presenter Controls** panel (right of the phone, toggle with *"Hide demo controls"*) makes the pitch repeatable and never flaky:

1. **Open cold.** The home screen is **not** a dashboard — it's the agent feed. The red *"While you were away"* hero shows the Yield Agent already moved idle cash into a Fixed Deposit overnight (**+S$693/yr**), keeping a buffer liquid. → *Proactivity + impact.*
2. **▶ Advance** the simulated clock (or fire any scenario directly):
   - **Predicted shortfall** — Cashflow Agent forecasts a dip before the insurance + IRAS bills and offers options *days ahead*. → *Anticipation.*
   - **Scam transfer** — Protection Agent auto-pauses a S$4,500 transfer with Money Lock, lists the red flags, asks you to confirm or block. → *Trust.*
   - **Travel / FX** — a Tokyo flight is detected; the FX Agent offers to lock a ¥ rate and suggests the right card. → *Cross-journey orchestration.*
   - **Payday auto-allocation** — salary lands; the agent splits it across goals **within your guardrails**, and *adapts* the split around the tax bill. → *Autonomy + limits.*
   - **Human handoff** — a refinance opportunity is escalated to a human RM with a full pack. → *Humans in control, both ways.*
3. **Tap *Ask 💬*** on any card and type *"why did you do that?"* or *"can I undo this?"* — get a coherent, grounded answer.
4. **Control** tab — show the per-agent autonomy dials (Observe → Suggest → Auto) and limit sliders. **Log** tab — every action, why, with one-tap **Undo**.
5. **View as RM** (presenter panel) — see the other side of the handoff: the RM console with the agent's full reasoning.
6. **↻ Reset** to run it again. Switch **persona** (Marcus / Priya) to show it generalises.

---

## 🧠 What makes it different

A normal app is a **set of tools you operate**. OCBC Ahead **inverts who initiates** — it reaches out to you between sessions, with reasoning, and earns trust by being transparent and reversible. Five pillars:

1. **Proactive, not reactive** — agents initiate; the home feed is "here's what I noticed and did."
2. **A team of specialists + an orchestrator** — Yield · Cashflow · Protection · FX/Travel · Life-Event · Debt, coordinated and conflict-resolved.
3. **A human-in-the-loop control center** — a per-agent autonomy dial + spending limits; every autonomous action bounded, logged, reversible.
4. **Trust & explainability** — every action shows reasoning, confidence, the data used, and a projected outcome; ask "why?" / "what if?" in natural language.
5. **A living, continuous profile** — state updates in real time and drives personalisation continuously, not just at onboarding.

See **[PITCH.md](./PITCH.md)** for the narrative + business case, and **[ARCHITECTURE.md](./ARCHITECTURE.md)** for the design + Responsible-AI model.

---

## 🛠 Tech

React + Vite + TypeScript + Tailwind · Zustand · Framer Motion · Express + Gemini / Claude (optional).
The agent engine in `shared/` is pure, dependency-free TypeScript that runs **identically in the browser and in Node** (that's how `npm run smoke` works). Mobile-first, OCBC-branded, accessible.

```
shared/            the brain — runs in browser AND server
  agents/          orchestrator · autonomy policy engine · 6 specialist agents
  tools.ts         mocked OCBC primitives (FD, Money Lock, FX…) — reversible + logged
  reasoning/       scripted fallback + Claude prompts/tools
  personas.ts      demo personas + scripted event timeline
src/               React app (agent feed, control center, audit, ask, RM console, demo panel)
server/            optional Express LLM backend — Gemini or Claude (/api/ask, /api/reason, /api/health)
```

> Every agent action is checked against the customer's autonomy mode + limits **before** it can run, written to an append-only audit log, and (where it touches money) reversible. No black boxes.
