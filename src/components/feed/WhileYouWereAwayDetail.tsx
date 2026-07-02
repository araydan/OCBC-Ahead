import { motion, AnimatePresence } from 'framer-motion';
import { AGENT_META } from '@shared/agents';
import { useUI } from '@/store/useUI';
import { useSimulation } from '@/store/useSimulation';
import { ProposalCard } from './ProposalCard';
import { Icon } from '@/components/ui/Icon';
import { fmtDateTime } from '@/lib/format';
import { useEscape } from '@/lib/useEscape';

/**
 * The detail view behind the "While you were away" card. The card's CTA opens
 * this sheet in "all" mode — every overnight move, full reasoning, the numbers,
 * and a one-tap undo on each. It reuses ProposalCard so the controls behave
 * identically to the live feed. (Single-move mode is kept for direct deep-links.)
 */
export function WhileYouWereAwayDetail() {
  const awayAll = useUI((s) => s.awayAll);
  const awayId = useUI((s) => s.awayProposalId);
  const close = useUI((s) => s.closeAway);
  const proposals = useSimulation((s) => s.proposals);
  const awayIds = useSimulation((s) => s.awayProposalIds);

  const single = proposals.find((p) => p.id === awayId);
  const awayList = proposals.filter((p) => awayIds.includes(p.id));
  const open = awayAll ? awayList.length > 0 : Boolean(awayId && single);

  useEscape(close, open);

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={close}
            className="absolute inset-0 z-30 bg-black/30"
          />
          <motion.div
            key={awayAll ? 'all' : awayId}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 320 }}
            role="dialog"
            aria-modal="true"
            aria-label="While you were away — overnight breakdown"
            className="absolute inset-x-0 bottom-0 z-40 flex max-h-[90%] flex-col overflow-hidden rounded-t-3xl bg-ocbc-mist shadow-lift"
          >
            <div className="flex items-center gap-3 border-b border-ocbc-line bg-white p-4">
              <div
                className="grid h-9 w-9 place-items-center rounded-xl text-white"
                style={{ background: awayAll ? '#B00009' : AGENT_META[single!.agentId].accent }}
              >
                <Icon name="moon" size={18} strokeWidth={2} />
              </div>
              <div className="flex-1">
                <div className="text-sm font-bold text-ocbc-ink">While you were away</div>
                <div className="text-[11px] text-ocbc-slate">
                  {awayAll
                    ? `${awayList.length} ${awayList.length === 1 ? 'move' : 'moves'} overnight`
                    : `${AGENT_META[single!.agentId].name} · ${fmtDateTime(single!.createdAt)}`}
                </div>
              </div>
              <button
                onClick={close}
                aria-label="Close"
                className="grid h-8 w-8 place-items-center rounded-full bg-ocbc-mist text-ocbc-slate transition hover:bg-ocbc-line"
              >
                <Icon name="close" size={16} strokeWidth={2.2} />
              </button>
            </div>

            <div className="no-scrollbar flex-1 space-y-3 overflow-y-auto p-4">
              <p className="text-[12.5px] leading-relaxed text-ocbc-slate">
                {awayAll
                  ? "Here's exactly what your agents did overnight — the full reasoning, the numbers, and a one-tap undo on any move you'd rather they hadn't made."
                  : `Here's exactly what ${AGENT_META[single!.agentId].name} did for you overnight — the full reasoning, the numbers, and a one-tap undo.`}
              </p>
              {(awayAll ? awayList : [single!]).map((p) => (
                <ProposalCard key={p.id} proposal={p} />
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
