import { create } from "zustand";

import { clearTokens } from "@/services/http";
import {
  type AuthUser,
  type ResetPasswordPayload,
  federatedLoginRequest,
  forgotPasswordRequest,
  loginRequest,
  registerRequest,
  resetPasswordRequest,
  toUserMessage,
} from "@/services/auth";

type AuthStore = {
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (accessToken: string, refreshToken: string) => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  forgotPassword: (email: string) => Promise<boolean>;
  resetPassword: (payload: ResetPasswordPayload) => Promise<boolean>;
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

  googleLogin: async (accessToken, refreshToken) => {
    set({ isLoading: true, error: null });
    try {
      const user = await federatedLoginRequest(accessToken, refreshToken);
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
      return true;
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
      return false;
    }
  },

  resetPassword: async (payload) => {
    set({ isLoading: true, error: null });
    try {
      await resetPasswordRequest(payload);
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
      return false;
    }
  },

  resetPassword: async (accessToken, refreshToken, newPassword) => {
    set({ isLoading: true, error: null });
    try {
      await resetPasswordRequest(accessToken, refreshToken, newPassword);
      set({ isLoading: false });
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
    }
  },

  clearError: () => set({ error: null }),
}));
