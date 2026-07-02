import { motion } from 'framer-motion';
import type { Tab } from '@/store/useSimulation';
import { useSimulation } from '@/store/useSimulation';
import { Icon, type IconName } from '@/components/ui/Icon';

const TABS: { id: Tab; icon: IconName; label: string }[] = [
  { id: 'home', icon: 'home', label: 'Home' },
  { id: 'control', icon: 'sliders', label: 'Control' },
  { id: 'activity', icon: 'wallet', label: 'Money' },
  { id: 'log', icon: 'receipt', label: 'Log' },
];

export function BottomNav() {
  const tab = useSimulation((s) => s.activeTab);
  const setTab = useSimulation((s) => s.setTab);
  const pending = useSimulation((s) => s.proposals.filter((p) => p.status === 'pending').length);

  return (
    <div className="z-20 grid grid-cols-4 border-t border-ocbc-line bg-white/95 pb-2 pt-1 backdrop-blur">
      {TABS.map((t) => {
        const active = tab === t.id;
        return (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            aria-label={t.label}
            aria-current={active ? 'page' : undefined}
            className="relative flex flex-col items-center gap-1 py-2 transition-colors"
          >
            {/* active indicator pip — one shared element that glides between tabs */}
            {active && (
              <motion.span
                layoutId="nav-pip"
                transition={{ type: 'spring', stiffness: 520, damping: 36 }}
                className="absolute top-0 h-0.5 w-7 rounded-full bg-ocbc-red"
              />
            )}
            <span className={`transition-colors ${active ? 'text-ocbc-red' : 'text-ocbc-slate/60'}`}>
              <Icon name={t.icon} size={22} strokeWidth={active ? 2.1 : 1.8} />
            </span>
            <span className={`text-[10px] font-bold transition-colors ${active ? 'text-ocbc-red' : 'text-ocbc-slate'}`}>
              {t.label}
            </span>
            {t.id === 'home' && pending > 0 && (
              <span className="absolute right-5 top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-ocbc-red px-1 text-[9px] font-bold text-white ring-2 ring-white">
                {pending}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
