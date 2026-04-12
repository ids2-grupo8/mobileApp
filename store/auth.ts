import { create } from 'zustand';

import { clearTokens } from '@/services/http';
import {
  type AuthUser,
  forgotPasswordRequest,
  loginRequest,
  registerRequest,
  toUserMessage,
} from '@/services/auth';

type AuthStore = {
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  forgotPassword: (email: string) => Promise<void>;
};

export const useAuthStore = create<AuthStore>((set) => ({
  isLoggedIn: false,
  isLoading: false,
  error: null,
  user: null,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await loginRequest(email, password);
      set({ isLoggedIn: true, isLoading: false, user });
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      const user = await registerRequest(name, email, password);
      set({ isLoggedIn: true, isLoading: false, user });
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
    }
  },

  logout: async () => {
    await clearTokens();
    set({ isLoggedIn: false, user: null, error: null });
  },

  forgotPassword: async (email) => {
    set({ isLoading: true, error: null });
    try {
      await forgotPasswordRequest(email);
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
    }
  },

  clearError: () => set({ error: null }),
}));
