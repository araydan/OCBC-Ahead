export function Confidence({ value, showLabel = true }: { value: number; showLabel?: boolean }) {
  const pct = Math.round(value * 100);
  const color = pct >= 85 ? '#1F9D6B' : pct >= 70 ? '#E8A33D' : '#E30613';
  return (
    <div className="flex items-center gap-1.5" title={`${pct}% confidence`}>
      <div className="h-1.5 w-10 overflow-hidden rounded-full bg-ocbc-line">
        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
      </div>
      {showLabel && <span className="text-[11px] font-bold" style={{ color }}>{pct}%</span>}
    </div>
  );
}
