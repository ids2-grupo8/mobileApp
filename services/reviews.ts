import * as SecureStore from '@/services/secure-storage';

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

// ─── Local cache ─────────────────────────────────────────────────────────────
// Stores submitted reviews in SecureStore so the "Calificado" badge persists
// across navigation even when the server GET endpoint is unavailable.

const cacheKey = (orderId: number) => `reviews_v1_order_${orderId}`;

async function readCache(orderId: number): Promise<ReviewRecord[]> {
  try {
    const raw = await SecureStore.getItem(cacheKey(orderId));
    if (!raw) return [];
    return JSON.parse(raw) as ReviewRecord[];
  } catch {
    return [];
  }
}

async function writeToCache(orderId: number, review: ReviewRecord): Promise<void> {
  try {
    const existing = await readCache(orderId);
    const deduped = existing.filter(
      (r) => !(r.type === review.type && r.product_id === review.product_id),
    );
    deduped.push(review);
    await SecureStore.setItem(cacheKey(orderId), JSON.stringify(deduped));
  } catch {
    // cache is best-effort — never break the main flow
  }
}

// ─── API calls ───────────────────────────────────────────────────────────────

export async function submitSellerReview(
  orderId: number,
  score: number,
  comment?: string,
): Promise<void> {
  await request(CHECKOUT(`/review/order/${encodeURIComponent(String(orderId))}/seller`), {
    method: 'POST',
    auth: true,
    body: { score, comment: comment ?? null },
  });
}

export async function submitProductReview(
  orderId: number,
  productId: string,
  score: number,
  comment?: string,
): Promise<void> {
  await request(CHECKOUT(`/review/order/${encodeURIComponent(String(orderId))}/product/${encodeURIComponent(productId)}`), {
    method: 'POST',
    auth: true,
    body: { score, comment: comment ?? null },
  });
}

// Fetches reviews from the server and merges with the local cache.
// The server is authoritative when it has data; the cache fills the gap when
// the GET endpoint is unavailable (404) or when navigating before the server
// has processed the submission.
export async function fetchOrderReviews(orderId: number): Promise<ReviewRecord[]> {
  const [serverReviews, cachedReviews] = await Promise.all([
    request<ReviewsResponse>(
      CHECKOUT(`/review/order/${encodeURIComponent(String(orderId))}`),
      { method: 'GET', auth: true, silent: true },
    )
      .then((res) => res.data ?? [])
      .catch((e: unknown) => {
        // Treat any 4xx as "no data from server" — includes Kong 404 when the
        // route doesn't exist on the remote and any future 405/410.
        if (e instanceof ApiError && e.status >= 400 && e.status < 500) return [];
        throw e;
      }),
    readCache(orderId),
  ]);

  // Merge: server wins when both have a review for the same slot.
  const merged = [...serverReviews];
  for (const cached of cachedReviews) {
    const inServer = serverReviews.some(
      (s) => s.type === cached.type && s.product_id === cached.product_id,
    );
    if (!inServer) merged.push(cached);
  }
  return merged;
}

// Called after a successful POST to populate the local cache immediately.
export async function cacheSubmittedReview(review: ReviewRecord): Promise<void> {
  await writeToCache(review.order_id, review);
}

// Fetches all reviews for a given product (shown on the product detail screen).
export async function fetchProductReviews(productId: string): Promise<ReviewRecord[]> {
  try {
    const res = await request<ReviewsResponse>(
      CHECKOUT(`/review/product/${encodeURIComponent(productId)}`),
      { method: 'GET', auth: false, silent: true },
    );
    return res.data ?? [];
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) return [];
    return [];
  }
}
