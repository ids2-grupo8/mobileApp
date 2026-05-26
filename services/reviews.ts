import * as SecureStore from 'expo-secure-store';

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

// ─── Seller reputation (public profile) ──────────────────────────────────────

export type SellerReviewDetail = {
  id: number;
  order_id: number;
  score: number; // 1..10
  comment: string | null;
  reviewer_email: string;
  created_at: string; // ISO
};

export type SellerReputation = {
  seller_email: string;
  average_score: number | null; // null when count === 0
  count: number;
  reviews: SellerReviewDetail[];
};

// Flip to false once GET /checkout/review/seller/{email} ships in checkout-service.
// CA 4 ("solo entregadas") must be enforced server-side at aggregate time.
const USE_SELLER_REPUTATION_MOCK = true;

// ─── Local cache ─────────────────────────────────────────────────────────────
// Stores submitted reviews in SecureStore so the "Calificado" badge persists
// across navigation even when the server GET endpoint is unavailable.

const cacheKey = (orderId: number) => `reviews_v1_order_${orderId}`;

async function readCache(orderId: number): Promise<ReviewRecord[]> {
  try {
    const raw = await SecureStore.getItemAsync(cacheKey(orderId));
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
    await SecureStore.setItemAsync(cacheKey(orderId), JSON.stringify(deduped));
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

// ─── Seller reputation ───────────────────────────────────────────────────────

function emptyReputation(email: string): SellerReputation {
  return { seller_email: email, average_score: null, count: 0, reviews: [] };
}

function buildMockReputation(email: string): SellerReputation {
  const normalized = email.toLowerCase();
  const isEmpty =
    normalized.includes('vacio') ||
    normalized.includes('empty') ||
    normalized.startsWith('new');
  if (isEmpty) return emptyReputation(email);

  const reviews: SellerReviewDetail[] = [
    {
      id: 1,
      order_id: 1001,
      score: 10,
      comment: 'Excelente vendedor, todo llegó en tiempo y forma.',
      reviewer_email: 'mariano.lopez@mail.com',
      created_at: '2026-05-18T14:31:00Z',
    },
    {
      id: 2,
      order_id: 1015,
      score: 8,
      comment: 'Buena comunicación, recomendable.',
      reviewer_email: 'juli.fernandez@mail.com',
      created_at: '2026-05-02T10:12:00Z',
    },
    {
      id: 3,
      order_id: 1042,
      score: 9,
      comment: null,
      reviewer_email: 'pedro.gomez@mail.com',
      created_at: '2026-04-21T19:45:00Z',
    },
    {
      id: 4,
      order_id: 1058,
      score: 7,
      comment: 'El producto vino bien, pero el envío tardó más de lo previsto.',
      reviewer_email: 'sofi.r@mail.com',
      created_at: '2026-04-09T08:05:00Z',
    },
  ];
  const total = reviews.reduce((acc, r) => acc + r.score, 0);
  const average = Math.round((total / reviews.length) * 10) / 10;
  return {
    seller_email: email,
    average_score: average,
    count: reviews.length,
    reviews,
  };
}

// CA 1, CA 2, CA 3: returns aggregate average + list of individual reviews for a seller.
// CA 4 (only delivered orders) must be enforced server-side when computing the aggregate.
export async function fetchSellerReputation(email: string): Promise<SellerReputation> {
  if (USE_SELLER_REPUTATION_MOCK) {
    await new Promise((resolve) => setTimeout(resolve, 350));
    return buildMockReputation(email);
  }

  try {
    const res = await request<{ data: SellerReputation }>(
      CHECKOUT(`/review/seller/${encodeURIComponent(email)}`),
      { method: 'GET', auth: false, silent: true },
    );
    return res.data ?? emptyReputation(email);
  } catch (e) {
    if (e instanceof ApiError && e.status >= 400 && e.status < 500) {
      return emptyReputation(email);
    }
    throw e;
  }
}
