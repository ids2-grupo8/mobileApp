import { useEffect, useRef } from 'react';

import { fetchPurchases, fetchSales, type OrderStatus, type OrderSummary } from '@/services/orders';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';

const POLL_INTERVAL_MS = 30_000;

const BUYER_MESSAGES: Partial<Record<string, { title: string; body: string }>> = {
  'payment confirmed': { title: 'Pago confirmado', body: 'Tu pago fue procesado correctamente.' },
  'payment rejected': { title: 'Pago rechazado', body: 'Hubo un problema con tu pago. Revisá los datos.' },
  processing:         { title: 'Pedido en preparación', body: 'El vendedor está preparando tu pedido.' },
  shipped:            { title: 'Pedido enviado', body: 'Tu pedido está en camino.' },
  delivered:          { title: 'Pedido entregado', body: '¡Tu pedido fue entregado! No olvides dejar una reseña.' },
  canceled:           { title: 'Pedido cancelado', body: 'Tu pedido fue cancelado.' },
};

const SELLER_MESSAGES: Partial<Record<string, { title: string; body: string }>> = {
  'payment confirmed': { title: 'Nueva venta', body: 'Recibiste una orden lista para preparar.' },
  canceled:            { title: 'Orden cancelada', body: 'Una orden fue cancelada por el comprador.' },
};

function processOrders(
  orders: OrderSummary[],
  role: 'buyer' | 'seller',
  seenStatuses: Record<string, string>,
  setSeenStatus: (key: string, status: string) => void,
  addNotification: (n: { orderId: number; role: 'buyer' | 'seller'; title: string; body: string; status: string }) => void,
) {
  const messages = role === 'buyer' ? BUYER_MESSAGES : SELLER_MESSAGES;

  for (const order of orders) {
    const key = `${role}:${order.id}`;
    const prevStatus = seenStatuses[key];
    const currStatus = order.status;

    if (prevStatus === undefined) {
      // First time we see this order — record baseline without notifying
      setSeenStatus(key, currStatus);
      continue;
    }

    if (prevStatus !== currStatus) {
      setSeenStatus(key, currStatus);
      const msg = messages[currStatus];
      if (msg) {
        addNotification({
          orderId: order.id,
          role,
          title: msg.title,
          body: msg.body,
          status: currStatus,
        });
      }
    }
  }
}

export function useNotificationsPoll() {
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const { seenOrderStatuses, setSeenStatus, addNotification } = useNotificationsStore();
  const seenRef = useRef(seenOrderStatuses);

  useEffect(() => {
    seenRef.current = seenOrderStatuses;
  }, [seenOrderStatuses]);

  useEffect(() => {
    if (!isLoggedIn) return;

    async function poll() {
      try {
        const [purchases, sales] = await Promise.all([
          fetchPurchases().catch(() => [] as OrderSummary[]),
          fetchSales().catch(() => [] as OrderSummary[]),
        ]);
        processOrders(purchases, 'buyer', seenRef.current, setSeenStatus, addNotification);
        processOrders(sales, 'seller', seenRef.current, setSeenStatus, addNotification);
      } catch {
        // Silent — polling should never crash the app
      }
    }

    poll();
    const id = setInterval(poll, POLL_INTERVAL_MS);
    return () => clearInterval(id);
  }, [isLoggedIn, setSeenStatus, addNotification]);
}
