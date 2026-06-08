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

// ─── Seller reputation (public profile) ──────────────────────────────────────

export type SellerReviewDetail = {
  id: number;
  order_id: number;
  score: number; // 1..10
  comment: string | null;
  reviewer_email: string;
  created_at: string | null; // ISO; null for legacy rows without timestamp
};

export type SellerReputation = {
  seller_email: string;
  average_score: number | null; // null when count === 0
  count: number;
  reviews: SellerReviewDetail[];
};

type SellerReputationResponse = { data: SellerReputation };

// ─── Product reputation (product detail) ─────────────────────────────────────

export type ProductReviewDetail = {
  id: number;
  order_id: number;
  score: number; // 1..10
  comment: string | null;
  reviewer_email: string;
  created_at: string | null; // ISO
};

export type ProductReputation = {
  product_id: string;
  average_score: number | null; // null when count === 0
  count: number;
  reviews: ProductReviewDetail[];
};

type ProductReputationResponse = { data: ProductReputation };

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

function emptyProductReputation(productId: string): ProductReputation {
  return { product_id: productId, average_score: null, count: 0, reviews: [] };
}

function normalizeProductReputation(
  raw: ProductReputation,
  fallbackProductId: string,
): ProductReputation {
  const reviews = Array.isArray(raw.reviews) ? raw.reviews : [];
  const count = typeof raw.count === 'number' ? raw.count : reviews.length;
  const average =
    count === 0
      ? null
      : typeof raw.average_score === 'number'
        ? raw.average_score
        : null;

  return {
    product_id: raw.product_id ?? fallbackProductId,
    average_score: average,
    count,
    reviews: reviews.map((review) => ({
      id: review.id,
      order_id: review.order_id,
      score: review.score,
      comment: review.comment ?? null,
      reviewer_email: review.reviewer_email,
      created_at: review.created_at ?? null,
    })),
  };
}

// Fetches aggregated reputation for a product (shown on the product detail screen).
// Only reviews from DELIVERED orders are included (enforced server-side).
export async function fetchProductReputation(productId: string): Promise<ProductReputation> {
  try {
    const res = await request<ProductReputationResponse>(
      CHECKOUT(`/review/product/${encodeURIComponent(productId)}`),
      { method: 'GET', auth: true, silent: true },
    );
    if (!res.data) return emptyProductReputation(productId);
    return normalizeProductReputation(res.data, productId);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return emptyProductReputation(productId);
    }
    throw e;
  }
}

// ─── Seller reputation ───────────────────────────────────────────────────────

function normalizeSellerEmail(email: string): string {
  try {
    return decodeURIComponent(email).replace(/%40/gi, '@');
  } catch {
    return email.replace(/%40/gi, '@');
  }
}

function emptyReputation(email: string): SellerReputation {
  return { seller_email: email, average_score: null, count: 0, reviews: [] };
}

function normalizeSellerReputation(raw: SellerReputation, fallbackEmail: string): SellerReputation {
  const reviews = Array.isArray(raw.reviews) ? raw.reviews : [];
  const count = typeof raw.count === 'number' ? raw.count : reviews.length;
  const average =
    count === 0
      ? null
      : typeof raw.average_score === 'number'
        ? raw.average_score
        : null;

  return {
    seller_email: raw.seller_email ?? fallbackEmail,
    average_score: average,
    count,
    reviews: reviews.map((review) => ({
      id: review.id,
      order_id: review.order_id,
      score: review.score,
      comment: review.comment ?? null,
      reviewer_email: review.reviewer_email,
      created_at: review.created_at ?? null,
    })),
  };
}

// CA 1, CA 2, CA 3: returns aggregate average + list of individual reviews for a seller.
// CA 4 (only delivered orders) is enforced server-side in checkout-service.
export async function fetchSellerReputation(email: string): Promise<SellerReputation> {
  const sellerEmail = normalizeSellerEmail(email);

  try {
    const res = await request<SellerReputationResponse>(
      CHECKOUT(`/review/seller/${encodeURIComponent(sellerEmail)}`),
      // Sends JWT when the user is logged in; works without auth once Kong exposes
      // GET /checkout/review/seller as a public route (see httproute-checkout.yaml).
      { method: 'GET', auth: true, silent: true },
    );
    if (!res.data) return emptyReputation(sellerEmail);
    return normalizeSellerReputation(res.data, sellerEmail);
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) {
      return emptyReputation(sellerEmail);
    }
    throw e;
  }
}
