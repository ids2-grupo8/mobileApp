import { request } from "@/services/http";
import { CHECKOUT } from "@/constants/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheckoutMercadopagoResponse = {
  init_point?: string;
  sandbox_init_point?: string;
};

// ─── Requests ────────────────────────────────────────────────────────────────

/**
 * Create a MercadoPago checkout session.
 * @param idempotencyKey Unique key to prevent duplicate orders
 * @param backUrl URL to redirect to after payment (from Linking.createURL(''))
 */
export async function createCheckoutMercadopago(
  idempotencyKey: string,
  backUrl: string,
): Promise<CheckoutMercadopagoResponse> {
  console.log(backUrl);
  return request<CheckoutMercadopagoResponse>(CHECKOUT("//"), {
    method: "POST",
    body: {
      idempotency_key: idempotencyKey,
      back_url: backUrl,
    },
    auth: true,
  });
}
