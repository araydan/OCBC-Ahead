import { AnimatePresence, motion } from 'framer-motion';
import { useSimulation } from '@/store/useSimulation';
import { Icon, type IconName } from '@/components/ui/Icon';

const TONE: Record<string, { bg: string; icon: IconName }> = {
  good: { bg: 'bg-ocbc-green', icon: 'check' },
  warn: { bg: 'bg-ocbc-red', icon: 'shield' },
  info: { bg: 'bg-ocbc-ink', icon: 'info' },
};

export function Toaster() {
  const toasts = useSimulation((s) => s.toasts);
  const dismiss = useSimulation((s) => s.dismissToast);
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex flex-col items-center gap-2 px-4">
      <AnimatePresence>
        {toasts.map((t) => {
          const tone = TONE[t.tone];
          return (
            <motion.button
              key={t.id}
              type="button"
              onClick={() => dismiss(t.id)}
              initial={{ opacity: 0, y: 16, scale: 0.96 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 8, scale: 0.96 }}
              className={`pointer-events-auto flex items-center gap-2 rounded-full px-4 py-2.5 text-left text-sm font-semibold text-white shadow-lift ${tone.bg}`}
              aria-label={`Dismiss: ${t.text}`}
            >
              <Icon name={tone.icon} size={15} strokeWidth={2.2} className="shrink-0" />
              {t.text}
            </motion.button>
          );
        })}
      </AnimatePresence>
    </div>
  );
}
