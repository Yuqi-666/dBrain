import { create } from "zustand";

export interface AuthStore {
  userId: string | null;
  setUserId: (userId: string | null) => void;
}

export const useAuthStore = create<AuthStore>((set) => ({
  userId: null,
  setUserId: (userId) => set({ userId }),
}));