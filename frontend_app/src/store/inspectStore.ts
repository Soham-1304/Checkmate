import { create } from 'zustand';
import type { Assignment } from '../api/doca';

interface InspectState {
  photos: string[];
  assignment: Assignment | null;
  brandName: string | null;
  pendingInspectionId: string | null;
  addPhotos: (uris: string[]) => void;
  removePhoto: (uri: string) => void;
  setAssignment: (a: Assignment | null, brandName?: string | null) => void;
  setPendingInspection: (id: string | null) => void;
  reset: () => void;
}

export const useInspectStore = create<InspectState>((set) => ({
  photos: [],
  assignment: null,
  brandName: null,
  pendingInspectionId: null,
  addPhotos: (uris) =>
    set((s) => ({ photos: [...s.photos, ...uris.filter((u) => !s.photos.includes(u))] })),
  removePhoto: (uri) => set((s) => ({ photos: s.photos.filter((p) => p !== uri) })),
  setAssignment: (assignment, brandName = null) => set({ assignment, brandName }),
  setPendingInspection: (pendingInspectionId) => set({ pendingInspectionId }),
  reset: () => set({ photos: [], assignment: null, brandName: null, pendingInspectionId: null }),
}));
