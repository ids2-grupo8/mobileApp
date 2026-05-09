import { request } from "@/services/http";
import { CHECKOUT } from "@/constants/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export type CheckoutAddress = {
  fullName: string;
  street: string;
  city: string;
  zip: string;
  phone: string;
};

export type CheckoutMercadopagoResponse = {
  init_point?: string;
  sandbox_init_point?: string;
  order_ids: number[];
};

// ─── Requests ────────────────────────────────────────────────────────────────

/**
 * Create a MercadoPago checkout session.
 * @param idempotencyKey Unique key to prevent duplicate orders
 * @param backUrl URL to redirect to after payment (from Linking.createURL(''))
 * @param address Shipping address (field names must match backend AddressDTO)
 */
export async function createCheckoutMercadopago(
  idempotencyKey: string,
  backUrl: string,
  address: CheckoutAddress,
): Promise<CheckoutMercadopagoResponse> {
  return request<CheckoutMercadopagoResponse>(CHECKOUT("//"), {
    method: "POST",
    body: {
      idempotency_key: idempotencyKey,
      back_url: backUrl,
      address,
      payment: "mercadopago",
    },
    auth: true,
  });
}
