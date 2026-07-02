# OCBC Ahead — The Pitch

### The judging question
> *"How can OCBC leverage autonomous, decision-making AI across customer journeys to clearly differentiate itself and emerge as the market leader?"*

### Our one-line answer
**Stop making customers do the work. Let a team of AI agents do it for them — proactively, transparently, and under the customer's control.**

---

## 🔑 Read this in 30 seconds (presenter, verbatim)

> "Every banking app on your phone does the same thing: it waits. It waits for you to log in, to notice the idle cash, to catch the scam, to remember the bill. The work is yours.
>
> OCBC Ahead flips that. It's a team of AI agents that watch your money around the clock and act *for* you. Overnight, it moved your idle cash into a fixed deposit and earned you six hundred dollars a year — and it's already telling you why. It caught a scam transfer at 2am and froze it with Money Lock before a cent left. It saw your Tokyo trip and locked a good exchange rate.
>
> And here's the part that makes it bankable: you're still in control. Every agent has a dial — watch, suggest, or act within a limit you set. Every action is explained, logged, and reversible in one tap. When a decision is too big — like refinancing your mortgage — it doesn't gamble. It hands you to a human, with the homework done.
>
> A normal app makes *you* do the work. OCBC Ahead does the work for you — and still earns your trust."

---

## The insight: invert who initiates

A typical digital banking app is a **set of tools you operate**. The customer is the runtime — *they* have to log in, notice, decide, and act. That is the ceiling every bank is bumping against: more features just means more tools the customer still has to drive.

The categorical shift isn't "an app with a chatbot." It's **inverting who initiates**. OCBC Ahead is a **partner that reaches out to you between sessions**, with reasoning attached. The home screen isn't balances and tiles — it's *"here's what I noticed, what I handled, and the one thing I need you to decide."*

That inversion is only acceptable in banking if it's **trustworthy**. So control, explainability, reversibility and human-handoff aren't footnotes — they're the product. In a regulated industry, *trust is the moat*.

---

## The five pillars (what the demo shows)

| # | Pillar | In the demo |
|---|--------|-------------|
| 1 | **Proactive, not reactive** | Home is an agent feed. "While you were away" shows value created with no login. |
| 2 | **Specialist agents + orchestrator** | 6 agents; the orchestrator routes events, resolves conflicts (yield vs. liquidity), applies policy. |
| 3 | **Human-in-the-loop control center** | Per-agent dial: Observe → Suggest → Auto, with spending limits. Protection can't be silenced. |
| 4 | **Trust & explainability** | Every card: reasoning + confidence + data used + projected outcome. Natural-language "why / what-if". |
| 5 | **Living, continuous profile** | The Life-Event Agent keeps the picture current; every other agent reasons on *today's* reality. |

Anchored to **real OCBC primitives** so it reads as shippable, not sci-fi: **Money Lock**, **Fixed Deposit / 360 Account**, **dividend/interest projection**, **FX & multi-currency**, **Apply Hub**, cardless cash, and RM escalation.

---

## Typical digital banking app vs OCBC Ahead

| Dimension | Typical digital banking app | **OCBC Ahead** |
|---|---|---|
| **Initiative** | Reactive — waits for you to log in and act | **Proactive** — agents act and surface decisions between sessions |
| **Home screen** | Balances + tiles (data you interpret) | **Agent feed** — "what I noticed and did" |
| **Personalisation** | Segments + campaigns, refreshed periodically | **Continuous** — a living profile updated in real time |
| **Trust** | Opaque ("computer says") | **Explainable** — reasoning, confidence, data, projected outcome; ask "why?" |
| **Control** | All-or-nothing toggles in a buried settings page | **A per-agent autonomy dial + limits**, front and centre |
| **Reversibility** | Call the hotline | **One-tap undo**, append-only audit log |
| **Hard decisions** | You're on your own | **Agent escalates to a human RM** with full context |
| **Outcome** | You might optimise, if you have time | **The bank optimises for you, continuously** |

---

## Business impact for OCBC

Illustrative, per **1,000,000 engaged customers** (assumptions stated so they can be re-run against OCBC's actuals):

| Lever | Mechanism | Illustrative impact |
|---|---|---|
| **Deposit / AUM growth** | Yield Agent sweeps idle balances into 360 / FD / investments | If avg S$8k idle moves for 300k users → **~S$2.4B** redeployed into OCBC products; stickier balances |
| **Fraud loss avoided** | Protection Agent auto-pauses anomalies + Money Lock | Scam losses are a top regulator concern; even **5–15% reduction** in authorised-push-payment losses is material + reputational |
| **Cost-to-serve** | Agents resolve routine money-movement & "what if" questions in-app | Deflects calls/branch visits; **lower contact-centre volume per active user** |
| **Advisor productivity** | Handoffs arrive pre-packaged (context + recommendation) | RMs spend time advising, not gathering; **more qualified mortgage/invest leads per RM** |
| **Retention & engagement** | Daily proactive value + visible trust | Higher DAU/MAU, higher primary-bank share-of-wallet, lower churn |

The flywheel: **proactivity → engagement → more data → better agents → more value → trust → primary-bank status.**

---

## Why this wins the brief

- **Differentiation:** it is categorically not "a banking app" — it's an agentic layer that does the work. The first screen alone makes the point.
- **Feasibility:** orchestrates OCBC's *existing* primitives; the engine is real and runs headless (`npm run smoke`); the Claude path is a genuine multi-agent tool-use loop.
- **Business impact:** clear, sized levers across deposits, fraud, cost-to-serve, advisor productivity, retention.
- **UX & polish:** premium, OCBC-branded, mobile-first, smooth — lands in a 3–5 min pitch.
- **Responsible AI as the differentiator:** explainable, bounded, reversible, auditable, with human sign-off where it matters. In banking, that's not a constraint — it's the winning feature. See **[ARCHITECTURE.md](./ARCHITECTURE.md)**.
