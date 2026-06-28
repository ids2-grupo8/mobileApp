import * as SecureStore from 'expo-secure-store';
import { create } from 'zustand';

const NOTIF_KEY = 'app_notifications_v1';
const SEEN_KEY = 'seen_order_statuses_v1';
const MAX_NOTIFICATIONS = 40;

export type AppNotification = {
  id: string;
  orderId: number;
  // Alertas de stock no van atadas a una orden (orderId === 0) sino a un
  // producto: guardamos su id para poder navegar al detalle desde la tarjeta.
  productId?: string;
  role: 'buyer' | 'seller';
  title: string;
  body: string;
  status: string;
  read: boolean;
  createdAt: string;
};

type NotificationsStore = {
  notifications: AppNotification[];
  // key: `${role}:${orderId}` → last known status
  seenOrderStatuses: Record<string, string>;
  unreadCount: () => number;
  addNotification: (n: Omit<AppNotification, 'id' | 'read' | 'createdAt'>) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  setSeenStatus: (key: string, status: string) => void;
  hydrate: () => Promise<void>;
  clearAll: () => Promise<void>;
};

function save(notifications: AppNotification[], seenStatuses: Record<string, string>) {
  SecureStore.setItemAsync(NOTIF_KEY, JSON.stringify(notifications)).catch(() => {});
  SecureStore.setItemAsync(SEEN_KEY, JSON.stringify(seenStatuses)).catch(() => {});
}

export const useNotificationsStore = create<NotificationsStore>((set, get) => ({
  notifications: [],
  seenOrderStatuses: {},

  unreadCount: () => get().notifications.filter((n) => !n.read).length,

  addNotification: (n) => {
    // El mismo cambio de estado puede llegar por push y por el poll local:
    // si ya existe una entrada para esa orden/rol/estado, no duplicar.
    if (
      n.orderId !== 0 &&
      get().notifications.some(
        (existing) =>
          existing.orderId === n.orderId &&
          existing.role === n.role &&
          existing.status === n.status,
      )
    ) {
      return;
    }
    const newNotif: AppNotification = {
      ...n,
      id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      read: false,
      createdAt: new Date().toISOString(),
    };
    const updated = [newNotif, ...get().notifications].slice(0, MAX_NOTIFICATIONS);
    set({ notifications: updated });
    save(updated, get().seenOrderStatuses);
  },

  markRead: (id) => {
    const updated = get().notifications.map((n) =>
      n.id === id ? { ...n, read: true } : n,
    );
    set({ notifications: updated });
    save(updated, get().seenOrderStatuses);
  },

  markAllRead: () => {
    const updated = get().notifications.map((n) => ({ ...n, read: true }));
    set({ notifications: updated });
    save(updated, get().seenOrderStatuses);
  },

  setSeenStatus: (key, status) => {
    const updated = { ...get().seenOrderStatuses, [key]: status };
    set({ seenOrderStatuses: updated });
    save(get().notifications, updated);
  },

  hydrate: async () => {
    try {
      const [rawNotifs, rawSeen] = await Promise.all([
        SecureStore.getItemAsync(NOTIF_KEY),
        SecureStore.getItemAsync(SEEN_KEY),
      ]);
      const notifications = rawNotifs ? (JSON.parse(rawNotifs) as AppNotification[]) : [];
      const seenOrderStatuses = rawSeen ? (JSON.parse(rawSeen) as Record<string, string>) : {};
      set({ notifications, seenOrderStatuses });
    } catch {
      // Corrupt storage — start fresh
      set({ notifications: [], seenOrderStatuses: {} });
    }
  },

  clearAll: async () => {
    set({ notifications: [], seenOrderStatuses: {} });
    await Promise.all([
      SecureStore.deleteItemAsync(NOTIF_KEY),
      SecureStore.deleteItemAsync(SEEN_KEY),
    ]).catch(() => {});
  },
}));
