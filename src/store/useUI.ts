import { create } from 'zustand';
import { useSimulation } from './useSimulation';

const GUIDE_SEEN_KEY = 'ocbc-ahead-guide-seen';

/** localStorage can throw when storage is blocked (private mode) — treat as "not seen". */
export function guideSeen(): boolean {
  try {
    return localStorage.getItem(GUIDE_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

function markGuideSeen() {
  try {
    localStorage.setItem(GUIDE_SEEN_KEY, '1');
  } catch {
    /* non-fatal */
  }
}

// Ephemeral UI state, kept separate from the domain simulation store.
interface UIStore {
  askProposalId: string | null;
  awayProposalId: string | null; // a single "while you were away" move being inspected
  awayAll: boolean; // the full overnight breakdown (all moves) is open
  highlightId: string | null; // proposal briefly spotlighted (e.g. from the bell)
  showDemoPanel: boolean;
  guideStep: number | null; // index into GUIDE_STEPS; null = tour closed
  openAsk: (id: string) => void;
  closeAsk: () => void;
  openAway: (id: string) => void;
  openAwayAll: () => void;
  closeAway: () => void;
  highlight: (id: string) => void;
  clearHighlight: () => void;
  toggleDemoPanel: () => void;
  startGuide: (fromWelcome: boolean) => void;
  guideNext: () => void;
  guideBack: () => void;
  endGuide: (markSeen?: boolean) => void;
}

export const useUI = create<UIStore>((set, get) => ({
  askProposalId: null,
  awayProposalId: null,
  awayAll: false,
  highlightId: null,
  showDemoPanel: true,
  guideStep: null,
  openAsk: (id) => set({ askProposalId: id }),
  closeAsk: () => set({ askProposalId: null }),
  openAway: (id) => set({ awayProposalId: id, awayAll: false }),
  openAwayAll: () => set({ awayAll: true, awayProposalId: null }),
  closeAway: () => set({ awayProposalId: null, awayAll: false }),
  highlight: (id) => set({ highlightId: id }),
  clearHighlight: () => set({ highlightId: null }),
  toggleDemoPanel: () => set({ showDemoPanel: !get().showDemoPanel }),
  // The tour owns the screen: starting it closes any open sheets.
  startGuide: (fromWelcome) =>
    set({ guideStep: fromWelcome ? 0 : 1, askProposalId: null, awayProposalId: null, awayAll: false }),
  guideNext: () => set({ guideStep: (get().guideStep ?? 0) + 1 }),
  guideBack: () => set({ guideStep: Math.max(0, (get().guideStep ?? 1) - 1) }),
  endGuide: (markSeen = true) => {
    if (markSeen) markGuideSeen();
    set({ guideStep: null });
    useSimulation.getState().setTab('home');
  },
}));
