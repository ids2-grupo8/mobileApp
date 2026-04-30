import { create } from "zustand";

import { ENABLE_PIN_LOGIN } from "@/constants/features";
import { getOrCreateDeviceId, getPinEnabled, setPinEnabled } from "@/services/device";
import { clearTokens } from "@/services/http";
import {
  type AuthUser,
  type ResetPasswordPayload,
  enrollPinRequest,
  federatedLoginRequest,
  forgotPasswordRequest,
  loginRequest,
  pinLoginRequest,
  pinStatusRequest,
  registerRequest,
  resetPasswordRequest,
  toUserMessage,
} from "@/services/auth";

type AuthStore = {
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  user: AuthUser | null;
  pinEnabled: boolean;
  pinReady: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (accessToken: string, refreshToken: string) => Promise<void>;
  enrollPin: (pin: string) => Promise<boolean>;
  loginWithPin: (pin: string) => Promise<void>;
  loadPinAvailability: () => Promise<void>;
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
  pinEnabled: false,
  pinReady: false,

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

  enrollPin: async (pin) => {
    if (!ENABLE_PIN_LOGIN) return false;
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getOrCreateDeviceId();
      await enrollPinRequest(pin, deviceId);
      await setPinEnabled(true);
      set({ isLoading: false, pinEnabled: true });
      return true;
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
      return false;
    }
  },

  loginWithPin: async (pin) => {
    if (!ENABLE_PIN_LOGIN) return;
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getOrCreateDeviceId();
      const user = await pinLoginRequest(pin, deviceId);
      set({ isLoggedIn: true, isLoading: false, user, pinEnabled: true });
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
    }
  },

  loadPinAvailability: async () => {
    if (!ENABLE_PIN_LOGIN) {
      set({ pinEnabled: false, pinReady: true });
      return;
    }
    try {
      const localPinEnabled = await getPinEnabled();
      if (!localPinEnabled) {
        set({ pinEnabled: false, pinReady: true });
        return;
      }

      const deviceId = await getOrCreateDeviceId();
      const remotePinEnabled = await pinStatusRequest(deviceId);
      await setPinEnabled(remotePinEnabled);
      set({ pinEnabled: remotePinEnabled, pinReady: true });
    } catch {
      const localPinEnabled = await getPinEnabled();
      set({ pinEnabled: localPinEnabled, pinReady: true });
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

  clearError: () => set({ error: null }),
}));
