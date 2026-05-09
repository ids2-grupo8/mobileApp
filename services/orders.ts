import { CHECKOUT } from '@/constants/api';
import { request } from './http';

export type OrderItem = {
  product_id: string;
  quantity: number;
  price: number;
};

export type OrderAddress = {
  fullName: string;
  street: string;
  city: string;
  zip: string;
  phone: string;
};

export type OrderStatus =
  | 'payment pending'
  | 'payment confirmed'
  | 'payment rejected'
  | 'canceled'
  | 'processing'
  | 'shipped'
  | 'delivered';

export type OrderSummary = {
  id: number;
  total_amount: number;
  status: OrderStatus | string;
  buyer: string;
  seller: string;
  address: OrderAddress | null;
  items: OrderItem[];
};

type OrderListResponse = { data: OrderSummary[] };
type OrderDetailResponse = { data: OrderSummary };

export async function fetchPurchases(): Promise<OrderSummary[]> {
  const res = await request<OrderListResponse>(CHECKOUT('/order/purchases'), {
    method: 'GET',
    auth: true,
  });
  return res.data ?? [];
}

export async function fetchSales(): Promise<OrderSummary[]> {
  const res = await request<OrderListResponse>(CHECKOUT('/order/sales'), {
    method: 'GET',
    auth: true,
  });
  return res.data ?? [];
}

export async function fetchOrderById(orderId: number | string): Promise<OrderSummary> {
  const res = await request<OrderDetailResponse>(
    CHECKOUT(`/order/${encodeURIComponent(String(orderId))}`),
    { method: 'GET', auth: true },
  );
  return res.data;
}

export type PaymentResolution = 'confirmed' | 'rejected' | 'pending';

/**
 * Polls one or more orders until they leave 'payment pending' status, or until timeout.
 * Aggregates the final statuses into a single resolution:
 *   - any rejected → 'rejected'
 *   - all confirmed → 'confirmed'
 *   - otherwise (timeout while still pending, or mix) → 'pending'
 */
export async function pollOrdersUntilResolved(
  orderIds: number[],
  { timeoutMs = 12000, intervalMs = 1000, initialDelayMs = 1000 }: {
    timeoutMs?: number;
    intervalMs?: number;
    initialDelayMs?: number;
  } = {},
): Promise<PaymentResolution> {
  if (orderIds.length === 0) return 'pending';

  await new Promise((r) => setTimeout(r, initialDelayMs));

  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const orders = await Promise.all(orderIds.map((id) => fetchOrderById(id)));
      const statuses = orders.map((o) => o.status);

      if (statuses.some((s) => s === 'payment rejected')) return 'rejected';
      if (statuses.every((s) => s !== 'payment pending')) {
        return statuses.every((s) => s === 'payment confirmed') ? 'confirmed' : 'pending';
      }
    } catch (err) {
      console.warn('[pollOrdersUntilResolved] fetch error, retrying', err);
    }

    await new Promise((r) => setTimeout(r, intervalMs));
  }

  return 'pending';
}
