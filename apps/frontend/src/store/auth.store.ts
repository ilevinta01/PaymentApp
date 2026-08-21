import { create } from "zustand";
import { AuthResponse } from "@oplata/shared";

interface AuthState {
  accessToken: string | null;
  user: AuthResponse["user"] | null;
  setAuth: (data: AuthResponse) => void;
  logout: () => void;
}

const STORAGE_KEY = "oplata_auth";

function loadInitial(): Pick<AuthState, "accessToken" | "user"> {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) return { accessToken: null, user: null };
  try {
    const parsed = JSON.parse(raw) as AuthResponse;
    return { accessToken: parsed.accessToken, user: parsed.user };
  } catch {
    return { accessToken: null, user: null };
  }
}

export const useAuthStore = create<AuthState>((set) => ({
  ...loadInitial(),
  setAuth: (data) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    set({ accessToken: data.accessToken, user: data.user });
  },
  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ accessToken: null, user: null });
  },
}));
