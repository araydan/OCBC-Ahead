import { useEffect } from 'react';
import { motion, useReducedMotion } from 'framer-motion';
import { useSimulation } from '@/store/useSimulation';
import { useUI } from '@/store/useUI';
import { Icon } from '@/components/ui/Icon';
import { ProposalCard } from './ProposalCard';
import { WhileYouWereAway } from './WhileYouWereAway';
import { AgentTeamStrip } from './AgentTeamStrip';

export function HomeFeed() {
  const proposals = useSimulation((s) => s.proposals);
  const awayIds = useSimulation((s) => s.awayProposalIds);
  const auditCount = useSimulation((s) => s.audit.length);
  const setTab = useSimulation((s) => s.setTab);
  const advance = useSimulation((s) => s.advanceClock);
  const nextEvent = useSimulation((s) => s.nextEvent());
  const highlightId = useUI((s) => s.highlightId);
  const clearHighlight = useUI((s) => s.clearHighlight);
  const reducedMotion = useReducedMotion();

  const away = proposals.filter((p) => awayIds.includes(p.id));
  const live = proposals.filter((p) => !awayIds.includes(p.id));

  // Bell tap: bring the spotlighted decision into view, hold the ring briefly.
  useEffect(() => {
    if (!highlightId) return;
    document
      .getElementById(`proposal-${highlightId}`)
      ?.scrollIntoView({ behavior: reducedMotion ? 'auto' : 'smooth', block: 'center' });
    const t = setTimeout(clearHighlight, 2200);
    return () => clearTimeout(t);
  }, [highlightId, clearHighlight, reducedMotion]);

  return (
    <div className="space-y-3 px-4 pb-28 pt-3">
      <WhileYouWereAway proposals={away} />

      <AgentTeamStrip />

      <div data-guide="feed" className="flex items-center justify-between px-1 pt-1">
        <h3 className="text-[13px] font-bold uppercase tracking-wide text-ocbc-slate">Your agent feed</h3>
        {auditCount > 0 ? (
          <button
            onClick={() => setTab('log')}
            className="flex items-center gap-1 text-[11px] font-bold text-ocbc-slate transition hover:text-ocbc-ink"
          >
            <Icon name="receipt" size={12} strokeWidth={2.2} />
            {auditCount} logged
            <Icon name="chevron-right" size={12} strokeWidth={2.4} />
          </button>
        ) : (
          <span className="text-[11px] font-semibold text-ocbc-slate">{proposals.length} updates</span>
        )}
      </div>

      {live.map((p) => (
        <ProposalCard key={p.id} proposal={p} />
      ))}

      {/* Nudge to advance the simulated time */}
      {nextEvent && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={advance}
          className="flex w-full items-center justify-between rounded-2xl border border-dashed border-ocbc-line bg-white px-4 py-3 text-left active:scale-[0.99]"
        >
          <div>
            <div className="text-[12px] font-semibold text-ocbc-slate">Next, as time moves forward…</div>
            <div className="text-[13.5px] font-bold text-ocbc-ink">{nextEvent.note}</div>
          </div>
          <span className="ml-3 inline-flex shrink-0 items-center gap-1 rounded-full bg-ocbc-red px-3 py-1.5 text-[12px] font-bold text-white">
            Advance <Icon name="arrow-right" size={13} strokeWidth={2.2} />
          </span>
        </motion.button>
      )}

      {!nextEvent && live.length === 0 && away.length === 0 && (
        <div className="rounded-2xl border border-dashed border-ocbc-line bg-white p-8 text-center">
          <div className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-ocbc-mist text-ocbc-red">
            <Icon name="eye" size={24} />
          </div>
          <p className="mt-2 text-sm font-semibold text-ocbc-ink">Your agents are watching</p>
          <p className="mt-1 text-[12.5px] text-ocbc-slate">Nothing needs you right now. Advance the demo to see them act.</p>
        </div>
      )}
    </div>
  );
}
