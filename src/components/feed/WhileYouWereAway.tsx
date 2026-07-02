import { useEffect, useState } from 'react';
import { animate, motion, useReducedMotion } from 'framer-motion';
import type { AgentProposal } from '@shared/types';
import { useUI } from '@/store/useUI';
import { Icon } from '@/components/ui/Icon';

/** Pull a signed SGD figure out of an outcome string like "+S$693.00" or "−S$1,200". */
function parseSGD(v: string): number | null {
  const cleaned = v.replace(/,/g, '').replace(/−/g, '-');
  const m = cleaned.match(/(-?)\s*S\$\s*(\d+(?:\.\d+)?)/i);
  if (!m) return null;
  const n = parseFloat(m[2]);
  return m[1] === '-' ? -n : n;
}

/**
 * Count the headline figure up on arrival — money earned overnight should land,
 * not just sit there. Prefix ("+S$") and any suffix survive untouched; if the
 * string doesn't parse, or the user prefers reduced motion, it renders static.
 */
function CountUpSGD({ value }: { value: string }) {
  const match = value.match(/^([^0-9]*S\$)([\d,]+(?:\.\d+)?)(.*)$/);
  const reduced = useReducedMotion();
  const target = match ? parseFloat(match[2].replace(/,/g, '')) : 0;
  const decimals = match?.[2].includes('.') ? match[2].split('.')[1].length : 0;
  const fmt = (n: number) =>
    n.toLocaleString('en-SG', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  const [shown, setShown] = useState(() => (reduced ? fmt(target) : fmt(0)));

  useEffect(() => {
    if (!match || reduced) return;
    const controls = animate(0, target, {
      duration: 0.9,
      ease: [0.16, 1, 0.3, 1],
      onUpdate: (v) => setShown(fmt(v)),
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!match) return <>{value}</>;
  return (
    <>
      {match[1]}
      {shown}
      {match[3]}
    </>
  );
}

export function WhileYouWereAway({ proposals }: { proposals: AgentProposal[] }) {
  const openAwayAll = useUI((s) => s.openAwayAll);
  if (proposals.length === 0) return null;

  const acted = proposals.filter((p) => p.kind === 'action-taken' || p.kind === 'protection-alert').length;

  // Show a headline figure ONLY when there's a single move — and always with that
  // move's OWN label (e.g. "Extra interest / year") so we never imply the customer
  // earned this cash overnight. Summing different moves into one number would mislead.
  const soleMove = proposals.length === 1 ? proposals[0] : null;
  const heroOutcome = soleMove?.projectedOutcome.find((o) => parseSGD(o.value) != null) ?? null;

  // Acknowledge undos on the main screen, so reversing a move from the breakdown
  // is reflected here too (not just inside the sheet).
  const revertedCount = proposals.filter((p) => p.status === 'reverted').length;
  const soleReverted = soleMove?.status === 'reverted';
  const allReverted = revertedCount > 0 && revertedCount === proposals.length;

  const revertedLabel = allReverted
    ? proposals.length === 1
      ? 'Reversed — funds restored exactly'
      : `All ${proposals.length} moves reversed — funds restored`
    : `${revertedCount} of ${proposals.length} reversed — funds restored`;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl p-5 text-white shadow-glow"
      style={{ background: 'linear-gradient(135deg, #E30613 0%, #B00009 60%, #7d0007 100%)' }}
    >
      <div className="pointer-events-none absolute -right-8 -top-10 h-32 w-32 rounded-full bg-white/10" />
      <div className="pointer-events-none absolute -bottom-12 -left-6 h-28 w-28 rounded-full bg-white/5" />

      <div className="relative">
        <div className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-[0.16em] text-white/80">
          <Icon name="moon" size={14} strokeWidth={2} />
          While you were away
        </div>

        <h2 className="mt-1.5 text-[18px] font-extrabold leading-snug">
          OCBC Ahead made {acted} {acted === 1 ? 'move' : 'moves'} for you overnight.
        </h2>

        {heroOutcome && (
          <div className="mt-2.5">
            <div className="text-[10.5px] font-semibold uppercase tracking-wide text-white/70">
              {heroOutcome.label} · projected
            </div>
            <div
              className={`tnum flex items-center gap-1.5 text-[30px] font-black leading-none ${soleReverted ? 'text-white/55 line-through' : ''}`}
            >
              {heroOutcome.tone === 'good' && !soleReverted && (
                <Icon name="trend-up" size={20} strokeWidth={2.4} className="text-white/90" />
              )}
              {/* Keyed by move + value: switching personas swaps the proposal, and the
                  counter must remount (its digits live in state), not just re-render. */}
              <CountUpSGD key={`${soleMove?.id}:${heroOutcome.value}`} value={heroOutcome.value} />
            </div>
          </div>
        )}

        {/* Undo acknowledgement — shown whenever any overnight move has been reversed. */}
        {revertedCount > 0 && (
          <div className="mt-2.5 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1.5 text-[11.5px] font-bold text-white ring-1 ring-white/20">
            <Icon name="undo" size={13} strokeWidth={2.2} />
            {revertedLabel}
          </div>
        )}

        {/* The single CTA opens the full overnight breakdown (every move + one-tap undo). */}
        <button
          onClick={openAwayAll}
          aria-label={allReverted ? 'View the breakdown' : 'View the breakdown and undo'}
          className="mt-3 flex w-full items-center justify-between gap-2 rounded-xl bg-white/15 px-3.5 py-2.5 text-left ring-1 ring-white/15 transition hover:bg-white/25 active:scale-[0.99]"
        >
          <span className="flex items-center gap-1.5 text-[12.5px] font-bold">
            <Icon name="search" size={14} strokeWidth={2} />
            {allReverted ? 'View the breakdown' : 'Tap to view the breakdown & undo'}
          </span>
          <Icon name="chevron-right" size={16} className="text-white/85" />
        </button>
      </div>
    </motion.div>
  );
}
