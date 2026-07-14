import { create } from "zustand";

interface AppState {
  selectedShopId: string | null;
  setSelectedShopId: (id: string | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  selectedShopId: null,
  setSelectedShopId: (id) => set({ selectedShopId: id }),
}));
