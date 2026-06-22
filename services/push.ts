import Constants from 'expo-constants';
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import { NOTIFICATIONS } from '@/constants/api';
import { request } from '@/services/http';

export type RegisterDeviceBody = {
  seller_id: string;
  expo_token: string;
};

export async function getExpoPushToken(): Promise<string | null> {
  if (!Device.isDevice) return null;

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#C5F135',
    });
  }

  const existing = await Notifications.getPermissionsAsync();
  let finalStatus = existing.status;
  if (existing.status !== 'granted') {
    const req = await Notifications.requestPermissionsAsync();
    finalStatus = req.status;
  }
  if (finalStatus !== 'granted') return null;

  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    (Constants as unknown as { easConfig?: { projectId?: string } }).easConfig?.projectId;
  if (!projectId) {
    console.warn('[Push] Missing EAS projectId — cannot fetch Expo token');
    return null;
  }

  try {
    const token = await Notifications.getExpoPushTokenAsync({ projectId });
    console.log('[Push] ExponentPushToken =', token.data);
    return token.data;
  } catch (e) {
    console.warn('[Push] getExpoPushTokenAsync failed:', e);
    return null;
  }
}

export async function registerDeviceToken(sellerId: string, expoToken: string) {
  await request(NOTIFICATIONS('/devices'), {
    method: 'POST',
    body: { seller_id: sellerId, expo_token: expoToken } satisfies RegisterDeviceBody,
    auth: true,
  });
}
