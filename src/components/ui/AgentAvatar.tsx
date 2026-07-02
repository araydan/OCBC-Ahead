import type { AgentId } from '@shared/types';
import { AGENT_META } from '@shared/agents';
import { Icon, AGENT_ICON } from '@/components/ui/Icon';
import { tint } from '@/lib/format';

export function AgentAvatar({ id, size = 40 }: { id: AgentId; size?: number }) {
  const m = AGENT_META[id];
  return (
    <div
      className="grid shrink-0 place-items-center rounded-full"
      style={{
        width: size,
        height: size,
        background: tint(m.accent, 0.14),
        border: `1px solid ${tint(m.accent, 0.28)}`,
        color: m.accent,
      }}
    >
      <Icon name={AGENT_ICON[id]} size={Math.round(size * 0.5)} strokeWidth={1.9} />
    </div>
  );
}
