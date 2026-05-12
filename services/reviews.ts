import { CHECKOUT } from '@/constants/api';
import { ApiError, request } from './http';

export type ReviewRecord = {
  id?: number;
  order_id: number;
  score: number; // 1–10  (half-star UI: stars * 2)
  comment?: string;
  type: 'seller' | 'product';
  product_id?: string;
};

type ReviewsResponse = { data: ReviewRecord[] };

export async function submitSellerReview(
  orderId: number,
  score: number,
  comment?: string,
): Promise<void> {
  await request(CHECKOUT('/review/seller'), {
    method: 'POST',
    auth: true,
    body: { order_id: orderId, score, comment: comment ?? null },
  });
}

export async function submitProductReview(
  orderId: number,
  productId: string,
  score: number,
  comment?: string,
): Promise<void> {
  await request(CHECKOUT('/review/product'), {
    method: 'POST',
    auth: true,
    body: { order_id: orderId, product_id: productId, score, comment: comment ?? null },
  });
}

export async function fetchOrderReviews(orderId: number): Promise<ReviewRecord[]> {
  try {
    const res = await request<ReviewsResponse>(
      CHECKOUT(`/review/order/${encodeURIComponent(String(orderId))}`),
      { method: 'GET', auth: true, silent: true },
    );
    return res.data ?? [];
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) return [];
    throw e;
  }
}
