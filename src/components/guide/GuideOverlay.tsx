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
