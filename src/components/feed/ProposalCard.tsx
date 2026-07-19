import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { AgentProposal, ProposalChoice, ProposalKind } from '@shared/types';
import { AGENT_META } from '@shared/agents';
import { Confidence } from '@/components/ui/Confidence';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { Icon, type IconName } from '@/components/ui/Icon';
import { useSimulation } from '@/store/useSimulation';
import { useUI } from '@/store/useUI';
import { relativeTime, tint } from '@/lib/format';

const KIND_UI: Record<ProposalKind, { label: string; color: string }> = {
  'action-taken': { label: 'Done automatically', color: '#1F9D6B' },
  'needs-approval': { label: 'Needs your decision', color: '#E8A33D' },
  'protection-alert': { label: 'Paused — your call', color: '#E30613' },
  'human-handoff': { label: 'Routed to a human RM', color: '#8A6FE8' },
  insight: { label: 'Noticed', color: '#5B5B6B' },
};

const TONE_COLOR: Record<string, string> = { good: '#1F9D6B', warn: '#E30613', neutral: '#5B5B6B' };
const RESOLVED = ['approved', 'reverted', 'blocked', 'confirmed', 'rejected', 'escalated'];

function choiceClass(kind: ProposalChoice['kind']): string {
  if (kind === 'secondary') return 'btn btn-ghost px-4 py-2.5 text-sm flex-1';
  return 'btn-primary px-4 py-2.5 text-sm flex-1';
}

export function ProposalCard({ proposal }: { proposal: AgentProposal }) {
  const [open, setOpen] = useState(false);
  const resolve = useSimulation((s) => s.resolveProposal);
  const rmBookings = useSimulation((s) => s.rmBookings);
  const asOf = useSimulation((s) => s.state.asOf);
  const openAsk = useUI((s) => s.openAsk);
  const highlighted = useUI((s) => s.highlightId === proposal.id);

  const meta = AGENT_META[proposal.agentId];
  const ui = KIND_UI[proposal.kind];
  const booked = rmBookings.includes(proposal.id);
  const resolved = RESOLVED.includes(proposal.status);

  // When the agent already handled it on its own, the only useful control is Undo —
  // confirming something that's already done is just noise. While it's still awaiting
  // your decision, show every option (and the revert choice reads "Not now").
  const isAuto = proposal.status === 'auto-executed';
  const visibleChoices = (proposal.choices ?? []).filter((c) => (isAuto ? c.resolvesTo === 'reverted' : true));
  const labelFor = (c: ProposalChoice) => (c.resolvesTo === 'reverted' && !isAuto ? 'Not now' : c.label);

  const showChoices =
    proposal.kind === 'insight'
      ? false // Observe-only notes just inform — they never carry a decision or buttons.
      : proposal.kind === 'human-handoff'
        ? !booked && proposal.status !== 'rejected'
        : !resolved && visibleChoices.length > 0;

  return (
    <motion.div
      layout
      id={`proposal-${proposal.id}`}
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      className={`card overflow-hidden transition-shadow duration-500 ${
        highlighted ? 'shadow-glow ring-2 ring-ocbc-red' : ''
      }`}
    >
      <div className="h-1 w-full" style={{ background: meta.accent }} />
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3">
          <AgentAvatar id={proposal.agentId} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-sm font-bold text-ocbc-ink">{meta.name}</span>
              <span className="shrink-0 text-[10.5px] font-semibold text-ocbc-slate/80">
                {relativeTime(proposal.createdAt, asOf)}
              </span>
            </div>
            <div className="mt-1 flex items-center gap-2">
              <span className="pill" style={{ background: tint(ui.color, 0.12), color: ui.color }}>
                {ui.label}
              </span>
              <Confidence value={proposal.confidence} />
            </div>
          </div>
        </div>

        {/* Body */}
        <h3 className="mt-3 text-[15px] font-extrabold leading-snug text-ocbc-ink">{proposal.title}</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ocbc-slate">{proposal.summary}</p>

        {/* Projected outcomes */}
        {proposal.projectedOutcome.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-2">
            {proposal.projectedOutcome.map((o, i) => (
              <div key={i} className="rounded-xl bg-ocbc-mist px-3 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wide text-ocbc-slate">{o.label}</div>
                <div className="text-sm font-extrabold" style={{ color: TONE_COLOR[o.tone ?? 'neutral'] }}>{o.value}</div>
              </div>
            ))}
          </div>
        )}

        {/* Policy line — the control logic, always visible */}
        <div className="mt-3 flex items-start gap-2 rounded-xl border border-dashed border-ocbc-line bg-white px-3 py-2">
          <Icon name="scale" size={15} strokeWidth={1.9} className="mt-0.5 shrink-0 text-ocbc-slate" />
          <p className="text-[12px] leading-relaxed text-ocbc-slate">{proposal.policy.reason}</p>
        </div>

        {/* Understand-before-you-decide row — always visible, even while the decision is pending */}
        <div className="mt-3 flex items-center gap-4">
          <button onClick={() => setOpen((o) => !o)} className="flex items-center gap-1 text-[12.5px] font-bold text-ocbc-red">
            {open ? 'Hide reasoning' : 'See the full reasoning'}
            <Icon name="chevron-down" size={15} strokeWidth={2.2} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>
          <button onClick={() => openAsk(proposal.id)} className="flex items-center gap-1 text-[12.5px] font-bold text-ocbc-ink" title="Ask why / what-if">
            <Icon name="chat" size={15} strokeWidth={1.9} /> Ask why?
          </button>
        </div>
        <AnimatePresence initial={false}>
          {open && (
            <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
              <div className="mt-2 space-y-2 rounded-xl bg-ocbc-mist p-3">
                {proposal.reasoning.map((r, i) => (
                  <div key={i} className="flex gap-2">
                    <span className="mt-0.5 grid h-4 w-4 shrink-0 place-items-center rounded-full bg-white text-[9px] font-bold text-ocbc-slate">{i + 1}</span>
                    <p className="text-[12.5px] leading-relaxed text-ocbc-ink">
                      <span className="font-bold">{r.label}.</span> <span className="text-ocbc-slate">{r.detail}</span>
                    </p>
                  </div>
                ))}
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {proposal.dataUsed.map((d, i) => (
                    <span key={i} className="pill bg-white text-ocbc-slate">
                      <Icon name="search" size={11} strokeWidth={2} /> {d}
                    </span>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Actions — two short choices share a row; three or more stack full-width
            so long labels ("Split IRAS into GIRO instalments") never wrap into mush. */}
        <div className={`mt-3.5 flex gap-2 ${showChoices && visibleChoices.length >= 3 ? 'flex-col' : 'items-center'}`}>
          {showChoices &&
            visibleChoices.map((c) => (
              <button key={c.id} className={choiceClass(c.kind)} onClick={() => resolve(proposal.id, c.id)}>
                {labelFor(c)}
              </button>
            ))}
          {!showChoices && <ResolvedBanner proposal={proposal} booked={booked} />}
        </div>
      </div>
    </motion.div>
  );
}

function ResolvedBanner({ proposal, booked }: { proposal: AgentProposal; booked: boolean }) {
  const map: Record<string, { text: string; color: string; icon?: IconName }> = {
    approved: { text: 'Approved & done', color: '#1F9D6B', icon: 'check' },
    confirmed: { text: 'Confirmed by you', color: '#1F9D6B', icon: 'check' },
    reverted: { text: 'Reversed — funds restored', color: '#5B5B6B', icon: 'undo' },
    blocked: { text: 'Blocked & reported', color: '#1F9D6B', icon: 'shield' },
    rejected: { text: 'Dismissed', color: '#5B5B6B', icon: 'close' },
    escalated: booked
      ? { text: 'Call booked with your RM', color: '#8A6FE8', icon: 'check' }
      : { text: 'Routed to your RM', color: '#8A6FE8', icon: 'arrow-right' },
    noted: { text: 'Noted in your profile', color: '#5B5B6B' },
    'auto-executed': { text: 'Handled automatically', color: '#1F9D6B', icon: 'check' },
  };
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
}
