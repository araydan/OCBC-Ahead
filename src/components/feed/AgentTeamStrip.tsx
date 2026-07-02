import { motion } from 'framer-motion';
import type { AgentId, AutonomyMode } from '@shared/types';
import { AGENT_ORDER } from '@shared/agents';
import { useSimulation } from '@/store/useSimulation';
import { AgentAvatar } from '@/components/ui/AgentAvatar';
import { Icon } from '@/components/ui/Icon';

// Same status colours the Control Center uses — one vocabulary across screens.
const MODE_DOT: Record<AutonomyMode, string> = {
  observe: '#94A3B8',
  suggest: '#2F6BFF',
  auto: '#1F9D6B',
};

// Short labels so six agents sit comfortably in a 400px phone.
const SHORT: Record<AgentId, string> = {
  yield: 'Yield',
  cashflow: 'Cashflow',
  protection: 'Protect',
  fxTravel: 'FX',
  lifeEvent: 'Life',
  debt: 'Debt',
};

/**
 * The "team of specialist agents" pillar, made visible at a glance: who is on
 * duty and how much rope each one has right now. Tapping anywhere opens the
 * Control Center, where the dials live.
 */
export function AgentTeamStrip() {
  const configs = useSimulation((s) => s.configs);
  const setTab = useSimulation((s) => s.setTab);

  const counts = AGENT_ORDER.reduce(
    (acc, id) => ((acc[configs[id].mode] += 1), acc),
    { observe: 0, suggest: 0, auto: 0 } as Record<AutonomyMode, number>,
  );
  const summary = [
    counts.auto > 0 && { n: counts.auto, word: 'acting', dot: MODE_DOT.auto },
    counts.suggest > 0 && { n: counts.suggest, word: counts.suggest === 1 ? 'asks first' : 'ask first', dot: MODE_DOT.suggest },
    counts.observe > 0 && { n: counts.observe, word: 'watching', dot: MODE_DOT.observe },
  ].filter(Boolean) as { n: number; word: string; dot: string }[];

  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      onClick={() => setTab('control')}
      className="card w-full p-3.5 text-left transition active:scale-[0.99]"
      aria-label="Your agent team — open the Control Center"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-bold uppercase tracking-wide text-ocbc-slate">Your agent team</span>
        <span className="flex items-center gap-0.5 text-[11.5px] font-bold text-ocbc-red">
          Manage <Icon name="chevron-right" size={13} strokeWidth={2.4} />
        </span>
      </div>

      <div className="mt-2.5 flex items-start justify-between">
        {AGENT_ORDER.map((id) => {
          const mode = configs[id].mode;
          return (
            <div key={id} className="flex w-[50px] flex-col items-center gap-1">
              <div className="relative">
                <AgentAvatar id={id} size={38} />
                <span
                  className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white"
                  style={{ background: MODE_DOT[mode] }}
                />
              </div>
              <span className="text-[9.5px] font-bold text-ocbc-slate">{SHORT[id]}</span>
            </div>
          );
        })}
      </div>

      {/* The legend doubles as a live status line, so the dots teach themselves. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-ocbc-line pt-2">
        {summary.map((s) => (
          <span key={s.word} className="flex items-center gap-1.5 text-[11px] font-semibold text-ocbc-slate">
            <span className="h-2 w-2 rounded-full" style={{ background: s.dot }} />
            {s.n} {s.word}
          </span>
        ))}
      </div>
    </motion.button>
  );
}
