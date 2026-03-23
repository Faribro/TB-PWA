import { create } from 'zustand';

interface UIStore {
  isOmniBarOpen: boolean;
  toggleOmniBar: () => void;
  setOmniBarOpen: (isOpen: boolean) => void;
}

export const useUIStore = create<UIStore>((set) => ({
  isOmniBarOpen: false,
  toggleOmniBar: () => set((state) => ({ isOmniBarOpen: !state.isOmniBarOpen })),
  setOmniBarOpen: (isOpen: boolean) => set({ isOmniBarOpen: isOpen }),
}));
