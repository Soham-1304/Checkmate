import { create } from 'zustand';

interface StatsState {
  checked: number;
  issues: number;
  inProgress: number;
  compliant: number;
  incrementChecked: (isCompliant: boolean) => void;
  incrementInProgress: () => void;
  completeInProgress: (isCompliant: boolean) => void;
  resetStats: () => void;
}

export const useStatsStore = create<StatsState>((set) => ({
  checked: 0,
  issues: 0,
  inProgress: 0,
  compliant: 0,

  incrementChecked: (isCompliant: boolean) =>
    set((state) => ({
      checked: state.checked + 1,
      compliant: isCompliant ? state.compliant + 1 : state.compliant,
      issues: isCompliant ? state.issues : state.issues + 1,
    })),

  incrementInProgress: () =>
    set((state) => ({
      inProgress: state.inProgress + 1,
    })),

  completeInProgress: (isCompliant: boolean) =>
    set((state) => ({
      inProgress: Math.max(0, state.inProgress - 1),
      checked: state.checked + 1,
      compliant: isCompliant ? state.compliant + 1 : state.compliant,
      issues: isCompliant ? state.issues : state.issues + 1,
    })),

  resetStats: () =>
    set({
      checked: 0,
      issues: 0,
      inProgress: 0,
      compliant: 0,
    }),
}));
