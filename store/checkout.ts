import { create } from "zustand";
import * as Linking from "expo-linking";

import { createCheckoutMercadopago } from "@/services/checkout";

// ─── Types ───────────────────────────────────────────────────────────────────

type CheckoutStore = {
  isSubmitting: boolean;
  error: string | null;
  submitMercadoPago: () => Promise<string>;
  clearError: () => void;
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  isSubmitting: false,
  error: null,

  submitMercadoPago: async (): Promise<string> => {
    set({ isSubmitting: true, error: null });
    try {
      const idempotencyKey = `order-${Date.now()}`;
      const backUrl = Linking.createURL("") + "/checkout";

      const response = await createCheckoutMercadopago(
        idempotencyKey,
        backUrl,
      );

      const checkoutUrl = response.init_point ??  response.sandbox_init_point;

      if (!checkoutUrl) {
        throw new Error("No se pudo obtener el link de pago");
      }

      set({ isSubmitting: false });
      return checkoutUrl;
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar el checkout";
      set({ isSubmitting: false, error: message });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
