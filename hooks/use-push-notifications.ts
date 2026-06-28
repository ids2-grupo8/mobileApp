import * as Notifications from 'expo-notifications';
import { useRouter } from 'expo-router';
import { useEffect, useRef } from 'react';

import { getExpoPushToken, registerDeviceToken } from '@/services/push';
import { useAuthStore } from '@/store/auth';
import { useNotificationsStore } from '@/store/notifications';

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowBanner: true,
    shouldShowList: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
});

export function usePushNotifications() {
  const router = useRouter();
  // El backend identifica al destinatario por email (eventos de stock y de
  // orden viajan con el email del usuario), así que el token se registra por email.
  const userEmail = useAuthStore((s) => s.user?.email);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !userEmail) {
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current === userEmail) return;

    (async () => {
      const token = await getExpoPushToken();
      if (!token) return;
      try {
        await registerDeviceToken(userEmail, token);
        registeredFor.current = userEmail;
      } catch (e) {
        console.warn('[Push] register device token failed:', e);
      }
    })();
  }, [isLoggedIn, userEmail]);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((event) => {
      const data = event.request.content.data as
        | { product_id?: string; product_name?: string; type?: string; order_id?: string; status?: string }
        | undefined;
      addNotification({
        orderId: data?.order_id ? Number(data.order_id) : 0,
        productId: data?.product_id,
        // order_status va al comprador; new_sale y alertas de stock, al vendedor.
        role: data?.type === 'order_status' ? 'buyer' : 'seller',
        title: event.request.content.title ?? 'Notificación',
        body: event.request.content.body ?? '',
        status: data?.status ?? data?.type ?? 'push',
      });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((event) => {
      const data = event.notification.request.content.data as
        | { product_id?: string; order_id?: string }
        | undefined;
      if (data?.order_id) {
        router.push(`/orders/${data.order_id}`);
      } else if (data?.product_id) {
        router.push(`/product/${data.product_id}`);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router, addNotification]);
}
