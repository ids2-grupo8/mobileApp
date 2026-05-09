import { create } from "zustand";
import * as Linking from "expo-linking";

import { createCheckoutMercadopago, type CheckoutAddress } from "@/services/checkout";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheckoutSubmitResult = {
  checkoutUrl: string;
  orderIds: number[];
};

type CheckoutStore = {
  isSubmitting: boolean;
  error: string | null;
  submitMercadoPago: (
    idempotencyKey: string,
    address: CheckoutAddress,
  ) => Promise<CheckoutSubmitResult>;
  clearError: () => void;
};

// ─── Store ───────────────────────────────────────────────────────────────────

export const useCheckoutStore = create<CheckoutStore>((set) => ({
  isSubmitting: false,
  error: null,

  submitMercadoPago: async (
    idempotencyKey: string,
    address: CheckoutAddress,
  ): Promise<CheckoutSubmitResult> => {
    set({ isSubmitting: true, error: null });
    try {
      const backUrl = Linking.createURL("/checkout");

      const response = await createCheckoutMercadopago(
        idempotencyKey,
        backUrl,
        address,
      );

      const checkoutUrl = response.init_point;
      if (!checkoutUrl) {
        throw new Error("No se pudo obtener el link de pago");
      }

      set({ isSubmitting: false });
      return { checkoutUrl, orderIds: response.order_ids ?? [] };
    } catch (err) {
      const message = err instanceof Error ? err.message : "Error al procesar el checkout";
      set({ isSubmitting: false, error: message });
      throw err;
    }
  },

  clearError: () => set({ error: null }),
}));
