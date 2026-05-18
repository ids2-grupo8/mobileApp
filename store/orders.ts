import { create } from 'zustand';

import {
  confirmDelivery as confirmDeliveryRequest,
  fetchOrderById,
  fetchPurchases,
  fetchSales,
  processOrder as processOrderRequest,
  shipOrder as shipOrderRequest,
  updateOrderStatus,
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

  actionLoading: Record<number, boolean>;
  actionError: Record<number, string | null>;

  loadPurchases: (status?: OrderStatus) => Promise<void>;
  loadSales: (status?: OrderStatus) => Promise<void>;
  loadOrderDetail: (orderId: number) => Promise<OrderSummary | null>;
  markAsProcessing: (orderId: number) => Promise<OrderSummary | null>;
  markAsShipped: (orderId: number, trackingCode?: string) => Promise<OrderSummary | null>;
  confirmDelivery: (orderId: number) => Promise<OrderSummary | null>;
  advanceOrderStatus: (orderId: number, nextStatus: OrderStatus) => Promise<OrderSummary>;
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

  actionLoading: {},
  actionError: {},

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

  markAsProcessing: async (orderId: number) => {
    return runTransition(set, get, orderId, () => processOrderRequest(orderId));
  },

  markAsShipped: async (orderId: number, trackingCode?: string) => {
    return runTransition(set, get, orderId, () => shipOrderRequest(orderId, trackingCode));
  },

  confirmDelivery: async (orderId: number) => {
    return runTransition(set, get, orderId, () => confirmDeliveryRequest(orderId));
  },

  advanceOrderStatus: async (orderId: number, nextStatus: OrderStatus) => {
    const updated = await updateOrderStatus(orderId, nextStatus);
    set((state) => ({
      details: { ...state.details, [orderId]: updated },
      sales: state.sales.map((o) => (o.id === orderId ? updated : o)),
      purchases: state.purchases.map((o) => (o.id === orderId ? updated : o)),
    }));
    return updated;
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
      actionLoading: {},
      actionError: {},
    }),
}));

async function runTransition(
  set: (partial: Partial<OrdersStore> | ((s: OrdersStore) => Partial<OrdersStore>)) => void,
  get: () => OrdersStore,
  orderId: number,
  call: () => Promise<OrderSummary>,
): Promise<OrderSummary | null> {
  set((state) => ({
    actionLoading: { ...state.actionLoading, [orderId]: true },
    actionError: { ...state.actionError, [orderId]: null },
  }));
  try {
    const updated = await call();
    set((state) => ({
      details: { ...state.details, [orderId]: updated },
      purchases: state.purchases.map((o) => (o.id === orderId ? updated : o)),
      sales: state.sales.map((o) => (o.id === orderId ? updated : o)),
      actionLoading: { ...state.actionLoading, [orderId]: false },
    }));
    return updated;
  } catch (e) {
    set((state) => ({
      actionLoading: { ...state.actionLoading, [orderId]: false },
      actionError: { ...state.actionError, [orderId]: getErrorMessage(e) },
    }));
    return null;
  }
}

export type { OrderSummary };
