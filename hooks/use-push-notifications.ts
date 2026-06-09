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
  const userId = useAuthStore((s) => s.user?.id);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const addNotification = useNotificationsStore((s) => s.addNotification);
  const registeredFor = useRef<string | null>(null);

  useEffect(() => {
    if (!isLoggedIn || !userId) {
      registeredFor.current = null;
      return;
    }
    if (registeredFor.current === userId) return;

    (async () => {
      const token = await getExpoPushToken();
      if (!token) return;
      try {
        await registerDeviceToken(userId, token);
        registeredFor.current = userId;
      } catch (e) {
        console.warn('[Push] register device token failed:', e);
      }
    })();
  }, [isLoggedIn, userId]);

  useEffect(() => {
    const receivedSub = Notifications.addNotificationReceivedListener((event) => {
      const data = event.request.content.data as
        | { product_id?: string; product_name?: string; type?: string }
        | undefined;
      addNotification({
        orderId: 0,
        role: 'seller',
        title: event.request.content.title ?? 'Notificación',
        body: event.request.content.body ?? '',
        status: data?.type ?? 'push',
      });
    });

    const responseSub = Notifications.addNotificationResponseReceivedListener((event) => {
      const data = event.notification.request.content.data as
        | { product_id?: string }
        | undefined;
      if (data?.product_id) {
        router.push(`/product/${data.product_id}`);
      }
    });

    return () => {
      receivedSub.remove();
      responseSub.remove();
    };
  }, [router, addNotification]);
}
