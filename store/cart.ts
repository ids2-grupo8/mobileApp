import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { CatalogProduct } from '@/services/catalog';
import { getCartItems, removeFromCart, updateCartItem, addToCart } from '@/services/cart';

const CART_KEY = 'cart_items_v1';

export type CartItem = {
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  seller: string;
  quantity: number;
  stock: number;
  available?: boolean; // Whether the product is still available/in stock
};

type CartStore = {
  items: CartItem[];
  hydrated: boolean;
  syncing: boolean;
  error: string | null;
  hydrate: () => Promise<void>;
  addItem: (product: CatalogProduct, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clear: () => Promise<void>;
  syncWithBackend: (userEmail: string) => Promise<void>;
  totalItems: () => number;
  subtotal: () => number;
};

async function persist(items: CartItem[]) {
  await SecureStore.setItemAsync(CART_KEY, JSON.stringify(items));
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  hydrated: false,
  syncing: false,
  error: null,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItemAsync(CART_KEY);
      if (!raw) {
        set({ items: [], hydrated: true });
        return;
      }

      const parsed = JSON.parse(raw) as CartItem[];
      if (!Array.isArray(parsed)) {
        set({ items: [], hydrated: true });
        return;
      }

      const sanitized = parsed.filter(
        (item) =>
          typeof item?.productId === 'string' &&
          typeof item?.title === 'string' &&
          typeof item?.price === 'number' &&
          typeof item?.quantity === 'number' &&
          item.quantity > 0
      );

      set({ items: sanitized, hydrated: true });
    } catch {
      set({ items: [], hydrated: true });
    }
  },

  addItem: async (product, quantity = 1) => {
    const current = get().items;
    const amount = Math.max(1, Math.floor(quantity));

    const exists = current.find((i) => i.productId === product.id);
    let next: CartItem[];

    if (exists) {
      next = current.map((item) => {
        if (item.productId !== product.id) return item;
        // Use the most conservative (lowest) known stock between the
        // incoming product data and the stored item stock to avoid
        // accidentally allowing additions beyond available units.
        const incomingStock = typeof product.stock === 'number' ? product.stock : item.stock;
        const knownStock = typeof item.stock === 'number' ? item.stock : incomingStock;
        const maxQty = Math.max(0, Math.min(incomingStock, knownStock));

        // Ensure we don't increase past the known maximum quantity.
        const newQty = Math.min(maxQty, item.quantity + amount);

        return {
          ...item,
          quantity: newQty,
          stock: Math.max(0, incomingStock),
          price: product.price,
          available: true,
        };
      });
    } else {
      // For new items, don't add if there's no stock. Clamp to available stock.
      const available = Math.max(0, typeof product.stock === 'number' ? product.stock : 0);
      const qtyToAdd = Math.min(available, amount);
      if (qtyToAdd <= 0) {
        // Nothing to add
        return;
      }

      next = [
        ...current,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          imageUrl: product.imageUrl,
          seller: product.seller,
          quantity: qtyToAdd,
          stock: available,
          available: true,
        },
      ];
    }

    set({ items: next });
    await persist(next);
  },

  removeItem: async (productId) => {
    const next = get().items.filter((i) => i.productId !== productId);
    set({ items: next });
    await persist(next);
  },

  updateQuantity: async (productId, quantity) => {
    if (quantity <= 0) {
      await get().removeItem(productId);
      return;
    }

    const next = get().items.map((item) => {
      if (item.productId !== productId) return item;
      return {
        ...item,
        quantity: Math.min(Math.max(1, Math.floor(quantity)), Math.max(1, item.stock)),
      };
    });

    set({ items: next });
    await persist(next);
  },

  clear: async () => {
    set({ items: [] });
    await persist([]);
  },

  syncWithBackend: async (userEmail: string) => {
    try {
      set({ syncing: true, error: null });

      if (!userEmail) {
        set({ syncing: false, error: 'No user email provided for sync' });
        return;
      }

      // Fetch what's on the backend first
      const { items: backendItems } = await getCartItems(userEmail);

      // Push local items to backend (merge): prefer local quantities
      for (const localItem of get().items) {
        const backendItem = backendItems.find((bi) => bi.product_id === localItem.productId);
        try {
          if (backendItem) {
            // If quantities differ, update backend to match local preferred quantity
            if (backendItem.quantity !== localItem.quantity) {
              await updateCartItem(userEmail, localItem.productId, localItem.quantity);
            }
          } else {
            // Add missing item on backend
            await addToCart(userEmail, localItem.productId, localItem.quantity);
          }
        } catch (e) {
          // ignore individual item errors, continue with rest
        }
      }

      // Fetch merged state from backend and map to local shape
      const { items: freshBackend } = await getCartItems(userEmail);
      const mapped: CartItem[] = freshBackend.map((bi) => {
        // try to reuse local metadata if available
        const local = get().items.find((li) => li.productId === bi.product_id);
        return {
          productId: bi.product_id,
          title: bi.name ?? local?.title ?? String(bi.product_id),
          price: typeof bi.price === 'number' ? bi.price : Number(bi.price) || 0,
          imageUrl: local?.imageUrl ?? '',
          seller: local?.seller ?? '',
          quantity: bi.quantity,
          stock: local?.stock ?? bi.quantity,
          available: !!bi.available,
        };
      });

      set({ items: mapped, syncing: false });
      await persist(mapped);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Error syncing cart';
      set({ syncing: false, error: message });
    }
  },

  totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
  subtotal: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
}));
