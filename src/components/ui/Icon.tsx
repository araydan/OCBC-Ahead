import type { ReactNode, SVGProps } from 'react';
import type { AgentId, AutonomyMode } from '@shared/types';

/**
 * One consistent line-icon set (24x24, stroke = currentColor) so the whole app
 * speaks in clean OCBC-style glyphs instead of emoji. Colour and size come from
 * the parent via `text-*` and the `size` prop, keeping every icon visually aligned.
 */
export type IconName =
  | 'home'
  | 'sliders'
  | 'activity'
  | 'receipt'
  | 'bell'
  | 'shield'
  | 'lock'
  | 'moon'
  | 'clock'
  | 'chevron-right'
  | 'chevron-down'
  | 'arrow-right'
  | 'bolt'
  | 'bulb'
  | 'eye'
  | 'chat'
  | 'undo'
  | 'check'
  | 'scale'
  | 'search'
  | 'close'
  | 'sparkles'
  | 'trend-up'
  | 'waves'
  | 'plane'
  | 'sprout'
  | 'bank'
  | 'calendar'
  | 'wallet'
  | 'info';

const PATHS: Record<IconName, ReactNode> = {
  home: (
    <>
      <path d="M3 10.5 12 3l9 7.5" />
      <path d="M5 9.5V20h14V9.5" />
      <path d="M9.5 20v-5.5h5V20" />
    </>
  ),
  sliders: (
    <>
      <path d="M3 7h18M3 12h18M3 17h18" />
      <circle cx="8" cy="7" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="12" r="2.2" fill="currentColor" stroke="none" />
      <circle cx="7" cy="17" r="2.2" fill="currentColor" stroke="none" />
    </>
  ),
  activity: (
    <>
      <path d="M3 3v18h18" />
      <path d="m7 14 3.2-4 3 2.6L21 6" />
    </>
  ),
  receipt: (
    <>
      <path d="M5 3v18l2-1.2L9 21l2-1.2L13 21l2-1.2L17 21l2-1.2V3l-2 1.2L15 3l-2 1.2L11 3 9 4.2 7 3z" />
      <path d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4" />
    </>
  ),
  bell: (
    <>
      <path d="M6 9a6 6 0 0 1 12 0c0 5 2 6 2 6H4s2-1 2-6Z" />
      <path d="M10.5 20a1.5 1.5 0 0 0 3 0" />
    </>
  ),
  shield: (
    <>
      <path d="M12 3 5 6v5.5c0 4.5 3.2 7.3 7 8.5 3.8-1.2 7-4 7-8.5V6Z" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  lock: (
    <>
      <rect x="5" y="11" width="14" height="9.5" rx="2.2" />
      <path d="M8 11V7.5a4 4 0 0 1 8 0V11" />
    </>
  ),
  moon: <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.6 6.6 0 0 0 21 12.8Z" />,
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7.5V12l3 2" />
    </>
  ),
  'chevron-right': <path d="m9 6 6 6-6 6" />,
  'chevron-down': <path d="m6 9 6 6 6-6" />,
  'arrow-right': (
    <>
      <path d="M4 12h15" />
      <path d="m13 6 6 6-6 6" />
    </>
  ),
  bolt: <path d="M13 2 4 13.5h6L9 22l9-11.5h-6L13 2Z" />,
  bulb: (
    <>
      <path d="M9 18h6" />
      <path d="M10 21.5h4" />
      <path d="M12 2.5a6.5 6.5 0 0 0-4 11.6c.8.7 1 1.4 1 2.4h6c0-1 .2-1.7 1-2.4A6.5 6.5 0 0 0 12 2.5Z" />
    </>
  ),
  eye: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
  chat: <path d="M21 14.5a2.5 2.5 0 0 1-2.5 2.5H8l-4 4V6.5A2.5 2.5 0 0 1 6.5 4h12A2.5 2.5 0 0 1 21 6.5Z" />,
  undo: (
    <>
      <path d="M3 12a9 9 0 1 0 2.7-6.4L3 8" />
      <path d="M3 3v5h5" />
    </>
  ),
  check: <path d="M20 6 9 17l-5-5" />,
  scale: (
    <>
      <path d="M12 3v18M7.5 21h9" />
      <path d="M5 7h14M5 7 2.5 13a3 3 0 0 0 6 0L5 7Zm14 0-2.5 6a3 3 0 0 0 6 0L19 7Z" />
    </>
  ),
  search: (
    <>
      <circle cx="11" cy="11" r="7" />
      <path d="m20.5 20.5-3.5-3.5" />
    </>
  ),
  close: <path d="M6 6 18 18M18 6 6 18" />,
  sparkles: (
    <>
      <path d="M12 3.5 13.7 9 19 10.5 13.7 12 12 17.5 10.3 12 5 10.5 10.3 9Z" />
      <path d="M19 4v3M20.5 5.5h-3" />
    </>
  ),
  'trend-up': (
    <>
      <path d="M3 17 9.5 10l4 4L21 6" />
      <path d="M15.5 6H21v5.5" />
    </>
  ),
  waves: (
    <>
      <path d="M2 8c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0" />
      <path d="M2 14c2-2.2 4-2.2 6 0s4 2.2 6 0 4-2.2 6 0" />
    </>
  ),
  plane: <path d="m2 13 19-8-4.5 15.5-3.5-6L2 13Zm11 1.5L21 5" />,
  sprout: (
    <>
      <path d="M12 20v-8" />
      <path d="M12 12C12 8 9 6 4.5 6 4.5 10 7.5 12 12 12Z" />
      <path d="M12 11c0-3.2 2.4-5 6.5-5 0 3.2-2.4 5-6.5 5Z" />
    </>
  ),
  bank: (
    <>
      <path d="M3 9.5 12 4l9 5.5" />
      <path d="M5 10v8M9.5 10v8M14.5 10v8M19 10v8" />
      <path d="M3.5 21h17" />
    </>
  ),
  calendar: (
    <>
      <rect x="3.5" y="5" width="17" height="16" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  wallet: (
    <>
      <path d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5Z" />
      <path d="M4 9.5h16" />
      <path d="M15.5 14.5h1.5" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 7.8v.4" />
    </>
  ),
};

interface IconProps extends Omit<SVGProps<SVGSVGElement>, 'name'> {
  name: IconName;
  size?: number;
  strokeWidth?: number;
}

export function Icon({ name, size = 20, strokeWidth = 1.8, className, ...rest }: IconProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
      {...rest}
    >
      {PATHS[name]}
    </svg>
  );
}

/** Each agent's line glyph — keeps the avatars on-brand instead of emoji. */
export const AGENT_ICON: Record<AgentId, IconName> = {
  yield: 'trend-up',
  cashflow: 'waves',
  protection: 'shield',
  fxTravel: 'plane',
  lifeEvent: 'sprout',
  debt: 'bank',
};

/** Autonomy mode → glyph, so the control dial reads without emoji. */
export const MODE_ICON: Record<AutonomyMode, IconName> = {
  observe: 'eye',
  suggest: 'bulb',
  auto: 'bolt',
};
