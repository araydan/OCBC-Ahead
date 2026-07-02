import { create } from 'zustand';
import type {
  AgentConfig, AgentId, AgentProposal, AuditEntry, AutonomyMode,
  FinancialState, ScenarioId, SimEvent,
} from '@shared/types';
import { DEFAULT_CONFIGS, dispatch } from '@shared/agents';
import { PERSONAS, DEFAULT_PERSONA_ID } from '@shared/personas';
import { applyAction, blockTransfer, releaseTransfer, revertAction } from '@shared/tools';
import { uid } from '@shared/util';

export type Tab = 'home' | 'control' | 'activity' | 'log';
export interface Toast {
  id: string;
  text: string;
  tone: 'good' | 'warn' | 'info';
}

interface SimStore {
  personaId: string;
  state: FinancialState;
  configs: Record<AgentId, AgentConfig>;
  proposals: AgentProposal[]; // newest first
  audit: AuditEntry[]; // newest first
  firedEventIds: string[];
  awayProposalIds: string[]; // those that happened "while you were away" (on load)
  rmBookings: string[]; // proposalIds the customer booked an RM for
  reasoningMode: 'scripted' | 'llm';
  serverAvailable: boolean;
  activeTab: Tab;
  rmMode: boolean;
  toasts: Toast[];

  init: () => void;
  loadPersona: (id: string) => void;
  resetDemo: () => void;
  advanceClock: () => void;
  fireScenario: (scenario: ScenarioId) => void;
  hasFiredScenario: (scenario: ScenarioId) => boolean;
  nextEvent: () => SimEvent | undefined;
  resolveProposal: (proposalId: string, choiceId: string) => void;
  revertAudit: (auditId: string) => void;
  setMode: (agentId: AgentId, mode: AutonomyMode) => void;
  setLimit: (agentId: AgentId, key: keyof AgentConfig['limits'], value: number) => void;
  setReasoningMode: (m: 'scripted' | 'llm') => void;
  setServerAvailable: (b: boolean) => void;
  setTab: (t: Tab) => void;
  setRmMode: (b: boolean) => void;
  pushToast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
}

const auditEntry = (p: AgentProposal, detail: string): AuditEntry => ({
  id: uid('aud'),
  at: p.createdAt,
  agentId: p.agentId,
  proposalId: p.id,
  title: p.title,
  detail,
  action: p.action,
  reversible: false,
  reverted: false,
  confidence: p.confidence,
});

export const useSimulation = create<SimStore>((set, get) => {
  /** Fire a single event through the orchestrator and merge the results. */
  const fire = (event: SimEvent, markAway = false) => {
    const { state, configs, firedEventIds, proposals, audit, awayProposalIds } = get();
    if (firedEventIds.includes(event.id)) return;

    const res = dispatch(event, state, configs);

    // A manual trigger that produces nothing shouldn't silently "consume" the event
    // or claim a proposal is waiting — leave it replayable and say nothing changed.
    if (!markAway && res.proposals.length === 0) {
      get().pushToast('Nothing needed handling for that just now', 'info');
      return;
    }

    set({
      state: res.state,
      proposals: [...res.proposals, ...proposals],
      audit: [...[...res.audit].reverse(), ...audit],
      firedEventIds: [...firedEventIds, event.id],
      awayProposalIds: markAway ? [...awayProposalIds, ...res.proposals.map((p) => p.id)] : awayProposalIds,
    });

    if (!markAway) {
      const auto = res.proposals.find((p) => p.kind === 'action-taken');
      const alert = res.proposals.find((p) => p.kind === 'protection-alert');
      if (alert) get().pushToast('Protection Agent paused a suspicious transfer', 'warn');
      else if (auto) get().pushToast('OCBC Ahead handled something for you', 'good');
      else get().pushToast('A new proposal is waiting for you', 'info');
    }
  };

  const bootstrap = (personaId: string) => {
    const persona = PERSONAS[personaId];
    set({
      personaId,
      state: structuredClone(persona.initialState),
      configs: structuredClone(DEFAULT_CONFIGS),
      proposals: [],
      audit: [],
      firedEventIds: [],
      awayProposalIds: [],
      rmBookings: [],
      activeTab: 'home',
      rmMode: false,
      toasts: [],
    });
    // Auto-fire everything that already happened before "now" → the while-you-were-away feed.
    const now = new Date(persona.initialState.asOf).getTime();
    persona.events
      .filter((e) => new Date(e.at).getTime() <= now)
      .sort((a, b) => +new Date(a.at) - +new Date(b.at))
      .forEach((e) => fire(e, true));
  };

  return {
    personaId: DEFAULT_PERSONA_ID,
    state: structuredClone(PERSONAS[DEFAULT_PERSONA_ID].initialState),
    configs: structuredClone(DEFAULT_CONFIGS),
    proposals: [],
    audit: [],
    firedEventIds: [],
    awayProposalIds: [],
    rmBookings: [],
    reasoningMode: 'scripted',
    serverAvailable: false,
    activeTab: 'home',
    rmMode: false,
    toasts: [],

    init: () => bootstrap(DEFAULT_PERSONA_ID),
    loadPersona: (id) => bootstrap(id),
    resetDemo: () => bootstrap(get().personaId),

    nextEvent: () => {
      const { personaId, firedEventIds } = get();
      return PERSONAS[personaId].events
        .filter((e) => !firedEventIds.includes(e.id))
        .sort((a, b) => +new Date(a.at) - +new Date(b.at))[0];
    },

    advanceClock: () => {
      const next = get().nextEvent();
      if (!next) {
        get().pushToast('Demo complete — no more events', 'info');
        return;
      }
      fire(next);
      get().setTab('home');
    },

    hasFiredScenario: (scenario) => {
      const { personaId, firedEventIds } = get();
      const ev = PERSONAS[personaId].events.find((e) => e.scenario === scenario);
      return ev ? firedEventIds.includes(ev.id) : false;
    },

    fireScenario: (scenario) => {
      const { personaId, firedEventIds } = get();
      const ev = PERSONAS[personaId].events.find((e) => e.scenario === scenario);
      if (!ev) return;
      if (firedEventIds.includes(ev.id)) {
        get().pushToast('That scenario already ran — reset to replay', 'info');
        return;
      }
      fire(ev);
      get().setTab('home');
    },

    resolveProposal: (proposalId, choiceId) => {
      const { proposals, state, audit } = get();
      const p = proposals.find((x) => x.id === proposalId);
      const choice = p?.choices?.find((c) => c.id === choiceId);
      if (!p || !choice) return;

      const setStatus = (status: AgentProposal['status']) =>
        set({ proposals: get().proposals.map((x) => (x.id === proposalId ? { ...x, status } : x)) });
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
          setStatus('reverted');
          get().pushToast('Reversed — funds restored exactly', 'good');
        } else {
          setStatus('rejected');
          get().pushToast('Dismissed — nothing changed', 'info');
        }
        return;
      }

      // PROTECTION: block & report.
      if (choice.id === 'block') {
        const r = blockTransfer(state, { transferId: p.action?.params?.transferId });
        set({ state: r.state, audit: [auditEntry(p, r.detail), ...get().audit] });
        setStatus('blocked');
        get().pushToast('Blocked & reported — your money is safe', 'good');
        return;
      }

      // PROTECTION: customer confirms it was them.
      if (choice.id === 'release') {
        const r = releaseTransfer(state, { transferId: p.action?.params?.transferId });
        set({ state: r.state, audit: [auditEntry(p, r.detail), ...get().audit] });
        setStatus('confirmed');
        get().pushToast('Released — transfer sent', 'info');
        return;
      }

      // Book a human RM.
      if (choice.resolvesTo === 'escalated') {
        set({ rmBookings: [...get().rmBookings, proposalId] });
        setStatus('escalated');
        get().pushToast('Booked — your RM already has the full context', 'info');
        return;
      }

      // Approve a pending action (or alternative option).
      if (choice.resolvesTo === 'approved') {
        if (choice.id === 'instalment') {
          prependAudit('Set up an IRAS GIRO instalment plan (12 months) — no lump sum needed.');
          setStatus('approved');
          get().pushToast('IRAS instalment plan set up', 'good');
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
        setStatus('approved');
        get().pushToast(`Done — ${p.action?.label ?? 'approved'}`, 'good');
        return;
      }

      // Reject / dismiss / not now.
      if (choice.resolvesTo === 'rejected') {
        setStatus('rejected');
        get().pushToast('Dismissed — nothing changed', 'info');
      }
    },

    revertAudit: (auditId) => {
      const { audit, state } = get();
      const entry = audit.find((a) => a.id === auditId);
      if (!entry?.action || entry.reverted || !entry.reversible) return;
      const r = revertAction(state, entry.action, entry.meta);
      if (!r.ok) return;
      set({
        state: r.state,
        audit: [
          auditEntry({ ...(get().proposals.find((p) => p.id === entry.proposalId) ?? ({} as AgentProposal)), id: entry.proposalId, agentId: entry.agentId, title: entry.title, createdAt: entry.at, confidence: entry.confidence, action: entry.action } as AgentProposal, `Reversed: ${r.detail}`),
          ...get().audit.map((a) => (a.id === auditId ? { ...a, reverted: true } : a)),
        ],
        proposals: get().proposals.map((p) => (p.id === entry.proposalId ? { ...p, status: 'reverted' } : p)),
      });
      get().pushToast('Reversed from the Decision Log', 'good');
    },

    setMode: (agentId, mode) =>
      set({ configs: { ...get().configs, [agentId]: { ...get().configs[agentId], mode } } }),

    setLimit: (agentId, key, value) =>
      set({
        configs: {
          ...get().configs,
          [agentId]: { ...get().configs[agentId], limits: { ...get().configs[agentId].limits, [key]: value } },
        },
      }),

    setReasoningMode: (m) => set({ reasoningMode: m }),
    setServerAvailable: (b) => set({ serverAvailable: b }),
    setTab: (t) => set({ activeTab: t }),
    setRmMode: (b) => set({ rmMode: b }),

    pushToast: (text, tone = 'info') => {
      const id = uid('toast');
      set({ toasts: [...get().toasts, { id, text, tone }] });
      setTimeout(() => get().dismissToast(id), 3600);
    },
    dismissToast: (id) => set({ toasts: get().toasts.filter((t) => t.id !== id) }),
  };
});
