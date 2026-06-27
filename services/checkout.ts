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

export type CouponValidationResponse = {
  valid: boolean;
  discount_percentage: number | null;
  error: string | null;
};

export type ActiveCoupon = {
  code: string;
  discount_percentage: number;
  end_date: string;
};

export async function fetchActiveCoupons(limit = 1): Promise<ActiveCoupon[]> {
  return request<ActiveCoupon[]>(
    `${CHECKOUT('/coupons/active')}?limit=${limit}`,
    { method: 'GET' },
  );
}

// ─── Requests ────────────────────────────────────────────────────────────────

export async function createCheckoutMercadopago(
  idempotencyKey: string,
  address: CheckoutAddress,
  couponCode?: string,
): Promise<CheckoutMercadopagoResponse> {
  return request<CheckoutMercadopagoResponse>(CHECKOUT("//"), {
    method: "POST",
    body: {
      idempotency_key: idempotencyKey,
      back_url: null,
      address,
      payment: "mercadopago",
      ...(couponCode ? { coupon_code: couponCode } : {}),
    },
    auth: true,
  });
}

export async function validateCoupon(
  code: string,
  userEmail: string,
): Promise<CouponValidationResponse> {
  const params = `code=${encodeURIComponent(code)}&user_email=${encodeURIComponent(userEmail)}`;
  return request<CouponValidationResponse>(
    `${CHECKOUT('/coupons/validate')}?${params}`,
    { method: 'POST', auth: true },
  );
}
