import { create } from 'zustand';

// Ephemeral UI state, kept separate from the domain simulation store.
interface UIStore {
  askProposalId: string | null;
  awayProposalId: string | null; // a single "while you were away" move being inspected
  awayAll: boolean; // the full overnight breakdown (all moves) is open
  highlightId: string | null; // proposal briefly spotlighted (e.g. from the bell)
  showDemoPanel: boolean;
  openAsk: (id: string) => void;
  closeAsk: () => void;
  openAway: (id: string) => void;
  openAwayAll: () => void;
  closeAway: () => void;
  highlight: (id: string) => void;
  clearHighlight: () => void;
  toggleDemoPanel: () => void;
}

export const useUI = create<UIStore>((set, get) => ({
  askProposalId: null,
  awayProposalId: null,
  awayAll: false,
  highlightId: null,
  showDemoPanel: true,
  openAsk: (id) => set({ askProposalId: id }),
  closeAsk: () => set({ askProposalId: null }),
  openAway: (id) => set({ awayProposalId: id, awayAll: false }),
  openAwayAll: () => set({ awayAll: true, awayProposalId: null }),
  closeAway: () => set({ awayProposalId: null, awayAll: false }),
  highlight: (id) => set({ highlightId: id }),
  clearHighlight: () => set({ highlightId: null }),
  toggleDemoPanel: () => set({ showDemoPanel: !get().showDemoPanel }),
}));
