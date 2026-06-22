import { create } from "zustand";

import { ApiError } from "@/services/http";
import { createCheckoutMercadopago, type CheckoutAddress } from "@/services/checkout";

function userMessageForCheckout(err: unknown): string {
  if (err instanceof ApiError) {
    const detail = ((err.body as { detail?: string } | undefined)?.detail ?? '').toLowerCase();
    if (err.status === 401) return 'Sesión expirada. Iniciá sesión nuevamente para completar la compra.';
    if (err.status === 403) return 'No podés completar esta compra con tu cuenta.';
    if (err.status === 404) return 'Alguno de los productos del carrito ya no está disponible. Revisalo y volvé a intentar.';
    if (err.status === 409 || detail.includes('insufficient stock') || detail.includes('out of stock')) {
      return 'No hay stock suficiente para alguno de los productos. Actualizá el carrito y reintentá.';
    }
    if (err.status === 422) return 'Algunos datos de la dirección no son válidos. Revisalos e intentá de nuevo.';
    if (err.status === 429) return 'Demasiados intentos. Esperá unos segundos antes de reintentar.';
    if (err.status >= 500) return 'No pudimos procesar el pago en este momento. Intentá de nuevo en unos minutos.';
    return 'No pudimos procesar tu compra. Intentá de nuevo.';
  }
  if (err instanceof TypeError) return 'Sin conexión. Revisá tu red e intentá de nuevo.';
  return 'No pudimos procesar tu compra. Intentá de nuevo.';
}

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
    couponCode?: string,
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
    couponCode?: string,
  ): Promise<CheckoutSubmitResult> => {
    set({ isSubmitting: true, error: null });
    try {
      // No mandamos back_url: MP rechaza la preferencia si back_urls no es
      // http(s) (deep links como mobileapp:// fallan con `auto_return invalid`).
      // El resultado del pago se resuelve por polling + webhook.
      const response = await createCheckoutMercadopago(
        idempotencyKey,
        address,
        couponCode,
      );

      const checkoutUrl = response.init_point;
      if (!checkoutUrl) {
        throw new Error("No se pudo obtener el link de pago");
      }

      set({ isSubmitting: false });
      return { checkoutUrl, orderIds: response.order_ids ?? [] };
    } catch (err) {
      const message = userMessageForCheckout(err);
      set({ isSubmitting: false, error: message });
      throw new Error(message);
    }
  },

  clearError: () => set({ error: null }),
}));
