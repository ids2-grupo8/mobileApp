import { request, type ApiError } from "@/services/http";
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

// ─── API Functions ───────────────────────────────────────────────────────────

/**
 * Add an item to the user's cart
 */
export async function addToCart(
  productId: string,
  quantity: number = 1,
): Promise<CartItem> {
  const response = await request<CartItemResponse>(
    CHECKOUT("/cart/items"),
    {
      method: "POST",
      body: {
        product_id: productId,
        quantity,
      },
      auth: true,
    },
  );
  return response.data;
}

/**
 * Get all items in the user's cart
 */
export async function getCartItems(): Promise<{ items: CartItem[]; totalPrice: number }> {
  const response = await request<CartItemsListResponse>(
    CHECKOUT("/cart/items"),
    { method: "GET", auth: true },
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
  productId: string,
  quantity: number,
): Promise<CartItem | null> {
  try {
    const response = await request<CartItemResponse>(
      CHECKOUT(`/cart/items/${productId}`),
      {
        method: "PUT",
        body: {
          quantity,
        },
        auth: true,
      },
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
  productId: string,
): Promise<void> {
  await request<void>(CHECKOUT(`/cart/items/${productId}`), {
    method: "DELETE",
    auth: true,
  });
}
