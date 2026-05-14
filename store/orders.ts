import { create } from 'zustand';

import {
  fetchOrderById,
  fetchPurchases,
  fetchSales,
  type OrderStatus,
  type OrderSummary,
} from '@/services/orders';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';

type OrdersStore = {
  purchases: OrderSummary[];
  purchasesState: LoadState;
  purchasesError: string | null;

  sales: OrderSummary[];
  salesState: LoadState;
  salesError: string | null;

  details: Record<number, OrderSummary>;
  detailLoading: Record<number, boolean>;
  detailError: Record<number, string | null>;

  loadPurchases: (status?: OrderStatus) => Promise<void>;
  loadSales: (status?: OrderStatus) => Promise<void>;
  loadOrderDetail: (orderId: number) => Promise<OrderSummary | null>;
  reset: () => void;
};

function getErrorMessage(e: unknown): string {
  if (e instanceof Error) return e.message;
  return 'No se pudo cargar.';
}

export const useOrdersStore = create<OrdersStore>((set, get) => ({
  purchases: [],
  purchasesState: 'idle',
  purchasesError: null,

  sales: [],
  salesState: 'idle',
  salesError: null,

  details: {},
  detailLoading: {},
  detailError: {},

  loadPurchases: async (status?: OrderStatus) => {
    set({ purchasesState: 'loading', purchasesError: null });
    try {
      const data = await fetchPurchases(status);
      set({ purchases: data, purchasesState: 'ready' });
    } catch (e) {
      set({ purchasesState: 'error', purchasesError: getErrorMessage(e) });
    }
  },

  loadSales: async (status?: OrderStatus) => {
    set({ salesState: 'loading', salesError: null });
    try {
      const data = await fetchSales(status);
      set({ sales: data, salesState: 'ready' });
    } catch (e) {
      set({ salesState: 'error', salesError: getErrorMessage(e) });
    }
  },

  loadOrderDetail: async (orderId: number) => {
    set((state) => ({
      detailLoading: { ...state.detailLoading, [orderId]: true },
      detailError: { ...state.detailError, [orderId]: null },
    }));
    try {
      const data = await fetchOrderById(orderId);
      set((state) => ({
        details: { ...state.details, [orderId]: data },
        detailLoading: { ...state.detailLoading, [orderId]: false },
      }));
      return data;
    } catch (e) {
      set((state) => ({
        detailLoading: { ...state.detailLoading, [orderId]: false },
        detailError: { ...state.detailError, [orderId]: getErrorMessage(e) },
      }));
      return null;
    }
  },

  reset: () =>
    set({
      purchases: [],
      purchasesState: 'idle',
      purchasesError: null,
      sales: [],
      salesState: 'idle',
      salesError: null,
      details: {},
      detailLoading: {},
      detailError: {},
    }),
}));

export type { OrderSummary };
