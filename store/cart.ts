import * as SecureStore from '@/services/secure-storage';
import { create } from 'zustand';

import type { CatalogProduct } from '@/services/catalog';
import { addToCart, getCartItems, removeFromCart, updateCartItem } from '@/services/cart';

/** Mensaje en español para fallos de stock al agregar al carrito (API checkout en inglés). */
function userMessageForAddToCartFailure(raw: string): string {
  const t = raw.trim();
  const lower = t.toLowerCase();
  if (lower.includes('product out of stock')) {
    return 'Este producto ya no tiene stock. Elegí otro producto o probá más tarde.';
  }
  if (lower.includes('insufficient stock')) {
    const avail = t.match(/available:\s*(\d+)/i);
    if (avail) {
      return `No hay stock suficiente: solo quedan ${avail[1]} unidad(es). Bajá la cantidad o actualizá la pantalla por si el inventario cambió.`;
    }
    return 'No hay stock suficiente para la cantidad que pediste. Revisá la cantidad o actualizá el producto.';
  }
  if (lower.includes('out of stock')) {
    return 'Este producto está sin stock. No se puede agregar al carrito.';
  }
  return t;
}

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
  clearLocal: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
  totalItems: () => number;
  subtotal: () => number;
};

async function persist(items: CartItem[]) {
  await SecureStore.setItem(CART_KEY, JSON.stringify(items));
}

export const useCartStore = create<CartStore>((set, get) => ({
  items: [],
  hydrated: false,
  syncing: false,
  error: null,

  hydrate: async () => {
    try {
      const raw = await SecureStore.getItem(CART_KEY);
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
    try {
      console.log('[Cart] addItem called', { productId: product.id, quantity });
      set({ error: null });
      const current = get().items;
      const amount = Math.max(1, Math.floor(quantity));

      const exists = current.find((i) => i.productId === product.id);
      
      // Validar stock disponible
      let qtyToAdd = amount;
      if (exists) {
        const maxQty = Math.max(0, Math.min(product.stock, product.stock));
        qtyToAdd = Math.min(maxQty, exists.quantity + amount) - exists.quantity;
      } else {
        const available = Math.max(0, typeof product.stock === 'number' ? product.stock : 0);
        qtyToAdd = Math.min(available, amount);
      }

      if (qtyToAdd <= 0) {
        console.log('[Cart] Stock insuficiente');
        const stockAvail = Math.max(
          0,
          typeof product.stock === 'number' ? product.stock : 0,
        );
        let msg: string;
        if (stockAvail <= 0) {
          msg =
            'Este producto no tiene stock disponible. No se puede agregar al carrito.';
        } else if (exists && exists.quantity >= stockAvail) {
          const unit = stockAvail === 1 ? 'unidad' : 'unidades';
          msg = `Ya tenés en el carrito el máximo que se puede comprar (${stockAvail} ${unit}). No hay más stock para agregar.`;
        } else {
          msg =
            'No podés agregar más unidades: el stock disponible no alcanza. Actualizá la pantalla por si cambió el inventario.';
        }
        set({ error: msg });
        return;
      }

      // Primero: agregar al backend
      console.log('[Cart] Calling backend addToCart', { productId: product.id, qtyToAdd });
      await addToCart(product.id, qtyToAdd);
      console.log('[Cart] Backend addToCart success');

      // Si success → actualizar estado local
      let next: CartItem[];
      if (exists) {
        next = current.map((item) => {
          if (item.productId !== product.id) return item;
          const incomingStock = typeof product.stock === 'number' ? product.stock : item.stock;
          const newQty = Math.min(incomingStock, item.quantity + qtyToAdd);
          return {
            ...item,
            quantity: newQty,
            stock: Math.max(0, incomingStock),
            price: product.price,
            available: true,
          };
        });
      } else {
        const available = Math.max(0, typeof product.stock === 'number' ? product.stock : 0);
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
      console.log('[Cart] addItem complete');
    } catch (err) {
      console.error('[Cart] addItem error', err);
      const raw = err instanceof Error ? err.message : 'Error al agregar al carrito';
      set({ error: userMessageForAddToCartFailure(raw) });
    }
  },

  removeItem: async (productId) => {
    try {
      console.log('[Cart] removeItem called', { productId });
      set({ error: null });
      // Primero: eliminar del backend
      console.log('[Cart] Calling backend removeFromCart', { productId });
      await removeFromCart(productId);
      console.log('[Cart] Backend removeFromCart success');

      // Si success → actualizar estado local
      const next = get().items.filter((i) => i.productId !== productId);
      set({ items: next });
      await persist(next);
      console.log('[Cart] removeItem complete');
    } catch (err) {
      console.error('[Cart] removeItem error', err);
      const msg = err instanceof Error ? err.message : 'Error al eliminar del carrito';
      set({ error: msg });
    }
  },

  updateQuantity: async (productId, quantity) => {
    try {
      console.log('[Cart] updateQuantity called', { productId, quantity });
      set({ error: null });
      if (quantity <= 0) {
        await get().removeItem(productId);
        return;
      }

      // Primero: actualizar en backend
      console.log('[Cart] Calling backend updateCartItem', { productId, quantity });
      await updateCartItem(productId, quantity);
      console.log('[Cart] Backend updateCartItem success');

      // Si success → actualizar estado local
      const next = get().items.map((item) => {
        if (item.productId !== productId) return item;
        return {
          ...item,
          quantity: Math.min(Math.max(1, Math.floor(quantity)), Math.max(1, item.stock)),
        };
      });

      set({ items: next });
      await persist(next);
      console.log('[Cart] updateQuantity complete');
    } catch (err) {
      console.error('[Cart] updateQuantity error', err);
      const msg = err instanceof Error ? err.message : 'Error al actualizar cantidad';
      set({ error: msg });
    }
  },

  clear: async () => {
    try {
      console.log('[Cart] clear called');
      set({ error: null });
      const current = get().items;
      console.log('[Cart] Clearing', current.length, 'items from backend');
      
      // Eliminar cada item del backend
      for (const item of current) {
        console.log('[Cart] Calling backend removeFromCart for', { productId: item.productId });
        await removeFromCart(item.productId);
      }
      console.log('[Cart] All items removed from backend');
      
      // Si todo success → limpiar estado local
      set({ items: [] });
      await persist([]);
      console.log('[Cart] clear complete');
    } catch (err) {
      console.error('[Cart] clear error', err);
      const msg = err instanceof Error ? err.message : 'Error al vaciar el carrito';
      set({ error: msg });
    }
  },

  clearLocal: async () => {
    try {
      console.log('[Cart] clearLocal called (local storage only)');
      // Solo limpiar storage local, SIN tocar el backend
      set({ items: [] });
      await persist([]);
      console.log('[Cart] clearLocal complete');
    } catch (err) {
      console.error('[Cart] clearLocal error', err);
    }
  },

  syncWithBackend: async () => {
    try {
      set({ syncing: true, error: null });
      const { items: backendItems } = await getCartItems();

      // Convertir items del backend al formato local
      const syncedItems: CartItem[] = backendItems.map((item) => ({
        productId: item.product_id,
        title: item.name,
        price: item.price,
        imageUrl: item.image_urls?.[0] ?? '', // Usar primera imagen del backend si está disponible
        seller: '', // El backend no devuelve seller
        quantity: item.quantity,
        stock: 999, // Asumir stock alto si viene del backend
        available: item.available,
      }));

      // Reemplazar items locales con los del backend
      set({ items: syncedItems, syncing: false });
      await persist(syncedItems);
      console.log('[Cart] syncWithBackend complete', { count: syncedItems.length });
    } catch (err) {
      console.error('[Cart] syncWithBackend error', err);
      const message = err instanceof Error ? err.message : 'Error syncing cart';
      set({ syncing: false, error: message });
    }
  },

  totalItems: () => get().items.reduce((acc, item) => acc + item.quantity, 0),
  subtotal: () => get().items.reduce((acc, item) => acc + item.price * item.quantity, 0),
}));
