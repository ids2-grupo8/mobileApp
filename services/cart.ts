import { request, type ApiError, getAccessToken } from "@/services/http";
import { CHECKOUT } from "@/constants/api";

// Types
export type CartItem = {
  id: number;
  product_id: string;
  name: string;
  price: number;
  quantity: number;
  subtotal: number;
  available: boolean;
};

type CartItemResponse = {
  data: CartItem;
};

type CartItemsListResponse = {
  data: CartItem[];
  total_price: number;
};

// Helper to make authenticated requests to cart endpoints
async function cartRequest<T = unknown>(
  endpoint: string,
  userEmail: string,
  options: {
    method?: "GET" | "POST" | "PUT" | "DELETE";
    body?: unknown;
  } = {}
): Promise<T> {
  // The gateway exposes checkout routes without the internal /api/v1 prefix.
  if (!userEmail) {
    const err = new Error('User email is required for cart requests');
    (err as any).status = 401;
    throw err;
  }

  const url = CHECKOUT(`/cart${endpoint}`);
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Accept: "application/json",
    "X-User-Email": userEmail,
  };

  // Include Authorization Bearer token when available (gateway may require it)
  try {
    const token = await getAccessToken();
    if (token) headers["Authorization"] = `Bearer ${token}`;
  } catch {
    // ignore token retrieval errors
  }

  const res = await fetch(url, {
    method: options.method || "GET",
    headers,
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const text = await res.text();
  let json: unknown;
  try {
    json = JSON.parse(text);
  } catch {
    json = { message: text };
  }

  if (!res.ok) {
    console.error(
      `[Cart API] ${options.method || "GET"} ${endpoint} → ${res.status}`,
      JSON.stringify(json)
    );
    const j = json as {
      message?: string;
      error?: string;
      detail?: string;
      title?: string;
    };
    const message =
      j.detail ?? j.message ?? j.error ?? j.title ?? `Error ${res.status}`;
    const error = new Error(message);
    (error as any).status = res.status;
    throw error;
  }

  return json as T;
}

// API Functions

/**
 * Add an item to the user's cart
 */
export async function addToCart(
  userEmail: string,
  productId: string,
  quantity: number = 1
): Promise<CartItem> {
  if (!userEmail) throw new Error('User email required to add to cart');
  const response = await cartRequest<CartItemResponse>(
    "/items",
    userEmail,
    {
      method: "POST",
      body: {
        product_id: productId,
        quantity,
      },
    }
  );
  return response.data;
}

/**
 * Get all items in the user's cart
 */
export async function getCartItems(
  userEmail: string
): Promise<{ items: CartItem[]; totalPrice: number }> {
  if (!userEmail) throw new Error('User email required to get cart items');
  const response = await cartRequest<CartItemsListResponse>(
    "/items",
    userEmail,
    { method: "GET" }
  );
  return {
    items: response.data,
    totalPrice: response.total_price,
  };
}

/**
 * Update the quantity of an item in the cart
 * If quantity is 0, the item is removed
 */
export async function updateCartItem(
  userEmail: string,
  productId: string,
  quantity: number
): Promise<CartItem | null> {
  if (!userEmail) throw new Error('User email required to update cart item');
  try {
    const response = await cartRequest<CartItemResponse>(
      `/items/${productId}`,
      userEmail,
      {
        method: "PUT",
        body: {
          quantity,
        },
      }
    );
    return response.data;
  } catch (error) {
    // If we get a 204 No Content (item removed), return null
    if ((error as any).status === 204) {
      return null;
    }
    throw error;
  }
}

/**
 * Remove an item from the cart
 */
export async function removeFromCart(
  userEmail: string,
  productId: string
): Promise<void> {
  if (!userEmail) throw new Error('User email required to remove cart item');
  await cartRequest<void>(`/items/${productId}`, userEmail, {
    method: "DELETE",
  });
}
