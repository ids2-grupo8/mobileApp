import { create } from "zustand";

import { ENABLE_PIN_LOGIN } from "@/constants/features";
import { getOrCreateDeviceId, setPinEnabled } from "@/services/device";
import { clearTokens } from "@/services/http";
import { useCartStore } from "@/store/cart";
import {
  type AuthUser,
  type PinAccount,
  type ResetPasswordPayload,
  enrollPinRequest,
  federatedLoginRequest,
  forgotPasswordRequest,
  loginRequest,
  pinAccountsRequest,
  pinLoginRequest,
  pinStatusRequest,
  pinUserStatusRequest,
  registerRequest,
  resetPasswordRequest,
  toUserMessage,
  updatePinRequest,
} from "@/services/auth";

type AuthStore = {
  isLoggedIn: boolean;
  isLoading: boolean;
  error: string | null;
  user: AuthUser | null;
  pinEnabled: boolean;
  pinReady: boolean;
  suggestPinLink: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  googleLogin: (accessToken: string, refreshToken: string) => Promise<void>;
  enrollPin: (pin: string, refreshToken: string) => Promise<boolean>;
  updatePin: (pin: string) => Promise<boolean>;
  loginWithPin: (pin: string, userId: string) => Promise<void>;
  loadPinAvailability: () => Promise<void>;
  logout: () => Promise<void>;
  clearError: () => void;
  dismissPinLink: () => void;
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
  suggestPinLink: false,

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Limpiar carrito local del usuario anterior (sin tocar backend)
      try {
        await useCartStore.getState().clearLocal();
      } catch (err) {
        console.error('[Auth] Error clearing cart on login:', err);
      }
      
      const user = await loginRequest(email, password);
      set({ isLoggedIn: true, isLoading: false, user });
      if (ENABLE_PIN_LOGIN) {
        try {
          const deviceId = await getOrCreateDeviceId();
          const accounts = await pinAccountsRequest(deviceId);
          const alreadyLinked = accounts.some((a: PinAccount) => a.user_id === user.id);
          if (accounts.length > 0 && !alreadyLinked) {
            set({ suggestPinLink: true });
          }
        } catch {
          // No bloquear el login si falla la verificación de PIN
        }
      }
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
    }
  },

  register: async (name, email, password) => {
    set({ isLoading: true, error: null });
    try {
      // Limpiar carrito local del usuario anterior (sin tocar backend)
      try {
        await useCartStore.getState().clearLocal();
      } catch (err) {
        console.error('[Auth] Error clearing cart on register:', err);
      }
      
      const user = await registerRequest(name, email, password);
      set({ isLoggedIn: true, isLoading: false, user });
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
    }
  },

  googleLogin: async (accessToken, refreshToken) => {
    set({ isLoading: true, error: null });
    try {
      // Limpiar carrito local del usuario anterior (sin tocar backend)
      try {
        await useCartStore.getState().clearLocal();
      } catch (err) {
        console.error('[Auth] Error clearing cart on googleLogin:', err);
      }
      
      const user = await federatedLoginRequest(accessToken, refreshToken);
      set({ isLoggedIn: true, isLoading: false, user });
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
    }
  },

  enrollPin: async (pin, refreshToken) => {
    if (!ENABLE_PIN_LOGIN) return false;
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getOrCreateDeviceId();
      await enrollPinRequest(pin, deviceId, refreshToken);
      await setPinEnabled(true);
      set({ isLoading: false, pinEnabled: true });
      return true;
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
      return false;
    }
  },

  updatePin: async (pin) => {
    if (!ENABLE_PIN_LOGIN) return false;
    set({ isLoading: true, error: null });
    try {
      const deviceId = await getOrCreateDeviceId();
      await updatePinRequest(pin, deviceId);
      set({ isLoading: false });
      return true;
    } catch (err) {
      set({ isLoading: false, error: toUserMessage(err) });
      return false;
    }
  },

  loginWithPin: async (pin, userId) => {
    if (!ENABLE_PIN_LOGIN) return;
    set({ isLoading: true, error: null });
    try {
      // Limpiar carrito local del usuario anterior (sin tocar backend)
      try {
        await useCartStore.getState().clearLocal();
      } catch (err) {
        console.error('[Auth] Error clearing cart on loginWithPin:', err);
      }
      
      const deviceId = await getOrCreateDeviceId();
      const user = await pinLoginRequest(pin, deviceId, userId);
      await setPinEnabled(true);
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
      const deviceId = await getOrCreateDeviceId();
      const remotePinEnabled = await pinUserStatusRequest(deviceId);
      await setPinEnabled(remotePinEnabled);
      set({ pinEnabled: remotePinEnabled, pinReady: true });
    } catch {
      // Si falla la consulta al servidor, asumimos false para evitar
      // que el flag local de otra cuenta cause un PUT en lugar de POST
      set({ pinEnabled: false, pinReady: true });
    }
  },

  logout: async () => {
    // Limpiar tokens
    await clearTokens();
    
    // Limpiar carrito local (sin tocar backend)
    try {
      await useCartStore.getState().clearLocal();
    } catch (err) {
      console.error('[Auth] Error clearing cart on logout:', err);
    }
    
    set({ isLoggedIn: false, user: null, error: null, suggestPinLink: false, pinEnabled: false });
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
  dismissPinLink: () => set({ suggestPinLink: false }),
}));
