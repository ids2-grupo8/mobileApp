import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

import type { CatalogProduct } from '@/services/catalog';

const CART_KEY = 'cart_items_v1';

export type CartItem = {
  productId: string;
  title: string;
  price: number;
  imageUrl: string;
  seller: string;
  quantity: number;
  stock: number;
};

type CartStore = {
  items: CartItem[];
  hydrated: boolean;
  hydrate: () => Promise<void>;
  addItem: (product: CatalogProduct, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  updateQuantity: (productId: string, quantity: number) => Promise<void>;
  clear: () => Promise<void>;
  totalItems: () => number;
  subtotal: () => number;
};

async function persist(items: CartItem[]) {
  await SecureStore.setItemAsync(CART_KEY, JSON.stringify(items));
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  hydrated: false,

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
        const maxQty = Math.max(1, product.stock);
        return {
          ...item,
          quantity: Math.min(maxQty, item.quantity + amount),
          stock: product.stock,
          price: product.price,
        };
      });
    } else {
      next = [
        ...current,
        {
          productId: product.id,
          title: product.title,
          price: product.price,
          imageUrl: product.imageUrl,
          seller: product.seller,
          quantity: Math.min(Math.max(1, product.stock), amount),
          stock: product.stock,
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

  totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
  subtotal: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
}));
